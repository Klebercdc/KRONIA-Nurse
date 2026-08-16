-- ================================================================
-- KRONIA NURSE — Schema Completo do Banco de Dados
-- Migration: 20260630_schema_completo
-- Supabase / PostgreSQL
--
-- ORDEM DE EXECUÇÃO OBRIGATÓRIA:
--   1. Extensões
--   2. Tabelas base (knowledge_base, knowledge_versions, knowledge_audit)
--   3. Tabelas do pipeline (knowledge_specs, knowledge_spec_audit)
--   4. Índices
--   5. Funções RPC
--   6. Triggers
--
-- Seguro para rodar em banco vazio ou já existente (IF NOT EXISTS em tudo).
-- ================================================================


-- ================================================================
-- 1. EXTENSÕES
-- ================================================================

-- pgvector: necessário para embeddings e busca semântica do KRONOS
CREATE EXTENSION IF NOT EXISTS vector;

-- uuid-ossp: geração de UUIDs (gen_random_uuid já disponível no Postgres 13+)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ================================================================
-- 2. TABELAS BASE — Knowledge Base (fonte canônica do KRONOS)
-- ================================================================

-- knowledge_base: todo conteúdo aqui foi aprovado por humano e tem embedding.
-- O KRONOS SOMENTE consulta esta tabela. Nenhum conteúdo entra aqui
-- sem passar pelo pipeline de auditoria e pelo clique de aprovação.
CREATE TABLE IF NOT EXISTS knowledge_base (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  titulo        TEXT        NOT NULL,
  resumo        TEXT,
  categoria     TEXT        NOT NULL,
  subcategoria  TEXT,
  especialidade TEXT,
  palavras_chave TEXT,

  -- Conteúdo técnico (composto a partir das seções da Knowledge Specification)
  conteudo      TEXT        NOT NULL,
  referencias   TEXT,

  -- Autoria e revisão
  autor         TEXT,
  data_revisao  DATE,

  -- Embedding vetorial (Cohere embed-multilingual-v3.0, 1024 dims)
  -- Gerado SOMENTE após aprovação humana (via /api/knowledge-spec/aprovar)
  embedding     vector(1024),

  -- Timestamps
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Soft delete: deleted_at preenchido = arquivado, não aparece nas buscas
  deleted_at    TIMESTAMPTZ
);

-- knowledge_versions: histórico imutável de versões do knowledge_base
-- Criado automaticamente em cada edição via /api/conhecimento/salvar
CREATE TABLE IF NOT EXISTS knowledge_versions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id   UUID        NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
  versao         INT         NOT NULL,
  titulo         TEXT,
  resumo         TEXT,
  conteudo       TEXT,
  referencias    TEXT,
  autor          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- knowledge_audit: log de ações sobre entradas do knowledge_base
CREATE TABLE IF NOT EXISTS knowledge_audit (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id   UUID        NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
  usuario        TEXT        NOT NULL,
  acao           TEXT        NOT NULL, -- criar | editar | arquivar
  valor_anterior TEXT,                 -- JSON do estado anterior
  valor_novo     TEXT,                 -- JSON do estado novo
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ================================================================
-- 3. TABELAS DO PIPELINE — Knowledge Specifications (staging area)
-- ================================================================

-- knowledge_specs: área de staging do pipeline de auditoria.
-- Nenhum conteúdo desta tabela está disponível para o KRONOS.
-- O conteúdo migra para knowledge_base SOMENTE após aprovação humana.
--
-- Fluxo de status:
--   rascunho → em_auditoria → aguardando_aprovacao → aprovado
--                                                   ↘ reprovado → rascunho (reenvio)
--   aprovado → arquivado (encerramento manual)
CREATE TABLE IF NOT EXISTS knowledge_specs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Etapa 1: Pesquisador ──────────────────────────────────────
  -- Metadados de identificação e classificação
  titulo        TEXT        NOT NULL,
  categoria     TEXT        NOT NULL,
  subcategoria  TEXT,
  resumo        TEXT,
  objetivo      TEXT,
  escopo        TEXT,

  -- Fontes oficiais coletadas (array de objetos JSON)
  -- Estrutura de cada item:
  -- { instituicao, documento, numero?, ano?, url?,
  --   trecho?, data_publicacao?, data_atualizacao? }
  referencias_oficiais JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- ── Etapa 2: Redator ─────────────────────────────────────────
  -- Seções de conteúdo técnico (redação com palavras próprias)
  indicacoes                 TEXT,
  contraindicacoes           TEXT,
  materiais                  TEXT,
  preparacao                 TEXT,
  procedimento               TEXT,
  cuidados                   TEXT,
  complicacoes               TEXT,
  prevencao_eventos_adversos TEXT,
  pontos_criticos            TEXT,
  observacoes                TEXT,
  limitacoes                 TEXT,
  variacoes_institucionais   TEXT,

  -- ── Etapas 3–8: Pipeline de Auditoria ────────────────────────
  -- Resultado completo do pipeline (JSON com resultados de cada auditor)
  pipeline_resultado    JSONB,
  -- Classificação final da Etapa 8 (Consolidação)
  pipeline_classificacao TEXT CHECK (
    pipeline_classificacao IS NULL OR
    pipeline_classificacao IN ('verde', 'amarelo', 'vermelho')
  ),

  -- ── Controle de status e integridade ─────────────────────────
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (
    status IN (
      'rascunho',
      'em_auditoria',
      'aguardando_aprovacao',
      'aprovado',
      'reprovado',
      'arquivado'
    )
  ),

  -- Hash SHA-256 do conteúdo (titulo + objetivo + procedimento + referencias)
  -- Detecta alterações de conteúdo entre pipeline e aprovação
  hash TEXT,

  -- ── Rastreabilidade ──────────────────────────────────────────
  criado_por        TEXT        NOT NULL,
  aprovado_por      TEXT,
  -- Referência ao registro publicado no knowledge_base após aprovação
  knowledge_base_id UUID        REFERENCES knowledge_base(id),

  -- Timestamps
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  aprovado_em TIMESTAMPTZ,

  -- Histórico completo de ações (append-only — nunca sobrescrever)
  -- Estrutura de cada item:
  -- { versao, usuario, acao, data, observacao? }
  historico JSONB NOT NULL DEFAULT '[]'::JSONB
);

-- knowledge_spec_audit: log granular de ações sobre cada spec
CREATE TABLE IF NOT EXISTS knowledge_spec_audit (
  id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id  UUID        NOT NULL REFERENCES knowledge_specs(id) ON DELETE CASCADE,
  usuario  TEXT        NOT NULL,
  acao     TEXT        NOT NULL, -- criar | editar | pipeline | aprovar | reprovar_manual | arquivar
  dados    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ================================================================
-- 4. ÍNDICES
-- ================================================================

-- knowledge_base
CREATE INDEX IF NOT EXISTS idx_knowledge_base_deleted_at
  ON knowledge_base(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_base_categoria
  ON knowledge_base(categoria);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_updated_at
  ON knowledge_base(updated_at DESC);

-- Índice vetorial para busca por similaridade (cosine distance)
-- Criado após inserções em lote para melhor performance
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding
  ON knowledge_base USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- knowledge_versions
CREATE INDEX IF NOT EXISTS idx_knowledge_versions_knowledge_id
  ON knowledge_versions(knowledge_id);

-- knowledge_audit
CREATE INDEX IF NOT EXISTS idx_knowledge_audit_knowledge_id
  ON knowledge_audit(knowledge_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_audit_created_at
  ON knowledge_audit(created_at DESC);

-- knowledge_specs
CREATE INDEX IF NOT EXISTS idx_knowledge_specs_status
  ON knowledge_specs(status);

CREATE INDEX IF NOT EXISTS idx_knowledge_specs_updated_at
  ON knowledge_specs(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_specs_categoria
  ON knowledge_specs(categoria);

CREATE INDEX IF NOT EXISTS idx_knowledge_specs_pipeline_classificacao
  ON knowledge_specs(pipeline_classificacao) WHERE pipeline_classificacao IS NOT NULL;

-- knowledge_spec_audit
CREATE INDEX IF NOT EXISTS idx_knowledge_spec_audit_spec_id
  ON knowledge_spec_audit(spec_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_spec_audit_created_at
  ON knowledge_spec_audit(created_at DESC);


-- ================================================================
-- 5. FUNÇÕES RPC
-- ================================================================

-- buscar_conhecimento: busca semântica vetorial no knowledge_base.
-- Chamada pelo KRONOS (/api/kronos/professor) via supabase.rpc().
-- Retorna apenas entradas ativas (deleted_at IS NULL) com embedding.
-- Similaridade baseada em cosine distance (1 - distância = similaridade).
CREATE OR REPLACE FUNCTION buscar_conhecimento(
  query_embedding    vector(1024),
  similarity_threshold float DEFAULT 0.82,
  match_count        int   DEFAULT 3
)
RETURNS TABLE (
  id           UUID,
  titulo       TEXT,
  resumo       TEXT,
  categoria    TEXT,
  subcategoria TEXT,
  conteudo     TEXT,
  referencias  TEXT,
  similarity   FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.titulo,
    kb.resumo,
    kb.categoria,
    kb.subcategoria,
    kb.conteudo,
    kb.referencias,
    (1 - (kb.embedding <=> query_embedding))::FLOAT AS similarity
  FROM knowledge_base kb
  WHERE
    kb.deleted_at IS NULL
    AND kb.embedding IS NOT NULL
    AND (1 - (kb.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY kb.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;


-- ================================================================
-- 6. TRIGGERS
-- ================================================================

-- Atualiza updated_at automaticamente em cada UPDATE na knowledge_base
CREATE OR REPLACE FUNCTION _update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_knowledge_base_updated_at ON knowledge_base;
CREATE TRIGGER trg_knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION _update_updated_at();

DROP TRIGGER IF EXISTS trg_knowledge_specs_updated_at ON knowledge_specs;
CREATE TRIGGER trg_knowledge_specs_updated_at
  BEFORE UPDATE ON knowledge_specs
  FOR EACH ROW EXECUTE FUNCTION _update_updated_at();


-- ================================================================
-- VERIFICAÇÃO FINAL
-- Execute após a migration para confirmar que tudo foi criado:
-- ================================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--     AND table_name LIKE 'knowledge%'
--   ORDER BY table_name;
--
-- Esperado:
--   knowledge_audit
--   knowledge_base
--   knowledge_spec_audit
--   knowledge_specs
--   knowledge_versions
--
-- SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema = 'public'
--     AND routine_name = 'buscar_conhecimento';
-- ================================================================
