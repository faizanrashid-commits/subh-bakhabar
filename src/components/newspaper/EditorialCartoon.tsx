"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { EditorialCartoon as EditorialCartoonType } from "@/types/subh";

interface EditorialCartoonProps {
  cartoon: EditorialCartoonType;
  leadStoryHeadline?: string;
}

export function EditorialCartoon({
  cartoon,
  leadStoryHeadline,
}: EditorialCartoonProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <figure
      aria-label="Daily Editorial Cartoon"
      className="story-card-print w-full flex flex-col bg-transparent text-[#111111]"
    >
      {/* Cartoon Kicker */}
      <div className="flex items-center justify-between border-b border-[#111111] pb-1 mb-2.5 text-[11px] font-mono uppercase tracking-widest text-[#4a4742]">
        <span className="font-bold text-[#111111]">
          EDITORIAL LITHOGRAPH
        </span>
        <span>PLATE NO. 1</span>
      </div>

      {/* Lithograph Image Container — crops bottom 28px (-mb-7) to hide watermark */}
      <div className="relative w-full overflow-hidden border border-[#111111] bg-[#f9f6ef] min-h-[210px] flex items-center justify-center">
        {!imageLoaded && !imageError && (
          <div className="py-16 text-center text-[#4a4742] font-mono text-[11px] uppercase tracking-widest">
            [ ENGRAVING DAILY LITHOGRAPH PLATE... ]
          </div>
        )}

        {imageError ? (
          <div className="p-6 text-center text-[#111111] font-serif">
            <p className="font-mono text-xs uppercase tracking-widest font-bold mb-1">
              LITHOGRAPH PLATE
            </p>
            <p className="text-xs italic text-[#4a4742] max-w-sm mx-auto">
              &ldquo;{cartoon.caption}&rdquo;
            </p>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={cartoon.imageUrl}
            alt={cartoon.caption}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={`w-full h-auto block -mb-7 grayscale contrast-125 mix-blend-multiply transition-opacity duration-300 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            loading="lazy"
          />
        )}
      </div>

      {/* Caption & Story Link */}
      <figcaption className="mt-2 pt-1.5 border-b border-[#c8c2b6] pb-2 flex flex-col gap-1">
        <p className="text-[13px] font-serif italic text-[#111111] leading-snug">
          &ldquo;{cartoon.caption}&rdquo;
        </p>

        <div className="flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-wider text-[#4a4742]">
          {leadStoryHeadline && (
            <span className="truncate">REF: {leadStoryHeadline}</span>
          )}
          {cartoon.relatedStoryId && (
            <Link
              href={`#${cartoon.relatedStoryId}`}
              className="no-print text-[#111111] font-bold underline decoration-[#4a4742] hover:decoration-[#111111] shrink-0"
            >
              SEE LEAD DISPATCH ↗
            </Link>
          )}
        </div>
      </figcaption>
    </figure>
  );
}
