/**
 * Where to follow the work between Sundays.
 *
 * A channel with an empty handle is not rendered at all, so a half-filled entry
 * here can never put a broken link on the site. Add the handle and it appears.
 *
 * Neither platform can embed a feed without keys: YouTube's needs an API key and
 * a quota, and Telegram's widget embeds one post, not a channel. So these are
 * links out, drawn as cards, which costs nothing and never breaks.
 */
export type Channel = {
  key: "youtube" | "telegram";
  name: string;
  /** The handle without its @ or t.me prefix. Empty means "not set up yet". */
  handle: string;
  href: string;
  what: string;
};

export const CHANNELS: Channel[] = [
  {
    key: "youtube",
    name: "YouTube",
    handle: "happyluckychacho",
    href: "https://www.youtube.com/@happyluckychacho",
    what: "Every Sunday, filmed",
  },
  {
    key: "telegram",
    name: "Telegram",
    // Not set yet. Put the channel's handle here and the card appears by itself.
    handle: "",
    href: "",
    what: "The week in between",
  },
];

export const liveChannels = (): Channel[] => CHANNELS.filter((c) => c.handle && c.href);
