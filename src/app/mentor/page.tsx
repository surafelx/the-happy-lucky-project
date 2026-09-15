import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MENTOR_FORM_ENABLED } from "@/lib/flags";
import { MentorForm } from "@/components/MentorForm";
import { PlayBubbles } from "@/components/PlayBubbles";

export const metadata: Metadata = {
  title: "Become a big sibling",
  description:
    "Tell us what you could share and how you'd like to help. A workshop, a weekly hour, some material, or just a hand on a Sunday.",
};

/** Full-screen, step-by-step mentor interest flow. Always in the light palette. */
export default function MentorPage() {
  if (!MENTOR_FORM_ENABLED) notFound();
  return (
    <div className="page page-enter mentor-page light" data-theme="light">
      <PlayBubbles />
      <MentorForm />
    </div>
  );
}
