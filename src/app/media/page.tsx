import type { Metadata } from "next";

import { MediaExplorer } from "@/components/media/MediaExplorer";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Media",
  description:
    "Photos, films and voices from Sundays, studios and handover mornings — a placeholder grid with a demo lightbox.",
};

export default function MediaPage() {
  return (
    <>
      <section className="container-page pb-8 pt-16">
        <SectionHeading
          eyebrow="Media"
          title="Light and noise"
          sub="Everything we can't say in numbers — in pictures, films and field recordings. Sift by kind, click to linger."
        />
      </section>
      <MediaExplorer />
    </>
  );
}