import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DASHBOARDS_ENABLED } from "@/lib/guard";
import { EnterGate } from "@/components/EnterGate";
import { PlayBubbles } from "@/components/PlayBubbles";

export const metadata: Metadata = { title: "Enter", robots: { index: false, follow: false } };

/** The one door into the logged-in side: mentors and the office. */
export default function EnterPage() {
  if (!DASHBOARDS_ENABLED) notFound();
  return (
    <div className="page page-enter mentor-page light" data-theme="light">
      <PlayBubbles />
      <EnterGate />
    </div>
  );
}
