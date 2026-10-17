import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getActiveProfile } from "@/lib/store";
import { OnboardingModal } from "@/components/modals/OnboardingModal";

export const instant = false;

export default async function OnboardingPage() {
  const profile = await getActiveProfile();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 font-serif bg-[#f9f6ef] min-h-screen text-[#111111]">
      <div className="mb-6 pb-3 border-b-2 border-[#111111] flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#111111] hover:underline font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Today&apos;s Broadsheet</span>
        </Link>
        <div className="text-xs font-mono text-[#4a4742] uppercase tracking-widest">
          SUBH BAKHABAR · PERSONA & INCUBATOR STUDIO
        </div>
      </div>

      <OnboardingModal
        isOpen={true}
        initialProfile={profile}
        asPage={true}
      />
    </main>
  );
}
