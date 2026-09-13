import type { ReactNode } from "react";
import { FlowerMotif } from "@/components/FlowerMotif";

type SectionHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  sub?: ReactNode;
  align?: "center" | "left";
  flower?: string;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  sub,
  align = "center",
  flower = "#e6918e",
  className = "",
}: SectionHeadingProps) {
  const alignCls =
    align === "center" ? "items-center text-center" : "items-start text-left";
  return (
    <div className={`flex flex-col gap-4 ${alignCls} ${className}`}>
      {eyebrow ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
          <FlowerMotif petal={flower} clover="#4fb78a" className="h-4 w-4" />
          {eyebrow}
        </span>
      ) : null}
      <h2 className="font-display text-balance text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl md:text-[2.75rem]">
        {title}
      </h2>
      {sub ? (
        <p className="max-w-2xl text-pretty text-base leading-7 text-ink-soft md:text-lg">
          {sub}
        </p>
      ) : null}
    </div>
  );
}