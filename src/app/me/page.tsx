import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DASHBOARDS_ENABLED } from "@/lib/guard";
import { MeDashboard } from "@/components/MeDashboard";

export const metadata: Metadata = { title: "Your Sundays", robots: { index: false, follow: false } };

/** A mentor's own dashboard: next Sunday, onboarding, their group, the badge. Always light. */
export default function MePage() {
  if (!DASHBOARDS_ENABLED) notFound();
  return (
    <div className="page page-enter dash-page mentor-page light" data-theme="light">
      <div className="wrap">
        <MeDashboard />
      </div>
    </div>
  );
}
