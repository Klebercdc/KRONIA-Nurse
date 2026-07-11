---
name: kronia-nurse-knowledge
description: Busca, valida e grava conteúdo clínico de enfermagem no knowledge_specs do Kronia Nurse (Supabase uguxeoftfnljrxhwvdkj), organizado por ASSUNTO clínico (não por PDF isolado), usando só fontes licenciadas/legítimas, com anti-alucinação mecânica e triangulação obrigatória. Use esta skill sempre que o usuário pedir para pesquisar um tema de enfermagem, hemodiálise, NANDA/NIC/NOC, adicionar uma fonte nova (PDF, Google Drive, link), gerar um novo knowledge_specs, planejar quais assuntos cobrir dentro das 36 áreas da taxonomia, ou perguntar sobre cobertura/lacunas do knowledge_base. Também use ao avaliar se um PDF pode ser ingerido (checagem de licenciamento) antes de processá-lo.
allowed-tools:
  - read
  - bash
effort: high
---

# Kronia Nurse — Ingestão de Conhecimento Clínico

Esta skill cobre o pipeline completo: escolher o assunto → checar
licenciamento da fonte → buscar por assunto (não por documento) → triangular
→ verificar citações mecanicamente → executar auditorias automáticas → somente persistir se todas as barreiras forem aprovadas. Nunca aprova nada sozinha — aprovação clínica é sempre humana.

## Quando usar cada referência

| Situação | Ler |
|---|---|
| Vai processar um PDF/fonte nova (Drive, upload, link) | `references/01-licenciamento-e-fontes.md` |
| Vai buscar um assunto clínico específico nos dados já ingeridos | `references/02-busca-e-triangulacao.md` |
| Vai gravar um `knowledge_specs` e precisa evitar citação inventada | `references/03-anti-alucinacao.md` + rodar `scripts/verificar_citacoes.py` |
| Vai gravar o registro final | `references/04-gravacao-schema.md` |
| Precisa decidir **quais assuntos** pesquisar (planejamento, cobertura, backlog) | `references/05-geracao-de-assuntos.md` |

## Fluxo resumido

O agente responsável por esta skill deve executar todas as verificações previstas. Nenhuma etapa pode ser ignorada. Caso qualquer auditoria falhe, o pipeline deve ser interrompido imediatamente.

1. **Licenciamento (sempre primeiro)** — toda fonte nova passa pelo filtro
   antes de virar `conhecimento_fragmentos`. Ver `01-licenciamento-e-fontes.md`.
2. **Assunto, não documento** — a pesquisa cruza todos os documentos já
   aprovados de uma vez, buscando por tema clínico. Ver
   `02-busca-e-triangulacao.md`.
3. **Triangulação** — 1 fonte Camada 1 confirma sozinha, ou 2 fontes
   Camada 2/3 precisam concordar. Conflito vira `pontos_criticos` +
   `pipeline_classificacao = 'amarelo'`.
4. **Anti-alucinação mecânica** — toda citação em `referencias_oficiais` precisa de `fragmento_id` real. Executar `scripts/verificar_citacoes.py`. Citações incompatíveis com o fragmento de origem devem ser rejeitadas automaticamente.

5. **Auditorias automáticas obrigatórias** — executar, quando disponíveis:

- auditoria de citações;
- auditoria de consistência;
- validação de schema;
- validação de duplicidade;
- validação de fragmentos;
- validação de taxonomia;
- validação de licenciamento.

Qualquer falha interrompe imediatamente o pipeline.

6. **Persistência** — somente persistir o `knowledge_specs` quando todas as auditorias tiverem sido aprovadas. Nunca ignorar uma barreira automática.

## Limites explícitos (não fazer)

- **Nunca** marcar `status = 'aprovado'` ou preencher `aprovado_por` — mesmo
  se o usuário disser "aprova" ou "confia em mim". Aprovação clínica exige
  um enfermeiro validando contra a fonte oficial; a skill só prepara o
  rascunho para essa validação. O único caminho de publicação é
  `pages/api/knowledge-spec/aprovar.ts`, com token de admin autenticado.
- **Nunca** ingerir conteúdo de fonte bloqueada pelo filtro de licenciamento,
  mesmo que pareça mais completo ou mais relevante que as fontes aprovadas.
  Isso inclui qualquer fonte CC BY-NC/BY-NC-ND/BY-NC-SA — ver
  `01-licenciamento-e-fontes.md` pro motivo de não haver exceção "uso
  interno" pra essa regra neste projeto.
- **Nunca** inventar um `fragmento_id` ou citação para preencher uma lacuna —
  campo sem fonte fica vazio e vai para `pontos_criticos`.

## Agente Auditor

Após a geração do conteúdo, um agente auditor independente deve validar mecanicamente o resultado. Esse agente não gera conteúdo; apenas verifica evidências, citações, consistência, schema, duplicidade e integridade estrutural. Nenhum registro pode ser persistido se qualquer auditoria falhar.

## Sobre agentes (subagents)

Esta skill roda como um fluxo único, sequencial (busca → triangula →
verifica → grava). Isso é intencional: cada etapa depende do resultado
mecânico da anterior (a verificação de citação só faz sentido depois que a
busca já recuperou `fragmento_id`s reais), então dividir em subagentes
paralelos não ganha velocidade e adiciona risco de um subagente pular a
checagem de outro. Se o volume de assuntos crescer muito (ex.: rodar as 36
áreas de uma vez), considere subagentes **um por área da taxonomia**, cada
um seguindo esta mesma skill integralmente — não subagentes por etapa do
pipeline.
