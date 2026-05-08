import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { listSlugs, loadNote } from "@/lib/notes";
import { safeJsonLd } from "@/lib/json-ld";
import { siteConfig } from "@/config/site";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return listSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const note = loadNote(params.slug);
  if (!note) return {};
  const url = `${siteConfig.baseUrl}/notes/${note.slug}`;
  return {
    title: note.title,
    description: note.description,
    alternates: { canonical: url },
    openGraph: {
      title: note.title,
      description: note.description,
      type: "article",
      url,
      publishedTime: note.date,
      authors: ["Kishore Kumar Sharma"],
      tags: note.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: note.title,
      description: note.description,
    },
  };
}

export default async function NotePage(props: Props) {
  const params = await props.params;
  const note = loadNote(params.slug);
  if (!note) notFound();

  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const url = `${siteConfig.baseUrl}/notes/${note.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: note.title,
    description: note.description,
    author: {
      "@type": "Person",
      name: "Kishore Kumar Sharma",
      url: siteConfig.baseUrl,
    },
    datePublished: note.date,
    url,
    keywords: note.tags?.join(", "),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  return (
    <article className="min-h-screen pt-32 pb-24">
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <div className="container-narrow">
        <header className="mb-12">
          <Link
            href="/notes"
            className="font-mono text-[0.72rem] text-muted-foreground hover:text-foreground transition-colors"
          >
            ← writing
          </Link>
          <div className="mt-8 flex items-baseline justify-between gap-4 mb-5">
            <time dateTime={note.date} className="font-mono text-[0.72rem] text-muted-foreground">
              {formatDate(note.date)}
            </time>
            <span className="font-mono text-[0.7rem] text-muted-foreground">
              {note.readMin} min read
            </span>
          </div>
          <h1 className="font-display text-display-sm md:text-display text-foreground tracking-[-0.03em] leading-[1.02] text-balance">
            {note.title}
          </h1>
          <p className="mt-6 max-w-[58ch] text-body-lg text-muted-foreground text-pretty">
            {note.description}
          </p>
          {note.tags && note.tags.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-x-1.5 gap-y-1.5">
              {note.tags.map((t) => (
                <li key={t} className="font-mono text-[0.7rem] text-muted-foreground">
                  #{t}
                </li>
              ))}
            </ul>
          )}
        </header>

        <div
          className="prose prose-neutral dark:prose-invert
                     max-w-none
                     prose-headings:font-display prose-headings:tracking-[-0.02em] prose-headings:text-balance
                     prose-h2:text-heading prose-h2:mt-14 prose-h2:mb-5
                     prose-h3:text-heading-sm prose-h3:mt-10 prose-h3:mb-4
                     prose-p:text-foreground/90 prose-p:leading-[1.7] prose-p:text-pretty
                     prose-a:text-accent prose-a:font-medium prose-a:no-underline hover:prose-a:underline
                     prose-strong:text-foreground prose-strong:font-semibold
                     prose-em:text-foreground prose-em:font-display-soft
                     prose-code:font-mono prose-code:text-[0.88em] prose-code:bg-surface prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                     prose-pre:bg-surface prose-pre:border prose-pre:border-subtle/60 prose-pre:rounded-lg
                     prose-blockquote:border-l-accent prose-blockquote:not-italic prose-blockquote:font-normal prose-blockquote:text-foreground/80
                     prose-li:text-foreground/90 prose-li:leading-[1.7]
                     prose-hr:border-subtle/60 prose-hr:my-12
                     prose-img:rounded-lg prose-img:border prose-img:border-subtle/60 prose-img:my-0
                     prose-figure:my-10 prose-figure:flex prose-figure:flex-col prose-figure:items-center
                     prose-figcaption:font-mono prose-figcaption:text-[0.78rem] prose-figcaption:text-muted-foreground prose-figcaption:mt-3 prose-figcaption:text-center prose-figcaption:max-w-[50ch]"
          dangerouslySetInnerHTML={{ __html: note.html }}
        />

        <footer className="mt-16 pt-8 border-t border-subtle/60">
          <p className="font-mono text-[0.78rem] text-muted-foreground mb-4">
            written by Kishore Kumar Sharma · {formatDate(note.date)}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/notes"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-subtle text-foreground text-[0.85rem] hover:border-foreground/40 transition-colors"
            >
              ← more notes
            </Link>
            <Link
              href="/#contact"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-foreground text-background text-[0.85rem] hover:opacity-90 transition-opacity"
            >
              get in touch <span aria-hidden>→</span>
            </Link>
          </div>
        </footer>
      </div>
    </article>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

