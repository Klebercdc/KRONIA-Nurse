-- ================================================================
-- KRONIA NURSE — amplia knowledge_specs_tipo_check / knowledge_base_tipo_check
-- Migration: 20260712_resultado_enfermagem_tipo
--
-- Item 4 do PDF de Revisão e Validação (11/07/2026): a spec
-- "Resultado de Enfermagem: Equilíbrio Hídrico" (NOC 0601) estava
-- armazenada com tipo='procedimento' + campos_especificos.tipo_registro
-- como workaround, porque o CHECK constraint só aceitava
-- 'procedimento'/'diagnostico_enfermagem'. O kit
-- context/kits/knowledge-engine-tipos-objeto.md (item 6, "Resultados
-- NOC") já previa esse terceiro tipo como próximo da lista — esta
-- migration apenas amplia o constraint que já esperava crescer.
--
-- Não mexe em nenhum registro existente (todos continuam
-- 'procedimento'/'diagnostico_enfermagem'). A própria spec NOC 0601
-- foi migrada para tipo='resultado_enfermagem' separadamente (SQL
-- direto, fora de migration, já que é dado e não schema).
-- ================================================================

ALTER TABLE knowledge_specs DROP CONSTRAINT IF EXISTS knowledge_specs_tipo_check;
ALTER TABLE knowledge_specs
  ADD CONSTRAINT knowledge_specs_tipo_check
  CHECK (tipo IN ('procedimento', 'diagnostico_enfermagem', 'resultado_enfermagem'));

ALTER TABLE knowledge_base DROP CONSTRAINT IF EXISTS knowledge_base_tipo_check;
ALTER TABLE knowledge_base
  ADD CONSTRAINT knowledge_base_tipo_check
  CHECK (tipo IN ('procedimento', 'diagnostico_enfermagem', 'resultado_enfermagem'));

COMMENT ON COLUMN knowledge_specs.tipo IS
  'Tipo de Objeto de Conhecimento. "procedimento" cobre Procedimentos/Protocolos/POPs (colunas indicacoes..variacoes_institucionais). "diagnostico_enfermagem" e "resultado_enfermagem" usam campos_especificos (NANDA-I / NOC, ver context/kits/knowledge-engine-tipos-objeto.md itens 4 e 6).';
