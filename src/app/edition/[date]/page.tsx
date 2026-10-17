import { notFound } from "next/navigation";
import { getEdition, listEditionSummaries } from "@/lib/store";
import { BroadsheetView } from "@/components/newspaper/BroadsheetView";

export const instant = false;

export async function generateStaticParams() {
  const editions = await listEditionSummaries();
  return editions.map((e) => ({
    date: e.date,
  }));
}

interface EditionPageProps {
  params: Promise<{
    date: string;
  }>;
}

export default async function EditionPage({ params }: EditionPageProps) {
  const { date } = await params;

  const [edition, allEditions] = await Promise.all([
    getEdition(date),
    listEditionSummaries(),
  ]);

  if (!edition) {
    notFound();
  }

  return <BroadsheetView edition={edition} allEditions={allEditions} />;
}
