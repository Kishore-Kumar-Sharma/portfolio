import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import portfolioData from "@/data/portfolio.json";

export interface WorkFrontmatter {
  title: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  domain: "telecom" | "fintech" | "edtech" | "govtech";
  summary: string;
  /** Quantified outcomes — appear in the case-study header band. */
  outcomes: { label: string; value: string }[];
  /** Technologies — used for filter chips and site-wide search. */
  stack: string[];
  /** Optional cover image path (in /public). */
  cover?: string;
  draft?: boolean;
}

export interface WorkCase extends WorkFrontmatter {
  slug: string;
  html: string;
  raw: string;
}

const WORK_DIR = path.join(process.cwd(), "content", "work");

export function listWork({ includeDrafts = false } = {}): WorkCase[] {
  if (!fs.existsSync(WORK_DIR)) return [];
  const files = fs.readdirSync(WORK_DIR).filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));
  return files
    .map((file) => loadWork(file.replace(/\.(md|mdx)$/, "")))
    .filter((w): w is WorkCase => !!w)
    .filter((w) => includeDrafts || !w.draft)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export function loadWork(slug: string): WorkCase | null {
  const mdPath = path.join(WORK_DIR, `${slug}.md`);
  const mdxPath = path.join(WORK_DIR, `${slug}.mdx`);
  const file = fs.existsSync(mdPath) ? mdPath : fs.existsSync(mdxPath) ? mdxPath : null;
  if (!file) return null;

  const raw = fs.readFileSync(file, "utf8");
  const parsed = matter(raw);
  const fm = parsed.data as Partial<WorkFrontmatter>;
  if (!fm.title || !fm.company || !fm.role || !fm.startDate || !fm.endDate || !fm.domain || !fm.summary) {
    return null;
  }

  const rawHtml = marked.parse(parsed.content, { async: false }) as string;
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
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: true,
    transformTags: {
      a: (tagName, attribs) => {
        const out = { ...attribs };
        if (out.target === "_blank") out.rel = "noopener noreferrer";
        return { tagName, attribs: out };
      },
    },
  });

  return {
    slug,
    raw: parsed.content,
    html,
    title: fm.title,
    company: fm.company,
    role: fm.role,
    startDate: fm.startDate,
    endDate: fm.endDate,
    domain: fm.domain,
    summary: fm.summary,
    outcomes: fm.outcomes ?? [],
    stack: fm.stack ?? [],
    cover: fm.cover,
    draft: fm.draft ?? false,
  };
}

export function listWorkSlugs(): string[] {
  return listWork().map((w) => w.slug);
}

/**
 * Heuristic: link a case-study slug to one of the experience entries
 * in portfolio.json so we can cross-reference dates / company info.
 */
export function findExperienceFor(work: WorkCase) {
  return portfolioData.experience.find((e) => e.company.toLowerCase().includes(work.company.toLowerCase().split(" ")[0]));
}
