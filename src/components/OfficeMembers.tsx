"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type Member = { email: string; at: string; source?: string };

const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * Everyone who joined the letter. These are email addresses, so this list never
 * leaves the office: it is not on any public page and not in the export of the
 * ledger. Someone who asks to be taken off is taken off, here.
 */
export function OfficeMembers({ toast, onChanged }: { toast: (msg: string) => void; onChanged: () => void }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [q, setQ] = useState("");
  const [paste, setPaste] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/office/subscribers", { cache: "no-store" });
    if (!res.ok) return setError("The list could not be loaded.");
    setMembers(((await res.json()) as { members: Member[] }).members);
  }, []);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (members ?? []).filter((m) => !needle || m.email.toLowerCase().includes(needle));
  }, [members, q]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shown.map((m) => m.email).join("\n"));
      toast(`${shown.length} addresses copied`);
    } catch {
      setError("The browser would not let the office copy that.");
    }
  };

  const importPaste = async (e: FormEvent) => {
    e.preventDefault();
    if (!paste.trim()) return;
    try {
      const res = await fetch("/api/office/subscribers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: paste, source: "sheet-import" }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; added?: number };
      if (!res.ok || !data.ok) throw new Error(data.error || "That could not be added.");
      toast(`${data.added ?? 0} added`);
      setPaste("");
      await load();
      onChanged();
    } catch (x) {
      setError((x as Error).message);
    }
  };

  const remove = async (email: string) => {
    if (!confirm(`Take ${email} off the list? The address is removed for good.`)) return;
    try {
      const res = await fetch(`/api/office/subscribers?email=${encodeURIComponent(email)}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "That could not be removed.");
      toast("Taken off the list");
      await load();
      onChanged();
    } catch (x) {
      setError((x as Error).message);
    }
  };

  return (
    <div className="apanel">
      <div className="ahead">
        <h2>Members</h2>
        <span className="quiet">{members?.length ?? 0} joined the letter</span>
      </div>
      <p className="quiet">Email addresses stay in the office. They are not published anywhere.</p>
      {error ? <p className="office-empty">{error}</p> : null}
      <div className="ahead">
        <input className="asearch" type="search" placeholder="Search an address…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="abtn" onClick={() => void copy()} disabled={!shown.length}>Copy {shown.length}</button>
      </div>
      {!members ? (
        <p className="office-empty">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="office-empty">{members.length === 0 ? "Nobody has joined yet." : "No address matches."}</p>
      ) : (
        <div className="tblwrap">
          <table className="atable">
            <thead>
              <tr><th>Email</th><th>Joined</th><th>Where from</th><th /></tr>
            </thead>
            <tbody>
              {shown.map((m) => (
                <tr key={m.email}>
                  <td><b>{m.email}</b></td>
                  <td>{when(m.at)}</td>
                  <td>{m.source || <span className="quiet">—</span>}</td>
                  <td><button type="button" className="abtn" onClick={() => void remove(m.email)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="ahead">
        <h2>Bring in emails</h2>
        <span className="quiet">paste the email column from the Google Sheet; duplicates are skipped</span>
      </div>
      <form className="aimport" onSubmit={importPaste}>
        <textarea rows={3} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="one@example.com&#10;two@example.com" aria-label="Emails to import" />
        <button type="submit" className="abtn primary" disabled={!paste.trim()}>Add to the list</button>
      </form>
    </div>
  );
}
