# Anti-Alucinação Mecânica

Prompt sozinho reduz alucinação, não zera. O que zera é uma checagem mecânica
depois — este arquivo cobre as duas camadas.

## Regra de formato (instrução ao modelo)

Toda entrada em `referencias_oficiais` (jsonb) segue o formato de
`ReferenciaOficial` em `lib/knowledge-spec.ts` — use exatamente estes nomes
de campo, não sinônimos (`trecho`, não `trecho_citado`; o código que lê
`referencias_oficiais` depois de aprovado espera esses nomes):

```json
{
  "instituicao": "<instituicao>",
  "documento": "<nome_arquivo>",
  "fragmento_id": "<uuid real de conhecimento_fragmentos.id>",
  "pagina": "<pagina_inicio, como string — pode ser \"Art. 5\" pra normas>",
  "trecho": "<cópia literal do conteudo, não paráfrase>"
}
```

- **Nunca** gere uma referência sem `fragmento_id` real recuperado na busca.
- Se uma afirmação parecer "óbvia" pela sua própria memória, mas você não
  achou fragmento que a sustente: **não escreva a afirmação**. Deixe o campo
  vazio e liste em `pontos_criticos` como `"requer fonte: <afirmação>"`.
- `trecho` precisa ser cópia literal (a verificação mecânica abaixo depende
  disso), nunca resumo.
- Referências de fontes **externas** ao corpus indexado (busca web) não têm
  `fragmento_id` — tudo bem, mas nesse caso a verificação mecânica abaixo
  não se aplica a elas; documente a URL real em `url` e trate como evidência
  mais fraca que uma citação com `fragmento_id`.

## Verificação mecânica (não pular, mesmo com pressa)

Duas formas equivalentes — use a que estiver disponível no ambiente:

**A) Script portátil** (`scripts/verificar_citacoes.py`, dentro desta
skill), quando há acesso a `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (mesmas
variáveis usadas por `scripts/rag-pipeline.js` no projeto):

```bash
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
python scripts/verificar_citacoes.py --rascunho rascunho_{{ASSUNTO_SLUG}}.json
```

O script confere, para cada `fragmento_id` citado, se `trecho` é substring
(normalizada — ignora acento/caixa) ou ≥90% de similaridade do `conteudo`
real daquela linha no Supabase. Salva um `.verificado.json` já com as
citações reprovadas removidas e uma nota em `pontos_criticos`.

**B) Equivalente via SQL direto** — quando não há as variáveis de ambiente
acima disponíveis no sandbox (ex.: sessão via MCP do Supabase, sem
credenciais locais). Requer a extensão `pg_trgm` (migration
`20260712_enable_pg_trgm`):

```sql
select position('TRECHO_AQUI' in f.conteudo) > 0 as eh_substring,
       similarity('TRECHO_AQUI', f.conteudo) as similaridade
from conhecimento_fragmentos f
where f.id = 'FRAGMENTO_ID_AQUI'::uuid;
```

Rode uma consulta dessas por citação antes de gravar. `eh_substring = true`
ou `similaridade >= 0.90` aprova.

Qualquer citação que falhar em qualquer um dos dois métodos:

- é removida do registro,
- a afirmação correspondente é apagada do rascunho ou marcada
  `"não confirmado"`,
- se era a única base de uma afirmação central, `pipeline_classificacao`
  cai para `'vermelho'`.

Não prossiga para a gravação (`04-gravacao-schema.md`) se a verificação
reportar reprovação total. Se reportar aprovação parcial, revise as
citações reprovadas antes de decidir se o registro ainda é útil como
rascunho amarelo.
