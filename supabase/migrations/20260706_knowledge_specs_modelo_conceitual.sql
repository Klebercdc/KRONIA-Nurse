-- ================================================================
-- KRONIA NURSE — Modelo conceitual do Objeto de Conhecimento (Procedimento)
-- Migration: 20260706_knowledge_specs_modelo_conceitual
--
-- Adiciona os campos do modelo conceitual definido pelo usuário:
-- Definição, Equipamentos, EPIs, Execução (passo a passo estruturado),
-- Registro (o que documentar) e Fundamentação Científica.
--
-- Campos antigos (prevencao_eventos_adversos, pontos_criticos,
-- observacoes, limitacoes, variacoes_institucionais) NÃO são removidos —
-- ficam como legado para specs já aprovadas/existentes. O Redator para de
-- preenchê-los em specs novas, mas o schema continua aceitando os dois.
--
-- Nullable: specs existentes ficam com os campos novos em branco.
-- Seguro para rodar em banco vazio ou já existente (IF NOT EXISTS).
-- ================================================================

ALTER TABLE knowledge_specs
  ADD COLUMN IF NOT EXISTS definicao TEXT,
  ADD COLUMN IF NOT EXISTS equipamentos TEXT,
  ADD COLUMN IF NOT EXISTS epis TEXT,
  ADD COLUMN IF NOT EXISTS execucao_passos JSONB,
  ADD COLUMN IF NOT EXISTS registro TEXT,
  ADD COLUMN IF NOT EXISTS fundamentacao_cientifica TEXT;

COMMENT ON COLUMN knowledge_specs.definicao IS
  'Definição formal e técnica do procedimento — distinta do resumo (1-2 frases de propósito geral).';
COMMENT ON COLUMN knowledge_specs.equipamentos IS
  'Equipamentos utilizados no procedimento, separados de materiais de consumo.';
COMMENT ON COLUMN knowledge_specs.epis IS
  'Equipamentos de Proteção Individual exigidos — antes ficava implícito dentro de "preparacao".';
COMMENT ON COLUMN knowledge_specs.execucao_passos IS
  'Passo a passo estruturado da execução técnica: array JSON de strings, um item por passo. Substitui o antigo campo de texto livre "procedimento" para specs novas (procedimento continua existindo, preenchido a partir deste array, para compatibilidade).';
COMMENT ON COLUMN knowledge_specs.registro IS
  'O que deve constar no registro/anotação de enfermagem após a execução do procedimento.';
COMMENT ON COLUMN knowledge_specs.fundamentacao_cientifica IS
  'Síntese da base científica/racional clínico do procedimento — distinta da lista de referencias_oficiais.';
