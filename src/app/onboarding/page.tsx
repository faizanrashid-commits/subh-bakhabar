import Link from "next/link";
import { ArrowLeft, Sparkles, BookOpen, Layers, CheckCircle2 } from "lucide-react";
import { getActiveProfile } from "@/lib/store";

export const instant = false;

export default async function OnboardingPage() {
  const profile = await getActiveProfile();

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 font-serif">
      <div className="mb-6 pb-3 border-b-2 border-stone-800 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-stone-700 hover:text-stone-950 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Today&apos;s Paper</span>
        </Link>
        <div className="text-xs font-mono text-stone-500 uppercase tracking-widest">
          Personalization & Persona Brain
        </div>
      </div>

      <div className="p-6 bg-[#fbf9f4] border-2 border-stone-800 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-amber-700" />
          <h1
            className="text-3xl font-bold font-headline text-stone-950"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Active Persona & Life Lenses
          </h1>
        </div>
        <p className="text-sm text-stone-700 italic mb-6">
          Subh Bakhabar synthesizes the world specifically for your three life lenses and active incubator goal.
        </p>

        {/* Life Lenses */}
        <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-stone-900 mb-3 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-stone-700" />
          <span>Configured Life Lenses (3)</span>
        </h2>
        <div className="space-y-3 mb-6">
          {profile.lifeLenses.map((lens) => (
            <div
              key={lens.id}
              className="p-3.5 bg-white border border-stone-300 text-xs text-stone-800"
            >
              <div className="flex items-center justify-between font-mono font-bold text-stone-950 text-sm mb-1">
                <span>{lens.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-stone-100 border border-stone-300 text-stone-700">
                  Baseline: {lens.knowledgeBaseline.toUpperCase()} · Weight: {lens.weight}%
                </span>
              </div>
              <p className="font-serif text-stone-700 leading-relaxed mb-2">
                {lens.description}
              </p>
              <div className="text-[11px] font-serif italic text-amber-950 bg-amber-50/60 p-2 border-l-2 border-amber-600">
                <strong>Preferred Angle:</strong> {lens.preferredAngle}
              </div>
            </div>
          ))}
        </div>

        {/* Incubator Goal */}
        <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-stone-900 mb-3 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-stone-700" />
          <span>Active Domain Incubator</span>
        </h2>
        <div className="p-3.5 bg-amber-50/80 border border-amber-300 text-xs text-stone-900">
          <div className="flex items-center justify-between font-mono font-bold text-amber-950 text-sm mb-1">
            <span>{profile.incubatorGoal.title}</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold uppercase">
              Mastery Level {profile.incubatorGoal.masteryLevel}
            </span>
          </div>
          <p className="font-serif leading-relaxed mb-3">
            {profile.incubatorGoal.objective}
          </p>
          <div className="space-y-1 font-serif text-[11px] text-stone-700">
            {profile.incubatorGoal.progressionNotes.map((note, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
