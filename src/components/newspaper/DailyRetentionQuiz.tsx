"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { QuizQuestion } from "@/types/subh";
import { toRomanNumeral } from "@/lib/format";

interface DailyRetentionQuizProps {
  quiz: QuizQuestion[];
  editionDate: string;
}

export function DailyRetentionQuiz({
  quiz,
  editionDate,
}: DailyRetentionQuizProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number>
  >({});

  const handleSelect = (questionIndex: number, optionIndex: number) => {
    if (selectedAnswers[questionIndex] !== undefined) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const isComplete = answeredCount === quiz.length;

  const correctCount = quiz.reduce((acc, q, idx) => {
    return acc + (selectedAnswers[idx] === q.correctIndex ? 1 : 0);
  }, 0);

  const resetQuiz = () => {
    setSelectedAnswers({});
  };

  return (
    <section
      aria-label="Morning News Quiz & Retention Ledger"
      className="story-card-print w-full my-8 border-2 border-[#111111] bg-[#efeae0] p-4 sm:p-6 rounded-none text-[#111111]"
    >
      {/* Box Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-[#111111] pb-2.5 mb-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#4a4742] mb-0.5">
            MORNING CROSSWORD & RETENTION LEDGER · {editionDate}
          </div>
          <h3
            className="text-xl sm:text-2xl font-bold font-headline text-[#111111] uppercase tracking-tight leading-none"
            style={{
              fontFamily: "var(--font-playfair), 'Times New Roman', serif",
            }}
          >
            The Morning News Quiz: Three Things You Learned Today
          </h3>
        </div>

        {/* Score Counter & Reset */}
        <div className="no-print flex items-center gap-2 text-xs font-mono uppercase tracking-wider">
          <div className="px-2.5 py-1 border border-[#111111] bg-[#f9f6ef] text-[#111111] font-bold rounded-none">
            {answeredCount}/{quiz.length} COMPLETED
            {isComplete && ` · SCORE: ${correctCount}/${quiz.length}`}
          </div>

          {answeredCount > 0 && (
            <button
              onClick={resetQuiz}
              className="px-2.5 py-1 border border-[#111111] bg-transparent hover:bg-[#111111] hover:text-[#f9f6ef] text-[#111111] uppercase tracking-wider cursor-pointer transition-colors rounded-none"
              title="Reset Quiz"
            >
              [ RESET ]
            </button>
          )}
        </div>
      </div>

      {/* 3 Questions Grid separated by hairlines */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#111111]">
        {quiz.map((q, qIndex) => {
          const selectedOption = selectedAnswers[qIndex];
          const hasAnswered = selectedOption !== undefined;
          const isCorrect = selectedOption === q.correctIndex;
          const roman = toRomanNumeral(qIndex + 1);

          return (
            <div
              key={qIndex}
              className={`flex flex-col justify-between ${
                qIndex === 0
                  ? "pb-4 md:pb-0 md:pr-5"
                  : qIndex === 1
                  ? "py-4 md:py-0 md:px-5"
                  : "pt-4 md:pt-0 md:pl-5"
              }`}
            >
              <div>
                {/* Roman Numeral Header & Story Attribution Link */}
                <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#4a4742] mb-2 pb-1 border-b border-[#c8c2b6]">
                  <span className="font-bold text-[#111111]">
                    QUESTION {roman}.
                  </span>
                  <Link
                    href={`#${q.storyId}`}
                    className="no-print text-[#111111] hover:underline font-semibold"
                    title="Jump to source dispatch in this edition"
                  >
                    REF. DISPATCH ↗
                  </Link>
                </div>

                {/* Question Prompt */}
                <h4 className="font-serif font-bold text-[#111111] text-[15px] leading-snug mb-3">
                  {q.question}
                </h4>

                {/* Multiple Choice Options — Sharp Corners, Monochrome Ink Borders */}
                <div className="space-y-1.5 mb-3">
                  {q.options.map((opt, optIndex) => {
                    const isThisSelected = selectedOption === optIndex;
                    const isThisCorrect = q.correctIndex === optIndex;

                    let btnClass =
                      "border-[#111111] bg-[#f9f6ef] text-[#111111] hover:bg-[#111111] hover:text-[#f9f6ef]";
                    if (hasAnswered) {
                      if (isThisCorrect) {
                        btnClass =
                          "border-[#111111] bg-[#111111] text-[#f9f6ef] font-bold";
                      } else if (isThisSelected) {
                        btnClass =
                          "border-[#111111] bg-[#f9f6ef] text-[#4a4742] line-through";
                      } else {
                        btnClass =
                          "border-[#c8c2b6] bg-[#f9f6ef] text-[#4a4742] opacity-60";
                      }
                    }

                    return (
                      <button
                        key={optIndex}
                        onClick={() => handleSelect(qIndex, optIndex)}
                        disabled={hasAnswered}
                        className={`w-full text-left px-2.5 py-1.5 rounded-none text-xs font-serif transition-colors flex items-start gap-2 border ${btnClass} ${
                          hasAnswered ? "cursor-default" : "cursor-pointer"
                        }`}
                      >
                        <span className="font-mono text-[10px] font-bold uppercase shrink-0 mt-0.5">
                          [{String.fromCharCode(65 + optIndex)}]
                        </span>
                        <span className="leading-snug flex-1">{opt}</span>
                        {hasAnswered && isThisCorrect && (
                          <span className="font-mono text-[10px] font-bold shrink-0">
                            ✓
                          </span>
                        )}
                        {hasAnswered && isThisSelected && !isThisCorrect && (
                          <span className="font-mono text-[10px] font-bold shrink-0">
                            ✗
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Instant Monochrome Explanation Ledger */}
              {hasAnswered && (
                <div className="mt-2 pt-2 border-t border-[#111111] text-xs font-serif text-[#111111]">
                  <div className="font-mono text-[10px] uppercase tracking-wider font-bold mb-0.5">
                    {isCorrect
                      ? "■ VERIFIED CORRECT:"
                      : "■ EDITORIAL CORRECTION:"}
                  </div>
                  <p className="leading-snug italic text-[#4a4742]">
                    {q.explanation}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completion Banner */}
      {isComplete && (
        <div className="no-print mt-4 pt-3 border-t-2 border-[#111111] flex flex-wrap items-center justify-between gap-2 text-xs font-mono uppercase tracking-wider text-[#111111]">
          <div>
            <strong>LEDGER COMPLETE:</strong> {correctCount} OF {quiz.length}{" "}
            DISPATCHES VERIFIED ({Math.round((correctCount / quiz.length) * 100)}
            %)
          </div>
          <div className="font-serif italic normal-case tracking-normal text-[#4a4742]">
            &ldquo;Eight stories, locked in perspective. Now the day is
            yours.&rdquo;
          </div>
        </div>
      )}
    </section>
  );
}
