"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import type { Edition, EditionSummary } from "@/types/subh";
import { formatEditionDate, toRomanNumeral } from "@/lib/format";
import { AudioBriefBar } from "./AudioBriefBar";

interface MastheadProps {
  edition: Edition;
  allEditions: EditionSummary[];
  onOpenChiefEditor?: () => void;
  onOpenOnboarding?: () => void;
}

export function Masthead({
  edition,
  allEditions,
  onOpenChiefEditor,
  onOpenOnboarding,
}: MastheadProps) {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [editorNotice, setEditorNotice] = useState<string | null>(null);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
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

  const formattedDate = formatEditionDate(edition.date);
  const volumeRoman = toRomanNumeral(edition.editionNumber);

  return (
    <header className="w-full pt-3 pb-2 mb-6 select-text text-[#111111]">
      {/* Top Utility & Control Bar (Hidden in Print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-[#c8c2b6] text-xs font-mono text-[#4a4742]">
        <div className="flex items-center gap-2 uppercase tracking-wider">
          <span className="font-bold text-[#111111]">
            MORNING BROADSHEET EDITION
          </span>
          <span className="text-[#c8c2b6]">·</span>
          <span>FINITE 8-STORY PROTOCOL</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Edition Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 border border-[#111] bg-transparent hover:bg-[#111] hover:text-[#f9f6ef] font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-none transition-colors cursor-pointer text-[#111111]"
              title="Browse Newspaper Archive"
            >
              <span>
                ISSUE #{edition.editionNumber} ({edition.date})
              </span>
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-1 w-72 bg-[#f9f6ef] border-2 border-[#111111] z-50 py-1 font-serif">
                <div className="px-3 py-1.5 border-b border-[#c8c2b6] text-[10px] font-mono uppercase tracking-wider text-[#4a4742]">
                  BACK ISSUES & ARCHIVE
                </div>
                {allEditions.map((item) => {
                  const isCurrent = item.date === edition.date;
                  return (
                    <button
                      key={item.date}
                      onClick={() => {
                        setIsDropdownOpen(false);
                        router.push(
                          item.date === allEditions[0]?.date
                            ? "/"
                            : `/edition/${item.date}`
                        );
                      }}
                      className={`w-full text-left px-3 py-2 flex items-start justify-between gap-2 text-xs hover:bg-[#efeae0] transition-colors cursor-pointer ${
                        isCurrent ? "bg-[#efeae0] font-semibold" : ""
                      }`}
                    >
                      <div>
                        <div className="font-mono text-[11px] uppercase tracking-wider text-[#111111] flex items-center gap-1">
                          {item.date} · ISSUE #{item.editionNumber}
                        </div>
                        <div className="text-[11px] text-[#4a4742] line-clamp-1 italic mt-0.5">
                          {item.leadHeadline || "Daily Edition"}
                        </div>
                      </div>
                      {isCurrent && (
                        <Check className="w-3.5 h-3.5 text-[#111111] shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Crisp Flat Typographic Action Buttons */}
          <button
            onClick={handlePrint}
            className="border border-[#111] bg-transparent hover:bg-[#111] hover:text-[#f9f6ef] font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-none transition-colors cursor-pointer text-[#111111]"
            title="Download authentic multi-column printable PDF"
          >
            Download PDF
          </button>

          <button
            onClick={handleEditorClick}
            className="border border-[#111] bg-transparent hover:bg-[#111] hover:text-[#f9f6ef] font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-none transition-colors cursor-pointer text-[#111111]"
            title="Open Chief Editor's Desk"
          >
            Chief Editor
          </button>

          <Link
            href="/onboarding"
            onClick={(e) => {
              if (onOpenOnboarding) {
                e.preventDefault();
                onOpenOnboarding();
              }
            }}
            className="border border-[#111] bg-transparent hover:bg-[#111] hover:text-[#f9f6ef] font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-none transition-colors cursor-pointer text-[#111111] inline-block"
            title="Personalize Life Lenses & Incubator Goal"
          >
            Personalize
          </Link>
        </div>
      </div>

      {/* Editor Notice Banner (Monochrome Ink) */}
      {editorNotice && (
        <div className="no-print mb-3 py-2 px-3 bg-[#efeae0] border-y border-[#111111] text-[#111111] text-xs font-serif flex items-center justify-between">
          <span>
            <strong className="font-mono not-italic uppercase tracking-wider text-[10px] mr-2">
              ■ CHIEF EDITOR&apos;S DESK:
            </strong>
            <span className="italic">{editorNotice}</span>
          </span>
        </div>
      )}

      {/* Newspaper Masthead Double Rule Top */}
      <div className="newspaper-double-rule-top pt-2">
        {/* Weather & Ear Pieces (Vintage Newspaper Top Corners) */}
        <div className="flex items-center justify-between text-[11px] font-mono text-[#4a4742] px-1 pb-1.5 uppercase tracking-wider">
          <div className="hidden sm:block">
            <span>ISLAMABAD: 22°C CLEAR</span>
            <span className="mx-2">·</span>
            <span>AQI: 82 MODERATE</span>
          </div>
          <div className="italic font-serif text-[#4a4742] normal-case tracking-normal text-center flex-1 sm:flex-initial">
            &ldquo;{edition.mastheadQuote}&rdquo;
          </div>
          <div className="hidden sm:block text-right">
            <span>CIRCULATION: SINGLE READER</span>
          </div>
        </div>
      </div>

      {/* Broadsheet Nameplate / Flag */}
      <div className="text-center py-4 my-0.5 border-t-2 border-b border-[#111111]">
        <div className="flex items-center justify-center gap-4">
          <span className="hidden md:inline-block h-[1px] w-20 bg-[#111111]" />
          <h1
            className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-[#111111] uppercase font-headline leading-none"
            style={{ fontFamily: "var(--font-playfair), 'Times New Roman', serif" }}
          >
            SUBH BAKHABAR
          </h1>
          <span className="hidden md:inline-block h-[1px] w-20 bg-[#111111]" />
        </div>

        {/* Urdu Calligraphy & Subtitle */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[#111111]">
          <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#4a4742]">
            YOUR WORLD, IN PERSPECTIVE
          </span>
          <span className="text-[#c8c2b6]">·</span>
          <span
            className="text-xl sm:text-2xl font-serif text-[#111111] font-bold px-1"
            dir="rtl"
            lang="ur"
          >
            صبح باخبر
          </span>
        </div>
      </div>

      {/* Broadsheet Metadata Folio Line (Date, Volume, Location, Price) */}
      <div className="border-b border-[#111111] py-1.5 px-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono uppercase tracking-wider text-[#111111]">
        <div>
          <span className="font-bold">ISLAMABAD BUREAU</span>
          <span className="mx-2">·</span>
          <span>VOL. {volumeRoman}</span>
          <span className="mx-2">·</span>
          <span>NO. {edition.editionNumber}</span>
        </div>

        <div className="font-bold tracking-widest text-[#111111]">
          {formattedDate}
        </div>

        <div className="text-[#4a4742]">
          <span className="hidden md:inline">PROFILE V{edition.profileVersion}</span>
          <span className="hidden md:inline mx-2">·</span>
          <span className="text-[#111111] font-semibold">MORNING FINAL</span>
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
        <div className="pt-2 pb-1 text-xs text-[#4a4742] italic font-serif flex items-baseline justify-between gap-4 border-b border-[#c8c2b6]">
          <p className="leading-snug">
            <strong className="font-mono not-italic font-bold mr-2 uppercase tracking-wider text-[10px] text-[#111111]">
              ■ FROM THE EDITOR&apos;S DESK:
            </strong>
            {edition.editorialNote}
          </p>
        </div>
      )}
    </header>
  );
}
