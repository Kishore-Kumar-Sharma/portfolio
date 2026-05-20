import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { siteConfig } from "@/config/site";
import { listSlugs, loadNoteMeta } from "@/lib/notes";

export const dynamic = "force-static";
export const revalidate = 3600;

export function generateStaticParams() {
  return listSlugs().map((slug) => ({ slug }));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const meta = loadNoteMeta(slug);
  // Drafts: 404 rather than serving the raw markdown.
  if (!meta || meta.draft) {
    return new Response("Not found", { status: 404 });
  }

  const notesDir = path.join(process.cwd(), "content", "notes");
  const mdPath = path.join(notesDir, `${slug}.md`);
  const mdxPath = path.join(notesDir, `${slug}.mdx`);
  const file = fs.existsSync(mdPath) ? mdPath : fs.existsSync(mdxPath) ? mdxPath : null;
  if (!file) return new Response("Not found", { status: 404 });

  const raw = fs.readFileSync(file, "utf8");
  const { content } = matter(raw);
  const canonical = `${siteConfig.baseUrl}/writing/${slug}`;

  const year = meta.date.slice(0, 4);
  const header = [
    `# ${meta.title}`,
    "",
    `> ${meta.description}`,
    "",
    `Author: Kishore K Sharma. Published: ${meta.date}. Canonical URL: ${canonical}. Tags: ${meta.tags.join(", ") || "—"}.`,
    `License: © ${year} Kishore K Sharma. All rights reserved. Reproduction requires attribution and a link to ${canonical}.`,
    "",
    "---",
    "",
  ].join("\n");

  const footer = [
    "",
    "---",
    "",
    `Originally published at ${canonical}.`,
    `© ${year} Kishore K Sharma. All rights reserved.`,
    "",
  ].join("\n");

  return new Response(header + content.trim() + footer, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
      "x-robots-tag": "all",
    },
  });
}
