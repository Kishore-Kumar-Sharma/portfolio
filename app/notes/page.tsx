import type { Metadata } from "next";
import Link from "next/link";
import { listNotes, listTags, tagSlug } from "@/lib/notes";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Writing",
  description:
    "Long-form notes on architecture, distributed systems, microservices, and the engineering discipline behind production software.",
  alternates: { canonical: `${siteConfig.baseUrl}/notes` },
  openGraph: {
    title: "Writing — Kishore Kumar Sharma",
    description: "Notes on architecture, distributed systems, and shipping discipline.",
    type: "website",
    url: `${siteConfig.baseUrl}/notes`,
  },
};

export default function NotesIndex() {
  const notes = listNotes();
  const tags = listTags();

  return (
    <div className="min-h-screen pt-32 pb-24">
      <div className="container-narrow">
        <header className="mb-16 md:mb-20">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground mb-4">
            /writing
          </p>
          <h1 className="font-display text-display text-foreground tracking-[-0.03em] leading-[1.02] text-balance">
            Notes on building <span className="font-display-soft italic text-accent">things that hold</span>.
          </h1>
          <p className="mt-6 max-w-[58ch] text-body-lg text-muted-foreground text-pretty">
            Long-form thinking on architecture, distributed systems, and the discipline behind
            production software. What I share when I sit down to write rather than ship.
          </p>
        </header>

        {notes.length === 0 ? (
          <p className="font-mono text-[0.85rem] text-muted-foreground">
            No posts yet — first one is being drafted.
          </p>
        ) : (
          <ol className="divide-y divide-subtle/60">
            {notes.map((n) => (
              <li key={n.slug} className="py-7 first:pt-0 last:pb-0">
                <Link
                  href={`/notes/${n.slug}`}
                  className="group block"
                >
                  <div className="flex items-baseline justify-between gap-4 mb-3">
                    <time
                      dateTime={n.date}
                      className="font-mono text-[0.72rem] text-muted-foreground"
                    >
                      {formatDate(n.date)}
                    </time>
                    <span className="font-mono text-[0.7rem] text-muted-foreground">
                      {n.readMin} min read
                    </span>
                  </div>
                  <h2 className="font-display text-heading md:text-display-sm text-foreground tracking-[-0.025em] leading-[1.1] text-balance group-hover:text-accent transition-colors">
                    {n.title}
                  </h2>
                  <p className="mt-3 text-[0.95rem] text-muted-foreground leading-relaxed text-pretty max-w-[58ch]">
                    {n.description}
                  </p>
                  {n.tags && n.tags.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-x-1.5 gap-y-1.5">
                      {n.tags.map((t) => (
                        <li
                          key={t}
                          className="font-mono text-[0.7rem] text-muted-foreground"
                        >
                          #{t}
                        </li>
                      ))}
                    </ul>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        )}

        {tags.length > 0 && (
          <section className="mt-20 pt-8 border-t border-subtle/40">
            <p className="font-mono text-[0.7rem] uppercase tracking-widest text-muted-foreground mb-4">
              /tags
            </p>
            <ul className="flex flex-wrap gap-x-1.5 gap-y-1.5">
              {tags.map(({ tag, count }) => (
                <li key={tag}>
                  <Link
                    href={`/notes/tag/${tagSlug(tag)}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-subtle/60 font-mono text-[0.74rem] text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                  >
                    #{tag}
                    <span className="text-muted-foreground/60 num">{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-12 pt-6 border-t border-subtle/40 flex items-center justify-between">
          <Link
            href="/"
            className="font-mono text-[0.78rem] text-muted-foreground hover:text-foreground transition-colors"
          >
            ← back to portfolio
          </Link>
          <span className="font-mono text-[0.7rem] text-muted-foreground">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </span>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
