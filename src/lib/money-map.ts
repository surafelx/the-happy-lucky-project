/**
 * Where the money is, as a picture: circles for the money and lines to whoever
 * it reached.
 *
 * Pure, so the whole layout can be tested without a browser. Every coordinate is
 * rounded to one decimal: this is drawn on the server and again in the browser,
 * and Node and Chrome disagree on the last bits of Math.sin and Math.cos, which
 * is enough to make React throw away the markup and redraw it.
 *
 * A circle's AREA is its amount, not its width, because a reader compares the
 * ink and a radius scale makes a twice-as-big gift look four times as big.
 */
export type MoneyNodeKind = "core" | "fund" | "gift" | "place" | "spend";
export type MoneyNode = {
  id: string;
  kind: MoneyNodeKind;
  label: string;
  /** The amount under the label. Zero means the label stands on its own. */
  amount: number;
  note: string;
  x: number;
  y: number;
  r: number;
  /** Where clicking it goes, if anywhere. */
  href: string;
  /** Which lines it opens in the ledger panel, if any. */
  focus: string | null;
};
export type MoneyLink = { id: string; x1: number; y1: number; x2: number; y2: number };
export type MoneyMap = { width: number; height: number; nodes: MoneyNode[]; links: MoneyLink[] };

export type MoneyMapInput = {
  balance: number;
  general: { raised: number; spent: number };
  goals: { id: string; title: string; raised: number }[];
  inKind: { amount: number; recipient: string }[];
  spends: { name: string; amount: number }[];
};

const W = 1000;
const H = 620;
const CX = W / 2;
const CY = H / 2;
const RX = 300;
const RY = 168;
const RX2 = 452;
const RY2 = 252;
/** Portrait: a narrow canvas that grows downwards, one row per circle. */
const PW = 560;
const ROW = 210;
const round = (n: number) => Math.round(n * 10) / 10;

/** Area in proportion to the amount, with a floor so a tiny gift is still a target you can hit. */
function radius(amount: number, max: number): number {
  if (max <= 0) return 26;
  return round(18 + 40 * Math.sqrt(Math.max(0, amount) / max));
}

/** Sums by name, biggest first, so the picture is stable however the ledger is ordered. */
function group(rows: { name: string; amount: number }[]): { name: string; amount: number }[] {
  const by = new Map<string, number>();
  for (const r of rows) {
    const name = r.name.trim() || "Not named";
    by.set(name, (by.get(name) ?? 0) + r.amount);
  }
  return [...by].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
}

/**
 * A label broken into lines of at most `max` characters. SVG will not wrap text
 * for us, so the break is decided here, on whole words, and capped at `lines` so
 * a long name cannot push its circle into the next one.
 */
export function wrap(label: string, max = 18, lines = 3): string[] {
  const words = label.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length <= max || !line) {
      line = next;
    } else {
      out.push(line);
      line = w;
      if (out.length === lines) break;
    }
  }
  if (line && out.length < lines) out.push(line);
  if (out.length === lines && words.join(" ").length > out.join(" ").length) {
    out[lines - 1] = `${out[lines - 1].replace(/[\s,.]+$/, "")}…`;
  }
  return out.length ? out : [""];
}

/**
 * Landscape spreads the circles round the middle. Portrait cannot: squeezed into
 * a phone's width the labels land on top of each other, so there the circles run
 * down the page instead, each with whoever received it beside it.
 */
export function moneyMap(input: MoneyMapInput, opts: { portrait?: boolean } = {}): MoneyMap {
  type Branch = { id: string; kind: MoneyNodeKind; label: string; amount: number; note: string; href: string; focus: string | null; child?: { label: string; note: string } };
  const branches: Branch[] = [];

  // Money given for one named thing, each its own circle.
  for (const g of input.goals) {
    if (g.raised <= 0) continue;
    branches.push({ id: `goal:${g.id}`, kind: "fund", label: g.title, amount: g.raised, note: "given for this", href: "", focus: g.id });
  }

  // Everything given without naming a goal. The plan is where it is decided what this becomes.
  if (input.general.raised > 0) {
    branches.push({
      id: "general",
      kind: "fund",
      label: "General fund",
      amount: input.general.raised,
      note: "wherever the need is biggest",
      href: "/master-plan",
      focus: null,
    });
  }

  // A gift in kind never passed through us, so it hangs off to one side and
  // points at whoever actually received it.
  for (const g of group(input.inKind.map((k) => ({ name: k.recipient, amount: k.amount })))) {
    branches.push({
      id: `kind:${g.name}`,
      kind: "gift",
      label: "Given in kind",
      amount: g.amount,
      note: "goods, handed over directly",
      href: "",
      focus: null,
      child: { label: g.name, note: "received it" },
    });
  }

  for (const s of group(input.spends)) {
    branches.push({ id: `spend:${s.name}`, kind: "spend", label: `Paid to ${s.name}`, amount: s.amount, note: "spent", href: "", focus: null });
  }

  const max = Math.max(1, ...branches.map((b) => b.amount));
  const nodes: MoneyNode[] = [];
  const links: MoneyLink[] = [];
  const n = branches.length;
  const portrait = opts.portrait === true;

  const width = portrait ? PW : W;
  const height = portrait ? Math.max(420, 250 + n * ROW) : H;
  const coreX = portrait ? PW / 2 : CX;
  const coreY = portrait ? 120 : CY;
  const coreR = portrait ? 58 : round(44 + 26 * (n ? 1 : 0));

  nodes.push({
    id: "core",
    kind: "core",
    label: "What we have now",
    amount: input.balance,
    note: "money in minus money out",
    x: coreX,
    y: coreY,
    r: coreR,
    href: "",
    focus: null,
  });

  branches.forEach((b, i) => {
    // Landscape: evenly round the middle, starting due west so the first circle
    // lands beside the balance rather than on top of it. Portrait: straight down.
    const a = ((180 + (360 / Math.max(1, n)) * i) * Math.PI) / 180;
    const x = portrait ? 150 : round(CX + Math.cos(a) * RX);
    const y = portrait ? 270 + i * ROW : round(CY + Math.sin(a) * RY);
    const r = portrait ? round(16 + 30 * Math.sqrt(Math.max(0, b.amount) / max)) : radius(b.amount, max);
    nodes.push({ id: b.id, kind: b.kind, label: b.label, amount: b.amount, note: b.note, x, y, r, href: b.href, focus: b.focus });
    links.push({ id: `core-${b.id}`, x1: coreX, y1: coreY, x2: x, y2: y });

    if (b.child) {
      const cx = portrait ? 410 : round(CX + Math.cos(a) * RX2);
      const cy = portrait ? y : round(CY + Math.sin(a) * RY2);
      const id = `${b.id}:to`;
      nodes.push({ id, kind: "place", label: b.child.label, amount: 0, note: b.child.note, x: cx, y: cy, r: portrait ? 30 : 34, href: "/visits", focus: null });
      links.push({ id: `${b.id}-to`, x1: x, y1: y, x2: cx, y2: cy });
    }
  });

  return { width, height, nodes, links };
}
