"use client";

import React, { useEffect } from "react";
import { X, ExternalLink, Sparkles, MessageSquarePlus } from "lucide-react";
import type { StoryItem } from "@/types/subh";

interface StoryModalProps {
  story: StoryItem | null;
  onClose: () => void;
  onSendToEditor?: (story: StoryItem, quote?: string) => void;
  onRegenerateStory?: (story: StoryItem) => void;
  isRegenerating?: boolean;
}

export function StoryModal({
  story,
  onClose,
  onSendToEditor,
  onRegenerateStory,
  isRegenerating = false,
}: StoryModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (story) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [story, onClose]);

  if (!story) return null;

  const primaryUrl = story.citations[0]?.url || "#";
  const primarySource = story.citations[0]?.sourceName || "Original Publisher";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-[1px] no-print"
      onClick={onClose}
    >
      <aside
        className="relative w-full max-w-2xl h-full overflow-y-auto bg-[#f9f6ef] text-[#111111] border-l-2 border-[#111111] p-6 sm:p-8 font-serif shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        aria-label="Broadsheet Reader Drawer"
      >
        {/* Top Folio Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-[#111111] text-xs font-mono uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[#111111] text-[#f9f6ef] font-bold">
              {story.sectionLabel}
            </span>
            <span className="text-[#4a4742]">·</span>
            <span className="text-[#4a4742]">{story.readTimeMinutes} MIN READ</span>
            <span className="text-[#4a4742]">·</span>
            <span className="font-bold text-[#111111]">
              SCORE: {story.intersectionScore}/100
            </span>
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-1 border border-[#111111] px-2.5 py-1 text-[11px] font-mono uppercase hover:bg-[#111111] hover:text-[#f9f6ef] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close [ESC]</span>
          </button>
        </div>

        {/* Headline */}
        <h2
          className="text-2xl sm:text-4xl font-bold text-[#111111] leading-[1.1] tracking-tight mb-3"
          style={{ fontFamily: "var(--font-playfair), 'Times New Roman', serif" }}
        >
          {story.headline}
        </h2>

        {/* Subheadline */}
        <p className="text-base sm:text-lg italic text-[#3d3a35] leading-snug mb-4">
          {story.subheadline}
        </p>

        {/* Provenance & Prominent Original Source Bar */}
        <div className="border-y border-[#111111] py-2.5 my-4 bg-[#efeae0] px-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold uppercase text-[#111111]">
              [{story.provenanceBadge}]
            </span>
            <span className="text-[#4a4742]">·</span>
            <span className="text-[#4a4742] uppercase">VERIFIED CITATIONS:</span>
            {story.citations.map((cite, idx) => (
              <a
                key={idx}
                href={cite.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline text-[#111111] hover:text-[#4a4742]"
              >
                {cite.sourceName} ↗
              </a>
            ))}
          </div>

          <a
            href={primaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 border border-[#111111] bg-[#111111] text-[#f9f6ef] hover:bg-transparent hover:text-[#111111] px-3 py-1 text-[11px] font-mono uppercase tracking-wider transition-colors"
          >
            <span>[ Read Original Article ({primarySource}) ↗ ]</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Why-You Personalized Synthesis Box */}
        <div className="border-l-4 border-[#111111] bg-[#efeae0]/70 p-4 my-5">
          <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#111111] mb-1">
            ■ WHY THIS MATTERS TO YOU · [{story.includedBecause.toUpperCase()}]
          </div>
          <p className="text-sm text-[#111111] leading-relaxed italic">
            {story.whyYou}
          </p>
        </div>

        {/* Full Extracted Journalistic Facts */}
        <div className="my-5">
          <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#4a4742] mb-2">
            FULL EXTRACTED DISPATCH & VERIFIED FACTS
          </div>
          <div className="text-base leading-[1.7] text-[#111111] text-justify space-y-3">
            <p className="drop-cap">{story.reportedFacts}</p>
          </div>
        </div>

        {/* Continuity Notes (if present) */}
        {story.continuity && (
          <div className="border-2 border-[#111111] p-4 my-5 bg-[#f9f6ef]">
            <div className="font-mono uppercase tracking-widest text-[11px] font-bold text-[#111111] pb-2 mb-3 border-b border-[#c8c2b6]">
              CONTINUITY LEDGER · WHAT CHANGED SINCE {story.continuity.previousDate}
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <strong className="font-mono text-xs uppercase text-[#111111] mr-2">
                  PREVIOUSLY:
                </strong>
                <span className="text-[#4a4742]">{story.continuity.previously}</span>
              </div>
              <div>
                <strong className="font-mono text-xs uppercase text-[#111111] mr-2">
                  NEW DEVELOPMENT:
                </strong>
                <span className="font-semibold text-[#111111]">
                  {story.continuity.newDevelopment}
                </span>
              </div>
              <div>
                <strong className="font-mono text-xs uppercase text-[#111111] mr-2">
                  REMAINS UNCERTAIN:
                </strong>
                <span className="italic text-[#4a4742]">
                  {story.continuity.remainsUncertain}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Framing Divergence (if present) */}
        {story.framingDivergence && (
          <div className="border-2 border-[#111111] p-4 my-5 bg-[#f9f6ef]">
            <div className="font-mono uppercase tracking-widest text-[11px] font-bold text-[#111111] pb-2 mb-2 border-b border-[#c8c2b6]">
              FRAMING DIVERGENCE · CROSS-SOURCE COMPARISON
            </div>
            <p className="text-xs italic text-[#4a4742] mb-3">
              {story.framingDivergence.summary}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="border border-[#c8c2b6] p-3">
                <div className="font-mono font-bold uppercase mb-1">
                  {story.framingDivergence.sourceA.name}
                </div>
                <p className="mb-2">{story.framingDivergence.sourceA.framing}</p>
                <a
                  href={story.framingDivergence.sourceA.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] underline uppercase"
                >
                  Inspect Source A ↗
                </a>
              </div>
              <div className="border border-[#c8c2b6] p-3">
                <div className="font-mono font-bold uppercase mb-1">
                  {story.framingDivergence.sourceB.name}
                </div>
                <p className="mb-2">{story.framingDivergence.sourceB.framing}</p>
                <a
                  href={story.framingDivergence.sourceB.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] underline uppercase"
                >
                  Inspect Source B ↗
                </a>
              </div>
            </div>
          </div>
        )}

        {/* What To Watch Next */}
        <div className="border-t border-b border-[#c8c2b6] py-3 my-5 text-sm">
          <strong className="font-mono text-xs uppercase tracking-wider text-[#111111] mr-2">
            ■ NEXT CATALYST TO WATCH:
          </strong>
          <span>{story.whatToWatchNext}</span>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t-2 border-[#111111] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {onSendToEditor && (
              <button
                onClick={() => {
                  onClose();
                  onSendToEditor(story);
                }}
                className="inline-flex items-center gap-1.5 border border-[#111111] px-3 py-1.5 text-xs font-mono uppercase tracking-wider hover:bg-[#111111] hover:text-[#f9f6ef] transition-colors cursor-pointer"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>Direct Chief Editor on This Story</span>
              </button>
            )}

            {onRegenerateStory && (
              <button
                onClick={() => onRegenerateStory(story)}
                disabled={isRegenerating}
                className="inline-flex items-center gap-1.5 border border-[#111111] px-3 py-1.5 text-xs font-mono uppercase tracking-wider hover:bg-[#111111] hover:text-[#f9f6ef] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isRegenerating ? "Regenerating..." : "Regenerate Angle Live"}
                </span>
              </button>
            )}
          </div>

          <a
            href={primaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs font-bold underline uppercase tracking-wider text-[#111111]"
          >
            [ Read Original Article ↗ ]
          </a>
        </div>
      </aside>
    </div>
  );
}

