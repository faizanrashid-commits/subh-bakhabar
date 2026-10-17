/**
 * SUBH BAKHABAR — Local JSON Persistence Layer (server-only)
 *
 * Reads/writes `/data/subh-db.json`. If the file does not exist (or is
 * unreadable/corrupt), it is bootstrapped from `src/data/seed.ts`.
 *
 * Only import this from Route Handlers, Server Components or Server Actions —
 * it depends on Node's `fs` module.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import { defaultUserProfile, seededEditions } from "@/data/seed";
import type {
  CandidateArticle,
  Edition,
  EditionSummary,
  ProfileChangeLog,
  SubhDatabase,
  UserProfile,
} from "@/types/subh";

/* -------------------------------------------------------------------------- */
/*                                   Config                                   */
/* -------------------------------------------------------------------------- */

const SCHEMA_VERSION = 1;
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "subh-db.json");

/** Most-recent candidate articles retained on disk. */
const MAX_ARTICLES = 500;

/* -------------------------------------------------------------------------- */
/*                               Core read/write                              */
/* -------------------------------------------------------------------------- */

function buildSeedDatabase(): SubhDatabase {
  // structuredClone so mutations never leak back into the seed module.
  return structuredClone({
    schemaVersion: SCHEMA_VERSION,
    activeProfileId: defaultUserProfile.id,
    profiles: [defaultUserProfile],
    articles: [],
    editions: seededEditions,
  });
}

function isDatabase(value: unknown): value is SubhDatabase {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<SubhDatabase>;
  return (
    typeof v.activeProfileId === "string" &&
    Array.isArray(v.profiles) &&
    Array.isArray(v.articles) &&
    Array.isArray(v.editions)
  );
}

function isNotFound(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as NodeJS.ErrnoException).code === "ENOENT";
}

/** Atomic write: write to a temp file, then rename over the target. */
async function writeFileAtomic(db: SubhDatabase): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_PATH}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_PATH);
}

/**
 * Serialises all read-modify-write operations within this process so
 * concurrent route handlers can't clobber each other's writes.
 */
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => undefined);
  return run;
}

/** Reads the database, bootstrapping it from seed data if missing or corrupt. */
export async function readDb(): Promise<SubhDatabase> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (isDatabase(parsed)) return parsed;
    console.warn("[store] subh-db.json has an invalid shape — re-seeding.");
  } catch (err) {
    if (!isNotFound(err)) {
      console.warn("[store] Failed to read subh-db.json — re-seeding.", err);
    }
  }
  const seeded = buildSeedDatabase();
  await enqueue(() => writeFileAtomic(seeded));
  return seeded;
}

/** Overwrites the whole database. Prefer `updateDb` for targeted changes. */
export async function writeDb(db: SubhDatabase): Promise<void> {
  await enqueue(() => writeFileAtomic(db));
}

/**
 * Read-modify-write helper. The mutator may mutate `db` in place and/or return
 * a value, which is passed back to the caller.
 */
export async function updateDb<T>(mutator: (db: SubhDatabase) => T | Promise<T>): Promise<T> {
  // Ensure the file exists before entering the queue (readDb may itself enqueue a bootstrap write).
  await readDb();
  return enqueue(async () => {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const db = JSON.parse(raw) as SubhDatabase;
    const result = await mutator(db);
    await writeFileAtomic(db);
    return result;
  });
}

/** Restores the database to the seeded state. */
export async function resetDb(): Promise<SubhDatabase> {
  const seeded = buildSeedDatabase();
  await writeDb(seeded);
  return seeded;
}

/* -------------------------------------------------------------------------- */
/*                                   Profile                                  */
/* -------------------------------------------------------------------------- */

function findActiveProfile(db: SubhDatabase): UserProfile {
  const profile = db.profiles.find((p) => p.id === db.activeProfileId) ?? db.profiles[0];
  if (!profile) throw new Error("[store] No profiles found in database.");
  return profile;
}

export async function getActiveProfile(): Promise<UserProfile> {
  return findActiveProfile(await readDb());
}

/**
 * Saves the given profile as-is (inserting it if new) and marks it active.
 * Does not bump `version` — use `updateActiveProfile` for tracked mutations.
 */
export async function saveProfile(profile: UserProfile): Promise<UserProfile> {
  return updateDb((db) => {
    const idx = db.profiles.findIndex((p) => p.id === profile.id);
    if (idx >= 0) db.profiles[idx] = profile;
    else db.profiles.push(profile);
    db.activeProfileId = profile.id;
    return profile;
  });
}

/**
 * Applies a mutation to the active profile, bumps `version` + `updatedAt`, and
 * optionally appends a change-log entry (used by the Chief Editor / inline feedback).
 */
export async function updateActiveProfile(
  mutate: (profile: UserProfile) => UserProfile,
  logEntry?: Omit<ProfileChangeLog, "id" | "timestamp"> & Partial<Pick<ProfileChangeLog, "id" | "timestamp">>,
): Promise<UserProfile> {
  return updateDb((db) => {
    const current = findActiveProfile(db);
    const now = new Date().toISOString();
    const next: UserProfile = {
      ...mutate(structuredClone(current)),
      id: current.id,
      version: current.version + 1,
      updatedAt: now,
    };
    if (logEntry) {
      next.changeLog = [
        ...next.changeLog,
        {
          ...logEntry,
          id: logEntry.id ?? `chg-${Date.now().toString(36)}`,
          timestamp: logEntry.timestamp ?? now,
        },
      ];
    }
    db.profiles = db.profiles.map((p) => (p.id === current.id ? next : p));
    return next;
  });
}

/* -------------------------------------------------------------------------- */
/*                                  Editions                                  */
/* -------------------------------------------------------------------------- */

function sortEditionsDesc(editions: Edition[]): Edition[] {
  return [...editions].sort((a, b) => b.date.localeCompare(a.date));
}

/** All editions, newest first. */
export async function getEditions(): Promise<Edition[]> {
  return sortEditionsDesc((await readDb()).editions);
}

/** Lightweight list for the archive / edition switcher, newest first. */
export async function listEditionSummaries(): Promise<EditionSummary[]> {
  return (await getEditions()).map((e) => ({
    date: e.date,
    editionNumber: e.editionNumber,
    leadHeadline: e.stories[0]?.headline ?? "",
  }));
}

export async function getEdition(date: string): Promise<Edition | null> {
  return (await readDb()).editions.find((e) => e.date === date) ?? null;
}

export async function getLatestEdition(): Promise<Edition | null> {
  return (await getEditions())[0] ?? null;
}

/** Next edition number (max existing + 1). */
export async function getNextEditionNumber(): Promise<number> {
  const editions = (await readDb()).editions;
  return editions.reduce((max, e) => Math.max(max, e.editionNumber), 0) + 1;
}

/**
 * Inserts or replaces the edition for `edition.date`.
 * Editions are treated as immutable snapshots; replacement is only intended
 * for regenerating today's issue or a single story within it.
 */
export async function saveEdition(edition: Edition): Promise<Edition> {
  return updateDb((db) => {
    const idx = db.editions.findIndex((e) => e.date === edition.date);
    if (idx >= 0) db.editions[idx] = edition;
    else db.editions.push(edition);
    db.editions = sortEditionsDesc(db.editions);
    return edition;
  });
}

/* -------------------------------------------------------------------------- */
/*                             Candidate Articles                             */
/* -------------------------------------------------------------------------- */

export async function getCandidateArticles(): Promise<CandidateArticle[]> {
  return (await readDb()).articles;
}

/**
 * Stores ingested RSS articles.
 * - `merge` (default): de-duplicates by `link`, newer data wins.
 * - `replace`: discards existing articles.
 * Retains the most recent `MAX_ARTICLES` by `publishedAt`.
 */
export async function saveCandidateArticles(
  articles: CandidateArticle[],
  mode: "merge" | "replace" = "merge",
): Promise<CandidateArticle[]> {
  return updateDb((db) => {
    const byLink = new Map<string, CandidateArticle>();
    if (mode === "merge") for (const a of db.articles) byLink.set(a.link, a);
    for (const a of articles) byLink.set(a.link, a);
    db.articles = [...byLink.values()]
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, MAX_ARTICLES);
    return db.articles;
  });
}

