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
- `CHECK (categoria = ANY (...36 valores...))` — **totalmente validada**,
  não é mais `NOT VALID`. Todos os 102 `knowledge_specs` (ativos e
  arquivados) já conformam; a constraint agora bloqueia de verdade
  qualquer `categoria` fora da árvore, inclusive em `UPDATE`s a linhas
  antigas.

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

### Os 98 `knowledge_specs` restantes — reconstruídos manualmente, sem Groq

`GROQ_API_KEY` não está disponível neste ambiente, então o Redator/Auditor
automático (`lib/knowledge-pipeline.ts`) não pôde rodar em lote. Em vez
disso, cada um dos 98 specs ativos foi processado à mão: os `trechos`
reais já presentes em `referencias_oficiais` (a maioria vinda de
`Registros-de-Enfermagem-no-Exercicio-da-Profissao.pdf`, COFEN 2023 — um
guia de "o que registrar" por procedimento, por isso quase todo spec tem
`execucao_passos` vazio: não são protocolos de execução, são conteúdo de
documentação) foram lidos um a um para escrever `categoria`/`subcategoria`
(taxonomia v2.0), `objetivo`, `alertas` e `condutas` — sem inventar nada
fora do que os trechos sustentam.

`citacao_abnt` foi calculado para **todas** as referências existentes em
uma única passada mecânica em SQL (join com `conhecimento_documentos`,
mesma lógica de `lib/abnt.ts`) — determinístico, sem julgamento envolvido.
`knowledge_base` (o que os usuários realmente veem) foi resincronizado a
partir dos specs corrigidos com uma segunda passada em SQL que replica
`composeConteudoKnowledgeBase`/`composeReferenciasTexto` exatamente.

**Achado extra durante o processo — contaminação por dado de teste**: 3
specs adicionais (`Coleta de Hemocultura`, `Inserção e Manutenção de Sonda
Vesical de Demora`, `Oxigenoterapia por Cateter Nasal`) tinham
`criado_por='teste.biblioteca.1782919848'` e citavam documentos
completamente fora do corpus real (RDC 36/2013, resoluções COFEN com
números/datas divergentes entre specs, guias CDC/OMS/sociedades) —
citações plausíveis mas não verificáveis, nunca vindas do RAG. Duas delas
(`Coleta de Hemocultura` e `Inserção de Sonda Vesical`) estavam **cada uma
publicada duas vezes simultaneamente** em `knowledge_base`. Todas as 3
foram arquivadas (`status='arquivado'`, nunca deletadas) e os 5 artigos
duplicados/fabricados em `knowledge_base` foram soft-deletados
(`deleted_at`, nunca `DELETE`) — auditoria completa em
`knowledge_spec_audit`/`knowledge_audit`.

**Resultado**: `knowledge_specs` tem 102 linhas — 98 ativas (todas
conformes) + 4 arquivadas (3 dado de teste + 1 duplicata contaminada dos
"13 Certos"). `knowledge_base` tem 98 artigos vivos, 5 soft-deletados. A
query de aceite (seção 5 da spec original, adaptada ao schema real —
`resumo`/`objetivo`/`alertas`/`condutas` preenchidos, toda referência com
`citacao_abnt`, `categoria` na taxonomia) **retorna zero linhas**. A
constraint `categoria_taxonomia_v2` está totalmente validada (não mais
`NOT VALID`).

### Enriquecimento profundo de 4 specs com fonte técnica real (além do guia de registro)

Pra provar que dá pra ir além do guia "o que registrar" do COFEN sem
esperar `COHERE_API_KEY`, baixei e li diretamente (Google Drive +
pdfminer/pypdf, sem RAG) o `Manual de Cuidados de Enfermagem em
Procedimentos de Intensivismo` (UFCSPA, 2020, orgs. Souza/Viégas/Caregnato
— já catalogado em `PDF_METADATA` de `scripts/rag-pipeline.js` pra quando
o pipeline real rodar). Usei o conteúdo técnico real (indicações,
contraindicações, materiais, técnica passo a passo, cuidados,
complicações) pra enriquecer de verdade — não só recategorizar — 4 specs
que antes só tinham o nível "registro de enfermagem":

- **Pressão Arterial Média (PAM)** — `e1770d9d-...`
- **Pressão Venosa Central (PVC)** — `9cb9bdde-...`
- **Nutrição Parenteral (Enfermeiro)** — `a23fde24-...`
- **Hemodiálise** — `beeb317c-...` (enriquecido com o capítulo "Cateter
  para Hemodiálise", que cobre a inserção do cateter de Schilley — a
  sessão de diálise em si já estava coberta pelo guia de registro)

Cada um ganhou `execucao_passos` real (array estruturado, não mais
vazio), `indicacoes`/`contraindicacoes`/`materiais`/`complicacoes`
preenchidos, e uma segunda referência com `citacao_abnt` própria (ex.:
`"UFCSPA. Manual de Cuidados de Enfermagem em Procedimentos de
Intensivismo. 2020. p. 19-27."`) — mantendo a referência COFEN original
intacta. `knowledge_base` foi resincronizado pra esses 4.

Isso é prova de conceito, não escala pros outros 94 — peguei os 4 casos
onde o índice do livro batia exatamente com um spec já existente. Fazer
isso pros outros exigiria ler o livro inteiro (1152 páginas no caso do
Brunner & Suddarth, também já baixado) capítulo por capítulo.

### MinerU testado e adicionado à skill de ingestão

Usuário mandou o código-fonte do MinerU (opendatalab/MinerU) pra avaliar
como skill. Testei de verdade nesta sessão: `pip install "mineru[core]"`
num venv, rodado em modo `pipeline` (CPU) sobre o manual de intensivismo
(151 páginas) — ~6-7 min, baixa ~1,1GB de modelos (layout/OCR/fórmula) na
primeira execução, depois fica em cache. Resultado: Markdown com
hierarquia de heading de verdade (`#`/`##` recuperam capítulo/seção como
heading real, não só texto corrido) e parágrafos limpos, sem quebra de
linha no meio da frase — nitidamente melhor que o fallback pdfminer/pypdf
usado até aqui. Documentado como Step 1b em
`.claude/skills/kronia-nurse-document-ingestion/SKILL.md`, com o caveat
honesto de custo (tempo/download) pra quem for decidir se vale a pena por
PDF.

O que este processo manual **não fez** — porque exigiria julgamento
clínico real e/ou fontes que não estão no corpus indexado, não porque foi
pulado por pressa:
- `execucao_passos`, `indicacoes`, `contraindicacoes`, `materiais`,
  `preparacao`, `complicacoes` continuam vazios na maioria dos specs — os
  trechos-fonte (COFEN "Registros de Enfermagem") são conteúdo de
  documentação, não protocolos de execução passo a passo. Preenchê-los
  direito exigiria fontes técnicas adicionais (ex.: manuais de
  procedimento), não apenas reformatar o que já está indexado.
- Cada `citacao_abnt` foi gerada a partir dos metadados que a referência
  já carregava (instituição/documento/página) — não houve nova busca
  RAG nem confirmação humana de que a página citada é exatamente onde o
  conteúdo aparece no PDF original.

## Ainda pendente

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
   os PDFs pendentes — isso amplia o corpus além do guia de registro do
   COFEN, permitindo preencher `indicacoes`/`contraindicacoes`/
   `execucao_passos`/`materiais` com fontes técnicas de verdade (Potter,
   Brunner & Suddarth, KDIGO, AHA, protocolos institucionais etc.), em vez
   de deixá-los vazios como estão hoje na maioria dos specs.
4. Com o corpus ampliado, revisar os specs reconstruídos manualmente
   nesta sessão (buscar `criado_por` ou `historico` por entradas sem
   "agente, sem Groq" nas mais antigas) e enriquecer os campos ainda
   vazios — não é mais recategorização, é aprofundamento de conteúdo.
5. Confirmar manualmente as citações ABNT geradas mecanicamente (a
   página/edição batem com o PDF de origem?) antes de tratar como
   definitivas — a passada em SQL usou os metadados já salvos em cada
   referência, sem reabrir os PDFs originais.
