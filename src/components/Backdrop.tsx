import { Ribbon } from "@/components/SvgDefs";

/** Fixed, decorative layer behind the page: soft blobs, dotted ribbons and two doodles, all gently moving. */
export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="blob teal" />
      <div className="blob rose" />
      <div className="blob gold" />
      <Ribbon style={{ top: "30%", right: "-40px", width: 240 }} />
      <Ribbon style={{ bottom: "18%", left: "-50px", width: 220, transform: "rotate(-22deg)" }} />
      <Ribbon style={{ top: "62%", right: "3%", width: 150, transform: "rotate(14deg)" }} color="var(--gold)" />

      {/* paper plane with a dashed trail */}
      <svg className="plane" viewBox="0 0 180 90" fill="none" strokeLinejoin="round" strokeLinecap="round">
        <path d="M4 72c22-4 34-22 52-30" stroke="var(--dot)" strokeWidth="3" strokeDasharray="7 8" opacity=".8" />
        <path d="M70 46 172 10 138 82 118 58Z" fill="var(--paper)" stroke="var(--ink)" strokeWidth="3.5" />
        <path d="M70 46 118 58 172 10Z" fill="var(--teal-soft)" stroke="var(--ink)" strokeWidth="3.5" />
        <path d="M118 58v20l10-12" fill="var(--paper)" stroke="var(--ink)" strokeWidth="3.5" />
      </svg>

      {/* hand-drawn curved arrow */}
      <svg className="scribble" viewBox="0 0 120 80" fill="none" strokeLinejoin="round" strokeLinecap="round">
        <path d="M10 70C20 20 80 10 108 34" stroke="var(--dot)" strokeWidth="4" />
        <path d="M102.7 18.9 108 34 92.3 31.1" stroke="var(--dot)" strokeWidth="4" />
      </svg>
    </div>
  );
}
