/**
 * SUBH BAKHABAR — Active Edition & Archive API
 *
 * GET /api/edition
 * Returns { latestEdition, summaries, profile } from store.ts
 */

import { NextResponse } from "next/server";
import {
  getLatestEdition,
  listEditionSummaries,
  getActiveProfile,
} from "@/lib/store";

export async function GET() {
  try {
    const [latestEdition, summaries, profile] = await Promise.all([
      getLatestEdition(),
      listEditionSummaries(),
      getActiveProfile(),
    ]);

    return NextResponse.json({
      latestEdition,
      summaries,
      profile,
    });
  } catch (error) {
    console.error("[api/edition] GET error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load edition metadata",
      },
      { status: 500 }
    );
  }
}
