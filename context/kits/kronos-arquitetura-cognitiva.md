# KIT — Arquitetura Cognitiva do KRONOS

> Formato: Cavekit (`ck:cavekit-methodology`) — kit implementation-agnostic, com
> estado atual verificado no código (brownfield) e critério de aceitação
> testável por domínio. Fase: **Draft**. Este kit ainda não vira plano
> (`context/plans/`) nem código até aprovação humana.

## Princípio Fundamental (não negociável)

O KRONOS não é uma IA que "sabe enfermagem" — é um orquestrador de conhecimento
estruturado. Nenhuma camada gera conhecimento clínico por conta própria; todo
conhecimento clínico pré-existe na Base de Conhecimento. Cada engine tem
exatamente uma responsabilidade, sem sobreposição.

Fluxo obrigatório, sem pular etapas:

```
Contexto → Recuperação → Validação → Skills → Workflows → Transformação → Resposta
```

Se qualquer validação falhar: **não responder** — informar que não há
evidência suficiente. Nunca preencher lacuna com conhecimento do modelo.

---

## Domínio 1 — Retrieval Engine

**Responsabilidade única:** localizar Objetos de Conhecimento. Nunca responde
perguntas, nunca interpreta documentos.

**Estado atual:** ✅ existe e roda em produção.
- `lib/embeddings.ts` — embeddings Cohere `embed-multilingual-v3.0` (1024 dims)
- `pages/api/conhecimento/buscar-rag.ts` — busca vetorial por similaridade de cosseno
- `conhecimento_documentos` / `conhecimento_fragmentos` (`supabase/migrations/20260703_conhecimento_rag.sql`) — índice HNSW pgvector
- `scripts/rag-pipeline.js` — ingestão de PDF → chunk → embedding

**Lacunas confirmadas:**
- Só busca vetorial (semântica). Não há busca por metadados/categoria/especialidade combinada na mesma chamada — hoje é threshold único de similaridade.
- `conhecimento_fragmentos` guarda `numero_sequencia` (ordem do chunk), **não** número de página do PDF de origem.
- `pages/api/biblioteca/listar.ts` (ILIKE textual sobre `knowledge_base`) é um segundo caminho de busca, não unificado com o RAG vetorial.

**Critério de aceitação (testável):**
- [ ] Dado um texto de consulta, o endpoint retorna fragmentos ordenados por similaridade, cada um com `documento_id`, `nome_arquivo`, `instituicao`, `numero_sequencia` — sem gerar nenhum texto novo.
- [ ] Existe um campo de página de origem por fragmento (`pagina_inicio`/`pagina_fim` ou equivalente) preenchido na ingestão.
- [ ] Chamar o endpoint sem autenticação retorna 401 (guard já existe — não regredir).
- [ ] Nenhuma função do Retrieval Engine chama `chamarGroq` ou qualquer LLM gerador de texto — só embedding + busca.

---

## Domínio 2 — Knowledge Engine

**Responsabilidade única:** ser o único lugar onde conhecimento clínico
estruturado existe. Tudo tratado como Objeto de Conhecimento, nunca como
documento isolado.

**Estado atual:** ⚠️ existe, mas fragmentado em dois modelos que não se falam.
- `knowledge_base` (+ `lib/knowledge-spec.ts`) — conteúdo redigido, auditado e aprovado (Objeto de Conhecimento de verdade: título, resumo, indicações, contraindicações, procedimento, cuidados...).
- `conhecimento_fragmentos` — chunk de texto bruto de PDF oficial. É exatamente o "documento isolado" que este princípio proíbe tratar como produto final.

**Lacunas confirmadas:**
- Não existe tabela/tipo para Diagnóstico de Enfermagem (NANDA-I), Intervenção (NIC), Resultado (NOC), Medicamento ou Escala Clínica como Objeto de Conhecimento próprio — só existe a categoria genérica `knowledge_base.categoria`.
- Nenhuma relação (`relacionamentos`) entre Objetos de Conhecimento — o `docs/knowledge-center-architecture.md` já pede isso ("Punção Venosa → Cateter Venoso → Soro...") e não está implementado.

**Critério de aceitação (testável):**
- [ ] Todo registro consumido pelo Response Engine tem um schema único de Objeto de Conhecimento (mesmo com `tipo` variando: procedimento, diagnóstico, medicamento, escala) — não dois formatos concorrentes.
- [ ] Um fragmento de RAG bruto nunca é servido diretamente como resposta final sem passar por composição em um Objeto de Conhecimento ou por citação explícita de fonte.

---

## Domínio 3 — Validation Engine

**Responsabilidade única:** barrar respostas sem lastro. Verificar fonte,
referência, página, trecho, vigência, conflito entre documentos e pertinência
ao contexto.

**Estado atual:** ⚠️ existe só na autoria, não em tempo de resposta.
- `lib/knowledge-pipeline.ts` — 4 estágios AI (`auditarOrigem`, `auditarEscopo`, `auditarCoerencia`, `auditarAtualizacao`) rodam quando um item é criado/editado via `knowledge-spec`, gated a admin.

**Lacunas confirmadas:**
- Não roda em tempo real sobre uma resposta que o Retrieval Engine acabou de trazer — só sobre conteúdo já redigido manualmente.
- Não verifica "existe página?" (ver lacuna do Domínio 1).
- Não existe verificação de conflito entre documentos (duas fontes dizendo coisas diferentes sobre o mesmo tópico).

**Critério de aceitação (testável):**
- [ ] Dada uma resposta candidata + os fragmentos que a embasam, uma função determinística (não um LLM "confiando em si mesmo") confirma que cada afirmação tem um fragmento correspondente antes de liberar a resposta.
- [ ] Se nenhum fragmento acima do threshold de similaridade for encontrado, o Validation Engine força a saída "sem evidência suficiente" — testável com mock de busca vazia.

---

## Domínio 4 — Context Engine

**Responsabilidade única:** montar o contexto da solicitação (perfil,
especialidade, ambiente assistencial, histórico, preferências). Nunca
consulta documento.

**Estado atual:** ❌ não existe.
- `lib/auth-server.ts` (`getUsuarioAutenticado`) dá usuário/role, mas nenhum lugar compõe isso em um "contexto de solicitação" reutilizável.
- Não há histórico de conversa persistido (o chat KRONOS foi deletado nesta mesma sessão anterior).

**Critério de aceitação (testável):**
- [ ] Existe uma função pura `montarContexto(usuario, entradaAtual, historico?) → Contexto` que não faz I/O de rede/banco além do necessário para ler perfil — zero chamadas ao Retrieval/Knowledge Engine.

---

## Domínio 5 — Agent Engine + Subagentes

**Responsabilidade única:** coordenar tarefas, nunca armazenar nem interpretar
conhecimento por conta própria — sempre delegam ao Retrieval Engine.

**Estado atual:** ❌ não existe. `pages/kronos.tsx` e `pages/api/kronos/professor.ts` foram deletados na sessão anterior por confundir o usuário sobre o que era "Kronos".

**Tensão a resolver antes de especificar:** este kit pressupõe reintroduzir um
agente ao vivo — a decisão de apagar o KRONOS chat foi para tirar uma
implementação que não seguia este fluxo (respondia por recall do LLM, sem
Retrieval/Validation reais). Reconstruir só faz sentido se o novo agente for
estritamente Retrieval → Validation → Response, nunca "chat que conversa
livremente".

**Critério de aceitação (testável):** *(bloqueado até decisão de escopo — ver Perguntas Abertas)*

---

## Domínio 6 — Workflow Engine

**Responsabilidade única:** orquestrar etapas (Admissão → Avaliação →
Diagnóstico → Planejamento → Intervenção → Registro → Alta). Nunca cria
conhecimento.

**Estado atual:** ❌ não existe como motor genérico. `pages/registrar.tsx` e
`pages/encerramento.tsx` têm fluxo fixo, hardcoded na tela — não é um
workflow parametrizável/reutilizável.

**Critério de aceitação (testável):** *(fora do primeiro recorte — ver Escopo Recomendado)*

---

## Domínio 7 — Skill Engine

**Responsabilidade única:** operações reutilizáveis, sem conhecimento
próprio, sem responder por memória do modelo.

**Estado atual:** ⚠️ parcialmente, informalmente. Funções como
`lib/cover-photo.ts`, `lib/rate-limit.ts` já seguem o contrato "recebe dado →
processa → devolve dado" sem estado/memória — mas não há um registro formal
de "skills" nem contrato de tipo comum.

**Critério de aceitação (testável):** *(fora do primeiro recorte)*

---

## Domínio 8 — Transformer Engine

**Responsabilidade única:** mudar formato, nunca significado.

**Estado atual:** ⚠️ só um caso concreto. `composeConteudoKnowledgeBase`
(`lib/knowledge-spec.ts`) monta o markdown final de um item — é uma
transformação, mas não há generalização pra outros formatos (JSON de API já
existe implicitamente; PDF/DOCX/flashcard/timeline não existem).

**Critério de aceitação (testável):** *(fora do primeiro recorte)*

---

## Domínio 9 — Response Engine

**Responsabilidade única:** montar a resposta final a partir do que os outros
engines produziram. Não interpreta, não cria, não altera evidência.

**Estado atual:** ❌ não existe (não há agente ao vivo hoje).

**Critério de aceitação (testável):** *(bloqueado — depende do Domínio 5)*

---

## Escopo Recomendado (primeiro recorte, "Lightweight Cavekit")

Dado que Retrieval (✅) e Validation (⚠️ parcial) já têm base real, e que
Context/Agent/Response são os únicos necessários pra um MVP de "pergunta →
resposta com fonte citável", o menor recorte que testa a arquitetura ponta a
ponta sem reconstruir tudo de uma vez:

1. **Context Engine mínimo** (Domínio 4) — só perfil + pergunta atual, sem histórico ainda.
2. **Validation Engine em tempo de resposta** (Domínio 3, novo modo) — reaproveitando os auditores existentes ou uma versão determinística mais simples.
3. **Response Engine mínimo** (Domínio 9) — monta resposta = fragmentos citados + aviso quando não há evidência.
4. Agent/Workflow/Skill/Transformer ficam para depois — não bloqueiam o teste do fluxo Contexto → Recuperação → Validação → Resposta.

Isso evita reconstruir o KRONOS chat antigo com a mesma superfície de
confusão — o primeiro recorte nem precisa de UI de chat; pode ser testado via
API/script antes de virar tela.

---

## Perguntas Abertas (bloqueiam Draft → Architect)

1. O Agent Engine (Domínio 5) deve voltar como chat ao vivo, ou o MVP fica só
   em "pergunta pontual → resposta com fonte" sem estado de conversa?
2. Vale a pena adicionar `pagina_inicio`/`pagina_fim` em
   `conhecimento_fragmentos` agora (exigiria reindexar via
   `scripts/rag-pipeline.js`) ou isso fica para quando o Validation Engine em
   tempo de resposta for implementado?
3. Os PDFs novos da pasta do Drive (NANDA-I, Guyton, hemodiálise etc.) entram
   no `PDF_METADATA` do `scripts/rag-pipeline.js` antes ou depois desse
   recorte ser validado?
