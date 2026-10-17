"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Send,
  RotateCcw,
  Check,
  Sparkles,
  Brain,
  Terminal,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import type {
  ProfileSnapshot,
  StoryItem,
  UserProfile,
} from "@/types/subh";
import type { ProposedChangeItem } from "@/lib/gemini";

interface ChiefEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stories: StoryItem[];
  editionDate: string;
  initialPrompt?: string;
  initialHighlightedQuote?: string;
  initialSelectedStoryId?: string;
  onStoryRegenerated?: (updatedStory: StoryItem) => void;
  onProfileUpdated?: (updatedProfile: UserProfile) => void;
}

const QUICK_DIRECTIVES = [
  "I'm starting CSS prep, add foreign policy analysis",
  "Focus more on NEPRA tariffs and inverter hardware",
  "Explain Formula 1 terms more simply",
  "Switch my Incubator to German via Tech News",
];

export function ChiefEditorDrawer({
  isOpen,
  onClose,
  stories,
  editionDate,
  initialPrompt = "",
  initialHighlightedQuote = "",
  initialSelectedStoryId,
  onStoryRegenerated,
  onProfileUpdated,
}: ChiefEditorDrawerProps) {
  const [activeView, setActiveView] = useState<"command" | "brain">("command");
  const [commandInput, setCommandInput] = useState<string>(initialPrompt);
  const [highlightedQuote, setHighlightedQuote] = useState<string>(
    initialHighlightedQuote
  );
  const [selectedStoryId, setSelectedStoryId] = useState<string>(
    initialSelectedStoryId || stories[0]?.id || ""
  );
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Command execution state
  const [isSendingCommand, setIsSendingCommand] = useState<boolean>(false);
  const [editorReply, setEditorReply] = useState<string | null>(null);
  const [proposedSummary, setProposedSummary] = useState<string | null>(null);
  const [proposedChanges, setProposedChanges] = useState<ProposedChangeItem[]>(
    []
  );
  const [pendingPreviousState, setPendingPreviousState] =
    useState<ProfileSnapshot | null>(null);
  const [pendingNewProfile, setPendingNewProfile] =
    useState<UserProfile | null>(null);
  const [changeCommitted, setChangeCommitted] = useState<boolean>(false);
  const [lastCommittedChangeId, setLastCommittedChangeId] = useState<
    string | undefined
  >(undefined);

  // Story regeneration state
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [regenNotice, setRegenNotice] = useState<string | null>(null);

  useEffect(() => {
    if (initialPrompt) {
      setCommandInput(initialPrompt);
      setActiveView("command");
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (initialHighlightedQuote !== undefined) {
      setHighlightedQuote(initialHighlightedQuote);
    }
  }, [initialHighlightedQuote]);

  useEffect(() => {
    if (initialSelectedStoryId) {
      setSelectedStoryId(initialSelectedStoryId);
    } else if (!selectedStoryId && stories[0]?.id) {
      setSelectedStoryId(stories[0].id);
    }
  }, [initialSelectedStoryId, stories, selectedStoryId]);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.profile) {
            setProfile(data.profile);
          }
        })
        .catch(() => undefined);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendCommand = async (customCmd?: string) => {
    const textToSend = (customCmd ?? commandInput).trim();
    if (!textToSend || isSendingCommand) return;
    setIsSendingCommand(true);
    setChangeCommitted(false);
    setRegenNotice(null);

    try {
      const res = await fetch("/api/editor/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: textToSend,
          highlightedQuote: highlightedQuote || undefined,
          autoApply: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditorReply(data.reply);
        setProposedSummary(data.summary);
        setProposedChanges(data.proposedChanges || []);
        setPendingPreviousState(data.previousState || null);
        setPendingNewProfile(data.updatedProfile || null);
      } else {
        setEditorReply(
          `Editor Desk Notice: ${data.error || "Unable to parse directive."}`
        );
      }
    } catch {
      setEditorReply("Network issue communicating with Chief Editor Desk.");
    } finally {
      setIsSendingCommand(false);
    }
  };

  const handleApplyChange = async () => {
    if (!pendingNewProfile) return;
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pendingNewProfile.name,
          lifeLenses: pendingNewProfile.lifeLenses,
          incubatorGoal: pendingNewProfile.incubatorGoal,
          trackedStoryIds: pendingNewProfile.trackedStoryIds,
          source: "chief_editor",
          summary:
            proposedSummary ||
            `Chief Editor Directive: ${commandInput.slice(0, 50)}`,
        }),
      });
      const data = await res.json();
      if (data.success && data.profile) {
        setProfile(data.profile);
        setChangeCommitted(true);
        const latestLog =
          data.profile.changeLog[data.profile.changeLog.length - 1];
        setLastCommittedChangeId(latestLog?.id);
        if (onProfileUpdated) onProfileUpdated(data.profile);
      }
    } catch {
      setRegenNotice("Failed to commit profile change.");
    }
  };

  const handleUndoChange = async (changeId?: string) => {
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "undo",
          changeId: changeId || lastCommittedChangeId,
          restoreState: !changeId ? pendingPreviousState : undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.profile) {
        setProfile(data.profile);
        setChangeCommitted(false);
        setProposedChanges([]);
        setEditorReply(
          "Reverted profile mutation to previous state. Your Persona Brain has been restored."
        );
        if (onProfileUpdated) onProfileUpdated(data.profile);
      }
    } catch {
      setRegenNotice("Failed to undo change.");
    }
  };

  const handleRegenerateStory = async () => {
    if (!selectedStoryId || isRegenerating) return;
    setIsRegenerating(true);
    setRegenNotice(
      "Rewriting story live via Gemini Flash Lite to match your directive..."
    );

    try {
      const res = await fetch("/api/story/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: selectedStoryId,
          instruction:
            commandInput.trim() ||
            proposedSummary ||
            "Recalibrate technical depth and angle to match my latest Persona Brain.",
          date: editionDate,
        }),
      });
      const data = await res.json();
      if (data.success && data.story) {
        setRegenNotice(
          `Regenerated "${data.story.headline.slice(0, 48)}..." live in today's broadsheet!`
        );
        if (onStoryRegenerated) {
          onStoryRegenerated(data.story);
        }
      } else {
        setRegenNotice(
          `Regeneration error: ${data.error || "Could not rewrite story."}`
        );
      }
    } catch {
      setRegenNotice("Network error during live story regeneration.");
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-[1px] no-print"
      onClick={onClose}
    >
      <aside
        className="relative w-full max-w-xl h-full overflow-y-auto bg-[#FAF7F2] text-[#141413] border-l border-[#DFD9CE] p-6 font-sans shadow-2xl flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
        aria-label="Chief Editor's Desk Drawer"
      >
        <div>
          {/* Drawer Header */}
          <div className="flex items-start justify-between gap-3 pb-4 mb-5 border-b border-[#DFD9CE]">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EFECE6] px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#141413]">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                AI EDITORIAL DESK
              </div>
              <h2
                className="mt-2 text-2xl font-bold text-[#141413]"
                style={{
                  fontFamily: "var(--font-playfair), 'Times New Roman', serif",
                }}
              >
                Direct the Editor
              </h2>
            </div>

            <button
              onClick={onClose}
              className="bg-white/80 text-[#141413] border border-[#DCD6C9] hover:bg-[#F3EFE6] rounded-md px-2.5 py-1 text-[11px] font-sans font-medium transition-all cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="grid grid-cols-2 gap-1 bg-[#EFECE6] p-1 rounded-lg mb-5 font-sans text-xs">
            <button
              onClick={() => setActiveView("command")}
              className={`py-2 px-3 flex items-center justify-center gap-1.5 rounded-md cursor-pointer transition-all font-medium ${
                activeView === "command"
                  ? "bg-white text-[#141413] shadow-xs"
                  : "bg-transparent text-[#4A463F] hover:text-[#141413]"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Direct the Editor</span>
            </button>

            <button
              onClick={() => setActiveView("brain")}
              className={`py-2 px-3 flex items-center justify-center gap-1.5 rounded-md cursor-pointer transition-all font-medium ${
                activeView === "brain"
                  ? "bg-white text-[#141413] shadow-xs"
                  : "bg-transparent text-[#4A463F] hover:text-[#141413]"
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Persona Brain ({profile?.changeLog?.length || 0})</span>
            </button>
          </div>

          {/* VIEW A: DIRECT THE EDITOR */}
          {activeView === "command" && (
            <div className="space-y-5">
              {highlightedQuote && (
                <div className="p-3 bg-[#F3EFE6] border border-[#DFD9CE] border-l-[3px] border-l-[#8C2D19] rounded-r-lg text-xs">
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase font-semibold text-[#141413] mb-1">
                    <span>
                      <span className="text-[#8C2D19]">■</span> Highlighted Quote
                    </span>
                    <button
                      type="button"
                      onClick={() => setHighlightedQuote("")}
                      className="underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <p className="italic text-[#2C2A26] line-clamp-3">
                    &ldquo;{highlightedQuote}&rdquo;
                  </p>
                </div>
              )}

              {/* Sample Directives */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#4A463F] mb-2">
                  Sample Directives
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_DIRECTIVES.map((sample, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setCommandInput(sample);
                        handleSendCommand(sample);
                      }}
                      className="bg-white hover:bg-[#141413] hover:text-white border border-[#DCD6C9] rounded-full px-3.5 py-1.5 text-xs font-sans text-left cursor-pointer transition-all shadow-2xs"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Composer */}
              <div className="bg-white border border-[#D5CFC2] rounded-xl p-4 shadow-sm focus-within:ring-2 focus-within:ring-[#141413]/20">
                <label className="block text-[10px] font-mono font-semibold uppercase tracking-wider text-[#141413] mb-2">
                  Talk Directly to the Editor-in-Chief
                </label>
                <textarea
                  rows={3}
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="e.g., I'm starting CSS prep, add foreign policy analysis..."
                  className="w-full bg-transparent text-sm font-sans text-[#141413] placeholder:text-[#8A857A] resize-none focus:outline-none"
                />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-[#4A463F]">
                    Validated via Gemini Flash Lite Schema
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSendCommand()}
                    disabled={isSendingCommand || !commandInput.trim()}
                    className="inline-flex items-center gap-1.5 bg-[#141413] hover:bg-[#2C2A26] text-white rounded-lg px-4 py-2 text-xs font-sans font-medium cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {isSendingCommand ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Parsing Patch...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send to Chief Editor</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Proposed Schema-Validated Diff */}
              {editorReply && (
                <div className="border border-[#DFD9CE] bg-[#F3EFE6] rounded-xl p-4 space-y-3">
                  <div className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#141413]">
                    <span className="text-[#8C2D19]">■</span> Chief Editor Response &amp; Schema Patch
                  </div>
                  <p className="text-sm text-[#2C2A26] leading-relaxed">
                    {editorReply}
                  </p>

                  {proposedChanges.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[#DFD9CE]">
                      <div className="text-[10px] font-mono uppercase font-semibold text-[#4A463F]">
                        Proposed Profile Diff (Previous State → New State):
                      </div>
                      {proposedChanges.map((chg, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-white border border-[#DFD9CE] rounded-lg text-xs font-mono space-y-1"
                        >
                          <div className="font-semibold text-[#141413] uppercase">
                            {chg.field}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-[11px]">
                            <span className="line-through text-[#4A463F] bg-[#F3EFE6] rounded px-1.5 py-0.5">
                              {chg.previousValue}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 hidden sm:inline text-[#141413] shrink-0" />
                            <span className="font-semibold text-[#141413] bg-[#EAE4D7] rounded px-1.5 py-0.5">
                              {chg.newValue}
                            </span>
                          </div>
                        </div>
                      ))}

                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        {!changeCommitted ? (
                          <button
                            type="button"
                            onClick={handleApplyChange}
                            className="inline-flex items-center gap-1.5 bg-[#141413] hover:bg-[#2C2A26] text-white rounded-lg px-3.5 py-1.5 text-xs font-sans font-medium cursor-pointer transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Apply Change</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-sans font-medium text-[#141413] bg-white border border-[#DFD9CE] rounded-lg px-2.5 py-1">
                            <Check className="w-3.5 h-3.5" aria-hidden="true" /> Applied to Persona Brain (v{profile?.version})
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleUndoChange()}
                          className="inline-flex items-center gap-1.5 bg-white/80 text-[#141413] border border-[#DCD6C9] hover:bg-white rounded-lg px-3 py-1.5 text-xs font-sans font-medium cursor-pointer transition-all"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Undo</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Instant Single-Story Regeneration */}
              <div className="bg-[#F3EFE6] border border-[#DFD9CE] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-[#141413]">
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    Instant Single-Story Regeneration
                  </span>
                  <span className="text-[10px] font-mono text-[#4A463F]">
                    ~2 SEC LIVE REWRITE
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#4A463F] mb-1">
                    Select Target Story in Today&apos;s Edition:
                  </label>
                  <select
                    value={selectedStoryId}
                    onChange={(e) => setSelectedStoryId(e.target.value)}
                    className="w-full rounded-lg bg-white border border-[#D5CFC2] px-2.5 py-2 text-xs font-sans text-[#141413] focus:outline-none focus:ring-2 focus:ring-[#141413]/20"
                  >
                    {stories.map((st, idx) => (
                      <option key={st.id} value={st.id}>
                        Slot #{idx + 1} [{st.sectionLabel}]:{" "}
                        {st.headline.slice(0, 52)}...
                      </option>
                    ))}
                  </select>
                </div>

                {regenNotice && (
                  <div className="p-2 bg-white border border-[#DFD9CE] rounded-lg text-[11px] font-sans text-[#141413]">
                    {regenNotice}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRegenerateStory}
                  disabled={isRegenerating}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#141413] hover:bg-[#2C2A26] text-white rounded-lg py-2 px-4 text-xs font-sans font-medium cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isRegenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Regenerating Story Card Live...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Regenerate This Story</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}


          {/* VIEW B: PERSONA BRAIN & CHANGE LOG */}
          {activeView === "brain" && (
            <div className="space-y-5">
              {/* Active Lenses Summary */}
              <div>
                <div className="flex items-center justify-between pb-1 mb-2.5 border-b border-[#DFD9CE] text-[11px] font-mono font-bold uppercase">
                  <span>Active Life Lenses ({profile?.lifeLenses.length || 0})</span>
                  <span>Editorial Profile</span>
                </div>

                <div className="space-y-2.5">
                  {profile?.lifeLenses.map((lens) => (
                    <div
                      key={lens.id}
                      className="p-3 border border-[#DFD9CE] bg-[#F3EFE6] rounded-xl text-xs"
                    >
                      <div className="flex items-center justify-between font-mono font-bold text-[#141413] mb-1">
                        <span>{lens.title}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-[#141413] text-[#FAF7F2] uppercase rounded">
                          {lens.knowledgeBaseline} · {lens.weight}%
                        </span>
                      </div>
                      <p className="text-[#4A463F] text-[11px] italic mb-1.5">
                        {lens.preferredAngle}
                      </p>
                      <div className="w-full h-1.5 bg-[#DFD9CE] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#141413]"
                          style={{ width: `${lens.weight}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Incubator Goal */}
              {profile?.incubatorGoal && (
                <div className="p-3.5 border border-[#DFD9CE] bg-[#F3EFE6] rounded-xl text-xs">
                  <div className="flex items-center justify-between font-mono font-bold uppercase text-[11px] mb-1">
                    <span>INCUBATOR: {profile.incubatorGoal.title}</span>
                    <span>LEVEL {profile.incubatorGoal.masteryLevel}/5</span>
                  </div>
                  <p className="text-[#3d3a35] italic text-xs">
                    {profile.incubatorGoal.objective}
                  </p>
                </div>
              )}

              {/* Historical Change Log */}
              <div>
                <div className="pb-1 mb-2.5 border-b border-[#DFD9CE] text-[11px] font-mono font-bold uppercase flex items-center justify-between">
                  <span>Persona Change Log & Audit Trail</span>
                  <span className="text-[#4A463F]">
                    {profile?.changeLog?.length || 0} Entries
                  </span>
                </div>

                {!profile?.changeLog || profile.changeLog.length === 0 ? (
                  <p className="text-xs italic text-[#4A463F]">
                    No mutations recorded yet. Use inline story calibration or
                    Direct the Editor to shape your newspaper.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {[...profile.changeLog].reverse().map((entry) => (
                      <div
                        key={entry.id}
                        className="p-3 border border-[#DFD9CE] bg-white rounded-xl text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between font-mono text-[10px] text-[#4A463F] uppercase">
                          <span className="font-bold text-[#141413]">
                            [{entry.source.replace("_", " ")}]
                          </span>
                          <span>
                            {new Date(entry.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="font-serif text-[#141413] font-medium leading-snug">
                          {entry.summary}
                        </p>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleUndoChange(entry.id)}
                            className="inline-flex items-center gap-1 border border-[#DCD6C9] bg-white rounded-md px-2 py-0.5 text-[11px] font-sans font-medium hover:bg-[#141413] hover:text-white cursor-pointer transition-colors"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Undo</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="mt-6 pt-3 border-t border-[#DFD9CE] text-[10px] font-mono text-[#4A463F] flex items-center justify-between uppercase">
          <span>SUBH BAKHABAR ADAPTIVE ENGINE</span>
          <span>INDEPENDENT CORROBORATION</span>
        </div>
      </aside>
    </div>
  );
}

