# Busca por Assunto + Triangulação

## Por que por assunto, não por documento

Processar PDF por PDF gera cobertura desigual (um documento grande domina o
registro) e perde o cruzamento entre fontes diferentes sobre o mesmo tema.
Buscar por assunto força a olhar todos os documentos aprovados de uma vez.

## Busca

```sql
select f.id as fragmento_id, f.documento_id, f.numero_sequencia,
       f.conteudo, f.pagina_inicio, f.pagina_fim,
       d.nome_arquivo, d.instituicao, d.tipo_documento, d.ano_publicacao
from conhecimento_fragmentos f
join conhecimento_documentos d on d.id = f.documento_id
where d.ativo = true
  and (f.conteudo ilike '%{{PALAVRA_CHAVE_1}}%'
   or  f.conteudo ilike '%{{PALAVRA_CHAVE_2}}%'
   or  f.conteudo ilike '%{{SINONIMO_CLINICO}}%')
order by d.instituicao, f.numero_sequencia;
```

`d.ativo = true` garante que documentos bloqueados/desativados nunca entram
na busca — reforça o filtro de licenciamento na própria query.

Se `embedding` estiver populado, complemente com busca semântica (pgvector
`<=>`), mas trate resultado semântico como candidato — sempre passa pela
verificação de citação do arquivo `03-anti-alucinacao.md` antes de virar
referência.

Classifique cada `documento_id` retornado na camada certa via
`instituicao`/`tipo_documento`.

## Triangulação obrigatória

Para cada afirmação técnica que for entrar no `knowledge_specs`:

- 1 fonte Camada 1 confirmando, **ou**
- 2 fontes Camada 2/3 concordando entre si.

Se as fontes discordarem, não escolha uma arbitrariamente: registre o
conflito em `pontos_criticos` e marque `pipeline_classificacao = 'amarelo'`.

Se só existir 1 fonte Camada 2/3 sem nenhuma Camada 1 nem uma segunda fonte
concordando, a afirmação **não tem triangulação suficiente** — vai para
`pontos_criticos` como "requer segunda fonte", não entra no corpo principal
do registro.
