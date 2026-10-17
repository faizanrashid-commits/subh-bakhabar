/**
 * SUBH BAKHABAR — Edition Generation API
 *
 * POST /api/edition/generate
 * Accepts { date?: string, forceLive?: boolean }.
 * Runs candidate scoring, generates an 8-story Edition grounded in RSS,
 * saves it to the local store, and returns the generated Edition.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateEditionPipeline } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { date, forceLive } = body as { date?: string; forceLive?: boolean };

    const edition = await generateEditionPipeline({ date, forceLive });

    return NextResponse.json({
      success: true,
      edition,
    });
  } catch (error) {
    console.error("[api/edition/generate] Generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Edition generation failed",
      },
      { status: 500 }
    );
  }
}
