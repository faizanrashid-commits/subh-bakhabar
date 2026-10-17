import { NextRequest, NextResponse } from "next/server";
import { getActiveProfile } from "@/lib/store";
import { parseOnboardingPersona } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawInput = typeof body.rawInput === "string" ? body.rawInput.trim() : "";

    if (!rawInput) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please paste your ChatGPT Memory export, bio, or 3–5 article URLs/snippets to analyze.",
        },
        { status: 400 }
      );
    }

    const currentProfile = await getActiveProfile();
    const result = await parseOnboardingPersona(rawInput, currentProfile);

    return NextResponse.json({
      success: true,
      extractedName: result.extractedName,
      lifeLenses: result.lifeLenses,
      incubatorGoal: result.incubatorGoal,
      summary: result.summary,
      origin: result.origin,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to parse persona input.",
      },
      { status: 500 }
    );
  }
}

