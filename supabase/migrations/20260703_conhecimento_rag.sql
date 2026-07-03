-- ================================================================
-- KRONIA NURSE — Base de conhecimento documental (RAG de PDFs)
-- Migration: 20260703_conhecimento_rag
--
-- Armazena documentos oficiais (ANVISA, COFEN, COREN, MS) importados
-- de PDF pelo script scripts/rag-pipeline.js, fragmentados em chunks
-- com embedding vetorial para busca semântica.
--
-- Complementa (não substitui) a knowledge_base: a knowledge_base guarda
-- conteúdo redigido e aprovado pelo pipeline de auditoria; estas tabelas
-- guardam o texto integral das fontes oficiais para consulta via RAG.
--
-- Seguro para rodar em banco vazio ou já existente (IF NOT EXISTS).
-- ================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ================================================================
-- 1. TABELAS
-- ================================================================

-- conhecimento_documentos: um registro por PDF indexado.
CREATE TABLE IF NOT EXISTS conhecimento_documentos (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação do documento
  nome_arquivo      TEXT        NOT NULL,
  tipo_documento    TEXT        NOT NULL, -- RDC | Portaria | Caderno | Guia | Legislação | ...
  instituicao       TEXT        NOT NULL, -- ANVISA | COFEN | COREN-SP | Ministério da Saúde | ...
  versao            TEXT,
  ano_publicacao    INT,
  descricao         TEXT,

  -- Texto integral extraído do PDF
  conteudo_completo TEXT        NOT NULL,

  -- SHA-256 do texto extraído — evita reindexar o mesmo conteúdo
  hash_conteudo     TEXT        NOT NULL UNIQUE,

  ativo             BOOLEAN     NOT NULL DEFAULT TRUE,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- conhecimento_fragmentos: chunks do documento com embedding.
CREATE TABLE IF NOT EXISTS conhecimento_fragmentos (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id     UUID        NOT NULL REFERENCES conhecimento_documentos(id) ON DELETE CASCADE,

  -- Posição do fragmento dentro do documento (1-based)
  numero_sequencia INT         NOT NULL,
  conteudo         TEXT        NOT NULL,

  -- Cohere embed-multilingual-v3.0 (1024 dims) — MESMO modelo usado nas
  -- consultas (lib/embeddings.ts). Indexação e busca precisam compartilhar
  -- o espaço vetorial.
  embedding        vector(1024),

  -- Estimativa grosseira (chars/4) usada para orçamento de contexto
  tamanho_tokens   INT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (documento_id, numero_sequencia)
);

-- ================================================================
-- 2. ÍNDICES
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_conhecimento_documentos_ativo
  ON conhecimento_documentos(ativo) WHERE ativo;

CREATE INDEX IF NOT EXISTS idx_conhecimento_fragmentos_documento_id
  ON conhecimento_fragmentos(documento_id);

-- Índice vetorial (cosine). lists = 100 segue o padrão da knowledge_base.
CREATE INDEX IF NOT EXISTS idx_conhecimento_fragmentos_embedding
  ON conhecimento_fragmentos USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ================================================================
-- 3. FUNÇÃO RPC — busca semântica nos fragmentos
-- ================================================================

-- buscar_fragmentos_conhecimento: chamada por /api/conhecimento/buscar-rag.
-- Retorna fragmentos de documentos ativos, com metadados do documento de
-- origem para citação da fonte.
CREATE OR REPLACE FUNCTION buscar_fragmentos_conhecimento(
  query_embedding      vector(1024),
  similarity_threshold float DEFAULT 0.5,
  match_count          int   DEFAULT 5
)
RETURNS TABLE (
  fragmento_id     UUID,
  documento_id     UUID,
  nome_arquivo     TEXT,
  tipo_documento   TEXT,
  instituicao      TEXT,
  versao           TEXT,
  ano_publicacao   INT,
  descricao        TEXT,
  numero_sequencia INT,
  conteudo         TEXT,
  similarity       FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cf.id,
    cd.id,
    cd.nome_arquivo,
    cd.tipo_documento,
    cd.instituicao,
    cd.versao,
    cd.ano_publicacao,
    cd.descricao,
    cf.numero_sequencia,
    cf.conteudo,
    (1 - (cf.embedding <=> query_embedding))::FLOAT AS similarity
  FROM conhecimento_fragmentos cf
  JOIN conhecimento_documentos cd ON cd.id = cf.documento_id
  WHERE
    cd.ativo
    AND cf.embedding IS NOT NULL
    AND (1 - (cf.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY cf.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

-- ================================================================
-- 4. TRIGGER — updated_at (reaproveita _update_updated_at do schema base)
-- ================================================================

DROP TRIGGER IF EXISTS trg_conhecimento_documentos_updated_at ON conhecimento_documentos;
CREATE TRIGGER trg_conhecimento_documentos_updated_at
  BEFORE UPDATE ON conhecimento_documentos
  FOR EACH ROW EXECUTE FUNCTION _update_updated_at();
