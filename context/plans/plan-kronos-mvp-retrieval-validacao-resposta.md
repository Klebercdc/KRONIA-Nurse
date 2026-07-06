# PLANO — MVP KRONOS: Contexto → Recuperação → Validação → Resposta

> Fase Architect (Cavekit). Deriva de:
> - `context/kits/kronos-arquitetura-cognitiva.md` (seção "Escopo Recomendado")
> - `context/kits/knowledge-engine-tipos-objeto.md` (item 4 — NANDA-I, e decisão de rastreabilidade por página)
>
> Stack: Next.js 14 (Pages Router) + TypeScript + Supabase (Postgres/pgvector) + Cohere embeddings.
> Sem UI de chat nesta fase — só API, testável por script/Jest.

## Sequência

1. Migration — rastreabilidade por página em `conhecimento_fragmentos`
2. Migration — schema unificado de Objeto de Conhecimento (`tipo` + `campos_especificos`)
3. `lib/kronos-context.ts` — Context Engine mínimo
4. `lib/kronos-validation.ts` — Validation Engine em tempo de resposta
5. `pages/api/kronos/perguntar.ts` — Response Engine mínimo (orquestra 1→4)
6. Testes Jest

Cada item só começa depois do anterior compilar/passar nos testes — sem paralelizar, pra manter o diff pequeno e revisável.

---

### 1. Migration — página de origem por fragmento

**Arquivo:** `supabase/migrations/20260706_fragmentos_pagina.sql`

- `ALTER TABLE conhecimento_fragmentos ADD COLUMN pagina_inicio INT, ADD COLUMN pagina_fim INT` (nullable — documentos já indexados ficam sem essa informação até reindexar, não quebra a busca existente).
- `buscar_fragmentos_conhecimento` (função RPC) passa a retornar as duas colunas novas.
- **Não aplicar ainda no Supabase real** — só criar o arquivo. Aplicar é ação em banco de produção, fica pra quando o usuário confirmar.

**`scripts/rag-pipeline.js`:** hoje `chunkText` recebe o texto já concatenado de todas as páginas (`prepararTextoDePaginas`), perdendo a fronteira de página. Precisa mudar pra rastrear, por chunk, em qual página do PDF ele começa e termina:
- `prepararTextoDePaginas` já processa página por página — em vez de só concatenar, anotar o texto de cada página com um marcador de posição (offset acumulado) antes de concatenar.
- Depois do `chunkText` gerar os chunks (que hoje só devolve strings), calcular `pagina_inicio`/`pagina_fim` de cada chunk pela posição do seu texto no texto concatenado, usando os offsets de página salvos no passo anterior.
- `CHUNKING_VERSION` sobe (ex.: `chunker-v3`) — isso já invalida o hash de todos os documentos e força reindexação automática na próxima execução (mecanismo já existe, só bump de versão).

**Critério de aceitação:** `chunkText`/função nova retorna, pra cada chunk, um objeto `{ texto, paginaInicio, paginaFim }` — testável com um PDF de poucas páginas onde se sabe manualmente onde cada chunk deveria cair.

---

### 2. Migration — schema unificado de Objeto de Conhecimento

**Arquivo:** `supabase/migrations/20260706_knowledge_tipo.sql`

- `knowledge_specs`: `ADD COLUMN tipo TEXT NOT NULL DEFAULT 'procedimento' CHECK (tipo IN ('procedimento', 'diagnostico_enfermagem'))`, `ADD COLUMN campos_especificos JSONB` (guarda os campos próprios do tipo — ex., pra `diagnostico_enfermagem`: `taxonomia, codigo, dominio, classe, definicao, caracteristicas_definidoras, fatores_relacionados, fatores_de_risco`, conforme item 4 do kit).
- `knowledge_base`: mesma coluna `tipo` (default `'procedimento'`), pra o Retrieval/Response Engine saberem como formatar a citação sem consultar `knowledge_specs`.
- Registros existentes continuam com `tipo = 'procedimento'` e `campos_especificos = NULL` — zero impacto no fluxo atual de Procedimentos/Protocolos/POPs.
- CHECK constraint só permite `'diagnostico_enfermagem'` por ora (não os outros 5 tipos ainda não especificados) — evita dado inconsistente entrar antes do schema de Medicamentos/Escalas/etc. existir.

**Critério de aceitação:** inserir um registro com `tipo = 'procedimento'` sem tocar `campos_especificos` continua funcionando exatamente como hoje (regressão zero); inserir com `tipo = 'diagnostico_enfermagem'` sem os campos exigidos em `campos_especificos` falha na validação da aplicação (não no banco — JSONB não valida schema).

---

### 3. Context Engine mínimo

**Arquivo:** `lib/kronos-context.ts`

```
type ContextoKronos = {
  usuario: { id: string; nome: string };
  pergunta: string;
};

function montarContexto(usuario: UsuarioAutenticado, pergunta: string): ContextoKronos
```

Função pura, síncrona, sem chamadas de rede — só reorganiza o que já foi obtido por `getUsuarioAutenticado`. Sem histórico de conversa (decisão já registrada no kit). Sem especialidade do usuário (não existe esse dado no perfil hoje — não inventar campo que não existe).

**Critério de aceitação:** dado um usuário e uma pergunta, devolve o objeto sem tocar Supabase/rede — testável sem mocks.

---

### 4. Validation Engine em tempo de resposta

**Arquivo:** `lib/kronos-validation.ts`

```
type ResultadoValidacao =
  | { valido: true; fragmentosValidos: FragmentoEncontrado[] }
  | { valido: false; motivo: string };

function validarFragmentos(fragmentos: FragmentoEncontrado[], limiar = 0.5): ResultadoValidacao
```

Determinística — sem chamar LLM. Regras (derivadas do princípio "não responder sem evidência" do kit de arquitetura):
- Lista vazia → `valido: false`.
- Todo fragmento abaixo do `limiar` de similaridade é descartado antes de contar (defesa em profundidade — `buscar-rag.ts` já filtra por threshold no SQL, mas o Validation Engine não deve confiar cegamente no chamador).
- Fragmentos sem `pagina_inicio` (documentos antigos, antes da migration 1) não bloqueiam a resposta, mas isso é sinalizado no resultado pra o Response Engine decidir se cita página ou só o nome do documento.

**Critério de aceitação:** com fragmentos mockados acima/abaixo do limiar, a função classifica corretamente; lista vazia sempre retorna `valido: false`.

---

### 5. Response Engine mínimo + endpoint

**Arquivo:** `pages/api/kronos/perguntar.ts`

Fluxo do handler:
1. `getUsuarioAutenticado` (401 se ausente) + `dentroDoRateLimit` (reaproveitar `LIMITE_PROFESSOR` de `lib/rate-limit.ts`, mesmo limite do `buscar-rag` atual).
2. `montarContexto` (Context Engine).
3. `gerarEmbedding` + RPC `buscar_fragmentos_conhecimento` (Retrieval Engine — mesmo caminho de `buscar-rag.ts`; não duplicar lógica, extrair função compartilhada se necessário).
4. `validarFragmentos` (Validation Engine).
5. Response Engine: se `valido: false` → `200 { resposta: null, motivo: '...' }` (nunca 4xx/5xx pra "sem evidência" — não é erro, é o comportamento correto). Se `valido: true` → devolve os fragmentos citáveis (documento, instituição, página quando disponível, trecho) **sem gerar nenhum texto novo** — nesta primeira fatia o "Response Engine" só monta uma lista de evidências, não sintetiza uma resposta em prosa. Síntese em prosa fica para uma fatia seguinte, quando o Validation Engine tiver como auditar texto gerado.

**Critério de aceitação:**
- Pergunta sem fragmento acima do limiar → resposta 200 com aviso de evidência insuficiente, nunca inventa conteúdo.
- Pergunta com fragmentos válidos → resposta 200 com lista de trechos citáveis, cada um rastreável até documento (+ página, quando existir).
- Sem token de auth → 401. Acima do rate limit → 429.

---

### 6. Testes Jest

- `lib/__tests__/kronos-context.test.ts` — `montarContexto` sem mocks.
- `lib/__tests__/kronos-validation.test.ts` — `validarFragmentos` com fixtures acima/abaixo do limiar, lista vazia, fragmento sem página.
- Endpoint: teste de integração leve mockando `getSupabase`/`gerarEmbedding` (seguir o padrão já usado, se houver, em testes de outras rotas — verificar antes de inventar um padrão novo).

---

## Fora deste plano (fica para depois)

- UI de chat (Agent/Response Engine com síntese em prosa) — só depois que este recorte estiver validado em produção.
- Reindexação de fato dos PDFs (rodar `scripts/rag-pipeline.js` sobre os PDFs da pasta do Drive) — exige `SUPABASE_SERVICE_ROLE_KEY` e `COHERE_API_KEY` locais, é ação do usuário, não deste agente neste ambiente.
- Aplicar as migrations no Supabase real — arquivo fica pronto, aplicação é ação separada que exige confirmação (mexe em banco de produção).
- Os outros 13 tipos de Objeto de Conhecimento do kit de tipos — só NANDA-I entra no schema `campos_especificos` por ora.
