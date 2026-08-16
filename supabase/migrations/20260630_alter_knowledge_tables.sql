-- ================================================================
-- DIFF EXATO — Alterações nas tabelas existentes
-- Migration: 20260630_alter_knowledge_tables
--
-- PREMISSA: knowledge_base, knowledge_versions e knowledge_audit
-- já existem. Este script NÃO recria nada. Usa ADD COLUMN IF NOT EXISTS
-- em todo lugar — seguro para rodar mesmo se parcialmente aplicado.
--
-- EXECUTAR APÓS: 20260630_knowledge_specs.sql (precisa da tabela
-- knowledge_specs para o comentário de FK, mas spec_id é UUID sem
-- constraint para evitar dependência de ordem de migração).
-- ================================================================


-- ================================================================
-- TABELA: knowledge_base
-- ================================================================
-- Schema atual (colunas existentes inferidas do código):
--   id, titulo, resumo, categoria, subcategoria, especialidade,
--   palavras_chave, conteudo, referencias, autor, data_revisao,
--   embedding vector(1024), created_at, updated_at, deleted_at
--
-- Novas colunas: seções estruturadas da Knowledge Specification +
--   spec_id (rastreabilidade ao rascunho de origem) + hash (integridade)
-- ================================================================

-- Etapa 1: Pesquisador — metadados de escopo
ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS objetivo TEXT,
  ADD COLUMN IF NOT EXISTS escopo   TEXT;

-- Etapa 2: Redator — seções de conteúdo técnico
ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS indicacoes                 TEXT,
  ADD COLUMN IF NOT EXISTS contraindicacoes           TEXT,
  ADD COLUMN IF NOT EXISTS materiais                  TEXT,
  ADD COLUMN IF NOT EXISTS preparacao                 TEXT,
  ADD COLUMN IF NOT EXISTS procedimento               TEXT,
  ADD COLUMN IF NOT EXISTS cuidados                   TEXT,
  ADD COLUMN IF NOT EXISTS complicacoes               TEXT,
  ADD COLUMN IF NOT EXISTS prevencao_eventos_adversos TEXT,
  ADD COLUMN IF NOT EXISTS pontos_criticos            TEXT,
  ADD COLUMN IF NOT EXISTS observacoes                TEXT,
  ADD COLUMN IF NOT EXISTS limitacoes                 TEXT,
  ADD COLUMN IF NOT EXISTS variacoes_institucionais   TEXT;

-- Rastreabilidade: referência à spec que originou este registro
-- UUID sem FK para independência de ordem de migração
ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS spec_id UUID,
  ADD COLUMN IF NOT EXISTS hash    TEXT;

-- Comentário descritivo para documentar intenção do spec_id
COMMENT ON COLUMN knowledge_base.spec_id IS
  'ID da knowledge_spec de origem. Nullable: entradas criadas pelo admin antigo não têm spec.';
COMMENT ON COLUMN knowledge_base.hash IS
  'SHA-256 do conteúdo no momento da aprovação. Calculado em /api/knowledge-spec/aprovar.';
COMMENT ON COLUMN knowledge_base.conteudo IS
  'Texto composto de todas as seções estruturadas. Usado para embedding e recuperação pelo KRONOS.';


-- ================================================================
-- TABELA: knowledge_versions
-- ================================================================
-- Schema atual (colunas existentes inferidas do código):
--   id, knowledge_id, versao, titulo, resumo, conteudo,
--   referencias, autor, created_at
--
-- Novas colunas: espelhar as seções estruturadas para que o
-- histórico de versões cubra o conteúdo completo, não só o blob.
-- ================================================================

ALTER TABLE knowledge_versions
  ADD COLUMN IF NOT EXISTS objetivo                   TEXT,
  ADD COLUMN IF NOT EXISTS escopo                     TEXT,
  ADD COLUMN IF NOT EXISTS indicacoes                 TEXT,
  ADD COLUMN IF NOT EXISTS contraindicacoes           TEXT,
  ADD COLUMN IF NOT EXISTS materiais                  TEXT,
  ADD COLUMN IF NOT EXISTS preparacao                 TEXT,
  ADD COLUMN IF NOT EXISTS procedimento               TEXT,
  ADD COLUMN IF NOT EXISTS cuidados                   TEXT,
  ADD COLUMN IF NOT EXISTS complicacoes               TEXT,
  ADD COLUMN IF NOT EXISTS prevencao_eventos_adversos TEXT,
  ADD COLUMN IF NOT EXISTS pontos_criticos            TEXT,
  ADD COLUMN IF NOT EXISTS observacoes                TEXT,
  ADD COLUMN IF NOT EXISTS limitacoes                 TEXT,
  ADD COLUMN IF NOT EXISTS variacoes_institucionais   TEXT;

COMMENT ON TABLE knowledge_versions IS
  'Histórico imutável de versões do knowledge_base. Colunas estruturadas preenchidas somente para entradas originadas do pipeline (spec_id não nulo).';


-- ================================================================
-- TABELA: knowledge_audit
-- ================================================================
-- Sem alterações: armazena JSON em valor_anterior/valor_novo.
-- A auditoria do pipeline usa knowledge_spec_audit (tabela nova).
-- ================================================================


-- ================================================================
-- ÍNDICES ADICIONAIS para as novas colunas
-- ================================================================

-- Busca rápida por spec de origem (rastreabilidade)
CREATE INDEX IF NOT EXISTS idx_knowledge_base_spec_id
  ON knowledge_base(spec_id) WHERE spec_id IS NOT NULL;


-- ================================================================
-- VERIFICAÇÃO
-- Execute logo após a migration para confirmar as colunas novas:
--
--   SELECT column_name, data_type
--   FROM information_schema.columns
--   WHERE table_name = 'knowledge_base'
--     AND column_name IN (
--       'objetivo','escopo','indicacoes','contraindicacoes',
--       'materiais','preparacao','procedimento','cuidados',
--       'complicacoes','prevencao_eventos_adversos','pontos_criticos',
--       'observacoes','limitacoes','variacoes_institucionais',
--       'spec_id','hash'
--     )
--   ORDER BY column_name;
--
-- Esperado: 16 linhas, data_type = 'text' (exceto spec_id = 'uuid')
-- ================================================================
