# Prompt Master — Auditoria de Consistência

Auditoria de integridade contra a base inteira — `knowledge_specs`,
`knowledge_base` e `conhecimento_documentos` — não contra uma spec
específica sendo criada agora. Rode periodicamente, e sempre depois de
qualquer migration ou correção em massa (foi assim que os achados
abaixo apareceram: rodando pela primeira vez depois da migration de
`licenca`).

## Como usar este prompt

Copie a seção "Execução" inteira numa sessão que tenha acesso ao
Supabase MCP (`execute_sql`) do projeto `uguxeoftfnljrxhwvdkj`. Rode as
queries na ordem. Não pule a checagem de `deleted_at is null` em nenhuma
delas — a primeira vez que esta auditoria rodou, uma das queries
esqueceu esse filtro e gerou um falso positivo de 5 registros (specs
arquivadas cujo `knowledge_base` correspondente já estava corretamente
soft-deleted no mesmo timestamp — não é bug, é o app removendo conteúdo
velho quando a spec é arquivada; a falha foi da query, não do dado).

## Regras de execução

1. **Reportar, não corrigir automaticamente**, qualquer achado que
   envolva: (a) reverter/recriar aprovações em massa, (b) apagar ou
   despublicar conteúdo já vivo no app, (c) qualquer coisa que exija
   saber a história/intenção de quem gerou o dado antes desta sessão.
   Esses achados são decisão do usuário — a auditoria existe pra dar
   visibilidade, não pra agir sozinha.
2. **Corrigir imediatamente**, sem precisar perguntar, achados que são
   claramente bugs mecânicos e reversíveis: citação com `fragmento_id`
   inexistente, `tipo`/`campos_especificos` desalinhado por erro de
   template, referência a fonte já confirmada como bloqueada por
   licença ainda viva em conteúdo publicado (mesmo padrão da correção
   Atena/UFCSPA — ver `01-licenciamento-e-fontes.md`).
3. Toda query abaixo foi testada contra a base real nesta sessão — não
   são exemplos teóricos.

## Execução

### 1. `knowledge_specs` — consistência entre campos

```sql
select violacao, count(*) as n from (
  select id, 'tipo!=procedimento sem campos_especificos.definicao' as violacao
  from knowledge_specs
  where tipo <> 'procedimento' and (campos_especificos is null or campos_especificos->>'definicao' is null)

  union all
  select id, 'status=aprovado sem aprovado_por/knowledge_base_id' as violacao
  from knowledge_specs
  where status = 'aprovado' and (aprovado_por is null or knowledge_base_id is null)

  union all
  select id, 'pipeline_classificacao=verde sem nenhuma referencia' as violacao
  from knowledge_specs
  where pipeline_classificacao = 'verde' and (referencias_oficiais is null or jsonb_array_length(referencias_oficiais) = 0)

  union all
  select ks.id, 'referencia cita fragmento_id inexistente' as violacao
  from knowledge_specs ks
  cross join lateral jsonb_array_elements(coalesce(ks.referencias_oficiais,'[]'::jsonb)) r
  where r->>'fragmento_id' is not null
    and not exists (select 1 from conhecimento_fragmentos f where f.id = (r->>'fragmento_id')::uuid)

  union all
  select id, 'categoria diagnostico/resultado com tipo desalinhado' as violacao
  from knowledge_specs
  where (categoria = 'Diagnósticos de Enfermagem' and tipo <> 'diagnostico_enfermagem')
     or (categoria = 'Resultados de Enfermagem' and tipo <> 'resultado_enfermagem')
) x
group by violacao
order by n desc;
```

**`status=aprovado sem aprovado_por/knowledge_base_id`** — regra 1
(reportar, não corrigir). Se aparecer, rode também isto pra caracterizar
o padrão (timestamps idênticos = UPDATE em lote, não aprovação humana
individual):

```sql
select aprovado_em, count(*) from knowledge_specs
where status = 'aprovado' and aprovado_por is not null
group by aprovado_em
order by count(*) desc;
```

### 2. `knowledge_base` — integridade do conteúdo publicado

```sql
select violacao, count(*) as n from (
  select kb.id, 'spec_id aponta pra knowledge_spec inexistente' as violacao
  from knowledge_base kb
  where kb.deleted_at is null and kb.spec_id is not null
    and not exists (select 1 from knowledge_specs ks where ks.id = kb.spec_id)

  union all
  select kb.id, 'publicado (nao deletado) mas spec de origem nao esta aprovado' as violacao
  from knowledge_base kb
  join knowledge_specs ks on ks.id = kb.spec_id
  where kb.deleted_at is null and ks.status <> 'aprovado'

  union all
  select id, 'titulo ou categoria vazio' as violacao
  from knowledge_base
  where deleted_at is null and (titulo is null or trim(titulo) = '' or categoria is null or trim(categoria) = '')

  union all
  select id, 'titulo duplicado (nao deletado)' as violacao
  from knowledge_base kb
  where deleted_at is null
    and exists (select 1 from knowledge_base kb2 where kb2.titulo = kb.titulo and kb2.id <> kb.id and kb2.deleted_at is null)

  union all
  select id, 'referencias ainda cita fonte bloqueada' as violacao
  from knowledge_base
  where deleted_at is null and (
    referencias ilike '%atena%' or referencias ilike '%ufcspa%' or referencias ilike '%z-library%'
    or referencias ilike '%zlibrary%' or conteudo ilike '%atena editora%'
  )

  union all
  select id, 'embedding nulo' as violacao
  from knowledge_base
  where deleted_at is null and embedding is null

  union all
  select id, 'tipo!=procedimento sem campos_especificos.definicao' as violacao
  from knowledge_base
  where deleted_at is null and tipo <> 'procedimento' and (campos_especificos is null or campos_especificos->>'definicao' is null)
) x
group by violacao
order by n desc;
```

Atualize a lista de instituições/fontes na checagem "referencias ainda
cita fonte bloqueada" toda vez que uma nova fonte for excluída por
licença (ver `01-licenciamento-e-fontes.md`) — ela precisa acompanhar a
lista de achados de `kronia-nurse-document-ingestion`, senão fica
desatualizada do mesmo jeito que a lista de licenciamento antiga ficou.

**`embedding nulo`** — achado real em 2026-07-11: 98/98 linhas vivas. A
migration fundadora `20260630_schema_completo.sql` cria um índice
`ivfflat` pra essa coluna e documenta em comentário: *"knowledge_base:
todo conteúdo aqui foi aprovado por humano e tem embedding"* —
invariante de schema violado em 100% dos casos. `pages/api/knowledge-
spec/aprovar.ts` gera esse embedding em toda aprovação real — regra 1
(reportar): é o terceiro sinal independente (junto com
`knowledge_base_id` e `aprovado_por`) de que o conteúdo atual não
passou pela rota real de aprovação. Confirmado que isso **não afeta o
KRONOS hoje** — a busca semântica do KRONOS (`lib/knowledge-
retrieval.ts`) lê `conhecimento_fragmentos`, não `knowledge_base`.

### 3. `conhecimento_documentos` — integridade da fonte

```sql
select violacao, count(*) as n from (
  select d.id, 'hash_conteudo duplicado entre docs ativos' as violacao
  from conhecimento_documentos d
  where d.ativo = true
    and exists (select 1 from conhecimento_documentos d2 where d2.hash_conteudo = d.hash_conteudo and d2.id <> d.id and d2.ativo = true)

  union all
  select d.id, 'ativo=true mas 0 fragmentos' as violacao
  from conhecimento_documentos d
  where d.ativo = true
    and not exists (select 1 from conhecimento_fragmentos f where f.documento_id = d.id)

  union all
  select d.id, 'licenca fora da allowlist (nao deveria existir)' as violacao
  from conhecimento_documentos d
  where d.licenca is not null and d.licenca not in (
    'CC BY 4.0','CC BY-SA 4.0','CC0 1.0','Domínio Público','Governamental sem restrição','Institucional sem restrição'
  )

  union all
  select d.id, 'nome bate com excluido_licenca do PDF_METADATA mas esta ativo no banco' as violacao
  from conhecimento_documentos d
  where d.ativo = true and d.nome_arquivo in (
    -- manter esta lista sincronizada com todo PDF_METADATA[...].excluido_licenca === true
    -- em scripts/rag-pipeline.js (grep -B12 "excluido_licenca: true" pra atualizar)
    'Manual-de-Cuidados-de-Enfermagem-em-Procedimentos-de-Intensivismo.pdf',
    'guia-breve-para-implantacao-de-servico-ambulatorial-de-enfermagem-em-estomaterapia.pdf',
    'temas-em-enfermagem-em-estomaterapia-cuidado-ensino-e-trabalho.pdf'
  )
) x
group by violacao
order by n desc;

-- Complementar: cobertura de classificação de licença (não é violação, é debito conhecido)
select count(*) as total_docs, count(licenca) as com_licenca_classificada,
       count(*) filter (where licenca is null) as sem_classificacao
from conhecimento_documentos;
```

## Formato de saída esperado

Pra cada tabela, reporte: quantas regras deram zero (limpo) vs. quantas
acusaram algo, com contagem. Para cada achado não-zero: aplicar Regra 1
ou Regra 2 acima, e dizer explicitamente qual das duas está sendo
aplicada e por quê. Nunca silenciar um achado só porque não há correção
óbvia — reportar sem solução também é resultado válido desta auditoria.
