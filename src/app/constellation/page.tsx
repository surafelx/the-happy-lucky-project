import type { Metadata } from "next";

import { StarMap } from "@/components/constellation/StarMap";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Constellation",
  description:
    "An interactive star map where campaigns are widgets, donors are stars and receipts are the lines between them.",
};

export default function ConstellationPage() {
  return (
    <>
      <section className="container-page pb-8 pt-16">
        <SectionHeading
          eyebrow="Constellation"
          title="Read the sky by the birr"
          sub="Campaigns are the bright widgets. Every donor is a star. Every receipt is a line of light between them. Hover, click, follow."
        />
      </section>
      <StarMap />
    </>
  );
}