---
title: "College Automation Platform · Admissions & operations"
company: "S.S. Technologies"
role: "Software Developer"
startDate: "2019-08"
endDate: "2020-03"
domain: "govtech"
summary: "Built a comprehensive automation platform for college admissions and fee management. Lifted operational efficiency 80%, replacing weeks of manual processing with auditable workflows."
outcomes:
  - { label: "Operational efficiency", value: "+80%" }
  - { label: "Admin workflows automated", value: "12+" }
  - { label: "Apps shipped", value: "Web + Android" }
stack:
  - "PHP"
  - "Angular"
  - "React.js"
  - "Node.js"
  - "MySQL"
  - "HTML/CSS"
---

## The mandate

The college's admissions and fee-management process was paper-heavy: forms collected at counters, ledgers maintained by hand, end-of-day reconciliations that frequently disagreed. The admin team was capable but spent most of their week on coordination instead of decisions. The brief: build a platform that automated the routine and left the team to handle the actual work.

This was my first end-to-end engagement on a real production system. The constraints were tight (small team, short timeline) but the upside was clear: every workflow we automated was a workflow the team never had to do manually again.

## The architecture decision

We picked the stack pragmatically: PHP and MySQL for the operational backend (the team that would maintain it post-handover already knew them), Angular for the admin dashboard (Angular's data-binding made fast iteration on internal tools cheap), and a small React surface for the public-facing application form.

The biggest decision was the data model. We resisted the urge to mirror the existing paper forms one-to-one. Instead, we modeled the *workflows*: an application has states, transitions, audit trails, attachments, fee events. Once the model was clean, the UI was almost mechanical to build. Where the team had previously needed to track an application across three ledgers and a folder of forms, they now had a single timeline view per applicant.

For the parental-monitoring Android app — a separate but related product — we built the backend on Node.js. Geo-tracking and activity monitoring required a real-time channel; the Node side handled WebSocket connections cleanly while the PHP side stayed focused on transactional admin work.

## What I shipped

- **Admissions workflow engine** — application intake, eligibility checks, document verification, seat assignment, fee posting; all transitioning through an explicit state model with full audit trail
- **Fee management** — receipt generation, discount/scholarship handling, instalment tracking, end-of-day reconciliation reports
- **Admin dashboard** — Angular SPA for the ops team; real-time view across all active applications
- **Public application portal** — React-based, mobile-friendly form with auto-save and resume-later
- **Parental monitoring Android app** — geo-tracking + activity monitoring with a Node.js backend
- **End-to-end delivery** — including testing, production rollout, and onboarding the maintenance team

## What I learned

**Internal tools deserve the same care as customer-facing products.** It's tempting to ship admin dashboards that "work" but feel like Excel-with-extra-steps. The team using them every day notices. We invested in a clean Angular admin UI — searchable tables, bulk actions, keyboard shortcuts for the ops manager who lived in it for hours a day — and it paid back in adoption. The system was used because people *liked* using it.

**An audit trail is a feature, not a chore.** Every state transition wrote a row to an `events` table with actor, timestamp, before/after fields, and a reason. When disputes came up — "did this fee waiver actually get approved?" — the answer was three clicks away instead of three meetings. This pattern is something I've carried into every system since.

**Pragmatism over fashion when the team has to maintain it.** PHP is not the cool choice in 2026, but the team that took over after my engagement could read it, modify it, ship hotfixes. That mattered more than my preferences. Picking the stack the *future* team can own is one of the most underrated calls in software.

## What's next

This engagement is now five years behind me, but the patterns I built here — explicit state machines, audit trails as a first-class feature, internal tools as real products — became foundational. They're in every platform I've built since.
