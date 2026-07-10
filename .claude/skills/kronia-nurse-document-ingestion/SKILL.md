---
name: kronia-nurse-document-ingestion
description: How to triage and ingest reference PDFs (COFEN/COREN/ANVISA guidelines, textbooks, guidelines) into KRONIA Nurse's conhecimento_documentos/conhecimento_fragmentos RAG tables. Use before adding a new PDF to scripts/rag-pipeline.js's PDF_METADATA, or whenever a document's extracted text looks garbled/empty and you need to decide text-extraction vs. OCR. Covers known-quality notes per institution and the sandbox fallback when poppler-utils isn't installable.
allowed-tools:
  - read
  - bash
effort: medium
---

# KRONIA Nurse — Document Ingestion (OCR triage)

## Why this exists

Several source PDFs (Google Drive folder "Referências") were downloaded/scanned
repeatedly and lost structure before ever reaching the RAG pipeline. A
document with garbled or empty extracted text poisons everything downstream:
`conhecimento_fragmentos` gets noise chunks, the Pesquisador (Etapa 1,
`lib/knowledge-pipeline.ts`) cites that noise as a "fonte oficial", and the
ABNT formatter (`lib/abnt.ts`) can't fix a citation whose underlying text was
never real to begin with. Triage BEFORE indexing, not after.

## Step 1 — Diagnose every PDF before extracting anything

Preferred path: use the `pdf-reading` skill's diagnostic sequence
(`pdfinfo` + `pdffonts` + a `pdftotext` sample). Read that skill first if
available — it covers font-embedding checks, garbled-text diagnosis, and
rasterization.

**Sandbox fallback (no poppler-utils, apt blocked):** this environment does
not have `pdfinfo`/`pdffonts`/`pdftotext` installed and `apt-get install
poppler-utils` fails (network-restricted). `pip install pypdf` also breaks at
import time here (system `cryptography` package conflict via `pyo3`). The
workaround that actually works:

```bash
python3 -m venv /tmp/pdfenv
/tmp/pdfenv/bin/pip install --quiet pdfminer.six pypdf
```

Then, per file:

```python
import pypdf
from pdfminer.high_level import extract_text

path = "document.pdf"
r = pypdf.PdfReader(path)
n = len(r.pages)

# Sample first/middle/last page instead of the whole doc — cheap and
# representative; a 300-page textbook doesn't need full extraction just to
# classify it.
sample_pages = sorted(set([0, n // 2, max(0, n - 1)]))
text = ""
for p in sample_pages:
    text += extract_text(path, page_numbers=[p]) or ""

print(n, len(text), repr(text[:200]))
```

- `len(text)` near-zero across 3 sampled pages (roughly under ~150 chars
  total) → **scanned/raster**, no usable text layer. Do not feed this to the
  chunker (`scripts/rag-pipeline.js`) — it will silently produce empty or
  near-empty fragments.
- `len(text)` substantial but the sample looks like mojibake/wrong characters
  → **garbled OCR/encoding**, not a clean scan. Also don't index yet.
- `len(text)` substantial and readable → text-extractable, proceed to
  ingestion via the existing pipeline (`npm run rag:pipeline`, i.e.
  `scripts/rag-pipeline.js`).

## Step 1b — MinerU: better structure recovery than pdfminer/pypdf

Tested this session on `Manual-de-Cuidados-de-Enfermagem-em-Procedimentos-de-Intensivismo.pdf`
(151 pages, text-native). MinerU (`pip install "mineru[core]"`, PyPI package
`mineru`, opendatalab/MinerU on GitHub) produces genuinely better output than
the pdfminer/pypdf fallback in Step 1: proper Markdown with heading levels
(`#`/`##` recovers chapter/section titles like "Material" and "Cuidados de
enfermagem" as real headings, not just lines of body text), clean paragraphs
(no mid-sentence line breaks from column-width wrapping), and preserved
bullet lists — closer to what Docling gives you (see the `docling` skill),
but via a different toolchain.

```bash
python3 -m venv /tmp/mineru-venv
/tmp/mineru-venv/bin/pip install "mineru[core]"
/tmp/mineru-venv/bin/mineru -p document.pdf -o /tmp/mineru-out -b pipeline
# -b pipeline = pure CPU backend (no GPU requirement). Output:
#   /tmp/mineru-out/<name>/auto/<name>.md          — structured Markdown
#   /tmp/mineru-out/<name>/auto/<name>_content_list.json — per-block JSON (bbox, type, page)
```

**Honest cost**: first run downloads ~1.1GB of layout/OCR/formula models
(cached after that in `~/.cache/huggingface`). On CPU, a 151-page text-native
PDF took roughly 6-7 minutes end-to-end (layout detection + OCR detection
pass even on pages that already have a text layer — MinerU's pipeline mode
runs OCR unconditionally as part of its layout-aware reading order, it
doesn't skip it just because `pdffonts` would say the page has embedded
fonts). Run it in the background (`nohup ... &`) for anything more than a
handful of pages; don't block on it synchronously.

**When to reach for this over plain pdfminer/pypdf**: multi-column layouts,
documents where you need to reliably tell "Material" apart from a numbered
list, or when you're about to hand the output to something that benefits
from real Markdown structure (chunking by heading, RAG fragment boundaries).
For a quick one-off text sample just to classify text-vs-scanned (Step 1
above), pdfminer is faster and sufficient — don't reach for MinerU just to
answer "does this PDF have a text layer".

## Step 2 — Handle scanned/garbled documents

1. Rasterize the page and read it visually to confirm what's actually on the
   page (150 DPI is the default that works for standard COFEN/COREN/ANVISA
   institutional PDFs — see `pdf-reading` skill for the `pdftoppm` command,
   or use `pdf2image`/`pypdfium2` if poppler CLI tools aren't available).
2. For bulk re-extraction of a scanned document, OCR it for real
   (`pytesseract` over rasterized pages) — never trust text that already went
   through a bad OCR pass once (re-extracting the same garbled layer just
   reproduces the same garbage).
3. `scripts/docling-bridge.js` + `scripts/docling_parser.py` already exist in
   this repo as the dedicated parser path for PDFs whose layout `pdf-parse`
   scrambles (multi-column, tables) — see `caderno-4-medidas-de-prevencao...`
   in `PDF_METADATA` (`rag-pipeline.js`) for the working example of flagging
   a file with `parser: 'docling'`. Prefer extending that path over inventing
   a new one.

## Step 3 — Known institution/document quality (update this list as you learn more)

| Institution / source | Known quality | Notes |
|---|---|---|
| COFEN, COREN-SP | Generally well-formatted, embedded fonts, clean text layer | Already ingested (13 docs in `PDF_METADATA`) |
| ANVISA (cadernos, RDCs) | Well-formatted; `caderno-4-medidas-de-prevencao...` needed Docling for its multi-column/table layout | Use `parser: 'docling'` flag for ANVISA cadernos with tables |
| Textbooks bought as "ebooks" (z-library-sourced files, `Manual de Diálise`, `Guyton`, `Potter`, `Brunner & Suddarth`, etc.) | Varies — large scanned/retail ebooks are the highest OCR-risk category | Triage individually before trusting; watermark/DRM boilerplate pages (store name, "adquirido em...") should be excluded from chunking if present |
| KDIGO / AHA (international guidelines) | Typically clean text-layer PDFs (official digital-native publication) | Low OCR risk, but still run Step 1 — don't assume |

## Step 4 — Quality gate before writing to conhecimento_fragmentos

Never insert fragments from a document that failed Step 1 without a
successful re-extraction. If in doubt, spot-check: pick 2-3 chunks the
chunker would produce and read them — if a human can't tell what document
they came from, the Duplicate Resolver and ABNT formatter downstream
(`lib/abnt.ts`) have nothing solid to work with, and you reproduce the exact
contamination pattern documented in the "13 Certos" incident (a spec that
cited 4 irrelevant biography/bibliography fragments from a different
chapter of the same PDF — see `knowledge_spec_audit` history for spec id
`c167cb42-775f-45db-8fc3-90dcf0f69734`).

## Step 5 — Downloading from the "Referências" Google Drive folder in a sandboxed Claude Code session

If you're triaging via the `Google_Drive` MCP tools instead of a synced
local folder, two failure modes showed up triaging all 46 files in this
folder and are worth avoiding:

- `download_file_content` (binary) has a hard **~10MB size limit** and can
  also fail intermittently with "session expired" on files well under that
  limit (seen on 6 files between ~7-9.8MB, needing 5+ retries). When it
  fails, fall back to `read_file_content` (Drive's native text conversion)
  to at least get a text sample for triage — it worked in 11 of 12 oversized
  cases in practice. It doesn't give you a page count, so page counts stay
  "not determined" for those until someone re-opens the file with a proper
  download.
- **Never call `read_file_content` in parallel across multiple files in one
  batch** — a batch of 10 parallel calls once returned content **swapped
  between 4 different files** (each file's title didn't match its returned
  content). This is only detectable by cross-checking returned content
  against the expected filename/title before trusting it. Call it
  sequentially, or verify every result against its title.
- **Don't trust the Drive filename as the document title.** One file named
  `Manual para hemodiálise .pdf` turned out to actually contain "Resumos do
  XXXI Congresso Brasileiro de Nefrologia" — a completely different
  document. Always sample the actual extracted text before writing a
  `descricao` into `PDF_METADATA`.

See `docs/pdf-triage-referencias-pendentes.md` for the full triage table of
this folder's 33 not-yet-ingested files (31 text-extractable, 1 failed to
download at all, metadata confidence marked per row) — don't re-triage from
scratch, review and confirm the low-confidence rows instead.

## Where this plugs into the real pipeline

- `scripts/rag-pipeline.js` — chunking + embeddings + Supabase insert. Add a
  `PDF_METADATA` entry (`instituicao`, `tipo`, `versao`, `ano`, `descricao`)
  before a new file is picked up.
- `lib/knowledge-pipeline.ts` — `pesquisarFontes` turns indexed fragments
  into `ReferenciaOficial[]`. It now requires similarity ≥ 0.65
  (`SIMILARITY_THRESHOLD_REFERENCIA`) for a fragment to become a persisted
  reference (stricter than the 0.5 used for live KRONOS answers) — a direct
  response to fragments from unrelated document sections passing a looser
  bar.
- `lib/abnt.ts` — deterministic ABNT citation formatter, never an LLM. Takes
  clean `conhecimento_documentos` metadata, not raw fragment text.
