-- Reconstrução da Knowledge Base — Taxonomia v2.0 (36 Áreas Clínicas).
--
-- Contexto: auditoria de knowledge_specs (102 registros) encontrou 98/102
-- specs presas na categoria genérica "Documentação de Enfermagem" (a lista
-- anterior de 19 domínios livres não tinha vocabulário fechado nem trava no
-- banco), e um caso confirmado de contaminação cruzada ("Os 13 Certos na
-- Administração de Medicamentos", c167cb42-775f-45db-8fc3-90dcf0f69734,
-- categorizado errado e citando 4 referências de um documento não
-- relacionado). Esta migration:
--   1. Adiciona as colunas `alertas` e `condutas` (Taxonomia v2.0 as trata
--      como distintas de `cuidados`/`complicacoes`).
--   2. Trava `categoria` num vocabulário fechado de 36 Áreas Clínicas.
--
-- A constraint entra como NOT VALID: 98/102 linhas existentes violam o
-- vocabulário novo e a reconstrução de todas elas é um processo separado,
-- em andamento (ver kronia-nurse-document-ingestion skill). NOT VALID
-- bloqueia inserts/updates NOVOS com categoria fora da árvore a partir de
-- agora, sem quebrar a leitura das linhas antigas. Depois que os specs
-- existentes forem recategorizados, rodar:
--   ALTER TABLE knowledge_specs VALIDATE CONSTRAINT categoria_taxonomia_v2;

ALTER TABLE knowledge_specs ADD COLUMN IF NOT EXISTS alertas text;
ALTER TABLE knowledge_specs ADD COLUMN IF NOT EXISTS condutas text;

ALTER TABLE knowledge_specs
  ADD CONSTRAINT categoria_taxonomia_v2 CHECK (
    categoria = ANY (ARRAY[
      'Fundamentos de Enfermagem','Administração de Medicamentos','Acesso Vascular',
      'Terapia Intravenosa','Feridas e Curativos','Sondas e Drenos','Oxigenoterapia',
      'Ventilação Mecânica','Hemodinâmica','Centro Cirúrgico','CME','UTI Adulto',
      'Pediatria','Neonatologia','Obstetrícia','Emergência','Trauma','Oncologia',
      'Saúde Mental','Cuidados Paliativos','Infectologia','Controle de Infecção',
      'Hemoterapia','Hemodiálise','Exames Laboratoriais','Monitorização','Equipamentos',
      'Escalas Clínicas','Diagnósticos de Enfermagem','Intervenções de Enfermagem',
      'Resultados de Enfermagem','Protocolos Institucionais','POPs','Diretrizes Clínicas',
      'Legislação','Educação Permanente'
    ]::text[])
  ) NOT VALID;

COMMENT ON COLUMN knowledge_specs.alertas IS 'Sinais que exigem atenção imediata durante/após a execução do procedimento — distinto de cuidados (rotina) e complicacoes (o que pode acontecer).';
COMMENT ON COLUMN knowledge_specs.condutas IS 'O que fazer diante de um alerta ou complicação — distinto de execucao_passos (execução padrão).';
