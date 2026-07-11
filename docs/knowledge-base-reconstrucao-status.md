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
onde o índice do livro batia exatamente com um spec já existente.

Tentei repetir com o Brunner & Suddarth (1152 páginas, já baixado) e não
compensou: é organizado por doença/condição clínica (handbook), não por
procedimento de enfermagem isolado — não tem uma seção "Material" +
"Cuidados de enfermagem" por trás de cada busca como o manual de
intensivismo tinha. Abandonei essa fonte pra evitar forçar conteúdo de
doença específica em spec de procedimento geral.

Troquei pelo `Manual de Condutas em Obstetrícia` (Maternidade Dona
Evangelina Rosa, Teresina-PI, 2ª edição — já catalogado em
`PDF_METADATA`), que tem seções gerais reais de "Admissão da
Parturiente" e "Assistência ao Parto Vaginal"/"Quarto Período" — bateu
certo com **Cuidados no Pré-Parto** (`f0449b33-...`) e **Cuidados na
Sala de Parto** (`6b0ff0e0-...`), que ganharam `indicacoes`/`materiais`/
`execucao_passos`/`complicacoes` reais e uma segunda referência. Não
enriqueci "Cuidados no Pós-Parto Imediato" com essa fonte: o único
"puerpério imediato" que achei no texto era dentro do capítulo de
pré-eclâmpsia (protocolo de sulfato de magnésio), não cuidado
pós-parto geral — não dava pra usar sem misturar contexto de doença
específica com cuidado de rotina.

Tentei também os dois livros de estomaterapia (guia de implantação de
serviço ambulatorial + coletânea "Temas em Estomaterapia") pra enriquecer
"Cuidados com Estomas" e não deu: o primeiro é guia administrativo (lista
de equipamentos pra compra, não técnica de cuidado), o segundo é
coletânea de artigos acadêmicos (cada capítulo com autoria/ORCID e
revisão de literatura), mesmo problema de gênero do Brunner & Suddarth.

Funcionou com o `SAE: Sistematização da Assistência de Enfermagem: Guia
Prático` (Tannure e Pinheiro, Guanabara Koogan, 2ª ed., 2010 — já
catalogado em `PDF_METADATA`): tem a definição formal e bem estruturada
das 5 etapas do processo de enfermagem (investigação, diagnóstico —
citando a definição oficial da NANDA —, planejamento, implementação,
avaliação). Usei pra preencher `definicao` e `indicacoes` de **Registro
de Enfermagem na Consulta de Enfermagem** (`b638cfe3-...`), que antes só
tinha o nível "o que registrar" do guia COFEN.

**Total após esta rodada: 7 specs com conteúdo técnico real além do
guia de registro** (PAM, PVC, Nutrição Parenteral, Hemodiálise,
Cuidados no Pré-Parto, Cuidados na Sala de Parto, Consulta de
Enfermagem).

### Mudança de método: extração por fragmento (Constituição)

O usuário formalizou uma **Constituição de Extração de Conhecimento**
(`docs/constituicao-extracao-conhecimento.md`) que substitui a
heurística de "genre-matching" usada até aqui. Resumo da mudança:

- **Antes**: um livro só era usado se tivesse uma estrutura editorial
  Material → Técnica → Cuidados batendo 1-pra-1 com uma Spec já
  existente. Descartei Brunner & Suddarth e os 2 livros de
  estomaterapia inteiros por não bater essa estrutura.
- **Depois**: todo documento é tratado como conjunto de fragmentos
  (Documento → Capítulos → Seções → Parágrafos → Sentenças →
  Conhecimento). Cada fragmento é avaliado sozinho ("contém
  conhecimento clínico reutilizável?"); se sim, extrai e classifica
  semanticamente (Cuidados, Complicações, Alertas, Condutas etc.),
  independente do documento ter ou não capítulo com esse nome. Um
  livro organizado por doença (como o Brunner & Suddarth) deixa de ser
  descartável — os capítulos de doença ainda contêm cuidados de
  enfermagem, complicações e condutas reaproveitáveis.

**Primeira aplicação**: reabri o Brunner & Suddarth (`BrunnerSuddarth
2016 1.pdf` — conteúdo real confere com "Manual de Enfermagem
Médico-Cirúrgica", trad. do *Clinical Handbook*, 13ª ed., Guanabara
Koogan, copyright 2015; nome do arquivo dizia "2016"/"Tratado", não é o
que está impresso dentro do PDF) e extraí, do capítulo de câncer
colorretal/colostomia (p. 174-180), os fragmentos de cuidado com
ostomia, complicações potenciais e sinais de alerta — mesmo esse
capítulo sendo organizado por doença ("Câncer Colorretal"), não por
procedimento. Usei pra enriquecer **Registro de Enfermagem — Cuidados
com Estomas** (`2afe8946-...`), que antes só tinha o nível "registro"
do guia COFEN: ganhou `materiais`, `cuidados`, `complicacoes` novos, e
`alertas`/`condutas` complementados (mantendo o texto original do
COFEN, só acrescentando). `knowledge_base` resincronizado. Entrada
adicionada em `PDF_METADATA` (`scripts/rag-pipeline.js`).

Isso destrava, em tese, os outros 91 specs sem exigir mais nenhum
download novo — os livros já baixados (Brunner & Suddarth, os 2 de
estomaterapia, KDIGO) passam a ser fonte válida por fragmento, não só
os 6 que bateram por capítulo. Ainda não processados fragmento a
fragmento: resto do Brunner & Suddarth (1152 páginas), o KDIGO —
trabalho real, não instantâneo, mas sem teto artificial de ~10 specs
como antes.

**Segunda rodada (mesma sessão, 7 specs)**: continuando por fragmento
no Brunner & Suddarth e reabrindo os 2 livros de estomaterapia
(antes descartados por gênero):

- **Drenagem de Tórax** (`d7a4c63a-...`), **Drenos** (`4db094fc-...`),
  **Troca de Selo d'Água** (`ec6c8154-...`) — fragmento do capítulo de
  derrame pleural/pneumotórax do Brunner & Suddarth (p. 388-389,
  937-939): `cuidados`, `complicacoes`, `materiais` novos nos 3 (um
  fragmento sobre manejo de dreno torácico alimentou as 3 Specs
  relacionadas, sem duplicar — REGRA 5 da Constituição).
- **Oxigenoterapia** (`5dce52c3-...`) — fragmento do capítulo de DPOC
  (p. 469-471): `cuidados`/`complicacoes`/`materiais` novos, `alertas`/
  `condutas` complementados com o risco de hipercapnia em fluxo alto de
  O2 em cliente com DPOC.
- **Inalação/Nebulização** (`f681807d-...`) — fragmento do capítulo de
  estado de mal asmático (p. 135): uso abusivo de nebulizador como
  fator de risco pra crise asmática grave.
- **Escala de Braden** (`0f08afe8-...`) — reabri "Temas em Enfermagem
  em Estomaterapia" (antes descartado como "coletânea acadêmica",
  REGRA 8 da Constituição: revisão de literatura não é descartável),
  capítulo 12 (p. 154-155): `fundamentacao_cientifica` com a definição
  NPUAP de Lesão por Pressão e os fatores de risco (os mesmos domínios
  avaliados pelas subescalas de Braden), `complicacoes` com o
  estadiamento 1-4.
- **Curativos** (`2e4c31f4-...`) — reabri também "Guia Breve para
  Implantação de Serviço Ambulatorial de Enfermagem em Estomaterapia"
  (antes descartado como "guia administrativo/lista de compras", REGRA
  9 da Constituição: diretriz administrativa fornece materiais
  válidos), lista real de tipos de cobertura (alginato, hidrofibra com
  prata, hidropolímero, carvão ativado etc.) pra `materiais` e
  `cuidados` de seleção de cobertura por tipo de lesão; mais o mesmo
  estadiamento NPUAP do fragmento anterior pra `fundamentacao_cientifica`.

Todos os 7 resincronizados em `knowledge_base` (query SQL única,
replica `composeConteudoKnowledgeBase`/`composeReferenciasTexto`
diretamente em Postgres). Entradas dos 2 livros de estomaterapia
adicionadas em `PDF_METADATA`.

**Total após a Constituição: 8 specs novas enriquecidas nesta rodada**
(Estomas + os 7 acima), além das 7 da rodada anterior — 15 specs de 98
com conteúdo técnico real além do guia de registro.

### Terceira rodada — Constituição de Aproveitamento de Fontes (Tipo A-E)

Usuário formalizou uma segunda camada da Constituição, classificando
fontes por tipo documental (A Procedimento Operacional, B Diretriz
Clínica, C Livro de Doença, D Revisão Científica, E Norma) — nenhuma é
descartável só por não ter técnica operacional; cada tipo alimenta
campos diferentes. Adicionado como addendum em
`docs/constituicao-extracao-conhecimento.md`.

**KDIGO descartado por motivo diferente**: ao abrir `kdigo.pdf` pra
aplicar Tipo B, achei que é um **rascunho de revisão pública** ("KDIGO
2026 AKI/AKD Guideline — PUBLIC REVIEW DRAFT, March 2026", marca d'água
"DRAFT" em toda página, texto explícito "should not be used for any
other purpose beyond its original intent"). Reportei ao usuário antes
de citar — usar conteúdo não publicado/sujeito a mudança como
`citacao_abnt` numa Spec de produção seria diferente de "gênero não
bate" (motivo dos descartes anteriores): é uso fora do escopo que o
próprio documento autoriza. Usuário decidiu deixar o KDIGO de fora e
seguir só com o Brunner & Suddarth (Tipo C).

**Mais 5 specs enriquecidas** (Brunner & Suddarth, Tipo C — capítulos
de laringectomia/traqueostomia p. 221-224 e hipoglicemia p. 641-643):

- **Aspiração Traqueal** (`92996bec-...`) — `cuidados`/`complicacoes`/
  `materiais`: monitorar hipoxia/angústia respiratória antes-durante-
  depois da aspiração, manter material disponível, cuidado com estoma
  de traqueostomia conforme protocolo.
- **Nutrição Enteral, Sondagem Gástrica, Sondagem Enteral**
  (`7e1a0775-...`, `a6c78902-...`, `ad498c60-...`) — mesmo fragmento
  (elevar cabeceira ≥30° durante e 30-45 min após dieta/medicação pela
  sonda, prevenção de aspiração) alimentou as 3 (REGRA 5), cada uma com
  `cuidados`/`complicacoes`/`materiais` redigidos para o contexto
  específico (gástrica vs. enteral vs. nutrição enteral).
- **Glicemia Capilar** (`c2f916ad-...`) — capítulo de hipoglicemia:
  `complicacoes` com a classificação leve/moderada/grave por sintoma,
  `condutas` complementadas com o protocolo de tratamento (15 g de
  carboidrato VO no cliente consciente; glucagon SC/IM ou glicose
  hipertônica 50% IV no inconsciente), `alertas` complementados.

Todas as 5 resincronizadas em `knowledge_base`.

**Total geral: 18 specs de 98 com conteúdo técnico real além do guia
de registro** (7 + 8 + 5, nas 3 rodadas desta sessão). Balanço
Hidroeletrolítico foi tentado e descartado desta rodada — o Brunner só
tem hiponatremia/hipopotassemia embutidas em capítulos de doença
específica (HSA, insuficiência cardíaca etc.), sem uma seção genérica
de distúrbio hidroeletrolítico que sirva pra Spec de registro geral;
manter vazio em vez de forçar o encaixe.

### Quarta rodada — fonte Tipo A nova: OpenRN (NCBI Bookshelf)

Usuário pediu pra achar algo que otimizasse o trabalho. Toda fonte usada
até aqui (Brunner & Suddarth, os 2 livros de estomaterapia) é Tipo C/D —
nenhuma tinha checklist de procedimento passo a passo de verdade, então
`execucao_passos`/`preparacao` continuavam vazios mesmo nas specs já
enriquecidas. Achei o **OpenRN "Nursing Skills, 2nd Edition"**
(Ernstmeyer & Christman, Chippewa Valley Technical College, 2023,
CC-BY 4.0) — 23 capítulos, cada um um checklist real (indicações,
material, passo a passo numerado, parâmetros de segurança, complicações).
Não achei repositório GitHub oficial (só forks de terceiro
redistribuindo o EPUB, fora de escopo); a fonte real é Pressbooks
(bloqueada por 403 no fetch deste sandbox) espelhada no **NCBI
Bookshelf**, que funciona direto, uma URL por capítulo — documentado em
`.claude/skills/kronia-nurse-document-ingestion/SKILL.md` § Step 2b.

Testei no Capítulo 22 (Tracheostomy Care & Suctioning) e confirmou:
indicações, lista de material, parâmetros por faixa etária (pressão de
aspiração), limite de 15s por aspiração, complicações — tudo isso foi
pra **Aspiração Traqueal** (`92996bec-...`), que ganhou `indicacoes` e
o primeiro `execucao_passos` real da sessão (6 passos numerados),
mantendo o `cuidados`/`complicacoes` já vindos do Brunner (multi-fonte,
REGRA 10). `knowledge_base` resincronizado.

**Total geral: 18 specs enriquecidas, 1 delas agora com
`execucao_passos` real.** Próximo: repetir o mesmo padrão pros outros
capítulos do OpenRN que batem com spec já tocada ou pendente (Enteral
Tube Management → Sondagem/Nutrição Enteral; Oxygen Therapy →
Oxigenoterapia; Wound Care → Curativos; Specimen Collection → Glicemia
Capilar/Coleta de Material; IV Therapy Management → Terapia
Intravenosa; Facilitation of Elimination → Sondagem Vesical).

### Quinta rodada — os outros 6 capítulos do OpenRN ("sim e tudo que der")

Puxei os 6 capítulos restantes do NCBI Bookshelf (Enteral Tube
Management, Oxygen Therapy, Wound Care, Specimen Collection, IV Therapy
Management, Facilitation of Elimination) e mapeei pra **10 specs**
(1 capítulo alimentando várias specs relacionadas quando fazia sentido,
REGRA 5):

- **Chapter 17 (Enteral Tube Management)**, 4 sub-skills distintos →
  **Nutrição Enteral** (Skill 2: administração da dieta),
  **Sondagem Enteral** (Skill 1: verificação de posicionamento),
  **Sondagem Gástrica** e **Lavado Gástrico** (Skill 4: descompressão
  gástrica) — cada uma com `execucao_passos` real e específico do
  sub-skill certo, não o mesmo texto copiado 4x.
- **Chapter 11 (Oxygen Therapy)** → **Oxigenoterapia**: `indicacoes`,
  `execucao_passos` (8 passos), fluxos por dispositivo (cateter nasal
  1-6 L/min, máscara simples 6-10 L/min, não reinalante 10-15+ L/min),
  alertas de segurança do cilindro.
- **Chapter 20 (Wound Care)** → **Curativos**: `indicacoes`,
  `contraindicacoes` (escara estável em calcanhar não se desbrida sem
  avaliação vascular), `execucao_passos`, `complicacoes` (antes vazio).
- **Chapter 19 (Specimen Collection)** → **Glicemia Capilar**:
  `execucao_passos` (9 passos), `materiais` e `preparacao` reais.
- **Chapter 23 (IV Therapy Management)** → **Acesso Venoso Periférico**
  (estava 100% vazia): `indicacoes`, `contraindicacoes`, `materiais`,
  `execucao_passos`, `complicacoes` (infiltração vs. extravasamento,
  distinção que a Spec não tinha).
- **Chapter 21 (Facilitation of Elimination)** → **Sondagem Vesical**
  (estava 100% vazia): critérios CDC de indicação/contraindicação,
  `execucao_passos` completo, sinais de ITU-AC; **Irrigação de Sonda
  Vesical e Bexiga**: `cuidados`/`complicacoes`/`materiais` (o capítulo
  não cobre irrigação em si, então usei só os princípios de manejo do
  cateter que se aplicam — bolsa abaixo da bexiga, técnica asséptica,
  sinais de ITU-AC — sem inventar passo de irrigação que a fonte não
  descreve).

Todas as 10 resincronizadas em `knowledge_base`.

**Total geral: 28 specs de 98 enriquecidas nesta sessão**, 9 delas já
com `execucao_passos` real (Aspiração Traqueal + as 8 acima que
ganharam array de passos — Irrigação de Sonda Vesical ficou só com
cuidados/complicações/materiais, sem execucao_passos, porque a fonte
não descreve a técnica de irrigação em si).

### Sexta rodada — mais 4 capítulos OpenRN + achado de licença (OpenStax)

Usuário confirmou que são 23 capítulos ao todo (só tinha usado 7) e
pediu pra continuar. Puxei mais 3:

- **Chapter 3 (Blood Pressure)** → **Sinais Vitais** (estava 100%
  vazia): técnica completa de aferição manual (10 passos, método
  auscultatório), classificação de PA em adultos (normal/elevada/
  hipertensão estágio 1-2/crise hipertensiva/hipotensão/hipotensão
  ortostática), fatores que distorcem a leitura (manguito de tamanho
  errado, cafeína/nicotina, arritmia).
- **Chapter 6 (Neurological Assessment)** → **Avaliação do Nível de
  Consciência** (estava 100% vazia): Escala de Coma de Glasgow (3
  componentes), PERRLA, checklist de avaliação neurológica focada.
- **Chapter 18 (Administration of Parenteral Medications)** →
  **Vacina** e **Registro de Enfermagem na Administração de
  Medicamentos** (ambas 100% vazias nesses campos): técnica de injeção
  IM/SC completa (calibre de agulha, ângulo, sítios anatômicos,
  aspiração), complicações por sítio mal identificado.

Todas as 4 resincronizadas em `knowledge_base`.

**Achado de licença**: usuário mandou print de uma modelagem sugerindo
também **OpenStax Microbiology**, **OpenStax Anatomy & Physiology** e
"OpenStax Pathophysiology" (este último não confirmei que existe).
Verifiquei as licenças antes de usar qualquer uma — **Microbiology** e
**Anatomy and Physiology 2e** são **CC BY-NC-SA** (NonCommercial — uso
comercial proibido), só a 1ª edição de **Anatomy and Physiology** é
CC BY puro (uso comercial permitido). Se KRONIA Nurse for produto
comercial, usar as versões NC violaria a licença — mesma categoria de
problema do caso do KDIGO rascunho (achar antes de usar, não depois).
Reportado ao usuário, aguardando confirmação se o produto é comercial
antes de decidir usar Microbiology/A&P 2e ou só a 1ª edição de A&P.

**Total geral: 32 specs de 98 enriquecidas nesta sessão.** Faltam 16
capítulos do OpenRN ainda não tocados (General Survey, Health History,
Aseptic Technique, Math Calculations, Head-Neck/Eye-Ear/Cardiovascular/
Respiratory/Abdominal/Musculoskeletal/Integumentary Assessment,
Administration of Enteral Medications, Administration of Medications
Via Other Routes, Specimen Collection — partes ainda não usadas).

### Sétima rodada — decisão de licença + Chapter 1 + Chapter 4 (EPIs)

Usuário confirmou: KRONIA Nurse **vai virar comercial, mas ainda não
é**. Decisão: não usar Microbiology nem A&P 2e (CC BY-NC-SA) mesmo
enquanto o produto não é comercial — o conteúdo entra na
`knowledge_base` e continuaria lá depois da virada comercial, então
usar agora só adiaria a violação, não evitaria. Se precisar de
anatomia/fisiologia, usar só a 1ª edição de Anatomy and Physiology
(CC BY puro). OpenRN nunca teve esse problema (sempre CC BY).

- **Chapter 1 (General Survey)** → **Admissão do Paciente** (tinha só
  `registro`, sem `execucao_passos`): modelo AIDET de abordagem,
  checagem primária de estabilidade, avaliação sistemática (aparência,
  comportamento, mobilidade, comunicação, sinais vitais completos).
- **Chapter 4 (Aseptic Technique)** — conteúdo genérico (higienização
  das mãos, ordem de paramentação/desparamentação de EPI, princípios de
  campo estéril) que se aplica a várias specs já enriquecidas mas que
  nunca tinham o campo `epis` preenchido (campo ficou vazio em toda
  spec da sessão até aqui). Preenchido em **Sondagem Vesical**,
  **Acesso Venoso Periférico**, **Curativos**, **Aspiração Traqueal** e
  **Cuidados com Estomas** — cada um com o EPI certo pro nível de
  técnica (estéril vs. limpa) daquele procedimento específico, não o
  mesmo texto genérico repetido.

Todas as 6 resincronizadas em `knowledge_base`.

**Total geral: 33 specs de 98 enriquecidas nesta sessão** (32 + 1 nova,
mais 5 que ganharam só o campo `epis` sobre spec já contada antes).

### Oitava rodada — Chapter 15 (medicação enteral) e Chapter 8 (Snellen)

- **Chapter 15 (Administration of Enteral Medications)** →
  **Os 13 Certos na Administração de Medicamentos** (tinha `alertas`/
  `condutas`/`fundamentacao_cientifica` mas zero `execucao_passos` —
  spec sobre um checklist que nunca tinha o passo a passo do próprio
  checklist): passo a passo da checagem tripla (seleção → preparo →
  beira do leito), mais nota de `fundamentacao_cientifica` comparando
  os "6 rights" americanos (OpenRN) com os 13 certos brasileiros
  (COFEN) — mesma lógica, escopo diferente. Também usado pra
  complementar **Nutrição Enteral** e **Sondagem Enteral** com a regra
  de trituração de medicamento pra sonda (nunca triturar revestimento
  entérico/liberação prolongada; lavar com no mínimo 15 mL de água
  antes/entre medicamentos).
- **Chapter 8 (Eye and Ear Assessment)** → **Escala de Snellen**
  (estava 100% vazia nesses campos): distância de 6 m do quadro,
  técnica de testar cada olho, notação em fração (20/20 etc.).

Todas as 4 resincronizadas em `knowledge_base`.

**Total geral: 35 specs de 98 enriquecidas nesta sessão.**

### Nona rodada — Chapter 16 (outras vias) e resto do Chapter 19

- **Chapter 16 (Administration of Medications Via Other Routes)** →
  **Inalação/Nebulização** ganhou `execucao_passos` (nebulizador E
  inalador dosimetrado com espaçador, que faltavam) e complicação de
  candidíase oral por corticosteroide inalatório sem higiene oral.
  Achado de segurança à parte, forte o bastante pra virar
  `contraindicacoes` de **Aplicação de Calor e Frio** (estava 100%
  vazia): nunca aplicar calor sobre adesivo transdérmico (fentanila,
  nitroglicerina) — o calor aumenta a liberação do fármaco e pode
  causar overdose e óbito. Fato batendo em spec diferente da que eu
  esperava (REGRA 5 — um fragmento pode alimentar Spec fora do capítulo
  "óbvio" quando o conteúdo realmente se aplica).
- **Chapter 19, parte não usada antes (swab orofaríngeo/nasal)** →
  **Coleta de Material para Exames** (estava 100% vazia): técnica de
  coleta de swab (orofaríngeo, nasal anterior, nasofaríngeo) como
  exemplo de coleta respiratória — a fonte não cobre venopunção nem
  coleta de urina, então não inventei essas partes, só documentei o que
  realmente estava lá.

Todas as 3 resincronizadas em `knowledge_base`.

**Total geral: 38 specs de 98 enriquecidas nesta sessão.**

### Décima rodada — Chapter 2 (Health History) e Chapter 13 (Musculoesquelético)

- **Chapter 2 (Health History)** → **Consulta de Enfermagem**
  (já tinha `indicacoes`/`registro` da SAE, mas nunca `execucao_passos`):
  8 passos cobrindo dados demográficos, mnemônico PQRSTU pro motivo da
  consulta, histórico atual/pregresso/familiar, padrões funcionais de
  saúde, revisão de sistemas e técnica de entrevista.
- **Chapter 13 (Musculoskeletal Assessment)** → **Imobilização** (100%
  vazia): contratura como complicação de imobilidade (substituição de
  tecido elástico por fibroso), amplitude de movimento passiva como
  cuidado preventivo. **Escala de Queda de Morse** (100% vazia nesses
  campos): pergunta padronizada de triagem de queda prévia, passo a
  passo de aplicação da escala, reavaliação após queda/mudança clínica.

Todas as 3 resincronizadas em `knowledge_base`.

**Total geral: 41 specs de 98 enriquecidas nesta sessão.**

### Décima primeira rodada — últimos capítulos do OpenRN (23/23 revisados)

Usuário pediu pra continuar até zerar os 23 capítulos. Últimos 6
revisados:

- **Chapter 9 (Cardiovascular Assessment)** → **finalmente preencheu
  Balanço Hidroeletrolítico** (spec que eu tinha desistido de
  enriquecer numa rodada anterior por falta de fonte genérica boa):
  escala de graduação de edema (1+ a 4+), turgência jugular, pulsos
  periféricos (escala 0-3), tempo de enchimento capilar, B3/galope como
  sinal de sobrecarga de volume.
- **Chapter 14 (Integumentary Assessment)** — complementou a mesma
  Spec com um achado importante: turgor cutâneo NÃO é indicador
  confiável de hidratação (principalmente em idoso, que tem
  elasticidade da pele naturalmente menor) — vira `alertas`, corrige
  prática comum equivocada.
- **Chapter 10 (Respiratory Assessment)** → **Sinais Vitais**:
  classificação de sons respiratórios adventícios (estertores, sibilos,
  estridor, atrito pleural) e parâmetros de frequência respiratória
  normal/bradipneia/taquipneia.
- **Chapter 12 (Abdominal Assessment)** → **Sondagem Gástrica**:
  técnica de ausculta de ruídos hidroaéreos (início no QID, sentido
  horário) e interpretação (hiperativo = obstrução/gastroenterite;
  hipoativo = constipação/pós-operatório/peritonite/íleo paralítico).
- **Chapter 5 (Math Calculations)** → **Os 13 Certos** (checagem da
  faixa de dose segura antes de administrar) e **Acesso Venoso
  Periférico** (cálculo de taxa de infusão — gotas/min por gravidade ou
  mL/h por bomba).
- **Chapter 7 (Head and Neck Assessment)** — revisado, mas **sem
  spec de destino real**: cobre linfonodo, tireoide, exame de
  cavidade oral — nenhuma Spec do KRONIA é sobre exame de
  cabeça/pescoço em si. Deixado de fora em vez de forçar encaixe em
  spec não relacionada (ex.: Higiene Oral não é sobre avaliação
  clínica, é sobre procedimento de higiene) — único capítulo dos 23
  sem uso.

Todas as 5 specs tocadas nesta rodada resincronizadas em
`knowledge_base`.

**Total final: 46 specs de 98 enriquecidas nesta sessão** (de um total
de 98 specs ativas — quase a metade). **22 dos 23 capítulos do OpenRN
usados** (só Chapter 7 sem spec de destino). Próxima fronteira real
exigiria fonte nova (mais PDFs do Drive, ou preencher `escopo`/
`equipamentos` que quase nenhuma spec tem ainda) — não mais o
"Nursing Skills" do OpenRN, que estava esgotado pra este corpus.

### Décima segunda rodada — segundo livro do OpenRN: "Nursing Fundamentals"

Ao esgotar "Nursing Skills", busquei se existia livro-irmão do OpenRN
(mesmo autor/editora/licença CC BY 4.0) — achei **"Nursing
Fundamentals"** (Ernstmeyer & Christman, CVTC, 2021, NCBI Bookshelf
`NBK591823`, 19 capítulos, slug diferente:
`/books/n/openrnnf/<capitulo>/`, não `openrnns2e`). Cobre conceito/ADL
(mobilidade, conforto, segurança, sono, eliminação) em vez de checklist
de procedimento — preenche exatamente as Specs de "Fundamentos de
Enfermagem" que `Nursing Skills` não alcançava. Documentado em
`.claude/skills/kronia-nurse-document-ingestion/SKILL.md` § Step 2c.

- **Chapter 13 (Mobility)** → **Mudança de Decúbito** (reposicionar a
  cada 2h, avaliação de risco antes) e **Estímulo à Deambulação**
  (técnica com cinto de transferência/gait belt, complicações da
  imobilidade que a deambulação previne — TVP, pneumonia, perda de 20%
  de força muscular por semana).
- **Chapter 11 (Comfort)** → **Controle da Dor** (escala numérica,
  PQRSTU, FLACC pra criança/não comunicativo, PAINAD pra demência
  avançada) e **Massagem de Conforto** (como medida não farmacológica).
- **Chapter 5 (Safety Introduction)** → **Contenção no Leito**
  (indicação só após alternativa menos restritiva falhar, avaliação
  médica em até 1h, o que documentar) e **Condutas de Segurança ao
  Paciente** (rondas de hora em hora, cama baixa, campainha ao alcance).
- **Chapter 16 (Elimination)** testado pra Enteróclise/TRO — fonte
  fina demais (uma frase cada, sem procedimento real); não usado, pra
  não forçar conteúdo fraco (REGRA 11).

Todas as 6 specs tocadas resincronizadas em `knowledge_base`.

**Total final da sessão: 52 specs de 98 enriquecidas** (mais da
metade). Restam capítulos do "Nursing Fundamentals" ainda não
explorados (Nutrition, Infection, Integumentary, Sleep and Rest, Care
of the Older Adult) que podem render mais specs numa próxima rodada.

### Décima terceira rodada — últimos capítulos do "Nursing Fundamentals"

Fechando os 19 capítulos deste segundo livro:

- **Chapter 14 (Nutrition)** → **Auxílio na Dieta**: posicionamento
  sentado antes de comer, higiene oral prévia, espessantes por grau de
  disfagia (néctar/mel/pudim), abandono do "teste do sopro" (mesma
  ressalva do Chapter 17 de Nursing Skills — reforça a fonte).
- **Chapter 19 (Care of the Older Adult)** → **Alta** (segurança
  ambiental no domicílio, reconciliação medicamentosa, encaminhamento a
  recurso comunitário) e **Visita Domiciliar** (ferramenta SPICES —
  Sono, Problemas de alimentação, Incontinência, Confusão, Evidência de
  queda, Skin breakdown — como roteiro de avaliação domiciliar).
- **Chapter 10 (Integumentary)** — revisado, mas só repete
  estadiamento de Lesão por Pressão/Escala de Braden já cobertos por
  outra fonte; sem técnica de higiene (banho, couro cabeludo, pés,
  íntima) como o nome sugeria. Não usado.
- **Chapter 9 (Infection)** — revisado, cadeia de infecção (6 elos)
  é conteúdo real mas genérico demais pra qualquer Spec específica do
  corpus (não achei "Precauções de Isolamento" nem afim na lista);
  parte sobre precaução por contato/gotícula/aerossol não veio no
  texto extraído. Não usado.
- **Chapter 12 (Sleep and Rest)** e **Chapter 17 (Grief and Loss)** —
  sem Spec de destino no corpus do KRONIA (não existe "registro de
  sono" nem "registro de luto" na taxonomia atual). Não usados.

Todas as 3 specs tocadas resincronizadas em `knowledge_base`.

**Total final da sessão: 55 specs de 98 enriquecidas.** "Nursing
Fundamentals" esgotado — dos 19 capítulos, 8 renderam conteúdo usável
(Safety, Comfort, Mobility, Nutrition, Care of the Older Adult), os
outros 11 ou não tinham Spec de destino no corpus, ou vieram finos
demais pra usar sem forçar.

### Décima quarta rodada — OpenStax Anatomy and Physiology (1ª edição, CC BY)

Usuário pediu pra seguir na OpenStax — usando **só a 1ª edição**
(`openstax.org/books/anatomy-and-physiology`, CC BY 4.0, Rice
University, 2016), nunca a 2ª edição nem o Microbiology (CC BY-NC-SA,
vetados pela regra de licença desta sessão). Diferente do OpenRN, este
livro é 28 capítulos de ciência básica (anatomia/fisiologia), não
checklist de procedimento — serve principalmente pra `fundamentacao_
cientifica`, campo que quase nenhuma Spec tinha preenchido.

- **Chapter 26.1 (Body Fluids and Fluid Compartments)** →
  **Balanço Hidroeletrolítico**: definição de fluido intracelular
  (~60% da água corporal) vs. extracelular (plasma + intersticial),
  mecanismo de deslocamento por osmose, papel da bomba de
  sódio-potássio, edema como distúrbio de volume.
- **Chapter 5.1 (Layers of the Skin)** → **Curativos**: correlação
  anatômica com o estadiamento de lesão por pressão já registrado —
  epiderme avascular (por que lesão superficial não sangra, estágio
  1-2), derme vascularizada (por que lesão mais profunda sangra,
  estágio 2-3), hipoderme/fáscia (estágio 4).

`openstax.org` bloqueia fetch na página inicial (403/vazio, JS-only),
mas páginas de capítulo/seção individuais (`/pages/<num>-<slug>`)
funcionam normalmente — usar esse padrão de URL, não a raiz do livro.
Tentativa de achar o slug exato da seção de uretra (Chapter 25, pra
Sondagem Vesical) falhou (404) e não foi repetida por ora — 28
capítulos de conteúdo majoritariamente não-procedural tornam essa
fonte mais lenta por capítulo que o OpenRN; render bom só quando o
capítulo bate com uma Spec já enriquecida que carece especificamente
de `fundamentacao_cientifica`.

Ambas as 2 specs resincronizadas em `knowledge_base`.

**Total final da sessão: 55 specs de 98 enriquecidas** (a OpenStax
complementou 2 specs já contadas, sem abrir spec nova — por isso o
total não mudou, só a profundidade).

### Décima quinta rodada — wong.pdf: achado de contorno pro limite de 10MB

Usuário pediu pra usar o `wong.pdf` (item #16 da triagem, *Wong:
Fundamentos de Enfermagem Pediátrica*, Hockenberry e Wilson, Elsevier,
9ª ed. 2014) — 44MB, confirmado pelo usuário como **3092 páginas**.
Nem `download_file_content` (limite de 10MB) nem `read_file_content`
(parou silenciosamente em ~180 de 3092 páginas, só front matter) davam
conta. Achei um contorno real: o arquivo estava compartilhado por link
("qualquer pessoa com o link"), o que permite baixar via `curl` direto
(sem passar pela ferramenta MCP) — a primeira request retorna uma
página de aviso de "não foi possível escanear vírus" pra arquivo
grande, com um formulário oculto (`confirm`/`uuid`); repetir a request
com esses parâmetros pro host de download baixa o PDF completo. Extração
com PyMuPDF: 3092 páginas, 7,4M caracteres, ~5 segundos. Documentado
como técnica reutilizável em
`.claude/skills/kronia-nurse-document-ingestion/SKILL.md` § Step 5.

Com o texto completo, achei conteúdo real e específico do Brasil pra 4
specs de Neonatologia/Obstetrícia que estavam 100% vazias:

- **Fototerapia** (p. 699-705): checklist completo de cuidado de
  enfermagem — proteção ocular (fechar pálpebras antes do protetor,
  checar a cada plantão), termorregulação, avaliação de bilirrubina a
  cada 6-12h, o que registrar, efeitos colaterais (fezes esverdeadas,
  rash, priapismo, efeito rebote), alerta contra luz solar direta.
- **Cuidados Imediatos com o RN** (p. 520-521, 562-565): Índice de
  Apgar (tabela completa dos 5 parâmetros), identificação (com o trecho
  específico do Estatuto da Criança e do Adolescente sobre impressão
  plantar/digital), profilaxia ocular (nitrato de prata conforme
  Ministério da Saúde), vitamina K IM, vacina de hepatita B, segurança
  contra sequestro de RN.
- **Teste do Pezinho** (p. 565-567): base legal real (Portaria
  GM/MS nº 822/2001, Programa Nacional de Triagem Neonatal), as 9
  responsabilidades específicas do profissional de enfermagem segundo o
  PNTN — direto pra `execucao_passos`.
- **Ordenha Mamária** (p. 585-586, 707): duas indicações distintas com
  técnica própria (ordenha precoce a cada 2-3h se RN não mama, ordenha a
  cada 3-4h durante pausa por icterícia), alerta sobre não descongelar
  leite humano em micro-ondas.

Todas as 4 resincronizadas em `knowledge_base`. Entrada adicionada em
`PDF_METADATA`; linha #16 do triage doc atualizada com dados
confirmados (antes só estimativas).

**Total final da sessão: 59 specs de 98 enriquecidas** — quase 60%.

### Ferramentas de extração avaliadas nesta sessão (usuário forneceu 4 zips)

Testadas de verdade no mesmo PDF de 151 páginas pra comparação justa —
ver `.claude/skills/kronia-nurse-document-ingestion/SKILL.md` (Steps
1/1b/1c) pro guia completo:

| Ferramenta | Resultado | Uso recomendado |
|---|---|---|
| **PyMuPDF** (`pymupdf`) | 0,23s/151 pág.; substitui `pdffonts`/`pdftotext`/`pdftoppm` inteiros | Padrão — sempre começar por aqui |
| **pdfplumber** | ~5s/499 pág.; único que reconstrói tabela célula-por-célula | Quando a página tem tabela real (estadiamento, dosagem) |
| **MinerU** | ~6-7min/151 pág., 1,1GB de modelo, mas termina | Layout complexo/scan real, quando PyMuPDF falha |
| **marker** (`marker-pdf`) | **Morreu em 64% após 6+ min**, ~10GB RAM, zero output | **Não usar neste sandbox** |
| headroom (não é ferramenta de PDF) | Assistente de IA de terminal genérico | Fora de escopo, ignorado |

Isso já mudou a ferramenta padrão de extração usada nesta própria sessão
(era pdfminer/pypdf, virou PyMuPDF) — reflete-se nos specs enriquecidos
acima, que usaram PyMuPDF pra ler os PDFs-fonte.

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
