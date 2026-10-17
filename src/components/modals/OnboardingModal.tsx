"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  Layers,
  GraduationCap,
} from "lucide-react";
import type {
  IncubatorCategory,
  IncubatorGoal,
  KnowledgeBaseline,
  LifeLens,
  MasteryLevel,
  UserProfile,
} from "@/types/subh";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose?: () => void;
  initialProfile?: UserProfile | null;
  onProfileSaved?: (updatedProfile: UserProfile) => void;
  asPage?: boolean;
}

const SAMPLE_PERSONA_EXPORT = `ChatGPT Memory Export & Reader Bookmarks:
- Senior Embedded Systems & Firmware Engineer based in Islamabad.
- Works daily with Rust, C++20, ARM Cortex-M, CAN-FD automotive ECUs, and solar hybrid inverter BMS telemetry.
- Actively tracks NEPRA net-metering tariff revisions, distributed LFP battery storage economics, and Pakistan IMF macro-fiscal reforms.
- Recent Bookmarks:
  1. https://www.dawn.com/news/nepra-solar-prosumer-tariff-review
  2. https://arstechnica.com/information-technology/rust-in-automotive-safety-critical-kernels/
  3. https://cleantechnica.com/grid-scale-lfp-inverter-dispatch-economics/
- Learning Goal: Preparing for CSS Current Affairs & Public Policy while learning technical German for Berlin/Munich engineering collaboration.`;

const INCUBATOR_PRESETS: Array<{
  id: string;
  label: string;
  goal: IncubatorGoal;
}> = [
  {
    id: "css_policy",
    label: "CSS Current Affairs & Policy",
    goal: {
      title: "CSS Current Affairs & Policy",
      category: "exam_prep",
      masteryLevel: 3,
      objective:
        "Synthesize daily domestic and geopolitical developments into structured 4-part examiner dossiers (Historical Background, Core Bottleneck, Constitutional/Policy Angle, Actionable Way Forward).",
      progressionNotes: [
        "Anchor every policy argument in constitutional mandates (18th Amendment, CCI, NFC Award) and empirical data.",
        "Contrast Pakistani press framing (Dawn) with international financial wires (Reuters/FT).",
        "Practice answering one past-paper-style examiner prompt in every morning issue.",
      ],
    },
  },
  {
    id: "f1_scratch",
    label: "Formula 1 from Scratch",
    goal: {
      title: "Formula 1 from Scratch",
      category: "new_domain",
      masteryLevel: 1,
      objective:
        "Master Formula 1 race strategy, ground-effect aerodynamics, and 2026 hybrid MGU-K regulations using intuitive analogies and telemetry breakdowns.",
      progressionNotes: [
        "Level 1: Tire compounds (C1–C5), pit-stop undercut vs. overcut windows, and DRS zones.",
        "Level 2: Ground-effect venturi tunnels, porpoising physics, and dirty-air wake turbulence.",
        "Level 3: FIA 2026 active aerodynamics (X-Mode/Z-Mode) and 50/50 electric-ICE power split.",
      ],
    },
  },
  {
    id: "german_tech",
    label: "German via Tech News",
    goal: {
      title: "German via Tech News",
      category: "language",
      masteryLevel: 2,
      objective:
        "Build B1->B2 German reading fluency through daily bilingual passages on automotive engineering, semiconductors, and industrial energy policy.",
      progressionNotes: [
        "Decode German compound nouns in embedded engineering and grid infrastructure.",
        "Read parallel German-English dispatches with contextual vocabulary glossaries.",
        "Master 5 high-frequency technical & policy idioms each week.",
      ],
    },
  },
];

export function OnboardingModal({
  isOpen,
  onClose,
  initialProfile,
  onProfileSaved,
  asPage = false,
}: OnboardingModalProps) {
  const [activeTab, setActiveTab] = useState<"persona" | "incubator">("persona");
  const [rawInput, setRawInput] = useState<string>(SAMPLE_PERSONA_EXPORT);
  const [readerName, setReaderName] = useState<string>(
    initialProfile?.name || "Ahsan R."
  );
  const [lifeLenses, setLifeLenses] = useState<LifeLens[]>(
    initialProfile?.lifeLenses || []
  );
  const [incubatorGoal, setIncubatorGoal] = useState<IncubatorGoal>(
    initialProfile?.incubatorGoal || INCUBATOR_PRESETS[0].goal
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>("css_policy");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialProfile) {
      setReaderName(initialProfile.name);
      setLifeLenses(structuredClone(initialProfile.lifeLenses));
      setIncubatorGoal(structuredClone(initialProfile.incubatorGoal));
    } else if (isOpen) {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.profile) {
            setReaderName(data.profile.name);
            setLifeLenses(data.profile.lifeLenses);
            setIncubatorGoal(data.profile.incubatorGoal);
          }
        })
        .catch(() => undefined);
    }
  }, [initialProfile, isOpen]);

  if (!isOpen && !asPage) return null;

  const handleAnalyzePersona = async () => {
    if (!rawInput.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setStatusMessage(
      "Analyzing your bio/bookmarks with Gemini Flash Lite Mind-Reader..."
    );
    try {
      const res = await fetch("/api/onboarding/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.extractedName) setReaderName(data.extractedName);
        if (Array.isArray(data.lifeLenses)) setLifeLenses(data.lifeLenses);
        if (data.incubatorGoal) setIncubatorGoal(data.incubatorGoal);
        setStatusMessage(
          data.summary ||
            "Mind-Reader extraction complete. Review or fine-tune your Life Lenses below."
        );
      } else {
        setStatusMessage(`Notice: ${data.error || "Could not parse input."}`);
      }
    } catch {
      setStatusMessage("Network error while analyzing persona.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLensChange = (
    index: number,
    patch: Partial<LifeLens>
  ) => {
    setLifeLenses((prev) =>
      prev.map((l, idx) => (idx === index ? { ...l, ...patch } : l))
    );
  };

  const handleAddLens = () => {
    const newLens: LifeLens = {
      id: `lens-custom-${Date.now().toString(36)}`,
      title: "New Custom Life Lens",
      description: "Describe how this domain intersects with your work or life.",
      keywords: ["policy", "technology", "markets"],
      weight: 75,
      knowledgeBaseline: "intermediate",
      preferredAngle:
        "Focus on primary sources, concrete numbers, and structural impact.",
    };
    setLifeLenses((prev) => [...prev, newLens]);
  };

  const handleRemoveLens = (index: number) => {
    if (lifeLenses.length <= 1) return;
    setLifeLenses((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = INCUBATOR_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setIncubatorGoal(structuredClone(preset.goal));
    } else if (presetId === "custom") {
      setIncubatorGoal((prev) => ({
        ...prev,
        title: prev.title || "Custom Mastery Track",
        category: "new_domain",
      }));
    }
  };

  const handleSaveProfileAndGenerate = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setStatusMessage(
      "Saving Editorial Profile & synthesizing a fresh 8-story edition for your new lenses..."
    );
    try {
      const profileRes = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: readerName,
          lifeLenses,
          incubatorGoal,
          source: "chief_editor",
          summary: `Updated Onboarding Persona (${lifeLenses.length} Life Lenses · Incubator: ${incubatorGoal.title})`,
        }),
      });
      const profileData = await profileRes.json();

      if (!profileData.success) {
        setStatusMessage(
          `Error saving profile: ${profileData.error || "Unknown error"}`
        );
        setIsSaving(false);
        return;
      }

      // Trigger fresh edition generation with the new lenses
      const genRes = await fetch("/api/edition/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceLive: false }),
      });
      await genRes.json();

      setStatusMessage(
        "Editorial Profile saved & fresh edition generated! Updating broadsheet..."
      );
      if (onProfileSaved && profileData.profile) {
        onProfileSaved(profileData.profile);
      }
      setTimeout(() => {
        onClose?.();
      }, 450);
    } catch {
      setStatusMessage("Network error while saving profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const content = (
    <div
      className={`${
        asPage
          ? "w-full bg-[#f9f6ef] text-[#111111] border-2 border-[#111111] p-6 sm:p-8 font-serif"
          : "relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#f9f6ef] text-[#111111] border-2 border-[#111111] p-6 sm:p-8 font-serif shadow-2xl"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Modal Header */}
      <div className="flex items-start justify-between gap-4 pb-4 mb-5 border-b-2 border-[#111111]">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#4a4742] mb-1">
            AI EDITORIAL AGENT · LIVE PERSONA ENGINE
          </div>
          <h2
            className="text-2xl sm:text-3xl font-bold text-[#111111]"
            style={{
              fontFamily: "var(--font-playfair), 'Times New Roman', serif",
            }}
          >
            Personalize Your Morning Broadsheet
          </h2>
        </div>

        {!asPage && (
          <button
            onClick={onClose}
            className="border border-[#111111] px-2.5 py-1 text-xs font-mono uppercase hover:bg-[#111111] hover:text-[#f9f6ef] transition-colors cursor-pointer flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        )}
      </div>

      {/* Step / Tab Switcher */}
      <div className="grid grid-cols-1 sm:grid-cols-2 border border-[#111111] mb-6 font-mono text-xs uppercase tracking-wider">
        <button
          onClick={() => setActiveTab("persona")}
          className={`py-2.5 px-4 text-left flex items-center justify-between cursor-pointer transition-colors ${
            activeTab === "persona"
              ? "bg-[#111111] text-[#f9f6ef] font-bold"
              : "bg-transparent text-[#111111] hover:bg-[#efeae0]"
          }`}
        >
          <span className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Tab A: Persona Import (Who You Are)</span>
          </span>
          <span>{lifeLenses.length} Lenses</span>
        </button>

        <button
          onClick={() => setActiveTab("incubator")}
          className={`py-2.5 px-4 text-left flex items-center justify-between cursor-pointer border-t sm:border-t-0 sm:border-l border-[#111111] transition-colors ${
            activeTab === "incubator"
              ? "bg-[#111111] text-[#f9f6ef] font-bold"
              : "bg-transparent text-[#111111] hover:bg-[#efeae0]"
          }`}
        >
          <span className="flex items-center gap-2">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Tab B: Interest Incubator (Who You Want to Become)</span>
          </span>
          <span>Lv. {incubatorGoal.masteryLevel}/5</span>
        </button>
      </div>

      {/* Status Notice */}
      {statusMessage && (
        <div className="mb-5 p-3 bg-[#efeae0] border-l-4 border-[#111111] text-xs font-mono text-[#111111]">
          ■ {statusMessage}
        </div>
      )}

      {/* TAB A: PERSONA IMPORT */}
      {activeTab === "persona" && (
        <div className="space-y-6">
          <div className="bg-[#efeae0]/60 border border-[#c8c2b6] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#111111]">
                Paste Raw ChatGPT Memory Export / Bio OR 3–5 Recent Article URLs / Snippets
              </label>
              <button
                type="button"
                onClick={() => setRawInput(SAMPLE_PERSONA_EXPORT)}
                className="text-[10px] font-mono uppercase underline text-[#4a4742] hover:text-[#111111] cursor-pointer"
              >
                [ Reset Sample Bio & Bookmarks ]
              </button>
            </div>

            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              rows={5}
              placeholder="Paste your ChatGPT Memory export, professional bio, or 3-5 article URLs..."
              className="w-full p-3 bg-[#f9f6ef] border border-[#111111] text-xs font-mono text-[#111111] focus:outline-none"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="uppercase text-[#4a4742]">Reader Name:</span>
                <input
                  type="text"
                  value={readerName}
                  onChange={(e) => setReaderName(e.target.value)}
                  className="border border-[#111111] bg-[#f9f6ef] px-2.5 py-1 text-xs font-mono text-[#111111]"
                />
              </div>

              <button
                type="button"
                onClick={handleAnalyzePersona}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-1.5 border border-[#111111] bg-[#111111] text-[#f9f6ef] hover:bg-transparent hover:text-[#111111] px-4 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-60"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Persona...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Analyze My Persona</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Editable Life Lenses */}
          <div>
            <div className="flex items-center justify-between mb-3 pb-1.5 border-b border-[#111111]">
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#111111]">
                Editable Life Lenses ({lifeLenses.length}) — Calibrate Weights & Knowledge Baselines
              </h3>
              <button
                type="button"
                onClick={handleAddLens}
                className="inline-flex items-center gap-1 border border-[#111111] px-2.5 py-1 text-[11px] font-mono uppercase hover:bg-[#111111] hover:text-[#f9f6ef] transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Lens</span>
              </button>
            </div>

            <div className="space-y-4">
              {lifeLenses.map((lens, idx) => (
                <div
                  key={lens.id}
                  className="p-4 border border-[#111111] bg-[#f9f6ef] space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#111111] text-[#f9f6ef]">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={lens.title}
                        onChange={(e) =>
                          handleLensChange(idx, { title: e.target.value })
                        }
                        className="flex-1 border-b border-[#111111] bg-transparent font-bold text-sm text-[#111111] focus:outline-none py-0.5"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Knowledge Baseline Selector */}
                      <div className="flex items-center border border-[#111111] text-[10px] font-mono uppercase">
                        {(
                          ["beginner", "intermediate", "expert"] as KnowledgeBaseline[]
                        ).map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() =>
                              handleLensChange(idx, { knowledgeBaseline: level })
                            }
                            className={`px-2 py-1 cursor-pointer transition-colors ${
                              lens.knowledgeBaseline === level
                                ? "bg-[#111111] text-[#f9f6ef] font-bold"
                                : "bg-transparent text-[#111111] hover:bg-[#efeae0]"
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>

                      {lifeLenses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLens(idx)}
                          className="text-[#4a4742] hover:text-[#111111] p-1 cursor-pointer"
                          title="Remove Lens"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#4a4742] mb-0.5">
                      Lens Scope & Context
                    </label>
                    <input
                      type="text"
                      value={lens.description}
                      onChange={(e) =>
                        handleLensChange(idx, { description: e.target.value })
                      }
                      className="w-full border border-[#c8c2b6] bg-white/70 px-2.5 py-1.5 text-xs text-[#111111]"
                    />
                  </div>

                  {/* Preferred Angle & Weight Slider */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-8">
                      <label className="block text-[10px] font-mono uppercase text-[#4a4742] mb-0.5">
                        Preferred Editorial Angle
                      </label>
                      <input
                        type="text"
                        value={lens.preferredAngle}
                        onChange={(e) =>
                          handleLensChange(idx, {
                            preferredAngle: e.target.value,
                          })
                        }
                        className="w-full border border-[#c8c2b6] bg-white/70 px-2.5 py-1.5 text-xs italic text-[#111111]"
                      />
                    </div>

                    <div className="md:col-span-4">
                      <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                        <span className="uppercase text-[#4a4742]">
                          Priority Weight:
                        </span>
                        <span className="font-bold text-[#111111]">
                          {lens.weight} / 100
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={lens.weight}
                        onChange={(e) =>
                          handleLensChange(idx, {
                            weight: Number(e.target.value),
                          })
                        }
                        className="w-full accent-[#111111] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB B: INTEREST INCUBATOR */}
      {activeTab === "incubator" && (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#111111] mb-2">
              Select Active Incubator Preset or Configure Custom Goal
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 font-mono text-xs">
              {INCUBATOR_PRESETS.map((preset) => {
                const isSelected =
                  selectedPresetId === preset.id ||
                  incubatorGoal.title === preset.goal.title;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset.id)}
                    className={`p-3 border border-[#111111] text-left cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[#111111] text-[#f9f6ef] font-bold"
                        : "bg-transparent text-[#111111] hover:bg-[#efeae0]"
                    }`}
                  >
                    <div className="text-[10px] opacity-75 uppercase mb-0.5">
                      {preset.goal.category.replace("_", " ")}
                    </div>
                    <div>{preset.label}</div>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => handlePresetSelect("custom")}
                className={`p-3 border border-[#111111] text-left cursor-pointer transition-colors ${
                  selectedPresetId === "custom"
                    ? "bg-[#111111] text-[#f9f6ef] font-bold"
                    : "bg-transparent text-[#111111] hover:bg-[#efeae0]"
                }`}
              >
                <div className="text-[10px] opacity-75 uppercase mb-0.5">
                  CUSTOM SYLLABUS
                </div>
                <div>Custom Goal Input</div>
              </button>
            </div>
          </div>

          <div className="p-5 border-2 border-[#111111] bg-[#efeae0]/50 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-8">
                <label className="block text-[10px] font-mono uppercase text-[#4a4742] mb-1">
                  Active Incubator Goal Title
                </label>
                <input
                  type="text"
                  value={incubatorGoal.title}
                  onChange={(e) =>
                    setIncubatorGoal((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  className="w-full border border-[#111111] bg-[#f9f6ef] px-3 py-2 text-sm font-bold text-[#111111]"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-[10px] font-mono uppercase text-[#4a4742] mb-1">
                  Module Format Category
                </label>
                <select
                  value={incubatorGoal.category}
                  onChange={(e) =>
                    setIncubatorGoal((prev) => ({
                      ...prev,
                      category: e.target.value as IncubatorCategory,
                    }))
                  }
                  className="w-full border border-[#111111] bg-[#f9f6ef] px-3 py-2 text-xs font-mono uppercase text-[#111111]"
                >
                  <option value="exam_prep">CSS / Policy Brief (4-Part)</option>
                  <option value="new_domain">Domain Primer & Analogy</option>
                  <option value="language">Bilingual Reading & Lexicon</option>
                </select>
              </div>
            </div>

            {/* Mastery Level 1 to 5 */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="uppercase font-bold text-[#111111]">
                  Current Mastery Level (1 = Novice · 5 = Mastery)
                </span>
                <span className="font-bold">
                  LEVEL {incubatorGoal.masteryLevel} OF 5
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2 font-mono text-xs">
                {([1, 2, 3, 4, 5] as MasteryLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() =>
                      setIncubatorGoal((prev) => ({
                        ...prev,
                        masteryLevel: lvl,
                      }))
                    }
                    className={`py-2 border border-[#111111] cursor-pointer transition-colors ${
                      incubatorGoal.masteryLevel === lvl
                        ? "bg-[#111111] text-[#f9f6ef] font-bold"
                        : "bg-[#f9f6ef] text-[#111111] hover:bg-[#efeae0]"
                    }`}
                  >
                    Level {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Progression Objective */}
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#4a4742] mb-1">
                Progression Objective & Editorial Instructions
              </label>
              <textarea
                rows={3}
                value={incubatorGoal.objective}
                onChange={(e) =>
                  setIncubatorGoal((prev) => ({
                    ...prev,
                    objective: e.target.value,
                  }))
                }
                className="w-full border border-[#111111] bg-[#f9f6ef] p-3 text-xs text-[#111111]"
              />
            </div>

            {/* Progression Syllabus Notes */}
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#4a4742] mb-1">
                Active Progression Checkpoints
              </label>
              <div className="space-y-1.5">
                {incubatorGoal.progressionNotes.map((note, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={note}
                    onChange={(e) => {
                      const nextNotes = [...incubatorGoal.progressionNotes];
                      nextNotes[idx] = e.target.value;
                      setIncubatorGoal((prev) => ({
                        ...prev,
                        progressionNotes: nextNotes,
                      }));
                    }}
                    className="w-full border border-[#c8c2b6] bg-[#f9f6ef] px-2.5 py-1.5 text-xs text-[#111111]"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Footer */}
      <div className="mt-6 pt-4 border-t-2 border-[#111111] flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-mono text-[#4a4742]">
          Saving updates <code className="text-[#111111]">/api/profile</code> and
          regenerates your 8-story morning edition.
        </div>

        <div className="flex items-center gap-2">
          {!asPage && (
            <button
              type="button"
              onClick={onClose}
              className="border border-[#111111] px-4 py-2 text-xs font-mono uppercase hover:bg-[#efeae0] cursor-pointer"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveProfileAndGenerate}
            disabled={isSaving}
            className="inline-flex items-center gap-2 border border-[#111111] bg-[#111111] text-[#f9f6ef] hover:bg-transparent hover:text-[#111111] px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving & Generating Edition...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Save Editorial Profile</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (asPage) {
    return content;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] p-4 no-print"
      onClick={onClose}
    >
      {content}
    </div>
  );
}
