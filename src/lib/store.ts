/**
 * SUBH BAKHABAR — Local JSON Persistence Layer & Resilient In-Memory Fallback
 *
 * Reads/writes `/data/subh-db.json`. In serverless environments like Vercel
 * where the filesystem outside `/tmp` is read-only (EROFS) or `data/` is omitted,
 * it seamlessly and gracefully falls back to an in-memory store initialized
 * with SEED_PROFILE and SEED_EDITIONS / SEED_EDITION from `src/data/seed.ts`.
 *
 * Guaranteed to never throw unhandled filesystem errors during SSR or page rendering.
 */

import fs, { promises as fsPromises } from "node:fs";
import path from "node:path";

import {
  defaultUserProfile,
  seededEditions,
  SEED_PROFILE,
  SEED_EDITION,
  SEED_EDITIONS,
} from "../data/seed";
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
/*                               In-Memory Store                              */
/* -------------------------------------------------------------------------- */

function buildSeedDatabase(): SubhDatabase {
  const profile = SEED_PROFILE ?? defaultUserProfile;
  const editions =
    SEED_EDITIONS ?? seededEditions ?? (SEED_EDITION ? [SEED_EDITION] : []);

  // structuredClone so mutations never leak back into the seed module.
  return structuredClone({
    schemaVersion: SCHEMA_VERSION,
    activeProfileId: profile.id,
    profiles: [profile],
    articles: [],
    editions,
  });
}

/**
 * In-memory fallback database used whenever the filesystem is read-only
 * (e.g. Vercel serverless functions) or file access fails.
 */
let memoryDb: SubhDatabase | null = null;

function getMemoryDb(): SubhDatabase {
  if (!memoryDb) {
    memoryDb = buildSeedDatabase();
  }
  return memoryDb;
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

/**
 * Atomic write: write to a temp file, then rename over the target.
 * In read-only or serverless environments (EROFS), safely updates in-memory store.
 */
async function writeFileAtomic(db: SubhDatabase): Promise<void> {
  memoryDb = structuredClone(db);
  try {
    await fsPromises.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${DB_PATH}.${process.pid}.${Date.now()}.tmp`;
    await fsPromises.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
    await fsPromises.rename(tmp, DB_PATH);
  } catch (err) {
    // EROFS / permission / missing parent in read-only serverless environment
    console.warn(
      "[store] Filesystem write bypassed (operating in read-only/serverless environment):",
      err instanceof Error ? err.message : err
    );
  }
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

/**
 * Reads the database from disk, bootstrapping it from seed data if missing or corrupt.
 * In read-only environments (Vercel), falls back to in-memory seed store without throwing.
 */
export async function readDb(): Promise<SubhDatabase> {
  try {
    let exists = false;
    try {
      exists = fs.existsSync(DB_PATH);
    } catch {
      exists = false;
    }

    if (exists) {
      const raw = await fsPromises.readFile(DB_PATH, "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (isDatabase(parsed)) {
        const seedList = SEED_EDITIONS ?? seededEditions;
        const seedByDate = new Map(seedList.map((e) => [e.date, e]));
        parsed.editions = parsed.editions.map((ed) => {
          if (ed.origin === "seed" && seedByDate.has(ed.date)) {
            return structuredClone(seedByDate.get(ed.date)!);
          }
          return ed;
        });
        memoryDb = parsed;
        return parsed;
      }
      console.warn("[store] subh-db.json has an invalid shape — falling back to seed.");
    }
  } catch (err) {
    console.warn(
      "[store] Could not read subh-db.json — falling back to memory/seed:",
      err instanceof Error ? err.message : err
    );
  }

  // If memoryDb has in-process state, return it
  if (memoryDb) {
    return memoryDb;
  }

  const seeded = buildSeedDatabase();
  memoryDb = seeded;
  try {
    await enqueue(() => writeFileAtomic(seeded));
  } catch (err) {
    console.warn("[store] Seed file bootstrap write skipped:", err);
  }
  return seeded;
}

/**
 * Load store helper safe for serverless runtimes.
 * If reading fails or file is missing, returns the in-memory fallback state containing
 * SEED_PROFILE and SEED_EDITION without throwing.
 */
export async function loadStore(): Promise<SubhDatabase> {
  return readDb();
}

/**
 * Persist store helper safe for serverless runtimes.
 * Updates in-memory state first, then gracefully swallows any filesystem EROFS error.
 */
export async function persistStore(db: SubhDatabase): Promise<void> {
  return writeDb(db);
}

/** Synchronous load store helper with complete try/catch wrapping. */
export function loadStoreSync(): SubhDatabase {
  if (memoryDb) {
    return memoryDb;
  }
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (isDatabase(parsed)) {
        memoryDb = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn(
      "[store] loadStoreSync read failed, falling back to in-memory seed:",
      err instanceof Error ? err.message : err
    );
  }
  memoryDb = buildSeedDatabase();
  return memoryDb;
}

/** Synchronous persist store helper that catches and swallows EROFS gracefully. */
export function persistStoreSync(db: SubhDatabase): void {
  memoryDb = structuredClone(db);
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    console.warn(
      "[store] persistStoreSync filesystem write skipped (read-only):",
      err instanceof Error ? err.message : err
    );
  }
}

/** Overwrites the whole database. Prefer `updateDb` for targeted changes. */
export async function writeDb(db: SubhDatabase): Promise<void> {
  await enqueue(() => writeFileAtomic(db));
}

/**
 * Read-modify-write helper. The mutator may mutate `db` in place and/or return
 * a value, which is passed back to the caller.
 * Never throws EROFS on read-only systems; persists to memoryDb seamlessly.
 */
export async function updateDb<T>(
  mutator: (db: SubhDatabase) => T | Promise<T>
): Promise<T> {
  let initialDb: SubhDatabase;
  try {
    initialDb = await readDb();
  } catch {
    initialDb = getMemoryDb();
  }

  return enqueue(async () => {
    let dbToMutate: SubhDatabase;
    try {
      const raw = await fsPromises.readFile(DB_PATH, "utf8");
      dbToMutate = JSON.parse(raw) as SubhDatabase;
    } catch {
      dbToMutate = memoryDb ? structuredClone(memoryDb) : structuredClone(initialDb);
    }

    const result = await mutator(dbToMutate);
    memoryDb = structuredClone(dbToMutate);
    try {
      await writeFileAtomic(dbToMutate);
    } catch (writeErr) {
      console.warn("[store] updateDb write skipped:", writeErr);
    }
    return result;
  });
}

/** Restores the database to the seeded state. */
export async function resetDb(): Promise<SubhDatabase> {
  const seeded = buildSeedDatabase();
  memoryDb = structuredClone(seeded);
  try {
    await writeDb(seeded);
  } catch (err) {
    console.warn("[store] resetDb disk write skipped:", err);
  }
  return seeded;
}

/* -------------------------------------------------------------------------- */
/*                                   Profile                                  */
/* -------------------------------------------------------------------------- */

function findActiveProfile(db: SubhDatabase): UserProfile {
  const profile =
    db.profiles.find((p) => p.id === db.activeProfileId) ?? db.profiles[0];
  if (!profile) {
    const fallback = SEED_PROFILE ?? defaultUserProfile;
    return structuredClone(fallback);
  }
  if (!profile.editorialTone) {
    profile.editorialTone = "classical";
  }
  return profile;
}

/**
 * Returns active user profile, guaranteed to never throw even if
 * filesystem read fails or file is missing.
 */
export async function getActiveProfile(): Promise<UserProfile> {
  const fallback = SEED_PROFILE ?? defaultUserProfile;
  try {
    const db = await readDb();
    const profile = findActiveProfile(db);
    return profile || structuredClone(fallback);
  } catch (err) {
    console.warn("[store] getActiveProfile fallback to SEED_PROFILE:", err);
    return structuredClone(fallback);
  }
}

/**
 * Saves the given profile as-is (inserting it if new) and marks it active.
 * Does not bump `version` — use `updateActiveProfile` or `updateUserProfile` for tracked mutations.
 */
export async function saveProfile(profile: UserProfile): Promise<UserProfile> {
  return updateDb((db) => {
    const normalized: UserProfile = {
      ...profile,
      editorialTone: profile.editorialTone ?? "classical",
    };
    const idx = db.profiles.findIndex((p) => p.id === normalized.id);
    if (idx >= 0) db.profiles[idx] = normalized;
    else db.profiles.push(normalized);
    db.activeProfileId = normalized.id;
    return normalized;
  });
}

/**
 * Applies a mutation to the active profile, bumps `version` + `updatedAt`, and
 * optionally appends a change-log entry (used by the Chief Editor / inline feedback / tone switcher).
 */
export async function updateActiveProfile(
  mutate: (profile: UserProfile) => UserProfile,
  logEntry?: Omit<ProfileChangeLog, "id" | "timestamp"> &
    Partial<Pick<ProfileChangeLog, "id" | "timestamp">>
): Promise<UserProfile> {
  return updateDb((db) => {
    const current = findActiveProfile(db);
    const now = new Date().toISOString();
    const mutated = mutate(structuredClone(current));
    const next: UserProfile = {
      ...mutated,
      editorialTone:
        mutated.editorialTone ?? current.editorialTone ?? "classical",
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

/**
 * Updates the active user profile (including `editorialTone`), accepting either
 * a partial profile patch or a mutator function.
 */
export async function updateUserProfile(
  patchOrMutate:
    | Partial<
        Pick<
          UserProfile,
          | "name"
          | "lifeLenses"
          | "incubatorGoal"
          | "trackedStoryIds"
          | "editorialTone"
        >
      >
    | ((profile: UserProfile) => UserProfile),
  logEntry?: Omit<ProfileChangeLog, "id" | "timestamp"> &
    Partial<Pick<ProfileChangeLog, "id" | "timestamp">>
): Promise<UserProfile> {
  if (typeof patchOrMutate === "function") {
    return updateActiveProfile(patchOrMutate, logEntry);
  }
  return updateActiveProfile(
    (prev) => ({
      ...prev,
      ...patchOrMutate,
      editorialTone:
        patchOrMutate.editorialTone ?? prev.editorialTone ?? "classical",
    }),
    logEntry
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Editions                                  */
/* -------------------------------------------------------------------------- */

function sortEditionsDesc(editions: Edition[]): Edition[] {
  return [...editions].sort((a, b) => b.date.localeCompare(a.date));
}

/** All editions, newest first. Safe against filesystem errors. */
export async function getEditions(): Promise<Edition[]> {
  try {
    const db = await readDb();
    if (Array.isArray(db.editions) && db.editions.length > 0) {
      return sortEditionsDesc(db.editions);
    }
  } catch (err) {
    console.warn("[store] getEditions fallback to SEED_EDITIONS:", err);
  }
  return sortEditionsDesc(structuredClone(SEED_EDITIONS ?? seededEditions));
}

/** Lightweight list for the archive / edition switcher, newest first. */
export async function listEditionSummaries(): Promise<EditionSummary[]> {
  try {
    const editions = await getEditions();
    return editions.map((e) => ({
      date: e.date,
      editionNumber: e.editionNumber,
      leadHeadline: e.stories[0]?.headline ?? "",
    }));
  } catch (err) {
    console.warn("[store] listEditionSummaries fallback:", err);
    return (SEED_EDITIONS ?? seededEditions).map((e) => ({
      date: e.date,
      editionNumber: e.editionNumber,
      leadHeadline: e.stories[0]?.headline ?? "",
    }));
  }
}

export async function getEdition(date: string): Promise<Edition | null> {
  try {
    const editions = await getEditions();
    const found = editions.find((e) => e.date === date);
    if (found) return found;
  } catch (err) {
    console.warn(`[store] getEdition(${date}) fallback:`, err);
  }
  const fallbackList = SEED_EDITIONS ?? seededEditions;
  const match = fallbackList.find((e) => e.date === date);
  return match ? structuredClone(match) : null;
}

export async function getLatestEdition(): Promise<Edition | null> {
  const fallback = SEED_EDITION ?? seededEditions[0];
  try {
    const editions = await getEditions();
    if (editions.length > 0 && editions[0]) return editions[0];
  } catch (err) {
    console.warn("[store] getLatestEdition fallback:", err);
  }
  return fallback ? structuredClone(fallback) : null;
}

/**
 * Returns the active edition, guaranteed to never throw or return null
 * even during SSR or under read-only serverless filesystems.
 */
export async function getActiveEdition(): Promise<Edition> {
  const fallback = SEED_EDITION ?? seededEditions[0];
  try {
    const edition = await getLatestEdition();
    return edition || structuredClone(fallback);
  } catch (err) {
    console.warn("[store] getActiveEdition fallback to SEED_EDITION:", err);
    return structuredClone(fallback);
  }
}

/** Next edition number (max existing + 1). */
export async function getNextEditionNumber(): Promise<number> {
  try {
    const editions = await getEditions();
    return editions.reduce((max, e) => Math.max(max, e.editionNumber), 0) + 1;
  } catch (err) {
    console.warn("[store] getNextEditionNumber fallback:", err);
    return 43;
  }
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
  try {
    return (await readDb()).articles;
  } catch (err) {
    console.warn("[store] getCandidateArticles fallback:", err);
    return [];
  }
}

/**
 * Stores ingested RSS articles.
 * - `merge` (default): de-duplicates by `link`, newer data wins.
 * - `replace`: discards existing articles.
 * Retains the most recent `MAX_ARTICLES` by `publishedAt`.
 */
export async function saveCandidateArticles(
  articles: CandidateArticle[],
  mode: "merge" | "replace" = "merge"
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
