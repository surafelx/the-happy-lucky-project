/** Options for the organisation request form ("partners"). */

export const ORG_TYPES = ["School", "Children’s home", "Community centre", "Charity / NGO", "Library", "Something else"] as const;

export const NEED_OPTIONS = [
  "One-time workshop",
  "Regular mentoring",
  "Homework help",
  "Coding / tech club",
  "Reading club",
  "Art or music",
  "Career or university guidance",
  "Educational material",
  "Help running an event",
  "Laptops or equipment",
  "Something else",
] as const;

export const WHERE_OPTIONS = ["At our place", "At your Sunday centre", "Online"] as const;
export const WHEN_OPTIONS = ["This month", "In the next 3 months", "Whenever it fits"] as const;

export type OrgType = (typeof ORG_TYPES)[number];
export type NeedOption = (typeof NEED_OPTIONS)[number];
export type WhereOption = (typeof WHERE_OPTIONS)[number];
export type WhenOption = (typeof WHEN_OPTIONS)[number];

export const NEED_EMOJI: Record<NeedOption, string> = {
  "One-time workshop": "🎪",
  "Regular mentoring": "🤝",
  "Homework help": "📝",
  "Coding / tech club": "💻",
  "Reading club": "📚",
  "Art or music": "🎨",
  "Career or university guidance": "🧭",
  "Educational material": "📦",
  "Help running an event": "🎉",
  "Laptops or equipment": "🔌",
  "Something else": "✨",
};
export const ORG_EMOJI: Record<OrgType, string> = {
  School: "🏫",
  "Children’s home": "🏠",
  "Community centre": "🏟️",
  "Charity / NGO": "💛",
  Library: "📖",
  "Something else": "✨",
};
export const WHERE_EMOJI: Record<WhereOption, string> = { "At our place": "📍", "At your Sunday centre": "🌼", Online: "🌍" };
export const WHEN_EMOJI: Record<WhenOption, string> = { "This month": "⚡", "In the next 3 months": "📅", "Whenever it fits": "🍃" };

export type PartnerRequest = {
  org: string;
  type: OrgType;
  location: string;
  contact: string;
  email: string;
  phone: string;
  kids: string; // free text, e.g. "about 40, ages 8 to 14"
  needs: NeedOption[];
  needsOther: string;
  where: WhereOption[];
  when: WhenOption;
  note: string;
  safeguarding: boolean;
};
