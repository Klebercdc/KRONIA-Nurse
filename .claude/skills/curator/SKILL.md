---
name: curator
description: Bulk LLM inference and structured data curation using Bespoke Curator (bespokelabs-curator) — a Python library for running the same prompt/parse pipeline over many inputs with built-in parallelism, response caching, fault recovery, and batch-API cost savings. Use when a task needs the same LLM transformation applied to a large list of items (dozens to millions) — e.g. generating structured records from a dataset, bulk classification, synthetic data generation, or RAG/RAFT-style dataset construction — especially when doing this by hand (one LLM call per item, tracked manually) would be slow or error-prone. Not for one-off single-prompt tasks.
allowed-tools:
  - read
  - bash
effort: medium
---

# Curator — Bulk Inference & Structured Data Curation

## Core Principle: Define prompt + parse once, let Curator handle scale

Curator (`bespokelabs-curator` on PyPI, source: github.com/bespokelabsai/curator) turns "call an LLM once per item in a list, exactly the same way" into a class with two methods:

```python
from bespokelabs import curator
from pydantic import BaseModel, Field
from typing import Literal

class Sentiment(BaseModel):
    sentiment: Literal["positive", "negative", "neutral"] = Field(description="Sentiment of the review")

class SentimentAnalyzer(curator.LLM):
    def prompt(self, item):
        return f"Determine the sentiment of the product from the review: {item['review']}"

    def parse(self, item, response: Sentiment):
        return [{"name": item["name"], "sentiment": response.sentiment}]

analyzer = SentimentAnalyzer(model_name="gpt-4o-mini", response_format=Sentiment, batch=False)
result = analyzer(dataset)  # dataset: list[dict] or a HuggingFace Dataset
print(result.to_pandas())
```

`prompt(item)` builds the request; `parse(item, response)` turns the structured response back into row(s). Curator runs this over every item in the input list/Dataset with automatic parallelism, retry-on-failure, and response caching — the same call re-run with unchanged inputs replays from cache instead of re-hitting the API.

## When to reach for this

Use Curator instead of a hand-rolled loop when:
- The same prompt shape needs to run over **many** items (tens to millions) — not a single ad-hoc call.
- You want **structured output** (Pydantic `response_format`) validated automatically.
- You want **resumability**: a crash or rate-limit mid-run shouldn't force starting over — Curator's cache means a re-run only processes what's missing/failed.
- Cost matters: set `batch=True` to route through the provider's batch API (typically ~50% cheaper, async turnaround) instead of the synchronous online API.
- You need to **chain** LLM stages (output of one `curator.LLM` subclass feeds the next), e.g. topic-generation → content-generation.

Don't reach for it for a single one-off prompt, or when the transformation genuinely needs per-item human judgment that can't be expressed as one fixed `prompt`/`parse` pair (e.g. deciding per-item whether a source is even relevant — that curation step should usually happen *before* handing the filtered list to Curator).

## Installation

```bash
pip install bespokelabs-curator
# or, in a poetry/uv project:
poetry add bespokelabs-curator
```

Requires the relevant provider credentials as env vars (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, etc., depending on `model_name`).

## Provider support

Curator supports OpenAI, Anthropic, Gemini, Mistral, and vLLM (offline/local) natively, plus **any LiteLLM-supported provider** (which includes Groq — use a `model_name` like `"groq/llama-3.3-70b-versatile"`) through the LiteLLM online request processor. Batch-mode (`batch=True`) has dedicated request processors for OpenAI, Anthropic, Gemini, and Mistral — check `src/bespokelabs/curator/request_processor/batch/` in the upstream source for exactly which providers support batch vs. online-only.

## Key knobs

- `batch=True` — use the provider's batch API (cheaper, async, higher latency) instead of online calls.
- `response_format=<PydanticModel>` — validated structured output; `parse()` receives an already-parsed instance.
- Caching is automatic and keyed on the exact prompt + model + params — change any of those to force re-generation for those rows.
- `curator.Agent` (see `src/bespokelabs/curator/agent/`) — for multi-turn/tool-using flows instead of single-shot prompt/parse.
- `CodeExecutor` (see `src/bespokelabs/curator/code_executor/`) — run and validate code the LLM generated, with local/Ray/Docker/e2b backends.
- `blocks/raft.py` — built-in RAFT (Retrieval-Augmented Fine-Tuning) pipeline: takes domain documents, generates questions, prepares fine-tuning data. Directly relevant for RAG/knowledge-base dataset construction.
- Fine-tuning trainers (`finetune/trainer/`) for Fireworks AI and Tinker, using the same curated-dataset output.
- A local viewer (`curator viewer`) to watch generation progress and inspect cached responses live.

## Reference

Full upstream README (installation details, more examples, changelog) is at `reference/upstream-readme.md`. For anything not covered there, check github.com/bespokelabsai/curator directly — the source is not vendored in this skill (it's a normal pip dependency, not a copy-paste template); pull it fresh via pip/poetry when a project actually needs to run it.
