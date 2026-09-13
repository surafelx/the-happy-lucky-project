import type { CSSProperties } from "react";

type FlowerMotifProps = {
  className?: string;
  style?: CSSProperties;
  petal?: string;
  petalAlt?: string;
  clover?: string;
  outline?: string;
};

export function FlowerMotif({
  className,
  style,
  petal = "#e6918e",
  petalAlt = "#41c0ab",
  clover = "#4fb78a",
  outline = "#2b2320",
}: FlowerMotifProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <circle
        cx="60"
        cy="60"
        r="52"
        fill="#fffdf6"
        stroke={outline}
        strokeOpacity="0.16"
        strokeWidth="2"
      />
      <circle
        cx="60"
        cy="8"
        r="4.5"
        fill="none"
        stroke={outline}
        strokeOpacity="0.28"
        strokeWidth="2.5"
      />
      <g stroke={outline} strokeOpacity="0.18" strokeWidth="1">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
          <ellipse
            key={deg}
            cx="60"
            cy="27"
            rx="8.5"
            ry="16.5"
            fill={i % 2 === 0 ? petal : petalAlt}
            transform={`rotate(${deg} 60 60)`}
          />
        ))}
      </g>
      <g stroke={outline} strokeOpacity="0.3" strokeWidth="1">
        {[0, 90, 180, 270].map((deg) => (
          <ellipse
            key={deg}
            cx="60"
            cy="50.5"
            rx="5.5"
            ry="8.5"
            fill={clover}
            transform={`rotate(${deg} 60 60)`}
          />
        ))}
      </g>
      <circle cx="60" cy="60" r="3.4" fill="#fffdf6" />
      <circle
        cx="95"
        cy="34"
        r="2.6"
        fill={petal}
        stroke={outline}
        strokeOpacity="0.3"
        strokeWidth="1.2"
      />
      <circle
        cx="27"
        cy="88"
        r="1.8"
        fill={clover}
        stroke={outline}
        strokeOpacity="0.3"
        strokeWidth="1"
      />
    </svg>
  );
}