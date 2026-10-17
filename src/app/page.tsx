import { notFound } from "next/navigation";
import { getLatestEdition, listEditionSummaries } from "@/lib/store";
import { BroadsheetView } from "@/components/newspaper/BroadsheetView";

export const instant = false;

export default async function HomePage() {
  const [edition, allEditions] = await Promise.all([
    getLatestEdition(),
    listEditionSummaries(),
  ]);

  if (!edition) {
    notFound();
  }

  return <BroadsheetView edition={edition} allEditions={allEditions} />;
}
