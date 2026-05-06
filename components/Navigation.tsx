"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "#work", label: "Work" },
  { href: "#capability", label: "Capability" },
  { href: "#proof", label: "Proof" },
  { href: "#contact", label: "Contact" },
];

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openConsole = () => {
    window.dispatchEvent(new CustomEvent("console:open"));
  };

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-[background-color,backdrop-filter,border-color,padding] duration-300",
        scrolled
          ? "bg-background/70 backdrop-blur-md border-b border-subtle/60 py-3"
          : "bg-transparent border-b border-transparent py-5"
      )}
    >
      <nav className="container-editorial flex items-center justify-between gap-6">
        <Link
          href="/"
          aria-label="Kishore Kumar Sharma — home"
          className="group flex items-center gap-2"
        >
          <span className="font-mono text-[0.78rem] tracking-[0.18em] uppercase text-muted-foreground group-hover:text-foreground transition-colors">
            kks
          </span>
          <span className="h-1 w-1 rounded-full bg-accent animate-pulse-soft" aria-hidden />
          <span className="font-display text-[0.95rem] tracking-tight text-foreground hidden sm:inline">
            Kishore Kumar Sharma
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-[0.85rem] text-muted-foreground">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={openConsole}
            aria-label="Open console (Cmd+K)"
            className="group hidden sm:inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-subtle text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
          >
            <span className="font-mono text-[0.7rem] tracking-wide">console</span>
            <span className="kbd">⌘K</span>
          </button>
          <ThemeToggle />
          <Link
            href="#contact"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-foreground text-background text-[0.82rem] hover:opacity-90 transition-opacity"
          >
            Get in touch
            <span aria-hidden>→</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
