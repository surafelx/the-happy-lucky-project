import type { Metadata } from "next";

import { MentorForm } from "@/components/MentorForm";

export const metadata: Metadata = {
  title: "Become a big sibling",
  description:
    "Tell us what you could share and how you'd like to help. A workshop, a weekly hour, some material, or just a hand on a Sunday.",
};

const pop = (i: number) => ({ "--i": i }) as React.CSSProperties;

export default function MentorPage() {
  return (
    <div className="page page-enter mentor-page">
      <div className="wrap">
        <div className="sec-head pop" style={pop(0)}>
          <span className="eyebrow">Mentor interest form</span>
          <h2>Become a big sibling</h2>
          <p className="lede">
            Kids don&apos;t need experts. They need someone a little further down the road who shows up.
            Tell us what you could share and how you&apos;d like to help, and we&apos;ll find you a Sunday.
          </p>
        </div>
        <div className="mentor-card pop" style={pop(1)}>
          <MentorForm />
        </div>
      </div>
    </div>
  );
}
