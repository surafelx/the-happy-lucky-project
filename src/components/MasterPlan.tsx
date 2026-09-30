import Link from "next/link";

import { INITIATIVE_KIND_LABEL, INITIATIVE_STATUSES, INITIATIVE_STATUS_LABEL, INITIATIVE_STATUS_MEANS } from "@/lib/office";
import type { InitiativeStatus } from "@/lib/office";
import type { PlanItem, PublicPlan } from "@/lib/plan";

const fmt = (n: number) => n.toLocaleString("en-US");
const monthName = (m: string) => {
  const [y, mm] = m.split("-");
  const d = new Date(Number(y), Number(mm) - 1, 1);
  return Number.isNaN(d.getTime()) ? m : d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
};
const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** One thing we are doing, or have written down that we are not doing yet. */
function Item({ item }: { item: PlanItem }) {
  return (
    <article className={`plan-item ${item.status}`} id={item.id}>
      <header>
        <h3>{item.title}</h3>
        <p className="plan-tags">
          <span className={`plan-status ${item.status}`}>{INITIATIVE_STATUS_LABEL[item.status]}</span>
          <span className="plan-kind">{INITIATIVE_KIND_LABEL[item.kind]}</span>
          {item.since ? <span className="plan-since">since {item.since}</span> : null}
        </p>
      </header>
      <p className="plan-summary">{item.summary}</p>
      {item.detail ? <p>{item.detail}</p> : null}

      {item.funding ? (
        <div className="plan-money">
          <div className="goal-bar" role="img" aria-label={`${item.funding.pct}% of ${fmt(item.funding.target)} birr raised`}>
            <b style={{ width: `${item.funding.pct}%` }} />
          </div>
          <p className="num">
            <b>{fmt(item.funding.raised)}</b> of {fmt(item.funding.target)} ETB raised
            {item.funding.remaining > 0 ? <> · {fmt(item.funding.remaining)} to go</> : null}
            {item.funding.spent ? <> · {fmt(item.funding.spent)} spent</> : null}
          </p>
          <p className="plan-source">
            Counted from the ledger, not typed in here. <Link href="/audit">See every line</Link>.
          </p>
        </div>
      ) : item.kind === "venture" ? (
        <p className="plan-source venture">
          Never funded by donated money, and nothing it earns is counted as a gift. Kept apart from <Link href="/audit">the audit</Link> on purpose.
        </p>
      ) : null}

      {item.need ? (
        <p className="plan-line">
          <b>What it would take.</b> {item.need}
        </p>
      ) : null}
      {item.nextStep ? (
        <p className="plan-line">
          <b>Next.</b> {item.nextStep}
        </p>
      ) : null}
      {item.href ? (
        <p className="plan-go">
          <Link href={item.href}>See it →</Link>
        </p>
      ) : null}
    </article>
  );
}

export function MasterPlan({ plan }: { plan: PublicPlan }) {
  const groups = INITIATIVE_STATUSES.map((s) => ({ status: s, items: plan.items.filter((i) => i.status === s) })).filter((g) => g.items.length > 0);
  const months = [...new Set(plan.changed.map((c) => c.month))].sort().reverse();
  const latest = months[0] ?? "";
  const older = months.slice(1);
  const counts = (s: InitiativeStatus) => plan.items.filter((i) => i.status === s).length;

  return (
    <div className="wrap plan">
      <header className="plan-head">
        <span className="eyebrow">The master plan</span>
        <h1>
          What we are doing, <em>and what we are not</em>
        </h1>
        <p className="lede">
          Happy Lucky Chacho is young. Most of what is written here has not happened yet, and this page is built to say so rather than to look
          impressive. Everything is listed at the status it has actually earned, and the money is counted from the ledger rather than written down
          by hand.
        </p>
        <p className="plan-when">
          {plan.updatedAt ? <>Last changed {when(plan.updatedAt)}.</> : <>This is the plan as it was first written down.</>}{" "}
          {plan.live ? null : <span className="quiet">Showing the written record; the live version needs a database.</span>}
        </p>
      </header>

      <section className="plan-key" aria-labelledby="key-title">
        <h2 id="key-title">How to read this page</h2>
        <dl>
          {INITIATIVE_STATUSES.map((s) => (
            <div key={s}>
              <dt>
                <span className={`plan-status ${s}`}>{INITIATIVE_STATUS_LABEL[s]}</span>
                <em>{counts(s)}</em>
              </dt>
              <dd>{INITIATIVE_STATUS_MEANS[s]}</dd>
            </div>
          ))}
        </dl>
      </section>

      {plan.changed.length ? (
        <section className="plan-changed" aria-labelledby="changed-title">
          <h2 id="changed-title">What changed</h2>
          {latest ? (
            <>
              <h3>{monthName(latest)}</h3>
              <ul>
                {plan.changed.filter((c) => c.month === latest).map((c) => (
                  <li key={c.id}>{c.text}</li>
                ))}
              </ul>
            </>
          ) : null}
          {older.length ? (
            <details>
              <summary>Before that</summary>
              {older.map((m) => (
                <div key={m}>
                  <h3>{monthName(m)}</h3>
                  <ul>
                    {plan.changed.filter((c) => c.month === m).map((c) => (
                      <li key={c.id}>{c.text}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </details>
          ) : null}
        </section>
      ) : null}

      {groups.map((g) => (
        <section key={g.status} className="plan-group" aria-labelledby={`g-${g.status}`}>
          <h2 id={`g-${g.status}`}>
            {INITIATIVE_STATUS_LABEL[g.status]} <span className="num">{g.items.length}</span>
          </h2>
          <p className="plan-means">{INITIATIVE_STATUS_MEANS[g.status]}</p>
          <div className="plan-items">
            {g.items.map((i) => (
              <Item key={i.id} item={i} />
            ))}
          </div>
        </section>
      ))}

      {plan.items.length === 0 ? <p className="office-empty">Nothing is written down yet.</p> : null}

      <section className="plan-how" aria-labelledby="how-title">
        <h2 id="how-title">
          How this page stays <em>honest</em>
        </h2>
        <ul>
          <li>
            <b>No number is typed in here.</b> Where something is funded, it points at a goal in the ledger, and the amount shown is whatever the
            ledger says today. If the two ever disagree, this page is wrong and <Link href="/audit">the audit</Link> is right.
          </li>
          <li>
            <b>A venture never touches donated money.</b> The rule is enforced where the data is saved, not just promised here: a venture cannot be
            attached to a goal at all.
          </li>
          <li>
            <b>Nothing is upgraded to look better.</b> An idea stays an idea until there is something real to point at. Things that stopped stay on
            the page, marked paused, with the reason.
          </li>
          <li>
            <b>No child is named.</b> Nothing here identifies a child or anyone we work with. A story is never worth someone&rsquo;s privacy.
          </li>
          <li>
            <b>It is edited in the office, not in the code.</b> This page is the database read out, so it changes the day the work does.
          </li>
        </ul>
      </section>
    </div>
  );
}
