-- ================================================================
-- KRONIA NURSE — coluna licenca em conhecimento_documentos (allowlist)
-- Migration: 20260712_licenca_conhecimento_documentos
--
-- Backstop mecânico pro filtro de licenciamento descrito em
-- docs/constituicao-extracao-conhecimento.md § Regra de licença e em
-- .claude/skills/kronia-nurse-knowledge/references/01-licenciamento-e-fontes.md.
-- Até aqui a regra "nunca usar CC BY-NC*" só existia em prosa — checagem
-- dependia inteiramente do agente ler com atenção toda vez. Já falhou
-- duas vezes nesta base (UFCSPA Intensivismo, 2 guias Atena Estomaterapia
-- — todos CC BY-NC-ND, usados antes de alguém notar).
--
-- Allowlist (fail closed), não blocklist: um valor que não bate com
-- nenhuma licença explicitamente permitida é rejeitado na gravação, não
-- aceito por padrão. NULL continua permitido (fonte ainda não
-- classificada) — não força backfill de documentos já existentes, mas
-- qualquer tentativa futura de gravar uma licença NC no campo falha
-- direto no banco, não só na leitura de um checklist.
--
-- Testado em sessão: INSERT com licenca='CC BY-NC-ND 4.0' rejeitado
-- (check_violation); INSERT com licenca='CC BY 4.0' aceito normalmente.
-- ================================================================

ALTER TABLE conhecimento_documentos
  ADD COLUMN IF NOT EXISTS licenca TEXT;

ALTER TABLE conhecimento_documentos
  ADD CONSTRAINT conhecimento_documentos_licenca_check
  CHECK (
    licenca IS NULL OR licenca IN (
      'CC BY 4.0',
      'CC BY-SA 4.0',
      'CC0 1.0',
      'Domínio Público',
      'Governamental sem restrição',
      'Institucional sem restrição'
    )
  );

COMMENT ON COLUMN conhecimento_documentos.licenca IS
  'Licença do documento, allowlist (ver CHECK conhecimento_documentos_licenca_check) — qualquer variante CC BY-NC/NC-ND/NC-SA é rejeitada na gravação, não só filtrada depois. NULL = ainda não classificado (não é o mesmo que "aprovado"); só usar como fonte confirmada quando licenca estiver preenchida com um valor da allowlist, OU quando ativo=true e a classificação já foi feita manualmente antes desta coluna existir (backfill incompleto de propósito — não presumir valor sem checar a fonte real).';
