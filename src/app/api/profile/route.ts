import { NextRequest, NextResponse } from "next/server";
import { getActiveProfile, updateActiveProfile } from "@/lib/store";
import type {
  IncubatorGoal,
  LifeLens,
  ProfileChangeSource,
  ProfileSnapshot,
} from "@/types/subh";

export async function GET() {
  try {
    const profile = await getActiveProfile();
    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to fetch profile.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = await getActiveProfile();

    // Handle Undo restoration of a previous snapshot
    if (body.action === "undo") {
      const targetLogId: string | undefined = body.changeId;
      const logEntry = targetLogId
        ? current.changeLog.find((c) => c.id === targetLogId)
        : current.changeLog[current.changeLog.length - 1];

      const restoreSnapshot: ProfileSnapshot | undefined =
        body.restoreState || logEntry?.previousState;

      if (!restoreSnapshot) {
        return NextResponse.json(
          { success: false, error: "No previous state available to undo." },
          { status: 400 }
        );
      }

      const updated = await updateActiveProfile((prev) => ({
        ...prev,
        name: restoreSnapshot.name ?? prev.name,
        lifeLenses: restoreSnapshot.lifeLenses ?? prev.lifeLenses,
        incubatorGoal: restoreSnapshot.incubatorGoal ?? prev.incubatorGoal,
        trackedStoryIds: restoreSnapshot.trackedStoryIds ?? prev.trackedStoryIds,
        changeLog: logEntry
          ? prev.changeLog.filter((c) => c.id !== logEntry.id)
          : prev.changeLog,
      }));

      return NextResponse.json({
        success: true,
        profile: updated,
        undoneChangeId: logEntry?.id,
      });
    }

    const previousState: ProfileSnapshot = {
      name: current.name,
      lifeLenses: structuredClone(current.lifeLenses),
      incubatorGoal: structuredClone(current.incubatorGoal),
      trackedStoryIds: structuredClone(current.trackedStoryIds),
    };

    const nextName: string =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : current.name;

    const nextLenses: LifeLens[] = Array.isArray(body.lifeLenses)
      ? body.lifeLenses
      : current.lifeLenses;

    const nextIncubatorGoal: IncubatorGoal =
      body.incubatorGoal && typeof body.incubatorGoal === "object"
        ? body.incubatorGoal
        : current.incubatorGoal;

    const nextTrackedStoryIds: string[] = Array.isArray(body.trackedStoryIds)
      ? body.trackedStoryIds
      : current.trackedStoryIds;

    const newState: ProfileSnapshot = {
      name: nextName,
      lifeLenses: structuredClone(nextLenses),
      incubatorGoal: structuredClone(nextIncubatorGoal),
      trackedStoryIds: structuredClone(nextTrackedStoryIds),
    };

    const source: ProfileChangeSource =
      body.source === "inline_feedback" ? "inline_feedback" : "chief_editor";
    const summary: string =
      body.summary ||
      `Saved Editorial Profile (${nextLenses.length} Life Lenses · Incubator: ${nextIncubatorGoal.title})`;

    const updated = await updateActiveProfile(
      (prev) => ({
        ...prev,
        name: nextName,
        lifeLenses: nextLenses,
        incubatorGoal: nextIncubatorGoal,
        trackedStoryIds: nextTrackedStoryIds,
      }),
      {
        source,
        summary,
        previousState,
        newState,
      }
    );

    return NextResponse.json({
      success: true,
      profile: updated,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to update profile.",
      },
      { status: 500 }
    );
  }
}

