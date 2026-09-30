import type { PublicBooks } from "./books.ts";

/** One entry as the public feed gives it. */
export type PublicEntry = PublicBooks["entries"][number];

/** Money given without naming a goal sits in the general fund, which is not a row in `goals`. */
export const GENERAL_ID = "general";
export const GENERAL_COLOR = "#C9B98A";
