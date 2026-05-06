import { cn } from "@/lib/utils";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  id?: string;
  index?: string;
  eyebrow?: string;
  narrow?: boolean;
}

export function Section({
  id,
  index,
  eyebrow,
  narrow,
  className,
  children,
  ...rest
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "relative py-24 md:py-32 lg:py-40 scroll-mt-24",
        className
      )}
      {...rest}
    >
      <div className={narrow ? "container-narrow" : "container-editorial"}>
        {(index || eyebrow) && (
          <div className="mb-10 md:mb-14 flex items-center gap-3 eyebrow">
            {index && <span className="num text-foreground/70">{index}</span>}
            {index && eyebrow && <span className="h-px w-8 bg-subtle" />}
            {eyebrow && <span>{eyebrow}</span>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
