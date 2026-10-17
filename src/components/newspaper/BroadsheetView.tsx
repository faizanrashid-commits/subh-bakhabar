"use client";

import React from "react";
import type { Edition, EditionSummary } from "@/types/subh";
import { Masthead } from "./Masthead";
import { EditorialCartoon } from "./EditorialCartoon";
import { StoryCard } from "./StoryCard";
import { DailyRetentionQuiz } from "./DailyRetentionQuiz";

interface BroadsheetViewProps {
  edition: Edition;
  allEditions: EditionSummary[];
}

export function BroadsheetView({ edition, allEditions }: BroadsheetViewProps) {
  const leadStories = edition.stories.filter(
    (s) => s.slotType === "lead_intersection"
  );
  const lifeLensStories = edition.stories.filter(
    (s) => s.slotType === "life_lens"
  );
  const continuingStory = edition.stories.find(
    (s) => s.slotType === "continuing"
  );
  const incubatorStory = edition.stories.find(
    (s) => s.slotType === "incubator"
  );
  const beyondBubbleStory = edition.stories.find(
    (s) => s.slotType === "beyond_bubble"
  );

  const lead1 = leadStories[0] ?? edition.stories[0];
  const lead2 = leadStories[1] ?? edition.stories[1];

  return (
    <main className="newspaper-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 font-serif bg-[#f9f6ef] text-[#111111]">
      {/* 1. Classic Broadsheet Masthead (Includes Integrated Morning Wire Audio Strip) */}
      <Masthead edition={edition} allEditions={allEditions} />

      {/* 2. FOLD I: Asymmetric Front-Page Broadsheet Grid */}
      <section aria-label="Page One Front Page" className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:divide-x lg:divide-[#c8c2b6] items-start">
          {/* Left 8 Columns: Lead Story #1 on top, horizontal ink rule, Lead Story #2 + Editorial Cartoon side-by-side underneath */}
          <div className="lg:col-span-8 lg:pr-6">
            {lead1 && (
              <div className="border-b border-[#111111] pb-6 mb-6">
                <StoryCard
                  story={lead1}
                  featured={true}
                  twoColumnBody={true}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 md:divide-x md:divide-[#c8c2b6] items-start">
              <div className="md:col-span-7 md:pr-5">
                {lead2 && <StoryCard story={lead2} />}
              </div>

              <div className="md:col-span-5 md:pl-5 pt-6 md:pt-0 border-t md:border-t-0 border-[#c8c2b6] mt-6 md:mt-0">
                <EditorialCartoon
                  cartoon={edition.editorialCartoon}
                  leadStoryHeadline={lead1?.headline}
                />
              </div>
            </div>
          </div>

          {/* Right 4 Columns: Stacked 3 Life-Lens Dispatches */}
          <div className="lg:col-span-4 lg:pl-6 pt-8 lg:pt-0 border-t lg:border-t-0 border-[#111111] mt-8 lg:mt-0">
            <div className="border-b-2 border-[#111111] pb-1 mb-4 flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-[#111111]">
              <span className="font-bold">LIFE-LENS DISPATCHES</span>
              <span className="text-[#4a4742]">COLUMN DIGEST</span>
            </div>

            <div>
              {lifeLensStories.map((story, idx) => {
                const isLast = idx === lifeLensStories.length - 1;
                return (
                  <div
                    key={story.id}
                    className={
                      isLast ? "" : "border-b border-[#c8c2b6] pb-6 mb-6"
                    }
                  >
                    <StoryCard story={story} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 3. FOLD II: Continuing Story & Beyond Your Bubble (2-Column Asymmetric Spread) */}
      <section
        aria-label="Fold II: Continuity & Discovery"
        className="newspaper-double-rule-top pt-3 mb-8"
      >
        <div className="border-b border-[#111111] pb-1.5 mb-5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono uppercase tracking-widest text-[#111111]">
          <span className="font-bold">
            SECTION II · EVOLVING THREADS & HORIZON DISPATCH
          </span>
          <span className="text-[#4a4742]">
            WHAT CHANGED SINCE YESTERDAY · BEYOND YOUR BUBBLE
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 lg:divide-x lg:divide-[#c8c2b6] items-start">
          <div className="lg:col-span-7 lg:pr-6 pb-6 lg:pb-0 border-b lg:border-b-0 border-[#111111]">
            {continuingStory && (
              <StoryCard story={continuingStory} twoColumnBody={true} />
            )}
          </div>

          <div className="lg:col-span-5 lg:pl-6 pt-6 lg:pt-0">
            {beyondBubbleStory && <StoryCard story={beyondBubbleStory} />}
          </div>
        </div>
      </section>

      {/* 4. FOLD III: Dedicated Full-Width Editorial Feature Spread for the Incubator */}
      {incubatorStory && (
        <section
          aria-label="Fold III: Special Briefing Incubator"
          className="newspaper-double-rule-top pt-3 mb-8"
        >
          <div className="border-b border-[#111111] pb-1.5 mb-5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono uppercase tracking-widest text-[#111111]">
            <span className="font-bold">
              SECTION III · THE ECONOMIST-STYLE SPECIAL BRIEFING & INCUBATOR
            </span>
            <span className="text-[#4a4742]">
              DAILY MASTERY DOSSIER · ANALYTICAL SYLLABUS
            </span>
          </div>

          <div className="w-full">
            <StoryCard story={incubatorStory} twoColumnBody={true} />
          </div>
        </section>
      )}

      {/* 5. BOTTOM FOOTER: Morning News Quiz & Colophon */}
      <footer className="w-full">
        <DailyRetentionQuiz
          quiz={edition.dailyQuiz}
          editionDate={edition.date}
        />

        {/* Newspaper Colophon & Printing Imprint */}
        <div className="newspaper-double-rule-top newspaper-double-rule py-4 px-2 text-center text-xs font-serif text-[#4a4742] space-y-1.5">
          <div className="font-mono text-[#111111] font-bold uppercase tracking-widest text-[11px]">
            SUBH BAKHABAR PRINTING PRESS · ISLAMABAD & BERLIN DESKS
          </div>

          <p className="max-w-2xl mx-auto italic leading-relaxed text-[#4a4742] text-xs">
            &ldquo;An agentic, finite morning newspaper that understands who you
            are, how world events intersect with your life, what changed since
            yesterday, and who you want to become.&rdquo;
          </p>

          <div className="text-[10px] font-mono uppercase tracking-wider text-[#4a4742] pt-1 flex flex-wrap items-center justify-center gap-3">
            <span>ISLAMABAD BUREAU</span>
            <span>·</span>
            <span>FINITE 8-STORY PROTOCOL</span>
            <span>·</span>
            <span>ZERO OUTRAGE ALGORITHM</span>
            <span>·</span>
            <span>STRICT PRIMARY SOURCING</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
