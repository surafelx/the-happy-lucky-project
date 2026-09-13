import type { BrandColor } from "@/lib/colors";
import { brand } from "@/lib/colors";

export function ProgressBar({
  value,
  color = "rose",
  className = "",
}: {
  value: number;
  color?: BrandColor;
  className?: string;
}) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-2.5 w-full overflow-hidden rounded-full bg-ink/8 ${className}`}>
      <div
        className={`h-full rounded-full ${brand[color].bar} transition-[width] duration-700 ease-out`}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}