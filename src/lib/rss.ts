/**
 * SUBH BAKHABAR — Live RSS Ingestion & Bulletproof Feed Pipeline
 *
 * Fetches curated feeds across Pakistan & Macro, Energy & Solar,
 * Tech & Embedded Systems, and Global Affairs.
 *
 * Implements strict per-feed 6-second timeouts, HTML snippet sanitization,
 * URL and title deduplication, and a graceful fallback to seeded candidates
 * if offline or Wi-Fi drops during hackathon demos.
 */

import Parser from "rss-parser";
import { saveCandidateArticles, getCandidateArticles } from "@/lib/store";
import { seededEditions } from "@/data/seed";
import type { CandidateArticle, FeedCategory } from "@/types/subh";

/* -------------------------------------------------------------------------- */
/*                                Feed Registry                               */
/* -------------------------------------------------------------------------- */

export interface FeedSource {
  id: string;
  name: string;
  url: string;
  category: FeedCategory;
}

export const CURATED_FEEDS: FeedSource[] = [
  // 1. Pakistan & Macro Policy
  {
    id: "dawn-home",
    name: "Dawn",
    url: "https://www.dawn.com/feeds/home",
    category: "pakistan_news",
  },
  {
    id: "tribune-business",
    name: "The Express Tribune",
    url: "https://tribune.com.pk/feed/business",
    category: "pakistan_news",
  },
  {
    id: "brecorder-latest",
    name: "Business Recorder",
    url: "https://www.brecorder.com/feeds/latest-news",
    category: "pakistan_news",
  },

  // 2. Energy & Solar
  {
    id: "cleantechnica",
    name: "CleanTechnica",
    url: "https://cleantechnica.com/feed/",
    category: "pakistan_energy",
  },
  {
    id: "electrek",
    name: "Electrek",
    url: "https://electrek.co/feed/",
    category: "pakistan_energy",
  },

  // 3. Tech, Embedded & Automotive
  {
    id: "arstechnica",
    name: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    category: "tech_embedded",
  },
  {
    id: "hackernews",
    name: "Hacker News",
    url: "https://hnrss.org/frontpage",
    category: "tech_embedded",
  },

  // 4. Global / Beyond Bubble
  {
    id: "bbc-world",
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    category: "global_affairs",
  },
];

const FEED_TIMEOUT_MS = 6000;

/* -------------------------------------------------------------------------- */
/*                               String Helpers                               */
/* -------------------------------------------------------------------------- */

/** Strip HTML tags and entities from RSS summaries. */
export function cleanSnippet(raw?: string): string {
  if (!raw) return "";
  return raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 340);
}

/** Strip tracking query parameters from article links. */
export function normalizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = "";
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "fbclid",
      "gclid",
      "_ga",
    ];
    for (const param of trackingParams) {
      parsed.searchParams.delete(param);
    }
    return parsed.toString();
  } catch {
    return rawUrl.trim();
  }
}

/** Token-based Jaccard similarity for title deduplication. */
function titleSimilarity(titleA: string, titleB: string): number {
  const tokenize = (t: string) =>
    new Set(
      t
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );
  const setA = tokenize(titleA);
  const setB = tokenize(titleB);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/* -------------------------------------------------------------------------- */
/*                             Feed Parser Instance                           */
/* -------------------------------------------------------------------------- */

function createRssParser(): Parser {
  return new Parser({
    timeout: FEED_TIMEOUT_MS,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 SubhBakhabar/1.0",
      Accept:
        "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
    },
  });
}

/** Fetches a single feed with hard timeout. */
async function fetchSingleFeed(
  parser: Parser,
  feed: FeedSource
): Promise<CandidateArticle[]> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(`Feed timeout after ${FEED_TIMEOUT_MS}ms: ${feed.name}`)
        ),
      FEED_TIMEOUT_MS
    )
  );

  const fetchPromise = parser.parseURL(feed.url);
  const parsed = await Promise.race([fetchPromise, timeoutPromise]);

  const candidates: CandidateArticle[] = [];
  const fetchedAt = new Date().toISOString();

  for (const item of parsed.items ?? []) {
    const rawLink = item.link || item.guid || "";
    if (!rawLink || !item.title) continue;

    const link = normalizeUrl(rawLink);
    const title = item.title.trim();
    const snippet = cleanSnippet(
      item.contentSnippet || item.summary || item.content || item["content:encoded"] || ""
    );

    let publishedAt = fetchedAt;
    if (item.isoDate) {
      publishedAt = item.isoDate;
    } else if (item.pubDate) {
      const parsedDate = new Date(item.pubDate);
      if (!isNaN(parsedDate.getTime())) {
        publishedAt = parsedDate.toISOString();
      }
    }

    const id = `art-${feed.id}-${Buffer.from(link).toString("base64url").slice(0, 16)}`;

    candidates.push({
      id,
      title,
      link,
      sourceName: feed.name,
      feedCategory: feed.category,
      publishedAt,
      snippet,
      fetchedAt,
    });
  }

  return candidates;
}

/* -------------------------------------------------------------------------- */
/*                           Deduplication Routine                            */
/* -------------------------------------------------------------------------- */

export function deduplicateArticles(
  articles: CandidateArticle[]
): CandidateArticle[] {
  const urlMap = new Map<string, CandidateArticle>();
  const results: CandidateArticle[] = [];

  for (const art of articles) {
    if (!art.link || !art.title) continue;

    // Check exact URL
    if (urlMap.has(art.link)) continue;

    // Check title similarity against already accepted items
    const isDuplicateTitle = results.some(
      (existing) => titleSimilarity(existing.title, art.title) > 0.8
    );
    if (isDuplicateTitle) continue;

    urlMap.set(art.link, art);
    results.push(art);
  }

  return results;
}

/* -------------------------------------------------------------------------- */
/*                          Fallback Candidate Pool                           */
/* -------------------------------------------------------------------------- */

/**
 * Builds candidate articles from existing database or seeded editions
 * so the system can never crash even during complete network failure.
 */
export async function getFallbackCandidates(): Promise<CandidateArticle[]> {
  const existing = await getCandidateArticles();
  if (existing.length > 0) {
    return existing;
  }

  // Synthesize from seeded editions
  const fallbackList: CandidateArticle[] = [];
  const now = new Date().toISOString();

  for (const edition of seededEditions) {
    for (const story of edition.stories) {
      let feedCategory: FeedCategory = "pakistan_news";
      if (story.slotType === "beyond_bubble") feedCategory = "global_affairs";
      else if (story.includedBecause.toLowerCase().includes("embedded") || story.includedBecause.toLowerCase().includes("tech")) {
        feedCategory = "tech_embedded";
      } else if (story.includedBecause.toLowerCase().includes("solar") || story.includedBecause.toLowerCase().includes("energy")) {
        feedCategory = "pakistan_energy";
      }

      const primaryCitation = story.citations[0];
      fallbackList.push({
        id: `seed-cand-${story.id}`,
        title: story.headline,
        link: primaryCitation?.url || "https://www.dawn.com/business",
        sourceName: primaryCitation?.sourceName || "Dawn",
        feedCategory,
        publishedAt: primaryCitation?.publishedAt || story.continuity?.previousDate || edition.generatedAt,
        snippet: cleanSnippet(story.reportedFacts),
        fetchedAt: now,
      });
    }
  }

  return deduplicateArticles(fallbackList);
}

/* -------------------------------------------------------------------------- */
/*                            Public Ingestion API                            */
/* -------------------------------------------------------------------------- */

export interface IngestResult {
  articles: CandidateArticle[];
  fetchedCount: number;
  totalCandidates: number;
  sources: string[];
  usedFallback: boolean;
}

/**
 * Fetches all curated RSS feeds concurrently, deduplicates results,
 * persists them to the local store, and returns statistics.
 */
export async function fetchAndIngestFeeds(): Promise<IngestResult> {
  const parser = createRssParser();
  const successfulSources = new Set<string>();
  const rawArticles: CandidateArticle[] = [];

  const settled = await Promise.allSettled(
    CURATED_FEEDS.map(async (feed) => {
      const items = await fetchSingleFeed(parser, feed);
      return { feed, items };
    })
  );

  for (const res of settled) {
    if (res.status === "fulfilled" && res.value.items.length > 0) {
      successfulSources.add(res.value.feed.name);
      rawArticles.push(...res.value.items);
    } else if (res.status === "rejected") {
      console.warn("[rss] Feed failed:", res.reason?.message || res.reason);
    }
  }

  let finalCandidates: CandidateArticle[];
  let usedFallback = false;

  if (rawArticles.length > 0) {
    const deduplicated = deduplicateArticles(rawArticles);
    finalCandidates = await saveCandidateArticles(deduplicated, "merge");
  } else {
    console.warn("[rss] All live feeds failed or timed out — using resilient fallback pool.");
    finalCandidates = await getFallbackCandidates();
    usedFallback = true;
    successfulSources.add("Seeded Fallback Archive");
    await saveCandidateArticles(finalCandidates, "replace");
  }

  return {
    articles: finalCandidates,
    fetchedCount: rawArticles.length,
    totalCandidates: finalCandidates.length,
    sources: Array.from(successfulSources),
    usedFallback,
  };
}
