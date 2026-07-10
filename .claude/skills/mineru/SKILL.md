---
name: mineru
description: High-accuracy document parsing using MinerU (OpenDataLab, PyPI package `mineru`, source github.com/opendatalab/MinerU) — converts PDF/DOCX/PPTX/XLSX/images into structured Markdown/JSON via a VLM+OCR pipeline (109-language OCR, formulas to LaTeX, tables to HTML, multi-column reading order, cross-page table merging). Use when a PDF needs OCR-grade extraction (scanned pages, handwriting, dense multi-column layout) that a plain text extractor or Docling can't recover reliably, or when very large PDFs need page-range chunking to fit memory. Not needed for plain-text or already-structured input, and not the default choice — it has a much heavier hardware/deploy footprint than Docling (see "MinerU vs. Docling" below).
allowed-tools:
  - read
  - bash
effort: medium
---

# MinerU — VLM+OCR Document Parsing for Hard PDFs

## Core Principle: OCR/VLM-grade extraction for the PDFs a text-layer parser gets wrong

MinerU runs a layout model (and, in `vlm-engine`/`hybrid-engine` backends, a vision-language model) over each page image instead of trusting the PDF's text layer. That recovers correct reading order on multi-column pages, table structure (→ HTML), formulas (→ LaTeX), and text on scanned/handwritten pages with no text layer at all, across 109 OCR languages.

## Installation

```bash
pip install mineru[core]   # or: uv tool install mineru[core]
```

First run downloads model weights from Hugging Face/ModelScope (several GB) — needs network access once, then runs offline, no API key, no per-call cost (unless using the `-http-client` backends against a remote server).

## Hardware requirements (read before adopting)

Per the upstream README:

| | pipeline (CPU-friendly) | vlm-engine / hybrid-engine |
|---|---|---|
| Min VRAM | — (CPU-only OK) | 4–8 GB |
| Min RAM | 16 GB (32 GB recommended) | 16 GB min |
| Disk | ≥20 GB, SSD recommended (model weights) | ≥2 GB |

This is substantially heavier than Docling (pure pip install, no mandatory model download, runs fine on a small CPU box). Budget for this before treating MinerU as a default parser.

## Quickstart

```bash
mineru -p <input_path> -o <output_path>              # GPU-accelerated (vlm-engine/hybrid-engine)
mineru -p <input_path> -o <output_path> -b pipeline   # pure CPU, no GPU required
```

Supports local PDF, image, DOCX, PPTX, XLSX — file or directory input. Also available as: Python API, REST API (`mineru-api`), a router for load-balancing multiple backends (`mineru-router`), a Gradio WebUI (`mineru-gradio`), and an MCP server (usable directly from Claude Code / Cursor / Windsurf as a tool, not just a pip library).

## Reading large PDFs: page-range chunking

For PDFs too large to process (or fit in memory/VRAM) in one shot, `mineru` takes explicit page bounds instead of always processing the whole document:

```bash
mineru -p big-document.pdf -o out/ -s 0 -e 199      # pages 0-199
mineru -p big-document.pdf -o out/ -s 200 -e 399    # pages 200-399, separate process/run
```

`-s/--start` and `-e/--end` are 0-indexed page ids (`mineru/cli/client.py`). This is the mechanism to use for a document with hundreds/thousands of pages: split into page-range batches, run each batch (potentially in parallel across processes if you have the VRAM/CPU budget), then concatenate the per-batch Markdown/JSON output. There is no separate "streaming" mode — chunking by page range via `-s/-e` *is* how MinerU handles arbitrarily large PDFs without loading the whole thing into one pass.

## Backend choice

- `pipeline` — fast, stable, no hallucination risk, CPU or GPU. Best default for batch/production use on large PDFs where you don't want a model inventing text.
- `vlm-engine` — higher accuracy via a vision-language model (vLLM/LMDeploy/mlx), needs a GPU.
- `hybrid-engine` — high accuracy, native text extraction where possible (fewer hallucinations than pure VLM), `effort: medium|high` to trade speed for accuracy.
- `vlm-http-client` / `hybrid-http-client` — talk to a remote `mineru-vllm-server`/`mineru-openai-server`/`mineru-lmdeploy-server` instead of loading models locally; use this to keep the parsing host lightweight and centralize GPU cost on one server for multiple callers.

## MinerU vs. Docling — which one for this codebase

This repo's canonical PDF-parsing skill is `data/docling` (see `KRONIA-Nurse/.claude/skills/docling/SKILL.md` for the adopted decision on `kronia-nurse`'s RAG pipeline). Docling is the lighter-weight default: pip install only, no mandatory model download for the base flow, runs on a small CPU box, and was already benchmarked against `scripts/rag-pipeline.js`'s `pdf-parse` chunker for that project.

MinerU is not a drop-in replacement for that decision — it's a heavier tool for a narrower set of cases Docling doesn't cover as well:

- **Reach for MinerU when:** the PDF is scanned/handwritten with no usable text layer and needs real OCR (109 languages), or accuracy on dense tables/formulas matters more than throughput, or the PDF is large enough (many hundreds of pages) that page-range chunking (`-s/-e`) is needed to keep memory bounded — Docling has no equivalent built-in page-batching primitive, so you'd hand-roll it (split the PDF into page-range chunks yourself, e.g. with `pypdf`, before calling `DocumentConverter`).
- **Keep Docling when:** the PDF has a text layer and the concern is layout/reading-order/table-structure, not OCR — Docling already solves that with a much smaller install and no GPU requirement, which is why it was adopted as the opt-in parser for `kronia-nurse`.
- **Cost either way:** both are per-page-seconds, not instant — Docling was measured at ~1.7–4.9 s/page on CPU; MinerU's `pipeline` backend is comparable, `vlm-engine`/`hybrid-engine` are slower per page but higher accuracy. Neither belongs in a request/response path; both are batch/offline preprocessing steps.

**Recommendation:** don't switch `kronia-nurse`'s existing Docling integration. Add MinerU as a second opt-in tool, selected per-document like `PDF_METADATA`'s `parser: 'docling'` flag already does, for the subset of PDFs that are scanned/handwritten or too large for a single Docling pass — and only if/when such a PDF actually shows up in the corpus. Provisioning MinerU (GPU, disk for weights) is real infra cost; don't pay it speculatively.

## Supported input formats

PDF, images (PNG/JPEG/TIFF/etc.), DOCX, PPTX, XLSX. Output: Markdown, JSON (with per-element layout/bbox info), visualized layout overlays.
