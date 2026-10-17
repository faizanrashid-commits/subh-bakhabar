"use client";

import React, { useState, useEffect } from "react";
import { ArrowUpRight } from "lucide-react";
import type { EditorialCartoon as EditorialCartoonType } from "@/types/subh";

interface EditorialCartoonProps {
  cartoon: EditorialCartoonType;
  leadStoryHeadline?: string;
  onSelectStory?: () => void;
}

/**
 * Museum-grade deterministic SVG editorial lithograph illustration depicting
 * industrial solar panels, high-voltage power grid towers, and tariff balance
 * scales in classic crosshatched 1950s broadsheet ink style.
 */
function EditorialLithographSvg() {
  return (
    <svg
      viewBox="0 0 640 420"
      className="w-full h-auto block bg-[#f7f3e8]"
      role="img"
      aria-label="Crosshatched editorial ink lithograph of solar panels, grid transmission towers, and tariff scales"
    >
      <defs>
        <pattern
          id="litho-hatch-45"
          width="6"
          height="6"
          patternTransform="rotate(45 0 0)"
          patternUnits="userSpaceOnUse"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="6"
            stroke="#111111"
            strokeWidth="0.8"
            strokeOpacity="0.35"
          />
        </pattern>
        <pattern
          id="litho-crosshatch"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 0 0 L 8 8 M 8 0 L 0 8"
            stroke="#111111"
            strokeWidth="0.65"
            strokeOpacity="0.28"
          />
        </pattern>
        <pattern
          id="litho-sky-lines"
          width="10"
          height="4"
          patternUnits="userSpaceOnUse"
        >
          <line
            x1="0"
            y1="2"
            x2="10"
            y2="2"
            stroke="#111111"
            strokeWidth="0.5"
            strokeOpacity="0.18"
          />
        </pattern>
      </defs>

      {/* Outer Double Engraved Plate Frame */}
      <rect
        x="6"
        y="6"
        width="628"
        height="408"
        fill="#f7f3e8"
        stroke="#111111"
        strokeWidth="2.5"
      />
      <rect
        x="12"
        y="12"
        width="616"
        height="396"
        fill="url(#litho-sky-lines)"
        stroke="#111111"
        strokeWidth="1"
      />

      {/* Rising Sun & Engraved Rays (Solar Generation Motif) */}
      <g transform="translate(320, 295)">
        {Array.from({ length: 19 }).map((_, i) => {
          const angle = -180 + i * 10;
          const rad = (angle * Math.PI) / 180;
          const x1 = Math.cos(rad) * 58;
          const y1 = Math.sin(rad) * 58;
          const x2 = Math.cos(rad) * 260;
          const y2 = Math.sin(rad) * 260;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#111111"
              strokeWidth={i % 2 === 0 ? "1.2" : "0.6"}
              strokeDasharray={i % 3 === 0 ? "none" : "6 3"}
              strokeOpacity="0.45"
            />
          );
        })}
        <path
          d="M -54 0 A 54 54 0 0 1 54 0 Z"
          fill="#f7f3e8"
          stroke="#111111"
          strokeWidth="2.2"
        />
        <path
          d="M -44 0 A 44 44 0 0 1 44 0 Z"
          fill="url(#litho-hatch-45)"
          stroke="#111111"
          strokeWidth="1"
        />
      </g>

      {/* Horizon & Crosshatched Earth */}
      <rect
        x="13"
        y="295"
        width="614"
        height="112"
        fill="url(#litho-crosshatch)"
        stroke="#111111"
        strokeWidth="1.8"
      />
      <line
        x1="13"
        y1="295"
        x2="627"
        y2="295"
        stroke="#111111"
        strokeWidth="2.5"
      />

      {/* Left Foreground: High-Voltage Transmission Pylon (National Grid) */}
      <g stroke="#111111" fill="none">
        {/* Main Tower Legs */}
        <path
          d="M 78 295 L 112 92 L 130 92 L 164 295"
          strokeWidth="2.5"
          fill="url(#litho-hatch-45)"
        />
        {/* Cross Bracing */}
        <path
          d="M 84 260 L 158 260 M 92 215 L 150 215 M 100 170 L 142 170 M 106 130 L 136 130"
          strokeWidth="1.6"
        />
        <path
          d="M 84 260 L 150 215 M 158 260 L 92 215 M 92 215 L 142 170 M 150 215 L 100 170 M 100 170 L 136 130 M 142 170 L 106 130"
          strokeWidth="1.1"
        />
        {/* Pylon Cross-Arms */}
        <path d="M 56 132 L 186 132 L 136 116 L 106 116 Z" strokeWidth="1.8" />
        <path d="M 68 172 L 174 172 L 142 158 L 100 158 Z" strokeWidth="1.8" />
        {/* Insulators & Catenary Power Lines */}
        <line x1="62" y1="132" x2="62" y2="145" strokeWidth="2" />
        <line x1="180" y1="132" x2="180" y2="145" strokeWidth="2" />
        <path
          d="M 13 165 Q 38 182 62 145"
          strokeWidth="1.4"
          strokeDasharray="none"
        />
        <path d="M 180 145 Q 250 195 318 118" strokeWidth="1.5" />
      </g>

      {/* Center: Industrial Tariff & Dispatch Balance Scale */}
      <g stroke="#111111">
        {/* Central Pedestal */}
        <rect
          x="306"
          y="255"
          width="28"
          height="40"
          fill="#111111"
        />
        <rect
          x="292"
          y="285"
          width="56"
          height="10"
          fill="#f7f3e8"
          strokeWidth="2"
        />
        <line x1="320" y1="78" x2="320" y2="255" strokeWidth="4" />
        <circle cx="320" cy="78" r="9" fill="#f7f3e8" strokeWidth="2.5" />

        {/* Tilted Balance Beam (Weighing Grid Tariffs vs Rooftop Solar) */}
        <line x1="205" y1="106" x2="435" y2="86" strokeWidth="3.2" />

        {/* Left Scale Pan (Grid Capacity & Tariff Weight) */}
        <line x1="210" y1="106" x2="190" y2="178" strokeWidth="1.4" />
        <line x1="210" y1="106" x2="230" y2="178" strokeWidth="1.4" />
        <path
          d="M 178 178 Q 210 196 242 178 Z"
          fill="#111111"
          strokeWidth="1.8"
        />
        <rect
          x="194"
          y="154"
          width="32"
          height="24"
          fill="#f7f3e8"
          strokeWidth="1.8"
        />
        <text
          x="210"
          y="170"
          textAnchor="middle"
          fontSize="9"
          fontFamily="monospace"
          fontWeight="bold"
          fill="#111111"
        >
          MW
        </text>

        {/* Right Scale Pan (Distributed Solar & Silicon Module) */}
        <line x1="430" y1="86" x2="410" y2="158" strokeWidth="1.4" />
        <line x1="430" y1="86" x2="450" y2="158" strokeWidth="1.4" />
        <path
          d="M 398 158 Q 430 176 462 158 Z"
          fill="#111111"
          strokeWidth="1.8"
        />
        <polygon
          points="408,158 420,136 452,136 440,158"
          fill="#f7f3e8"
          strokeWidth="1.8"
        />
      </g>

      {/* Right Foreground: Industrial Solar Array Banks & Hybrid Inverter */}
      <g stroke="#111111">
        {/* Solar Array Bank 1 */}
        <polygon
          points="420,295 458,218 596,218 558,295"
          fill="#f7f3e8"
          strokeWidth="2.4"
        />
        <polygon
          points="426,290 461,223 590,223 555,290"
          fill="url(#litho-hatch-45)"
          strokeWidth="1.2"
        />
        {/* Solar Grid Cell Divisions */}
        <line x1="442" y1="256" x2="574" y2="256" strokeWidth="1.4" />
        <line x1="478" y1="223" x2="444" y2="290" strokeWidth="1.3" />
        <line x1="515" y1="223" x2="481" y2="290" strokeWidth="1.3" />
        <line x1="552" y1="223" x2="518" y2="290" strokeWidth="1.3" />
        {/* Mounting Struts */}
        <line x1="465" y1="295" x2="465" y2="322" strokeWidth="2.5" />
        <line x1="548" y1="295" x2="548" y2="322" strokeWidth="2.5" />

        {/* Foreground Ground-Racked Solar Bank 2 */}
        <polygon
          points="210,365 236,315 384,315 358,365"
          fill="#f7f3e8"
          strokeWidth="2"
        />
        <line x1="223" y1="340" x2="371" y2="340" strokeWidth="1.2" />
        <line x1="274" y1="315" x2="248" y2="365" strokeWidth="1.2" />
        <line x1="328" y1="315" x2="302" y2="365" strokeWidth="1.2" />
      </g>

      {/* Engraver's Plate Stamp */}
      <g transform="translate(24, 28)">
        <rect
          x="0"
          y="0"
          width="172"
          height="22"
          fill="#f7f3e8"
          stroke="#111111"
          strokeWidth="1.2"
        />
        <text
          x="86"
          y="14"
          textAnchor="middle"
          fontSize="9"
          fontFamily="monospace"
          fontWeight="bold"
          letterSpacing="1.5"
          fill="#111111"
        >
          SUBH LITHOGRAPH PLATE I
        </text>
      </g>
    </svg>
  );
}

export function EditorialCartoon({
  cartoon,
  leadStoryHeadline,
  onSelectStory,
}: EditorialCartoonProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset image load state when cartoon URL changes, with a timeout fallback
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    const timer = setTimeout(() => {
      setImageLoaded((loaded) => {
        if (!loaded) setImageError(true);
        return loaded;
      });
    }, 5000);
    return () => clearTimeout(timer);
  }, [cartoon.imageUrl]);

  const handleSelectStory = () => {
    if (onSelectStory) {
      onSelectStory();
      return;
    }
    if (typeof document !== "undefined") {
      const target =
        document.getElementById("story-lead-1") ||
        (cartoon.relatedStoryId
          ? document.getElementById(cartoon.relatedStoryId)
          : null);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <figure
      aria-label="Daily Editorial Cartoon"
      className="story-card-print w-full flex flex-col bg-[#f4efe4] border border-[#c8c2b6] border-t-[3px] border-t-[#111111] p-3.5 rounded-b-md text-[#111111]"
    >
      {/* Cartoon Kicker */}
      <div className="flex items-center justify-between pb-2 mb-2.5 text-[11px] font-mono uppercase tracking-widest">
        <span className="font-bold text-[#b91c1c]">
          ■ EDITORIAL LITHOGRAPH
        </span>
        <span className="text-[#4a4742] font-semibold">PLATE NO. 1</span>
      </div>

      {/* Lithograph Image Container — always displays museum-grade vector ink engraving as base/fallback */}
      <div
        onClick={handleSelectStory}
        className="relative w-full overflow-hidden border border-[#111111] bg-[#f7f3e8] flex items-center justify-center cursor-pointer"
        title="Click to inspect Lead Story #1"
      >
        {(!imageLoaded || imageError) && <EditorialLithographSvg />}

        {!imageError && cartoon.imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={cartoon.imageUrl}
            alt={cartoon.caption}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={`w-full h-auto block -mb-7 grayscale contrast-125 mix-blend-multiply transition-opacity duration-300 ${
              imageLoaded ? "opacity-100 relative" : "opacity-0 absolute inset-0"
            }`}
            loading="lazy"
          />
        )}
      </div>

      {/* Caption & Story Link */}
      <figcaption className="mt-2.5 pt-2 flex flex-col gap-2">
        <p
          onClick={handleSelectStory}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleSelectStory();
            }
          }}
          className="text-[13px] font-serif italic text-[#111111] leading-snug hover:underline cursor-pointer"
          title="Open Lead Story #1"
        >
          &ldquo;{cartoon.caption}&rdquo;
        </p>

        <div className="flex items-center justify-between gap-2 pt-1 text-[11px] font-sans">
          {leadStoryHeadline && (
            <span
              onClick={handleSelectStory}
              className="truncate text-[#4a4742] font-mono text-[10px] uppercase tracking-wider hover:underline cursor-pointer"
              title={leadStoryHeadline}
            >
              REF: {leadStoryHeadline}
            </span>
          )}
          <button
            type="button"
            onClick={handleSelectStory}
            className="no-print inline-flex items-center gap-1 bg-white/80 hover:bg-[#141413] hover:text-white text-[#141413] border border-[#DCD6C9] rounded-md px-2.5 py-1 text-[11px] font-sans font-medium transition-all shrink-0 cursor-pointer ml-auto"
          >
            Inspect Lead Dispatch <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      </figcaption>
    </figure>
  );
}
