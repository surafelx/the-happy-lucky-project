/** Fixed, decorative layer behind the page: soft blobs and two doodles, all gently moving. */
export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="blob teal" />
      <div className="blob rose" />
      <div className="blob gold" />

      {/* paper plane */}
      <svg className="plane" viewBox="0 0 180 90" fill="none" strokeLinejoin="round" strokeLinecap="round">
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
