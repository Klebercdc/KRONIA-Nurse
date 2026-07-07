-- ================================================================
-- KRONIA NURSE — Fixa search_path da função buscar_fragmentos_conhecimento
-- Migration: 20260706_fix_search_path_buscar_fragmentos
--
-- Corrige o warning do linter de segurança do Supabase
-- (0011_function_search_path_mutable), detectado logo após a função ser
-- recriada pela migration 20260706_fragmentos_pagina.
-- ================================================================

ALTER FUNCTION buscar_fragmentos_conhecimento(vector, float, int) SET search_path = public;
