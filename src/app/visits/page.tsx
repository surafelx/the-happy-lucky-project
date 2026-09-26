import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MENTOR_FORM_ENABLED } from "@/lib/flags";
import { dbConfigured } from "@/lib/db";
import { readVisits } from "@/lib/store";
import { WorkMap } from "@/components/WorkMap";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Visits",
  description: "Every place Happy Lucky Chacho has visited, and what happened there.",
};

/** Every visit, on a map, read from the database. Local only until the mentor flag goes on. */
export default async function VisitsPage() {
  if (!MENTOR_FORM_ENABLED) notFound();
  // With no database there is nowhere to read from, so the page is simply not there.
  if (!dbConfigured()) notFound();
  const visits = await readVisits();
  return (
    <div className="page page-enter work-page light" data-theme="light">
      <WorkMap visits={visits} />
    </div>
  );
}
