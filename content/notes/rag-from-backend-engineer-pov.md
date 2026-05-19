---
title: "RAG From a Backend Engineer's POV: It's a Data Pipeline, Not a Magic Trick"
description: "Retrieval-augmented generation has been wrapped in enough mystique to obscure that it's mostly an ETL problem. What the pipeline actually looks like, where the real engineering happens, and the failure modes that have nothing to do with the model."
date: "2026-05-15"
tags: ["rag", "ai", "backend", "vector-db", "pgvector", "etl", "architecture"]
---

A friend asked me last month to explain RAG without using the words "embedding" or "vector store" in the first sentence. The version I gave: imagine your company's internal Q&A bot is a new hire who is fluent in English but knows nothing about your company. Before each question, you let them read a few pages from the wiki that look relevant. They answer based on what they just read.

That's RAG. The "retrieval-augmented" part is the wiki-flipping; the "generation" part is the answer. Strip the model out of the picture and you're left with: a system that, given a question, finds the most relevant slice of your data and hands it to whatever produces the answer. That system is an ETL pipeline. It has chunks, indexes, ranking, freshness guarantees, and observability requirements, and it lives or dies on how well those work — not on which model you bolt onto the end.

This post is about RAG as a backend engineering problem, because that's what it mostly is, and that's where the failure modes I keep seeing actually live.

## The honest mental model

A working RAG system has five stages. Each one is a place to make mistakes.

1. **Ingest.** Pull source documents from wherever they live — docs, tickets, code, PDFs, transcripts. The pipeline runs continuously or on schedule and handles updates, deletes, and renames.
2. **Chunk.** Break each document into pieces small enough to fit in a context window but large enough to carry meaning. Choices here have outsized impact.
3. **Embed.** Convert each chunk into a vector via an embedding model. Store the chunk text, the vector, and metadata (source, timestamp, permissions).
4. **Retrieve.** Given a user query, embed the query the same way, find the top-K chunks by similarity, optionally filter by metadata, optionally re-rank.
5. **Generate.** Hand the chunks plus the query to an LLM with a prompt that says "answer using these documents; if the answer isn't here, say so."

The model is one of those five stages. The other four are pure backend engineering. If you spend 80% of your design effort on the model and 20% on the rest, your system will be worse than the inverse, every time.

![A horizontal five-stage pipeline labeled Ingest, Chunk, Embed, Retrieve, Generate, with arrows between each. The first four are drawn as standard boxes; Generate is highlighted with an accent fill, labeled "smallest piece." Below, a stacked bar shows ETL is ~80% of the work and the model call is ~20%.](/writing/rag-pipeline-stages.svg "Four ETL stages plus one model call. The model gets the credit; the pipeline does the work.")

## Chunking is where most teams lose

Chunking decisions, more than any other single thing, determine whether retrieval works. The first time you build a RAG system, you'll be tempted to split documents on every N tokens — say, 500 token chunks with 50 token overlap. This is the default in every tutorial. It is also why every tutorial's bot gives mediocre answers.

The problems with naive size-based chunking:

- **A chunk that splits mid-sentence destroys meaning.** The embedding for "the system fails when concurrent writes exceed" + "the queue depth limit" is not the same as the embedding for the whole sentence. Retrieval misses.
- **A chunk that spans two unrelated topics dilutes both.** A 500-token slice that ends one section and starts another has an embedding that represents an average of two ideas, neither well.
- **A chunk torn from its hierarchy loses context.** "It requires a separate IAM role" is meaningless without knowing what "it" refers to. The chunk above had the answer; this one doesn't get to see it at retrieval time.

The chunking that actually works is **structure-aware**. For Markdown / docs: split on headings, keep section context as metadata, never split mid-paragraph. For code: split on function or class boundaries, attach the file path and module to the chunk metadata. For PDFs: extract the document structure first (with a real PDF parser, not regex on raw text), then chunk by section.

A pattern that consistently outperforms naive chunking: store a *small* chunk for retrieval and a *larger* surrounding window for generation. The small chunk is what gets embedded and searched; when it's a hit, you fetch the surrounding paragraph or section and feed that — not just the matched chunk — to the model. The model sees enough context to answer; the index isn't bloated with redundant overlapping chunks.

![Two panels showing the same source document chunked two ways. Left panel (naive 500-token split): dashed red lines cut mid-sentence and across section boundaries, producing chunks like "the system fails when concurrent writes exceed" with no completion — labeled "embedding misses the query." Right panel (structure-aware): chunks split cleanly on headings, each carrying section metadata, each containing one coherent idea.](/writing/rag-chunking-strategies.svg "Same document, two chunking strategies. The naive split breaks meaning; structure-aware keeps each chunk coherent and tagged.")

## Embeddings are a frozen interface

The embedding model you pick is a contract. Every chunk in your index was embedded with it, every query is embedded with it, and the dot product of those two is the only thing that determines retrieval.

Consequences:

- **You cannot mix embedding models in one index.** Vectors from `text-embedding-3-small` and `text-embedding-3-large` are in different spaces; their cosine similarity is meaningless. The first time you migrate models, you re-embed every document. Budget for it.
- **Re-embedding is the expensive operation in your pipeline.** It dominates the cost of every meaningful pipeline change. Plan ingest to be re-runnable from the source documents without manual intervention.
- **The dimensions matter for storage, not just quality.** A 1536-dimension vector is roughly 6KB before compression. A million chunks is 6GB of vector data alone. PostgreSQL with pgvector handles this fine with HNSW indexes; Pinecone or other dedicated stores handle it more cheaply at large scale. Pick once based on your scale.

The embedding model also determines the language coverage you get. If your documents are mostly English but your users sometimes query in Hindi or Spanish, you need an embedding model that puts semantically similar text in the same space across languages. Most modern embedding models do this; older or smaller ones don't, and you'll find out the first time a non-English query returns nothing relevant.

## Retrieval is more than top-K cosine similarity

The naive retrieval loop — embed the query, find the top-10 chunks by cosine similarity, hand them to the model — works on the demo and fails on the real corpus. The real corpus has near-duplicates, irrelevant high-similarity matches, and permission boundaries.

What production retrieval actually looks like:

- **Pre-filter by metadata before the vector search.** The user only has access to documents from their team; the query is about events in the last 30 days. Apply those filters at the DB level, then do the vector search on the filtered set. Searching the whole index and filtering after wastes work and loses relevant results that got pushed out of the top-K by irrelevant ones.
- **Hybrid search beats pure vector on most real corpora.** Combine BM25 (keyword) and vector (semantic) scoring. Vector retrieval misses exact terms it has never seen (product names, error codes, internal jargon); BM25 catches them. PostgreSQL with `tsvector` plus pgvector gives you both in one DB.
- **Re-rank the top-N with a cross-encoder.** Vector retrieval is fast and approximate; a cross-encoder takes the top 50 results and scores each one against the query directly. Slower per item, much better ranking. The trade is one extra model call per query — usually worth it.
- **Deduplicate near-identical chunks.** Documentation evolves; the same paragraph exists in three places. If your top-10 is the same idea repeated, the model has nine wasted slots in its context window. A simple Jaccard similarity check on the chunk text drops the duplicates.

The retrieval pipeline is where most RAG quality wins actually come from. A mediocre model with great retrieval beats a great model with mediocre retrieval, every time.

![A four-step retrieval pipeline. Query feeds into Pre-filter (ACL, recency, team scope at DB), then Hybrid (BM25 + vector, top 50), then Re-rank (cross-encoder, top 50 → 10), then Dedupe (Jaccard, drop near-duplicates) before reaching the generator. Below, an annotation lists what each layer prevents: ACL leaks, exact-term misses, irrelevant high-similarity matches burying good ones, context window wasted on repeats.](/writing/rag-retrieval-layers.svg "Production retrieval is four layers. Each one prevents a different failure mode of naive top-K cosine.")

## Freshness and updates: the part that ages worst

Most RAG demos use a static corpus. Most production systems don't have that luxury. The wiki updates. Tickets close. Code changes. The bot needs to reflect today's reality, not last quarter's snapshot.

Two patterns I've seen work:

1. **Source-of-truth-driven re-ingest.** Each source system has a way to enumerate its current state. The pipeline runs on a schedule (hourly or daily), computes a hash of each source document, and re-embeds only what changed. The metadata includes the source's last-modified timestamp so you can tell at query time whether a chunk is stale.
2. **Event-driven re-ingest.** Source systems emit "document changed" events to a queue; a worker consumes them and updates the index incrementally. Lower latency, higher engineering cost. Worth it when freshness is part of the product spec.

Deletes are the case that gets forgotten. A chunk for a deleted document keeps returning until you actively remove it from the index. The model will then confidently answer based on content that no longer exists. Every re-ingest cycle must include a "what's gone from the source" pass that prunes orphaned chunks. Skip this and the index slowly fills with ghosts.

## Permissions: not optional, often skipped

If different users should see different answers — which is true for almost every internal RAG system — the index must carry per-document access metadata, and every query must filter by the caller's permissions before retrieval.

The wrong approach: retrieve broadly, then post-filter the chunks before generation. This leaks information through retrieval timing and through the model's awareness that there were other relevant chunks it didn't get to see. It also breaks the moment a developer forgets the filter step on a new endpoint.

The right approach: store ACL information in the chunk metadata, push the filter into the vector store's pre-filter mechanism, and never run a retrieval call without one. PostgreSQL with pgvector handles this naturally — you can `WHERE permissions @> '{"team_id": 42}'` alongside the vector similarity. Dedicated vector stores have varying levels of support; check this before you commit.

The land mine: chunks copied from multiple source documents that had different permissions. A snippet from a public doc and a snippet from a confidential doc that happen to contain similar language end up in the same retrieval response. The metadata must be per-chunk, not per-source, and the merge logic must preserve the most-restrictive ACL.

## The prompt is the smallest part — and the most ignored

After all the retrieval engineering, the actual generation step is one prompt. It is also the place teams hand-wave the most.

A generation prompt that doesn't fail loudly:

```
You are answering a question using only the documents provided below.

Rules:
- If the answer is in the documents, answer concisely and cite the source.
- If the answer is partially in the documents, say what you know and what you don't.
- If the answer is NOT in the documents, say "I don't have that information"
  and do not guess.

Question: {{user_question}}

Documents:
{{#each chunks}}
[{{source}}, {{date}}]
{{content}}
---
{{/each}}
```

Three things this prompt does that ad-hoc prompts often miss:

- **It tells the model what to do when retrieval failed.** Without an explicit "say I don't know" clause, the model fabricates. With it, the model abstains roughly 90% of the time when it should — far from perfect, much better than the default.
- **It asks for citations.** Citations are how users debug bad answers and how you measure retrieval quality after the fact ("the model cited chunk X; was X actually the right source?").
- **It scopes the model to the documents.** Without this, the model blends retrieved content with its training knowledge, and you can't tell which part of the answer came from which.

The prompt is short, opinionated, and rarely needs to change. The retrieval pipeline behind it is where you'll spend your time.

## Evaluating: the part without which you're flying blind

A RAG system can produce a plausible answer to anything. Whether it produces a *correct* answer is invisible without an eval pipeline.

The minimum viable eval:

- A set of 50–100 known question-answer pairs, sourced from your actual users when possible.
- A run that, for each question, executes the full pipeline and records: the retrieved chunks, the model's answer, the latency, the token cost.
- An automated scoring step that compares the answer to the expected answer — either with simple metrics (does the answer contain the expected keywords) or with an LLM-as-judge (does the answer convey the expected information). LLM-as-judge is more expensive and more nuanced; use it for the cases that simple metrics can't score.
- A baseline score, and a CI check that fails the build if the score drops below the baseline by more than a threshold.

This is the same discipline as any other test suite. The version of this you regret not having is the one that catches a chunking change that lifted retrieval quality on the demo dataset and dropped it on the real one. Without an eval set, you ship the change, users complain a week later, and you don't know whether to roll back or push forward because you have no measurement.

## The cost story

A working RAG system has three cost centers:

1. **Embedding cost at ingest.** One-time per chunk, but multiplied by every re-ingest and every embedding model change.
2. **Vector storage.** Linear in chunks. Manageable in PostgreSQL up to single-digit millions of chunks; consider a dedicated store past that.
3. **Per-query generation cost.** The big one. Each query embeds the question (cheap), retrieves K chunks (cheap), and runs a generation call with K chunks of context (not cheap). A 4K-token context per query at scale is the bill that surprises teams.

The lever that pays for itself: **cache the generation step** keyed on `(normalized_query, set_of_retrieved_chunk_ids)`. Identical queries with identical retrievals return identical answers; serve them from Redis with a TTL appropriate for freshness. Hit rates of 30–50% are achievable on most internal systems, and every hit is a generation call you didn't pay for.

## The shortest version

- RAG is ETL plus a model. The ETL is most of the engineering and most of the quality differential.
- Chunk on structure, not on size. Small chunks for retrieval, larger windows for generation.
- Embedding model is a frozen interface — picking it locks you in until the next full re-ingest.
- Production retrieval is hybrid (BM25 + vector), metadata-filtered, re-ranked, deduplicated. Naive top-K cosine doesn't survive contact with a real corpus.
- Freshness and deletes are not optional. Index ghosts produce confident wrong answers.
- Permissions filter at retrieval, not after. Per-chunk ACLs, pre-filter before vector search.
- The generation prompt is short and includes "say you don't know if the answer isn't here." Without it, the model fabricates.
- An eval set with CI integration is the difference between knowing whether your changes helped and guessing.

The model gets the credit. The pipeline does the work. Spend your engineering time accordingly.
