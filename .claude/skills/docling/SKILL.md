---
name: docling
description: Advanced document parsing and conversion using Docling (IBM Research, PyPI package `docling`) — converts PDF/DOCX/PPTX/XLSX/images/HTML into a structured document model with layout-aware reading order, table structure recognition, and OCR for scanned pages, then exports to Markdown/JSON/HTML or RAG-ready chunks. Use when a task needs to extract text/tables/structure from real-world documents (especially PDFs with multi-column layout, tables, or scanned pages) more reliably than a plain text-extraction library, or needs document chunks pre-shaped for embedding/RAG instead of a hand-rolled chunker. Not needed for plain-text or already-structured input (Markdown, JSON, CSV).
allowed-tools:
  - read
  - bash
effort: medium
---

# Docling — Document Parsing for RAG and Structured Extraction

## Core Principle: Understand document structure, don't just extract characters

Plain PDF text extractors (e.g. `pdf-parse`, `pdfminer`) give you the raw characters in roughly reading order — they don't reliably know what's a table vs. a caption vs. a running header/footer, and multi-column layouts often come out interleaved/garbled. Docling runs a layout model over the page image to recover the actual reading order and structure, then represents the document as a `DoclingDocument` (sections, paragraphs, tables-with-cells, lists, captions, page/bbox provenance per element) before exporting anything.

## Installation

```bash
pip install docling
```

First run downloads the layout/table/OCR models from Hugging Face (a few hundred MB) — needs network access once; after that it runs fully offline/locally, no API key, no per-call cost.

## Quickstart

```python
from docling.document_converter import DocumentConverter

converter = DocumentConverter()
result = converter.convert("caderno-4-medidas-de-prevencao.pdf")
doc = result.document

print(doc.export_to_markdown())   # or .export_to_text(), .export_to_html(), .export_to_dict()
```

CLI equivalent: `docling caderno-4-medidas-de-prevencao.pdf --to md`

## What it recovers that a plain extractor doesn't

- **Reading order** across multi-column layouts and mixed text/figure pages.
- **Table structure** (TableFormer model) — rows/columns/cell spans, not just the flattened cell text run together.
- **OCR fallback** (EasyOCR / Tesseract / RapidOCR backends) for scanned pages with no text layer.
- **Per-element page/bbox provenance** — every paragraph/table/heading in the `DoclingDocument` knows which page and bounding box it came from, which is exactly the kind of citation-grade traceability this project's RAG pipeline needs (see `context/kits/kronos-arquitetura-cognitiva.md`, Domínio 1 — "Existe página?").
- **Picture classification/description and formula/code recognition**, when enabled.

## RAG-ready chunking

Docling ships chunkers built for embedding pipelines, not just document conversion:

```python
from docling.document_converter import DocumentConverter
from docling.chunking import HybridChunker

converter = DocumentConverter()
doc = converter.convert("source.pdf").document

chunker = HybridChunker()  # respects headings/sections/tables, not naive char-splitting
for chunk in chunker.chunk(doc):
    print(chunker.contextualize(chunk))  # chunk text with its section heading context prepended
```

`HybridChunker` merges small structural units and splits oversized ones to a target token budget (tokenizer-aware), while never splitting a table mid-row and always keeping a chunk's section heading as context — a more principled version of the sentence-accumulation chunker hand-built in this repo's `scripts/rag-pipeline.js` (`chunkTextComPaginas`).

## Relevant to this project — decisão adotada

`scripts/rag-pipeline.js` faz PDF → texto via `pdf-parse` (JS) → `chunkTextComPaginas` (chunker de sentenças com filtro de ruído `pareceRuidoDeSumario`). Depois de um benchmark real (OCR desligado, 2 PDFs de produção) comparando o Docling com esse pipeline, a decisão foi: **usar o Docling só como parser opcional, não trocar o chunker.**

Motivo: o `HybridChunker` gera chunks bem menores que o alvo atual (~470-540 chars vs. ~1300) e não bate com o teto de 512 tokens da Cohere sem reconfiguração; além disso ele **não elimina** o ruído de capa/ficha catalográfica/diretoria — só muda a forma (vira item de lista curto em vez de linha de sumário com pontilhado), então o `pareceRuidoDeSumario` ainda seria necessário, só que reescrito pra outro formato.

O que o Docling entrega que realmente vale a pena: reading order correto e tabelas como Markdown de verdade, coisa que o `pdf-parse` embaralha em PDFs como `caderno-4-medidas-de-prevencao-de-infeccao...pdf`. Por isso a integração implementada é:

- `scripts/docling_parser.py` — recebe uma lista de PDFs (não um só), carrega os modelos **uma vez** pro lote inteiro, e devolve por PDF um array de texto por página (`doc.export_to_markdown(page_no=N)` — preserva tabela e cabeçalho de seção), não os chunks do `HybridChunker`.
- `scripts/docling-bridge.js` — `parsearPdfsComDocling(caminhosPdfs)`, spawn único pro lote via `child_process`.
- `scripts/rag-pipeline.js` — PDFs com layout complexo são marcados com `parser: 'docling'` no `PDF_METADATA` (hoje: `caderno-4-medidas-de-prevencao-de-infeccao-relacionada-a-assistencia-a-saude.pdf`). Esses PDFs são extraídos em lote pelo Docling antes do loop principal; o texto por página entra no mesmo `limparPaginas`/`chunkTextComPaginas` que todo PDF já passa. Todo o resto do pipeline (chunking, embeddings, Supabase) não muda.

**Custo aceito:** processar um PDF grande com Docling leva dezenas de minutos, não segundos (medido: ~1,7-4,9 s/página em CPU, dependendo da densidade de tabela/layout da página) — inviável pra todo PDF, por isso é opt-in por arquivo, não o parser padrão.

## Supported input formats

PDF, DOCX, PPTX, XLSX, images (PNG/JPEG/TIFF), HTML, Markdown, AsciiDoc, CSV, and (via ASR models) audio.

## Reference

Full docs: docs.docling-project.github.io. Source: github.com/docling-project/docling (formerly DS4SD/docling). Not vendored here — install via pip, same reasoning as the `curator` skill in this repo.
