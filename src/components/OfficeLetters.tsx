"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type Block =
  | { type: "p" | "key" | "sign"; text: string }
  | { type: "image"; caption: string; alt: string; src?: string; tone?: string }
  | { type: "video"; youtubeId: string; title: string; caption?: string; tone?: string };
type Letter = { slug: string; title: string; date: string; summary: string; body: Block[]; draft: boolean; updatedAt: string };
type Draft = { slug: string; title: string; date: string; summary: string; text: string; draft: boolean };

/**
 * A letter is written here as plain text, one block per paragraph, and the lines
 * that start with a word and a colon become something other than a paragraph:
 *
 *   key:      a line that stands out
 *   sign:     the sign-off
 *   image:    caption | what it shows | /path.jpg
 *   video:    the bit after v= | the title | an optional caption
 *
 * A blank line starts a new block. Anything that does not fit is dropped when the
 * letter is saved, so a typo costs a paragraph and never breaks the page.
 */
function toText(body: Block[]): string {
  return body
    .map((b) => {
      if (b.type === "key") return `key: ${b.text}`;
      if (b.type === "sign") return `sign: ${b.text}`;
      if (b.type === "image") return `image: ${b.caption} | ${b.alt}${b.src ? ` | ${b.src}` : ""}`;
      if (b.type === "video") return `video: ${b.youtubeId} | ${b.title}${b.caption ? ` | ${b.caption}` : ""}`;
      return b.text;
    })
    .join("\n\n");
}

function fromText(text: string): Block[] {
  return text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk): Block | null => {
      const m = /^(key|sign):\s*([\s\S]+)$/i.exec(chunk);
      if (m) return { type: m[1].toLowerCase() as "key" | "sign", text: m[2].trim() };
      const img = /^image:\s*([\s\S]+)$/i.exec(chunk);
      if (img) {
        const [caption = "", alt = "", src = ""] = img[1].split("|").map((s) => s.trim());
        return { type: "image", caption, alt, ...(src ? { src } : {}) };
      }
      const vid = /^video:\s*([\s\S]+)$/i.exec(chunk);
      if (vid) {
        const [youtubeId = "", title = "", caption = ""] = vid[1].split("|").map((s) => s.trim());
        return { type: "video", youtubeId, title, ...(caption ? { caption } : {}) };
      }
      return { type: "p", text: chunk };
    })
    .filter((b): b is Block => b !== null);
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const empty = (): Draft => ({ slug: "", title: "", date: "", summary: "", text: "", draft: false });
const from = (l: Letter): Draft => ({ slug: l.slug, title: l.title, date: l.date, summary: l.summary, text: toText(l.body), draft: l.draft });

async function call(method: "POST" | "PATCH" | "DELETE", url: string, body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/** The Sunday letters: what is written, and writing or correcting the next one. */
export function OfficeLetters({ toast, onChanged }: { toast: (msg: string) => void; onChanged: () => void }) {
  const [letters, setLetters] = useState<Letter[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/office/letters", { cache: "no-store" });
    if (!res.ok) return setError("The letters could not be loaded.");
    setLetters(((await res.json()) as { letters: Letter[] }).letters);
  }, []);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const counts = useMemo(() => {
    const body = (l: Letter) => l.body.filter((b) => "text" in b).map((b) => (b as { text: string }).text).join(" ").split(/\s+/).filter(Boolean).length;
    return (letters ?? []).map((l) => ({ slug: l.slug, words: body(l) }));
  }, [letters]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const body = fromText(draft.text);
    const payload = { slug: draft.slug, title: draft.title, date: draft.date, summary: draft.summary, body, draft: draft.draft };
    try {
      if (editing) await call("PATCH", "/api/office/letters", payload);
      else await call("POST", "/api/office/letters", payload);
      toast(editing ? "Letter saved" : "Letter written");
      setDraft(null);
      setEditing(false);
      await load();
      onChanged();
    } catch (x) {
      setError((x as Error).message);
    }
  };

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  return (
    <div className="asplit">
      <div className="apanel">
        <div className="ahead">
          <h2>Sundays</h2>
          <span className="quiet">{letters?.length ?? 0} written</span>
        </div>
        {error ? <p className="office-empty">{error}</p> : null}
        {!letters ? (
          <p className="office-empty">Loading…</p>
        ) : letters.length === 0 ? (
          <p className="office-empty">No letter yet. Write the first one.</p>
        ) : (
          <div className="tblwrap">
            <table className="atable">
              <thead>
                <tr><th>Letter</th><th>Sunday</th><th>Words</th><th>State</th><th /></tr>
              </thead>
              <tbody>
                {letters.map((l) => (
                  <tr key={l.slug}>
                    <td>
                      <b>{l.title}</b>
                      <small>/sundays/{l.slug}</small>
                      {l.summary ? <small>{l.summary}</small> : null}
                    </td>
                    <td>{l.date}</td>
                    <td className="num">{counts.find((c) => c.slug === l.slug)?.words ?? 0}</td>
                    <td>{l.draft ? <span className="chip">draft</span> : <span className="quiet">published</span>}</td>
                    <td>
                      <button type="button" className="abtn" onClick={() => { setError(""); setEditing(true); setDraft(from(l)); }}>Edit</button>{" "}
                      <a className="abtn" href={`/sundays/${l.slug}`} target="_blank" rel="noreferrer">Read</a>{" "}
                      <button
                        type="button"
                        className="abtn"
                        onClick={() => {
                          if (!confirm(`Take down ${l.title}? The address stays claimed.`)) return;
                          void call("DELETE", `/api/office/letters?slug=${encodeURIComponent(l.slug)}`)
                            .then(() => { toast("Letter taken down"); return load(); })
                            .then(onChanged)
                            .catch((x) => setError((x as Error).message));
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button type="button" className="abtn primary" onClick={() => { setError(""); setEditing(false); setDraft(empty()); }}>
          Write a letter
        </button>
      </div>

      {draft ? (
        <aside className="adetail" aria-label={editing ? "Correct this letter" : "Write a letter"}>
          <div className="ahead">
            <h2>{editing ? "Correct this letter" : "Write a letter"}</h2>
            <button type="button" className="aclose" aria-label="Close" onClick={() => setDraft(null)}>×</button>
          </div>
          <form onSubmit={save} className="aform">
            <label>
              Title
              <input
                value={draft.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setDraft((d) => (d ? { ...d, title, ...(editing || d.slug ? {} : { slug: slugify(title) }) } : d));
                }}
                required
              />
            </label>
            <label>
              Web address
              <input value={draft.slug} onChange={(e) => set("slug", slugify(e.target.value))} required disabled={editing} />
            </label>
            {editing ? <p className="quiet">The address cannot change: it has already been shared.</p> : null}
            <label>
              Which Sunday
              <input value={draft.date} onChange={(e) => set("date", e.target.value)} placeholder="September 27, 2026" required />
            </label>
            <label>
              One line for the card
              <textarea rows={2} value={draft.summary} onChange={(e) => set("summary", e.target.value)} />
            </label>
            <label>
              The letter
              <textarea rows={16} value={draft.text} onChange={(e) => set("text", e.target.value)} required />
            </label>
            <p className="quiet">
              Leave a blank line between blocks. A block may start with <b>key:</b>, <b>sign:</b>, <b>image:</b> or <b>video:</b>;
              an image is <code>caption | what it shows | /path.jpg</code> and a video is <code>the bit after v= | the title</code>.
            </p>
            <label className="check"><input type="checkbox" checked={draft.draft} onChange={(e) => set("draft", e.target.checked)} /> Draft: only visible locally</label>
            <div className="arow">
              <button type="submit" className="abtn primary">{editing ? "Save" : "Publish"}</button>
              <button type="button" className="abtn" onClick={() => { setDraft(null); setEditing(false); }}>Cancel</button>
            </div>
          </form>
        </aside>
      ) : null}
    </div>
  );
}
