/**
 * SUBH BAKHABAR (صبح باخبر) — Core Data Schemas
 * Mirrors PLAN.md §2. These types are the single source of truth shared by
 * the web reader, the print/PDF view, the archive, and the API route handlers.
 */

/* -------------------------------------------------------------------------- */
/*                               Shared primitives                            */
/* -------------------------------------------------------------------------- */

/** ISO-8601 calendar date, e.g. "2026-10-17". */
export type ISODate = string;

/** ISO-8601 timestamp, e.g. "2026-10-17T06:00:00+05:00". */
export type ISOTimestamp = string;

/* -------------------------------------------------------------------------- */
/*                                 UserProfile                                */
/* -------------------------------------------------------------------------- */

export type KnowledgeBaseline = "beginner" | "intermediate" | "expert";

export interface LifeLens {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  /** Relative importance, 0–100. */
  weight: number;
  knowledgeBaseline: KnowledgeBaseline;
  /** The editorial angle this reader prefers for this lens. */
  preferredAngle: string;
}

export type IncubatorCategory = "exam_prep" | "new_domain" | "language";

/** 1 = complete novice … 5 = mastery. */
export type MasteryLevel = 1 | 2 | 3 | 4 | 5;

export interface IncubatorGoal {
  title: string;
  category: IncubatorCategory;
  masteryLevel: MasteryLevel;
  objective: string;
  progressionNotes: string[];
}

export type ProfileChangeSource = "chief_editor" | "inline_feedback";

/** The mutable slice of a profile that a change-log entry can snapshot. */
export type ProfileSnapshot = Partial<
  Pick<UserProfile, "name" | "lifeLenses" | "incubatorGoal" | "trackedStoryIds">
>;

export interface ProfileChangeLog {
  id: string;
  timestamp: ISOTimestamp;
  source: ProfileChangeSource;
  /** Human-readable summary, e.g. "Raised Solar lens baseline to expert". */
  summary: string;
  previousState: ProfileSnapshot;
  newState: ProfileSnapshot;
}

export interface UserProfile {
  id: string;
  name: string;
  updatedAt: ISOTimestamp;
  /** Monotonically increasing; editions record which version they were built for. */
  version: number;
  /** 3–4 multidimensional lenses. */
  lifeLenses: LifeLens[];
  incubatorGoal: IncubatorGoal;
  /** Continuing story threads pinned by the reader (matches `StoryItem.threadId`). */
  trackedStoryIds: string[];
  changeLog: ProfileChangeLog[];
}

/* -------------------------------------------------------------------------- */
/*                                  StoryItem                                 */
/* -------------------------------------------------------------------------- */

export type SlotType =
  | "lead_intersection"
  | "life_lens"
  | "continuing"
  | "incubator"
  | "beyond_bubble";

export type ProvenanceBadge =
  | "Multiple Outlets"
  | "Independently Corroborated"
  | "Single-Source / Developing"
  | "Primary Source Checked";

export interface Citation {
  sourceName: string;
  url: string;
  publishedAt: ISOTimestamp;
}

export interface StoryContinuity {
  /** Date of the edition in which this thread last appeared. */
  previousDate: ISODate;
  previously: string;
  newDevelopment: string;
  remainsUncertain: string;
}

export interface FramingSource {
  name: string;
  framing: string;
  url: string;
}

export interface FramingDivergence {
  summary: string;
  sourceA: FramingSource;
  sourceB: FramingSource;
}

export interface VocabEntry {
  term: string;
  meaning: string;
}

/** CSS Exam Brief — structured the way CSS examiners expect answers. */
export interface CssBriefModule {
  kind: "css_brief";
  background: string;
  coreIssue: string;
  policyAngle: string;
  wayForward: string;
  /** Optional past-paper-style practice question. */
  practiceQuestion?: string;
  keyTerms?: VocabEntry[];
}

/** Domain Primer — for "new_domain" goals (e.g. Formula 1 from scratch). */
export interface DomainPrimerModule {
  kind: "domain_primer";
  concept: string;
  explanation: string;
  analogy: string;
  keyTerms: VocabEntry[];
}

/** German Bilingual Passage — for "language" goals. */
export interface BilingualPassageModule {
  kind: "bilingual_passage";
  language: string;
  passage: string;
  translation: string;
  vocabulary: VocabEntry[];
}

export type IncubatorModule =
  | CssBriefModule
  | DomainPrimerModule
  | BilingualPassageModule;

export interface StoryItem {
  id: string;
  slotType: SlotType;
  /** Stable id linking the same story across editions (used for continuity + tracking). */
  threadId?: string;
  headline: string;
  subheadline: string;
  sectionLabel: string;
  readTimeMinutes: number;
  /** Source-grounded, strictly factual journalistic summary. */
  reportedFacts: string;
  citations: Citation[];
  provenanceBadge: ProvenanceBadge;
  /** Personalized synthesis connecting the story to one or more Life Lenses. */
  whyYou: string;
  /** Short badge, e.g. "Embedded Systems + Pakistan Energy Policy". */
  includedBecause: string;
  /** 0–100. 35% Relevance, 25% Cross-Lens, 20% Significance, 10% Freshness, 10% Novelty. */
  intersectionScore: number;
  whatToWatchNext: string;
  continuity?: StoryContinuity;
  framingDivergence?: FramingDivergence;
  incubatorModule?: IncubatorModule;
}

/* -------------------------------------------------------------------------- */
/*                                   Edition                                  */
/* -------------------------------------------------------------------------- */

export interface EditorialCartoon {
  prompt: string;
  imageUrl: string;
  caption: string;
  relatedStoryId: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  storyId: string;
}

export type EditionOrigin = "seed" | "gemini" | "mock";

/** Immutable snapshot per date. */
export interface Edition {
  date: ISODate;
  editionNumber: number;
  /** `UserProfile.version` this edition was generated against. */
  profileVersion: number;
  generatedAt: ISOTimestamp;
  origin: EditionOrigin;
  mastheadQuote: string;
  editorialNote: string;
  editorialCartoon: EditorialCartoon;
  /** ~150-word morning newsroom broadcast covering the top 3 stories. */
  audioBriefScript: string;
  /** Fixed array of 8 stories. */
  stories: StoryItem[];
  /** 3 retention questions. */
  dailyQuiz: QuizQuestion[];
}

/** Lightweight listing for the archive / edition switcher. */
export interface EditionSummary {
  date: ISODate;
  editionNumber: number;
  leadHeadline: string;
}

/* -------------------------------------------------------------------------- */
/*                         Ingestion & Persistence Layer                      */
/* -------------------------------------------------------------------------- */

export type FeedCategory =
  | "tech_embedded"
  | "pakistan_energy"
  | "pakistan_news"
  | "global_affairs"
  | "sports_culture";

/** A raw article pulled from RSS, before scoring/selection. */
export interface CandidateArticle {
  id: string;
  title: string;
  link: string;
  sourceName: string;
  feedCategory: FeedCategory;
  publishedAt: ISOTimestamp;
  snippet: string;
  fetchedAt: ISOTimestamp;
  /** Populated by `scoreCandidateArticles` (Stage 3). */
  score?: number;
  matchedLensIds?: string[];
}

/** Shape of `/data/subh-db.json`. */
export interface SubhDatabase {
  schemaVersion: number;
  activeProfileId: string;
  profiles: UserProfile[];
  articles: CandidateArticle[];
  editions: Edition[];
}

