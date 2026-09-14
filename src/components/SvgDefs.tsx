/** Shared SVG symbols: the smiley-flower logo and the dotted ribbon. */
export function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <symbol id="logo" viewBox="0 0 100 100">
          <g fill="#4B9B9D" stroke="#E47FC8" strokeWidth="2.5">
            <ellipse cx="50" cy="19" rx="14" ry="18" />
            <ellipse cx="50" cy="81" rx="14" ry="18" />
            <ellipse cx="50" cy="19" rx="14" ry="18" transform="rotate(60 50 50)" />
            <ellipse cx="50" cy="81" rx="14" ry="18" transform="rotate(60 50 50)" />
            <ellipse cx="50" cy="19" rx="14" ry="18" transform="rotate(-60 50 50)" />
            <ellipse cx="50" cy="81" rx="14" ry="18" transform="rotate(-60 50 50)" />
          </g>
          <circle cx="50" cy="50" r="22" fill="#F3BC29" stroke="#E47FC8" strokeWidth="2.5" />
          <circle cx="42" cy="45" r="2.4" fill="#E47FC8" />
          <circle cx="58" cy="45" r="2.4" fill="#E47FC8" />
          <path d="M40 55q10 9 20 0" fill="none" stroke="#E47FC8" strokeWidth="3" strokeLinecap="round" />
        </symbol>
        <symbol id="dots" viewBox="0 0 200 40">
          <path
            d="M0 20q50-30 100 0t100 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="18"
            strokeDasharray="0 9"
            strokeLinecap="round"
          />
        </symbol>
      </defs>
    </svg>
  );
}

export function Logo({
  className,
  style,
  id,
  onClick,
}: {
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  onClick?: React.MouseEventHandler<SVGSVGElement>;
}) {
  return (
    <svg className={className} style={style} id={id} onClick={onClick} aria-hidden="true">
      <use href="#logo" />
    </svg>
  );
}

export function Ribbon({ style, color = "var(--dot)" }: { style: React.CSSProperties; color?: string }) {
  return (
    <svg className="ribbon" style={{ color, ...style }} viewBox="0 0 200 40" aria-hidden="true">
      <use href="#dots" />
    </svg>
  );
}
