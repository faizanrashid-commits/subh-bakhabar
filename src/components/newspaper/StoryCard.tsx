"use client";

import React, { useState } from "react";
import type { StoryItem } from "@/types/subh";

interface StoryCardProps {
  story: StoryItem;
  featured?: boolean;
  twoColumnBody?: boolean;
}

function formatSourceByline(sources: string[]): string {
  if (sources.length === 0) return "STAFF DISPATCH";
  const upper = sources.map((s) => s.toUpperCase());
  if (upper.length === 1) return `BY ${upper[0]}`;
  if (upper.length === 2) return `BY ${upper[0]} & ${upper[1]}`;
  return `BY ${upper.slice(0, -1).join(", ")} & ${upper[upper.length - 1]}`;
}

export function StoryCard({
  story,
  featured = false,
  twoColumnBody = false,
}: StoryCardProps) {
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [isTracked, setIsTracked] = useState<boolean>(false);

  const triggerFeedback = (message: string) => {
    setFeedbackNotice(message);
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  const isLead = story.slotType === "lead_intersection" || featured;
  const isIncubator = story.slotType === "incubator";
  const useMultiColBody = featured || twoColumnBody;

  const bylineText = formatSourceByline(
    story.citations.map((c) => c.sourceName)
  );

  return (
    <article
      id={story.id}
      className="story-card-print group relative flex flex-col justify-between bg-transparent text-[#111111]"
    >
      <div>
        {/* Classic Typographic Dateline & Small-Caps Kicker */}
        <div className="mb-1.5 text-[11px] font-mono uppercase tracking-wider text-[#4a4742] leading-snug">
          <span className="font-bold text-[#111111]">
            {story.sectionLabel.toUpperCase()}
          </span>
          <span className="mx-1.5">·</span>
          <span>{bylineText}</span>
          <span className="mx-1.5">·</span>
          <span>{story.readTimeMinutes} MIN READ</span>
        </div>

        {/* Headline */}
        <h2
          className={`font-headline font-bold text-[#111111] leading-[1.08] tracking-tight mb-2 ${
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
        >
          {story.headline}
        </h2>

        {/* Subheadline / Deck */}
        <p className="font-serif text-[#3d3a35] italic leading-snug text-[15px] mb-2">
          {story.subheadline}
        </p>

        {/* Byline & Provenance Hairline Strip */}
        <div className="border-y border-[#c8c2b6] py-1 my-2.5 text-[11px] font-mono uppercase tracking-wider text-[#4a4742] flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div>
            <span className="font-bold text-[#111111]">
              {story.provenanceBadge}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span>SOURCES:</span>
            {story.citations.map((cite, i) => (
              <a
                key={i}
                href={cite.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#111111] font-semibold underline decoration-[#4a4742] hover:decoration-[#111111] transition-colors"
                title={`Verify source: ${cite.sourceName}`}
              >
                {cite.sourceName} ↗
              </a>
            ))}
          </div>
        </div>

        {/* Reported Facts Body Text (Justified Serif with Classic Drop-Cap) */}
        <div
          className={`font-serif text-[#111111] text-[15px] leading-[1.55] text-justify my-3 ${
            useMultiColBody ? "md:columns-2 gap-6" : ""
          }`}
        >
          <p className="drop-cap">{story.reportedFacts}</p>
        </div>

        {/* Framing Divergence Ledger Box (Dawn vs Reuters, etc.) */}
        {story.framingDivergence && (
          <div className="border-y-2 border-[#111111] py-2.5 my-3.5 bg-transparent text-xs font-serif">
            <div className="font-mono uppercase tracking-widest text-[10px] font-bold text-[#111111] pb-1.5 mb-2 border-b border-[#c8c2b6]">
              FRAMING DIVERGENCE · EDITORIAL COMPARISON
            </div>
            <p className="italic text-[#4a4742] mb-2.5 leading-snug">
              {story.framingDivergence.summary}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#c8c2b6] pt-1 border-t border-[#c8c2b6] text-[12px]">
              <div className="pb-2 sm:pb-0 sm:pr-3">
                <div className="font-mono font-bold text-[#111111] uppercase tracking-wider text-[10px] mb-0.5">
                  {story.framingDivergence.sourceA.name.toUpperCase()}:
                </div>
                <p className="text-[#111111] leading-snug text-justify">
                  {story.framingDivergence.sourceA.framing}
                </p>
              </div>
              <div className="pt-2 sm:pt-0 sm:pl-3">
                <div className="font-mono font-bold text-[#111111] uppercase tracking-wider text-[10px] mb-0.5">
                  {story.framingDivergence.sourceB.name.toUpperCase()}:
                </div>
                <p className="text-[#111111] leading-snug text-justify">
                  {story.framingDivergence.sourceB.framing}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Continuity Ledger Box ("What Changed Since Yesterday?") */}
        {story.continuity && (
          <div className="border-y-2 border-[#111111] py-2.5 my-3.5 bg-transparent text-xs font-serif">
            <div className="font-mono uppercase tracking-widest text-[10px] font-bold text-[#111111] pb-1.5 mb-2 border-b border-[#c8c2b6]">
              CONTINUITY LEDGER · WHAT CHANGED SINCE {story.continuity.previousDate}
            </div>
            <div className="space-y-1.5 text-[#111111] leading-snug">
              <div>
                <strong className="font-mono text-[10px] uppercase tracking-wider text-[#111111] mr-1.5">
                  PREVIOUSLY —
                </strong>
                <span className="text-[#4a4742]">
                  {story.continuity.previously}
                </span>
              </div>
              <div>
                <strong className="font-mono text-[10px] uppercase tracking-wider text-[#111111] mr-1.5">
                  TODAY —
                </strong>
                <span className="font-semibold text-[#111111]">
                  {story.continuity.newDevelopment}
                </span>
              </div>
              <div>
                <strong className="font-mono text-[10px] uppercase tracking-wider text-[#111111] mr-1.5">
                  UNRESOLVED —
                </strong>
                <span className="italic text-[#4a4742]">
                  {story.continuity.remainsUncertain}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Incubator Module: Economist-Style Special Briefing in Clean Monochrome Ink Columns */}
        {story.incubatorModule &&
          story.incubatorModule.kind === "css_brief" && (
            <div className="border-y-2 border-[#111111] py-3.5 my-4 bg-transparent font-serif">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-3 border-b border-[#111111] text-[11px] font-mono uppercase tracking-widest text-[#111111]">
                <span className="font-bold">
                  SPECIAL BRIEFING · CSS EXAM ANALYTICAL BREAKDOWN
                </span>
                <span className="text-[#4a4742]">
                  STRUCTURED FOUR-PART DOSSIER
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#c8c2b6] text-[13px]">
                <div className="py-2 md:py-0 md:pr-4">
                  <div className="font-mono font-bold uppercase tracking-wider text-[#111111] text-[11px] mb-1">
                    I. HISTORICAL & STRUCTURAL BACKGROUND
                  </div>
                  <p className="text-[#111111] leading-[1.5] text-justify">
                    {story.incubatorModule.background}
                  </p>
                </div>

                <div className="py-2 md:py-0 md:px-4">
                  <div className="font-mono font-bold uppercase tracking-wider text-[#111111] text-[11px] mb-1">
                    II. CORE ISSUE & BOTTLENECK
                  </div>
                  <p className="text-[#111111] leading-[1.5] text-justify">
                    {story.incubatorModule.coreIssue}
                  </p>
                </div>

                <div className="py-2 md:py-0 md:px-4">
                  <div className="font-mono font-bold uppercase tracking-wider text-[#111111] text-[11px] mb-1">
                    III. CONSTITUTIONAL & POLICY ANGLE
                  </div>
                  <p className="text-[#111111] leading-[1.5] text-justify">
                    {story.incubatorModule.policyAngle}
                  </p>
                </div>

                <div className="py-2 md:py-0 md:pl-4">
                  <div className="font-mono font-bold uppercase tracking-wider text-[#111111] text-[11px] mb-1">
                    IV. ACTIONABLE WAY FORWARD
                  </div>
                  <p className="text-[#111111] leading-[1.5] text-justify">
                    {story.incubatorModule.wayForward}
                  </p>
                </div>
              </div>

              {story.incubatorModule.practiceQuestion && (
                <div className="mt-3 pt-2.5 border-t border-[#c8c2b6] text-[13px] flex flex-col sm:flex-row sm:items-baseline gap-1.5">
                  <span className="font-mono font-bold uppercase tracking-wider text-[10px] text-[#111111] shrink-0">
                    ■ EXAMINER&apos;S PROMPT:
                  </span>
                  <p className="italic text-[#111111] leading-snug">
                    {story.incubatorModule.practiceQuestion}
                  </p>
                </div>
              )}

              {story.incubatorModule.keyTerms &&
                story.incubatorModule.keyTerms.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#c8c2b6] text-[11px] font-mono text-[#4a4742]">
                    <span className="text-[#111111] font-bold uppercase tracking-wider mr-2">
                      LEXICON:
                    </span>
                    {story.incubatorModule.keyTerms.map((t, idx) => (
                      <span key={idx} className="inline-block mr-3">
                        <strong className="text-[#111111] uppercase">
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
            <div className="border-y-2 border-[#111111] py-3 my-3.5 bg-transparent font-serif text-xs">
              <div className="font-mono uppercase tracking-widest text-[10px] font-bold text-[#111111] pb-1.5 mb-2 border-b border-[#c8c2b6]">
                SPECIAL BRIEFING · DOMAIN PRIMER: {story.incubatorModule.concept}
              </div>
              <p className="text-[#111111] leading-relaxed mb-2 text-justify">
                {story.incubatorModule.explanation}
              </p>
              <p className="italic text-[#4a4742] leading-snug">
                <strong className="font-mono not-italic text-[10px] uppercase text-[#111111] mr-1.5">
                  ANALOGY —
                </strong>
                {story.incubatorModule.analogy}
              </p>
            </div>
          )}

        {story.incubatorModule &&
          story.incubatorModule.kind === "bilingual_passage" && (
            <div className="border-y-2 border-[#111111] py-3 my-3.5 bg-transparent font-serif text-xs">
              <div className="font-mono uppercase tracking-widest text-[10px] font-bold text-[#111111] pb-1.5 mb-2 border-b border-[#c8c2b6]">
                BILINGUAL READING DISPATCH · {story.incubatorModule.language.toUpperCase()}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#c8c2b6]">
                <p className="pb-2 sm:pb-0 sm:pr-3 text-[#111111] font-medium leading-relaxed">
                  {story.incubatorModule.passage}
                </p>
                <p className="pt-2 sm:pt-0 sm:pl-3 text-[#4a4742] italic leading-relaxed">
                  {story.incubatorModule.translation}
                </p>
              </div>
            </div>
          )}

        {/* Editor's Margin Note ("Why It Matters" / Lens Note) */}
        <div className="border-t border-[#c8c2b6] pt-2 my-2.5 text-[13px] font-serif leading-snug text-[#4a4742] italic">
          <span className="font-mono not-italic font-bold text-[10px] uppercase tracking-wider text-[#111111] mr-1.5">
            ■ EDITOR&apos;S LENS [{story.includedBecause.toUpperCase()}]:
          </span>
          <span>{story.whyYou}</span>
        </div>

        {/* "What To Watch Next" Catalyst Line */}
        <div className="pt-1.5 border-t border-[#c8c2b6] text-xs font-serif text-[#111111] leading-snug">
          <strong className="font-mono text-[10px] uppercase tracking-wider text-[#4a4742] mr-1.5">
            NEXT CATALYST —
          </strong>
          <span>{story.whatToWatchNext}</span>
        </div>
      </div>

      {/* Inline Feedback Toast */}
      {feedbackNotice && (
        <div className="no-print mt-2 py-1 px-2 bg-[#111111] text-[#f9f6ef] text-[10px] font-mono uppercase tracking-wider">
          {feedbackNotice}
        </div>
      )}

      {/* Editorial Calibration Controls: Hidden by default, revealed subtly on story hover */}
      <footer className="no-print mt-2 pt-1.5 border-t border-[#c8c2b6] flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono text-[#4a4742] opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <span className="uppercase tracking-widest text-[9px]">
          CALIBRATE:
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() =>
              triggerFeedback(
                "NOTED: FUTURE EDITIONS WILL WEIGHT THIS TOPIC HIGHER."
              )
            }
            className="px-1.5 py-0.5 border border-transparent hover:border-[#111111] text-[#111111] uppercase tracking-wider cursor-pointer transition-colors"
            title="More like this"
          >
            [ + More ]
          </button>

          <button
            onClick={() =>
              triggerFeedback(
                "CALIBRATED: KNOWLEDGE BASELINE ELEVATED FOR THIS LENS."
              )
            }
            className="px-1.5 py-0.5 border border-transparent hover:border-[#111111] text-[#111111] uppercase tracking-wider cursor-pointer transition-colors"
            title="I already know this — raise technical depth"
          >
            [ Too Basic ]
          </button>

          <button
            onClick={() =>
              triggerFeedback(
                "ANGLE FLAGGED: SEND CRITIQUE TO CHIEF EDITOR DESK."
              )
            }
            className="px-1.5 py-0.5 border border-transparent hover:border-[#111111] text-[#111111] uppercase tracking-wider cursor-pointer transition-colors"
            title="Wrong editorial angle for my persona"
          >
            [ Wrong Angle ]
          </button>

          <button
            onClick={() => {
              setIsTracked(!isTracked);
              triggerFeedback(
                !isTracked
                  ? "THREAD PINNED FOR TOMORROW'S CONTINUITY LEDGER."
                  : "STORY THREAD UNPINNED."
              );
            }}
            className={`px-1.5 py-0.5 border uppercase tracking-wider cursor-pointer transition-colors ${
              isTracked
                ? "bg-[#111111] text-[#f9f6ef] border-[#111111] font-bold"
                : "border-transparent hover:border-[#111111] text-[#111111]"
            }`}
            title="Track this evolving thread in future morning editions"
          >
            {isTracked ? "[ ■ Tracked ]" : "[ Track ]"}
          </button>
        </div>
      </footer>
    </article>
  );
}
