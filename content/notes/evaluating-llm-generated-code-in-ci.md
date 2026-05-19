---
title: "Evaluating LLM-Generated Code in CI: The Gate You Need Before You Trust the Agent"
description: "Agents produce code that compiles, passes tests, and is sometimes wrong in ways that no compiler or unit test catches. What an evaluation layer in CI looks like — beyond lint and test — when half the PRs were drafted by a model."
date: "2026-05-14"
tags: ["ci", "ai", "agents", "code-quality", "engineering-leadership", "platform"]
---

The first quarter we let agents write meaningful portions of our PRs, our test pass rate went up and our defect-escape rate also went up. Both numbers, in the same direction, telling opposite stories.

The reason was simple once we looked. Tests caught what they always caught: incorrect logic exercised by a test case. They didn't catch what was new: code that did the wrong thing in a way that no test had been written for, because the agent had also written the tests and had agreed with itself about what the function was supposed to do. The system was internally consistent and externally wrong.

That experience pushed me to think harder about what CI is *for* when a meaningful chunk of the code arriving at it was written by a model. The short answer: CI now needs an evaluation layer, not just a verification layer. This post is what that layer looks like in practice.

## The distinction that matters

Verification asks: *does this code behave the way its specification says it should?* Linters, type checks, unit tests, integration tests. All necessary; none new.

Evaluation asks: *is this code the right code to have written at all?* Is the specification right? Is the design fit-for-purpose? Does it match the codebase's conventions? Does it introduce a subtle vulnerability that compiles cleanly? Does it duplicate existing logic that the agent didn't know about? Does the test it wrote actually test what matters, or does it test the implementation back to itself?

Pre-agent CI was almost entirely verification. The reviewer did the evaluation. That worked because the reviewer was reviewing 5–20 PRs a week, each one shaped by a human who had domain context and was accountable for what they wrote.

![Two side-by-side cards. Left card "Verification" asks "does it behave as specified" and lists lint, type check, unit tests, integration tests — catches incorrect logic exercised by a test, misses code that's wrong but never tested for it. Right card "Evaluation" asks "is this the right code to have written" and lists duplication scan, security pattern check, convention lints, diff-scope-vs-description — catches the silent-bug class that compiles and passes.](/writing/ci-verification-vs-evaluation.svg "Verification asks one question; evaluation asks another. Pre-agent CI only automated the first; the second was the reviewer's job.")

The math changes when half the PRs are 200-line agent diffs across files the author barely opened. The reviewer still has 20 PRs a week, but each one demands more evaluation because the author wasn't doing it themselves. Either the reviewer becomes the bottleneck, or CI starts shouldering part of the evaluation load.

## What automated evaluation can actually catch

Not everything a careful reviewer would catch. Some specific, repeatable things:

**Plausible but uncalled duplicate logic.** The agent wrote a new helper that does the same thing as an existing one because it didn't grep the codebase. A duplication detector that runs over the diff and against the rest of the codebase — looking for functions that are structurally similar to existing ones — catches the most expensive form of this before it merges.

**Security-sensitive patterns added without the corresponding safety.** The agent added a new SQL query path; CI greps the diff for new `query(` calls and checks whether each one is parameterized. The agent added a new HTTP endpoint; CI checks whether the route has an auth annotation. None of these checks are subtle — they're pattern matches — but they catch the "agent didn't think about it" class of bug reliably.

**Tests that don't actually test.** A test that asserts `expect(result).toBeDefined()` after calling a function passes whenever the function returns anything at all. A mutation-testing pass that randomly flips conditions and checks whether tests fail catches tests that aren't doing work. Slow to run; worth scheduling on the main branch nightly rather than per-PR.

**Conventions the codebase has but the agent didn't follow.** Naming patterns, file layout, module boundaries. A custom lint rule per convention catches the drift. The investment is real (you have to write the rules); the payback compounds because every future agent run inherits the constraint.

**Tests that match the implementation too closely.** A test that asserts an implementation detail rather than a behavior is a test the agent wrote alongside the code, and it passes only because both halves agree. Heuristics: tests that mock internal collaborators heavily, tests where the assertions name private functions, tests with the same number of branches as the function under test. None of these alone is a smoking gun; together they flag PRs worth a closer human read.

**Diff scope that exceeds the change description.** The PR says "fix the date parsing bug." The diff also rewrites the cache layer. A check that flags PRs where the diff scope greatly exceeds the title's implied scope catches the agent's tendency to "improve" code it shouldn't be touching. This is the cheapest check on the list and one of the highest-value.

## What automated evaluation can't catch, and what to do about it

Several things CI can't reasonably check, no matter how clever the rules:

**Whether the design is the right design.** "The agent built a CRUD service when the actual need was an event-driven one." No rule will see that. The reviewer has to.

**Whether the abstraction matches the team's mental model.** "The function name says one thing and the body does subtly more." Compiles fine, tests fine, will confuse the next reader. Code review territory.

**Whether the feature should exist at all.** "Why are we adding a date filter to this endpoint when nobody asked for one." Product judgment, not a CI check.

For the things CI can't catch, the lever is making the human review *better targeted*, not making it cover more ground. Two practices that help:

- **PR templates that ask the author to state the design intent explicitly.** "What problem does this solve? What alternatives did you consider? What did you intentionally not change?" When the author drafted the PR with an agent, they may have to think the answers through for the first time at PR-open. That thinking is the value.
- **Reviewer routing based on the diff.** If the PR touches the payments module, route it to someone on the payments team automatically. If it adds a new SQL query, route it to a database-literate reviewer. CI can do this; you don't have to rely on the author picking the right reviewer.

## The CI shape that's worked for me

Roughly, an evaluation-aware CI pipeline runs in three layers.

**Layer 1: verification, fast and per-PR.** Lint, type check, unit tests, integration tests against ephemeral environments. The standard stuff. Must complete in under 10 minutes so it doesn't gate the review loop. Failures here block merge.

**Layer 2: evaluation, fast and per-PR.** The agent-aware checks: duplication detection over the diff, security pattern scans, custom lint rules for conventions, diff-scope-vs-description heuristic. Also fast (under 5 minutes), also blocks merge on hard failures, but mostly produces *advisory* comments on the PR — "this looks like a duplicate of `existingHelper()`, consider reusing." Advisory comments don't block; they prompt the reviewer to look closer.

**Layer 3: evaluation, slow and nightly.** Mutation testing, dependency drift analysis, cross-codebase pattern surveys ("how many places now do X this new way vs the old way"). These don't block PRs but feed a dashboard the team looks at weekly. They're how you notice that agent-generated PRs have been quietly introducing a new variation of an existing pattern for three weeks.

The split matters. Putting slow checks in the per-PR path makes the review loop intolerable; not running them at all means you discover the divergence months later. Nightly with a dashboard is the right cadence for the slow checks.

![Three horizontal layers stacked. Layer 01: per-PR verification (under 10 min, blocks merge — lint, type, unit, integration). Layer 02: per-PR evaluation (under 5 min, mostly advisory — duplication, security pattern, convention, scope-vs-description; hard failures block, soft findings post one aggregated comment). Layer 03: nightly evaluation (slow, dashboard, doesn't block — mutation testing, dependency drift, cross-codebase pattern surveys).](/writing/ci-three-layers.svg "Three layers split by cadence. Slow checks belong on the nightly, not the per-PR path.")

## The signal-to-noise problem, and how to keep it under control

Advisory comments are useful exactly until they're not. A bot that comments seven times on every PR gets muted within a week, and then you lose the signal you were trying to surface.

Three rules that have kept it useful:

1. **Each rule must have a precision floor.** If "this looks like a duplicate" is wrong more than 30% of the time, the comment becomes noise and people start ignoring all of them. Tune or disable rules that fall below the floor.
2. **Aggregate rather than spray.** Instead of seven separate comments on a 200-line diff, post one comment with a structured summary: "3 advisory findings: 1 duplication candidate, 1 missing auth annotation, 1 scope-creep flag." Reviewers actually read summaries; they skim sprays.
3. **Suppress rules per-directory where they don't apply.** A "missing auth annotation" rule that fires on the unauthenticated public health-check endpoint will be ignored everywhere if you can't tell it to shut up about that endpoint. Configurable exclusions per path are non-optional.

## The metric to watch

The single number that has told me whether the evaluation layer is working: **defect-escape rate broken down by author type** (human-only PR, agent-assisted PR, agent-primary PR). Track defects that escaped to production and trace them back to the PR.

In month one, agent-primary PRs almost always have a higher escape rate. That's not a tooling failure; it's a calibration baseline. The question is whether the rate converges toward the human-only rate as you tune the evaluation layer. If it does, you're making progress. If it doesn't after a couple of months, the evaluation rules aren't catching what's actually slipping through and you need to look at the specific defects and add rules that would have flagged them.

![A grouped bar chart of defect-escape rate by author type. Human-only PRs hold flat at 2.0% in both month 1 and month 3. Agent-assisted PRs drop from 4.5% (month 1) to 2.5% (month 3). Agent-primary PRs drop from 7.0% (month 1) to 3.2% (month 3). The convergence is the signal that the evaluation layer is working.](/writing/ci-escape-by-author.svg "Track escape rate by author type. Convergence over months means the evaluation layer is catching what slips through; divergence means tune the rules.")

Secondary metrics worth a dashboard, not an alarm:

- **PR cycle time, broken down by author type.** Agent PRs that take longer to review than they did to write are net-neutral.
- **Reviewer comment count per PR.** Climbing comments on agent PRs means the agent is generating work, not absorbing it.
- **Advisory-rule fire rate vs. accept rate.** How often does each rule fire, and when it does, how often does it produce a change? Rules with high fire and low accept are noise; cut them.

## What about LLM-as-judge in CI?

The obvious next step is to put a model in the loop — have an LLM read the diff and give an opinion. Worth doing for some things, not for others.

Where it works: structured questions with narrow answers. "Does this PR's test coverage include the edge case the description mentions?" "Does this diff's commit message accurately describe the changes?" "Is there a typo in the error message a user will see?" These are well-bounded, the model is checking factual consistency, and the false-positive rate is tolerable.

Where it doesn't: open-ended code review. "Review this PR." The model produces plausible-looking comments that mix real findings with nitpicks and inventions. The comment fatigue is severe, and senior engineers stop trusting any of the bot's comments after the third invented one.

The pattern I've landed on: use LLM-as-judge for *specific narrow questions* triggered by structural conditions in the PR (e.g., "this PR adds a public-facing string; check for typos"), and never for "is this code good." The former saves time; the latter wastes it.

## The bigger shift

The shift behind all of this is that CI used to be a gate on a small number of human-authored changes per developer per day, and is becoming a gate on a much larger number of mixed-authorship changes per day. The cost of each marginal check matters more, the value of each blocked-too-late defect compounds harder, and the discipline of treating CI as a real engineering deliverable — versioned rules, observability on each rule's signal quality, deliberate trade-offs about precision and recall — separates teams that scale agent use cleanly from teams that ship more bugs faster.

CI is a product now. Its users are reviewers and authors, including agent-assisted ones. Investing in it pays back the same way investing in any developer-facing platform does: every team downstream gets faster and ships less broken code.

## The shortest version

- Verification (lint, type, test) catches one class of bug. Evaluation — design fit, duplication, convention drift, test-implementation collusion — catches a different class that matters more when agents write the code.
- Concrete evaluation checks: duplication over the diff and codebase, security pattern scans, custom convention lints, diff-scope-vs-description heuristic, mutation testing nightly.
- Advisory comments are signal until they're noise. Each rule needs a precision floor; aggregate findings into one summary per PR; allow per-path suppression.
- Track defect-escape rate by author type (human / agent-assisted / agent-primary) as the headline metric. It's the only one that tells you whether the system is actually getting better.
- LLM-as-judge works for narrow factual questions, fails for open-ended code review. Use it sparingly and for specific triggered checks.
- CI is a product now, not a checkbox. The investment in it pays back every team that ships through it.

Tests still tell you whether the code does what the test says. They don't tell you whether the code does what the *world* needs. Evaluation is the layer that asks the second question.
