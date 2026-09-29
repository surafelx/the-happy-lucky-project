import Link from "next/link";

import { KIND_EMOJI } from "@/data/work";
import type { Visit } from "@/lib/store";

/**
 * The last places we turned up, in the middle of the join card. Plain lines:
 * the card around them already has a frame, and the point is that something
 * real happened, not the box it sits in.
 */
export function RecentVisits({ visits }: { visits: Visit[] }) {
  if (visits.length === 0) return null;
  return (
    <div className="recent">
      <div className="recent-head">
        <span className="eyebrow">Recent visits</span>
        <Link href="/visits">All of them →</Link>
      </div>
      <ul>
        {visits.map((v) => (
          <li key={v.id}>
            <b>
              <span aria-hidden="true">{KIND_EMOJI[v.kind]}</span> {v.name}
              {v.now ? <i className="recent-now">now</i> : null}
              <span className="recent-where">{v.town}</span>
            </b>
            <p>{v.what}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
