"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

interface AudioBriefBarProps {
  script: string;
  editionNumber: number;
}

type PlaybackState = "stopped" | "playing" | "paused";

const SPEEDS = [1.0, 1.25, 1.5] as const;

export function AudioBriefBar({ script, editionNumber }: AudioBriefBarProps) {
  const [playbackState, setPlaybackState] = useState<PlaybackState>("stopped");
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const charIndexRef = useRef<number>(0);
  const baseOffsetRef = useRef<number>(0);

  const checkVoiceSupport = () => {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  };

  const detachUtteranceListeners = () => {
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current.onboundary = null;
      utteranceRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      detachUtteranceListeners();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Reset if script changes (e.g. switching editions)
  useEffect(() => {
    detachUtteranceListeners();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    charIndexRef.current = 0;
    baseOffsetRef.current = 0;
    setPlaybackState("stopped");
  }, [script]);

  const speakFromOffset = useCallback(
    (offset: number, rate: number) => {
      if (!checkVoiceSupport() || typeof window === "undefined") return;

      detachUtteranceListeners();
      window.speechSynthesis.cancel();

      const safeOffset =
        offset >= 0 && offset < script.length ? offset : 0;
      const textSlice = script.slice(safeOffset).trim() || script;
      const actualBase = textSlice === script ? 0 : safeOffset;

      baseOffsetRef.current = actualBase;
      charIndexRef.current = actualBase;

      const utterance = new SpeechSynthesisUtterance(textSlice);
      utterance.rate = rate;
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

      utterance.onboundary = (event: SpeechSynthesisEvent) => {
        if (utteranceRef.current !== utterance) return;
        if (typeof event.charIndex === "number") {
          charIndexRef.current = baseOffsetRef.current + event.charIndex;
        }
      };

      utterance.onend = () => {
        if (utteranceRef.current !== utterance) return;
        utteranceRef.current = null;
        charIndexRef.current = 0;
        baseOffsetRef.current = 0;
        setPlaybackState("stopped");
      };

      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        if (utteranceRef.current !== utterance) return;
        if (event.error === "canceled" || event.error === "interrupted") {
          return;
        }
        utteranceRef.current = null;
        charIndexRef.current = 0;
        baseOffsetRef.current = 0;
        setPlaybackState("stopped");
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setPlaybackState("playing");
    },
    [script]
  );

  const handlePlayPause = () => {
    if (!checkVoiceSupport() || typeof window === "undefined") return;

    const synth = window.speechSynthesis;

    if (playbackState === "playing") {
      if (synth.speaking && !synth.paused) {
        synth.pause();
        setPlaybackState("paused");
      } else {
        // Browser speech synthesis ended silently or desynced; restart cleanly
        speakFromOffset(0, playbackSpeed);
      }
    } else if (playbackState === "paused") {
      if (synth.paused || synth.speaking) {
        synth.resume();
        setPlaybackState("playing");
      } else {
        // Browser cleared paused utterance; resume from saved offset
        speakFromOffset(charIndexRef.current, playbackSpeed);
      }
    } else {
      speakFromOffset(0, playbackSpeed);
    }
  };

  const handleStop = () => {
    if (!checkVoiceSupport() || typeof window === "undefined") return;
    detachUtteranceListeners();
    window.speechSynthesis.cancel();
    charIndexRef.current = 0;
    baseOffsetRef.current = 0;
    setPlaybackState("stopped");
  };

  const cycleSpeed = () => {
    const currentIdx = SPEEDS.indexOf(
      playbackSpeed as (typeof SPEEDS)[number]
    );
    const nextSpeed = SPEEDS[(currentIdx + 1) % SPEEDS.length] ?? 1.0;
    setPlaybackSpeed(nextSpeed);

    if (playbackState === "playing" || playbackState === "paused") {
      speakFromOffset(charIndexRef.current, nextSpeed);
    }
  };

  const formatSpeedLabel = (speed: number) => {
    if (speed === 1.25) return "[ 1.25x ]";
    return `[ ${speed.toFixed(1)}x ]`;
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
        <button
          type="button"
          onClick={cycleSpeed}
          className="border border-[#111111] bg-transparent hover:bg-[#111111] hover:text-[#f9f6ef] px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider cursor-pointer transition-colors rounded-none"
          title="Cycle narration speed (1.0x → 1.25x → 1.5x)"
        >
          {formatSpeedLabel(playbackSpeed)}
        </button>

        <button
          type="button"
          onClick={handlePlayPause}
          className="bg-[#111111] text-[#f9f6ef] hover:bg-[#4a4742] px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-widest cursor-pointer transition-colors rounded-none"
          title={
            playbackState === "playing"
              ? "Pause Morning Wire"
              : playbackState === "paused"
              ? "Resume Morning Wire"
              : "Play 90s Morning Wire"
          }
        >
          {playbackState === "playing"
            ? "[ ❚❚ PAUSE MORNING WIRE ]"
            : playbackState === "paused"
            ? "[ ▶ RESUME MORNING WIRE ]"
            : "[ ▶ PLAY 90s MORNING WIRE ]"}
        </button>

        {playbackState !== "stopped" && (
          <button
            type="button"
            onClick={handleStop}
            className="border border-[#111111] bg-transparent hover:bg-[#991b1b] hover:text-[#f9f6ef] hover:border-[#991b1b] px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-colors rounded-none"
            title="Stop and reset Morning Wire"
          >
            [ ■ STOP ]
          </button>
        )}
      </div>
    </aside>
  );
}
