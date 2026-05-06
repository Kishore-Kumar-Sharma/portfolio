"use client";

import portfolioData from "@/data/portfolio.json";
import { Section } from "@/components/editorial/Section";
import { Reveal } from "@/components/editorial/Reveal";
import { RequestTrace } from "@/components/RequestTrace";
import { inferDomain, DOMAIN_META } from "@/lib/domains";

export function CaseStudies() {
  const { experience } = portfolioData;
  const [lead, ...rest] = experience;

  return (
    <Section id="work" index="03" eyebrow="Selected work · 2019 → present">
      <Reveal>
        <h2 className="font-display text-display text-foreground text-balance max-w-[22ch] leading-[1.02] tracking-[-0.03em]">
          Four verticals. One <span className="font-display-soft italic text-accent">discipline</span>.
        </h2>
      </Reveal>

      <Reveal delay={0.1}>
        <p className="mt-6 max-w-[58ch] text-body-lg text-muted-foreground text-pretty">
          Same patterns, different domains: model the system, draw clean boundaries, instrument what matters, ship measurable lift. Each engagement is one deliberate study.
        </p>
      </Reveal>

      {/* Lead case — full editorial treatment with RequestTrace */}
      <article className="mt-20 md:mt-28">
        <header className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 mb-10 md:mb-14">
          <div className="md:col-span-3 flex md:flex-col items-center md:items-start gap-4 md:gap-2">
            <span className="font-mono text-[0.7rem] tracking-widest uppercase text-telecom">
              ✦ Lead study
            </span>
            <span className="font-mono text-[0.78rem] text-muted-foreground">
              {lead.startDate} → {lead.endDate}
            </span>
          </div>
          <div className="md:col-span-9">
            <Reveal>
              <p className="eyebrow mb-3">{lead.company}</p>
              <h3 className="font-display text-display-sm text-foreground tracking-[-0.025em] leading-[1.05] text-balance">
                {lead.role} · architecting carrier-grade platforms at national scale.
              </h3>
            </Reveal>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14">
          <div className="md:col-span-7">
            <Reveal>
              <RequestTrace />
            </Reveal>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {lead.projects.map((p) => (
                <Reveal key={p.title} className="border border-subtle/50 rounded-lg p-5 hover:border-foreground/30 transition-colors">
                  <p className="font-mono text-[0.7rem] text-muted-foreground mb-2">{p.duration}</p>
                  <h4 className="font-display text-heading-sm text-foreground mb-2">{p.title}</h4>
                  <p className="text-[0.9rem] text-muted-foreground leading-relaxed text-pretty">{p.description}</p>
                </Reveal>
              ))}
            </div>
          </div>

          <div className="md:col-span-5 md:pl-8 md:border-l md:border-subtle/60">
            <Reveal>
              <p className="eyebrow mb-4">What I shipped</p>
              <ul className="space-y-4">
                {lead.description.map((line, i) => (
                  <li key={i} className="flex gap-3 text-[0.95rem] text-foreground/85 leading-relaxed text-pretty">
                    <span className="mt-2 h-px w-3 bg-telecom shrink-0" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.15}>
              <p className="eyebrow mt-10 mb-4">Stack</p>
              <ul className="flex flex-wrap gap-x-2 gap-y-1.5 font-mono text-[0.78rem]">
                {lead.technologies.map((t) => (
                  <li key={t} className="px-2 py-1 rounded border border-subtle/60 text-foreground/85">
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </article>

      {/* Earlier engagements — abbreviated rows */}
      <div className="mt-28 md:mt-36">
        <Reveal>
          <p className="eyebrow mb-8">Earlier engagements</p>
        </Reveal>

        <ol className="border-t border-subtle/50">
          {rest.map((job, idx) => {
            const domainId = inferDomain(`${job.company} ${job.role} ${job.description.join(" ")}`);
            const domain = DOMAIN_META[domainId];
            return (
              <Reveal key={job.company} delay={idx * 0.05} as="li">
                <article className="group grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 py-10 md:py-12 border-b border-subtle/50">
                  <div className="md:col-span-3 flex flex-col gap-1.5">
                    <span
                      className="font-mono text-[0.7rem] tracking-widest uppercase"
                      style={{ color: `hsl(${domain.cssVar})` }}
                    >
                      {domain.name}
                    </span>
                    <span className="font-mono text-[0.78rem] text-muted-foreground">
                      {job.startDate} → {job.endDate}
                    </span>
                  </div>

                  <div className="md:col-span-6">
                    <h4 className="font-display text-heading text-foreground tracking-[-0.02em] leading-[1.1] text-balance">
                      {job.role}
                    </h4>
                    <p className="mt-1.5 text-[0.92rem] text-muted-foreground">{job.company}</p>
                    <p className="mt-5 text-[0.95rem] text-foreground/80 leading-relaxed max-w-[58ch] text-pretty">
                      {job.description[0]}
                    </p>
                  </div>

                  <div className="md:col-span-3">
                    <ul className="flex flex-wrap gap-x-2 gap-y-1.5 font-mono text-[0.72rem]">
                      {job.technologies.slice(0, 6).map((t) => (
                        <li key={t} className="text-muted-foreground">
                          {t}
                          <span aria-hidden className="text-subtle ml-2 last:hidden">·</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </Section>
  );
}
