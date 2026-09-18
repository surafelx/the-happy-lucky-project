import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DASHBOARDS_ENABLED } from "@/lib/guard";
import { OfficeDashboard } from "@/components/OfficeDashboard";

export const metadata: Metadata = { title: "The office", robots: { index: false, follow: false } };

/** The foundation's operating dashboard. Local / self-hosted only; passcode-protected when OFFICE_PASSCODE is set. */
export default function OfficePage() {
  if (!DASHBOARDS_ENABLED) notFound();
  return (
    <div className="admin-page light" data-theme="light">
      <OfficeDashboard />
    </div>
  );
}
