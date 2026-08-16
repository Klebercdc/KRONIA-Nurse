-- ================================================================
-- KRONIA NURSE — knowledge_base alcança o modelo conceitual novo
-- Migration: 20260711_knowledge_base_modelo_conceitual
--
-- knowledge_specs ganhou definicao/equipamentos/epis/execucao_passos
-- (migration 20260706_knowledge_specs_modelo_conceitual) e depois
-- alertas/condutas (migration 20260710_categoria_taxonomia_v2), mas
-- knowledge_base — a tabela que pages/conhecimento/[id].tsx de fato
-- renderiza — nunca recebeu essas colunas. Resultado: toda spec
-- aprovada/publicada perde definicao/alertas/condutas/
-- fundamentacao_cientifica/equipamentos/epis/execucao_passos no
-- artigo final, mesmo quando knowledge_specs tem o conteúdo completo.
-- `conteudo` (o blob usado por embedding/KRONOS) tinha o texto todo,
-- mas a página de artigo nunca leu `conteudo` — só as colunas
-- individuais (ver SECOES em pages/conhecimento/[id].tsx).
--
-- Nullable: entradas existentes ficam com os campos novos em branco
-- até o próximo resync. Seguro para rodar em banco já existente
-- (IF NOT EXISTS em tudo).
-- ================================================================

ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS definicao TEXT,
  ADD COLUMN IF NOT EXISTS equipamentos TEXT,
  ADD COLUMN IF NOT EXISTS epis TEXT,
  ADD COLUMN IF NOT EXISTS execucao_passos JSONB,
  ADD COLUMN IF NOT EXISTS registro TEXT,
  ADD COLUMN IF NOT EXISTS fundamentacao_cientifica TEXT,
  ADD COLUMN IF NOT EXISTS alertas TEXT,
  ADD COLUMN IF NOT EXISTS condutas TEXT;

COMMENT ON COLUMN knowledge_base.definicao IS
  'Definição formal e técnica do procedimento — espelha knowledge_specs.definicao.';
COMMENT ON COLUMN knowledge_base.equipamentos IS
  'Equipamentos utilizados no procedimento, separados de materiais de consumo.';
COMMENT ON COLUMN knowledge_base.epis IS
  'Equipamentos de Proteção Individual exigidos.';
COMMENT ON COLUMN knowledge_base.execucao_passos IS
  'Passo a passo estruturado da execução técnica: array JSON de strings. Espelha knowledge_specs.execucao_passos — coluna "procedimento" (texto livre legado) continua existindo em paralelo para specs antigas.';
COMMENT ON COLUMN knowledge_base.registro IS
  'O que deve constar no registro/anotação de enfermagem após a execução do procedimento.';
COMMENT ON COLUMN knowledge_base.fundamentacao_cientifica IS
  'Síntese da base científica/racional clínico do procedimento — distinta de "referencias".';
COMMENT ON COLUMN knowledge_base.alertas IS
  'Sinais que exigem atenção imediata durante/após a execução — distinto de cuidados (rotina) e complicacoes (o que pode acontecer).';
COMMENT ON COLUMN knowledge_base.condutas IS
  'O que fazer diante de um alerta ou complicação — distinto de execucao_passos (execução padrão).';

-- ================================================================
-- VERIFICAÇÃO
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'knowledge_base'
--     AND column_name IN ('definicao','equipamentos','epis',
--       'execucao_passos','registro','fundamentacao_cientifica',
--       'alertas','condutas')
--   ORDER BY column_name;
-- Esperado: 8 linhas (execucao_passos = 'jsonb', resto = 'text').
-- ================================================================
