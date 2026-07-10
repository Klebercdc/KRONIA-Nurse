# Reconstrução da Knowledge Base — status

Rastreia a execução da especificação de reconstrução da Knowledge Base
(102 `knowledge_specs`, taxonomia v2.0, formatador ABNT). Esta é uma
regeneração completa objeto-por-objeto — grande demais para uma única
sessão. Este documento existe pra que a próxima sessão não precise
redescobrir o que já foi feito.

## Feito

### Causa raiz corrigida (não é patch de dado, é fix de pipeline)

- `lib/abnt.ts` (novo): formatador de citação ABNT determinístico, sem IA.
  Substitui o antigo comportamento de salvar o `trecho` bruto do RAG como se
  fosse a referência.
- `lib/knowledge-pipeline.ts` (`pesquisarFontes`): agora calcula
  `citacao_abnt` por referência via `lib/abnt.ts`, e usa um limiar de
  similaridade mais estrito para coleta de referências permanentes
  (`SIMILARITY_THRESHOLD_REFERENCIA = 0.65`, vs. 0.5 usado em respostas
  ao vivo do KRONOS). Esse limiar mais frouxo era a causa direta da
  contaminação: fragmentos de bibliografia/biografia de
  `processo_de_enfermagem.pdf` passavam do limiar de 0.5 só por
  vocabulário de enfermagem compartilhado, sem relação temática real.
- `lib/knowledge-spec.ts` (`composeReferenciasTexto`): usa `citacao_abnt`
  quando disponível, só cai pro formato ad hoc anterior em specs antigas
  que nunca tiveram a citação calculada.
- Campos `alertas` e `condutas` adicionados em todo o pipeline (tipos,
  prompt do Redator, API `criar`/`atualizar`, UI `biblioteca-tecnica.tsx`,
  `composeConteudoKnowledgeBase`, `montarContextoSpec` dos auditores).
- `DOMINIOS_BIBLIOTECA` (`lib/knowledge-spec.ts`) substituído pela
  Taxonomia v2.0 de 36 Áreas Clínicas (era uma lista solta de 19 domínios
  sem vocabulário fechado — é por isso que 98/102 specs caíram no balde
  genérico "Documentação de Enfermagem").

### Migration (`supabase/migrations/20260710_categoria_taxonomia_v2.sql`, aplicada)

- `ALTER TABLE knowledge_specs ADD COLUMN alertas text, condutas text`.
- `CHECK (categoria = ANY (...36 valores...)) NOT VALID` — trava categoria
  nova a partir de agora sem quebrar as 98 linhas antigas que ainda usam
  categoria fora da árvore. Depois que os specs existentes forem
  recategorizados, rodar
  `ALTER TABLE knowledge_specs VALIDATE CONSTRAINT categoria_taxonomia_v2;`.

### Caso de contaminação confirmado, corrigido ponta a ponta

"Os 13 Certos na Administração de Medicamentos" tinha DOIS registros
**publicados e visíveis** em `knowledge_base` simultaneamente:
- `c167cb42-775f-45db-8fc3-90dcf0f69734` — categoria fora da taxonomia,
  4 de 5 referências vindas de biografias/bibliografia de
  `processo_de_enfermagem.pdf` sem relação com o tema.
- `074438b1-a4cb-4aeb-9fe0-4f5a50de43d5` — referência correta, mas nunca
  consolidado como canônico.

Ação tomada: `074438b1` promovido a canônico (categoria e subcategoria
corrigidas, `citacao_abnt` calculada, `fundamentacao_cientifica`
incorporada do outro registro — só a síntese, que não era cópia).
`c167cb42` arquivado (`status='arquivado'`, não deletado). O artigo
duplicado em `knowledge_base` (`b763d648-...`) foi soft-deletado
(`deleted_at`, não `DELETE`) — o canônico (`0aa35f0b-...`) é o único
visível agora. Auditoria registrada em `knowledge_spec_audit` e
`knowledge_audit` para as duas tabelas.

### Skill de ingestão de PDF

`.claude/skills/kronia-nurse-document-ingestion/SKILL.md` — cobre
diagnóstico texto-vs-escaneado, o fallback necessário neste sandbox
(poppler-utils não instalável, `pip install pypdf` quebra por conflito de
`cryptography` do sistema — usar venv + `pdfminer.six`/`pypdf`), e notas de
qualidade conhecida por instituição.

### Testes

`lib/__tests__/abnt.test.ts` (novo) e
`lib/__tests__/knowledge-pipeline-pesquisador.test.ts` (estendido) cobrem
o formatador ABNT e o limiar mais estrito. `npm run typecheck` e `npm test`
passam limpos (145 testes, 9 suites).

## Não feito — e por quê

**Os outros ~100 `knowledge_specs` continuam com o problema original**
(categoria fora da taxonomia, sem `alertas`/`condutas`, referências sem
`citacao_abnt`). Corrigir isso exige rodar `redigirConteudo` +
`executarPipeline` (5 auditorias via LLM) objeto por objeto — que precisa
de `GROQ_API_KEY`, indisponível neste ambiente (sem `.env.local`). O
código está pronto pra gerar os campos certos assim que rodar; falta só a
execução em lote (`scripts/gerar-especificacoes-lote.ts` já aceita
`alertas`/`condutas`).

Query de aceite (adaptada da seção 5 da spec pro schema real — ver
`git log` desta migration para o SQL exato): rodada em 2026-07-10, **101
de 101 specs não-arquivados** ainda não conformam. Vai continuar assim até
o lote acima rodar.

**Ingestão dos PDFs da pasta "Referências" do Drive** (46 arquivos): 13 já
indexados (`conhecimento_documentos`/`PDF_METADATA` em
`scripts/rag-pipeline.js`). Os outros 33 foram triados nesta sessão — 1 na
hora (`Manual-de-Cuidados-de-Enfermagem-em-Procedimentos-de-Intensivismo.pdf`,
151 páginas, texto limpo) e 32 por um agente em background. Resultado
completo em `docs/pdf-triage-referencias-pendentes.md`:

- **31/32 texto extraível, 0 escaneado, 1 falhou.**
- Falha: `atualidades_em_nefrologia_10.pdf` (#26) — 65MB, excede o limite de
  10MB do download binário da ferramenta usada, e o fallback de texto do
  Drive retornou vazio 2x. Precisa de download manual/alternativo pra
  triar de verdade — **não foi possível afirmar se é escaneado ou só grande
  demais pro serviço de conversão**, então não presuma nada sobre esse
  arquivo até reabrir com outra ferramenta.
- **Achado que exige decisão humana antes de indexar**: `Manual para
  hemodiálise .pdf` (#31) tem conteúdo real completamente diferente do
  nome — são os resumos do XXXI Congresso Brasileiro de Nefrologia
  (2022), não um manual. Não usar o nome do arquivo como `descricao` sem
  confirmar; pode haver um arquivo de manual de hemodiálise de verdade em
  outro lugar, ou o nome no Drive está simplesmente errado.
- Metadados propostos (instituição/tipo/versão/ano) no relatório têm
  confiança "alta" só quando a publicação é inequívoca pelo nome do
  arquivo (KDIGO, AHA, IDSA, editoras de tradução conhecidas). Boa parte
  está "baixa — confirmar": **não copiar direto pra `PDF_METADATA` sem
  revisão humana** — isso reproduziria o mesmo tipo de erro que motivou
  toda essa reconstrução, só que na entrada em vez de na saída.
- Nenhum dos 33 foi de fato indexado (`conhecimento_documentos`/
  `conhecimento_fragmentos`) — a ingestão real via `npm run rag:pipeline`
  precisa de `COHERE_API_KEY`, indisponível neste ambiente.

## Próximos passos, em ordem

1. Revisar `docs/pdf-triage-referencias-pendentes.md` e confirmar os
   metadados marcados "baixa — confirmar" (a maioria dos 32); resolver a
   discrepância do arquivo #31 e re-triar o #26 com outra ferramenta de
   download.
2. Configurar `.env.local` com `GROQ_API_KEY`/`COHERE_API_KEY`/
   `SUPABASE_SERVICE_ROLE_KEY` num ambiente com acesso.
3. Adicionar as entradas confirmadas em `PDF_METADATA`
   (`scripts/rag-pipeline.js`) e rodar `npm run rag:pipeline` pra indexar
   os PDFs pendentes.
4. Recategorizar/regenerar os ~100 specs restantes via
   `scripts/gerar-especificacoes-lote.ts` (ou pelo formulário
   `biblioteca-tecnica.tsx`, um por um, pra specs que precisam de revisão
   humana mais próxima).
5. Depois de zerar a query de aceite: `ALTER TABLE knowledge_specs
   VALIDATE CONSTRAINT categoria_taxonomia_v2;`.
