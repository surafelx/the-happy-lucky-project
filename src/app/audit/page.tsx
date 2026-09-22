import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { booksEnabled, publicBooks } from "@/lib/books";
import type { PublicBooks } from "@/lib/books";
import { OpenBooks } from "@/components/OpenBooks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Audit",
  description: "The audit: what Happy Lucky Chacho has, what it needs, and where every birr went. Every gift and every payment, with receipts, drawn as a sky of stars.",
};

/** The public audit. Local only until the mentor flag goes on, and on Vercel only with a database. */
export default async function OpenBooksPage() {
  if (!booksEnabled()) notFound();
  let initial: PublicBooks | null = null;
  try {
    initial = await publicBooks();
  } catch (err) {
    console.error("[audit] read failed:", err); // the page still renders and the client tries again
  }
  return (
    <div className="page page-enter books-page light" data-theme="light">
      <OpenBooks initial={initial} />
    </div>
  );
}
