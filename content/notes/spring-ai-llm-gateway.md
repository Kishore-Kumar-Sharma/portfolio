---
title: "Spring AI as an LLM Gateway: One Service, Many Providers, No Vendor Lock-In"
description: "Treating LLM calls as just another upstream dependency. How to use Spring AI to build a multi-provider gateway with retries, circuit breakers, prompt versioning, and observability — the same hygiene you'd put around any external API."
date: "2026-05-17"
tags: ["spring-ai", "java", "spring-boot", "llm", "architecture", "resilience", "observability"]
---

Most teams I've seen put an LLM into production through a single SDK call buried inside a controller. The model is hard-coded. Retries don't exist. Timeouts are whatever the SDK defaults to. Token usage is invisible. When the provider has a bad afternoon, the whole feature goes down with it.

This is the same mistake we collectively made the first time anyone called a payment gateway from a Rails controller in 2012. The fix then was the same as the fix now: put the external call behind a service that owns the contract, the resilience, and the observability. Spring AI gives you the primitives. This post is how I assemble them into something I'm willing to wake up for at 3 AM.

## What Spring AI actually is

Spring AI is a thin abstraction over multiple LLM providers — OpenAI, Anthropic, Azure OpenAI, Bedrock, Google Vertex, Ollama, and a long tail of others. The core type is `ChatClient`, which exposes a fluent API that compiles down to whichever provider's wire protocol you've configured. There are also abstractions for embeddings, image generation, structured outputs via JSON schema, function calling, and a `VectorStore` interface that fronts pgvector, Chroma, Pinecone, and friends.

The library is opinionated about *interface* and unopinionated about *strategy*. It gives you a uniform call shape; it does not decide for you what to do when the provider returns a 429, when a response is malformed, or when the latency p99 doubles. Those are your decisions, and the gateway pattern is where they live.

## Why a gateway, not a direct call

Three reasons that pay for themselves within a quarter:

1. **Provider risk is real.** OpenAI rate-limits you. Anthropic has a regional outage. Bedrock changes a model ID. Each of these has happened to me in the last twelve months. If every feature calls the SDK directly, every feature breaks. If every feature calls *your* gateway, one team fails over and everyone else keeps shipping.
2. **Cost goes from invisible to budgeted.** Direct SDK calls produce no consolidated view. A gateway sees every request, knows the model, counts the tokens, and can enforce per-feature budgets — refuse the call when the daily spend on `summarize_document` exceeds its allowance, before the bill arrives.
3. **Prompt changes stop being code changes.** A prompt baked into a Java class requires a deploy to fix. A prompt versioned in the gateway is hot-reloadable, A/B-testable, and rollback-able without rebuilding a service.

The trade is real: you now own a service. If you're a five-person team running one LLM-backed feature, skip the gateway and put the resilience around the direct call. If you're past three features, build it.

## The shape of the gateway

The service exposes one endpoint per logical capability — not per model, not per provider. `POST /v1/complete`, `POST /v1/embed`, `POST /v1/extract`. Each capability internally decides which provider serves the request, what prompt template applies, what timeout to enforce, and what to do on failure.

![Diagram showing three callers (billing-service, support-bot, analytics-job) routing through a central LLM gateway that handles routing, retries, caching, prompts, budgets, metrics, tracing, and circuit breakers, fronting four providers (OpenAI, Anthropic, Bedrock, Vertex). One provider is marked DEGRADED with traffic failing over to Vertex.](/writing/llm-gateway-shape.svg "One endpoint per capability, many providers behind it. When one provider degrades, the gateway fails over and the callers don't know.")

The Spring Boot configuration leans on `application.yml` for provider credentials and on a `ProviderRouter` for per-capability decisions:

```yaml
spring:
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
      chat.options.model: gpt-5
    anthropic:
      api-key: ${ANTHROPIC_API_KEY}
      chat.options.model: claude-opus-4-7
    bedrock:
      region: us-east-1
```

And a router that picks a `ChatClient` based on the capability and the current routing policy:

```java
@Service
public class CompletionGateway {

    private final Map<String, ChatClient> providers;
    private final RoutingPolicy policy;
    private final PromptStore prompts;

    public CompletionResponse complete(CompletionRequest req) {
        var template = prompts.get(req.capability(), req.version());
        var providerName = policy.choose(req.capability());
        var client = providers.get(providerName);

        return client.prompt()
            .user(template.render(req.variables()))
            .options(template.options())
            .call()
            .entity(CompletionResponse.class);
    }
}
```

The interesting bits are not in that snippet. They're in everything that wraps it.

## Resilience: the part that decides whether you sleep

LLM providers fail in five distinct ways, and each needs a different response.

![Five rows mapping failure to response: 429 rate limit → backoff to Retry-After; 5xx server error → retry with jitter then open circuit; timeout → stream and cap input tokens; malformed output → retry once stricter then fail; safety block → distinct error type, not retryable.](/writing/llm-failure-modes.svg "Five distinct failure modes, five distinct strategies. Blanket retry makes some of them worse, not better.")

1. **Rate-limit (429).** Retry, but with backoff that respects the `Retry-After` header. Don't blindly retry — the second call before the window opens makes it worse.
2. **Server error (5xx).** Retry up to N times with jitter. After N failures, open the circuit and fail fast for the next minute.
3. **Timeout.** This is the most expensive failure to misdiagnose. A timeout might mean the provider is slow, *or* it might mean the response is too long and the model is still generating. Cap input tokens aggressively and use streaming where you can; a streaming call that hangs is a real timeout, a non-streaming call that hangs is ambiguous.
4. **Malformed output.** The model returned text that should have been JSON. Retry *once* with a stricter prompt ("respond ONLY with valid JSON, no prose"). If it fails again, fall back — either to a different model or to a deterministic placeholder. Do not loop forever asking the model to fix itself.
5. **Content filter / safety block.** The model refused. This is not a retryable error. Surface it to the caller as a distinct failure type so the UI can explain it to the user instead of saying "something went wrong."

Resilience4j handles 1–3 cleanly. The pattern that holds up:

```java
@CircuitBreaker(name = "openai-chat", fallbackMethod = "failoverToAnthropic")
@Retry(name = "openai-chat")
@TimeLimiter(name = "openai-chat")
public CompletableFuture<CompletionResponse> callOpenAI(CompletionRequest req) {
    return CompletableFuture.supplyAsync(() -> gateway.complete(req));
}

public CompletableFuture<CompletionResponse> failoverToAnthropic(
    CompletionRequest req, Throwable t
) {
    log.warn("OpenAI failed, falling back to Anthropic", t);
    return CompletableFuture.supplyAsync(
        () -> gateway.complete(req.withProvider("anthropic"))
    );
}
```

Two things worth saying clearly:

- **The fallback model is not interchangeable with the primary.** A prompt tuned for one model rarely lands the same on another. Either keep separate prompt versions per provider, or accept that fallback output will be worse and decide whether worse-but-available beats unavailable for that capability. (For a billing summary: yes. For structured extraction feeding another system: usually no — fail fast and let the caller handle it.)
- **Circuit breakers tell the truth, except when they don't.** I've written a whole separate post on this; the short version is that breakers based on response-code-only signals miss latency regressions, and an LLM provider going slow looks the same as one going down from a user's perspective.

## Prompt versioning, externalized

Hard-coded prompts mean every wording change is a deploy. After the third time I shipped a prod deploy to swap "summarize" for "summarize in three bullets," I moved prompts out of code.

The shape:

```yaml
# prompts/summarize_document/v3.yaml
capability: summarize_document
version: v3
provider: anthropic
model: claude-opus-4-7
options:
  temperature: 0.2
  max_tokens: 600
template: |
  You are summarizing a {{document_type}} for {{audience}}.
  Produce three bullets, each under 20 words.
  If the document is shorter than 200 words, return it verbatim.

  ---
  {{document_content}}
```

Prompts live in a `prompts/` directory mounted into the gateway. A `PromptStore` watches the directory, hot-reloads on change, and exposes the templates by `(capability, version)`. Callers pass a version explicitly:

```java
gateway.complete(CompletionRequest.of("summarize_document", "v3", vars));
```

This buys three things at once: rollback by changing one parameter, A/B testing by routing a percentage of traffic to a different version, and an audit log that records *exactly* which prompt produced which output.

For experimentation, I run `v3` for 90% of traffic and `v3-experimental` for 10%, with both responses captured in a `prompt_runs` table along with token usage, latency, and a quality score from an eval pipeline. After a week, the data tells me whether the experiment graduates.

## Observability: the metrics that actually matter

The default Spring AI metrics give you call counts and durations. That's the floor, not the ceiling. The metrics I check during an incident:

- **Tokens per request** (input and output, separately). A sudden jump in input tokens usually means a context-stuffing bug; a jump in output tokens means the model started rambling, often after a prompt change.
- **Cost per request**, computed from provider pricing tables. Easier to read in a dashboard than tokens. Alarms on cost regressions catch things token counts miss.
- **Time-to-first-token** for streaming calls. The most predictive single signal of "the provider is degrading." Latency-to-completion blends provider slowness with response length; time-to-first-token isolates the provider.
- **Fallback rate**, broken down by `(capability, primary_provider, fallback_provider)`. A spike in fallbacks is a leading indicator of the primary's health.
- **Malformed-output rate** per capability. Climbing malformed rate is usually a prompt regression — someone changed a template and forgot to update an example.
- **Cache hit rate**, for any capability with a cache layer. Misses cost real money. A drop in hit rate from 60% to 20% is a budget event.

Wire all of these through Micrometer to your existing Grafana / Prometheus stack. The LLM gateway is, from an ops perspective, just another upstream-heavy service. The patterns that work for any service work here — tracing IDs that propagate from caller through gateway through provider response logs, dashboards per capability not per provider, alarms tied to SLO burn rates.

## Caching is more important than the docs let on

A lot of LLM calls are repeat queries that the model produces the same output for. Caching them — keyed on `(capability, prompt_version, normalized_inputs)` — drops both latency and cost by a number that makes the gateway pay for itself.

A few things that have to be true for the cache to be safe:

- **Inputs must be normalized before hashing.** Lowercase, whitespace-collapsed, sorted JSON keys. Otherwise you cache the same logical request under twenty cache keys.
- **The cache key must include the prompt version.** Otherwise a prompt update silently keeps serving old responses for the cache TTL.
- **Time-sensitive capabilities must opt out.** Anything that summarizes today's data or references "now" cannot be cached, or it will return stale results past midnight.

I use Redis with a 7-day TTL for cacheable capabilities and explicit `cache: false` in the prompt YAML for capabilities that opt out. The hit rate after the first week of warming hovers around 40–60% on the ones we cache — and every hit is a token bill we don't pay.

## The cost guardrails I won't ship without

Three guardrails, each cheap to implement and each prevents a different category of disaster:

![Three boxes showing cost guardrails: daily budget per capability in USD with Redis-tracked spend and Slack alerts (stops the looping prompt); per-request token cap set above typical and below worst case (stops the rambling model); per-tenant rate limit lower than the provider's quota (stops the noisy neighbour).](/writing/llm-cost-guardrails.svg "Three configs, each preventing a different category of bill. The first incident teaches the lesson; the design lets you avoid the tuition.")

1. **Per-capability daily budget.** A configured ceiling in USD. The gateway tracks spend in Redis with a daily-rolling key. When the budget is exhausted, the capability returns a `503 budget_exhausted` and a Slack alert fires. Without this, the first prompt that loops on a 200-document input racks up a four-figure bill before anyone notices.
2. **Per-request token caps.** A hard `max_tokens` on every prompt template, set well above the typical response and well below the runaway worst case. No template ships without one.
3. **Per-tenant rate limit at the gateway.** Not the provider's rate limit — your own, lower one, so a misbehaving caller can't burn through your entire org's quota in five minutes.

These are not optional. The first incident teaches the lesson; the gateway design lets you avoid the tuition.

## What about Spring AI's higher-level abstractions?

Spring AI ships some opinionated higher-level building blocks — advisors, `ChatMemory`, `VectorStore`, function-calling helpers. Worth knowing the rules:

- **`Advisor`** is the right abstraction for cross-cutting concerns that apply to every call (logging, retry, content moderation, prompt augmentation). Use it. The chain shape is familiar from Spring MVC interceptors.
- **`ChatMemory`** is fine for short-lived conversational state inside a single user session. It is not a substitute for a real conversation store. Persist what matters to your own database; let `ChatMemory` handle the in-flight context window.
- **`VectorStore`** is a reasonable abstraction over pgvector, Pinecone, and friends — but its lowest common denominator hides features. If you need hybrid search, metadata filtering, or namespaced collections, you'll end up dropping to the native client. That's fine; the abstraction is still useful for the 80% case.
- **Function calling / tool use** integrates cleanly with the Spring bean model. The gotcha is that "exposing all your `@Service` beans as functions" is not a design — it's a vulnerability surface. Curate the function list the same way you'd curate an MCP tool list.

## The shortest version

- Treat LLM providers as upstream dependencies and put them behind a gateway service. The first feature doesn't justify it; the third one does.
- Spring AI gives you a uniform `ChatClient`; resilience, routing, caching, prompts, and observability are still your design.
- Resilience4j handles rate limits, server errors, and timeouts. Build a fallback path between providers but accept that the fallback's output is not identical to the primary's.
- Externalize prompts as versioned YAML and route by version. Rollback becomes a config change, not a deploy.
- The observability metrics that matter are tokens, cost, time-to-first-token, fallback rate, malformed-output rate, and cache hit rate — not just call count and duration.
- Cost guardrails are non-optional: per-capability daily budgets, per-request token caps, per-tenant rate limits. The first incident is expensive; the gateway design prevents the second.

LLMs are external APIs with worse error modes and stranger failure shapes than anything else you call. They deserve the same hygiene you put around the payment gateway, plus a little more, because the failure mode "produces convincing wrong output" doesn't exist for Stripe.
