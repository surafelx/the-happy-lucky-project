"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";

import { Logo } from "@/components/SvgDefs";

export type AdminTab = { key: string; label: string; icon: string; badge?: number | string };

/**
 * The frame both dashboards share: a dark sidebar with sections, a top bar
 * with the section title and whoever is signed in, and a light work area.
 * The active section is kept in the URL hash so links and reloads land on it.
 */
export function AdminShell({
  product,
  tabs,
  active,
  onTab,
  who,
  actions,
  onSignOut,
  children,
}: {
  product: string;
  tabs: AdminTab[];
  active: string;
  onTab: (key: string) => void;
  who: { name: string; role: string; initial: string; photo?: string | null };
  actions?: ReactNode;
  onSignOut?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  const pick = (key: string) => {
    onTab(key);
    setOpen(false);
  };

  return (
    <div className="admin">
      <aside className={`admin-side${open ? " open" : ""}`}>
        <div className="admin-brand">
          <Link href="/" aria-label="Back to the site">
            <Logo />
          </Link>
          <div>
            <b>{product}</b>
            <small>Happy Lucky Chacho</small>
          </div>
        </div>
        <nav className="admin-nav" aria-label="Sections">
          {tabs.map((t) => (
            <button key={t.key} type="button" className={t.key === active ? "on" : ""} onClick={() => pick(t.key)} aria-current={t.key === active ? "page" : undefined}>
              <span className="ic" aria-hidden="true">{t.icon}</span>
              <span>{t.label}</span>
              {t.badge !== undefined && t.badge !== 0 ? <em>{t.badge}</em> : null}
            </button>
          ))}
        </nav>
        <div className="admin-side-foot">
          <div className="admin-who">
            {who.photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- private, unoptimised local file
              <img src={who.photo} alt="" />
            ) : (
              <i>{who.initial}</i>
            )}
            <div>
              <b>{who.name}</b>
              <small>{who.role}</small>
            </div>
          </div>
          {onSignOut ? (
            <button type="button" className="admin-signout" onClick={onSignOut}>
              Sign out
            </button>
          ) : null}
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-top">
          <button type="button" className="admin-burger" aria-label="Sections" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            ☰
          </button>
          <h1>{current.label}</h1>
          <div className="admin-actions">{actions}</div>
        </header>
        <div className="admin-body">{children}</div>
      </div>
      {open ? <button type="button" className="admin-scrim" aria-label="Close sections" onClick={() => setOpen(false)} /> : null}
    </div>
  );
}

/** Reads and writes the active section in the URL hash. */
export function useHashTab(defaultKey: string, keys: string[]): [string, (k: string) => void] {
  const [tab, setTab] = useState(defaultKey);
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.replace("#", "");
      if (keys.includes(h)) setTab(h);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const go = (k: string) => {
    setTab(k);
    if (typeof window !== "undefined") window.history.replaceState(null, "", `#${k}`);
  };
  return [tab, go];
}
