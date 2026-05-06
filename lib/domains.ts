export type DomainId = "telecom" | "fintech" | "govtech" | "edtech";

export const DOMAIN_META: Record<
  DomainId,
  { name: string; tone: string; cssVar: string; tw: string }
> = {
  telecom: { name: "Telecom", tone: "Networks & infrastructure", cssVar: "var(--telecom)", tw: "telecom" },
  fintech: { name: "FinTech", tone: "Capital & compliance", cssVar: "var(--fintech)", tw: "fintech" },
  govtech: { name: "GovTech", tone: "Civic systems", cssVar: "var(--govtech)", tw: "govtech" },
  edtech: { name: "EdTech", tone: "Learning at scale", cssVar: "var(--edtech)", tw: "edtech" },
};

