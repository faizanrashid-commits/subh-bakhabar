"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type {
  Edition,
  EditionSummary,
  EditorialTone,
  StoryItem,
  UserProfile,
} from "@/types/subh";
import { Pencil } from "lucide-react";
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
  initialProfile?: UserProfile;
}

export function BroadsheetView({
  edition,
  allEditions,
  initialProfile,
}: BroadsheetViewProps) {
  const router = useRouter();
  const [currentEdition, setCurrentEdition] = useState<Edition>(edition);
  const [editorialTone, setEditorialTone] = useState<EditorialTone>(
    initialProfile?.editorialTone ?? "classical"
  );
  const [presentationMode, setPresentationMode] = useState<PresentationMode>(
    initialProfile?.editorialTone === "executive" ? "executive" : "broadsheet"
  );

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
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(
    initialProfile ?? null
  );

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

  // Fetch active profile on mount if not provided by SSR so editorialTone is synced
  useEffect(() => {
    if (initialProfile) return;
    let cancelled = false;
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.profile) {
          const prof = data.profile as UserProfile;
          setActiveProfile(prof);
          const tone = prof.editorialTone ?? "classical";
          setEditorialTone(tone);
          setPresentationMode(tone === "executive" ? "executive" : "broadsheet");
        }
      })
      .catch(() => {
        // Ignore offline fetch error
      });
    return () => {
      cancelled = true;
    };
  }, [initialProfile]);

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

  const isExecutiveBento =
    presentationMode === "executive" || editorialTone === "executive";

  const sharedCardProps = {
    presentationMode,
    editorialTone,
    tone: editorialTone,
    onOpenStoryModal: (st: StoryItem) => setActiveModalStory(st),
    onSendToEditor: (st: StoryItem, q?: string) =>
      handleOpenEditorWithContext(st, q),
    onHighlightText: handleHighlightText,
    onProfileMutated: (prof: UserProfile) => {
      setActiveProfile(prof);
      if (prof.editorialTone) {
        setEditorialTone(prof.editorialTone);
      }
      setCurrentEdition((prev) => ({ ...prev, profileVersion: prof.version }));
    },
  };

  return (
    <main className="newspaper-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 font-serif bg-[#FAF7F2] text-[#141413]">
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
            className="bg-[#141413] text-[#FAF7F2] border border-[#141413] rounded-md px-3.5 py-1.5 text-xs font-sans font-semibold shadow-md hover:bg-[#2C2A26] transition-colors cursor-pointer whitespace-nowrap"
          >
            <span className="inline-flex items-center gap-1.5"><Pencil className="w-3 h-3" aria-hidden="true" />Send to Chief Editor</span>
          </button>
        </div>
      )}

      {/* 1. Classic Broadsheet Masthead */}
      <Masthead
        edition={currentEdition}
        allEditions={allEditions}
        editorialTone={editorialTone}
        onChangeEditorialTone={(nextTone) => {
          setEditorialTone(nextTone);
          setPresentationMode(
            nextTone === "executive" ? "executive" : "broadsheet"
          );
        }}
        onProfileUpdated={(prof) => {
          setActiveProfile(prof);
          if (prof.editorialTone) {
            setEditorialTone(prof.editorialTone);
          }
          setCurrentEdition((prev) => ({
            ...prev,
            profileVersion: prof.version,
          }));
        }}
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

      {/* ADAPTIVE EDITORIAL VOICE BANNER (when Socratic active) */}
      {editorialTone === "socratic" && !isExecutiveBento && (
        <div className="no-print mb-6 p-4 bg-[#F3EFE6] border-l-4 border-[#8C2D19] rounded-r-lg text-[#141413] flex flex-wrap items-center justify-between gap-3 text-xs font-sans shadow-xs">
          <div>
            <span className="font-bold uppercase tracking-wider text-[#8C2D19] mr-2">
              ■ Socratic / Critical Eye Voice Active:
            </span>
            <span className="font-serif italic text-[#2b2823] text-[13px]">
              Every dispatch surfaces ink-stamped epistemological
              counter-questions, structural trade-offs, and unexamined
              assumptions.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditorialTone("classical");
              setPresentationMode("broadsheet");
            }}
            className="bg-[#141413] text-[#FAF7F2] hover:bg-[#2C2A26] rounded-md px-3.5 py-1 text-xs font-medium cursor-pointer transition-colors"
          >
            Switch to Classical Broadsheet
          </button>
        </div>
      )}

      {/* MODERN AI EXECUTIVE 3-MIN DISPATCH BENTO GRID */}
      {isExecutiveBento ? (
        <section
          aria-label="Executive 3-Minute Intelligence Terminal"
          className="mb-10"
        >
          {/* Intelligence Terminal Header Banner */}
          <div className="no-print mb-6 p-4 bg-[#F3EFE6] text-[#141413] border border-[#DFD9CE] border-l-[3px] border-l-[#141413] rounded-xl flex flex-wrap items-center justify-between gap-3 font-sans">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded bg-[#EAE4D7] text-[#141413] text-[10px] font-semibold uppercase tracking-wider">
                  Live Intelligence Bento
                </span>
                <span className="font-mono text-xs uppercase tracking-widest text-[#141413] font-semibold">
                  <span className="text-[#8C2D19]">●</span> Executive 3-Minute Dispatch Terminal
                </span>
              </div>
              <p className="text-xs text-[#4A463F]">
                All {stories.length} daily dispatches distilled into prioritized
                bento briefings with 1-line takeaways, quantitative metric
                callouts, and timeline catalysts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditorInitialPrompt("");
                  setEditorHighlightedQuote("");
                  setIsChiefEditorOpen(true);
                }}
                className="bg-[#141413] text-[#FAF7F2] hover:bg-[#2C2A26] rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
              >
                Open Chief Editor
              </button>
              <button
                type="button"
                onClick={() => {
                  setPresentationMode("broadsheet");
                  if (editorialTone === "executive") {
                    setEditorialTone("classical");
                  }
                }}
                className="bg-white/80 text-[#141413] border border-[#D5CFC2] hover:bg-[#F3EFE6] rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
              >
                Switch to Classic Broadsheet
              </button>
            </div>
          </div>

          {/* 3-Column Modern Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            {stories.map((story, idx) => (
              <StoryCard
                key={story.id}
                story={story}
                priorityIndex={idx}
                {...sharedCardProps}
                presentationMode="executive"
              />
            ))}

            {/* 9th Bento Tile: Daily Editorial Lithograph & Cross-Lens Radar */}
            <div className="bg-white/90 border border-[#d6cfc2] rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <EditorialCartoon
                cartoon={currentEdition.editorialCartoon}
                leadStoryHeadline={lead1?.headline}
                onSelectStory={() => {
                  if (lead1) setActiveModalStory(lead1);
                }}
              />
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* 2. FOLD I: Asymmetric Front-Page Broadsheet Grid */}
          <section
            aria-label="Page One Front Page"
            className="print-sheet-1 mb-10"
          >
            <div className="print-grid-12 grid grid-cols-1 lg:grid-cols-12 lg:divide-x lg:divide-[#c8c2b6] items-start">
              {/* Left 8 Columns */}
              <div className="print-col-8 lg:col-span-8 lg:pr-6">
                {lead1 && (
                  <div id="story-lead-1" className="mb-8 print-compact-mb">
                    <StoryCard
                      story={lead1}
                      featured={true}
                      twoColumnBody={true}
                      {...sharedCardProps}
                    />
                  </div>
                )}

                <div className="print-grid-12 grid grid-cols-1 md:grid-cols-12 md:divide-x md:divide-[#c8c2b6] items-start">
                  {/* Lead Story #2 */}
                  <div className="print-col-7 md:col-span-7 md:pr-5">
                    {lead2 && <StoryCard story={lead2} {...sharedCardProps} />}
                  </div>

                  {/* Editorial Cartoon + Front-Page Synthesis Stacked Tightly (Eliminates Vertical Column Gap) */}
                  <div className="print-col-5 md:col-span-5 md:pl-5 pt-6 md:pt-0 mt-6 md:mt-0 flex flex-col gap-4">
                    <EditorialCartoon
                      cartoon={currentEdition.editorialCartoon}
                      leadStoryHeadline={lead1?.headline}
                      onSelectStory={() => {
                        if (lead1) {
                          setActiveModalStory(lead1);
                        }
                      }}
                    />

                    {/* Front-Page Cross-Lens Synthesis & Edition Index Card */}
                    <aside
                      aria-label="Front-Page Synthesis & Index"
                      className="no-print bg-[#ebe6dc] border border-[#d6cfc2] border-t-[3px] border-t-[#141413] rounded-b-md p-3.5 text-xs font-serif text-[#141413]"
                    >
                      <div className="font-mono font-bold text-[11px] uppercase tracking-wider text-[#8C2D19] mb-1.5">
                        ■ FRONT-PAGE SYNTHESIS · CROSS-LENS RADAR
                      </div>
                      <p className="text-[#2b2823] leading-snug mb-2.5">
                        Today&apos;s {stories.length}-dispatch finite edition
                        connects{" "}
                        <strong>{lead1?.includedBecause}</strong> with{" "}
                        <strong>{lead2?.includedBecause}</strong>.
                      </p>
                      <div className="space-y-1.5 pt-2 border-t border-[#d6cfc2] font-sans text-[11px]">
                        <div className="font-mono text-[10px] uppercase tracking-wider text-[#4a4742] font-bold">
                          Inside Today&apos;s Paper:
                        </div>
                        {stories.slice(0, 5).map((st, i) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setActiveModalStory(st)}
                            className="w-full text-left flex items-baseline justify-between gap-2 py-0.5 hover:text-[#8C2D19] transition-colors cursor-pointer"
                          >
                            <span className="truncate font-medium">
                              <strong className="font-mono text-[#8C2D19] mr-1">
                                0{i + 1}
                              </strong>
                              {st.headline}
                            </span>
                            <span className="font-mono text-[10px] text-[#4a4742] shrink-0">
                              {st.intersectionScore}pts
                            </span>
                          </button>
                        ))}
                      </div>
                    </aside>
                  </div>
                </div>
              </div>

              {/* Right 4 Columns: Stacked 3 Life-Lens Dispatches */}
              <div className="print-col-4 lg:col-span-4 lg:pl-6 pt-8 lg:pt-0 mt-8 lg:mt-0">
                <div className="border-b-2 border-[#141413] pb-1.5 mb-4 flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-[#141413]">
                  <span className="font-bold text-[#8C2D19]">
                    ■ LIFE-LENS DISPATCHES
                  </span>
                  <span className="text-[#4a4742]">COLUMN DIGEST</span>
                </div>

                <div className="space-y-8">
                  {lifeLensStories.map((story) => (
                    <div key={story.id} className="print-compact-mb">
                      <StoryCard story={story} {...sharedCardProps} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 3. FOLD II: Continuing Story & Beyond Your Bubble */}
          <section
            aria-label="Fold II: Continuity & Discovery"
            className="print-sheet-2 newspaper-double-rule-top pt-3 mb-10"
          >
            <div className="border-b border-[#141413] pb-1.5 mb-5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono uppercase tracking-widest text-[#141413]">
              <span className="font-bold text-[#8C2D19]">
                ■ SECTION II · EVOLVING THREADS &amp; HORIZON DISPATCH
              </span>
              <span className="text-[#4a4742]">
                WHAT CHANGED SINCE YESTERDAY · BEYOND YOUR BUBBLE
              </span>
            </div>

            <div className="print-grid-12 grid grid-cols-1 lg:grid-cols-12 lg:divide-x lg:divide-[#c8c2b6] items-start">
              <div className="print-col-7 lg:col-span-7 lg:pr-6 pb-6 lg:pb-0">
                {continuingStory && (
                  <StoryCard
                    story={continuingStory}
                    twoColumnBody={true}
                    {...sharedCardProps}
                  />
                )}
              </div>

              <div className="print-col-5 lg:col-span-5 lg:pl-6 pt-6 lg:pt-0">
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
              className="print-avoid-break newspaper-double-rule-top pt-3 mb-10"
            >
              <div className="border-b border-[#141413] pb-1.5 mb-5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono uppercase tracking-widest text-[#141413]">
                <span className="font-bold text-[#8C2D19]">
                  ■ SECTION III · THE ECONOMIST-STYLE SPECIAL BRIEFING &amp;
                  INCUBATOR
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
        </>
      )}

      {/* 5. BOTTOM FOOTER: Morning News Quiz & Colophon */}
      <footer className="w-full">
        <div className="no-print">
          <DailyRetentionQuiz
            quiz={currentEdition.dailyQuiz}
            editionDate={currentEdition.date}
          />
        </div>

        {/* Newspaper Colophon & Printing Imprint */}
        <div className="newspaper-double-rule-top newspaper-double-rule py-4 px-2 text-center text-xs font-serif text-[#4a4742] space-y-1.5">
          <div className="font-mono text-[#141413] font-bold uppercase tracking-widest text-[11px]">
            SUBH BAKHABAR PRINTING PRESS · ISLAMABAD &amp; BERLIN DESKS
          </div>

          <p className="max-w-2xl mx-auto italic leading-relaxed text-[#4a4742] text-xs">
            &ldquo;An agentic, finite morning newspaper that understands who you
            are, how world events intersect with your life, what changed since
            yesterday, and who you want to become.&rdquo;
          </p>

          <div className="text-[10px] font-mono uppercase tracking-wider text-[#4a4742] pt-1 flex flex-wrap items-center justify-center gap-3">
            <span>FINITE 8-DISPATCH PROTOCOL</span>
            <span>·</span>
            <span>INDEPENDENT CORROBORATION</span>
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
          if (updatedProf.editorialTone) {
            setEditorialTone(updatedProf.editorialTone);
          }
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
          if (prof.editorialTone) {
            setEditorialTone(prof.editorialTone);
          }
          setCurrentEdition((prev) => ({
            ...prev,
            profileVersion: prof.version,
          }));
        }}
      />
    </main>
  );
}
