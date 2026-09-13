import type { CSSProperties } from "react";
import type { PinKind } from "@/lib/types";

const INK = "#241d1a";
const CREAM = "#fffdf6";

const KIND_FILL: Record<PinKind, string> = {
  backpack: "#e6918e",
  laptop: "#41c0ab",
  library: "#f2ab2f",
  camera: "#7ad0a6",
  music: "#d96b67",
  heart: "#e6918e",
  palette: "#41c0ab",
  teacup: "#f7c355",
  sun: "#f2ab2f",
  spark: "#7ad0a6",
  school: "#41c0ab",
  flower: "#e6918e",
};

const KIND_ART: Record<PinKind, string> = {
  backpack: "#c04e49",
  laptop: "#18857a",
  library: "#c26818",
  camera: "#3ea77a",
  music: "#b0453f",
  heart: "#c04e49",
  palette: "#18857a",
  teacup: "#d98e1f",
  sun: "#d98e1f",
  spark: "#2f9170",
  school: "#18857a",
  flower: "#c04e49",
};

const STROKE = {
  stroke: INK,
  strokeWidth: 2.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

type PinIllustrationProps = {
  kind: PinKind;
  className?: string;
  style?: CSSProperties;
};

export function PinIllustration({ kind, className, style }: PinIllustrationProps) {
  const fill = KIND_FILL[kind];
  const art = KIND_ART[kind];
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden="true">
      <circle cx="50" cy="50" r="48" fill={fill} stroke={INK} strokeWidth="6" />
      <circle cx="50" cy="50" r="43.5" fill="none" stroke={CREAM} strokeWidth="3" />
      <ellipse
        cx="37"
        cy="22"
        rx="11"
        ry="6.5"
        fill="#fff"
        opacity="0.4"
        transform="rotate(-24 37 22)"
      />
      <g fill={art} {...STROKE}>
        <Art kind={kind} art={art} />
      </g>
    </svg>
  );
}

function Art({ kind, art }: { kind: PinKind; art: string }) {
  switch (kind) {
    case "backpack":
      return (
        <g>
          <path d="M34 45 a8 8 0 0 1 8 -8 h16 a8 8 0 0 1 8 8 v20 h-32 Z" />
          <path d="M43 38 L44 33 a6 6 0 0 1 12 0 L57 38" fill="none" />
          <path d="M35 42 L30 50" fill="none" />
          <path d="M65 42 L70 50" fill="none" />
          <rect x="40" y="54" width="20" height="9" rx="3" fill={CREAM} stroke={INK} strokeWidth="2" />
          <rect x="47" y="57.5" width="6" height="2.5" rx="1.2" />
        </g>
      );
    case "laptop":
      return (
        <g>
          <path d="M28 29 a5 5 0 0 1 5 -5 h34 a5 5 0 0 1 5 5 v24 h-44 Z" />
          <path d="M24 58 a3 3 0 0 1 3 -3 h46 a3 3 0 0 1 3 3 v4 a4 4 0 0 1 -4 4 H28 a4 4 0 0 1 -4 -4 Z" />
          <rect x="36" y="33" width="28" height="16" rx="3" fill={CREAM} stroke={INK} strokeWidth="2" />
          <path d="M50 30 V44" stroke={CREAM} strokeWidth="2" />
          <circle cx="56" cy="37" r="2" fill={CREAM} />
        </g>
      );
    case "library":
      return (
        <g>
          <path d="M50 43 C40 34 31 38 25 38 V65 C31 63 42 67 50 71 C58 67 69 63 75 65 V38 C69 38 60 34 50 43 Z" />
          <path d="M50 43 V71" stroke={CREAM} strokeWidth="2.2" />
          <rect x="54" y="31" width="4.5" height="12" rx="1.5" fill={CREAM} />
          <circle cx="38" cy="52" r="1.8" fill={CREAM} />
          <circle cx="45" cy="48" r="1.8" fill={CREAM} />
        </g>
      );
    case "camera":
      return (
        <g>
          <path d="M38 35 a4 4 0 0 1 4 -4 h16 a4 4 0 0 1 4 4 v2 h7 a4 4 0 0 1 4 4 v24 a4 4 0 0 1 -4 4 H31 a4 4 0 0 1 -4 -4 V41 a4 4 0 0 1 4 -4 h7 Z" />
          <circle cx="50" cy="53" r="10" stroke={CREAM} strokeWidth="3.2" fill="none" />
          <circle cx="50" cy="53" r="4" fill={CREAM} />
        </g>
      );
    case "music":
      return (
        <g>
          <path d="M57 30 L57 62" fill="none" />
          <path d="M57 30 C63 31 68 35 70 40" fill="none" />
          <ellipse cx="53" cy="64" rx="7" ry="4.6" transform="rotate(-14 53 64)" fill={CREAM} stroke={INK} strokeWidth="2.2" />
          <circle cx="67" cy="42" r="1.8" fill={CREAM} />
        </g>
      );
    case "heart":
      return (
        <g>
          <path d="M50 70 C33 58 22 48 27 38 C31 30 42 29 50 37 C58 29 69 30 73 38 C78 48 67 58 50 70 Z" />
          <path d="M50 70 C33 58 22 48 27 38 C31 30 42 29 50 37 C58 29 69 30 73 38 C78 48 67 58 50 70 Z" fill="none" stroke={CREAM} strokeWidth="1.6" />
          <circle cx="42" cy="43" r="2" fill={CREAM} />
        </g>
      );
    case "palette":
      return (
        <g>
          <ellipse cx="50" cy="53" rx="24" ry="18" />
          <circle cx="44" cy="48" r="4.6" fill={KIND_FILL.palette} />
          <circle cx="60" cy="44" r="3" fill={CREAM} />
          <circle cx="66" cy="52" r="3" fill={CREAM} />
          <circle cx="61" cy="61" r="3" fill={CREAM} />
          <circle cx="47" cy="63" r="3" fill={CREAM} />
        </g>
      );
    case "teacup":
      return (
        <g>
          <path d="M33 42 h34 l-3.5 17 a14 14 0 0 1 -27 0 Z" />
          <path d="M67 44 c9 2 9 15 0 17" fill="none" />
          <ellipse cx="50" cy="61" rx="20" ry="4.5" />
          <path d="M43 30 c-2 -4 2 -5 0 -9" stroke={CREAM} strokeWidth="2.4" fill="none" />
          <path d="M56 31 c-2 -4 2 -5 0 -9" stroke={CREAM} strokeWidth="2.4" fill="none" />
        </g>
      );
    case "sun":
      return (
        <g>
          <path
            d="M50 34
               M50 66
               M34 50
               M66 50
               M38.7 38.7 M61.3 61.3 M38.7 61.3 M61.3 38.7"
            stroke={CREAM}
            strokeWidth="3"
            fill="none"
          />
          <circle cx="50" cy="50" r="12" />
        </g>
      );
    case "spark":
      return (
        <g>
          <path d="M50 20 C53 38 62 47 80 50 C62 53 53 62 50 80 C47 62 38 53 20 50 C38 47 47 38 50 20 Z" />
          <circle cx="74" cy="28" r="2.4" fill={CREAM} />
          <circle cx="26" cy="70" r="1.8" fill={CREAM} />
        </g>
      );
    case "school":
      return (
        <g>
          <path d="M50 32 L80 42 L50 52 L20 42 Z" />
          <path d="M28 44 v4 a22 10 0 0 0 44 0 v-4" fill={CREAM} />
          <path d="M50 42 L50 60" stroke={CREAM} strokeWidth="2.4" fill="none" />
          <circle cx="50" cy="62" r="3.4" fill={CREAM} />
        </g>
      );
    case "flower":
      return (
        <g>
          {[0, 72, 144, 216, 288].map((deg, i) => (
            <circle
              key={deg}
              cx="50"
              cy="38"
              r="6"
              transform={`rotate(${deg} 50 50)`}
              fill={i % 2 === 0 ? art : KIND_ART.flower}
            />
          ))}
          <circle cx="50" cy="50" r="4.4" fill={CREAM} />
        </g>
      );
    default:
      return null;
  }
}