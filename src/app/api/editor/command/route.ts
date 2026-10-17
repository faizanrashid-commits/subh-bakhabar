import { NextRequest, NextResponse } from "next/server";
import { getActiveProfile, updateActiveProfile } from "@/lib/store";
import { processEditorCommand } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const command =
      typeof body.command === "string" ? body.command.trim() : "";
    const highlightedQuote =
      typeof body.highlightedQuote === "string"
        ? body.highlightedQuote.trim()
        : undefined;
    const autoApply = Boolean(body.autoApply);

    if (!command) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter an instruction for the Chief Editor.",
        },
        { status: 400 }
      );
    }

    const currentProfile = await getActiveProfile();
    const result = await processEditorCommand(
      command,
      currentProfile,
      highlightedQuote
    );

    let persistedProfile = result.updatedProfile;
    let changeEntry = undefined;

    if (autoApply) {
      persistedProfile = await updateActiveProfile(
        (prev) => ({
          ...prev,
          lifeLenses: result.updatedProfile.lifeLenses,
          incubatorGoal: result.updatedProfile.incubatorGoal,
          trackedStoryIds: result.updatedProfile.trackedStoryIds,
        }),
        {
          source: "chief_editor",
          summary: result.summary,
          previousState: result.previousState,
          newState: result.newState,
        }
      );
      changeEntry =
        persistedProfile.changeLog[persistedProfile.changeLog.length - 1];
    }

    return NextResponse.json({
      success: true,
      reply: result.reply,
      summary: result.summary,
      proposedChanges: result.proposedChanges,
      previousState: result.previousState,
      newState: result.newState,
      updatedProfile: persistedProfile,
      changeEntry,
      origin: result.origin,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Chief Editor command processing failed.",
      },
      { status: 500 }
    );
  }
}

