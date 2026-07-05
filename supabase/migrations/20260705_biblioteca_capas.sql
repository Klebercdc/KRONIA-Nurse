-- ================================================================
-- Migration: 20260705_biblioteca_capas
--
-- Suporte à tela "Biblioteca KRONOS" (home nurse-facing):
--   - cover_url: URL pública da imagem de capa do guia (bucket
--     Storage "guide-covers"). Nullable — guias sem capa exibem
--     gradiente/placeholder no front-end, nunca quebram o layout.
--   - destaque: marca manual do guia "principal" exibido no card
--     "Em destaque" da home. Não confundir com pipeline_classificacao
--     (knowledge_specs) — é um flag editorial, não de auditoria.
-- ================================================================

ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS destaque  BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN knowledge_base.cover_url IS
  'URL pública (bucket Storage guide-covers) da imagem de capa do guia. Nullable.';
COMMENT ON COLUMN knowledge_base.destaque IS
  'Marca editorial: guia exibido no card "Em destaque" da Biblioteca KRONOS. No máximo um deveria estar true por vez, mas não há constraint — o front-end pega o mais recente entre os marcados.';

CREATE INDEX IF NOT EXISTS idx_knowledge_base_destaque
  ON knowledge_base(destaque) WHERE destaque = true;
