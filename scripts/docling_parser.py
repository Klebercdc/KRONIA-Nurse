#!/usr/bin/env python3
"""
Converte um ou mais PDFs com Docling e imprime em stdout um único JSON:
{ "documentos": { "<nome-arquivo.pdf>": { "paginas_total": N, "paginas": ["texto pág 1", ...] }, ... } }

Cada entrada em "paginas" é o texto/estrutura (Markdown — preserva tabelas e
cabeçalhos de seção) daquela página, na ordem de leitura recuperada pelo
Docling. Isso alimenta o mesmo `chunkTextComPaginas`/`limparPaginas` de
scripts/rag-pipeline.js — o Docling entra só como parser (reading order +
estrutura de tabela); o chunking continua sendo o do pipeline Node (análise
em .claude/skills/docling/SKILL.md: o HybridChunker não foi adotado porque o
alvo de tokens dele não bate com o teto de 512 da Cohere e ele não resolve
sozinho o ruído de capa/ficha catalográfica que o pipeline atual já filtra).

Aceita múltiplos PDFs numa única chamada de propósito: os modelos de
layout/tabela/OCR são carregados uma vez (~14s) e reaproveitados entre
arquivos, em vez de pagar esse custo a cada spawn (ver docling-bridge.js).

Uso: python docling_parser.py <caminho1.pdf> [<caminho2.pdf> ...] [--ocr]
"""
import json
import os
import sys

from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.document_converter import DocumentConverter, PdfFormatOption


def construir_converter(usar_ocr: bool) -> DocumentConverter:
    # Os PDFs deste projeto são todos nascidos digitais (têm camada de texto
    # real) — rodar OCR neles é custo praticamente puro sem ganho (confirmado
    # empiricamente: toda página retornou "empty result" no teste com
    # anotacao-de-enfermagem.pdf). OCR só se justifica pra documento
    # comprovadamente escaneado — daí o default False e a flag --ocr manual.
    opcoes = PdfPipelineOptions(do_ocr=usar_ocr)
    return DocumentConverter(format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=opcoes)})


def extrair_paginas(converter: DocumentConverter, caminho_pdf: str) -> dict:
    resultado = converter.convert(caminho_pdf)
    doc = resultado.document
    total = doc.num_pages()
    paginas = [doc.export_to_markdown(page_no=pagina) for pagina in range(1, total + 1)]
    return {"paginas_total": total, "paginas": paginas}


def main() -> None:
    argv = sys.argv[1:]
    usar_ocr = "--ocr" in argv
    caminhos = [a for a in argv if a != "--ocr"]

    if not caminhos:
        print(json.dumps({"erro": "uso: docling_parser.py <caminho.pdf> [<caminho2.pdf> ...] [--ocr]"}), file=sys.stderr)
        sys.exit(1)

    converter = construir_converter(usar_ocr)

    documentos = {}
    for caminho in caminhos:
        nome = os.path.basename(caminho)
        try:
            documentos[nome] = extrair_paginas(converter, caminho)
        except Exception as err:  # um PDF ruim não deve derrubar o lote inteiro
            documentos[nome] = {"erro": str(err)}

    print(json.dumps({"documentos": documentos}, ensure_ascii=False))


if __name__ == "__main__":
    main()
