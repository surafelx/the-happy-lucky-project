/** Options for the mentor interest form. Keep these in sync with the sheet columns. */

export const SHARE_OPTIONS = [
  "Technology",
  "Programming",
  "Science",
  "Medicine",
  "Engineering",
  "Art",
  "Music",
  "Writing",
  "Business",
  "Entrepreneurship",
  "Languages",
  "Mathematics",
  "Career guidance",
  "University guidance",
  "Something else",
] as const;

export const CONTRIBUTE_OPTIONS = [
  "One-time workshop",
  "Monthly workshop",
  "Weekly group mentor",
  "Long-term mentor",
  "Create educational material",
  "Help organize events",
  "Help remotely",
  "Help in person",
  "Not sure yet",
] as const;

export type ShareOption = (typeof SHARE_OPTIONS)[number];
export type ContributeOption = (typeof CONTRIBUTE_OPTIONS)[number];

/** An emoji for every option, so the cards read at a glance. */
export const OPTION_EMOJI: Record<ShareOption | ContributeOption, string> = {
  Technology: "💻",
  Programming: "👩‍💻",
  Science: "🔬",
  Medicine: "🩺",
  Engineering: "⚙️",
  Art: "🎨",
  Music: "🎵",
  Writing: "✍️",
  Business: "💼",
  Entrepreneurship: "🚀",
  Languages: "🗣️",
  Mathematics: "➗",
  "Career guidance": "🧭",
  "University guidance": "🎓",
  "Something else": "✨",
  "One-time workshop": "🎪",
  "Monthly workshop": "📅",
  "Weekly group mentor": "👥",
  "Long-term mentor": "🤝",
  "Create educational material": "📚",
  "Help organize events": "🎉",
  "Help remotely": "🌍",
  "Help in person": "📍",
  "Not sure yet": "🤔",
};

export type MentorInterest = {
  name: string;
  email: string;
  location: string;
  share: ShareOption[];
  shareOther: string;
  contribute: ContributeOption[];
  note: string;
};
