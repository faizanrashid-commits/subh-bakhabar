import { NextRequest, NextResponse } from "next/server";
import {
  getActiveProfile,
  getEdition,
  getLatestEdition,
  saveEdition,
} from "@/lib/store";
import { regenerateSingleStory } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const storyId: string = body.storyId;
    const instruction: string =
      typeof body.instruction === "string" && body.instruction.trim()
        ? body.instruction.trim()
        : "Recalibrate depth and angle to match my latest Persona Brain lenses.";
    const date: string | undefined = body.date;

    if (!storyId) {
      return NextResponse.json(
        { success: false, error: "storyId is required to regenerate a story." },
        { status: 400 }
      );
    }

    const [profile, edition] = await Promise.all([
      getActiveProfile(),
      date ? getEdition(date) : getLatestEdition(),
    ]);

    if (!edition) {
      return NextResponse.json(
        { success: false, error: "Target edition not found." },
        { status: 404 }
      );
    }

    const storyIndex = edition.stories.findIndex((s) => s.id === storyId);
    if (storyIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: `Story '${storyId}' not found in edition ${edition.date}.`,
        },
        { status: 404 }
      );
    }

    const targetStory = edition.stories[storyIndex];
    const { story: regeneratedStory, origin } = await regenerateSingleStory(
      targetStory,
      instruction,
      profile
    );

    const updatedEdition = {
      ...edition,
      profileVersion: profile.version,
      stories: edition.stories.map((s, idx) =>
        idx === storyIndex ? regeneratedStory : s
      ),
    };

    await saveEdition(updatedEdition);

    return NextResponse.json({
      success: true,
      story: regeneratedStory,
      edition: updatedEdition,
      origin,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to regenerate single story.",
      },
      { status: 500 }
    );
  }
}

