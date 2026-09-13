import type { MediaFrame } from "@/data/media";
import { PinIllustration } from "@/components/PinIllustration";

export function MediaTile({
  frame,
  onSelect,
  className = "",
}: {
  frame: MediaFrame;
  onSelect?: (frame: MediaFrame) => void;
  className?: string;
}) {
  const inner = (
    <>
      <div className={`absolute inset-0 bg-gradient-to-br ${frame.gradient}`} />
      <div className="bg-dots absolute inset-0 opacity-45" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
      <PinIllustration
        kind={frame.pin}
        className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 opacity-90 shadow-pin transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6"
      />
      <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft backdrop-blur">
        {frame.type === "voices" ? "Audio" : frame.type}
      </span>
      <div className="absolute inset-x-0 bottom-0 p-4 text-cream">
        <p className="text-sm font-semibold leading-snug drop-shadow">
          {frame.title}
        </p>
        <p className="mt-0.5 text-[11px] text-cream/80">{frame.meta}</p>
      </div>
    </>
  );

  return (
    <div
      className={`group relative cursor-pointer overflow-hidden rounded-3xl shadow-card transition-all hover:-translate-y-1 hover:shadow-soft ${className}`}
      onClick={onSelect ? () => onSelect(frame) : undefined}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(frame);
              }
            }
          : undefined
      }
    >
      {inner}
    </div>
  );
}