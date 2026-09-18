import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MENTOR_FORM_ENABLED } from "@/lib/flags";
import { PartnerForm } from "@/components/PartnerForm";
import { PlayBubbles } from "@/components/PlayBubbles";

export const metadata: Metadata = {
  title: "Request help for your kids",
  description:
    "Schools, children's homes and community centres: tell us what your kids need and the community shows up. Workshops, mentors, material, a hand on a Sunday.",
};

/** Organisations sign up and ask the community for help. Same flow and palette as the mentor form. */
export default function PartnersPage() {
  if (!MENTOR_FORM_ENABLED) notFound();
  return (
    <div className="page page-enter mentor-page light" data-theme="light">
      <PlayBubbles />
      <PartnerForm />
    </div>
  );
}
