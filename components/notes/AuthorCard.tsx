import Image from "next/image";
import portfolioData from "@/data/portfolio.json";

const { personal } = portfolioData;

export function AuthorCard() {
  return (
    <section
      aria-label={`Written by ${personal.name}`}
      className="mt-20 pt-2"
    >
      <div className="flex items-center gap-6">
        <div className="flex-1 h-px bg-subtle/50" aria-hidden />
        <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border border-subtle/70 bg-subtle/30 flex-shrink-0">
          <Image
            src="/profile-picture.jpg"
            alt=""
            fill
            sizes="(min-width: 768px) 96px, 80px"
            className="object-cover"
          />
        </div>
        <div className="flex-1 h-px bg-subtle/50" aria-hidden />
      </div>

      <div className="mt-6 text-center">
        <p className="font-display text-heading-sm md:text-heading text-foreground tracking-[-0.02em]">
          {personal.name}
        </p>
        <p className="mt-3 max-w-[60ch] mx-auto text-[0.92rem] md:text-[0.95rem] text-muted-foreground leading-relaxed text-pretty">
          {personal.authorHeadline}
        </p>
      </div>
    </section>
  );
}
