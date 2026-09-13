import { FlowerMotif } from "@/components/FlowerMotif";

export function Ticker({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-ink/8 bg-white/70 py-3 backdrop-blur">
      <div className="flex w-max animate-ticker">
        {row.map((t, i) => (
          <span
            key={i}
            className="flex shrink-0 items-center gap-3 pr-8 text-xs font-bold uppercase tracking-[0.22em] text-ink-soft"
          >
            {t}
            <FlowerMotif petal={i % 2 === 0 ? "#e6918e" : "#f2ab2f"} className="h-3.5 w-3.5" />
          </span>
        ))}
      </div>
    </div>
  );
}