-- ================================================================
-- KRONIA NURSE — knowledge_base ganha campos_especificos
-- Migration: 20260712_campos_especificos_knowledge_base
--
-- Mesmo bug de classe da migration 20260711_knowledge_base_modelo_conceitual:
-- knowledge_specs já tem campos_especificos (JSONB, usado por
-- diagnostico_enfermagem/resultado_enfermagem) desde a migration
-- 20260706_knowledge_tipo, mas knowledge_base nunca ganhou a coluna
-- espelho. Sem isso, aprovar uma spec desses tipos publicaria o
-- artigo sem NENHUM dos campos próprios do tipo (indicadores,
-- características definidoras, código NANDA/NOC etc.) — perda
-- silenciosa de dado, igual ao bug já corrigido pras seções
-- definicao/alertas/condutas/etc.
-- ================================================================

ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS campos_especificos JSONB;

COMMENT ON COLUMN knowledge_base.campos_especificos IS
  'Espelha knowledge_specs.campos_especificos — campos próprios de tipos != procedimento (diagnostico_enfermagem: NANDA-I; resultado_enfermagem: NOC). NULL para tipo=procedimento.';
