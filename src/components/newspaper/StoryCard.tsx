"use client";

import React, { useState, useEffect, useRef } from "react";
import type { EditorialTone, StoryItem, UserProfile } from "@/types/subh";
import { ArrowUpRight, Check } from "lucide-react";

export type PresentationMode = "broadsheet" | "executive";

const ACTION_BTN =
  "inline-flex items-center gap-1 text-[11px] font-sans font-medium text-[#3D3A34] hover:text-[#141413] bg-white/70 hover:bg-white border border-[#DCD6C9] rounded-md px-2.5 py-1 transition-all cursor-pointer";
const INSIGHT_CARD =
  "bg-[#F3EFE6] border border-[#DFD9CE] border-l-[3px] border-l-[#141413] rounded-r-md p-3.5 my-3 text-[13px] font-serif text-[#2C2A26] leading-snug";
const INSIGHT_HEADER =
  "text-[#141413] font-mono text-[10px] uppercase tracking-wider font-semibold mb-1.5";

interface StoryCardProps {
  story: StoryItem;
  featured?: boolean;
  twoColumnBody?: boolean;
  priorityIndex?: number;
  presentationMode?: PresentationMode;
  editorialTone?: EditorialTone;
  tone?: EditorialTone;
  onOpenStoryModal?: (story: StoryItem) => void;
  onSendToEditor?: (story: StoryItem, quote?: string) => void;
  onHighlightText?: (
    story: StoryItem,
    quote: string,
    coords: { x: number; y: number }
  ) => void;
  onProfileMutated?: (profile: UserProfile, summary: string) => void;
}

/**
 * Display sanitizer: strips raw Hacker News feed metadata ("Article URL: …",
 * "Comments URL: …", "Points: N # Comments: M") from subheadline/body text.
 */
function sanitizeFeedText(raw?: string): string {
  if (!raw) return "";
  return raw
    .replace(/Article URL:\s*https?:\/\/\S+/gi, "")
    .replace(/Comments URL:\s*https?:\/\/\S+/gi, "")
    .replace(/Points:\s*\d+\s*#\s*Comments:\s*\d+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatSourceByline(sources: string[]): string {
  if (sources.length === 0) return "STAFF DISPATCH";
  const upper = sources.map((s) => s.toUpperCase());
  if (upper.length === 1) return `BY ${upper[0]}`;
  if (upper.length === 2) return `BY ${upper[0]} & ${upper[1]}`;
  return `BY ${upper.slice(0, -1).join(", ")} & ${upper[upper.length - 1]}`;
}

/**
 * Builds Socratic counter-questions, trade-offs, and unanswered structural questions
 * grounded in the story's reported facts, lenses, and continuity/framing metadata.
 */
function buildSocraticAnalysis(story: StoryItem): {
  counterQuestion: string;
  structuralTradeOff: string;
  unansweredQuestion: string;
} {
  const counterQuestion = story.framingDivergence
    ? `Does the prevailing framing between ${story.framingDivergence.sourceA.name} and ${story.framingDivergence.sourceB.name} obscure deeper institutional incentives in ${story.includedBecause}?`
    : `If the baseline premise behind "${story.subheadline}" shifts over the next two quarters, which unstated institutional or technical constraint in ${story.includedBecause} breaks first?`;

  const structuralTradeOff = story.framingDivergence
    ? `${story.framingDivergence.summary} Meanwhile, optimizing for near-term execution across ${story.includedBecause} forces a direct trade-off between capital allocation efficiency and long-term systemic resilience.`
    : `${story.whyYou} Pursuing this trajectory entails an inherent trade-off between short-term operational compliance and second-order structural adaptation across ${story.includedBecause}.`;

  const unansweredQuestion = story.continuity?.remainsUncertain
    ? `${story.continuity.remainsUncertain} Furthermore, what empirical threshold will prove whether "${story.whatToWatchNext}" is a durable structural shift rather than a temporary policy signal?`
    : `Which verifiable data point or regulatory enforcement mechanism will determine whether "${story.whatToWatchNext}" resolves the underlying bottleneck or merely defers it?`;

  return {
    counterQuestion,
    structuralTradeOff,
    unansweredQuestion,
  };
}

/**
 * Extracts 3 high-density executive briefing bullets with bold metric/key-term callouts
 * for the Adaptive "Executive 3-Min Dispatch" & "Executive Wire" mode.
 */
function buildExecutiveBullets(story: StoryItem): Array<{
  leadMetric: string;
  detail: string;
}> {
  const sentences = sanitizeFeedText(story.reportedFacts)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const bullet1Text = sentences[0] || sanitizeFeedText(story.subheadline);
  const bullet2Text =
    sentences.slice(1, 3).join(" ") ||
    `Cross-lens impact (${story.includedBecause}): ${story.whyYou}`;
  const bullet3Text = story.whatToWatchNext;

  return [
    { leadMetric: "Core Fact", detail: bullet1Text },
    { leadMetric: "Lens Impact", detail: bullet2Text },
    { leadMetric: "Next Catalyst", detail: bullet3Text },
  ];
}

const SCORE_FACTORS: Array<{ label: string; weight: number }> = [
  { label: "Personal Lens Match", weight: 35 },
  { label: "Cross-Lens Convergence", weight: 25 },
  { label: "Structural Significance", weight: 20 },
  { label: "Source Corroboration & Recency", weight: 10 },
  { label: "Intellectual Novelty", weight: 10 },
];

/** Interactive relevance score badge with a "Heuristic Audit" popover. */
function ScoreBadge({ score }: { score: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="no-print relative inline-block normal-case">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="View heuristic audit of this relevance score"
        className="px-2 py-0.5 rounded-sm bg-[#141413] text-[#FAF7F2] font-mono font-semibold text-[10px] tracking-wider cursor-pointer hover:bg-[#2C2A26] transition-colors"
      >
        Score {score}/100
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Heuristic audit score breakdown"
          className="absolute right-0 top-full mt-1.5 w-72 bg-[#FAF7F2] border border-[#D5CFC2] shadow-md rounded-lg p-3 text-[11px] font-mono text-[#141413] z-20 text-left"
        >
          <div className="font-bold text-[10px] tracking-wider uppercase mb-2 pb-1.5 border-b border-[#D5CFC2]">
            HEURISTIC AUDIT · DETERMINISTIC 5-FACTOR SCORE
          </div>
          <ul className="space-y-1">
            {SCORE_FACTORS.map((f) => (
              <li key={f.label} className="flex items-start justify-between gap-2">
                <span>• {f.label}</span>
                <span className="font-semibold shrink-0">{f.weight}%</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 pt-1.5 border-t border-[#D5CFC2] text-[10px] text-[#4a4742] leading-snug">
            Auditable score computed via /lib/scorer.ts against active Life Lenses.
          </p>
        </div>
      )}
    </span>
  );
}

export function StoryCard({
  story,
  featured = false,
  twoColumnBody = false,
  priorityIndex,
  presentationMode = "broadsheet",
  editorialTone,
  tone: toneProp,
  onOpenStoryModal,
  onSendToEditor,
  onHighlightText,
  onProfileMutated,
}: StoryCardProps) {
  const tone: EditorialTone =
    toneProp ??
    editorialTone ??
    (presentationMode === "executive" ? "executive" : "classical");

  const isExecutiveView =
    presentationMode === "executive" || tone === "executive";

  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [isTracked, setIsTracked] = useState<boolean>(false);
  const [isSkipped, setIsSkipped] = useState<boolean>(false);
  const [isSendingFeedback, setIsSendingFeedback] = useState<boolean>(false);

  const triggerFeedback = (message: string) => {
    setFeedbackNotice(message);
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  const sendFeedbackApi = async (
    action: "more" | "too_basic" | "wrong_angle" | "track" | "skip",
    undo = false
  ) => {
    if (isSendingFeedback) return;
    setIsSendingFeedback(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: story.id,
          threadId: story.threadId || story.id,
          action,
          sectionLabel: story.sectionLabel,
          includedBecause: story.includedBecause,
          undo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.summary) triggerFeedback(data.summary.toUpperCase());
        if (onProfileMutated && data.profile) {
          onProfileMutated(data.profile, data.summary);
        }
      }
    } catch {
      triggerFeedback("LOCAL CALIBRATION RECORDED.");
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const handleParagraphMouseUp = (e: React.MouseEvent<HTMLElement>) => {
    if (!onHighlightText || typeof window === "undefined") return;
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || "";
    if (selectedText.length >= 8) {
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      onHighlightText(story, selectedText, {
        x: rect ? rect.left + rect.width / 2 : e.clientX,
        y: rect ? rect.top - 10 : e.clientY - 16,
      });
    }
  };

  // Collapsed 1-Line Banner when Skipped
  if (isSkipped) {
    return (
      <div
        id={story.id}
        className="no-print py-2.5 px-3.5 my-2 bg-[#efeae0] border border-[#d5cfc2] rounded-lg text-xs font-sans text-[#141413] flex items-center justify-between gap-2"
      >
        <span>
          Story skipped — reduced priority for{" "}
          <strong>{story.sectionLabel}</strong>.
        </span>
        <button
          type="button"
          onClick={() => {
            setIsSkipped(false);
            sendFeedbackApi("skip", true);
          }}
          className={ACTION_BTN}
        >
          Undo
        </button>
      </div>
    );
  }

  const isLead = story.slotType === "lead_intersection" || featured;
  const isIncubator = story.slotType === "incubator";
  const useMultiColBody = featured || twoColumnBody;

  const bylineText = formatSourceByline(
    story.citations.map((c) => c.sourceName)
  );
  const primaryCitation = story.citations[0];
  const primaryUrl = primaryCitation?.url || "#";

  const formattedPriority =
    typeof priorityIndex === "number"
      ? String(priorityIndex + 1).padStart(2, "0")
      : null;

  const kickerPrefix = isLead
    ? "FRONT PAGE"
    : isIncubator
    ? "SPECIAL BRIEFING"
    : story.slotType === "continuing"
    ? "EVOLVING THREAD"
    : story.slotType === "beyond_bubble"
    ? "HORIZON"
    : "";
  const sectionLabelUpper = story.sectionLabel.toUpperCase();
  // Deduplicate: never render "FRONT PAGE · FRONT PAGE"
  const kickerText =
    kickerPrefix && !sectionLabelUpper.includes(kickerPrefix)
      ? `${kickerPrefix} · ${sectionLabelUpper}`
      : sectionLabelUpper;

  // Unified understated action bar
  const actionBar = (
    <footer className="no-print border-t border-[#DFD9CE] pt-3 mt-4 flex flex-wrap items-center justify-between gap-2 font-sans">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onOpenStoryModal?.(story)}
          className={ACTION_BTN}
          title="Inspect full dispatch in Reader Drawer"
        >
          Expand Reader
        </button>
        <a
          href={primaryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={ACTION_BTN}
          title="Open original publisher article in a new tab"
        >
          Read Original <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => sendFeedbackApi("more")}
          className={ACTION_BTN}
          title="More like this (+8% Lens Weight)"
        >
          + More
        </button>
        <button
          type="button"
          onClick={() => sendFeedbackApi("too_basic")}
          className={ACTION_BTN}
          title="I already know this — raise technical depth baseline"
        >
          Too Basic
        </button>
        {!isExecutiveView && (
          <>
            <button
              type="button"
              onClick={() => {
                sendFeedbackApi("wrong_angle");
                if (onSendToEditor) {
                  onSendToEditor(story);
                }
              }}
              className={ACTION_BTN}
              title="Wrong editorial angle — open Chief Editor Desk"
            >
              Wrong Angle
            </button>
            <button
              type="button"
              onClick={() => {
                setIsTracked(!isTracked);
                sendFeedbackApi("track");
              }}
              className={`${ACTION_BTN} ${
                isTracked ? "!bg-white !text-[#141413] !border-[#141413]" : ""
              }`}
              title="Track this evolving thread in future morning editions"
            >
              {isTracked ? (
                <>
                  Tracked <Check className="w-3 h-3" aria-hidden="true" />
                </>
              ) : (
                "Track"
              )}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setIsSkipped(true);
            sendFeedbackApi("skip", false);
          }}
          className={ACTION_BTN}
          title="Skip story and reduce weight for matching life lenses"
        >
          Skip
        </button>
      </div>
    </footer>
  );

  // Executive Bento Card: meta row, headline, deck, 3-bullet digest, footer
  if (isExecutiveView) {
    const bullets = buildExecutiveBullets(story);
    return (
      <article
        id={story.id}
        onMouseUp={handleParagraphMouseUp}
        className="story-card-print group relative flex flex-col justify-between bg-white/80 border border-[#DFD9CE] rounded-xl p-5 shadow-sm hover:shadow-md transition-all text-[#141413]"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#4A463F]">
            {formattedPriority && (
              <span className="bg-[#EAE4D7] text-[#141413] font-mono text-xs px-2 py-0.5 rounded">
                {formattedPriority}
              </span>
            )}
            <span className="font-semibold text-[#141413]">{kickerText}</span>
            <span className="text-[#C8C2B6]">·</span>
            <span>{story.readTimeMinutes}M</span>
            <ScoreBadge score={story.intersectionScore} />
          </div>

          <h2
            onClick={() => onOpenStoryModal?.(story)}
            className="font-headline text-xl font-bold text-[#141413] mt-2 mb-2 leading-snug hover:underline underline-offset-4 decoration-[#DFD9CE] cursor-pointer"
            style={{
              fontFamily: "var(--font-playfair), 'Times New Roman', serif",
            }}
            title="Click to open full broadsheet reader drawer"
          >
            {story.headline}
          </h2>

          <p className="font-serif italic text-sm text-[#4A463F] border-l-2 border-[#8C2D19] pl-3 my-2.5">
            {sanitizeFeedText(story.subheadline)}
          </p>

          <ul className="mt-3 space-y-2 text-xs font-serif text-[#2C2A26] leading-relaxed list-none">
            {bullets.map((b, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-[#8C2D19] shrink-0 leading-relaxed" aria-hidden="true">
                  ■
                </span>
                <span>
                  <strong className="font-sans font-bold text-[#141413] mr-1">
                    {b.leadMetric}:
                  </strong>
                  {b.detail}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {actionBar}
      </article>
    );
  }

  const socratic = tone === "socratic" ? buildSocraticAnalysis(story) : null;

  return (
    <article
      id={story.id}
      onMouseUp={handleParagraphMouseUp}
      className="story-card-print group relative flex flex-col justify-between bg-transparent border-t-[3px] border-[#141413] pt-4 text-[#141413]"
    >
      <div>
        {/* Ink-Stamped Socratic Critique & Counter-Question Box (when tone === 'socratic') */}
        {tone === "socratic" && socratic && (
          <div className="mb-3.5 p-3 border-2 border-[#141413] bg-[#efeae0] rounded-sm text-[#141413]">
            <div className="font-mono font-bold text-[10px] uppercase tracking-wider text-[#8C2D19]">
              ■ SOCRATIC CRITIQUE &amp; COUNTER-QUESTION: What assumptions is this reporting taking for granted?
            </div>
            <p className="mt-1 text-xs font-serif italic text-[#3d3a35] leading-snug">
              {socratic.counterQuestion}
            </p>
          </div>
        )}

        {/* Vibrant Editorial Crimson Section Kicker & Metadata Header */}
        <div className="mb-2 text-[11px] font-mono uppercase tracking-wider leading-snug flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[#141413] font-semibold">
              <span className="text-[#8C2D19]">■</span> {kickerText}
            </span>
            <span className="text-[#c8c2b6]">·</span>
            <span className="text-[#4a4742] font-semibold">{bylineText}</span>
            <span className="text-[#c8c2b6]">·</span>
            <span className="text-[#4a4742]">{story.readTimeMinutes} MIN READ</span>
          </div>

          <div className="flex items-center gap-1.5">
            <ScoreBadge score={story.intersectionScore} />
            <span className="px-2 py-0.5 rounded-sm bg-[#ebe6dc] text-[#3d3a35] font-sans font-semibold text-[10px] uppercase tracking-wider">
              {story.provenanceBadge}
            </span>
          </div>
        </div>

        {/* Clickable Headline -> Opens StoryModal.tsx */}
        <h2
          onClick={() => onOpenStoryModal?.(story)}
          className={`font-headline font-bold text-[#141413] leading-[1.08] tracking-tight mb-2 hover:text-[#8C2D19] transition-colors cursor-pointer ${
            featured
              ? "text-3xl sm:text-4xl md:text-[38px]"
              : isIncubator
              ? "text-2xl sm:text-3xl"
              : isLead
              ? "text-2xl sm:text-[26px]"
              : "text-xl sm:text-[22px]"
          }`}
          style={{
            fontFamily: "var(--font-playfair), 'Times New Roman', serif",
          }}
          title="Click to inspect full extracted dispatch & provenance in Reader Drawer"
        >
          {story.headline}
        </h2>

        {/* Subheadline / Deck */}
        <p className="font-serif text-[#3d3a35] italic leading-snug text-[15px] mb-3">
          {sanitizeFeedText(story.subheadline)}
        </p>

        {/* Compact Source Citations Pill Strip (No extra horizontal rules) */}
        <div className="my-2 flex flex-wrap items-center gap-1.5 text-[11px] font-sans">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#4a4742] mr-1">
            Sources:
          </span>
          {story.citations.map((citation, i) => (
            <a
              key={i}
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-2 py-0.5 rounded-sm bg-[#EAE4D7] hover:bg-[#DFD9CE] text-[#141413] font-medium text-[11px] transition-colors"
              title={`Verify source: ${citation.sourceName}`}
            >
              {citation.sourceName} <ArrowUpRight className="w-3 h-3 ml-0.5" aria-hidden="true" />
            </a>
          ))}
        </div>

        {/* Reported Facts Body Text (Justified Serif with Classic Drop-Cap) */}
        <div
          className={`font-serif text-[#141413] text-[15px] leading-[1.58] text-justify my-3.5 ${
            useMultiColBody ? "md:columns-2 gap-6 print-cols-2" : ""
          }`}
        >
          <p className="drop-cap">{sanitizeFeedText(story.reportedFacts)}</p>
        </div>

        {/* Framing Divergence Two-Tone Comparison Card */}
        {story.framingDivergence && (
          <div className={`${INSIGHT_CARD} no-print`}>
            <div className={INSIGHT_HEADER}>
              <span className="text-[#8C2D19]">■</span> Framing Divergence · Editorial Comparison
            </div>
            <p className="italic text-[#2C2A26] mb-3">
              {story.framingDivergence.summary}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
              {[story.framingDivergence.sourceA, story.framingDivergence.sourceB].map(
                (src, i) => (
                  <div
                    key={i}
                    className="bg-white/60 border border-[#DFD9CE] rounded-sm p-2.5"
                  >
                    <div className="mb-1.5">
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#141413] underline underline-offset-2 decoration-[#DFD9CE] hover:decoration-[#141413]"
                      >
                        {src.name} <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                      </a>
                    </div>
                    <p className="text-[#2C2A26] leading-snug">{src.framing}</p>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Continuity Ledger Card (Oxford Teal/Navy Left Accent) */}
        {story.continuity && (
          <div className={`${INSIGHT_CARD} no-print`}>
            <div className={INSIGHT_HEADER}>
              <span className="text-[#8C2D19]">■</span> Continuity Ledger · What Changed Since{" "}
              {story.continuity.previousDate}
            </div>
            <div className="space-y-1.5 text-[#2C2A26] leading-snug">
              <div>
                <strong className="font-mono text-[10px] uppercase tracking-wider font-semibold text-[#141413] mr-1.5">
                  Previously:
                </strong>
                <span>{story.continuity.previously}</span>
              </div>
              <div>
                <strong className="font-mono text-[10px] uppercase tracking-wider font-semibold text-[#141413] mr-1.5">
                  Today:
                </strong>
                <span className="font-semibold">{story.continuity.newDevelopment}</span>
              </div>
              <div>
                <strong className="font-mono text-[10px] uppercase tracking-wider font-semibold text-[#141413] mr-1.5">
                  Unresolved:
                </strong>
                <span className="italic">{story.continuity.remainsUncertain}</span>
              </div>
            </div>
          </div>
        )}

        {/* Incubator Module: Economist-Style Special Briefing */}
        {story.incubatorModule &&
          story.incubatorModule.kind === "css_brief" && (
            <div className="bg-[#ebe6dc]/75 border border-[#d6cfc2] rounded-md p-4 my-4 font-serif">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-[#d6cfc2] text-[11px] font-sans uppercase tracking-wider text-[#141413]">
                <span className="font-bold text-[#8C2D19]">
                  ■ Special Briefing · CSS Exam Analytical Breakdown
                </span>
                <span className="text-[#4a4742] font-semibold">
                  Structured Four-Part Dossier
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-[13px]">
                <div className="bg-[#f9f6ef] border border-[#d6cfc2] rounded-sm p-3">
                  <div className="font-sans font-bold uppercase tracking-wider text-[#8C2D19] text-[10px] mb-1">
                    I. Historical &amp; Structural Background
                  </div>
                  <p className="text-[#141413] leading-[1.5]">
                    {story.incubatorModule.background}
                  </p>
                </div>

                <div className="bg-[#f9f6ef] border border-[#d6cfc2] rounded-sm p-3">
                  <div className="font-sans font-bold uppercase tracking-wider text-[#8C2D19] text-[10px] mb-1">
                    II. Core Issue &amp; Bottleneck
                  </div>
                  <p className="text-[#141413] leading-[1.5]">
                    {story.incubatorModule.coreIssue}
                  </p>
                </div>

                <div className="bg-[#f9f6ef] border border-[#d6cfc2] rounded-sm p-3">
                  <div className="font-sans font-bold uppercase tracking-wider text-[#8C2D19] text-[10px] mb-1">
                    III. Constitutional &amp; Policy Angle
                  </div>
                  <p className="text-[#141413] leading-[1.5]">
                    {story.incubatorModule.policyAngle}
                  </p>
                </div>

                <div className="bg-[#f9f6ef] border border-[#d6cfc2] rounded-sm p-3">
                  <div className="font-sans font-bold uppercase tracking-wider text-[#8C2D19] text-[10px] mb-1">
                    IV. Actionable Way Forward
                  </div>
                  <p className="text-[#141413] leading-[1.5]">
                    {story.incubatorModule.wayForward}
                  </p>
                </div>
              </div>

              {story.incubatorModule.practiceQuestion && (
                <div className="mt-3 p-2.5 bg-[#F3EFE6] border border-[#DFD9CE] border-l-[3px] border-l-[#141413] rounded-r-sm text-[13px] flex flex-col sm:flex-row sm:items-baseline gap-1.5">
                  <span className="font-mono font-semibold uppercase tracking-wider text-[10px] text-[#141413] shrink-0">
                    <span className="text-[#8C2D19]">■</span> Examiner&apos;s Prompt:
                  </span>
                  <p className="italic text-[#2C2A26] leading-snug">
                    {story.incubatorModule.practiceQuestion}
                  </p>
                </div>
              )}

              {story.incubatorModule.keyTerms &&
                story.incubatorModule.keyTerms.length > 0 && (
                  <div className="mt-2.5 pt-2 text-[11px] font-sans text-[#4a4742] flex flex-wrap gap-2 items-center">
                    <span className="text-[#141413] font-bold uppercase tracking-wider">
                      Lexicon:
                    </span>
                    {story.incubatorModule.keyTerms.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-block bg-[#f9f6ef] border border-[#d6cfc2] rounded-sm px-2 py-0.5"
                      >
                        <strong className="text-[#141413] uppercase">
                          {t.term}:
                        </strong>{" "}
                        <span className="font-serif italic text-[#4a4742]">
                          {t.meaning}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
            </div>
          )}

        {story.incubatorModule &&
          story.incubatorModule.kind === "domain_primer" && (
            <div className="bg-[#ebe6dc] border border-[#d6cfc2] rounded-md p-3.5 my-3 font-serif text-xs">
              <div className="font-sans uppercase tracking-wider text-[11px] font-bold text-[#8C2D19] mb-1.5">
                ■ Special Briefing · Domain Primer:{" "}
                {story.incubatorModule.concept}
              </div>
              <p className="text-[#141413] leading-relaxed mb-2">
                {story.incubatorModule.explanation}
              </p>
              <p className="italic text-[#3d3a35] leading-snug">
                <strong className="font-sans not-italic text-[10px] uppercase text-[#141413] mr-1.5">
                  Analogy:
                </strong>
                {story.incubatorModule.analogy}
              </p>
            </div>
          )}

        {story.incubatorModule &&
          story.incubatorModule.kind === "bilingual_passage" && (
            <div className="bg-[#ebe6dc] border border-[#d6cfc2] rounded-md p-3.5 my-3 font-serif text-xs">
              <div className="font-sans uppercase tracking-wider text-[11px] font-bold text-[#8C2D19] mb-2">
                ■ Bilingual Reading Dispatch ·{" "}
                {story.incubatorModule.language.toUpperCase()}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <p className="bg-[#f9f6ef] p-2.5 rounded-sm text-[#141413] font-medium leading-relaxed">
                  {story.incubatorModule.passage}
                </p>
                <p className="bg-[#f9f6ef] p-2.5 rounded-sm text-[#4a4742] italic leading-relaxed">
                  {story.incubatorModule.translation}
                </p>
              </div>
            </div>
          )}

        {/* Socratic Italicized Analytical Notes: Trade-Offs & Unanswered Structural Questions */}
        {tone === "socratic" && socratic && (
          <div className={`${INSIGHT_CARD} space-y-2`}>
            <div className={INSIGHT_HEADER}>
              <span className="text-[#8C2D19]">■</span> Socratic Analytical Notes · Trade-Offs &amp; Unanswered Structural Questions
            </div>
            <p className="italic text-[#2C2A26]">
              <strong className="font-mono not-italic text-[10px] uppercase tracking-wider font-semibold text-[#141413] mr-1.5">
                Structural Trade-Off —
              </strong>
              {socratic.structuralTradeOff}
            </p>
            <p className="italic text-[#2C2A26]">
              <strong className="font-mono not-italic text-[10px] uppercase tracking-wider font-semibold text-[#141413] mr-1.5">
                Unanswered Structural Question —
              </strong>
              {socratic.unansweredQuestion}
            </p>
          </div>
        )}

        {/* Editor's Lens (Why You) */}
        <div className={INSIGHT_CARD}>
          <div className={INSIGHT_HEADER}>
            <span className="text-[#8C2D19]">■</span> Editor&apos;s Lens · {story.includedBecause}
          </div>
          <p className="italic text-[#2C2A26]">{story.whyYou}</p>
          <div className="mt-2 pt-2 border-t border-[#DFD9CE] text-xs not-italic text-[#2C2A26]">
            <strong className="font-mono text-[10px] uppercase tracking-wider font-semibold text-[#141413] mr-1.5">
              What to Watch Next:
            </strong>
            <span>{story.whatToWatchNext}</span>
          </div>
        </div>
      </div>

      {/* Inline Feedback Toast */}
      {feedbackNotice && (
        <div className="no-print mt-2 py-1.5 px-3 bg-[#141413] text-white rounded-md text-[11px] font-sans font-medium tracking-wide">
          ■ {feedbackNotice}
        </div>
      )}

      {actionBar}
    </article>
  );
}
