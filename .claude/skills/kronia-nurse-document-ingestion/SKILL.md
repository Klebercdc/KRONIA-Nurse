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

Preferred path (non-sandboxed environments): use the `pdf-reading` skill's
diagnostic sequence (`pdfinfo` + `pdffonts` + a `pdftotext` sample). Read
that skill first if available — it covers font-embedding checks,
garbled-text diagnosis, and rasterization.

**Sandbox fallback (no poppler-utils, apt blocked) — use PyMuPDF, not
pdfminer/pypdf.** This environment doesn't have `pdfinfo`/`pdffonts`/
`pdftotext`/`pdftoppm` installed and `apt-get install poppler-utils` fails
(network-restricted). Plain `pip install pypdf` also breaks at import time
here (system `cryptography` package conflict via `pyo3`). `pymupdf` (PyPI
package `pymupdf`, import name `pymupdf` — the library historically called
`fitz`) sidesteps both problems and is a **single package that replaces the
entire poppler-utils toolchain**, confirmed working this session:

```bash
python3 -m venv /tmp/pdfenv
/tmp/pdfenv/bin/pip install --quiet pymupdf
```

```python
import pymupdf

path = "document.pdf"
doc = pymupdf.open(path)
n = len(doc)                              # = pdfinfo page count
mid = doc[n // 2]
fonts = mid.get_fonts()                   # = pdffonts (embedded font check)
text = mid.get_text()                     # = pdftotext, per page
# text-vs-scanned: near-empty get_text() + empty get_fonts() on a sampled
# page (first/middle/last) = scanned/raster, same signal pdffonts gives you.

pix = mid.get_pixmap(dpi=150)             # = pdftoppm, for visual inspection
pix.save("/tmp/page_mid.png")             # then Read the PNG if garbled/scanned
```

Benchmarked on `Manual-de-Cuidados-de-Enfermagem-em-Procedimentos-de-
Intensivismo.pdf` (151 pages, text-native): full-document `get_text()` over
all 151 pages took **0.23 seconds**. No model download, no C-extension build
step, no `cryptography` conflict. This is now the default choice for both
triage (Step 1) and full extraction in this sandbox — pdfminer.six is no
longer needed for either.

For Markdown-structured extraction (real headings, not just paragraph text —
useful when you're about to hand output to a chunker or read it yourself to
enrich a spec), use `pymupdf4llm` on top of the same install:

```bash
/tmp/pdfenv/bin/pip install --quiet pymupdf4llm
```
```python
import pymupdf4llm
md = pymupdf4llm.to_markdown("document.pdf")   # whole doc, or pages=[...] for a subset
```

Same 151-page benchmark: **18.6 seconds**, output recovers `#`/`##`/`###`
headings (font-size/bold heuristics, no ML model) and clean bullet lists —
qualitatively comparable to MinerU's Markdown (Step 1b below) at roughly
1/20th the wall-clock time and no model download.

- `get_text()`/`to_markdown()` near-zero across sampled pages (first/middle/
  last — roughly under ~150 chars total) → **scanned/raster**, no usable text
  layer. Do not feed this to the chunker (`scripts/rag-pipeline.js`) — it
  will silently produce empty or near-empty fragments. Confirm visually with
  `get_pixmap()` before concluding a document is unusable.
- Substantial text but mojibake/wrong characters → **garbled OCR/encoding**,
  not a clean scan. Also don't index yet.
- Substantial and readable → text-extractable, proceed to ingestion via the
  existing pipeline (`npm run rag:pipeline`, i.e. `scripts/rag-pipeline.js`).

## Step 1b — MinerU / Docling: when PyMuPDF's heuristics aren't enough

PyMuPDF's Markdown mode (`pymupdf4llm`) uses font-size/position heuristics —
no layout model, no OCR. That's enough for most single/double-column
academic PDFs with a real text layer (confirmed above), but it can still
misjudge complex multi-column layouts, tables, or genuinely scanned pages
that need real OCR. For those, reach for a model-backed parser:

**MinerU** (`pip install "mineru[core]"`, PyPI package `mineru`,
opendatalab/MinerU on GitHub) — tested this session on the same 151-page
PDF: `mineru -p document.pdf -o /tmp/mineru-out -b pipeline` (`-b pipeline` =
CPU backend, no GPU needed). Output:
`/tmp/mineru-out/<name>/auto/<name>.md` (structured Markdown) and
`<name>_content_list.json` (per-block JSON with bbox/type/page). **Honest
cost**: downloads ~1.1GB of layout/OCR/formula models on first run (cached
after in `~/.cache/huggingface`), and took ~6-7 minutes end-to-end on CPU for
151 pages — it runs OCR detection unconditionally as part of its
layout-aware reading order, even on pages that already have embedded fonts.
Run it in the background (`nohup ... &`); don't block on it synchronously.

**Docling** — already integrated into this repo's real pipeline
(`scripts/docling-bridge.js` / `docling_parser.py`), used for ANVISA's
`caderno-4-medidas-de-prevencao...` (multi-column + tables that `pdf-parse`
scrambled). Prefer extending that existing path for anything headed toward
production ingestion; MinerU is a good ad hoc/exploratory option when you're
manually reading a PDF to enrich a spec (as in this session) rather than
building the permanent ingestion path.

**Decision rule**: start with PyMuPDF/pymupdf4llm always (cheap, instant,
covers the large majority of this corpus per the triage in
`docs/pdf-triage-referencias-pendentes.md` — 31/32 pending files are
text-extractable, 0 scanned). Only reach for MinerU or Docling when
PyMuPDF's output is visibly wrong (columns interleaved, tables flattened
into garbage, or genuinely no text layer at all).

**Do NOT use `marker` (PyPI `marker-pdf`, VikParuchuri/marker on GitHub) in
this sandbox — tested and it doesn't finish.** Same category as MinerU
(layout model + `surya-ocr` + `torch`/`transformers`), but on the same
151-page benchmark PDF it was still only 64% through layout recognition
after 6+ minutes (~3-4s/page, no GPU) and the process died silently — no
error, no traceback, just vanished from `ps` — while holding ~10GB RSS in a
~15GB-memory sandbox (almost certainly an OOM kill the container doesn't
surface to `dmesg`). Zero output produced. If a future session is tempted to
try it again: don't, unless the sandbox's memory ceiling has genuinely
changed — MinerU already covers the same "need a real layout model" case
and actually completes here.

## Step 1c — pdfplumber: when you specifically need table cells, not just text

PyMuPDF's `get_text()`/`pymupdf4llm` handle body text well but **flatten
real tables into a linear stream of cell values with no row/column
structure** — confirmed this session on `KDIGO-2026-AKI-AKD-Guideline...pdf`
(page 17, a 3-column staging table): PyMuPDF's plain text output interleaves
`C1`/`U1`/`B1` values in a way that's borderline unreadable without the grid,
while `pdfplumber` (`pip install pdfplumber`, jsvine/pdfplumber on GitHub —
built on pdfminer.six, no crypto-conflict issue) reconstructs it as an actual
2D array:

```python
import pdfplumber

with pdfplumber.open("document.pdf") as pdf:
    for page in pdf.pages:
        for table in page.extract_tables():
            for row in table:
                print(row)   # list of cell strings, correctly aligned by column
```

Scanning all 499 pages of the KDIGO PDF for `extract_tables()` took under 5
seconds; it found 20 tables in the first 60 pages alone. Clinical guideline
PDFs are dense with exactly this kind of table (staging/classification
grids, dosing charts, diagnostic criteria) — anywhere you're about to
paraphrase a table into prose for `indicacoes`/`materiais`/`execucao_passos`,
extract it with `pdfplumber` first so you're reading real rows instead of
reconstructing them by eye from flattened text.

**Decision rule, updated**: PyMuPDF for body text and Markdown structure
(Step 1), `pdfplumber` specifically when a page has a real table you need
cell-accurate (Step 1c), MinerU/Docling only when both of those still
produce garbage (Step 1b). All three coexist in the same venv without
conflict — installing one doesn't require dropping another.

## Step 2 — Handle scanned/garbled documents

1. Rasterize the page and read it visually to confirm what's actually on the
   page (150 DPI is the default that works for standard COFEN/COREN/ANVISA
   institutional PDFs — see `pdf-reading` skill for the `pdftoppm` command;
   in this sandbox use `page.get_pixmap(dpi=150).save(...)` from PyMuPDF,
   confirmed working in Step 1 above — no need for `pdf2image`/`pypdfium2`
   as a separate dependency).
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

## Step 2b — OpenRN (NCBI Bookshelf mirror): Tipo A checklists, no download needed

`wtcs.pressbooks.pub` (Open RN's own Pressbooks host) returns **403 to
WebFetch** in this sandbox — don't waste a call there. The same content is
mirrored at **NCBI Bookshelf** (`ncbi.nlm.nih.gov/books/NBK596735/` for
*Nursing Skills, 2nd Edition*, Ernstmeyer & Christman, Chippewa Valley
Technical College, 2023, CC-BY 4.0), which fetches cleanly and is already
split one URL per chapter:
`https://www.ncbi.nlm.nih.gov/books/n/openrnns2e/ch##<topicname>/` (23
chapters — General Survey, Health History, Blood Pressure, Aseptic
Technique, Math Calculations, Neurological/Head-Neck/Eye-Ear/
Cardiovascular/Respiratory/Abdominal/Musculoskeletal/Integumentary
Assessment, Administration of Enteral/Parenteral/Other-Route Medications,
Enteral Tube Management, Specimen Collection, Wound Care, Facilitation of
Elimination, Tracheostomy Care & Suctioning, IV Therapy Management).

This is genuinely **Tipo A** (Procedimento Operacional — see
`docs/constituicao-extracao-conhecimento.md`): each chapter is a real
checklist with indications, equipment list, numbered steps, safety
parameters (e.g., suction pressure by age group, max suction duration) and
complications — the kind of `execucao_passos`/`materiais`/`preparacao`
content the Brunner & Suddarth extraction (Tipo C, disease-organized) could
never provide, since Brunner rarely spells out a numbered procedure.
Confirmed working on Chapter 22 (Tracheostomy Care & Suctioning) this
session — used to add `execucao_passos`/`indicacoes` to **Aspiração
Traqueal** (`92996bec-...`) alongside the existing Brunner-sourced
`cuidados`/`complicacoes`. Foreign-language source (English) — content is
translated/adapted into Portuguese when writing into a Spec, not copied
verbatim; cite with `instituicao: 'CHIPPEWA VALLEY TECHNICAL COLLEGE (OPEN
RN)'` and keep the original chapter URL in the reference's `url` field for
traceability (REGRA 12 da Constituição).

## Step 2c — OpenRN "Nursing Fundamentals" (sister book to Nursing Skills)

Same authors/publisher/license as Step 2b (Ernstmeyer & Christman,
Chippewa Valley Technical College, CC BY 4.0), but a **different book**
covering ADL/comfort/safety/mobility concepts rather than procedural
checklists — useful for `Fundamentos de Enfermagem` category Specs that
`Nursing Skills` doesn't reach (positioning, ambulation, pain scales,
restraints, fall prevention). NCBI Bookshelf ID `NBK591823`
(2021 edition), chapter URL pattern
`https://www.ncbi.nlm.nih.gov/books/n/openrnnf/<chapterslug>/`
(different book-id segment than `openrnns2e` — don't reuse the Nursing
Skills slug prefix). 19 chapters: Scope of Practice, Communication,
Diverse Patients, Nursing Process, Safety Introduction, Cognitive
Impairments, Sensory Impairments, Oxygenation, Infection, Integumentary,
Comfort, Sleep and Rest, Mobility, Nutrition, Fluids and Electrolytes,
Elimination, Grief and Loss, Spirituality, Care of the Older Adult.

Confirmed this session: Chapter 13 (Mobility) → repositioning frequency
(2h), ambulation/gait-belt technique, immobility complications (DVT,
pneumonia, 20%/week muscle loss) — used for Mudança de Decúbito and
Estímulo à Deambulação. Chapter 11 (Comfort) → pain scales (numeric,
FLACC, PAINAD) and PQRSTU — used for Controle da Dor and Massagem de
Conforto. Chapter 5 (Safety Introduction) → restraint indications/
monitoring/documentation and fall-prevention basics — used for
Contenção no Leito and Condutas de Segurança ao Paciente. Chapter 16
(Elimination) tested but too thin (one sentence each on enema/oral
rehydration, no real procedure) — not used, per REGRA 11 don't force
weak fragments into a Spec.

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
