/** Fire the petal confetti drawn by <Confetti />. Defaults to the centre of the viewport. */
export function burst(x?: number, y?: number, n = 90) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("hlp:burst", {
      detail: { x: x ?? window.innerWidth / 2, y: y ?? window.innerHeight / 2, n },
    }),
  );
}

/** Show a short message in the <Toast /> pill at the bottom of the screen. */
export function toast(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("hlp:toast", { detail: { message } }));
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
