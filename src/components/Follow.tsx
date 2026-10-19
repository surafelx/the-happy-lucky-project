import { liveChannels } from "@/data/channels";

/** The platform's own mark, drawn rather than fetched, so nothing loads from them. */
function Mark({ kind }: { kind: "youtube" | "telegram" }) {
  if (kind === "youtube") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8Z"
        />
        <path fill="var(--paper)" d="M9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11.4" fill="currentColor" />
      <path
        fill="var(--paper)"
        d="M5.6 11.7 16.8 7.4c.5-.2 1 .1.8.8l-1.9 9c-.1.6-.5.8-1 .5l-2.8-2.1-1.3 1.3c-.2.2-.3.3-.6.3l.2-3 5.4-4.9c.2-.2 0-.3-.3-.1l-6.7 4.2-2.9-.9c-.6-.2-.6-.6.1-.9Z"
      />
    </svg>
  );
}

/**
 * Where to follow between Sundays. Renders nothing at all when no channel has a
 * handle yet, so the site never shows an empty "follow us" with nowhere to go.
 */
export function Follow({ title = "Follow along" }: { title?: string }) {
  const channels = liveChannels();
  if (!channels.length) return null;
  return (
    <div className="follow">
      <span className="eyebrow">{title}</span>
      <ul>
        {channels.map((c) => (
          <li key={c.key}>
            <a className={`follow-card ${c.key}`} href={c.href} target="_blank" rel="noopener">
              <i aria-hidden="true">
                <Mark kind={c.key} />
              </i>
              <span>
                <b>{c.name}</b>
                <small>{c.what}</small>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
