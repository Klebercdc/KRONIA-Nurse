-- ================================================================
-- KRONIA NURSE — Rastreabilidade por página nos fragmentos de RAG
-- Migration: 20260706_fragmentos_pagina
--
-- Adiciona página de origem (início/fim) por fragmento, exigida pelo
-- Validation Engine ("Existe página?" — ver context/kits/
-- kronos-arquitetura-cognitiva.md, Domínio 1).
--
-- Nullable: fragmentos já indexados antes desta migration ficam sem
-- página até serem reindexados (CHUNKING_VERSION sobe em
-- scripts/rag-pipeline.js, o que já força reindexação automática na
-- próxima execução — nenhuma ação manual extra necessária).
--
-- Seguro para rodar em banco vazio ou já existente (IF NOT EXISTS /
-- CREATE OR REPLACE).
-- ================================================================

-- ================================================================
-- 1. COLUNAS NOVAS
-- ================================================================

ALTER TABLE conhecimento_fragmentos
  ADD COLUMN IF NOT EXISTS pagina_inicio INT,
  ADD COLUMN IF NOT EXISTS pagina_fim    INT;

-- ================================================================
-- 2. FUNÇÃO RPC — inclui página de origem no retorno
-- ================================================================

-- Postgres não permite CREATE OR REPLACE mudar o tipo de retorno (novas
-- colunas pagina_inicio/pagina_fim) — precisa dropar a assinatura antiga.
DROP FUNCTION IF EXISTS buscar_fragmentos_conhecimento(vector, float, int);

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
  pagina_inicio    INT,
  pagina_fim       INT,
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
    cf.pagina_inicio,
    cf.pagina_fim,
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

-- search_path fixo — linter de segurança do Supabase acusa search_path
-- mutável em funções PL/pgSQL (0011_function_search_path_mutable).
ALTER FUNCTION buscar_fragmentos_conhecimento(vector, float, int) SET search_path = public;
