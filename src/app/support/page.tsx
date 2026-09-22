import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MENTOR_FORM_ENABLED } from "@/lib/flags";
import { PlayBubbles } from "@/components/PlayBubbles";
import { SupportForm } from "@/components/SupportForm";

export const metadata: Metadata = {
  title: "Give monthly",
  description: "Four monthly plans, each tied to one real thing: pens for a child, a club's supplies, a whole Sunday, or the running costs. Cancel any month.",
};

/** Monthly supporter plans. Local only until the mentor flag goes on. */
export default function SupportPage() {
  if (!MENTOR_FORM_ENABLED) notFound();
  return (
    <div className="page page-enter mentor-page light" data-theme="light">
      <PlayBubbles />
      <SupportForm />
    </div>
  );
}
