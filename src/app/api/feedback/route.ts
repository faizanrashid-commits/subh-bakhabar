import { NextRequest, NextResponse } from "next/server";
import { getActiveProfile, updateActiveProfile } from "@/lib/store";
import type { KnowledgeBaseline, LifeLens, ProfileSnapshot } from "@/types/subh";

export type FeedbackAction =
  | "more"
  | "too_basic"
  | "wrong_angle"
  | "track"
  | "skip";

function findMatchingLensIndices(
  lenses: LifeLens[],
  lensIds?: string[],
  sectionLabel?: string,
  includedBecause?: string
): number[] {
  if (Array.isArray(lensIds) && lensIds.length > 0) {
    const indices = lenses
      .map((l, idx) => (lensIds.includes(l.id) ? idx : -1))
      .filter((i) => i >= 0);
    if (indices.length > 0) return indices;
  }

  const haystack = `${sectionLabel || ""} ${includedBecause || ""}`.toLowerCase();
  if (haystack.trim()) {
    const matched = lenses
      .map((lens, idx) => {
        const titleMatch =
          haystack.includes(lens.title.toLowerCase()) ||
          lens.title
            .toLowerCase()
            .split(/\W+/)
            .filter((w) => w.length > 3)
            .some((word) => haystack.includes(word));
        const kwMatch = lens.keywords.some((kw) =>
          haystack.includes(kw.toLowerCase())
        );
        return titleMatch || kwMatch ? idx : -1;
      })
      .filter((i) => i >= 0);

    if (matched.length > 0) return matched;
  }

  return lenses.length > 0 ? [0] : [];
}

function elevateBaseline(current: KnowledgeBaseline): KnowledgeBaseline {
  if (current === "beginner") return "intermediate";
  return "expert";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const storyId: string = body.storyId || "story-unknown";
    const threadId: string = body.threadId || storyId;
    const action: FeedbackAction = body.action;
    const lensIds: string[] | undefined = body.lensIds;
    const sectionLabel: string | undefined = body.sectionLabel;
    const includedBecause: string | undefined = body.includedBecause;
    const undo: boolean = Boolean(body.undo);

    const validActions: FeedbackAction[] = [
      "more",
      "too_basic",
      "wrong_angle",
      "track",
      "skip",
    ];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid feedback action: ${action}` },
        { status: 400 }
      );
    }

    const current = await getActiveProfile();
    const previousState: ProfileSnapshot = {
      lifeLenses: structuredClone(current.lifeLenses),
      incubatorGoal: structuredClone(current.incubatorGoal),
      trackedStoryIds: structuredClone(current.trackedStoryIds),
    };

    const nextLenses = structuredClone(current.lifeLenses);
    let nextTracked = [...(current.trackedStoryIds || [])];
    const targetIndices = findMatchingLensIndices(
      nextLenses,
      lensIds,
      sectionLabel,
      includedBecause
    );
    const affectedTitles = targetIndices
      .map((i) => nextLenses[i]?.title)
      .filter(Boolean);
    const lensLabel =
      affectedTitles.join(", ") || sectionLabel || "Active Lens";

    let summary = "";

    switch (action) {
      case "more": {
        for (const idx of targetIndices) {
          nextLenses[idx].weight = Math.min(100, nextLenses[idx].weight + 8);
        }
        summary = `Increased priority weight (+8%) for ${lensLabel}`;
        break;
      }

      case "too_basic": {
        for (const idx of targetIndices) {
          const prevBase = nextLenses[idx].knowledgeBaseline;
          const nextBase = elevateBaseline(prevBase);
          nextLenses[idx].knowledgeBaseline = nextBase;
          if (
            !nextLenses[idx].preferredAngle
              .toLowerCase()
              .includes("skip introductory")
          ) {
            nextLenses[idx].preferredAngle = `${nextLenses[idx].preferredAngle} Skip introductory explanations; emphasize deep technical & quantitative specifics.`;
          }
        }
        summary = `Elevated knowledge baseline to ${
          nextLenses[targetIndices[0]]?.knowledgeBaseline.toUpperCase() ||
          "EXPERT"
        } for ${lensLabel}`;
        break;
      }

      case "wrong_angle": {
        for (const idx of targetIndices) {
          nextLenses[idx].weight = Math.max(10, nextLenses[idx].weight - 5);
          nextLenses[idx].preferredAngle =
            "Reframe toward primary empirical data, hardware/unit-economics trade-offs, and concrete regulatory outcomes.";
        }
        summary = `Flagged editorial angle for ${lensLabel} — recalibrated toward empirical & unit-economics framing`;
        break;
      }

      case "track": {
        const isAlreadyTracked =
          nextTracked.includes(threadId) || nextTracked.includes(storyId);
        if (isAlreadyTracked) {
          nextTracked = nextTracked.filter(
            (id) => id !== threadId && id !== storyId
          );
          summary = `Unpinned continuing story thread (${threadId})`;
        } else {
          nextTracked.push(threadId);
          summary = `Pinned story thread (${threadId}) for tomorrow's Continuity Ledger`;
        }
        break;
      }

      case "skip": {
        const delta = undo ? 12 : -12;
        for (const idx of targetIndices) {
          nextLenses[idx].weight = Math.max(
            5,
            Math.min(100, nextLenses[idx].weight + delta)
          );
        }
        summary = undo
          ? `Restored priority weight (+12%) for ${lensLabel} (Undo Skip)`
          : `Skipped story (${storyId}) — lowered priority weight (-12%) for ${lensLabel}`;
        break;
      }
    }

    const newState: ProfileSnapshot = {
      lifeLenses: structuredClone(nextLenses),
      incubatorGoal: structuredClone(current.incubatorGoal),
      trackedStoryIds: structuredClone(nextTracked),
    };

    const updatedProfile = await updateActiveProfile(
      (prev) => ({
        ...prev,
        lifeLenses: nextLenses,
        trackedStoryIds: nextTracked,
      }),
      {
        source: "inline_feedback",
        summary,
        previousState,
        newState,
      }
    );

    const latestChange =
      updatedProfile.changeLog[updatedProfile.changeLog.length - 1];

    return NextResponse.json({
      success: true,
      summary,
      profile: updatedProfile,
      changeEntry: latestChange,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to process inline story feedback.",
      },
      { status: 500 }
    );
  }
}

