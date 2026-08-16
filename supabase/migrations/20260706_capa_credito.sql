-- ================================================================
-- Migration: 20260706_capa_credito
--
-- Suporte a atribuição de fotos buscadas automaticamente (Unsplash):
--   - cover_credito: texto de crédito do fotógrafo, exigido pelos
--     termos de uso da API do Unsplash quando a foto é exibida.
--     Nullable — capas antigas/manuais não têm crédito.
-- ================================================================

ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS cover_credito TEXT;

COMMENT ON COLUMN knowledge_base.cover_credito IS
  'Crédito de atribuição da foto de capa (fotógrafo + Unsplash), exigido pelos termos da API quando cover_url veio de busca automática. Nullable — capas manuais não têm crédito.';
