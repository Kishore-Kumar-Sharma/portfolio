---
title: "Agentic Dev Workflows for Senior Engineers: What Actually Changes When You Stop Typing"
description: "Claude Code, Cursor, Antigravity — the tools are real, the productivity claims are mostly real, and the new skill is shaping work for an agent rather than doing it. A senior engineer's field notes on what changed and what didn't."
date: "2026-05-16"
tags: ["ai", "agents", "claude-code", "cursor", "antigravity", "productivity", "engineering-leadership"]
---

I have been writing software professionally for six and a half years. For most of that time, the unit of my work was a keystroke. Now, increasingly, it's a paragraph — a description of what I want, handed to an agent that produces a diff. The keystrokes are still there, but they live in different places: drafting prompts, reviewing diffs, gating merges, deciding what to delegate at all.

This is not the same job. It's also not a different job — it's the same job with a different cadence and a different set of leverage points. After a year of leaning into Claude Code, Cursor, and Antigravity across real production work, here's what I've actually changed about how I work, where the wins are, and where the failure modes are sharp enough that I've been burned by them.

## The shift, in one sentence

Senior engineering work used to be 70% writing code and 30% deciding what code to write. The ratio has roughly inverted, and the deciding-what-to-write half got harder, because now it includes deciding what to write *yourself*, what to delegate to an agent, what to delegate but heavily review, and what to delegate and trust.

That sounds neutral. It's not. The work that's left after agents take the easy parts is denser, less interruptible, and more consequential per minute. A bad hour spent shaping an agent badly produces hundreds of lines of plausible code that don't work and that look enough like working code to ship if no one's paying attention. The cost of being unfocused while operating an agent is higher than the cost of being unfocused while writing code yourself.

## What I delegate, what I don't

The decision is not "is this hard or easy" — agents handle some genuinely hard tasks fine and choke on some genuinely trivial ones. The decision is **how cheap is verification.**

I delegate freely:

- **Mechanical refactors with a clear shape.** "Rename `X` to `Y` everywhere and update the imports." "Convert these 30 `*ngIf` directives to `@if`." Verifiable by reading the diff and running tests.
- **Boilerplate I've written before.** A new CRUD endpoint with the same patterns as the others. The agent's draft is faster than my draft and I review it in the same time either way.
- **Test scaffolding.** Setting up test fixtures, writing assertions for an existing function, generating edge-case test data. The agent guesses, I prune.
- **Type-level work.** TypeScript generics, Zod schemas, Spring configuration class shapes. The agent has read more of this than I have and gets to the right shape faster.
- **First-pass code reviews.** The agent flags the obvious; I focus on the architectural.
- **Investigations across many files.** "Find every place we call `processPayment` and check whether it handles the new currency field." Read-only, low-stakes, fast to verify.

I do not delegate without close attention:

- **Anything that crosses a security boundary.** Auth, secrets, input validation, SQL construction. The agent writes plausible-looking code that has subtle vulnerabilities, and "plausible-looking" is exactly the failure mode I'm worst at catching when I'm tired.
- **Data migrations and schema changes.** Reversibility matters. The agent does not naturally think about whether a migration will hold under concurrent writes on a 50M-row table. I do.
- **Anything where I don't already know the shape of the right answer.** If I can't tell at a glance whether the diff is correct, I shouldn't be delegating — I should be learning the domain first, and *then* delegating.
- **Cross-cutting architectural decisions.** The agent will produce a plausible local solution that ignores how it interacts with three other systems. The model has no opinion about the systems you haven't shown it.

The pattern: **delegate when I can verify in less time than it would take to write.** When verification cost exceeds writing cost, I write.

![A 2x2 matrix plotting verification cost (vertical) against write cost (horizontal). Top-left (high verify, low write): "write yourself" — security boundaries, data migrations, unfamiliar domains. Top-right (high verify, high write): "delegate with close watch" — cross-cutting refactors, multi-file investigations. Bottom-right (low verify, high write): "delegate freely" — mechanical refactors, test scaffolding, type-level work. Bottom-left (low verify, low write): "either works."](/writing/delegate-vs-write.svg "The delegation decision is not hard-vs-easy; it's verification cost. Delegate when verification is cheaper than writing.")

## The new senior skill: shaping work for an agent

This is the part nobody talked about a year ago and everyone is figuring out now. Briefing an agent is not "asking nicely for code." It's a specific skill that mirrors what experienced engineers do when delegating to a junior — except faster, and with no follow-up questions.

Four things distinguish a brief that works from one that doesn't:

1. **Stating the goal, not the steps.** "Make the rate limiter use a token bucket instead of a fixed window, and update the tests" beats "go to `RateLimiter.ts`, change line 42, add a new method, then update the test on line 88." The agent is better at picking the steps once it knows the goal; locking it into the wrong steps wastes time.
2. **Listing what you've already ruled out.** "I tried using Redis EXPIRE for this and it has a race; I want a Lua script approach." Without the ruled-out option, the agent will suggest it.
3. **Naming the constraints that aren't visible in the code.** "We can't add a database call here because this is the hot path." "This service runs in a Lambda with a 256MB memory cap." Constraints the agent can't infer from reading nearby files become the things it violates first.
4. **Telling it what to do when it's stuck.** "If you can't find the function, stop and ask — don't guess at a path." A good brief lets the agent fail loudly instead of producing confident wrong work.

A brief that does all four reliably produces work I can ship after a review. A brief that skips them produces work I have to redo myself, slower than if I'd written it directly.

![Four numbered slots stacked vertically. 01: state the goal, not the steps. 02: list what you ruled out. 03: name hidden constraints. 04: tell it what to do when stuck. Each has a one-line example.](/writing/brief-anatomy.svg "Four elements of a brief that produces shippable work. Skip any of them and you'll redo the work yourself.")

## Tool by tool, what I use them for

The tools are not interchangeable. After running them in parallel for months, here's where each one lands for me.

**Claude Code.** My default for anything that touches the codebase end-to-end. Strong at multi-file changes, strong at reading through context to figure out the right place to make a change, and good at stopping to ask when something is genuinely ambiguous. The slash-command model and hook system make it the most automatable of the three — I have several internal `/` commands that codify standard workflows ("run the full lint, build, test, and report on what's broken"). The cost is that the loop is slower than a pure autocomplete tool; it's not where I do micro-edits.

**Cursor.** Where I do micro-edits and where I drive when the work is narrow and inside one or two files. The completion model is fast enough to feel like a more capable autocomplete, and the inline-edit mode is the right shape for "this function is wrong, fix it" without leaving the editor. I reach for Cursor when I know what I want, want it now, and don't want a conversation.

**Antigravity.** The newer entrant in my rotation; I've been using it for orchestrated multi-step work where I want to see the agent's plan before it runs and review checkpoints between steps. Stronger separation between planning and execution than the other two, which I appreciate for higher-stakes changes. Still earning trust in production work; the plan-first ergonomics are real.

The honest summary: I use all three because each one's failure mode is different and I'd rather switch tools than fight a tool that's wrong for the task. Claude Code for autonomous multi-file work, Cursor for tight in-editor edits, Antigravity for changes where I want to review the plan separately from the diff.

## The review discipline that prevents disasters

A diff from an agent looks like a diff from a colleague. It is not the same thing. A colleague has skin in the game and has thought about the consequences; the agent has produced the most plausible local solution and has no continuity. Three review habits that have saved me real incidents:

1. **Read the diff in full before running anything.** Not skim. Read. If the diff is too long to read in full, the work was scoped too large — split the task and re-run.
2. **Check what the agent *didn't* change.** The most expensive bugs I've shipped from agent work were not wrong lines added; they were necessary lines not added. A new field added to a request without the corresponding migration. A new caller of a function without the corresponding test. The diff looks complete because what's there is correct; the bug is in the silence.
3. **Run the code mentally against the failure modes you care about.** What happens at zero input? At maximum input? Under concurrent calls? When the upstream is slow? The agent rarely tests these on its own. If you don't either, you've shipped tested-only-on-the-happy-path code with high confidence because the diff looked clean.

Treating an agent's output the way you'd treat a junior's PR — careful first review, decreasing scrutiny as trust builds for specific patterns, never zero scrutiny for security-sensitive paths — is roughly the right calibration.

![Three columns of review disciplines. 01: read the full diff (skim is not read; if it's too long, the task was scoped too large). 02: check the silence (what the agent didn't change — new field with no migration, new caller with no test — sins of omission, the most expensive bug category). 03: walk the failure modes (zero input, max input, concurrent calls, slow upstream — agents test the happy path only).](/writing/review-disciplines.svg "Three review habits that prevent disasters from agent diffs. The expensive bugs are almost always sins of omission.")

## The team dynamics that change

This is the part that matters more than tooling and that most teams haven't adjusted to yet.

**Code review load goes up, not down.** More code is produced; the human bottleneck moves to review. If you didn't have a strong review culture before, agentic workflows expose that immediately. Investing in review skill — reading diffs fast, spotting absences, knowing when to ask for a smaller PR — is now a higher-leverage team improvement than any individual coding skill.

**The cost of being wrong about a junior's capability went up.** A junior who delegates well to an agent ships at a senior pace; a junior who delegates badly ships volume of plausible-wrong-code at a senior pace, which is much worse than a junior who shipped slowly. Mentoring shifts toward "let me watch how you brief the agent" instead of "let me read your code."

**Pairing changes shape.** Two engineers pairing with one agent is more productive than one engineer with an agent, in a way that surprised me. The second person catches the agent's wrong turns earlier and challenges the brief before it produces work. The pairing model that doesn't work is two engineers each running their own agent on overlapping files — you get merge conflicts that neither agent understands how to resolve.

**Tribal knowledge becomes a deliverable.** Things you used to keep in your head and explain on demand — "we never do X in this codebase because of Y" — have to live somewhere the agent can see. CLAUDE.md files, README updates, documented invariants. If the rule isn't written down, the agent will violate it every session.

## What didn't change

Plenty, actually.

The decision about *what* to build is unchanged and as important as it ever was. Agents lower the cost of building; they do not improve the quality of the question "should we build this." Bad ideas now produce more code, faster, which is a worse outcome than bad ideas produced slowly.

Production incidents still require a human who understands the system. The agent will help you triage; it will not page itself, won't notice the customer impact in your support channel, and won't make the judgment call about rolling back versus rolling forward.

The discipline of saying no is unchanged. Scope creep is easier than ever — the marginal cost of "and also add this feature" feels like zero when an agent is doing the typing, and isn't. The same product trade-offs apply; the work to make them hasn't gotten easier.

And the deep skill of being able to debug when everything is on fire is unchanged. The agent is helpful for the first round of triage and useless when the bug is in a place the agent hasn't been given context for. Senior engineers will still earn their keep at 3 AM the same way they did before.

## What I'd tell a senior engineer who's skeptical

A year ago, I was you. The honest take:

- Try the tools for a week of real work, not a toy project. The shape of the value only shows up in the messy middle of a real change.
- Don't try to use the agent for everything. Find the three tasks per week where it's clearly faster, ship those that way, expand from there.
- Build the review reflexes early. The discipline that catches an agent's silent bugs is the same discipline that catches a colleague's, just exercised more often.
- Write more things down. The CLAUDE.md / cursor rules / AGENTS.md files are real deliverables; treat them with the same care as you'd treat onboarding docs.
- Keep your edge in the work the agent can't do: architecture, debugging, judgment under uncertainty, knowing when not to ship. Those are the parts of the job that pay for the years of experience, and they're not going anywhere.

The wrong response is to dismiss this as "autocomplete with better marketing." The wrong response is also to lean in so hard that you stop writing code yourself and let your hands-on skill atrophy. Both ends fail. The middle — selective, skeptical, gradually expanding trust based on observed results — is where senior engineering actually lives now.

## The shortest version

- Delegate to agents what you can verify cheaper than you can write. Don't delegate what you can't verify.
- The new senior skill is briefing — stating goals, ruled-out options, hidden constraints, and what to do when stuck. Bad briefs produce confident wrong work.
- Use Claude Code for multi-file autonomous work, Cursor for tight in-editor edits, Antigravity for plan-then-execute changes. They're not interchangeable.
- Review every diff in full. Check what the agent *didn't* change. Walk the failure modes mentally. Most expensive bugs are sins of omission.
- Team-level changes matter more than individual ones: review load goes up, tribal knowledge has to be written down, pairing shifts shape.
- The judgment work — what to build, when to roll back, when to say no — is unchanged and worth more than it was.

Senior engineering is still senior engineering. The keyboard just isn't the bottleneck anymore.
