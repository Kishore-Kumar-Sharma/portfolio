---
title: "National Enterprise Connectivity Platform"
company: "Tata Consultancy Services"
role: "Systems Engineer · Lead architect"
startDate: "2024-01"
endDate: "Present"
domain: "telecom"
summary: "Architected a large-scale microservices platform powering a national enterprise connectivity initiative, aligned with a country-wide carrier network rollout. 30+ enterprise services integrated, +30% API throughput."
outcomes:
  - { label: "API throughput", value: "+30%" }
  - { label: "Cold start", value: "−42%" }
  - { label: "Services integrated", value: "30+" }
  - { label: "Error rate", value: "<0.05%" }
stack:
  - "Java 17"
  - "Spring Boot 3"
  - "Spring Cloud"
  - "PostgreSQL"
  - "AWS"
  - "Docker"
  - "Grafana"
  - "ELK"
---

## The mandate

Build the backend platform for a national-scale enterprise connectivity initiative — the kind of system where a single misrouted request can leave a state-government department offline. We were asked to integrate 30+ enterprise services into one coherent platform, with API performance budgets tighter than anything our team had run before.

The brief was small. The constraints were not:
- Failure domains had to be small and isolated — one downstream outage couldn't take the platform with it.
- Throughput had to scale without rewriting hot paths every quarter.
- Observability had to exist *before* the first incident, not after.

## The architecture decision

The instinct on a project this size is to start with the framework. We didn't. We started with the boundaries.

For each enterprise service we integrated, we asked one question first: **what is the contract**? Not the API surface — the contract. What does this service promise about idempotency, retries, error semantics, response time. We codified those answers as OpenAPI specs *before* writing a line of code, then generated typed clients from them. When a downstream changed something, our build broke. That single discipline saved us an entire incident class.

The platform itself is built on Java 17 and Spring Boot 3. Every service:
- Exposes a `/health` and `/readiness` endpoint that's actually monitored
- Wraps every downstream call in a Resilience4j circuit breaker with a sane budget
- Propagates a request-id header end-to-end, logged in structured JSON
- Fails fast on bad input — we'd rather return a 400 than swallow it

Spring Cloud handles service discovery and config. PostgreSQL is the system of record; we resisted the urge to introduce document stores until we had a real reason. We never did.

## What I shipped

- **Microservice platform** supporting 30+ integrated enterprise services
- **Workflow automation** that replaced a previously-manual chain of approvals
- **API performance optimization** — connection pool tuning, query batching, and a careful caching layer brought average response times down by ~30%
- **CI/CD governance** — every PR runs SonarQube, every deploy goes through a gated pipeline; rollback is one click
- **Observability stack** — Grafana dashboards for request rate, latency p95/p99, and error rate per dependency; ELK for searchable structured logs
- **Shared core libraries** — common code (auth, idempotency, retry, observability hooks) extracted to a versioned internal SDK so service teams stop reinventing the foundations

## What I learned

The biggest insight: **circuit breakers are a contract too.** It's not enough to wrap every call in one. You have to think about the *budget*. Three retries per hop, four hops deep, and one logical request becomes 81 attempts on the deepest service. We solved this with end-to-end deadline propagation: every request carries a deadline header; each hop checks it before retrying. After we shipped this, our cascading-failure incidents dropped to zero.

The second insight: **observability is a team-shape problem, not a tooling problem.** Dashboards mean nothing if the team doesn't have a habit of reading them. We mandated that every postmortem reference a specific dashboard panel. Within three sprints, the dashboards became the way the team thought about the system, not an afterthought.

## What's next

The platform is now stable enough that we're moving from "keep it working" to "make it scale." The next phase is async-first — moving the slowest synchronous calls onto a Kafka-backed event bus, with consumers that can be scaled horizontally without coordinating with producers. The architecture is laid out; the rollout is staged across three quarters.
