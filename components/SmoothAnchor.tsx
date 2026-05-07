"use client";

import Link, { type LinkProps } from "next/link";
import { type ComponentProps, type MouseEvent } from "react";

type Props = LinkProps &
  Omit<ComponentProps<"a">, keyof LinkProps> & {
    children: React.ReactNode;
  };

/**
 * Anchor that always smooth-scrolls to its target when the target exists on
 * the current page — even if the URL hash already matches. Falls through to
 * Next.js client-side routing when the target isn't on the current page,
 * so cross-page navigation (e.g. /notes/foo → /#contact) still works.
 *
 * Fixes the repeat-click bug where the browser doesn't re-scroll because
 * the URL hash hasn't changed.
 */
export function SmoothAnchor({ href, children, onClick, ...rest }: Props) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (typeof href !== "string") return;
    const hashIdx = href.indexOf("#");
    if (hashIdx === -1) return;
    const targetId = href.slice(hashIdx + 1);
    const targetEl = document.getElementById(targetId);
    if (!targetEl) return; // target not in this page — let Next handle it
    e.preventDefault();
    targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    if (window.location.hash !== `#${targetId}`) {
      history.pushState(null, "", `#${targetId}`);
    }
  };

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
