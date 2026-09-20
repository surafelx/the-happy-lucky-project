import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MENTOR_FORM_ENABLED } from "@/lib/flags";
import { WorkMap } from "@/components/WorkMap";

export const metadata: Metadata = {
  title: "Our work",
  description: "A map of the schools, children's homes and communities across Ethiopia that Happy Lucky Chacho has worked with.",
};

/** Where we have worked, on a map of Ethiopia. Local only until the places are real. */
export default function WorkPage() {
  if (!MENTOR_FORM_ENABLED) notFound();
  return (
    <div className="page page-enter work-page light" data-theme="light">
      <WorkMap />
    </div>
  );
}
