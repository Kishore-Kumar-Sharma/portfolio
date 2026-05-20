#!/usr/bin/env node
// Submit canonical URLs to the IndexNow aggregator so Bing, Yandex, and other
// participating engines pick up new and changed posts quickly. Google does not
// honour IndexNow — Google Search Console handles that side. Run manually with
// `npm run indexnow` or let the `postbuild` hook fire it on Vercel production
// deploys. Set INDEXNOW=off to skip (useful for preview builds).

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const KEY = "e5297f032cbe96f746c19445df82fc5a";
const BASE_URL = (process.env.BASE_URL || "https://kishorek.dev").replace(/\/$/, "");
const HOST = new URL(BASE_URL).host;
const ENDPOINT = "https://api.indexnow.org/IndexNow";

function listPublished(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      const { data } = matter(raw);
      return { slug: f.replace(/\.(md|mdx)$/, ""), draft: !!data.draft };
    })
    .filter((n) => !n.draft)
    .map((n) => n.slug);
}

function buildUrlList() {
  const noteSlugs = listPublished(path.join(process.cwd(), "content", "notes"));
  const workSlugs = listPublished(path.join(process.cwd(), "content", "work"));

  const urls = [
    `${BASE_URL}/`,
    `${BASE_URL}/about`,
    `${BASE_URL}/work`,
    `${BASE_URL}/writing`,
    `${BASE_URL}/uses`,
    ...noteSlugs.map((s) => `${BASE_URL}/writing/${s}`),
    ...workSlugs.map((s) => `${BASE_URL}/work/${s}`),
  ];
  return [...new Set(urls)];
}

async function main() {
  if (process.env.INDEXNOW === "off") {
    console.log("[indexnow] skipped (INDEXNOW=off)");
    return;
  }

  const urlList = buildUrlList();
  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: `${BASE_URL}/${KEY}.txt`,
    urlList,
  };

  console.log(`[indexnow] submitting ${urlList.length} URLs to ${HOST}`);

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  // IndexNow returns 200 (accepted) or 202 (accepted, will be processed).
  // 422 = key/host mismatch (verify /<key>.txt). 429 = too many requests.
  if (res.status === 200 || res.status === 202) {
    console.log(`[indexnow] ok (${res.status})`);
    return;
  }

  const body = await res.text().catch(() => "");
  console.error(`[indexnow] failed (${res.status}): ${body}`);
  process.exitCode = 1;
}

main().catch((err) => {
  console.error("[indexnow] error:", err);
  process.exitCode = 1;
});
