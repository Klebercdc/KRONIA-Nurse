-- ================================================================
-- KRONIA NURSE — Schema unificado de Objeto de Conhecimento
-- Migration: 20260706_knowledge_tipo
--
-- Introduz `tipo` em knowledge_specs/knowledge_base pra suportar tipos de
-- Objeto de Conhecimento além de Procedimento/Protocolo/POP (que já são
-- cobertos pelas colunas existentes — ver context/kits/
-- knowledge-engine-tipos-objeto.md, itens 1-3).
--
-- Primeiro tipo novo: Diagnóstico de Enfermagem (NANDA-I), decidido como
-- o primeiro a ser implementado (ver "Decisão — qual tipo entra primeiro"
-- no mesmo kit). CIPE fica como valor futuro de `taxonomia` dentro de
-- campos_especificos, sem exigir schema/tabela separada agora.
--
-- Todos os registros existentes ficam com tipo = 'procedimento' e
-- campos_especificos = NULL — zero impacto no fluxo atual.
--
-- Seguro para rodar em banco vazio ou já existente (IF NOT EXISTS /
-- DO $$ ... $$ para o CHECK constraint condicional).
-- ================================================================

-- ================================================================
-- 1. knowledge_specs
-- ================================================================

ALTER TABLE knowledge_specs
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'procedimento',
  ADD COLUMN IF NOT EXISTS campos_especificos JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_specs_tipo_check'
  ) THEN
    ALTER TABLE knowledge_specs
      ADD CONSTRAINT knowledge_specs_tipo_check
      CHECK (tipo IN ('procedimento', 'diagnostico_enfermagem'));
  END IF;
END $$;

COMMENT ON COLUMN knowledge_specs.tipo IS
  'Tipo de Objeto de Conhecimento. "procedimento" cobre Procedimentos/Protocolos/POPs (colunas indicacoes..variacoes_institucionais). Outros tipos usam campos_especificos.';

COMMENT ON COLUMN knowledge_specs.campos_especificos IS
  'Campos próprios de tipos que não são "procedimento". Para diagnostico_enfermagem: '
  '{ taxonomia: "NANDA-I"|"CIPE", codigo, dominio, classe, definicao, '
  'caracteristicas_definidoras: string[], fatores_relacionados: string[], fatores_de_risco: string[] }.';

-- ================================================================
-- 2. knowledge_base
-- ================================================================

ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'procedimento';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_base_tipo_check'
  ) THEN
    ALTER TABLE knowledge_base
      ADD CONSTRAINT knowledge_base_tipo_check
      CHECK (tipo IN ('procedimento', 'diagnostico_enfermagem'));
  END IF;
END $$;

COMMENT ON COLUMN knowledge_base.tipo IS
  'Espelha knowledge_specs.tipo — usado pelo Retrieval/Response Engine pra saber como formatar a citação sem consultar knowledge_specs.';
