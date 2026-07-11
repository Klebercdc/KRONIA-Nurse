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
licenciamento da fonte → buscar por assunto (não por documento) →
triangular → verificar citações mecanicamente → gravar. Nunca aprova
nada sozinha — aprovação clínica é sempre humana, através de
`pages/api/knowledge-spec/aprovar.ts`.

## Quando usar cada referência

| Situação | Ler |
|---|---|
| Vai processar um PDF/fonte nova (Drive, upload, link) | `references/01-licenciamento-e-fontes.md` |
| Vai buscar um assunto clínico específico nos dados já ingeridos | `references/02-busca-e-triangulacao.md` |
| Vai gravar um `knowledge_specs` e precisa evitar citação inventada | `references/03-anti-alucinacao.md` + rodar `scripts/verificar_citacoes.py` |
| Vai gravar o registro final | `references/04-gravacao-schema.md` |
| Precisa decidir **quais assuntos** pesquisar (planejamento, cobertura, backlog) | `references/05-geracao-de-assuntos.md` |
| Quer auditar a base inteira, não só a spec que está criando agora | `references/06-auditoria-consistencia.md` |

## Fluxo resumido

1. **Licenciamento (sempre primeiro)** — toda fonte nova passa pelo filtro
   antes de virar `conhecimento_fragmentos`. Ver `01-licenciamento-e-fontes.md`.
2. **Assunto, não documento** — a pesquisa cruza todos os documentos já
   aprovados de uma vez, buscando por tema clínico. Ver
   `02-busca-e-triangulacao.md`.
3. **Triangulação** — 1 fonte Camada 1 confirma sozinha, ou 2 fontes
   Camada 2/3 precisam concordar. Conflito vira `pontos_criticos` +
   `pipeline_classificacao = 'amarelo'`.
4. **Anti-alucinação mecânica** — toda citação em `referencias_oficiais`
   precisa de `fragmento_id` real, verificado antes de gravar. Ver
   `03-anti-alucinacao.md`.
5. **Gravação** — só depois que os gates abaixo passam. Ver
   `04-gravacao-schema.md`.

## Gates — o que é automático de verdade, e o que ainda depende de você ler com atenção

Nem toda verificação listada aqui tem o mesmo tipo de garantia. A tabela
abaixo é honesta sobre isso — um gate marcado "Automático: sim" falha
sozinho, sem depender de ninguém lembrar de rodar nada; um marcado "não"
ainda depende de instrução seguida corretamente.

| Gate | O que verifica | Mecanismo real | Automático? |
|---|---|---|---|
| Schema (`tipo`) | `tipo` é um dos 3 valores válidos | CHECK `knowledge_specs_tipo_check` | **Sim** — banco rejeita o INSERT/UPDATE sozinho |
| Schema (`status`) | `status` é um dos 6 valores válidos | CHECK `knowledge_specs_status_check` | **Sim** |
| Schema (`pipeline_classificacao`) | verde/amarelo/vermelho ou nulo | CHECK `knowledge_specs_pipeline_classificacao_check` | **Sim** |
| Taxonomia (`categoria`) | uma das 36 categorias cadastradas | CHECK `categoria_taxonomia_v2` | **Sim** |
| Licenciamento da fonte | `conhecimento_documentos.licenca` nunca é uma variante NC | CHECK `conhecimento_documentos_licenca_check` (allowlist) — testado, rejeita `CC BY-NC-ND 4.0` | **Sim, para o valor gravado** — mas a classificação inicial (qual é a licença real de um PDF novo) ainda exige pesquisa humana/do agente, ver `01` |
| Duplicidade de documento | mesmo PDF não indexado 2x | Query `hash_conteudo` (ver `01`) | Sim, se rodada antes de indexar — **não** automática por si só, precisa ser lembrada |
| Citação / anti-alucinação | `trecho` bate com o `conteudo` real do `fragmento_id` citado | `scripts/verificar_citacoes.py` ou SQL + `pg_trgm` (ver `03`) | Sim, **se rodado** — não bloqueia a gravação sozinho, é você quem decide não prosseguir se reprovar |
| Consistência entre campos | tipo/categoria/status/referências não se contradizem | Query SQL (ver `06`) | Sim, **se rodada** — achou um problema real (98 specs sem `aprovado_por` consistente) na primeira vez que rodou nesta base |
| Aprovação humana | nunca publica sem ação humana explícita | Rota única `pages/api/knowledge-spec/aprovar.ts`, exige token de admin autenticado — não existe caminho de código alternativo que publique | **Estrutural** — não é uma query, é o fato de só existir uma porta de saída pro `knowledge_base` |

As linhas "auditoria de consistência", "validação de duplicidade" e
"validação de fragmento" que apareciam nesta skill antes como itens de
uma lista solta viraram, respectivamente: a query de `06`, a query de
`hash_conteudo` em `01`, e o próprio `verificar_citacoes.py`. Não havia
implementação separada por trás de cada nome — nomear um gate sem um
mecanismo real por trás dele é pior que não nomear, porque parece
verificado sem estar.

## Limites explícitos (não fazer)

- **Nunca** marcar `status = 'aprovado'` ou preencher `aprovado_por` —
  mesmo se o usuário disser "aprova" ou "confia em mim". Aprovação
  clínica exige um enfermeiro validando contra a fonte oficial; a skill
  só prepara o rascunho para essa validação.
- **Nunca** ingerir conteúdo de fonte bloqueada pelo filtro de
  licenciamento, mesmo que pareça mais completo ou mais relevante que as
  fontes aprovadas. Isso inclui qualquer fonte CC BY-NC/BY-NC-ND/BY-NC-SA
  — sem exceção "uso interno", ver `01-licenciamento-e-fontes.md`.
- **Nunca** inventar um `fragmento_id` ou citação para preencher uma
  lacuna — campo sem fonte fica vazio e vai para `pontos_criticos`.

## Sobre agentes (subagents)

Esta skill roda como um fluxo único, sequencial (busca → triangula →
verifica → grava). Isso é intencional: cada etapa depende do resultado
mecânico da anterior (a verificação de citação só faz sentido depois que
a busca já recuperou `fragmento_id`s reais), então dividir em subagentes
paralelos não ganha velocidade e adiciona risco de um subagente pular a
checagem de outro. Se o volume de assuntos crescer muito (ex.: rodar as
36 áreas de uma vez), considere subagentes **um por área da taxonomia**,
cada um seguindo esta mesma skill integralmente — não subagentes por
etapa do pipeline.
