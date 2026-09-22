import { addDays } from "./office.ts";
import { logActivity } from "./store.ts";

/**
 * What the office should notice and do, written to the activity log the moment
 * something happens. Each event is one "system" line plus, where a human needs
 * to act, one reminder with a due date. Failing to log never fails the request.
 */
type Person = { id: string; name: string };
const quiet = (p: Promise<unknown>) => p.catch((err) => console.error("[crm] could not log:", err));

export const crm = {
  joined(email: string) {
    return quiet(logActivity({ subjectKind: "subscriber", subjectId: email, subjectName: email, kind: "system", text: "Joined the letter." }));
  },
  mentorApplied(m: Person, at = new Date()) {
    return quiet(
      Promise.all([
        logActivity({ subjectKind: "mentor", subjectId: m.id, subjectName: m.name, kind: "system", text: "Sent the mentor interest form." }),
        logActivity({ subjectKind: "mentor", subjectId: m.id, subjectName: m.name, kind: "reminder", text: `Reply to ${m.name.split(" ")[0]} and invite them to a Sunday.`, dueAt: addDays(at, 2) }),
      ]),
    );
  },
  requestReceived(p: Person, at = new Date()) {
    return quiet(
      Promise.all([
        logActivity({ subjectKind: "partner", subjectId: p.id, subjectName: p.name, kind: "system", text: "Asked the community for help." }),
        logActivity({ subjectKind: "partner", subjectId: p.id, subjectName: p.name, kind: "reminder", text: `Write back to ${p.name} and suggest mentors.`, dueAt: addDays(at, 2) }),
      ]),
    );
  },
  pledged(p: Person, amount: number, at = new Date()) {
    return quiet(
      Promise.all([
        logActivity({ subjectKind: "pledge", subjectId: p.id, subjectName: p.name, kind: "system", text: `Pledged ${amount.toLocaleString("en-US")} birr.` }),
        logActivity({ subjectKind: "pledge", subjectId: p.id, subjectName: p.name, kind: "reminder", text: `Send ${p.name.split(" ")[0]} the payment details.`, dueAt: addDays(at, 2) }),
      ]),
    );
  },
  proofSent(p: Person, at = new Date()) {
    return quiet(
      Promise.all([
        logActivity({ subjectKind: "pledge", subjectId: p.id, subjectName: p.name, kind: "system", text: "Sent proof of payment." }),
        logActivity({ subjectKind: "pledge", subjectId: p.id, subjectName: p.name, kind: "reminder", text: `Verify ${p.name.split(" ")[0]}'s receipt against the account.`, dueAt: addDays(at, 1) }),
      ]),
    );
  },
  subscribed(s: Person, plan: string, amount: number, at = new Date()) {
    return quiet(
      Promise.all([
        logActivity({ subjectKind: "subscription", subjectId: s.id, subjectName: s.name, kind: "system", text: `Chose the ${plan} plan, ${amount.toLocaleString("en-US")} birr a month.` }),
        logActivity({ subjectKind: "subscription", subjectId: s.id, subjectName: s.name, kind: "reminder", text: `Send ${s.name.split(" ")[0]} the payment details and confirm the first month.`, dueAt: addDays(at, 3) }),
      ]),
    );
  },
  /** Anything the office changes by hand, so the timeline shows it. */
  changed(kind: "mentor" | "partner" | "pledge" | "subscription", p: Person, text: string) {
    return quiet(logActivity({ subjectKind: kind, subjectId: p.id, subjectName: p.name, kind: "system", text }));
  },
};
