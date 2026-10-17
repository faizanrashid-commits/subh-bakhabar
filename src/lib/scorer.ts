/**
 * SUBH BAKHABAR — Deterministic 35/25/20/10/10 Ranking Engine
 *
 * Implements the explainable 5-factor scoring formula from PLAN.md §2:
 *  - 35% Personal Relevance: Keyword & domain match against Life Lenses weighted by lens weight
 *  - 25% Cross-Lens Intersection: Bonus when an article matches 2+ distinct Life Lenses
 *  - 20% General Significance: Major source authority & multi-outlet coverage
 *  - 10% Freshness: Recency of publication date
 *  - 10% Novelty / Continuity: Freshness vs yesterday's edition, with continuity thread tagging
 *
 * Also provides beyond-bubble discovery selection.
 */

import type {
  CandidateArticle,
  Edition,
  LifeLens,
  UserProfile,
} from "@/types/subh";

/* -------------------------------------------------------------------------- */
/*                                Types                                       */
/* -------------------------------------------------------------------------- */

export interface ArticleScoreBreakdown {
  relevance: number; // 0..35
  crossLens: number; // 0..25
  significance: number; // 0..20
  freshness: number; // 0..10
  novelty: number; // 0..10
  total: number; // 0..100
  matchedLensIds: string[];
  matchedKeywords: string[];
  isContinuityCandidate?: boolean;
  continuingThreadId?: string;
}

export interface ScoredCandidateArticle extends CandidateArticle {
  score: number;
  matchedLensIds: string[];
  breakdown: ArticleScoreBreakdown;
}

/* -------------------------------------------------------------------------- */
/*                            Heuristic Constants                             */
/* -------------------------------------------------------------------------- */

const MAJOR_OUTLET_AUTHORITY: Record<string, number> = {
  Dawn: 14,
  "BBC World": 14,
  "Ars Technica": 13,
  "Business Recorder": 13,
  Reuters: 14,
  "The Express Tribune": 11,
  CleanTechnica: 11,
  Electrek: 11,
  "Hacker News": 10,
};

/* -------------------------------------------------------------------------- */
/*                              Helper Functions                              */
/* -------------------------------------------------------------------------- */

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function calculateJaccard(tokensA: string[], tokensB: string[]): number {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  if (setA.size === 0 || setB.size === 0) return 0;

  let common = 0;
  for (const item of setA) {
    if (setB.has(item)) common++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : common / union;
}

/** Checks whether a lens keyword appears in text as a whole phrase or word. */
function matchesKeyword(textLower: string, keyword: string): boolean {
  const kw = keyword.toLowerCase().trim();
  if (!kw) return false;
  // If keyword is multi-word, check substring
  if (kw.includes(" ")) {
    return textLower.includes(kw);
  }
  // Single word: match with word boundary
  const regex = new RegExp(`\\b${kw}\\b`, "i");
  return regex.test(textLower);
}

/* -------------------------------------------------------------------------- */
/*                            Core Scoring Routine                            */
/* -------------------------------------------------------------------------- */

export function scoreCandidateArticles(
  articles: CandidateArticle[],
  profile: UserProfile,
  previousEditions: Edition[]
): ScoredCandidateArticle[] {
  const now = Date.now();
  const latestYesterdayEdition = previousEditions[0] ?? null;

  // Pre-tokenize articles for multi-outlet presence check
  const articleTokens = articles.map((a) => ({
    id: a.id,
    sourceName: a.sourceName,
    tokens: tokenize(`${a.title} ${a.snippet}`),
  }));

  const totalLensWeight =
    profile.lifeLenses.reduce((acc, l) => acc + (l.weight || 1), 0) || 100;

  const scoredList: ScoredCandidateArticle[] = [];

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const fullText = `${article.title} ${article.snippet}`.toLowerCase();
    const currentTokens = articleTokens[i]?.tokens || [];

    // --- 1. 35% PERSONAL RELEVANCE ---
    const matchedLensIds: string[] = [];
    const matchedKeywords: string[] = [];
    let weightedRelevanceSum = 0;

    for (const lens of profile.lifeLenses) {
      let lensMatchPoints = 0;
      const lensMatchedWords: string[] = [];

      // Keyword matches
      for (const kw of lens.keywords) {
        if (matchesKeyword(fullText, kw)) {
          lensMatchedWords.push(kw);
          matchedKeywords.push(kw);
        }
      }

      // Domain/category alignment bonus
      const categoryMatch =
        (lens.id.includes("auto") || lens.id.includes("embedded") || lens.id.includes("tech")) &&
        article.feedCategory === "tech_embedded"
          ? 0.35
          : (lens.id.includes("solar") || lens.id.includes("energy")) &&
            article.feedCategory === "pakistan_energy"
          ? 0.35
          : (lens.id.includes("macro") || lens.id.includes("policy") || lens.id.includes("pakistan")) &&
            article.feedCategory === "pakistan_news"
          ? 0.35
          : 0;

      if (lensMatchedWords.length > 0 || categoryMatch > 0) {
        // Keyword density score
        const kwScore = Math.min(1.0, lensMatchedWords.length * 0.4 + categoryMatch);
        lensMatchPoints = kwScore;

        if (lensMatchedWords.length >= 1 || categoryMatch >= 0.3) {
          matchedLensIds.push(lens.id);
        }
      }

      const normalizedWeight = (lens.weight || 30) / totalLensWeight;
      weightedRelevanceSum += lensMatchPoints * normalizedWeight;
    }

    const relevanceScore = Math.min(35, Math.round(weightedRelevanceSum * 35));

    // --- 2. 25% CROSS-LENS INTERSECTION ---
    let crossLensScore = 0;
    const uniqueMatchedLenses = Array.from(new Set(matchedLensIds));
    if (uniqueMatchedLenses.length >= 3) {
      crossLensScore = 25;
    } else if (uniqueMatchedLenses.length === 2) {
      crossLensScore = 20;
    } else if (uniqueMatchedLenses.length === 1) {
      crossLensScore = 6;
    } else {
      crossLensScore = 0;
    }

    // --- 3. 20% GENERAL SIGNIFICANCE ---
    const baseAuthority = MAJOR_OUTLET_AUTHORITY[article.sourceName] ?? 10;
    // Multi-outlet corroboration: check if any other outlet covered a similar topic
    let multiOutletBonus = 0;
    for (let j = 0; j < articleTokens.length; j++) {
      if (i === j) continue;
      const other = articleTokens[j];
      if (other.sourceName !== article.sourceName) {
        const jaccard = calculateJaccard(currentTokens, other.tokens);
        if (jaccard > 0.3) {
          multiOutletBonus = 6;
          break;
        }
      }
    }
    const significanceScore = Math.min(20, baseAuthority + multiOutletBonus);

    // --- 4. 10% FRESHNESS ---
    const pubTime = new Date(article.publishedAt).getTime();
    const hoursOld = isNaN(pubTime) ? 12 : Math.max(0, (now - pubTime) / (1000 * 60 * 60));
    let freshnessScore = 2;
    if (hoursOld <= 6) freshnessScore = 10;
    else if (hoursOld <= 12) freshnessScore = 8;
    else if (hoursOld <= 24) freshnessScore = 6;
    else if (hoursOld <= 48) freshnessScore = 4;

    // --- 5. 10% NOVELTY & CONTINUITY ---
    let noveltyScore = 10;
    let isContinuityCandidate = false;
    let continuingThreadId: string | undefined = undefined;

    if (latestYesterdayEdition) {
      for (const prevStory of latestYesterdayEdition.stories) {
        const prevTokens = tokenize(prevStory.headline + " " + prevStory.reportedFacts);
        const overlap = calculateJaccard(currentTokens, prevTokens);

        if (overlap > 0.28) {
          const isTracked =
            (prevStory.threadId && profile.trackedStoryIds?.includes(prevStory.threadId)) ||
            profile.trackedStoryIds?.includes(prevStory.id);

          if (isTracked) {
            isContinuityCandidate = true;
            continuingThreadId = prevStory.threadId || prevStory.id;
            noveltyScore = 8; // Good score for continuing thread progression
            break;
          } else if (overlap > 0.6) {
            // Unchanged repetitive angle from yesterday: penalize
            noveltyScore = 2;
            break;
          } else {
            noveltyScore = 6;
          }
        }
      }
    }

    const total = Math.min(
      100,
      Math.max(
        5,
        relevanceScore + crossLensScore + significanceScore + freshnessScore + noveltyScore
      )
    );

    const breakdown: ArticleScoreBreakdown = {
      relevance: relevanceScore,
      crossLens: crossLensScore,
      significance: significanceScore,
      freshness: freshnessScore,
      novelty: noveltyScore,
      total,
      matchedLensIds: uniqueMatchedLenses,
      matchedKeywords: Array.from(new Set(matchedKeywords)),
      isContinuityCandidate,
      continuingThreadId,
    };

    scoredList.push({
      ...article,
      score: total,
      matchedLensIds: uniqueMatchedLenses,
      breakdown,
    });
  }

  // Sort descending by score
  return scoredList.sort((a, b) => b.score - a.score);
}

/* -------------------------------------------------------------------------- */
/*                      Beyond-Bubble Candidate Selector                      */
/* -------------------------------------------------------------------------- */

/**
 * Selects 1 high-significance global / non-bubble article with 0% overlap
 * with the user's primary life lenses for the 'beyond_bubble' slot.
 */
export function selectBeyondBubbleCandidate(
  scoredArticles: ScoredCandidateArticle[],
  profile: UserProfile
): ScoredCandidateArticle | null {
  // First priority: 0 matched lenses, global affairs or reputable world feed
  const zeroOverlapGlobal = scoredArticles.filter(
    (a) =>
      a.matchedLensIds.length === 0 &&
      (a.feedCategory === "global_affairs" || a.sourceName === "BBC World")
  );

  if (zeroOverlapGlobal.length > 0) {
    // Sort by significance + freshness
    return zeroOverlapGlobal.sort(
      (a, b) =>
        b.breakdown.significance +
        b.breakdown.freshness -
        (a.breakdown.significance + a.breakdown.freshness)
    )[0];
  }

  // Second priority: 0 matched lenses in any other category
  const zeroOverlapAny = scoredArticles.filter((a) => a.matchedLensIds.length === 0);
  if (zeroOverlapAny.length > 0) {
    return zeroOverlapAny.sort(
      (a, b) =>
        b.breakdown.significance +
        b.breakdown.freshness -
        (a.breakdown.significance + a.breakdown.freshness)
    )[0];
  }

  // Fallback: candidate with the lowest overlap
  const sortedByOverlap = [...scoredArticles].sort(
    (a, b) => a.matchedLensIds.length - b.matchedLensIds.length
  );
  return sortedByOverlap[0] ?? null;
}

/* -------------------------------------------------------------------------- */
/*                       Slot Candidate Organization                          */
/* -------------------------------------------------------------------------- */

export interface OrganizedSlots {
  lead1: ScoredCandidateArticle;
  lead2: ScoredCandidateArticle;
  lensStories: ScoredCandidateArticle[];
  continuingStory: ScoredCandidateArticle | null;
  incubatorStory: ScoredCandidateArticle | null;
  beyondBubbleStory: ScoredCandidateArticle;
}

/**
 * Organizes scored candidate articles cleanly across the 8 newspaper slots.
 */
export function organizeSlotCandidates(
  scoredArticles: ScoredCandidateArticle[],
  profile: UserProfile,
  previousEditions: Edition[]
): OrganizedSlots {
  if (scoredArticles.length === 0) {
    throw new Error("[scorer] Cannot organize slots from an empty candidate pool.");
  }

  const usedIds = new Set<string>();

  // 1. Beyond Bubble
  const beyondBubble =
    selectBeyondBubbleCandidate(scoredArticles, profile) ?? scoredArticles[scoredArticles.length - 1];
  usedIds.add(beyondBubble.id);

  // 2. Continuing story candidate
  let continuingStory = scoredArticles.find(
    (a) => !usedIds.has(a.id) && a.breakdown.isContinuityCandidate
  );
  if (!continuingStory) {
    // Look for previous edition thread matches
    const latestPrev = previousEditions[0];
    if (latestPrev) {
      continuingStory = scoredArticles.find((a) => {
        if (usedIds.has(a.id)) return false;
        return latestPrev.stories.some((s) => s.threadId && a.title.toLowerCase().includes(s.threadId.replace(/-/g, " ")));
      });
    }
  }
  if (!continuingStory) {
    // Pick a high-scoring story in pakistan_news or energy
    continuingStory = scoredArticles.find(
      (a) => !usedIds.has(a.id) && (a.feedCategory === "pakistan_news" || a.feedCategory === "pakistan_energy")
    ) || scoredArticles[Math.min(5, scoredArticles.length - 1)];
  }
  if (continuingStory) usedIds.add(continuingStory.id);

  // 3. Lead Story 1: Highest cross-lens intersection score
  const lead1 =
    scoredArticles.find(
      (a) => !usedIds.has(a.id) && a.breakdown.crossLens >= 20
    ) || scoredArticles.find((a) => !usedIds.has(a.id)) || scoredArticles[0];
  usedIds.add(lead1.id);

  // 4. Lead Story 2: Next highest score
  const lead2 =
    scoredArticles.find((a) => !usedIds.has(a.id)) || scoredArticles[1] || lead1;
  usedIds.add(lead2.id);

  // 5. Life Lens Stories (one per lifeLens)
  const lensStories: ScoredCandidateArticle[] = [];
  for (const lens of profile.lifeLenses) {
    const candidate =
      scoredArticles.find(
        (a) => !usedIds.has(a.id) && a.matchedLensIds.includes(lens.id)
      ) ||
      scoredArticles.find(
        (a) =>
          !usedIds.has(a.id) &&
          (lens.id.includes("auto")
            ? a.feedCategory === "tech_embedded"
            : lens.id.includes("solar")
            ? a.feedCategory === "pakistan_energy"
            : a.feedCategory === "pakistan_news")
      ) ||
      scoredArticles.find((a) => !usedIds.has(a.id));

    if (candidate) {
      usedIds.add(candidate.id);
      lensStories.push(candidate);
    }
  }

  // Ensure 3 lens stories
  while (lensStories.length < 3) {
    const filler =
      scoredArticles.find((a) => !usedIds.has(a.id)) ||
      scoredArticles[lensStories.length % scoredArticles.length];
    usedIds.add(filler.id);
    lensStories.push(filler);
  }

  // 6. Incubator Story
  const incubatorStory =
    scoredArticles.find((a) => !usedIds.has(a.id)) ||
    scoredArticles.find((a) => a.id !== lead1.id && a.id !== lead2.id) ||
    lead2;

  return {
    lead1,
    lead2,
    lensStories,
    continuingStory: continuingStory ?? null,
    incubatorStory: incubatorStory ?? null,
    beyondBubbleStory: beyondBubble,
  };
}
