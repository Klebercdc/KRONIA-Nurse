# AUDITORIA TÉCNICA — KRONIA NURSE

> Auditoria somente-leitura realizada em 2026-07-02. Escopo congelado: nenhuma sugestão envolve nova funcionalidade, tela, módulo ou arquitetura.
> Severidades: CRÍTICA / ALTA / MÉDIA / BAIXA. Esforço: P (pequeno) / M (médio) / G (grande).

## Diagnóstico geral

Produto pequeno (~11k linhas) e conceitualmente maduro: a separação "IA extrai, código calcula risco" é exemplar, os prompts são os melhores artefatos do repo, o design system de tokens é disciplinado e o dado de paciente nunca toca o servidor (localStorage efêmero). A dívida não está no desenho, está na execução desigual: controles de segurança adicionados recentemente cobriram parte das rotas e esqueceram o resto, e o banco confia 100% na camada de aplicação porque metade das tabelas não tem RLS.

Os 3 problemas mais graves:
1. **Chaves reais (service_role, Groq) recuperáveis no histórico do git** (6.1) — o incidente de credenciais não terminou enquanto as chaves não forem rotacionadas e o histórico limpo.
2. **`knowledge_base` (fonte canônica do KRONOS) sem RLS e com rotas legadas de escrita sem gate admin** (6.2 + 6.4 + 6.3) — qualquer portador da anon key adultera conteúdo clínico aprovado.
3. **O fluxo de Encerramento gera os documentos com estado obsoleto** (3.1) — a reclassificação por IA é aplicada e depois ignorada na geração; defeito funcional no coração do produto.

## 1. Organização e arquitetura

**1.1 [MÉDIA] Fonte de verdade do schema ambígua entre migrations e .txt soltos.**
Evidência: `supabase/KRONIA_NURSE_SQL_COMPLETO.txt` duplica o conteúdo de `supabase/migrations/20260630_*.sql`; `supabase/migrations/20260630_schema_completo.sql` e `20260630_knowledge_specs.sql` criam as MESMAS tabelas/trigger com definições diferentes (trigger `trg_knowledge_specs_updated_at` definido 2x com funções distintas: `schema_completo.sql:309-312` vs `knowledge_specs.sql:148-151`).
Motivo: dois caminhos de criação do mesmo schema; qual rodou de fato no banco é indeterminável pelo repo. Impacto: drift silencioso entre ambiente e repo. Esforço: P (eleger migrations/ como fonte única e mover os .txt para pasta de docs/handoff).

**1.2 [MÉDIA] Documentos de handoff de sessões de IA versionados como se fossem código.**
Evidência: `supabase/KRONIA_NURSE_PROMPT_CONCLUSAO.txt`, `KRONIA_NURSE_PROMPT_TESTES_REDE.txt`, `KRONIA_NURSE_TESTES_BIBLIOTECA.txt` (1058 linhas) — instruções operacionais com URL real do projeto Supabase e placeholders de segredos.
Motivo: misturam documentação efêmera com o repo; foi exatamente um desses arquivos que causou o vazamento de chaves (ver 6.1). Impacto: risco recorrente de segredo commitado. Esforço: P.

**1.3 [BAIXA] `components/README.md` documenta um design system que não é o do projeto.**
Evidência: `components/README.md:4` cita "azul #0055FF, ver DESIGN_SYSTEM.md do projeto principal" — arquivo inexistente no repo; o token real é `--color-clinical: #0B4F8A` (`styles/globals.css:13`).
Motivo: doc desatualizada aponta para referência morta e cor errada. Impacto: confunde contribuidor/agente de IA em refinos de UI. Esforço: P.

**Pontos fortes:** separação clara client/server dos clientes Supabase (`lib/supabase-browser.ts` anon vs `lib/supabase-client.ts` service_role, este importado só em `pages/api/**`); nenhum módulo morto em `lib/` (todos têm importadores); tipos centrais enxutos e documentados (`lib/types.ts`).

## 2. Código

**2.1 [MÉDIA] Sem ESLint/Prettier e sem script de lint.**
Evidência: `package.json:5-11` só tem dev/build/start/typecheck/test; nenhum `.eslintrc*`/`prettier*` na raiz.
Motivo: único guarda-corpo é o `tsc`; estilo e bugs de hook (deps de useEffect) não são verificados. Impacto: regressões de qualidade passam sem aviso em um projeto editado por várias sessões de IA. Esforço: P (`next lint` já vem no Next 14).

**2.2 [MÉDIA] Boilerplate de rota copiado N vezes (method check → auth → rate-limit → try/catch).**
Evidência: bloco idêntico em `pages/api/plantao/relatorio-final.ts:16-32` ≈ `gerar-documento.ts:16-34` ≈ demais rotas de plantão; checagem method+auth+admin repetida linha a linha em `knowledge-spec/criar.ts:23-27`, `atualizar.ts:23-27`, `pipeline.ts:17-21`, `aprovar.ts:24-28`, `reprovar.ts:12-16`; `computarHash` duplicada em `criar.ts:12-20` e `atualizar.ts:12-20`.
Motivo: falta um wrapper `withAuth`/`withAdmin`/`withRateLimit` e utilitário de hash compartilhado. Impacto: correções de segurança precisam ser replicadas à mão — foi assim que `conhecimento/*` e `evolucao/generate` ficaram para trás (ver 6.4 e 2.3). Esforço: M.

**2.3 [MÉDIA] `evolucao/generate` reimplementa a autenticação em vez de usar o helper.**
Evidência: `pages/api/evolucao/generate.ts:10-16` faz `authHeader.replace('Bearer ', '')` + `supabase.auth.getUser(token)` manual, divergindo de `lib/auth-server.ts:16-18` (que checa `startsWith('Bearer ')`).
Motivo: caminho de auth paralelo, sem `usuario.id` — por isso a rota também ficou sem rate limit. Impacto: dois códigos de segurança para manter em sincronia. Esforço: P.

**2.4 [MÉDIA] Erros engolidos sem log nas rotas de plantão.**
Evidência: `catch (e)` retorna 500 genérico sem `console.error` em `plantao/relatorio-final.ts:30`, `gerar-documento.ts:31`, `reclassificar.ts:37-38`, `sugerir-complexidade.ts:45`, `calcular-alertas.ts:87-88`. As rotas `kronos/*` logam corretamente (`professor.ts:46,57,102`).
Motivo: falha do Groq ou JSON inválido fica invisível em produção. Impacto: incidentes indiagnosticáveis. Esforço: P.

**2.5 [ALTA] Lógica clínica crítica sem teste.**
Evidência: `jest.config.js` roda só `lib/__tests__/**`; existe apenas `scales.test.ts` (NEWS2/RASS/Ramsay). Sem teste: `calcularBraden`, `calcularMorse`, `calcularGlasgow`, `calcularPush`, `calcularQsofa` (`lib/scales.ts:228-263`) e `qsofaFromRaw` (`pages/api/plantao/calcular-alertas.ts:32-41`) — justamente o "risco calculado em código, nunca pela IA" que o produto promete.
Motivo/Impacto: regressão em cálculo de escala clínica passaria despercebida — risco direto ao paciente. Esforço: M (funções puras, fáceis de testar).

**Pontos fortes:** contrato de erro uniforme `{ erro }` + 405 em todas as 18 rotas; comentários de intenção excelentes (ex.: `lib/storage.ts:1-10`, `calcular-alertas.ts:1-9`); separação IA-extrai/código-calcula bem executada.

## 3. Frontend

**3.1 [ALTA] Encerramento gera documentos com estado obsoleto após a reclassificação.**
Evidência: `pages/encerramento.tsx:53-59` aplica o mapeamento via `adicionarPaciente`/`editarEvento` (setState assíncrono), mas as linhas 64, 70 e 83 seguem usando `turno.pacientes`/`turno.eventos` capturados no closure ANTES da correção; e em `:57-58` o evento de paciente recém-criado recebe `patientId: null` (o id novo nunca é conhecido).
Motivo: a correção de leitos existe exatamente para consertar os documentos, mas eles são gerados com os dados antigos; eventos reclassificados para pacientes novos caem em "Notas Gerais". Impacto: documento clínico final ignora a reclassificação — defeito funcional no fluxo mais importante do produto. Esforço: M (calcular o turno corrigido localmente e usá-lo na geração).

**3.2 [MÉDIA] Estado do turno duplicado por página e sem sincronização entre abas.**
Evidência: `components/useTurno.ts:18-31` — cada página que chama `useTurno()` tem sua própria cópia do estado, hidratada do localStorage na montagem; não há listener do evento `storage`.
Motivo: com duas abas abertas, o `useEffect` de persistência (`:29-31`) faz last-write-wins e uma aba sobrescreve os registros da outra. Impacto: perda silenciosa de registro clínico. Esforço: M (listener `storage` ou checagem de versão antes de salvar).

**3.3 [MÉDIA] `biblioteca-tecnica.tsx` é um monólito de 1300 linhas com 21 `useState` no componente raiz.**
Evidência: `pages/biblioteca-tecnica.tsx:76-103` (21 estados), sub-visões `ListaView/FormularioView/DetalheView/AprovacaoView/ProcessarView` (`:434-1245`) todas no mesmo arquivo, 150 objetos `style={{}}`.
Motivo: qualquer mudança de estado re-renderiza as 5 visões; arquivo difícil de revisar. Impacto: manutenção cara e re-renders desnecessários. Esforço: M (extrair as views já existentes para `components/`, sem redesenho).

**3.4 [MÉDIA] Padrão "getSession + headers Bearer + fetch" copiado em todas as páginas que chamam API.**
Evidência: `encerramento.tsx:34-38`, `kronos.tsx:37-39`, `biblioteca-tecnica.tsx:47-55`, `evolucao-avulsa/[tipo]/index.tsx` — mesmo bloco de montagem de header.
Motivo: `biblioteca-tecnica.tsx:51` já tem um helper local (`chamarApi`); os demais duplicam. Impacto: divergência de tratamento de 401/erro entre telas. Esforço: P (promover o helper existente para `lib/`).

**3.5 [BAIXA] Ícones SVG duplicados entre arquivos.**
Evidência: `IconMais`/`IconPacientes`/`IconKronos` definidos em `components/Layout.tsx:95-111` E `pages/plantao.tsx:332-368`; `IconLixeira` em `registrar.tsx:265` e `pacientes.tsx:207`; `IconRelogio` em `plantao.tsx:352` e `kronos.tsx:249`.
Motivo/Impacto: drift visual entre cópias do mesmo ícone. Esforço: P (arquivo único de ícones).

**Pontos fortes:** proteção de rota centralizada e correta no `AuthGate` (`pages/_app.tsx:10-41` — todas as páginas privadas cobertas, sem checagens ad-hoc); `useTurno` como fachada única do turno com persistência automática; renderização de markdown do KRONOS feita com elementos React, sem `dangerouslySetInnerHTML` (`kronos.tsx:216-246` — sem vetor XSS); confirmação explícita de duas etapas antes da ação destrutiva de encerrar plantão (`encerramento.tsx:295-316`).

## 4. UX e UI

**4.1 [MÉDIA] Feedback de erro do Encerramento perde o progresso já pago.**
Evidência: `encerramento.tsx:107-110` — qualquer falha (inclusive na última chamada, o relatório final) descarta `docs` já gerados e volta a `fase='inicial'`; "Tentar novamente" (`:266`) refaz TODAS as chamadas LLM.
Motivo/Impacto: enfermeiro no fim do plantão repete um processo de minutos e consome rate limit à toa. Esforço: M (manter documentos parciais e retomar do passo que falhou).

**4.2 [BAIXA] Botão com `aria-label` incorreto.**
Evidência: `pages/plantao.tsx:47-63` — botão com ícone de sino e `aria-label="Notificações"` navega para `/perfil`.
Motivo/Impacto: leitor de tela anuncia função que não existe. Esforço: P.

**4.3 [BAIXA] Flash de tema claro para usuários de tema escuro.** [requer verificação visual]
Evidência: `lib/theme-context.tsx:15-23` — o tema salvo só é aplicado em `useEffect` pós-hidratação; não há script inline no `<head>` (sem `_document.tsx`).
Impacto: flash branco a cada carga em plantão noturno — contexto onde o dark mode mais importa. Esforço: P.

**4.4 [BAIXA] Rótulos de navegação com fonte 0.62rem (~10px).** [requer verificação visual]
Evidência: `styles/globals.css:122` (`.nav-item { font-size: 0.62rem }`), `.tipo-tag 0.65rem` (`:457`), `.sessao-tipo-pill 0.65rem` (`:752`).
Motivo/Impacto: abaixo do mínimo confortável de leitura em mobile; contraste de `--color-ink-faint` sobre surface em texto tão pequeno é limítrofe. Esforço: P.

**Pontos fortes:** estados vazios dedicados (`.estado-vazio`) e mensagens de responsabilidade clínica consistentes (`.aviso-privacidade`, `.texto-responsabilidade`); feedback de progresso passo-a-passo no processamento do plantão (`encerramento.tsx:24-26,249-253`); loading/disabled em todos os botões de ação assíncrona verificados.

## 5. Performance

**5.1 [MÉDIA] Geração de documentos do Encerramento é sequencial por paciente.**
Evidência: `encerramento.tsx:68-79` — `for` com `await` por paciente; cada chamada é um round-trip completo ao Groq.
Motivo/Impacto: com 8 pacientes, tempo total ≈ 8× a latência de geração (minutos), no momento de maior pressa do turno. `Promise.all` com concorrência limitada respeitaria o rate limit e cortaria o tempo. Esforço: P/M.

**5.2 [MÉDIA] Pipeline de auditoria: 5 chamadas LLM sequenciais + retries dentro de uma única função serverless.**
Evidência: `lib/knowledge-pipeline.ts:482-528` + retries de 429 em `groq-client.ts:32-58`, sem timeout por chamada (ver 7.2).
Impacto: risco concreto de exceder o limite de execução da Vercel e deixar a spec presa em `em_auditoria`. Esforço: M.

**5.3 [BAIXA] Sem cache/revalidação nas listas da Biblioteca.**
Evidência: `biblioteca-tecnica.tsx:134-135` — refetch integral a cada montagem/mudança de visão; sem SWR/staleness (o projeto não usa lib de data-fetching — ok manter fetch, mas sem reaproveitamento algum).
Impacto: baixo no volume atual. Esforço: M (aceitável adiar).

**Pontos fortes:** bundle enxuto (única dependência de runtime além de React/Next é `@supabase/supabase-js` — `package.json:12-17`); code-splitting natural por rota do pages router; nenhuma imagem/asset pesado; retry de 429 honra o tempo sugerido pela Groq em vez de martelar.

## 6. Banco de dados e segurança

### Mapa de RLS por tabela

| Tabela | RLS ativo? | Políticas | Observação |
|---|---|---|---|
| `knowledge_base` | **NÃO** | — | fonte canônica do KRONOS, sem RLS |
| `knowledge_versions` | **NÃO** | — | histórico, sem RLS |
| `knowledge_audit` | **NÃO** | — | auditoria, sem RLS |
| `knowledge_specs` | Sim | `FOR ALL TO authenticated USING(true)` | permissiva demais (ver 6.3) |
| `knowledge_spec_audit` | Sim | `FOR ALL TO authenticated USING(true)` | permissiva demais (ver 6.3) |
| `rate_limits` | Sim | nenhuma (deny-all a clients) | correto |
| `user_roles` | Sim | SELECT próprio; escrita só service_role | correto |

**6.1 [CRÍTICA] Chaves reais permanecem recuperáveis no histórico do git.**
Evidência: commit `cbc5e8d` adicionou `SUPABASE_SERVICE_ROLE_KEY=eyJ…`, `GROQ_API_KEY=gsk_…` e anon key em texto plano em `supabase/KRONIA_NURSE_PROMPT_TESTES_REDE.txt`; `2fc98d6` ("security: remover segredos…") removeu do arquivo, mas `git log -p` ainda expõe as 10 linhas.
Motivo: remoção de arquivo não remove do histórico. Impacto: qualquer pessoa com acesso ao repo recupera a service_role (bypass total de RLS) e a chave Groq. Ação: rotacionar TODAS as chaves (se ainda não foi feito — [incerto] se a rotação já ocorreu) e reescrever histórico (`git filter-repo`) ou tornar o repo efetivamente novo. Esforço: P (rotação) / M (limpeza de histórico).

**6.2 [CRÍTICA] `knowledge_base`, `knowledge_versions` e `knowledge_audit` sem RLS.**
Evidência: `supabase/migrations/20260630_schema_completo.sql` cria as 3 tabelas sem nenhum `ENABLE ROW LEVEL SECURITY` (grep em `supabase/migrations/*.sql` só encontra RLS em `knowledge_specs.sql:159-163`, `rate_limits.sql:13`, `user_roles.sql:10`).
Motivo: com os grants default do Supabase, qualquer cliente com a anon key (pública no bundle) lê E escreve a fonte canônica do KRONOS direto via PostgREST, sem passar por nenhuma rota. Impacto: adulteração de conteúdo clínico aprovado por qualquer visitante; anula o pipeline de aprovação inteiro. Esforço: P (enable RLS sem policies — todo acesso legítimo já é via service_role).

**6.3 [ALTA] Policies `USING (true)` em `knowledge_specs`/`knowledge_spec_audit` anulam o gate de admin.**
Evidência: `supabase/migrations/20260630_knowledge_specs.sql:160,163` — `FOR ALL TO authenticated USING (true) WITH CHECK (true)`.
Motivo: as rotas exigem admin para criar/aprovar specs, mas qualquer usuário autenticado pode inserir/editar/apagar specs e o log de auditoria direto pelo PostgREST com a anon key. Impacto: bypass da curadoria e adulteração de trilha de auditoria. Esforço: P (restringir a service_role, como em `rate_limits`).

**6.4 [CRÍTICA] Rotas legadas `conhecimento/*` escrevem na `knowledge_base` sem papel admin.**
Evidência: `pages/api/conhecimento/salvar.ts:9-10` e `arquivar.ts:8-9` só chamam `getUsuarioAutenticado`, sem `usuarioEhAdmin` — e usam o client service_role.
Motivo: bypass completo do pipeline de aprovação humana e do gate admin recém-adicionado às rotas `knowledge-spec/*`. Impacto: qualquer enfermeiro autenticado insere/edita/arquiva conteúdo clínico canônico. Esforço: P.

**6.5 [MÉDIA] Publicação em `aprovar` sem atomicidade e sem checagem de erro nas escritas subsequentes.**
Evidência: `pages/api/knowledge-spec/aprovar.ts:86-161` — insert em `knowledge_base`, update da spec e 2 inserts de auditoria sem transação; os `await` de `:139,149,156` não checam `error`.
Motivo/Impacto: falha parcial deixa spec `aguardando_aprovacao` com conteúdo já publicado → reaprovação duplica entrada canônica. Esforço: M (RPC transacional).

**6.6 [BAIXA] Índice ivfflat criado em tabela vazia.**
Evidência: `20260630_schema_completo.sql:205-209` cria `ivfflat (lists=100)` na criação do schema, embora o próprio comentário diga "criado após inserções em lote".
Motivo: centroides ruins com poucas linhas → recall degradado. Impacto: baixo no volume atual. Esforço: P (reindexar quando a base crescer).

**6.7 [BAIXA] Colunas de rastreabilidade sem integridade referencial.**
Evidência: `knowledge_specs.criado_por/aprovado_por TEXT` (`schema_completo.sql:164-165`), `knowledge_audit.usuario TEXT` (`:85`), `knowledge_base.spec_id UUID` sem FK (`alter_knowledge_tables.sql:49-51`, deliberado).
Motivo: identidade como texto livre. Impacto: auditoria não verificável contra `auth.users`. Esforço: M (aceitável manter; documentar).

**6.8 [ALTA] Quatro rotas que chamam LLM ficaram fora do rate limiting.**
Evidência: `pages/api/evolucao/generate.ts` (Groq direto, sem `dentroDoRateLimit`); `knowledge-spec/pipeline.ts:16-25` (pipeline inteiro, o mais caro — e `lib/rate-limit.ts:20` até define `LIMITE_PIPELINE`, mas só `kronos/biblioteca/processar` o usa); `knowledge-spec/aprovar.ts:73-77` e `conhecimento/salvar.ts:20` (embedding Cohere).
Motivo: a cobertura do incidente parou nas rotas de plantão/kronos. Impacto: abuso de custo nas APIs Groq/Cohere; `evolucao/generate` é a mais exposta (qualquer autenticado). Esforço: P por rota.

**6.9 [MÉDIA] Mensagens cruas do Supabase vazam na resposta das rotas de conhecimento.**
Evidência: `res.status(500).json({ erro: error.message })` em `conhecimento/salvar.ts:73,94`, `arquivar.ts:23`, `listar.ts:18`, `knowledge-spec/atualizar.ts:97`, `criar.ts:93`, `pipeline.ts:81`, `listar.ts:37`.
Motivo: expõe nomes de tabela/coluna e violações de constraint ao cliente; as rotas de `plantao/*` já fazem certo (mensagem genérica). Impacto: divulgação de estrutura interna. Esforço: P.

**Cobertura de auth verificada rota a rota:** todas as 18 rotas de `pages/api/**` exigem autenticação; gate de admin presente em todas as `knowledge-spec/*` de escrita e em `kronos/biblioteca/processar`; ausente apenas nas legadas `conhecimento/salvar|arquivar` (6.4). Rate limit presente nas 5 `plantao/*`, `kronos/professor` e `kronos/biblioteca/processar`; ausente nas 4 rotas de 6.8.

**Varredura de segredos no working tree: LIMPA** — nenhum `gsk_`/`sk-`/JWT/service_role em código; `.env*` nunca foi commitado como arquivo; `NEXT_PUBLIC_*` expõe apenas URL + anon key (correto). O problema é exclusivamente o histórico (6.1).

**Pontos fortes:** `rate_limits` e `user_roles` com desenho de RLS correto (deny-all a clients, escrita só via service_role); `incrementar_rate_limit` com `SECURITY DEFINER` + `set search_path` + `REVOKE`/`GRANT` explícitos (`rate_limits.sql:22-46`); índices adequados nas colunas de filtro (`schema_completo.sql:196-240`).

## 7. IA (prompts e pipeline)

**7.1 [ALTA] `response_format: json_object` (default) conflita com prompts que exigem array JSON no topo.**
Evidência: `lib/groq-client.ts:30,49` — `json: true` por default; `PROMPT_RECLASSIFICACAO` (`lib/prompts.ts:81`) e `PROMPT_ALERTAS` (`prompts.ts:141`) exigem resposta `[{...}]` (array top-level); `reclassificar.ts:34-35` e `calcular-alertas.ts:61-62` fazem `extrairJson<T[]>` e `.map()` direto, sem `Array.isArray`.
Motivo: o modo `json_object` induz o modelo a devolver um objeto; se vier `{"resultado":[...]}`, o `.map` lança TypeError → cai no catch silencioso (2.4) → 500 genérico. Impacto: funcionalidade central do Encerramento falhando de forma indiagnosticável. Esforço: P (validar `Array.isArray` + desembrulhar objeto, ou instruir/parsear defensivamente). [incerto se ocorre com o gpt-oss-120b em prática — exige teste]

**7.2 [ALTA] `chamarGroq` e `gerarEmbedding` sem timeout.**
Evidência: `lib/groq-client.ts:33-51` e `lib/embeddings.ts:17-29` — `fetch` sem `AbortSignal.timeout`.
Motivo: chamada pendurada segura a função serverless até o timeout da plataforma; `executarPipeline` faz 5 chamadas sequenciais (`knowledge-pipeline.ts:482-528`) + até 4 retries de 429 cada (`groq-client.ts:32-58`) — o pior caso excede folgado o limite da função Vercel. Impacto: pipeline morre no meio e a spec fica presa em `em_auditoria` (update de status em `pipeline.ts:47` nunca roda). Esforço: P (AbortSignal) / M (repensar orçamento de tempo do pipeline).

**7.3 [MÉDIA] Prompt de sistema da evolução avulsa fora de `lib/prompts.ts` e divergente das REGRAS_COMUNS.**
Evidência: `lib/evolucao/generate-evolucao.ts:31-41` define prompt inline com regras próprias — sem rastreabilidade [HH:MM], sem proibição de markdown, e assinatura diferente ("Enfermeiro(a) Responsável — [data/hora]") da linha obrigatória de `prompts.ts:20`.
Motivo: `lib/prompts.ts:2` se declara o lugar de "toda garantia de segurança do produto", mas esta superfície clínica não segue. Impacto: documentos com garantias inconsistentes entre módulos. Esforço: P (mover e alinhar).

**7.4 [MÉDIA] Nenhuma delimitação entre instrução e dado do usuário nos prompts.**
Evidência: `reclassificar.ts:34`, `calcular-alertas.ts:61`, `kronos/professor.ts` etc. passam texto livre do enfermeiro como mensagem user sem delimitadores; `knowledge-pipeline.ts:233,268` interpola o rascunho direto em "Analise o seguinte material:".
Motivo: texto ditado/colado pode conter instruções ("ignore as regras…") — prompt injection sobre documento clínico. Impacto: mitigado pelas regras fortes de sistema, mas sem fronteira explícita (`=== DADOS ===`). Esforço: P.

**7.5 [MÉDIA] Sem limite de tamanho no texto enviado ao LLM.**
Evidência: `plantao/*`: só `if (!dados)` (`relatorio-final.ts:24-25`, `gerar-documento.ts:25-26`, etc.); `evolucao/generate.ts:23` não limita quantidade/tamanho de campos; `kronos/professor.ts:28-31` só exige string não vazia.
Motivo: payload gigante = custo de tokens direto; rate limit por requisição não protege disso. Impacto: custo/DoS. Esforço: P.

**7.6 [BAIXA] Etapas 3–5 do pipeline auditam sem as referências completas quando trecho é longo.** [incerto]
Evidência: `montarContextoSpec` (`knowledge-pipeline.ts:170-209`) envia rascunho + referências integrais a cada um dos 5 auditores — 5× o mesmo contexto, sem truncamento.
Motivo/Impacto: custo multiplicado e risco de estourar contexto em specs grandes. Esforço: M (aceitável hoje; monitorar).

**Pontos fortes:** prompts centralizados, versionáveis e excepcionalmente bem escritos (`lib/prompts.ts` — regras anti-fabricação, rastreabilidade [HH:MM], proibições explícitas por seção); retry de 429 honrando o `retry-after` da Groq (`groq-client.ts:53-58,79-84`); detecção de truncamento por `finish_reason === 'length'` (`groq-client.ts:69-71`); pipeline com gates hard-fail bem ordenados e consolidação determinística em código (`knowledge-pipeline.ts:404-462`).

## 8. Design system

**8.1 [ALTA] As três fontes do design system nunca são carregadas.**
Evidência: `styles/globals.css:23-25` declara `--font-display: 'Space Grotesk'`, `--font-body: 'Inter'`, `--font-mono: 'IBM Plex Mono'`, mas não há `@font-face`, `@import`, `next/font` nem `_document.tsx` com `<link>` em lugar nenhum do repo (grep vazio).
Motivo: todo o app renderiza nos fallbacks (`Segoe UI`/`SF Mono`) — a identidade tipográfica inteira está silenciosamente ausente. Impacto: o design system tipográfico existe só no papel. Esforço: P (`next/font/google` em `_app.tsx`). [requer verificação visual para confirmar em produção]

**8.2 [MÉDIA] Estilos inline recriam componentes que já existem como classe.**
Evidência: `plantao.tsx:101-164` recria `.kronos-grid-item` inline (mesmos valores: radius 14, tint, ícone 28px); `plantao.tsx:271-283` recria um badge inline em vez de `.badge`; `plantao.tsx:290-318` recria `.estado-vazio`/`.card`; `encerramento.tsx:220-231` recria `.texto-responsabilidade` com valores ligeiramente diferentes (radius 12 vs 10, cor idêntica).
Motivo: convivência de dois sistemas (classes de `globals.css` vs inline) com drift já visível. Impacto: ajustes de token não propagam para as cópias inline. Esforço: M (substituir inline pelas classes existentes — padronização, não redesign).

**8.3 [MÉDIA] Cores fixas fora dos tokens quebram o dark mode em detalhes.**
Evidência: `globals.css:528` (`rgba(11,79,138,.2)` na borda de `.aviso-privacidade`), `:543` (`rgba(181,121,12,.25)`), `:555`, `:604`, `:775` — alfa derivado do azul/âmbar CLARO mesmo em dark theme (onde `--color-clinical` vira `#4F9CDB`); `.shift-pulse-dot` usa verde hardcoded `#5FD18A` (`:808`) fora da paleta `--color-ok`; espelhos inline em `plantao.tsx:214` e `encerramento.tsx:222`.
Motivo/Impacto: bordas/glow com matiz errado no dark mode; verde de status fora da paleta semântica. Esforço: P (usar `color-mix()` ou variáveis de borda). [requer verificação visual]

**8.4 [BAIXA] Dois esquemas de badge para o mesmo conceito de complexidade.**
Evidência: `globals.css:304-314` — `.badge-estavel/intermediario/critico` (3 níveis) convive com `.badge-minimos/…/intensivos` (5 níveis, comentado como "legacy"), e `.badge-intermediarios` usa a cor clínica (azul) enquanto `.badge-intermediario` usa warn (âmbar).
Motivo/Impacto: o mesmo estado clínico pode aparecer com cores diferentes conforme a tela. Esforço: P (eleger o esquema de 5 níveis e apontar o de 3 para os mesmos tokens).

**Pontos fortes:** paleta de tokens completa e disciplinada com dark mode espelhado (`globals.css:6-44`); cores semânticas (ok/warn/danger) de fato reservadas a estados clínicos, com o azul clínico como cor de marca — exatamente a regra pedida; biblioteca de classes reutilizáveis já cobre botões, cards, badges, campos, pills, steppers e estados vazios — o problema não é falta de sistema, é adesão a ele (8.2).

## Plano de correção priorizado

**Onda 1 — Fechar o incidente de segurança (tudo P, fazer junto, hoje):**
1. Rotacionar service_role, anon key, GROQ_API_KEY e COHERE_API_KEY; depois limpar o histórico git (`git filter-repo`) — 6.1.
2. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` (sem policies) em `knowledge_base`, `knowledge_versions`, `knowledge_audit`; trocar as policies `USING (true)` de `knowledge_specs`/`knowledge_spec_audit` por deny-all a clients — 6.2, 6.3. Uma única migration.
3. Exigir admin em `conhecimento/salvar|arquivar` — 6.4.
4. Rate limit nas 4 rotas descobertas (`evolucao/generate`, `knowledge-spec/pipeline|aprovar`, `conhecimento/salvar`) — 6.8; de carona, migrar `evolucao/generate` para `getUsuarioAutenticado` — 2.3.

**Onda 2 — Corrigir o defeito funcional do Encerramento (M):**
5. Aplicar a reclassificação a uma cópia local do turno e gerar os documentos a partir dela (resolve também o `patientId: null` de paciente novo) — 3.1.
6. Preservar documentos parciais em falha e retomar do passo que falhou — 4.1; paralelizar a geração por paciente com concorrência 2-3 — 5.1.

**Onda 3 — Robustez da camada LLM (P, fazer junto):**
7. `AbortSignal.timeout` em `chamarGroq` e `gerarEmbedding` — 7.2.
8. `console.error` nos catches das rotas de plantão — 2.4; mensagem genérica nos `error.message` vazados — 6.9.
9. Validação `Array.isArray` + desembrulho defensivo pós-`extrairJson` nas rotas que esperam array — 7.1; teto de tamanho de payload nas rotas LLM — 7.5.

**Onda 4 — Qualidade estrutural (M, ordem livre):**
10. Testes para `calcularBraden/Morse/Glasgow/Push/Qsofa` e `qsofaFromRaw` — 2.5 (maior retorno por esforço do repo).
11. Wrapper `withAuth/withAdmin/withRateLimit` + hash compartilhado, eliminando o boilerplate copiado — 2.2 (previne a recorrência das Ondas 1).
12. Carregar as fontes via `next/font` — 8.1; substituir estilos inline pelas classes existentes começando por `plantao.tsx` e `encerramento.tsx` — 8.2; unificar esquema de badges — 8.4.
13. Publicação transacional em `aprovar` via RPC — 6.5; sincronização multi-aba do turno — 3.2; ESLint — 2.1.
14. Housekeeping: mover os `.txt` de handoff para fora de `supabase/`, corrigir `components/README.md`, eleger `migrations/` como fonte única — 1.1, 1.2, 1.3.
