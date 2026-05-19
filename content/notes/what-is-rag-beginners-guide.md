---
title: "What Is RAG? A Beginner's Guide With Real Examples and Working Code"
description: "Retrieval-Augmented Generation explained in plain English. The librarian analogy, the five steps, a working Python example you can run in 50 lines, and the mistakes every beginner makes the first time."
date: "2026-05-19"
tags: ["rag", "ai", "beginners", "tutorial", "python", "openai", "chromadb"]
---

Imagine you walk into a library and ask the librarian: *"What's our refund policy?"*

The librarian has two ways to answer.

**Way 1**: She tries to remember it from her head. She has read a lot of books, but not your company's specific policy. She makes up something that sounds reasonable. You walk away with the wrong answer.

**Way 2**: She walks to the shelf, picks up your company's policy handbook, finds the page about refunds, reads it, and answers your question based on what's written there. You walk away with the right answer.

**RAG is Way 2.**

That is the whole idea. The librarian is the AI model. The handbook is your data. RAG is the system that lets the model *look things up before answering*, instead of guessing from memory.

This post explains what RAG is, why it exists, and how to build a tiny working version in about 50 lines of Python. No prior AI knowledge needed.

## Why we need RAG in the first place

Large language models (like GPT, Claude, Gemini) are trained on a huge amount of public text from the internet. They know a lot of general things — how to write code, summarize an article, translate a sentence.

But they do not know:

- **Your company's documents.** Your policies, your wiki, your tickets.
- **Recent information.** Anything that happened after their training cutoff.
- **Private data.** Customer records, internal reports, anything not on the public internet.

If you ask a plain model "What's *our* refund policy?", it will either say "I don't know" or — worse — make up an answer that sounds confident but is completely wrong. This is called **hallucination**.

RAG fixes this by giving the model the relevant document *at the time of the question*, so it has the actual answer in front of it before it replies.

![Side-by-side comparison of a librarian. On the left, the librarian tries to answer from memory and gives a wrong answer with a red speech bubble. On the right, the same librarian walks to a shelf, picks up the company handbook, opens it, and gives the correct answer with a green speech bubble. Below, a label reads "RAG = letting the model look things up before answering."](/writing/rag-librarian-analogy.svg "Without RAG, the model guesses from memory. With RAG, it looks up the answer first.")

## What RAG stands for

**R** — **Retrieval.** Go find the relevant information.
**A** — **Augmented.** Add that information to the question.
**G** — **Generation.** Let the model write the answer using that information.

That's it. Three words, three steps.

## The five steps of a real RAG system

In practice, "go find the relevant information" needs a bit more detail. A working RAG system has five steps. We'll walk through each one.

![A beginner-friendly five-step flow shown as boxes connected by arrows. Step 1 Documents (your PDFs, wiki, FAQs). Step 2 Chunks (cut into small pieces). Step 3 Embeddings (turn each piece into numbers). Step 4 Vector Database (store the numbers). Step 5 Question time (find similar pieces, hand to model, get answer). The first four are setup-once; the fifth happens for every question.](/writing/rag-five-steps-beginner.svg "Steps 1 to 4 happen once when you set up. Step 5 happens every time a user asks a question.")

### Step 1: Gather your documents

This is anything you want the model to be able to answer about. Examples:

- A folder of `.pdf` files (company handbooks, manuals)
- A bunch of FAQ entries from your help center
- All your blog posts
- Customer support transcripts
- Recipes from a cookbook

For this tutorial, we'll use a simple example: three FAQ entries for a fake online shop.

### Step 2: Break documents into chunks

Documents are usually too big to give to a model all at once. So we cut them into smaller pieces called **chunks**.

A chunk is just a paragraph or two of text — small enough that the model can read it quickly, big enough that it makes sense on its own.

If your document is 50 pages, you might end up with 200 chunks.

### Step 3: Convert chunks into embeddings

This is the magic part. An **embedding** is a list of numbers that represents the *meaning* of a piece of text.

Two pieces of text with similar meanings will have similar numbers. Even if they use different words.

For example:
- *"What is your return policy?"* → `[0.12, -0.45, 0.88, ...]` (1,500 numbers)
- *"How do I send something back?"* → `[0.11, -0.44, 0.85, ...]` (1,500 numbers, very close)
- *"What's the weather today?"* → `[0.91, 0.23, -0.10, ...]` (1,500 numbers, very far)

We use an **embedding model** (a smaller AI) to convert text to numbers. OpenAI, Cohere, and HuggingFace all offer these.

### Step 4: Store embeddings in a vector database

A **vector database** is a special database designed to do one thing: given a list of numbers, find other lists of numbers that are close to it.

Popular ones for beginners:
- **ChromaDB** — easy to install, runs locally, no setup
- **pgvector** — a PostgreSQL extension if you already use Postgres
- **Pinecone, Weaviate, Qdrant** — managed cloud services

For our example, we'll use ChromaDB because it works out of the box.

### Step 5: At question time, retrieve and generate

When a user asks a question, we:

1. Turn their question into an embedding (using the same model from Step 3)
2. Ask the vector database: "find the 3 chunks closest to this question"
3. Build a prompt: *"Answer this question using these documents: [chunks]. Question: [user question]"*
4. Send the prompt to the LLM
5. Get the answer back

The model now has the actual document in front of it, so it answers from the document, not from memory.

## A working example in 50 lines of Python

Let's build a tiny RAG system that answers questions about a fake online shop's FAQ. You can copy this and run it.

### Setup

You'll need Python 3.9+ and an OpenAI API key. Install two packages:

```bash
pip install openai chromadb
```

Set your API key as an environment variable:

```bash
export OPENAI_API_KEY="sk-..."
```

### The code

```python
import os
from openai import OpenAI
import chromadb

client = OpenAI()
db = chromadb.Client()
collection = db.create_collection(name="shop_faq")

# Step 1 + 2: Our documents, already chunked (one chunk per FAQ entry)
faqs = [
    "Returns: You can return any item within 30 days of purchase. "
    "The item must be unused and in original packaging. Refunds take 5-7 business days.",

    "Shipping: We ship to over 50 countries. Standard shipping takes 5-10 business days. "
    "Express shipping takes 2-3 business days and costs $15 extra.",

    "Payment: We accept Visa, Mastercard, American Express, and PayPal. "
    "We do not accept cryptocurrency or bank transfers at this time.",
]

# Step 3 + 4: Embed each chunk and store it in the vector DB
def embed(text):
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding

for i, faq in enumerate(faqs):
    collection.add(
        ids=[f"faq-{i}"],
        embeddings=[embed(faq)],
        documents=[faq],
    )

# Step 5: Answer a question
def ask(question):
    # Find the 2 most relevant chunks
    results = collection.query(
        query_embeddings=[embed(question)],
        n_results=2,
    )
    context = "\n\n".join(results["documents"][0])

    # Build a prompt with the chunks + the question
    prompt = f"""Answer the question using only the documents below.
If the answer is not in the documents, say "I don't know."

Documents:
{context}

Question: {question}
Answer:"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content

# Try it out
print(ask("How long do I have to return something?"))
print(ask("Can I pay with Bitcoin?"))
print(ask("What's your CEO's name?"))
```

### What you'll see

```
You can return any item within 30 days of purchase, as long as it is
unused and in original packaging.

No, cryptocurrency is not accepted. We only accept Visa, Mastercard,
American Express, and PayPal.

I don't know.
```

Look at the third answer. The CEO's name is not in our FAQ, so the model says *"I don't know"* instead of making up a name. That's the whole point of RAG.

![A simplified code-flow diagram showing the Python example. On the left, three FAQ documents flow into an embed() function, then into ChromaDB (labeled "vector database"). On the right, a user's question also flows through embed(), then queries ChromaDB which returns the top 2 most similar chunks. Those chunks plus the question are bundled into a prompt and sent to GPT, which returns the final answer.](/writing/rag-beginner-code-flow.svg "Setup happens once on the left (embed every document, store it). At question time, the right path runs: embed the question, find similar chunks, ask the model.")

## What just happened, in plain words

When you asked *"How long do I have to return something?"*, here is what the code did:

1. It turned your question into 1,500 numbers (an embedding).
2. It asked ChromaDB to find the FAQ chunk with the closest numbers — the "returns" FAQ.
3. It built a prompt saying: "Here is the returns FAQ. Now answer the user's question about returns."
4. GPT read the FAQ and gave a clean answer based on it.

When you asked *"What's your CEO's name?"*, the same thing happened — except ChromaDB returned chunks about returns or shipping (because they had the highest similarity, even though it wasn't very high). The prompt said *"answer using these documents only"* — the documents don't mention a CEO, so the model said *"I don't know."*

This is much safer than letting the model guess.

## Common beginner mistakes (and how to avoid them)

**Mistake 1: Chunks too big or too small.**
- Too big (a whole 10-page chapter) — the model gets too much irrelevant text and loses focus.
- Too small (one sentence) — the chunk loses its surrounding context. "It costs $15" — what costs $15?
- Sweet spot for most cases: 200 to 500 words per chunk.

**Mistake 2: Forgetting to use the same embedding model everywhere.**
You must embed your documents and your user's question with the *same* model. If you embed documents with one model and questions with another, the numbers don't match and retrieval fails. This is a frustrating bug because the code still runs — it just returns garbage.

**Mistake 3: Not telling the model to say "I don't know."**
Without that instruction in the prompt, the model will happily make up an answer when the retrieved chunks don't contain one. Always include the "if you don't know, say so" rule.

**Mistake 4: Embedding too much at once and ignoring cost.**
Embeddings cost money per token. Embedding a million-word document might cost $5-$20. Not huge, but you should know before you click run. And re-embedding is even more expensive — pick your embedding model carefully because changing it later means embedding everything again.

**Mistake 5: Confusing the embedding model and the chat model.**
They are two different things.
- The **embedding model** (`text-embedding-3-small`) turns text into numbers. Cheap.
- The **chat model** (`gpt-4o-mini`, `claude-opus-4-7`) writes the answer. More expensive.
You use both, for different jobs.

## When does RAG help, and when doesn't it?

**RAG helps when:**
- You have a body of documents the model wasn't trained on (company docs, recent news, niche knowledge).
- You want answers grounded in source material you can point to.
- You want the model to say "I don't know" when the answer isn't in your docs.

**RAG does not help when:**
- The task is pure reasoning or creativity (write a poem, solve a math problem). The model doesn't need outside documents for those.
- You need real-time data (stock prices, today's weather). Use a tool/API instead, not RAG.
- The "documents" are tiny and could just fit in the prompt directly. RAG is overkill for 5 sentences.

## What to learn next

You now have the basic mental model. To go deeper:

1. **Try different embedding models** — `text-embedding-3-small` vs `text-embedding-3-large` vs open-source ones. See which gives better retrieval on your data.
2. **Try different vector databases** — replace ChromaDB with Pinecone or pgvector when you outgrow local storage.
3. **Try chunking strategies** — by paragraph, by section, by sentence with overlap. The chunking choice matters more than people expect.
4. **Try re-ranking** — after retrieving the top 10 chunks, use a smaller model to re-rank them and pick the best 3. Usually a big quality win.
5. **Try evaluation** — make a list of 20 questions with known answers, run your RAG pipeline, and check how often it gets them right. This is how you measure improvements instead of guessing.

If you want the deeper, production-engineering version of all of this — chunking land mines, hybrid search, ACL filtering, freshness, evals in CI — I wrote a separate post for that: [RAG From a Backend Engineer's POV](/writing/rag-from-backend-engineer-pov).

## The shortest version

- A plain LLM only knows what it was trained on. It can't answer questions about *your* data.
- RAG = give the model the right document *before* it answers, so it answers from the document, not from memory.
- Five steps: gather documents → break into chunks → turn chunks into embeddings (numbers) → store in a vector database → at question time, find similar chunks and pass them to the model.
- A working version is about 50 lines of Python with OpenAI + ChromaDB. You can run it today.
- Always tell the model to say "I don't know" if the answer isn't in the documents. This prevents hallucination.
- Use the *same* embedding model for documents and questions, every time.

You now know what RAG is and how to build one. Go try it.
