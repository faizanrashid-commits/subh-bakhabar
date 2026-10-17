"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Check,
  Sparkles,
  RefreshCw,
  FileDown,
  Copy,
  SlidersHorizontal,
  MessageSquareQuote,
} from "lucide-react";
import type {
  Edition,
  EditionSummary,
  EditorialTone,
  UserProfile,
} from "@/types/subh";
import { formatEditionDate, toRomanNumeral } from "@/lib/format";
import { AudioBriefBar } from "./AudioBriefBar";
import { WeatherAlmanac } from "./WeatherAlmanac";
import type { PresentationMode } from "./StoryCard";

export const EDITORIAL_TONE_OPTIONS: Array<{
  value: EditorialTone;
  label: string;
  subtitle: string;
}> = [
  {
    value: "classical",
    label: "Classical Broadsheet",
    subtitle: "Formal third-person journalistic narrative with Editor's Lens",
  },
  {
    value: "socratic",
    label: "Socratic / Critical Eye",
    subtitle: "Counter-questions, unexamined assumptions & structural trade-offs",
  },
  {
    value: "executive",
    label: "Executive Wire",
    subtitle: "1-line takeaways, key metric callouts & timeline catalysts first",
  },
];

interface MastheadProps {
  edition: Edition;
  allEditions: EditionSummary[];
  editorialTone?: EditorialTone;
  onChangeEditorialTone?: (tone: EditorialTone) => void;
  onProfileUpdated?: (profile: UserProfile) => void;
  presentationMode?: PresentationMode;
  onChangePresentationMode?: (mode: PresentationMode) => void;
  onOpenChiefEditor?: () => void;
  onOpenOnboarding?: () => void;
  onEditionGenerated?: (newEdition: Edition) => void;
}

export function Masthead({
  edition,
  allEditions,
  editorialTone = "classical",
  onChangeEditorialTone,
  onProfileUpdated,
  presentationMode = "broadsheet",
  onChangePresentationMode,
  onOpenChiefEditor,
  onOpenOnboarding,
  onEditionGenerated,
}: MastheadProps) {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isToneDropdownOpen, setIsToneDropdownOpen] = useState(false);
  const [activeTone, setActiveTone] = useState<EditorialTone>(editorialTone);
  const [editorNotice, setEditorNotice] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setActiveTone(editorialTone);
  }, [editorialTone]);

  const activeToneOption =
    EDITORIAL_TONE_OPTIONS.find((o) => o.value === activeTone) ??
    EDITORIAL_TONE_OPTIONS[0];

  const handleToneSelect = async (nextTone: EditorialTone) => {
    setIsToneDropdownOpen(false);
    setActiveTone(nextTone);
    onChangeEditorialTone?.(nextTone);
    if (nextTone === "executive") {
      onChangePresentationMode?.("executive");
    } else if (presentationMode === "executive") {
      onChangePresentationMode?.("broadsheet");
    }

    const chosenOption =
      EDITORIAL_TONE_OPTIONS.find((o) => o.value === nextTone) ??
      EDITORIAL_TONE_OPTIONS[0];
    setEditorNotice(
      `Editorial Voice calibrated to "${chosenOption.label}" — persisting reader preference...`
    );

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editorialTone: nextTone,
          source: "inline_feedback",
          summary: `Switched Editorial Voice & Tone to ${chosenOption.label}`,
        }),
      });
      const data = await res.json();
      if (data.success && data.profile) {
        onProfileUpdated?.(data.profile);
      }
    } catch {
      // Keep optimistic client state if offline
    } finally {
      setTimeout(() => setEditorNotice(null), 4000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const buildMarkdownBrief = (): string => {
    const lines: string[] = [];
    lines.push(`# SUBH BAKHABAR — Issue #${edition.editionNumber}`);
    lines.push("");
    lines.push(
      `**Date:** ${formattedDate} · **Volume:** ${volumeRoman} · **No.** ${edition.editionNumber}`
    );
    lines.push("");
    lines.push("## Dispatches");
    lines.push("");
    const incubator = edition.stories.find(
      (s) => s.incubatorModule?.kind === "css_brief"
    );
    const dispatches = incubator
      ? edition.stories.filter((s) => s !== incubator)
      : edition.stories;
    dispatches.forEach((s, i) => {
      lines.push(`### ${i + 1}. ${s.headline}`);
      lines.push(`- **Section:** ${s.sectionLabel}`);
      lines.push(`- **Takeaway:** ${s.subheadline}`);
      lines.push(`- **Why It Matters (Editor's Lens):** ${s.whyYou}`);
      if (s.citations.some((c) => c.url)) {
        lines.push("- **Sources:**");
        s.citations.forEach((c) => {
          if (c.url) lines.push(`  - [${c.sourceName}](${c.url})`);
        });
      }
      lines.push("");
    });
    const mod = incubator?.incubatorModule;
    if (incubator && mod && mod.kind === "css_brief") {
      lines.push("## CSS Incubator Briefing");
      lines.push("");
      lines.push(`**${incubator.headline}**`);
      lines.push("");
      lines.push(`- **Background:** ${mod.background}`);
      lines.push(`- **Core Issue:** ${mod.coreIssue}`);
      lines.push(`- **Policy Angle:** ${mod.policyAngle}`);
      lines.push(`- **Way Forward:** ${mod.wayForward}`);
      lines.push("");
    }
    return lines.join("\n");
  };

  const handleCopyBrief = async () => {
    try {
      await navigator.clipboard.writeText(buildMarkdownBrief());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setEditorNotice("Clipboard unavailable — could not copy brief.");
      setTimeout(() => setEditorNotice(null), 4000);
    }
  };

  const handleEditorClick = () => {
    if (onOpenChiefEditor) {
      onOpenChiefEditor();
    } else {
      setEditorNotice(
        "Chief Editor's Desk ready. Hover over any dispatch below to calibrate editorial angle, technical depth, or thread tracking."
      );
      setTimeout(() => setEditorNotice(null), 4500);
    }
  };

  const handleGenerateFresh = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setEditorNotice(
      "Ingesting live RSS feeds and synthesizing fresh 8-story broadsheet..."
    );
    try {
      const res = await fetch("/api/edition/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceLive: false }),
      });
      const data = await res.json();
      if (data.success && data.edition) {
        setEditorNotice(
          `Issue #${data.edition.editionNumber} generated & grounded in live RSS. Refreshing paper...`
        );
        if (onEditionGenerated) {
          onEditionGenerated(data.edition);
        }
        setTimeout(() => {
          router.refresh();
          router.push(
            data.edition.date === allEditions[0]?.date
              ? "/"
              : `/edition/${data.edition.date}`
          );
        }, 400);
      } else {
        setEditorNotice(
          `Generation notice: ${data.error || "Failed to generate edition."}`
        );
      }
    } catch {
      setEditorNotice(
        "Network issue during edition generation. Please check server."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const formattedDate = formatEditionDate(edition.date);
  const volumeRoman = toRomanNumeral(edition.editionNumber);

  return (
    <header className="print-masthead w-full pt-3 pb-2 mb-6 select-text text-[#141413]">
      {/* Top Utility & Modern Agentic Control Bar (Hidden in Print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-3 border-b border-[#c8c2b6] text-xs font-sans text-[#4a4742]">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Adaptive Presentation Mode Pill Segmented Toggle */}
          <div
            className="inline-flex items-center p-0.5 rounded-lg border border-[#d6cfc2] bg-[#ebe5d8] shadow-2xs"
            role="group"
            aria-label="Adaptive Presentation Mode Toggle"
          >
            <button
              type="button"
              onClick={() => {
                onChangePresentationMode?.("broadsheet");
                if (activeTone === "executive") {
                  setActiveTone("classical");
                  onChangeEditorialTone?.("classical");
                }
              }}
              className={`px-3 py-1 rounded-md text-xs font-sans font-semibold cursor-pointer transition-all ${
                presentationMode === "broadsheet"
                  ? "bg-[#141413] text-white shadow-xs"
                  : "bg-transparent text-[#3d3a35] hover:text-[#141413]"
              }`}
              title="Classic Multi-Column Broadsheet Layout"
            >
              Broadsheet Layout
            </button>
            <button
              type="button"
              onClick={() => onChangePresentationMode?.("executive")}
              className={`px-3 py-1 rounded-md text-xs font-sans font-semibold cursor-pointer transition-all ${
                presentationMode === "executive"
                  ? "bg-[#141413] text-[#FAF7F2] shadow-xs"
                  : "bg-transparent text-[#3d3a35] hover:text-[#141413]"
              }`}
              title="Modern AI Intelligence Terminal & 3-Min Executive Bento Grid"
            >
              Executive 3-Min Dispatch
            </button>
          </div>

          {/* Editorial Voice & Tone Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsToneDropdownOpen((prev) => !prev)}
              aria-expanded={isToneDropdownOpen}
              aria-haspopup="listbox"
              className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 font-sans text-xs font-semibold bg-white hover:bg-[#f3efe6] text-[#141413] border border-[#c8c2b6] shadow-sm transition-all cursor-pointer"
              title="Switch Editorial Voice & Narration Tone across the paper"
            >
              <span className="text-[#8C2D19] font-bold">Editorial Voice:</span>
              <span>{activeToneOption.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#4a4742]" />
            </button>

            {isToneDropdownOpen && (
              <div
                role="listbox"
                aria-label="Editorial Voice & Tone Options"
                className="absolute left-0 mt-1.5 w-80 bg-[#fbf8f1] border border-[#141413] rounded-lg shadow-xl z-50 py-1.5 font-serif normal-case"
              >
                <div className="px-3.5 py-1.5 border-b border-[#e2dcd0] text-[10px] font-sans font-bold uppercase tracking-wider text-[#8C2D19]">
                  Select Editorial Voice &amp; Narrative Tone
                </div>
                {EDITORIAL_TONE_OPTIONS.map((option) => {
                  const isSelected = option.value === activeTone;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleToneSelect(option.value)}
                      className={`w-full text-left px-3.5 py-2.5 flex items-start justify-between gap-2 text-xs hover:bg-[#efeae0] transition-colors cursor-pointer ${
                        isSelected ? "bg-[#F3EFE6]/70 font-semibold" : ""
                      }`}
                    >
                      <div>
                        <div className="font-sans text-xs font-bold text-[#141413]">
                          {option.label}
                        </div>
                        <div className="text-[11px] font-serif text-[#4a4742] italic mt-0.5 leading-snug">
                          {option.subtitle}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#8C2D19] shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <span className="font-mono text-[11px] text-[#555]">
            ● Daily Press Run: 06:00 AM PKT · Cached Locally
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Edition Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 font-sans text-xs font-semibold bg-white hover:bg-[#f3efe6] text-[#141413] border border-[#c8c2b6] shadow-sm transition-all cursor-pointer"
              title="Browse Newspaper Archive"
            >
              <span>
                Issue #{edition.editionNumber} ({edition.date})
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#4a4742]" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-72 bg-[#fbf8f1] border border-[#141413] rounded-lg shadow-xl z-50 py-1.5 font-serif">
                <div className="px-3.5 py-1.5 border-b border-[#e2dcd0] text-[10px] font-sans font-bold uppercase tracking-wider text-[#8C2D19]">
                  Back Issues &amp; Archive
                </div>
                {allEditions.map((item) => {
                  const isCurrent = item.date === edition.date;
                  return (
                    <button
                      key={item.date}
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        router.push(
                          item.date === allEditions[0]?.date
                            ? "/"
                            : `/edition/${item.date}`
                        );
                      }}
                      className={`w-full text-left px-3.5 py-2 flex items-start justify-between gap-2 text-xs hover:bg-[#efeae0] transition-colors cursor-pointer ${
                        isCurrent ? "bg-[#F3EFE6]/70 font-semibold" : ""
                      }`}
                    >
                      <div>
                        <div className="font-sans text-xs font-bold text-[#141413] flex items-center gap-1">
                          {item.date} · Issue #{item.editionNumber}
                        </div>
                        <div className="text-[11px] text-[#4a4742] line-clamp-1 italic mt-0.5">
                          {item.leadHeadline || "Daily Edition"}
                        </div>
                      </div>
                      {isCurrent && (
                        <Check className="w-3.5 h-3.5 text-[#8C2D19] shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Primary Modern AI Action: Generate Fresh Edition (Crimson Accent) */}
          <button
            type="button"
            onClick={handleGenerateFresh}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 font-sans text-xs font-semibold bg-[#141413] text-[#FAF7F2] hover:bg-[#2C2A26] shadow-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            title="Ingest live RSS feeds and synthesize a fresh 8-story newspaper issue"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Fresh Edition</span>
              </>
            )}
          </button>

          {/* Primary Modern AI Action: Chief Editor */}
          <button
            type="button"
            onClick={handleEditorClick}
            className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 font-sans text-xs font-semibold bg-white/80 text-[#141413] border border-[#D5CFC2] hover:bg-[#F3EFE6] shadow-sm transition-all cursor-pointer"
            title="Open Chief Editor's Desk"
          >
            <MessageSquareQuote className="w-3.5 h-3.5" />
            <span>Chief Editor</span>
          </button>

          {/* Tactile Secondary Action: Download PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 font-sans text-xs font-semibold bg-white/80 text-[#141413] border border-[#D5CFC2] hover:bg-[#F3EFE6] shadow-sm transition-all cursor-pointer"
            title="Download authentic multi-column printable PDF"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>

          {/* Copy Notion / Markdown Brief */}
          <button
            type="button"
            onClick={handleCopyBrief}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 font-sans text-xs font-semibold border shadow-sm transition-all cursor-pointer ${
              copied
                ? "bg-[#E6F2E6] text-[#1E5B2A] border-[#A8CFAE]"
                : "bg-white/80 text-[#141413] border-[#D5CFC2] hover:bg-[#F3EFE6]"
            }`}
            title="Copy this edition as a Notion-ready Markdown brief"
          >
            {copied ? null : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "✓ Copied to Clipboard" : "Copy Brief"}</span>
          </button>

          {/* Tactile Secondary Action: Personalize */}
          <Link
            href="/onboarding"
            onClick={(e) => {
              if (onOpenOnboarding) {
                e.preventDefault();
                onOpenOnboarding();
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 font-sans text-xs font-semibold bg-white/80 text-[#141413] border border-[#D5CFC2] hover:bg-[#F3EFE6] shadow-sm transition-all cursor-pointer"
            title="Personalize Life Lenses & Incubator Goal"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Personalize</span>
          </Link>
        </div>
      </div>

      {/* Editor Notice Banner */}
      {editorNotice && (
        <div className="no-print mb-3 py-2.5 px-4 bg-[#F3EFE6] border-l-4 border-[#141413] rounded-r-md text-[#141413] text-xs font-serif flex items-center justify-between shadow-2xs">
          <span>
            <strong className="font-sans not-italic uppercase tracking-wider text-[11px] text-[#141413] mr-2">
              ■ Chief Editor&apos;s Desk:
            </strong>
            <span className="italic">{editorNotice}</span>
          </span>
        </div>
      )}

      {/* Newspaper Masthead Double Rule Top */}
      <div className="newspaper-double-rule-top pt-2">
        {/* Weather & Ear Pieces (Vintage Newspaper Top Corners) */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#4a4742] px-1 pb-1.5 uppercase tracking-wider">
          <div className="min-w-0 no-print">
            <WeatherAlmanac />
          </div>
          <div className="italic font-serif text-[#4a4742] normal-case tracking-normal text-center flex-1 sm:flex-initial">
            &ldquo;{edition.mastheadQuote}&rdquo;
          </div>
          <div className="hidden sm:block text-right shrink-0">
            <span className="text-[#8C2D19] font-bold">■</span>{" "}
            <span>CIRCULATION: SINGLE READER</span>
          </div>
        </div>
      </div>

      {/* Broadsheet Nameplate / Flag */}
      <div className="text-center py-4 my-0.5 border-t-2 border-b border-[#141413]">
        <div className="flex items-center justify-center gap-4">
          <span className="hidden md:inline-block h-[1px] w-20 bg-[#141413]" />
          <h1
            className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-[#141413] uppercase font-headline leading-none"
            style={{
              fontFamily: "var(--font-playfair), 'Times New Roman', serif",
            }}
          >
            SUBH BAKHABAR
          </h1>
          <span className="hidden md:inline-block h-[1px] w-20 bg-[#141413]" />
        </div>

        {/* Urdu Calligraphy & Subtitle */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[#141413]">
          <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#8C2D19] font-bold">
            YOUR WORLD, IN PERSPECTIVE
          </span>
          <span className="text-[#c8c2b6]">·</span>
          <span
            className="text-xl sm:text-2xl font-serif text-[#141413] font-bold px-1"
            dir="rtl"
            lang="ur"
          >
            صبح باخبر
          </span>
        </div>
      </div>

      {/* Broadsheet Metadata Folio Line (Date, Volume, Location, Price) */}
      <div className="border-b border-[#141413] py-1.5 px-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono uppercase tracking-wider text-[#141413]">
        <div>
          <span className="font-bold text-[#8C2D19]">■ ISLAMABAD BUREAU</span>
          <span className="mx-2">·</span>
          <span>VOL. {volumeRoman}</span>
          <span className="mx-2">·</span>
          <span>NO. {edition.editionNumber}</span>
        </div>

        <div className="font-bold tracking-widest text-[#141413]">
          {formattedDate}
        </div>

        <div className="text-[#4a4742]">
          <span className="hidden md:inline">MORNING EDITION</span>
          <span className="hidden md:inline mx-2">·</span>
          <span className="text-[#141413] font-semibold">
            {presentationMode === "executive" || activeTone === "executive"
              ? "EXECUTIVE 3-MIN DISPATCH"
              : activeTone === "socratic"
              ? "SOCRATIC / CRITICAL EYE"
              : "CLASSICAL BROADSHEET"}
          </span>
        </div>
      </div>

      {/* Integrated Audio Brief Bar Inside Masthead Double Lines */}
      <div className="newspaper-double-rule">
        <AudioBriefBar
          script={edition.audioBriefScript}
          editionNumber={edition.editionNumber}
        />
      </div>

      {/* Editorial Note Strip (if present) */}
      {edition.editorialNote && (
        <div className="pt-2.5 pb-2 px-3 mt-2 bg-[#F3EFE6]/60 border-l-4 border-[#8C2D19] rounded-r-md text-xs text-[#3d3a35] italic font-serif flex items-baseline justify-between gap-4">
          <p className="leading-snug">
            <strong className="font-mono not-italic font-bold mr-2 uppercase tracking-wider text-[10px] text-[#8C2D19]">
              ■ FROM THE EDITOR&apos;S DESK:
            </strong>
            {edition.editorialNote}
          </p>
        </div>
      )}
    </header>
  );
}
