---
title: "Angular 17 to 21 Migration Guide for Production Apps"
description: "How to migrate a production Angular app from 17 to 21 — control flow, standalone components, signals, inject(), and zoneless change detection."
date: "2026-05-09"
tags: ["angular", "angular-21", "frontend", "migration", "signals", "standalone", "zoneless", "typescript"]
---

Angular's six-month release cadence means a codebase on 17 in 2024 is four major versions behind the current line by the end of 2025. None of those four versions are dramatic on their own. Together they reshape the framework's defaults: control flow, dependency injection, change detection, and component shape have all moved.

This post lays out the approach for migrating a production Angular app from 17 to 21 without big-bang rewrites. The work is mostly mechanical. The discipline is in not doing it all at once.

## What the upgrade actually buys you

Skip the syntax sugar for a moment. The reasons that justify the migration are operational:

- **LTS support window.** Angular 17 LTS ended in late 2024; 18 ended in late 2025. Versions out of LTS get no security backports. Staying on 17 means inheriting CVEs nobody upstream is patching.
- **Build performance.** The 17 default of esbuild + Vite for dev cut cold-start dev-server time substantially. Each subsequent version tightened it further. Production builds of large apps can drop 30–50% in CI time after migrating off the legacy webpack builder.
- **Bundle size.** New control flow (`@if`, `@for`, `@switch`) and deferred views (`@defer`) ship less template runtime than `*ngIf`/`*ngFor`. Standalone components let the compiler tree-shake more aggressively. A medium app typically loses 50–150KB minified-gzipped after a full migration.
- **Signals as a primary primitive.** Reactive state without RxJS overhead for the cases that don't need streams. Faster change detection, narrower update paths, simpler mental model for state.
- **Zoneless on the horizon.** 18 introduced experimental zoneless change detection; by 21 it's a real option. Removing `zone.js` eliminates a 30KB runtime, a class of monkey-patching bugs, and the need for `NgZone.run()` ceremony around third-party libraries.

The new syntax (`@if`, `input()`, `output()`, `inject()`) is the visible part. The performance and bundle wins are the part that pays for the work.

## What changed across the four versions

A condensed map of what each version landed:

- **18** — signals stable, zoneless preview, signal-based `input()`/`output()`/`model()`, event replay during hydration, Material 3 stable.
- **19** — standalone components became the default for new code, incremental hydration, `linkedSignal`, the experimental `resource()` API, hot module replacement.
- **20** — zoneless change detection promoted from experimental, signal-based forms in developer preview, deeper esbuild/Vite integration.
- **21** — signal forms maturing, additional zoneless ergonomics, NgModule deprecation pressure tightening, default change-detection strategy nudges.

You do not have to adopt every feature each version ships. You do have to be on each version long enough for the framework's deprecations to apply cleanly to your code before the next one lands.

## The five things that actually changed

1. **Control flow.** `*ngIf`, `*ngFor`, `*ngSwitch` are still supported but no longer the recommended shape. `@if`, `@for`, `@switch`, and `@defer` are. The new syntax is built into the template parser, not implemented as structural directives, so it's faster to compile and produces smaller output.
2. **Standalone everywhere.** NgModules still work, but the default for new code is standalone. Components, directives, and pipes declare their own dependencies via `imports`. The angular team has signalled NgModule removal in a future version.
3. **Signals.** `signal()`, `computed()`, `effect()`. Signal-based `input()` and `output()` replace the decorator forms in new code. `model()` provides two-way binding without the legacy `[(value)]` ceremony.
4. **`inject()` over constructor DI.** Field-initialiser dependency injection via `inject(SomeService)` is now the idiomatic shape. It works in functions, inheritance hierarchies, and standalone components in places constructor DI couldn't.
5. **Zoneless change detection.** Opt-in via `provideExperimentalZonelessChangeDetection()` (18–19) or `provideZonelessChangeDetection()` (20+). When enabled, change detection runs on signals and explicit `markForCheck()` calls — no `zone.js` patching needed.

## The order to migrate in

The hardest thing about a multi-version Angular migration is that `ng update` does *most* of the work but not all of it, and the gaps are where production breaks.

**Step 1 — Update one major version at a time.** Run `ng update @angular/core@18 @angular/cli@18`, ship that, observe in production for a sprint, then move to 19. Skipping versions works in theory; in practice the migration schematics are written to apply to the previous version's code shape. Skip a version and you skip the schematic.

**Step 2 — Run the automated schematics, separately from any manual change.** Each `ng update` run produces commits that should land on their own. Mixing automated transformations with manual refactors in the same PR makes review impossible.

**Step 3 — Adopt the new control flow with the dedicated migration.** Run `ng generate @angular/core:control-flow`. It rewrites `*ngIf`/`*ngFor`/`*ngSwitch` across the codebase. Review the diff carefully — there are edge cases around `*ngIf as` aliasing and `trackBy` translation to `track`.

**Step 4 — Migrate to standalone.** Run `ng generate @angular/core:standalone`. The schematic has three modes: convert components to standalone, remove unnecessary NgModules, and switch to a standalone bootstrap. Run them in that order. Review and ship between each.

**Step 5 — Adopt signals incrementally.** This is the only step that's not automatable end-to-end. Migrate `BehaviorSubject` state holders to `signal()` where the consumer doesn't need stream semantics. Keep RxJS where you genuinely need streams (debouncing, switchMap, websocket flows). The boundary is clearer than it sounds: if you'd write `.value` on the BehaviorSubject, it's a signal.

**Step 6 — Adopt `inject()` in new code.** Don't refactor working constructor injection wholesale. Use `inject()` in new code; let the constructor form age out organically.

**Step 7 — Evaluate zoneless.** This is the only step that's a real architectural decision. Zoneless requires every change-triggering code path to either touch a signal, call `markForCheck()`, or live inside `runInInjectionContext`. Audit third-party libraries first — anything that triggers DOM updates outside Angular's awareness will silently fail to render.

## The land mines

A few that catch teams during this migration:

**RxJS interop with signals.** `toSignal()` and `toObservable()` are the bridge. Reaching for them constantly is a smell — usually it means a piece of state should have been one shape or the other from the start. Use the bridge at framework boundaries, not inside business logic.

**`OnPush` is no longer optional in practice.** Default change detection still works, but every Angular performance recommendation since 17 assumes `OnPush`. Components that depend on default CD picking up mutations will start missing updates as you migrate to signals. Convert to `OnPush` and signals together; the two changes reinforce each other.

**`*ngIf as` doesn't translate cleanly to `@if`.** The new control flow doesn't have a direct equivalent for binding the result of an async pipe to a local template variable. The migration schematic emits a `let` form, but it changes the scope rules. Spot-check templates that used `*ngIf="data$ | async as data"`.

**NgModule lurkers.** Even after running the standalone schematic, third-party libraries may still expose NgModules. They work — they're just inert wrappers around standalone primitives now. You don't have to remove them. Don't treat the standalone migration as "delete every NgModule"; treat it as "stop writing new ones."

**Hydration mismatches.** SSR with hydration became stable in 17 and is now expected. If your app wasn't hydrating before, switching it on can surface DOM mismatches that were hidden when the client just re-rendered from scratch. Run with `enableHydrationDebugging()` in staging before flipping it in production.

## CI and testing strategy

The risk profile of an Angular major-version bump is mostly about template compilation. A change that the framework considered semantically equivalent can produce a slightly different DOM, and snapshot tests detect this loudly.

A few things worth doing during the migration:

- **Keep snapshot tests, don't blanket-update them.** Each version bump will produce diffs. Review them. Most are cosmetic; some reveal real changes in CD behavior.
- **Visual regression on the critical paths.** Lighthouse, Playwright snapshots — whatever you have. Three to five flows is enough.
- **Bundle size budget in CI.** Angular's `budgets` field in `angular.json` should fail the build if bundle size regresses unexpectedly during the migration.
- **Test against both `zone.js` and zoneless** if you're evaluating zoneless in parallel. CI matrix doubles. Worth it.

## What "done" looks like

Each version bump is "done" when:

1. All schematics have been run and reviewed.
2. The app builds with no deprecation warnings (or every remaining warning has a tracked ticket).
3. Snapshot and visual-regression tests pass.
4. Bundle size is within budget.
5. The app has been on the new version in staging for at least a week with no new error spikes.

Across the full 17 → 21 path, the additional acceptance criteria are:

- Control flow migrated everywhere (no remaining `*ngIf`/`*ngFor`/`*ngSwitch`).
- Standalone migration complete (no NgModules in app code; third-party NgModules are acceptable).
- Signal-based state in places that previously held mutable state in `BehaviorSubject`.
- A documented zoneless decision — either adopted, or deliberately deferred with a reason.

## Summary

Angular 17 → 21 is mostly mechanical and mostly automated. The risk isn't in the schematics. It's in compressing the work — running four major version bumps over a weekend, mixing automated migrations with manual refactors, or trying to adopt every new primitive at once.

Three rules to hold to:

- One major version per PR. Run the schematics, ship the schematic-only diff, then refactor manually as a separate change.
- Adopt the new primitives incrementally — signals where state is mutable, `inject()` in new code, standalone for new components — rather than rewriting working code wholesale.
- Treat zoneless as a deliberate architectural decision, not an automatic step. Audit third-party libraries before flipping it.

The work isn't complicated. The discipline is in pacing it.
