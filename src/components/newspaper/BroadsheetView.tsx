"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Edition, EditionSummary, StoryItem, UserProfile } from "@/types/subh";
import { Masthead } from "./Masthead";
import { EditorialCartoon } from "./EditorialCartoon";
import { StoryCard, type PresentationMode } from "./StoryCard";
import { DailyRetentionQuiz } from "./DailyRetentionQuiz";
import { StoryModal } from "@/components/modals/StoryModal";
import { OnboardingModal } from "@/components/modals/OnboardingModal";
import { ChiefEditorDrawer } from "@/components/modals/ChiefEditorDrawer";

interface BroadsheetViewProps {
  edition: Edition;
  allEditions: EditionSummary[];
}

export function BroadsheetView({ edition, allEditions }: BroadsheetViewProps) {
  const router = useRouter();
  const [currentEdition, setCurrentEdition] = useState<Edition>(edition);
  const [presentationMode, setPresentationMode] =
    useState<PresentationMode>("broadsheet");

  // Modals & Drawers state
  const [activeModalStory, setActiveModalStory] = useState<StoryItem | null>(
    null
  );
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isChiefEditorOpen, setIsChiefEditorOpen] = useState<boolean>(false);
  const [editorInitialPrompt, setEditorInitialPrompt] = useState<string>("");
  const [editorHighlightedQuote, setEditorHighlightedQuote] =
    useState<string>("");
  const [editorSelectedStoryId, setEditorSelectedStoryId] = useState<
    string | undefined
  >(undefined);
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);

  // Red-Pencil Highlight-to-Critique floating badge state
  const [redPencilTooltip, setRedPencilTooltip] = useState<{
    story: StoryItem;
    quote: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    setCurrentEdition(edition);
  }, [edition]);

  // Dismiss Red-Pencil tooltip when clicking outside or clearing selection
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-red-pencil-tooltip]")) return;
      setRedPencilTooltip(null);
    };
    window.addEventListener("mousedown", handleMouseDown);
    return () => window.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const stories = currentEdition.stories;

  const leadStories = stories.filter((s) => s.slotType === "lead_intersection");
  const lifeLensStories = stories.filter((s) => s.slotType === "life_lens");
  const continuingStory = stories.find((s) => s.slotType === "continuing");
  const incubatorStory = stories.find((s) => s.slotType === "incubator");
  const beyondBubbleStory = stories.find((s) => s.slotType === "beyond_bubble");

  const lead1 = leadStories[0] ?? stories[0];
  const lead2 = leadStories[1] ?? stories[1];

  const handleOpenEditorWithContext = (story: StoryItem, quote?: string) => {
    setEditorSelectedStoryId(story.id);
    if (quote) {
      setEditorHighlightedQuote(quote);
      setEditorInitialPrompt(`Regarding: '${quote}' — `);
    } else {
      setEditorHighlightedQuote("");
      setEditorInitialPrompt(
        `Recalibrate "${story.headline.slice(0, 45)}..." to focus more on `
      );
    }
    setRedPencilTooltip(null);
    setIsChiefEditorOpen(true);
  };

  const handleHighlightText = (
    story: StoryItem,
    quote: string,
    coords: { x: number; y: number }
  ) => {
    const clampedX = Math.max(
      120,
      Math.min(
        typeof window !== "undefined" ? window.innerWidth - 140 : 600,
        coords.x
      )
    );
    const clampedY = Math.max(48, coords.y);
    setRedPencilTooltip({
      story,
      quote,
      x: clampedX,
      y: clampedY,
    });
  };

  const handleStoryRegenerated = (updatedStory: StoryItem) => {
    setCurrentEdition((prev) => ({
      ...prev,
      stories: prev.stories.map((s) =>
        s.id === updatedStory.id ? updatedStory : s
      ),
    }));
    if (activeModalStory?.id === updatedStory.id) {
      setActiveModalStory(updatedStory);
    }
  };

  const sharedCardProps = {
    presentationMode,
    onOpenStoryModal: (st: StoryItem) => setActiveModalStory(st),
    onSendToEditor: (st: StoryItem, q?: string) =>
      handleOpenEditorWithContext(st, q),
    onHighlightText: handleHighlightText,
    onProfileMutated: (prof: UserProfile) => {
      setActiveProfile(prof);
      setCurrentEdition((prev) => ({ ...prev, profileVersion: prof.version }));
    },
  };

  return (
    <main className="newspaper-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 font-serif bg-[#f9f6ef] text-[#111111]">
      {/* Highlight-to-Critique ("Red Pencil Tooltip") */}
      {redPencilTooltip && (
        <div
          data-red-pencil-tooltip="true"
          style={{
            position: "fixed",
            left: `${redPencilTooltip.x}px`,
            top: `${redPencilTooltip.y}px`,
            transform: "translate(-50%, -100%)",
          }}
          className="no-print z-50 shadow-xl"
        >
          <button
            type="button"
            onClick={() =>
              handleOpenEditorWithContext(
                redPencilTooltip.story,
                redPencilTooltip.quote
              )
            }
            className="bg-[#991b1b] text-[#f9f6ef] border-2 border-[#111111] px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider hover:bg-[#111111] transition-colors cursor-pointer whitespace-nowrap"
          >
            [ ✎ Send to Chief Editor ]
          </button>
        </div>
      )}

      {/* 1. Classic Broadsheet Masthead */}
      <Masthead
        edition={currentEdition}
        allEditions={allEditions}
        presentationMode={presentationMode}
        onChangePresentationMode={setPresentationMode}
        onOpenChiefEditor={() => {
          setEditorInitialPrompt("");
          setEditorHighlightedQuote("");
          setIsChiefEditorOpen(true);
        }}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        onEditionGenerated={(newEd) => setCurrentEdition(newEd)}
      />

      {/* ADAPTIVE EXECUTIVE 3-MIN DISPATCH BANNER (when active) */}
      {presentationMode === "executive" && (
        <div className="no-print mb-6 p-3.5 bg-[#111111] text-[#f9f6ef] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div>
            <span className="font-bold uppercase tracking-widest mr-2">
              ⚡ EXECUTIVE 3-MINUTE DISPATCH MODE ACTIVE:
            </span>
            <span className="text-[#c8c2b6]">
              All 8 stories condensed into high-density 3-bullet briefings with
              bold metric callouts.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPresentationMode("broadsheet")}
            className="border border-[#f9f6ef] px-2.5 py-1 text-[10px] uppercase hover:bg-[#f9f6ef] hover:text-[#111111] cursor-pointer transition-colors"
          >
            Switch to Classic Broadsheet
          </button>
        </div>
      )}

      {/* 2. FOLD I: Asymmetric Front-Page Broadsheet Grid */}
      <section aria-label="Page One Front Page" className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:divide-x lg:divide-[#c8c2b6] items-start">
          {/* Left 8 Columns */}
          <div className="lg:col-span-8 lg:pr-6">
            {lead1 && (
              <div className="border-b border-[#111111] pb-6 mb-6">
                <StoryCard
                  story={lead1}
                  featured={true}
                  twoColumnBody={true}
                  {...sharedCardProps}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 md:divide-x md:divide-[#c8c2b6] items-start">
              <div className="md:col-span-7 md:pr-5">
                {lead2 && <StoryCard story={lead2} {...sharedCardProps} />}
              </div>

              <div className="md:col-span-5 md:pl-5 pt-6 md:pt-0 border-t md:border-t-0 border-[#c8c2b6] mt-6 md:mt-0">
                <EditorialCartoon
                  cartoon={currentEdition.editorialCartoon}
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
                    <StoryCard story={story} {...sharedCardProps} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 3. FOLD II: Continuing Story & Beyond Your Bubble */}
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
              <StoryCard
                story={continuingStory}
                twoColumnBody={true}
                {...sharedCardProps}
              />
            )}
          </div>

          <div className="lg:col-span-5 lg:pl-6 pt-6 lg:pt-0">
            {beyondBubbleStory && (
              <StoryCard story={beyondBubbleStory} {...sharedCardProps} />
            )}
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
            <StoryCard
              story={incubatorStory}
              twoColumnBody={true}
              {...sharedCardProps}
            />
          </div>
        </section>
      )}

      {/* 5. BOTTOM FOOTER: Morning News Quiz & Colophon */}
      <footer className="w-full">
        <DailyRetentionQuiz
          quiz={currentEdition.dailyQuiz}
          editionDate={currentEdition.date}
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

      {/* Story Reader Drawer Modal */}
      <StoryModal
        story={activeModalStory}
        onClose={() => setActiveModalStory(null)}
        onSendToEditor={(st) => handleOpenEditorWithContext(st)}
      />

      {/* Stage 4: Onboarding Mind-Reader Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        initialProfile={activeProfile}
        onProfileSaved={(updatedProf) => {
          setActiveProfile(updatedProf);
          router.refresh();
        }}
      />

      {/* Stage 5: Chief Editor's Desk Drawer */}
      <ChiefEditorDrawer
        isOpen={isChiefEditorOpen}
        onClose={() => setIsChiefEditorOpen(false)}
        stories={stories}
        editionDate={currentEdition.date}
        initialPrompt={editorInitialPrompt}
        initialHighlightedQuote={editorHighlightedQuote}
        initialSelectedStoryId={editorSelectedStoryId}
        onStoryRegenerated={handleStoryRegenerated}
        onProfileUpdated={(prof) => {
          setActiveProfile(prof);
          setCurrentEdition((prev) => ({
            ...prev,
            profileVersion: prof.version,
          }));
        }}
      />
    </main>
  );
}
