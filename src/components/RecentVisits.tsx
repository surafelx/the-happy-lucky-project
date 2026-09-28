import Link from "next/link";

import { KIND_EMOJI } from "@/data/work";
import type { Visit } from "@/lib/store";

/**
 * The last places we turned up, above the join box on the home page. Plain
 * lines rather than a card: the point is that something real happened, not the
 * frame around it. Nothing shows until there is a visit to show.
 */
export function RecentVisits({ visits }: { visits: Visit[] }) {
  if (visits.length === 0) return null;
  return (
    <section className="recent" aria-labelledby="recent-h">
      <div className="recent-head">
        <span className="eyebrow" id="recent-h">Recent visits</span>
        <Link href="/visits">All of them →</Link>
      </div>
      <ul>
        {visits.map((v) => (
          <li key={v.id}>
            <b>
              <span aria-hidden="true">{KIND_EMOJI[v.kind]}</span> {v.name}
              {v.now ? <i className="recent-now">now</i> : null}
            </b>
            <span className="recent-where">{v.town}</span>
            <p>{v.what}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
