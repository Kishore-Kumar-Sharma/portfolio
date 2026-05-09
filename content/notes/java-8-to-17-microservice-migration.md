---
title: "Java 8 to Java 17 Migration in a Microservice Fleet"
description: "How to migrate a Spring Boot microservice fleet from Java 8 to Java 17 without downtime — the four layers, the order, the land mines, and the metric."
date: "2026-05-09"
tags: ["java", "java-17", "spring-boot", "jvm", "migration", "microservices", "production"]
---

Java 8 still works. So does an old phone. The case for moving a fleet of microservices to 17 isn't speed or syntax sugar — it's the support window, the security posture, and the JVM's behavior under load. This post lays out the approach I'd recommend for upgrading a fleet without taking the platform down for any of it.

## What the upgrade actually buys you

Skip the language features for a moment. The reasons that justify the spend are operational:

- **LTS support.** Java 17 has vendor backports through at least 2029. Free updates for Java 8 from Oracle ended in 2019. Every month on 8 inherits the security debt of a runtime nobody is patching for free.
- **Garbage collection that doesn't lie.** ZGC and the G1 improvements between 11 and 17 cut tail latency dramatically. On a service with a 100ms p99 SLO, the same JAR on the same hardware can move from p99 ≈ 180ms (CMS, Java 8) to p99 ≈ 65ms (G1, Java 17) with no code change.
- **Container awareness.** Java 8 (pre-191) doesn't read cgroup CPU and memory limits. It looks at the host. A 512Mi pod on Java 8 thinks it has 64Gi of heap available. Java 17 sees the cgroup correctly out of the box.
- **TLS 1.3, HTTP/2, modern crypto** — out of the box, with no third-party shim.
- **Library survival.** Most modern libraries have already dropped 8 from their build matrix. Every quarter you wait, your dependency choices narrow.

Records, sealed classes, switch expressions, and pattern matching are a tax refund at the end. They're not the reason.

## The four layers most teams conflate

"We're upgrading to Java 17" hides four independent decisions:

1. **Source level** — what version your `.java` files compile against. Whether you can use records, switch expressions, pattern matching. (`<source>17</source>`.)
2. **Bytecode target** — what JVM version your `.class` files can run on. (`<target>17</target>`.)
3. **Build JDK** — the JDK your CI uses to compile. Can be ahead of your target.
4. **Runtime JDK** — the JDK actually running the JAR in production. Your container base image.

You can mix these. Compiling with JDK 17 and targeting bytecode 11 produces a JAR that runs on Java 11. You **cannot** run a JAR compiled to target 17 on a Java 11 runtime — the class file version is too high.

Most outages during a migration come from a team thinking they "upgraded" when they only changed one of the four. Treat each layer as a separate change with its own deploy and its own observation window.

## The order to move them in

**Step 0 — Inventory before code.** Run a dependency audit across the fleet. The first question isn't *can we upgrade?* It's *which third-party libraries block the upgrade, and where do they live?* Internal SDKs that pin `javax.servlet:javax.servlet-api:3.1` block every service that uses them. Those go first; the services follow.

**Step 1 — Move the runtime, keep the bytecode.** First commit on each service: change the container base image from `openjdk:8-jre` to `eclipse-temurin:17-jre`. Leave `<target>1.8</target>` alone. The existing 1.8-targeted JAR runs on the new runtime. This is the cheapest, riskiest-feeling, lowest-actual-risk move. It surfaces reflection-related issues (`--add-opens`), removed APIs (`sun.misc.Unsafe`, `javax.xml.bind`), and Nashorn (gone in 15) before any real code change.

**Step 2 — Bump bytecode target.** After a sprint of stable runtime, change `<source>` and `<target>` to 17. No language features yet — just the target. This shakes out anything that still depends on 8-only APIs.

**Step 3 — Spring Boot 3 (only if you need it).** Spring Boot 3 means Spring 6, which means Jakarta EE 9. Every `import javax.servlet.*` becomes `import jakarta.servlet.*`. Every `javax.persistence.*` becomes `jakarta.persistence.*`. Use OpenRewrite. The recipes (`org.openrewrite.java.migrate.UpgradeJavaVersion`, the Spring Boot 3 recipes) handle ~90% of the work mechanically. The remaining 10% is custom Spring Security configurations, custom servlet filters, and any XML-driven config.

**Step 4 — Adopt language features where they pay rent.** Records replace hand-written DTOs. Pattern matching cleans up `instanceof` ladders. Sealed classes are useful in a small number of state-machine implementations. Don't refactor for the sake of it.

## The five things that actually break

1. **`javax` → `jakarta`.** Cosmetic but mechanical. Use OpenRewrite. Don't do it by hand on anything larger than a few thousand lines.
2. **`sun.misc.Unsafe` and internal APIs.** Some library buried in your tree pokes JDK internals. Java 17 strongly encapsulates them. You'll get `IllegalAccessError` at runtime, not compile time. The fix is usually a library bump, not an `--add-opens` flag.
3. **`javax.xml.bind` (JAXB) is gone** — moved out of the JDK in Java 11. Add `jakarta.xml.bind:jakarta.xml.bind-api` and a runtime implementation (`org.glassfish.jaxb:jaxb-runtime`) explicitly.
4. **Nashorn is gone.** `ScriptEngineManager().getEngineByName("nashorn")` returns null on 17. Replace with GraalJS or rewrite the logic in Java.
5. **GC defaults changed.** Java 8 defaults to Parallel GC. Java 17 defaults to G1. Inherited tuning flags (`-XX:NewRatio`, `-XX:SurvivorRatio`, `-XX:MaxGCPauseMillis`) may stop applying or start applying differently. Drop old GC flags entirely on the first deploy and let G1's defaults speak. Re-tune only from data.

If you find yourself adding more than two `--add-opens` flags, you're papering over something that wants to be solved properly with a library upgrade.

## CI strategy during the transition

A service is in exactly one of three states at any time:

- **Pre-migration** — 8 source, 8 target, 8 runtime
- **Half-migrated** — 8 source, 8 target, 17 runtime
- **Migrated** — 17 source, 17 target, 17 runtime

No service exists in any other state. That gives a clean dashboard.

CI runs a build matrix during the transition: every service is built and tested against both 8 and 17 until it crosses into the "migrated" column. This doubles CI time. It catches regressions that only show up under 17 — `Map.copyOf` immutability changes in test fixtures, default GC behavior differences, container memory limits suddenly being respected.

Deploys are sequenced, not all-at-once. Lowest-blast-radius services first (internal admin tools, batch jobs), customer-facing services last. Each service runs at least one full week on the new runtime before its bytecode target is bumped.

## What to watch for in production

The runtime change quietly shifts the operational profile. Plot:

- **GC pause distribution.** G1's average pauses are usually shorter, but its tail can be longer if the heap is tight. Watch p50/p95/p99 of `gc_pause_seconds`.
- **Memory footprint.** ZGC and G1 hold more in metaspace than CMS did. Bump container memory limits 10–15% as a safety margin during rollout, then dial back from data.
- **Warm-up latency.** Tiered compilation is more aggressive in 17. Cold-start p99 may briefly look worse for the first few hundred requests after deploy. Usually noise; AOT and CDS help if it's a real problem.
- **Container memory revelation.** Java 8 (pre-191) ignored cgroup limits. After the upgrade, services that had been quietly relying on host-sized over-allocation will OOM-kill themselves until requests are bumped.

## The "done" criteria

Each service is "done" when three numbers are green for one full week:

1. Error rate ≤ pre-migration baseline.
2. p99 latency ≤ pre-migration baseline + 10ms.
3. GC pause p99 ≤ pre-migration baseline.

The third number is the leading indicator. When G1 is misconfigured, it moves first. When it's happy, the other two usually are too.

Build one dashboard. One row per service, three columns. Green-green-green for a week means the service crosses the line. Red anywhere means pause, look at the data, and either re-tune or roll back.

## Summary

The work itself isn't hard. It's tedious. The discipline is in not treating the runtime, the bytecode target, and the source level as the same change — and in resisting the temptation to upgrade everything in one heroic week. The fleet upgrades the way the fleet ships everything else: one service at a time, with a metric to defend it.

Three rules to hold to:

- Move one of the four layers per change. Wait a week before the next.
- Use OpenRewrite for the mechanical work.
- Define "done" as three numbers, not as a feeling.
