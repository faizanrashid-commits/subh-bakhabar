"use client";

import React, { useState, useEffect, useRef } from "react";

interface AudioBriefBarProps {
  script: string;
  editionNumber: number;
}

export function AudioBriefBar({ script, editionNumber }: AudioBriefBarProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const checkVoiceSupport = () => {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  };

  const startPlayback = (rateOverride?: number) => {
    if (!checkVoiceSupport() || typeof window === "undefined") return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(script);
    utterance.rate = rateOverride ?? playbackSpeed;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Natural") ||
            v.name.includes("News") ||
            v.name.includes("Google") ||
            v.name.includes("Daniel") ||
            v.name.includes("Serena"))
      ) || voices.find((v) => v.lang.startsWith("en"));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      setIsPlaying(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (!checkVoiceSupport() || typeof window === "undefined") return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      startPlayback();
    }
  };

  const cycleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx] ?? 1.0;
    setPlaybackSpeed(nextSpeed);

    if (isPlaying) {
      startPlayback(nextSpeed);
    }
  };

  return (
    <aside
      aria-label="Morning Wire Audio Dispatch"
      className="no-print bg-[#efeae0] border-b border-[#111111] py-1.5 px-4 text-xs font-mono uppercase tracking-widest flex flex-wrap items-center justify-between gap-3 text-[#111111]"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-bold shrink-0">
          MORNING WIRE · ISSUE #{editionNumber}
        </span>
        <span className="text-[#4a4742] hidden sm:inline">—</span>
        <span className="text-[#4a4742] truncate hidden md:inline text-[11px] normal-case font-serif italic tracking-normal">
          {script}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {isPlaying && (
          <button
            onClick={cycleSpeed}
            className="border border-[#111111] bg-transparent hover:bg-[#111111] hover:text-[#f9f6ef] px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider cursor-pointer transition-colors rounded-none"
            title="Toggle narration speed"
          >
            {playbackSpeed}X
          </button>
        )}

        <button
          onClick={togglePlay}
          className="bg-[#111111] text-[#f9f6ef] hover:bg-[#4a4742] px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-widest cursor-pointer transition-colors rounded-none"
          title={isPlaying ? "Stop Morning Wire" : "Play 90s Morning Wire"}
        >
          {isPlaying
            ? "[ ■ STOP MORNING WIRE ]"
            : "[ ▶ PLAY 90s MORNING WIRE ]"}
        </button>
      </div>
    </aside>
  );
}
