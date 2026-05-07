import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listTags, notesByTag, tagSlug } from "@/lib/notes";
import { siteConfig } from "@/config/site";

interface Props {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  return listTags().map(({ tag }) => ({ tag: tagSlug(tag) }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const tag = decodeURIComponent(params.tag);
  const url = `${siteConfig.baseUrl}/notes/tag/${tagSlug(tag)}`;
  return {
    title: `#${tag}`,
    description: `Notes tagged ${tag} by Kishore Kumar Sharma.`,
    alternates: { canonical: url },
    openGraph: {
      title: `Notes tagged #${tag}`,
      description: `Long-form thinking tagged ${tag}.`,
      url,
      type: "website",
    },
  };
}

export default async function TagPage(props: Props) {
  const params = await props.params;
  // Resolve slug back to original tag (case-insensitive match against listTags)
  const slug = decodeURIComponent(params.tag);
  const all = listTags();
  const match = all.find((t) => tagSlug(t.tag) === slug);
  if (!match) notFound();

  const notes = notesByTag(match.tag);
  if (notes.length === 0) notFound();

  return (
    <div className="min-h-screen pt-32 pb-24">
      <div className="container-narrow">
        <Link
          href="/notes"
          className="font-mono text-[0.72rem] text-muted-foreground hover:text-foreground transition-colors"
        >
          ← writing
        </Link>

        <header className="mt-8 mb-14">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            /tag
          </p>
          <h1 className="font-display text-display-sm md:text-display text-foreground tracking-[-0.03em] leading-[1.02] text-balance">
            #{match.tag}
          </h1>
          <p className="mt-4 font-mono text-[0.78rem] text-muted-foreground">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </p>
        </header>

        <ol className="divide-y divide-subtle/60">
          {notes.map((n) => (
            <li key={n.slug} className="py-7 first:pt-0 last:pb-0">
              <Link href={`/notes/${n.slug}`} className="group block">
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
                <h2 className="font-display text-heading text-foreground tracking-[-0.025em] leading-[1.1] text-balance group-hover:text-accent transition-colors">
                  {n.title}
                </h2>
                <p className="mt-3 text-[0.94rem] text-muted-foreground leading-relaxed text-pretty max-w-[58ch]">
                  {n.description}
                </p>
              </Link>
            </li>
          ))}
        </ol>

        <div className="mt-14 pt-6 border-t border-subtle/40">
          <Link
            href="/notes"
            className="font-mono text-[0.78rem] text-muted-foreground hover:text-foreground transition-colors"
          >
            ← all notes
          </Link>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
