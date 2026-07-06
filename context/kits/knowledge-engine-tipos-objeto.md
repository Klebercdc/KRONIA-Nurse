# KIT — Knowledge Engine: Tipos de Objeto de Conhecimento

> Formato: Cavekit (`ck:cavekit-methodology`), fase **Draft**. Detalha o
> Domínio 2 (Knowledge Engine) de `context/kits/kronos-arquitetura-cognitiva.md`
> — um documento por "título" listado na arquitetura cognitiva como exemplo de
> conteúdo que deve virar Objeto de Conhecimento. Sem código, sem conteúdo
> clínico redigido — só o schema/contrato de cada tipo.

## Como ler este kit

Para cada título: **Status** no código atual, **Campos próprios** que esse
tipo precisa (além dos campos comuns abaixo), e **Observação** sobre reuso ou
conflito com o que já existe.

### Campos comuns a todo Objeto de Conhecimento (já existem)

Vêm de `knowledge_base` (`supabase/migrations/20260630_schema_completo.sql`):
`id, titulo, resumo, categoria, subcategoria, especialidade, palavras_chave,
conteudo, referencias, autor, data_revisao, embedding, created_at,
updated_at, deleted_at`.

Todo tipo novo herda esses campos — a discussão abaixo é só sobre o que cada
um precisa **além** disso.

---

## 1. Procedimentos

**Status:** ✅ já coberto. É exatamente o que `knowledge_specs` (via
`lib/knowledge-spec.ts`) modela hoje: `indicacoes, contraindicacoes,
materiais, preparacao, procedimento, cuidados, complicacoes,
prevencao_eventos_adversos, pontos_criticos, observacoes, limitacoes,
variacoes_institucionais`.

**Observação:** nenhuma mudança necessária.

---

## 2. Protocolos

**Status:** ✅ coberto pelo mesmo schema de Procedimentos — um Protocolo é,
na prática, um Procedimento com escopo institucional mais amplo.

**Observação:** tratar como o mesmo tipo (`categoria = "Protocolo"` já
diferencia na navegação, ver `ICONE_CATEGORIA` em `pages/biblioteca.tsx`).
Não precisa de tabela/schema separado.

---

## 3. POPs (Procedimento Operacional Padrão)

**Status:** ✅ coberto — mesma observação do item 2. POP é a mesma forma,
só varia o nível de formalidade institucional.

---

## 4. Diagnósticos de Enfermagem (NANDA-I)

**Status:** ❌ não existe. `knowledge_specs` não tem campo pra isso — um
diagnóstico NANDA-I não tem "procedimento" nem "materiais".

**Campos próprios necessários:**
- `dominio_nanda` / `classe_nanda` (taxonomia NANDA-I — ex.: Domínio 4, Classe 4)
- `definicao` (definição formal do diagnóstico)
- `caracteristicas_definidoras` (lista — sinais/sintomas observáveis)
- `fatores_relacionados` (causas/condições associadas — diagnóstico real)
- `fatores_de_risco` (só se for diagnóstico de risco, não real)
- `populacao_em_risco` / `condicoes_associadas` (NANDA-I 2018-2020 usa esses termos)
- `codigo_nanda` (ex.: 00132 — código oficial da edição)

**Observação:** a fonte primária já está na pasta do Drive
(`NANDA-I-2018_2020.pdf`). Esse é o tipo de objeto onde a rastreabilidade
por página (lacuna já registrada no Domínio 1 do kit de arquitetura) mais
importa — cada característica definidora precisa apontar pra página exata
do livro.

---

## 5. Intervenções (NIC)

**Status:** ❌ não existe.

**Campos próprios necessários:**
- `codigo_nic`
- `definicao`
- `atividades` (lista de ações de enfermagem que compõem a intervenção)
- `campo_classe_nic` (taxonomia NIC)
- `diagnosticos_relacionados` (liga a objetos do tipo Diagnóstico — ver Domínio 2 do kit de arquitetura sobre relações entre objetos, hoje inexistentes)

**Observação:** fonte candidata: `Ligacoes-entre-NANDA-NOC-e-NIC-Marion-Joh(2).pdf`
(já está na pasta do Drive).

---

## 6. Resultados (NOC)

**Status:** ❌ não existe.

**Campos próprios necessários:**
- `codigo_noc`
- `definicao`
- `indicadores` (lista de indicadores mensuráveis do resultado)
- `escala_medida` (ex.: escala Likert de 1-5 usada pela NOC)
- `dominio_classe_noc`

**Observação:** mesma fonte candidata do item 5.

---

## 7. NANDA-I (taxonomia completa) / CIPE

**Status:** ❌ não existe como estrutura própria — está listado separado do
item 4 na arquitetura original, mas na prática é a mesma entidade
(Diagnóstico de Enfermagem). CIPE (Classificação Internacional para a
Prática de Enfermagem) é uma taxonomia concorrente/complementar à NANDA-I,
com estrutura de eixos própria (Foco, Julgamento, Meios, Ação, Tempo,
Localização, Cliente).

**Observação:** decisão em aberto — ver "Perguntas Abertas". Se o produto vai
usar NANDA-I e CIPE simultaneamente, cada uma precisa do próprio schema (não
dá pra forçar CIPE dentro do formato NANDA-I, os eixos são diferentes).

---

## 8. Medicamentos

**Status:** ❌ não existe.

**Campos próprios necessários:**
- `principio_ativo`, `nome_comercial` (pode ter múltiplos por princípio ativo)
- `classe_farmacologica`
- `apresentacoes` (concentração, forma farmacêutica)
- `vias_administracao`
- `dose_padrao` (adulto/pediátrico — provavelmente precisa de subcampos)
- `diluicao_preparo`
- `tempo_infusao`
- `contraindicacoes`, `interacoes_medicamentosas`
- `reacoes_adversas`
- `cuidados_de_enfermagem`
- `armazenamento`

**Observação:** é o tipo mais arriscado clinicamente (erro de dose/via é
evento adverso grave) — deveria ser o primeiro candidato a ter Validation
Engine em tempo de resposta (Domínio 3 do kit de arquitetura) antes de
qualquer coisa ir pro ar, mesmo que os outros tipos ainda não tenham.

---

## 9. Diretrizes / RDC / Normas de COFEN, COREN, ANVISA, Ministério da Saúde

**Status:** ⚠️ parcialmente coberto — mas pelo lugar errado de acordo com o
princípio "nunca tratar como documento isolado". Hoje `conhecimento_documentos`
(RAG) já modela exatamente isso: `tipo_documento` (RDC, Portaria, Caderno,
Diretrizes, Legislação, Guia...) + `instituicao` (ANVISA, COFEN, COREN-SP,
Ministério da Saúde). É o schema certo pro *documento fonte*, mas ele não
vira Objeto de Conhecimento navegável — fica só como material de RAG.

**Decisão necessária:** uma Diretriz/RDC deveria também existir como um
resumo estruturado em `knowledge_base` (o que o enfermeiro vê e navega),
com o `conhecimento_documento` correspondente citado como fonte. Ou seja,
não é um tipo de schema novo — é uma composição: normativo em
`conhecimento_documentos` (já existe) + resumo em `knowledge_base` (falta
o passo que gera esse resumo a partir do documento indexado).

---

## 10. Escalas Clínicas

**Status:** ❌ não existe estrutura de dados — mas já existe UI/lógica
correlata: o kit de arquitetura cita "Skill Calcular Glasgow" e "Skill
Calcular Escalas" como exemplos de Skill Engine, e há uma rota `/escalas`
no app (`Layout.tsx` já trata `rota === '/escalas'` como parte da navegação
KRONOS).

**Campos próprios necessários:**
- `itens` (lista de perguntas/critérios, cada um com pontuação)
- `faixa_pontuacao` (mínimo/máximo possível)
- `interpretacao` (o que cada faixa de pontuação significa clinicamente)
- `formula_calculo` (se não for soma simples)

**Observação:** essa é a interseção mais direta com Skill Engine —
o Objeto de Conhecimento guarda a definição da escala; uma Skill
("Calcular Glasgow") consome esse objeto e executa o cálculo. Verificar se
`/escalas` hoje já tem alguma estrutura de dados pra escala antes de propor
uma nova (não explorado neste kit).

---

## 11. Cálculos

**Status:** ❌ não existe.

**Campos próprios necessários:**
- `formula` (expressão ou passo a passo)
- `variaveis` (nome, unidade, faixa válida de cada variável de entrada)
- `unidade_resultado`
- `interpretacao_clinica` (faixas de referência do resultado)

**Observação:** mesma relação com Skill Engine do item 10 (ex.: "Skill
Calcular IMC" consumindo o Objeto de Conhecimento "Cálculo de IMC").

---

## 12. Checklists

**Status:** ❌ não existe como Objeto de Conhecimento — mas existe como
*saída* (o kit de arquitetura lista "Checklist" também como formato do
Transformer Engine, e "Skill Gerar Checklist" no Skill Engine).

**Decisão necessária:** um Checklist é conteúdo próprio (uma lista de itens
de verificação com identidade e fonte, ex.: "Checklist de Cirurgia Segura da
OMS") ou é sempre *gerado* a partir de outro Objeto de Conhecimento (ex.:
extrair os passos de "cuidados" de um Procedimento)? Isso muda se precisa de
schema próprio ou não.

---

## 13. Fluxos Assistenciais

**Status:** ❌ não existe como Objeto de Conhecimento — e conceitualmente
pertence mais ao Workflow Engine (Domínio 6 do kit de arquitetura) do que ao
Knowledge Engine. A arquitetura original lista como exemplo de conteúdo,
mas um fluxo (Admissão → Avaliação → Diagnóstico → ...) é uma sequência de
etapas, não uma "ficha" de conhecimento como Procedimento/Medicamento.

**Observação:** recomendo mover este item pro escopo do Workflow Engine, não
duplicar como tipo de Knowledge Object.

---

## 14. Educação Permanente

**Status:** ❌ não existe. É o menos definido de todos os títulos — pode
significar conteúdo de treinamento/capacitação (cursos, módulos, avaliação de
aprendizado), que é um produto bem diferente de "consulta rápida de
procedimento".

**Observação:** maior risco de escopo mal definido da lista inteira.
Precisa de uma conversa própria antes de virar schema — não estimo campos
aqui sem entender se é conteúdo estático, trilha de curso, ou avaliação.

---

## Resumo — Status por título

| Título | Status | Schema novo necessário? |
|---|---|---|
| Procedimentos | ✅ coberto | Não |
| Protocolos | ✅ coberto | Não |
| POPs | ✅ coberto | Não |
| Diagnósticos de Enfermagem (NANDA-I) | ❌ falta | Sim |
| Intervenções (NIC) | ❌ falta | Sim |
| Resultados (NOC) | ❌ falta | Sim |
| CIPE | ❌ falta | Sim (schema próprio, diferente de NANDA-I) |
| Medicamentos | ❌ falta | Sim — maior risco clínico |
| Diretrizes/RDC/COFEN/COREN/ANVISA/MS | ⚠️ parcial (RAG existe, resumo navegável falta) | Composição, não schema novo |
| Escalas Clínicas | ❌ falta | Sim |
| Cálculos | ❌ falta | Sim |
| Checklists | ❌ falta | Depende de decisão (gerado vs. próprio) |
| Fluxos Assistenciais | ❌ falta | Não — mover para Workflow Engine |
| Educação Permanente | ❌ indefinido | Precisa definição antes de tudo |

---

## Perguntas Abertas (bloqueiam Draft → Architect)

1. NANDA-I e CIPE vão coexistir no produto, ou só uma taxonomia de
   diagnóstico será adotada? Isso decide se o item 7 vira um ou dois schemas.
2. Diretrizes/RDC/normas (item 9): confirma que o formato certo é
   "documento fonte em `conhecimento_documentos` + resumo navegável em
   `knowledge_base`", em vez de um schema totalmente novo?
3. Checklists (item 12): existem como conteúdo próprio com fonte oficial
   (ex.: Checklist de Cirurgia Segura), ou são sempre derivados de outro
   objeto via Transformer Engine?
4. Educação Permanente (item 14): o que é, na prática, esse conteúdo? Sem
   essa resposta não dá pra propor schema.
5. Qual desses tipos entra primeiro? Dado o risco clínico, Medicamentos
   (item 8) parece o candidato mais sensível a acertar cedo — mas também o
   mais caro de fazer errado sem Validation Engine em tempo de resposta
   pronto (ver Domínio 3 do kit de arquitetura).
