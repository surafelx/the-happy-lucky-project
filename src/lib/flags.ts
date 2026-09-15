/**
 * Feature flags. NEXT_PUBLIC_* values are inlined at build time, so they work
 * in client components too. `.env.development` switches these on for `next dev`;
 * production stays off until the variable is set in Vercel.
 */
export const MENTOR_FORM_ENABLED = process.env.NEXT_PUBLIC_MENTOR_FORM === "1";
