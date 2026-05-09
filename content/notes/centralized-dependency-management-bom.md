---
title: "Centralized Dependency Management with a Maven BOM"
description: "Stop the thirty-PR CVE fire drill. How to centralize dependency versions across a microservice fleet using a Maven BOM or Gradle version catalog."
date: "2026-05-09"
tags: ["java", "maven", "gradle", "spring-boot", "bom", "microservices", "dependencies", "architecture"]
---

A microservice fleet without centralized dependency management has a specific failure mode: when a CVE drops on a shared library — Log4j, Jackson, Spring — the response is one pull request per affected service. For a fleet of thirty, that's thirty PRs, written by thirty engineers, deployed in thirty separate cycles, with no single source of truth telling you which services are still vulnerable until each one ships.

This post lays out the approach for fixing that without sacrificing the independence that makes microservices worth running in the first place.

## The shape of the problem

A microservice architecture decouples **business logic**: billing shouldn't import auth's classes. That coupling is bad and the architecture rules it out.

There's a second kind of coupling that microservices don't address — the **shared infrastructure** every service uses to run: the JSON parser, the HTTP client, the logging library, the metrics SDK, the resilience library, the JVM bytecode target. These aren't part of any one service's business domain. They're part of *the platform*.

Letting each service pick its own version of platform libraries isn't freedom. It's drift. Thirty places to upgrade the next time a CVE drops. Thirty rollouts to coordinate. Thirty places where a transitive dependency might silently differ from what the wiki says.

The goal: services independent in **logic**, uniform in **plumbing**.

## What centralized dependency management actually means

The phrase confuses people because it sounds like the opposite of microservices. It isn't. It means **one place declares what version of each library is allowed**, and every service consumes from that declaration.

What it does *not* mean:

- A monorepo (this works equally well across thirty separate repos).
- A shared parent project that every service inherits compile settings from (that's a parent POM — one tactic among several, with heavier coupling).
- One giant JAR that every service depends on (the worst of both worlds — dependency shared, versions still drift).

There are three building blocks. The right combination depends on the build tool and the team's tolerance for coupling:

1. **Bill of Materials (BOM)** — a special POM that declares versions but contains no code. Services *import* it; they don't extend it. Lightweight, low-coupling.
2. **Parent POM** — services inherit from it. Pulls in versions but also build settings, plugin configs, properties. Heavier coupling.
3. **Version catalog** (Gradle 7+) — a TOML file declaring versions, consumed by every Gradle project. Modern Gradle's preferred shape.

For a microservice fleet, **BOM is almost always the right answer**. It carries the versions, leaves everything else alone, and re-coupling pressure is minimal.

## Maven: the BOM

A BOM is a `pom.xml` with `<packaging>pom</packaging>` and a `<dependencyManagement>` section. The dependencyManagement section declares versions. No actual dependencies are pulled in. Services say "I want this library, version managed by the BOM," and the BOM hands them the right version.

```xml
<!-- platform-bom/pom.xml -->
<project>
  <groupId>com.acme.platform</groupId>
  <artifactId>platform-bom</artifactId>
  <version>2026.5.0</version>
  <packaging>pom</packaging>

  <properties>
    <jackson.version>2.18.2</jackson.version>
    <resilience4j.version>2.2.0</resilience4j.version>
    <micrometer.version>1.13.6</micrometer.version>
    <logback.version>1.5.12</logback.version>
  </properties>

  <dependencyManagement>
    <dependencies>
      <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
        <version>${jackson.version}</version>
      </dependency>
      <dependency>
        <groupId>io.github.resilience4j</groupId>
        <artifactId>resilience4j-spring-boot3</artifactId>
        <version>${resilience4j.version}</version>
      </dependency>
    </dependencies>
  </dependencyManagement>
</project>
```

A consuming service imports it:

```xml
<!-- billing-service/pom.xml -->
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>com.acme.platform</groupId>
      <artifactId>platform-bom</artifactId>
      <version>2026.5.0</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>

<dependencies>
  <dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <!-- no version; the BOM provides it. -->
  </dependency>
</dependencies>
```

The service declares *what* it depends on. The BOM declares *which version*. Adding a new library means adding it to the BOM first (one PR to the platform repo), then consuming it from the service (one PR per service that needs it).

## Gradle: the version catalog

In Gradle 7+, the version catalog is the modern shape. It lives in `gradle/libs.versions.toml`:

```toml
[versions]
jackson = "2.18.2"
resilience4j = "2.2.0"
micrometer = "1.13.6"

[libraries]
jackson-databind = { module = "com.fasterxml.jackson.core:jackson-databind", version.ref = "jackson" }
resilience4j-spring-boot3 = { module = "io.github.resilience4j:resilience4j-spring-boot3", version.ref = "resilience4j" }
micrometer-core = { module = "io.micrometer:micrometer-core", version.ref = "micrometer" }
```

Services consume by alias:

```kotlin
// billing-service/build.gradle.kts
dependencies {
    implementation(libs.jackson.databind)
    implementation(libs.resilience4j.spring.boot3)
    implementation(libs.micrometer.core)
}
```

For mixed Maven/Gradle fleets, publish the platform as a `java-platform` Gradle module. Both build systems can consume it.

## What goes in the BOM, what stays out

The most common mistake: treating the BOM as a kitchen drawer for everything anyone uses. That's a parent POM in disguise, and it's how re-coupling sneaks back in.

The rule: **the BOM declares versions of platform-shaped libraries** — things every service uses or could plausibly use. Roughly:

- Serialisation: Jackson, Gson
- HTTP clients: OkHttp, Apache HttpClient, Spring's RestClient
- Logging: SLF4J, Logback, Log4j (yes, even if you don't use it directly — pin a safe version anyway, transitives find it)
- Metrics & tracing: Micrometer, OpenTelemetry SDK
- Resilience: Resilience4j
- Validation: jakarta.validation, Hibernate Validator
- Database: HikariCP, Postgres driver, Flyway / Liquibase
- Test infrastructure: JUnit, Mockito, AssertJ, Testcontainers
- Internal platform starters: any [shared exception-handler library](/writing/shared-exception-handler-library) or other Spring Boot starter your platform team publishes

What stays out:

- **Business libraries.** Anything specific to one or two services. A billing-only PDF library doesn't belong in a fleet-wide BOM.
- **Plugin versions.** Maven plugins, Gradle plugins — those belong in a parent POM or a precompiled script plugin, not the BOM. (BOM scope is `dependencyManagement`, which doesn't manage plugins.)
- **Optional / experimental dependencies.** If only one service is trying GraphQL, that team owns the version. When a second service adopts it, promote to the BOM.

## Override authority

This is the design decision that separates a healthy BOM from a bottleneck.

If the BOM pins **every** transitive dependency rigidly, services lose the ability to upgrade independently when they need to. A service that wants to try a newer OkHttp ahead of the platform can't — the BOM dictates. Now the BOM is the bottleneck, the platform team is the gatekeeper, and individual teams file tickets to upgrade libraries.

The escape hatch: BOMs declare *defaults*, services can *override*. In Maven, simply specifying `<version>` in the consuming project beats the BOM. Document this. Encourage individual services to *propose* a version bump by trying it locally; if it works in their service, the BOM follows in the next release.

A healthy BOM moves often, in small increments. A BOM that updates twice a year is too rigid. A BOM that updates daily lacks the stability that's the point. Aim for one release every 2–3 weeks, with patch releases out-of-band when CVEs land.

## The CVE response: one PR vs thirty

The case for centralization is clearest under pressure.

Without a BOM:

1. Audit every service for the affected library (run `mvn dependency:tree` thirty times)
2. Find which services use which version (some pin explicitly, some inherit transitively, some have it commented out with a TODO)
3. Open thirty PRs, one per service
4. Coordinate thirty deploys
5. Track which services are still vulnerable in a spreadsheet

With a BOM:

1. One PR to the platform repo: bump the version
2. Publish a new BOM version
3. One PR per service: bump the BOM version
4. Deploy in waves

The work isn't zero in either case. The *cognitive load* — *which services are affected, what versions are they on, did I get them all* — drops to nearly zero in the second case. The BOM *is* the answer to "what versions are we on."

That asymmetry is the point.

## Rolling it out to a fleet that already exists

Greenfield is easy. The hard case is introducing this when thirty services are already in production with their own pinned versions.

**Step 1 — Inventory.** For each service, generate the dependency tree and dump it into a spreadsheet. Look for variance — where do versions diverge? Those are your future BOM entries.

**Step 2 — Build the BOM at the *current intersection*.** Pick versions that match what most services already use. Don't pick the latest. Pick what causes the fewest service-side changes on adoption.

**Step 3 — Adopt service by service.** Each service's first PR removes its hard-coded versions for libraries the BOM now provides. No version changes; just delegate. This should be a no-op for runtime behavior. Verify with the test suite.

**Step 4 — Publish a regular upgrade plan.** Bump versions in the BOM on a cadence — first Tuesday of each month, for example. Services pick up the new BOM version on their next deploy. CVEs trigger out-of-band releases.

**Step 5 — Track adoption.** Dashboard: which services are on which BOM version? Every service should be within two BOM minor versions of head. Anything older is operational debt.

## Summary

The BOM is not really about dependencies. It is about *the kind of question you can answer in five seconds during an incident*. Without one, "which services use Jackson 2.13?" takes hours. With one, the same question takes two greps.

Three rules to hold to:

- The BOM declares *defaults*, not *mandates*. Services can override; the BOM follows.
- Only platform-shaped libraries belong in the BOM. Business libraries stay with the service.
- Build a dashboard for BOM adoption. The dashboard is half the value.

Microservices give you independence in the things that should differ — business logic, data model, deployment cadence. A BOM gives you uniformity in the things that shouldn't — runtime, libraries, security baseline. Each is doing the job the other can't.
