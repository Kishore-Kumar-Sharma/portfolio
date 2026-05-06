import { cn } from "@/lib/utils";

interface HeadlineProps {
  as?: "h1" | "h2" | "h3";
  size?: "display-xl" | "display-lg" | "display" | "display-sm" | "heading";
  soft?: boolean;
  className?: string;
  children: React.ReactNode;
}

const SIZE_CLASS: Record<NonNullable<HeadlineProps["size"]>, string> = {
  "display-xl": "text-display-xl",
  "display-lg": "text-display-lg",
  "display": "text-display",
  "display-sm": "text-display-sm",
  "heading": "text-heading",
};

export function Headline({
  as: Tag = "h2",
  size = "display",
  soft = false,
  className,
  children,
}: HeadlineProps) {
  return (
    <Tag
      className={cn(
        "font-display text-balance",
        SIZE_CLASS[size],
        soft ? "font-display-soft italic" : "font-display",
        className
      )}
    >
      {children}
    </Tag>
  );
}
