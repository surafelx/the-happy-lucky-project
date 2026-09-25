import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MENTOR_FORM_ENABLED } from "@/lib/flags";
import { WorkMap } from "@/components/WorkMap";

export const metadata: Metadata = {
  title: "Visits",
  description: "Every place Happy Lucky Chacho has visited, and what happened there.",
};

/** Every visit, on a map. Local only until the mentor flag goes on. */
export default function VisitsPage() {
  if (!MENTOR_FORM_ENABLED) notFound();
  return (
    <div className="page page-enter work-page light" data-theme="light">
      <WorkMap />
    </div>
  );
}
