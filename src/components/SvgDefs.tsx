/** Shared SVG symbols: the smiley-flower logo and the dotted ribbon. */
export function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <symbol id="logo" viewBox="0 0 100 100">
          <g fill="#4B9B9D" stroke="#E47FC8" strokeWidth="3.5" strokeLinejoin="round"><path d="M0 0C-14-9-27-21-23-34C-20-44-8-46 0-38C8-46 20-44 23-34C27-21 14-9 0 0Z" transform="translate(50 50) rotate(-45) scale(1.12)"/><path d="M0 0C-14-9-27-21-23-34C-20-44-8-46 0-38C8-46 20-44 23-34C27-21 14-9 0 0Z" transform="translate(50 50) rotate(45) scale(1.12)"/><path d="M0 0C-14-9-27-21-23-34C-20-44-8-46 0-38C8-46 20-44 23-34C27-21 14-9 0 0Z" transform="translate(50 50) rotate(135) scale(1.12)"/><path d="M0 0C-14-9-27-21-23-34C-20-44-8-46 0-38C8-46 20-44 23-34C27-21 14-9 0 0Z" transform="translate(50 50) rotate(225) scale(1.12)"/></g>
          <circle cx="50" cy="50" r="26" fill="#F3BC29" stroke="#E47FC8" strokeWidth="3.5"/>
          <circle cx="41.5" cy="45" r="2.6" fill="#E47FC8"/><circle cx="58.5" cy="45" r="2.6" fill="#E47FC8"/>
          <path d="M39.5 56.5q10.5 10 21 0M38 55.5h3M59 55.5h3" fill="none" stroke="#E47FC8" strokeWidth="3" strokeLinecap="round"/>
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
