#!/usr/bin/env python3
"""
Converte um PDF com Docling e imprime em stdout um único JSON:
{ "paginas_total": N, "chunks": [{ "texto": "...", "pagina_inicio": N, "pagina_fim": N }, ...] }

Usa HybridChunker (ciente de seção/tabela, não corta linha ao meio) em vez do
chunker manual de scripts/rag-pipeline.js — cada chunk já sai com a página de
origem via metadata de proveniência do Docling.

Uso: python docling_parser.py <caminho.pdf>
"""
import json
import sys

from docling.document_converter import DocumentConverter
from docling.chunking import HybridChunker


def main() -> None:
    if len(sys.argv) != 2:
        print(json.dumps({"erro": "uso: docling_parser.py <caminho.pdf>"}), file=sys.stderr)
        sys.exit(1)

    caminho_pdf = sys.argv[1]

    converter = DocumentConverter()
    resultado = converter.convert(caminho_pdf)
    doc = resultado.document

    chunker = HybridChunker()
    chunks_saida = []

    for chunk in chunker.chunk(doc):
        paginas = sorted({
            prov.page_no
            for item in chunk.meta.doc_items
            for prov in item.prov
        })
        if not paginas:
            continue
        chunks_saida.append({
            "texto": chunker.contextualize(chunk),
            "pagina_inicio": paginas[0],
            "pagina_fim": paginas[-1],
        })

    saida = {
        "paginas_total": doc.num_pages(),
        "chunks": chunks_saida,
    }
    print(json.dumps(saida, ensure_ascii=False))


if __name__ == "__main__":
    main()
