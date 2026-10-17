/**
 * SUBH BAKHABAR — RSS Ingestion API
 *
 * POST /api/ingest
 * Fetches RSS feeds across curated sources, deduplicates, stores candidate
 * articles in local persistence, and returns ingest metrics.
 */

import { NextResponse } from "next/server";
import { fetchAndIngestFeeds } from "@/lib/rss";
import { getCandidateArticles } from "@/lib/store";

export async function POST() {
  try {
    const result = await fetchAndIngestFeeds();
    return NextResponse.json({
      success: true,
      fetchedCount: result.fetchedCount,
      totalCandidates: result.totalCandidates,
      sources: result.sources,
      usedFallback: result.usedFallback,
    });
  } catch (error) {
    console.error("[api/ingest] Ingestion failure:", error);
    const existing = await getCandidateArticles();
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Ingestion failed",
        totalCandidates: existing.length,
      },
      { status: 500 }
    );
  }
}
