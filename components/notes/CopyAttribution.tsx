"use client";

import { useEffect } from "react";

/**
 * When a reader copies a substantial selection (≥ 40 chars) from a note page,
 * append a source attribution line to the clipboard. Short copies (code
 * identifiers, single words) are left untouched so legitimate copy-paste
 * still works cleanly. This doesn't *prevent* scraping — it just ensures the
 * provenance travels along with the text when humans (or LLM training
 * pipelines) ingest it.
 */
export function CopyAttribution({ url, author }: { url: string; author: string }) {
  useEffect(() => {
    function onCopy(e: ClipboardEvent) {
      const selection = window.getSelection()?.toString() ?? "";
      if (selection.length < 40) return;
      const year = new Date().getFullYear();
      const attribution = `\n\nSource: ${url}\n© ${year} ${author}. All rights reserved.`;
      e.clipboardData?.setData("text/plain", selection + attribution);
      e.preventDefault();
    }
    document.addEventListener("copy", onCopy);
    return () => document.removeEventListener("copy", onCopy);
  }, [url, author]);

  return null;
}
