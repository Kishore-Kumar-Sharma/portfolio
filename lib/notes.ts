import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked, type Tokens } from "marked";
import sanitizeHtml from "sanitize-html";

// Allowlist of URL schemes for image src — everything else is dropped to "#".
// http/https/protocol-relative/site-relative all OK; mailto/tel never on images.
const SAFE_IMG_SCHEME = /^(https?:\/\/|\/\/?|#)/i;

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Render images as <figure> blocks: lazy-loaded, async-decoded, with optional caption
// derived from markdown title syntax: ![alt](src "caption text").
// All values are escaped; src scheme is allowlisted.
marked.use({
  renderer: {
    image(token: Tokens.Image) {
      const { href, title, text } = token;
      const safeHref = SAFE_IMG_SCHEME.test(href) ? escapeAttr(href) : "#";
      const safeAlt = escapeAttr(text ?? "");
      const captionHtml = title
        ? `<figcaption>${escapeText(title)}</figcaption>`
        : "";
      return `<figure><img src="${safeHref}" alt="${safeAlt}" loading="lazy" decoding="async" />${captionHtml}</figure>`;
    },
  },
});

export interface NoteFrontmatter {
  title: string;
  description: string;
  date: string; // ISO YYYY-MM-DD
  tags?: string[];
  /** Estimated read time in minutes; computed if absent. */
  readMin?: number;
  draft?: boolean;
}

export interface Note extends NoteFrontmatter {
  slug: string;
  content: string; // raw markdown
  html: string;    // rendered HTML
  readMin: number; // always present after load
}

const NOTES_DIR = path.join(process.cwd(), "content", "notes");

function wordsPerMinute(text: string): number {
  const words = text.replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function listNotes({ includeDrafts = false } = {}): Note[] {
  if (!fs.existsSync(NOTES_DIR)) return [];
  const files = fs.readdirSync(NOTES_DIR).filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));
  const notes: Note[] = files
    .map((file) => loadNote(file.replace(/\.(md|mdx)$/, "")))
    .filter((n): n is Note => !!n)
    .filter((n) => includeDrafts || !n.draft);
  return notes.sort((a, b) => b.date.localeCompare(a.date));
}

export function loadNote(slug: string): Note | null {
  const mdPath = path.join(NOTES_DIR, `${slug}.md`);
  const mdxPath = path.join(NOTES_DIR, `${slug}.mdx`);
  const file = fs.existsSync(mdPath) ? mdPath : fs.existsSync(mdxPath) ? mdxPath : null;
  if (!file) return null;

  const raw = fs.readFileSync(file, "utf8");
  const parsed = matter(raw);
  const fm = parsed.data as Partial<NoteFrontmatter>;
  if (!fm.title || !fm.description || !fm.date) return null;

  const rawHtml = marked.parse(parsed.content, { async: false }) as string;
  // Strip <script>, on* event handlers, javascript: / data: URIs, etc.
  // Allowlist preserves the markdown surface we actually use plus our figure renderer.
  const html = sanitizeHtml(rawHtml, {
    allowedTags: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "blockquote", "ul", "ol", "li",
      "strong", "em", "code", "pre", "hr", "br",
      "a", "img", "figure", "figcaption",
      "table", "thead", "tbody", "tr", "th", "td",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "loading", "decoding"],
      code: ["class"],
      pre: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    // Same-host-relative + protocol-relative are also OK for img/a
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: true,
    // Force external links to open safely if they happen to use target="_blank"
    transformTags: {
      a: (tagName, attribs) => {
        const out = { ...attribs };
        if (out.target === "_blank") {
          out.rel = "noopener noreferrer";
        }
        return { tagName, attribs: out };
      },
    },
  });

  return {
    slug,
    title: fm.title,
    description: fm.description,
    date: fm.date,
    tags: fm.tags ?? [],
    draft: fm.draft ?? false,
    readMin: fm.readMin ?? wordsPerMinute(parsed.content),
    content: parsed.content,
    html,
  };
}

export function listSlugs(): string[] {
  return listNotes().map((n) => n.slug);
}

/** All tags across published notes, with post count, sorted by frequency desc. */
export function listTags(): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const n of listNotes()) {
    for (const t of n.tags ?? []) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function notesByTag(tag: string): Note[] {
  const t = tag.toLowerCase();
  return listNotes().filter((n) => (n.tags ?? []).some((x) => x.toLowerCase() === t));
}

/** Slugify a tag for URL use (preserve simple cases, lowercase, hyphenate). */
export function tagSlug(tag: string): string {
  return tag.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
