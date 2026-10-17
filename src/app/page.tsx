import { notFound } from "next/navigation";
import {
  getActiveProfile,
  getLatestEdition,
  listEditionSummaries,
} from "@/lib/store";
import { BroadsheetView } from "@/components/newspaper/BroadsheetView";

export const instant = false;

export default async function HomePage() {
  const [edition, allEditions, profile] = await Promise.all([
    getLatestEdition(),
    listEditionSummaries(),
    getActiveProfile(),
  ]);

  if (!edition) {
    notFound();
  }

  return (
    <BroadsheetView
      edition={edition}
      allEditions={allEditions}
      initialProfile={profile}
    />
  );
}
