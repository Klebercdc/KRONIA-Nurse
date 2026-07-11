---
name: kronia-nurse-knowledge-spec-search
description: Metodologia obrigatória para buscar conteúdo em conhecimento_documentos/conhecimento_fragmentos e criar/atualizar registros em knowledge_specs. Busca por ASSUNTO CLÍNICO (nunca por PDF isolado), hierarquia de fontes (COFEN/COREN/ANVISA > manuais institucionais > manuais acadêmicos), triangulação obrigatória, e verificação mecânica anti-alucinação (fragmento_id real + trecho literal) antes de gravar. Use sempre que for criar ou enriquecer um knowledge_spec a partir do corpus RAG indexado.
allowed-tools:
  - read
  - bash
effort: high
---

# KRONIA Nurse — Busca por Assunto + Anti-Alucinação (knowledge_specs)

## Por que existe

Método definido pelo usuário nesta sessão pra padronizar toda criação/
atualização de `knowledge_specs`. Substitui o padrão anterior de "abrir um
PDF e extrair" por busca cruzada por assunto clínico, com verificação
mecânica (não só instrução) de que toda citação é real.

## Passo 1 — Busca por assunto, não por documento

Nunca itere `conhecimento_documentos` um de cada vez. Cruze **todos** de
uma vez, por palavra-chave/sinônimo do assunto:

```sql
select f.id as fragmento_id, f.documento_id, f.numero_sequencia,
       f.conteudo, f.pagina_inicio, f.pagina_fim,
       d.nome_arquivo, d.instituicao, d.tipo_documento, d.ano_publicacao
from conhecimento_fragmentos f
join conhecimento_documentos d on d.id = f.documento_id
where f.conteudo ilike '%PALAVRA_CHAVE_1%'
   or f.conteudo ilike '%PALAVRA_CHAVE_2%'
   or f.conteudo ilike '%SINONIMO_CLINICO%'
order by d.instituicao, f.numero_sequencia;
```

Se `embedding` estiver populado, complemente com busca semântica via
pgvector (`<=>`) — trate resultado semântico como candidato, nunca como
citação pronta (vai pro Passo 3 do mesmo jeito).

Classifique cada `documento_id` retornado na camada correta usando
`instituicao`/`tipo_documento` (ver Hierarquia abaixo). Antes de decidir
que um assunto "não tem fonte", rode a busca — não presuma pela lista de
`conhecimento_documentos` de cabeça; nomes de arquivo enganam (ex.:
`Guia-de-Recomendações-CTLN-Versão-Web.pdf` da COFEN é sobre registros de
enfermagem, não sobre "CTLN" nenhuma sigla clínica óbvia).

## Hierarquia de fontes (não negociável)

- **Camada 1** = COFEN / COREN / ANVISA / Ministério da Saúde → pode virar
  conteúdo ingerível direto, citação literal permitida.
- **Camada 2** = manuais institucionais recentes (POPs de hospitais/
  secretarias) → referência de apoio, ainda citável, mas triangular com
  Camada 1 quando possível.
- **Camada 3** = manuais acadêmicos antigos / literatura secundária →
  só triangulação, nunca fonte única de uma afirmação central.
- **Fora da hierarquia — cuidado especial**: taxonomias/manuais
  proprietários indexados no corpus só para fins de retrieval interno
  (ex.: `NANDA-I-2018_2020.pdf`, 864 fragmentos indexados) **não devem
  ser citados literalmente** em `referencias_oficiais`/conteúdo público —
  mesma regra já aplicada nesta sessão a fontes CC BY-NC: usar a
  estrutura pra confirmar que a busca bateu, mas citar uma fonte
  secundária compatível (ex. SciELO, Núcleo do Conhecimento) que fala o
  mesmo conteúdo com licença aberta. Ver Trigésima oitava rodada em
  `docs/knowledge-base-reconstrucao-status.md` pro precedente (specs
  NANDA/NIC/NOC de Hemodiálise).

## Passo 2 — Triangulação obrigatória

Para **cada afirmação técnica** que entrar no `knowledge_specs`, exija:

- 1 fonte Camada 1 confirmando, **ou**
- 2 fontes Camada 2/3 concordando entre si.

Se as fontes discordarem, não escolha uma arbitrariamente: registre o
conflito em `pontos_criticos` e marque `pipeline_classificacao =
'amarelo'`.

## Passo 3 — Regra anti-alucinação (mecânica)

Toda entrada em `referencias_oficiais` (jsonb) que vier do corpus RAG
segue este formato (`fragmento_id` é campo real de
`lib/knowledge-spec.ts` → `ReferenciaOficial.fragmento_id`):

```json
{
  "instituicao": "<instituicao>",
  "documento": "<nome_arquivo>",
  "fragmento_id": "<uuid real de conhecimento_fragmentos.id>",
  "pagina": "<pagina_inicio>",
  "trecho": "<cópia literal do conteudo, não paráfrase>"
}
```

Regras:
- **Nunca** gere uma referência com `fragmento_id` que você não recuperou
  de verdade no Passo 1 — não invente uuid.
- Se uma afirmação parecer "óbvia" pela sua própria memória mas você não
  achou fragmento que a sustente, **não escreva a afirmação**. Deixe o
  campo vazio e liste em `pontos_criticos` como `"requer fonte:
  <afirmação>"`.
- `trecho` tem que ser cópia literal (pro Passo 4 conseguir verificar),
  nunca resumo.
- Referências de fontes **externas** ao corpus indexado (busca web, como
  a maioria das specs desta sessão) não têm `fragmento_id` — ficam sem
  esse campo, mas ainda precisam de `url`/`documento`/`instituicao` reais
  e, quando possível, `trecho` literal do texto encontrado.

## Passo 4 — Auto-verificação obrigatória antes de gravar

Duas formas equivalentes, use a que estiver disponível:

**A) Script portátil** (`scripts/verificar_citacoes.py`) — roda fora
deste sandbox, onde `DATABASE_URL` (connection string do Postgres do
projeto Supabase) está configurada:

```bash
python scripts/verificar_citacoes.py --rascunho rascunho_ASSUNTO.json
```

Confere, pra cada `fragmento_id` citado, se `trecho`/`trecho_citado` é
substring OU ≥90% similar (`difflib.SequenceMatcher`) ao `conteudo` real
daquela linha. Sem `DATABASE_URL` o script recusa rodar (sem fallback
silencioso) — não existe "verificação offline".

**B) Equivalente via SQL direto** (o que este agente usa em sessão, via
Supabase MCP, quando não há `DATABASE_URL` local disponível — este
sandbox não tem `SUPABASE_SERVICE_ROLE_KEY`/`DATABASE_URL` configurada):

```sql
select f.id as fragmento_id,
       position('TRECHO_CITADO_AQUI' in f.conteudo) > 0 as eh_substring,
       similarity('TRECHO_CITADO_AQUI', f.conteudo) as similaridade
from conhecimento_fragmentos f
where f.id = 'FRAGMENTO_ID_AQUI'::uuid;
```

(`similarity()` vem da extensão `pg_trgm`, habilitada no projeto —
migration `enable_pg_trgm`.) Rode uma consulta dessas pra cada
`fragmento_id` citado antes de gravar. `eh_substring = true` ou
`similaridade >= 0.90` aprova a citação.

Qualquer citação que falhar:
- é removida do registro,
- a afirmação correspondente é apagada do `knowledge_specs` ou marcada
  como `"não confirmado"`,
- se a citação removida era a única base de uma afirmação central,
  `pipeline_classificacao` cai pra `'vermelho'`.

Não prossiga pro Passo 5 se a verificação reportar reprovação em algo
que sustenta uma afirmação central.

## Passo 5 — Gravação

- `status` = `'rascunho'` (nunca `'aprovado'` — só
  `pages/api/knowledge-spec/aprovar.ts`, com ação humana explícita,
  publica em `knowledge_base`; ver Constitution §APROVAÇÃO HUMANA).
- Antes de gravar, releia o rascunho inteiro procurando: coerência,
  redundância, conflito entre seções, omissão, erro conceitual,
  terminologia, formatação. Corrija o que achar antes de persistir —
  não grave uma segunda versão pra corrigir a primeira.
- `categoria` = uma das 36 já cadastradas no CHECK constraint da tabela
  (`pg_get_constraintdef` em `knowledge_specs_categoria_check` pra
  conferir a lista exata — muda ao longo do tempo).
- Preencha os campos do schema (ver `lib/knowledge-spec.ts` →
  `KnowledgeSpec`) só onde houver fonte confirmada — campo vazio é
  preferível a campo inventado.
- `pipeline_resultado` (jsonb) registra o resumo do Passo 4: quantos
  fragmentos únicos usados, quantas citações passaram vs. foram
  descartadas e por quê — pra revisão humana não ter que reconstruir o
  processo do zero.

## Saída esperada ao final de cada rodada

1. Quantos fragmentos únicos foram usados (Passo 1).
2. Quantas citações passaram na auto-verificação vs. quantas foram
   descartadas (Passo 4), e por quê.
3. `pipeline_classificacao` final e a justificativa.
4. Lista de `pontos_criticos` pendentes de validação humana.
5. Confirmação via SQL direto no Supabase de que o registro gravado
   bate com o que foi reportado (não confiar só na memória da sessão —
   reconsultar a tabela).
