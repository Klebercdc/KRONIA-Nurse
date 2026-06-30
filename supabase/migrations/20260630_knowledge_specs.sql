-- ============================================================
-- Knowledge System — Pipeline de Biblioteca Técnica
-- Migration: 20260630_knowledge_specs
--
-- Cria as tabelas de staging do pipeline de auditoria.
-- O knowledge_base (tabela existente) continua como a fonte
-- canônica aprovada consultada pelo KRONOS.
-- ============================================================

-- Tabela principal: Knowledge Specifications (staging area do pipeline)
CREATE TABLE IF NOT EXISTS knowledge_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadados
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  subcategoria TEXT,
  resumo TEXT,
  objetivo TEXT,
  escopo TEXT,

  -- Seções de conteúdo (Etapa 2: Redator)
  indicacoes TEXT,
  contraindicacoes TEXT,
  materiais TEXT,
  preparacao TEXT,
  procedimento TEXT,
  cuidados TEXT,
  complicacoes TEXT,
  prevencao_eventos_adversos TEXT,
  pontos_criticos TEXT,
  observacoes TEXT,
  limitacoes TEXT,
  variacoes_institucionais TEXT,

  -- Fontes coletadas (Etapa 1: Pesquisador) — array de objetos
  referencias_oficiais JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- Resultado do pipeline (Etapas 3–8)
  pipeline_resultado JSONB,
  pipeline_classificacao TEXT CHECK (
    pipeline_classificacao IS NULL OR
    pipeline_classificacao IN ('verde', 'amarelo', 'vermelho')
  ),

  -- Status do fluxo
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (
    status IN ('rascunho', 'em_auditoria', 'aguardando_aprovacao', 'aprovado', 'reprovado', 'arquivado')
  ),

  -- Integridade de conteúdo
  hash TEXT,

  -- Rastreabilidade
  criado_por TEXT NOT NULL,
  aprovado_por TEXT,
  knowledge_base_id UUID,  -- referência ao registro aprovado no knowledge_base

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  aprovado_em TIMESTAMPTZ,

  -- Histórico completo de auditoria (imutável — append-only em código)
  historico JSONB NOT NULL DEFAULT '[]'::JSONB
);

-- Índices para acesso por status e ordenação
CREATE INDEX IF NOT EXISTS idx_knowledge_specs_status
  ON knowledge_specs(status);

CREATE INDEX IF NOT EXISTS idx_knowledge_specs_updated_at
  ON knowledge_specs(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_specs_categoria
  ON knowledge_specs(categoria);

-- Tabela de auditoria de ações sobre specs
CREATE TABLE IF NOT EXISTS knowledge_spec_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id UUID NOT NULL REFERENCES knowledge_specs(id) ON DELETE CASCADE,
  usuario TEXT NOT NULL,
  acao TEXT NOT NULL,
  dados JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_spec_audit_spec_id
  ON knowledge_spec_audit(spec_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_spec_audit_created_at
  ON knowledge_spec_audit(created_at DESC);

-- ============================================================
-- FUNÇÃO RPC: buscar_conhecimento (se ainda não existir)
-- Busca semântica vetorial no knowledge_base.
-- Parâmetros: query_embedding vector(1024), similarity_threshold float, match_count int
-- ============================================================
CREATE OR REPLACE FUNCTION buscar_conhecimento(
  query_embedding vector(1024),
  similarity_threshold float DEFAULT 0.82,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  resumo TEXT,
  categoria TEXT,
  subcategoria TEXT,
  conteudo TEXT,
  referencias TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
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
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
  WHERE
    kb.deleted_at IS NULL
    AND kb.embedding IS NOT NULL
    AND 1 - (kb.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- Trigger para atualizar updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_knowledge_specs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_knowledge_specs_updated_at ON knowledge_specs;
CREATE TRIGGER trg_knowledge_specs_updated_at
  BEFORE UPDATE ON knowledge_specs
  FOR EACH ROW EXECUTE FUNCTION update_knowledge_specs_updated_at();
