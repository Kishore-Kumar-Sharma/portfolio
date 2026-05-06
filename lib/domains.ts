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

export function inferDomain(text: string): DomainId {
  const t = text.toLowerCase();
  if (/(telecom|4g|spectrum|network|dia|tata)/.test(t)) return "telecom";
  if (/(fintech|loan|credenc|capital|crm)/.test(t)) return "fintech";
  if (/(gov|e-?governance|department|ministry)/.test(t)) return "govtech";
  if (/(edu|tutor|skaplink|college|class)/.test(t)) return "edtech";
  return "telecom";
}
