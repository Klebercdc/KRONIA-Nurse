-- ================================================================
-- KRONIA NURSE — habilita pg_trgm (similarity())
-- Migration: 20260712_enable_pg_trgm
--
-- Necessária pro fallback de similaridade >=90% do Passo 4 da
-- metodologia busca-por-assunto + anti-alucinação (ver
-- .claude/skills/kronia-nurse-knowledge-spec-search/SKILL.md) — tanto
-- em scripts/verificar_citacoes.py (via difflib, não depende disso)
-- quanto na verificação equivalente via SQL direto que este agente usa
-- em sessão quando não há DATABASE_URL local disponível.
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
