import Image from "next/image";

interface LinkedInCardProps {
  /** Full LinkedIn profile URL, e.g. https://www.linkedin.com/in/kishore-k-sharma */
  url: string;
  /** Display name shown as the card headline. */
  name: string;
  /** Job title; rendered alongside location in the meta line. */
  title: string;
  /** City / region; rendered alongside title in the meta line. */
  location: string;
  /** Path to the profile photo in /public. Defaults to /profile-picture.jpg. */
  photoSrc?: string;
}

// Pull the vanity slug ("kishore-k-sharma") out of the full URL so the
// displayed "/in/..." text and the linked URL never disagree.
function vanityFromUrl(url: string): string {
  const m = url.match(/linkedin\.com\/in\/([^/?#]+)/);
  return m ? m[1] : "";
}

export function LinkedInCard({
  url,
  name,
  title,
  location,
  photoSrc = "/profile-picture.jpg",
}: LinkedInCardProps) {
  const vanity = vanityFromUrl(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer me"
      aria-label={`View ${name} on LinkedIn`}
      className="group block rounded-lg border border-subtle/60 hover:border-foreground/40 transition-colors p-5 max-w-[480px]"
    >
      <div className="flex items-center gap-2 mb-4">
        <LinkedInIcon className="w-4 h-4 text-accent" />
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
          LinkedIn
        </span>
        <span
          aria-hidden
          className="ml-auto font-mono text-[0.78rem] text-muted-foreground/60 group-hover:text-foreground transition-colors"
        >
          →
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-14 h-14 rounded-full overflow-hidden bg-subtle/40 border border-subtle/60 flex-shrink-0">
          <Image
            src={photoSrc}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-[1.02rem] text-foreground tracking-[-0.01em] leading-tight group-hover:text-accent transition-colors">
            {name}
          </p>
          <p className="mt-1 font-mono text-[0.74rem] text-muted-foreground line-clamp-1">
            {title} · {location}
          </p>
          {vanity && (
            <p className="mt-2 font-mono text-[0.72rem] text-muted-foreground/70 truncate">
              /in/{vanity}
            </p>
          )}
        </div>
      </div>
    </a>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.778 13.019H3.555V9h3.56v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
