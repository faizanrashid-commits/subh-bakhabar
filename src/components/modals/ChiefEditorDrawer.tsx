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
          `✓ Regenerated "${data.story.headline.slice(0, 48)}..." live in today's broadsheet!`
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
        className="relative w-full max-w-xl h-full overflow-y-auto bg-[#f9f6ef] text-[#111111] border-l-2 border-[#111111] p-6 font-serif shadow-2xl flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
        aria-label="Chief Editor's Desk Drawer"
      >
        <div>
          {/* Drawer Header */}
          <div className="flex items-start justify-between gap-3 pb-3 mb-4 border-b-2 border-[#111111]">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#4a4742]">
                STAGE 5 · ADAPTIVE EDITORIAL LOOP
              </div>
              <h2
                className="text-2xl font-bold text-[#111111]"
                style={{
                  fontFamily: "var(--font-playfair), 'Times New Roman', serif",
                }}
              >
                Chief Editor&apos;s Desk
              </h2>
            </div>

            <button
              onClick={onClose}
              className="border border-[#111111] px-2.5 py-1 text-xs font-mono uppercase hover:bg-[#111111] hover:text-[#f9f6ef] transition-colors cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
          </div>

          {/* Two Views Switcher */}
          <div className="grid grid-cols-2 border border-[#111111] mb-5 font-mono text-[11px] uppercase tracking-wider">
            <button
              onClick={() => setActiveView("command")}
              className={`py-2 px-3 flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                activeView === "command"
                  ? "bg-[#111111] text-[#f9f6ef] font-bold"
                  : "bg-transparent text-[#111111] hover:bg-[#efeae0]"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>View A: Direct the Editor</span>
            </button>

            <button
              onClick={() => setActiveView("brain")}
              className={`py-2 px-3 flex items-center justify-center gap-1.5 border-l border-[#111111] cursor-pointer transition-colors ${
                activeView === "brain"
                  ? "bg-[#111111] text-[#f9f6ef] font-bold"
                  : "bg-transparent text-[#111111] hover:bg-[#efeae0]"
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>
                View B: Persona Brain ({profile?.changeLog?.length || 0})
              </span>
            </button>
          </div>

          {/* VIEW A: DIRECT THE EDITOR (CONVERSATIONAL COMMAND BAR) */}
          {activeView === "command" && (
            <div className="space-y-5">
              {/* Highlighted Red-Pencil Quote Banner (if present) */}
              {highlightedQuote && (
                <div className="p-3 bg-[#efeae0] border-l-4 border-[#991b1b] text-xs">
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase font-bold text-[#991b1b] mb-1">
                    <span>✎ RED-PENCIL HIGHLIGHTED QUOTE</span>
                    <button
                      type="button"
                      onClick={() => setHighlightedQuote("")}
                      className="underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <p className="italic text-[#111111] line-clamp-3">
                    &ldquo;{highlightedQuote}&rdquo;
                  </p>
                </div>
              )}

              {/* Quick Sample Directives */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#4a4742] mb-1.5">
                  Sample Directives (Click to Populate):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_DIRECTIVES.map((sample, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setCommandInput(sample);
                        handleSendCommand(sample);
                      }}
                      className="text-[11px] font-mono border border-[#c8c2b6] hover:border-[#111111] bg-[#efeae0]/60 px-2 py-1 text-left cursor-pointer transition-colors"
                    >
                      &ldquo;{sample}&rdquo;
                    </button>
                  ))}
                </div>
              </div>

              {/* Conversational Command Input */}
              <div className="border-2 border-[#111111] bg-[#f9f6ef] p-3">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#111111] mb-1.5">
                  Talk Directly to the Editor-in-Chief
                </label>
                <textarea
                  rows={3}
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="e.g., I'm starting CSS prep, add foreign policy analysis..."
                  className="w-full bg-white/80 border border-[#c8c2b6] p-2.5 text-xs font-mono text-[#111111] focus:outline-none"
                />
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-[#4a4742]">
                    Validated via Gemini Flash Lite Schema
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSendCommand()}
                    disabled={isSendingCommand || !commandInput.trim()}
                    className="inline-flex items-center gap-1.5 border border-[#111111] bg-[#111111] text-[#f9f6ef] hover:bg-transparent hover:text-[#111111] px-4 py-1.5 text-xs font-mono uppercase tracking-wider cursor-pointer transition-colors disabled:opacity-50"
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

              {/* Proposed Schema-Validated Diff: Previous State -> New State */}
              {editorReply && (
                <div className="border-2 border-[#111111] bg-[#efeae0]/70 p-4 space-y-3">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#111111]">
                    ■ CHIEF EDITOR RESPONSE & SCHEMA PATCH
                  </div>
                  <p className="text-xs italic text-[#111111] leading-relaxed">
                    {editorReply}
                  </p>

                  {proposedChanges.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[#c8c2b6]">
                      <div className="text-[10px] font-mono uppercase font-bold text-[#4a4742]">
                        Proposed Profile Diff (Previous State → New State):
                      </div>
                      {proposedChanges.map((chg, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-[#f9f6ef] border border-[#111111] text-xs font-mono space-y-1"
                        >
                          <div className="font-bold text-[#111111] uppercase">
                            {chg.field}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-[11px]">
                            <span className="line-through text-[#4a4742] bg-[#efeae0] px-1.5 py-0.5">
                              {chg.previousValue}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 hidden sm:inline text-[#111111] shrink-0" />
                            <span className="font-bold text-[#111111] bg-[#e5dec9] px-1.5 py-0.5">
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
                            className="inline-flex items-center gap-1.5 border border-[#111111] bg-[#111111] text-[#f9f6ef] hover:bg-transparent hover:text-[#111111] px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Apply Change</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-emerald-900 bg-emerald-100 border border-emerald-800 px-2.5 py-1">
                            ✓ Applied to Persona Brain (v{profile?.version})
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleUndoChange()}
                          className="inline-flex items-center gap-1.5 border border-[#111111] bg-transparent text-[#111111] hover:bg-[#111111] hover:text-[#f9f6ef] px-3 py-1.5 text-xs font-mono uppercase tracking-wider cursor-pointer transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Undo</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Action: Live Single-Story Regeneration */}
              <div className="border-2 border-[#111111] p-4 bg-[#f9f6ef] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#111111]">
                    ⚡ Quick Action: Instant Single-Story Regeneration
                  </span>
                  <span className="text-[10px] font-mono text-[#4a4742]">
                    ~2 SEC LIVE REWRITE
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#4a4742] mb-1">
                    Select Target Story in Today&apos;s Edition:
                  </label>
                  <select
                    value={selectedStoryId}
                    onChange={(e) => setSelectedStoryId(e.target.value)}
                    className="w-full border border-[#111111] bg-white px-2.5 py-1.5 text-xs font-mono text-[#111111]"
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
                  <div className="p-2 bg-[#efeae0] border border-[#111111] text-[11px] font-mono text-[#111111]">
                    {regenNotice}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRegenerateStory}
                  disabled={isRegenerating}
                  className="w-full inline-flex items-center justify-center gap-2 border border-[#111111] bg-[#111111] text-[#f9f6ef] hover:bg-transparent hover:text-[#111111] py-2 px-4 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer transition-colors disabled:opacity-50"
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
                <div className="flex items-center justify-between pb-1 mb-2.5 border-b border-[#111111] text-[11px] font-mono font-bold uppercase">
                  <span>Active Life Lenses ({profile?.lifeLenses.length || 0})</span>
                  <span>Profile v{profile?.version || 1}</span>
                </div>

                <div className="space-y-2.5">
                  {profile?.lifeLenses.map((lens) => (
                    <div
                      key={lens.id}
                      className="p-3 border border-[#111111] bg-[#efeae0]/40 text-xs"
                    >
                      <div className="flex items-center justify-between font-mono font-bold text-[#111111] mb-1">
                        <span>{lens.title}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-[#111111] text-[#f9f6ef] uppercase">
                          {lens.knowledgeBaseline} · {lens.weight}%
                        </span>
                      </div>
                      <p className="text-[#4a4742] text-[11px] italic mb-1.5">
                        {lens.preferredAngle}
                      </p>
                      <div className="w-full h-1.5 bg-[#c8c2b6]">
                        <div
                          className="h-full bg-[#111111]"
                          style={{ width: `${lens.weight}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Incubator Goal */}
              {profile?.incubatorGoal && (
                <div className="p-3.5 border-2 border-[#111111] bg-[#efeae0]/70 text-xs">
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
                <div className="pb-1 mb-2.5 border-b border-[#111111] text-[11px] font-mono font-bold uppercase flex items-center justify-between">
                  <span>Persona Change Log & Audit Trail</span>
                  <span className="text-[#4a4742]">
                    {profile?.changeLog?.length || 0} Entries
                  </span>
                </div>

                {!profile?.changeLog || profile.changeLog.length === 0 ? (
                  <p className="text-xs italic text-[#4a4742]">
                    No mutations recorded yet. Use inline story calibration or
                    Direct the Editor to shape your newspaper.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {[...profile.changeLog].reverse().map((entry) => (
                      <div
                        key={entry.id}
                        className="p-3 border border-[#c8c2b6] bg-white/80 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between font-mono text-[10px] text-[#4a4742] uppercase">
                          <span className="font-bold text-[#111111]">
                            [{entry.source.replace("_", " ")}]
                          </span>
                          <span>
                            {new Date(entry.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="font-serif text-[#111111] font-medium leading-snug">
                          {entry.summary}
                        </p>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleUndoChange(entry.id)}
                            className="inline-flex items-center gap-1 border border-[#111111] px-2 py-0.5 text-[10px] font-mono uppercase hover:bg-[#111111] hover:text-[#f9f6ef] cursor-pointer transition-colors"
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
        <div className="mt-6 pt-3 border-t border-[#c8c2b6] text-[10px] font-mono text-[#4a4742] flex items-center justify-between uppercase">
          <span>SUBH BAKHABAR ADAPTIVE ENGINE</span>
          <span>SCHEMA V1 · ZERO HALLUCINATIONS</span>
        </div>
      </aside>
    </div>
  );
}

