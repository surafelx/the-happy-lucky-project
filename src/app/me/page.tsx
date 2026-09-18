import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DASHBOARDS_ENABLED } from "@/lib/guard";
import { MeDashboard } from "@/components/MeDashboard";

export const metadata: Metadata = { title: "Your Sundays", robots: { index: false, follow: false } };

/** A mentor's own dashboard: next Sunday, onboarding, their group, the badge. */
export default function MePage() {
  if (!DASHBOARDS_ENABLED) notFound();
  return (
    <div className="admin-page light" data-theme="light">
      <MeDashboard />
    </div>
  );
}
