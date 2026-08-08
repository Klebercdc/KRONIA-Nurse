# Tela "Evoluir" — auditoria, propostas e bloqueios

Resposta aos passos 0–6. Nada dos passos 1, 2, 3, 5 e 6 foi implementado —
todos pedem validação antes. Só o PASSO 0 e a troca de terminologia do
PASSO 4 foram executados.

**Evidência de execução está no fim do documento (§7).**

---

## PASSO 0 — Fontes ✅ FEITO

`lib/fonts.ts` (novo) carrega as três famílias via `next/font/google`;
`pages/_app.tsx` aplica as variables num wrapper `display:contents`;
`styles/globals.css` encadeia as variables nos tokens existentes pela classe
estável `.kronia-fontes`.

Nenhum componente mudou — os tokens `--font-display` / `--font-body` /
`--font-mono` continuam com os mesmos nomes.

Duas decisões que vale registrar:

1. **`next/font` não pode ser chamado de `_document.tsx`** (o Next lança
   *"Font loaders cannot be called from _document"*). Por isso o wrapper em
   `_app.tsx`. `display:contents` mantém a caixa fora da árvore de layout —
   herança de custom property funciona igual.
2. **As classes que o `next/font` gera são hasheadas**, então o encadeamento
   não pode morar nelas. Mora em `.kronia-fontes`, aplicada no mesmo wrapper.

### ⚠️ Achado: peso 800 não existe em duas das três famílias

| Família | Pesos reais no Google Fonts | O CSS pede |
|---|---|---|
| Space Grotesk | 300–700 | **800** em `.avatar`, splash do `_app` |
| IBM Plex Mono | 100–700 | **800** em `.stat-card-value`, `.sessao-hora-pill` |
| Inter | 100–900 | 400–800 — OK |

Onde o CSS pede 800 nessas duas famílias, o navegador **sintetiza** (faux
bold). Pedi só os pesos reais em `lib/fonts.ts`. Duas saídas, ambas sua
decisão — **não mexi**:

- baixar esses usos de `800` → `700` (fidelidade tipográfica), ou
- aceitar o faux bold (mantém o peso visual que você já aprovou).

---

## PASSO 1 — 🛑 BLOQUEIO: `VISIBILITY_RULES` não é o que o brief assume

Este é o bloqueio principal. Rodei a busca no repositório inteiro:

```
grep -rn "VISIBILITY_RULES" .          → 2 arquivos, ambos HTML avulso:
  ./kronia-nurse-motor-condicional.html:276
  ./public/evolucao-facil.html:276     (byte-a-byte idêntico ao primeiro)
```

**`VISIBILITY_RULES` não existe no código TypeScript do app.** Existe só em
dois protótipos HTML estáticos, idênticos entre si, que não são importados
por nenhuma página.

E o que ele contém não são setores. São **13 regras de campo** dentro de um
único formulário:

```js
const VISIBILITY_RULES = {
  glasgow:                  s => s.neuro.modo !== 'Sedado',
  camIcuAviso:              s => s.neuro.modo === 'Sedado' && parseInt(s.neuro.rass) <= -3,
  respVMDetalhe:            s => s.resp.suporte === 'Ventilação mecânica invasiva',
  respFluxoO2:              s => s.resp.suporte === 'Cateter nasal' || s.resp.suporte === 'Máscara',
  respSecrecaoDetalhe:      s => s.resp.aspiracao === 'sim',
  paInvasivaDetalhe:        s => s.hemo.paTipo === 'invasiva',
  dorAutorrelatoValido:     s => !(s.neuro.modo === 'Sedado' && parseInt(s.neuro.rass) <= -3),
  peleLpDetalhe:            s => s.pele.integridade === 'Lesão por pressão',
  dietaOralDetalhe:         s => s.gi.dietaVia === 'Oral',
  dietaSondaAtalho:         s => s.gi.dietaVia === 'Por sonda',
  dietaParenteralAtalho:    s => s.gi.dietaVia === 'Parenteral',
  diureseAspectoSimples:    s => s.elim.diurese === 'Espontânea',
  diureseDispositivoAtalho: s => s.elim.diurese === 'Por dispositivo'
};
```

Não há chave `uti`, `cc`, `clinMed`, `hemodialise`, `puerperio`, `emergencia`
— **nenhum conceito de setor, em lugar nenhum do projeto.** A frase do brief
"Já devem existir: UTI, Centro Cirúrgico, Clínica Médica, Clínica Cirúrgica,
Hemodiálise, Puerpério, Emergência" não corresponde ao código.

### O que existe de verdade

O motor de produção é outro: `lib/evolucao/`, organizado por **tipo de
documento**, não por setor.

- **`DOC_TYPES`** (`document-types.ts`): **35 tipos**, em 7 grupos
  (`admissao`, `evolucao`, `alta`, `transferencia`, `procedimento`,
  `intercorrencia`, `especifico`).
- **`FIELD_SCHEMAS`** (`field-schemas.ts`): só **8 tipos** têm campos.

| Tipo | Tem schema de campos? |
|---|---|
| `admissao_hospitalar` | ✅ |
| `admissao_uti` | ✅ |
| `evolucao_plantao` | ✅ |
| `evolucao_uti` | ✅ |
| `evolucao_hemodialise` | ✅ |
| `alta_hospitalar` | ✅ |
| `transferencia_interna` | ✅ |
| `obito` | ✅ |
| **os outros 27 tipos** | ❌ nenhum campo |

Existe `hasSchema(tipoId)` justamente para lidar com isso.

### Resposta direta à sua pergunta do PASSO 1

> "quais dos 35 tipos já são cobertos pelo motor adaptativo e quais ainda não
> têm setor/campo equivalente"

**Nenhum dos 35 é coberto por motor adaptativo, porque o motor adaptativo não
está em produção.** 8 dos 35 têm formulário fixo; 27 não têm campo nenhum.

### Precisa da sua decisão antes de qualquer código

O protótipo anexo pressupõe uma dimensão — **setor** — que o modelo de dados
não tem. Três caminhos:

| # | Caminho | Custo | Efeito nos 35 tipos |
|---|---|---|---|
| A | Setor vira **filtro de apresentação** sobre os `DOC_TYPES` atuais | baixo | preserva os 35; a tela nova é só uma porta de entrada mais amigável |
| B | Setor vira **dimensão nova** no modelo (`setor` + `tipo`), portando as 13 regras do HTML para TS | alto | exige remapear os 35 e escrever schemas para os 27 sem campo |
| C | Portar o protótipo HTML como motor e **aposentar** `DOC_TYPES` | muito alto | descarta os 35 tipos e os 8 schemas existentes |

Recomendo **A**. É o único que não joga fora `lib/evolucao/` e não exige
decisão clínica em 27 tipos de uma vez. **Não removi a tela antiga** — pelo
brief, a remoção depende dessa confirmação.

---

## PASSO 2 — Setores novos: campos propostos

⚠️ Depende do PASSO 1. Se o caminho for A, "setor" não recebe campos próprios
— herda do tipo de documento. A lista abaixo assume B/C.

O corpus KRONOS **não tem faixa de referência pediátrica, neonatal nem
obstétrica** — verifiquei (§5). Então **toda faixa numérica abaixo está
(CONFERIR)**. Não inventei nenhum valor.

### Pediatria — campos da Clínica Médica + faixas pediátricas

| Campo | Fonte |
|---|---|
| Peso (kg) · Altura (cm) | estrutural |
| Sinais vitais (FC, FR, PA, Tax, SpO₂) | estrutural |
| **Faixas de referência por idade** | **(CONFERIR)** |
| Escala de dor pediátrica (FLACC / faces) | escala padronizada |
| Responsável/acompanhante presente | KRONOS — COFEN Registros p.54 lista "Acompanhante" como item de admissão |
| Aceitação de dieta | estrutural |

### UTI Neonatal — campos da UTI + neonatal

| Campo | Fonte |
|---|---|
| **Peso em gramas** (não kg) | seu brief — confirmado como requisito |
| Apgar 1º/5º minuto | escala padronizada (conhecimento geral) |
| Idade gestacional corrigida | estrutural |
| Tipo de suporte (incubadora / berço aquecido) | estrutural |
| **Faixas de SV neonatais** | **(CONFERIR)** |
| Acesso umbilical (cateter arterial/venoso) | estrutural |

⚠️ O corpus tem 4 fragmentos citando Apgar, mas nenhum define a tabela de
pontuação — **é conhecimento geral, não KRONOS**.

### Gestante / Centro de Parto Normal

| Campo | Fonte |
|---|---|
| Sinais vitais maternos | estrutural |
| Idade gestacional | estrutural |
| Dilatação cervical (cm) | estrutural |
| Padrão de contrações (freq./duração) | estrutural |
| BCF (bpm) | estrutural |
| **Faixa normal de BCF** | **(CONFERIR)** |
| Fase do trabalho de parto | **(CONFERIR)** — a nomenclatura varia por protocolo institucional |
| Bolsa (íntegra/rota, hora, aspecto) | estrutural |

### Transição puerperal

Confirmo sua leitura: **não é setor.** No modelo atual é um `DOC_TYPE` novo
no grupo `evolucao`, mostrado no bottom sheet só quando o setor for Puerpério
— exatamente como o protótipo já faz em `REGISTRO_TIPOS_POR_SETOR`.

---

## PASSO 3 — Avaliação de Ferida/Ostomia

**Boa notícia: este tem fonte KRONOS Camada 1 real.** O COFEN
*Registros de Enfermagem no Exercício da Profissão* traz a lista de
itens obrigatórios:

> **§6.26 CURATIVOS** (p.72) — "Local da lesão e sua dimensão; Data e
> horário; Sinais e sintomas observados (presença de secreção/exsudato,
> coloração, odor, quantidade etc.); Relatar o nível de dor do paciente ao
> procedimento […]; Necessidade de desbridamento; Tipo de curativo (oclusivo,
> aberto, simples, compressivo, presença de dreno etc.); Material prescrito e
> utilizado; Carimbo e assinatura do responsável."

> **§9.21 Cuidado com estomas** — "Data e hora; Local do estoma; Tipo […];
> Nome completo e Coren do responsável pelo procedimento."

### Campos propostos

| Campo | Fonte |
|---|---|
| Localização da lesão/estoma | **KRONOS** — COFEN Registros §6.26, §9.21 |
| Dimensões (compr. × larg. × prof., cm) | **KRONOS** — §6.26 "sua dimensão" |
| Exsudato: quantidade, coloração, odor | **KRONOS** — §6.26 |
| Nível de dor ao procedimento | **KRONOS** — §6.26 |
| Necessidade de desbridamento | **KRONOS** — §6.26 |
| Tipo de curativo (oclusivo/aberto/simples/compressivo) | **KRONOS** — §6.26 |
| Material prescrito e utilizado | **KRONOS** — §6.26 |
| Estadiamento de LPP (Estágio 1–4, não classificável, TLP) | **escala padronizada** (NPUAP/EPUAP) — o corpus cita NPUAP em 1 fragmento, mas **não traz a tabela**; marcar como conhecimento geral no código |
| Tecido do leito (granulação/esfacelo/necrose/epitelização) | **escala padronizada** — conhecimento geral |
| Pele perilesional (íntegra/macerada/hiperemiada) | **(CONFERIR)** — descritores variam por protocolo |
| Tipo de estoma (colostomia/ileostomia/urostomia) | **(CONFERIR)** — §9.21 exige "Tipo" mas o fragmento está truncado no corpus |

Os seus 6 campos propostos estão todos contemplados; o COFEN **acrescenta 4**
que faltavam (dor, desbridamento, tipo de curativo, material).

---

## PASSO 4 — Auditoria da estrutura COFEN 736/2024

### 4.1. Terminologia ✅ FEITO

O corpus KRONOS **confirma sua afirmação, com fonte citável**:

> "O termo Sistematização da Assistência de Enfermagem (SAE) existente na
> resolução COFEN 358/2009 foi retirado da resolução COFEN 736/2024 por ser
> considerado um conceito ainda abstrato e em construção"
> — COREN-SP, *Processo de Enfermagem: Guia para a Prática*, 3ª ed., p.17

Trocado na interface:

| Arquivo | Antes | Depois |
|---|---|---|
| `pages/plantao.tsx:191` | "Gere a evolução SAE/COFEN do plantão" | "Gere a evolução conforme o Processo de Enfermagem" |
| `pages/perfil.tsx:184` | "Gerar evolução SAE/COFEN · {h}h de plantão" | "Gerar evolução conforme o Processo de Enfermagem · {h}h de plantão" |
| `lib/evolucao/document-types.ts:241` | `nome: 'SAE — Sistematização'` | `nome: 'Processo de Enfermagem'` |

O `id` `sae_sistematizacao` **não** foi alterado — é chave de dados.

### 4.2. Os 4 blocos — resposta à sua pergunta

> "esses 4 blocos já estão contemplados na estrutura de saída, ou o prompt
> precisa ser ajustado?"

**Depende do caminho — existem DOIS motores de geração, e só um tem os blocos.**

#### Motor A — plantão (`lib/prompts.ts`) → ✅ **já tem os 4 blocos**

`promptDocumento('evolucao')` já impõe exatamente a estrutura pedida:

| Seu bloco | Seção no prompt hoje | Linha |
|---|---|---|
| 1. Dados | `Histórico/Coleta de Dados` | `prompts.ts:33` |
| 2. Diagnóstico | `Diagnóstico de Enfermagem` | `prompts.ts:37` |
| 3. Intervenção | `Planejamento/Implementação` | `prompts.ts:40` |
| 4. Resultado | `Avaliação` | `prompts.ts:44` |

E a regra 4 (`prompts.ts:15`) obriga todas as seções a sempre aparecerem, na
ordem, com `"Sem registro para esta seção neste turno"` quando faltar dado.
**Este motor não precisa de ajuste estrutural.**

Só precisa de **um ajuste de citação** — ele cita a resolução revogada:

```diff
- Reescreva os dados fornecidos como uma Evolução de Enfermagem segundo a SAE
- (Resolução COFEN nº 358/2009).
+ Reescreva os dados fornecidos como uma Evolução de Enfermagem conforme o
+ Processo de Enfermagem (Resolução COFEN nº 736/2024).
```
*(`lib/prompts.ts:29` — **não aplicado**, aguardando seu aval.)*

#### Motor B — evolução avulsa (`lib/evolucao/generate-evolucao.ts`) → ❌ **não tem os blocos**

Este é o motor dos 35 tipos. Ele **não impõe estrutura nenhuma**:

```
 8. Não inclua títulos como "Documento:", "Resposta:", apenas o texto do documento.
 9. Use parágrafos separados para cada sistema/seção avaliada.
```

"por sistema avaliado" ≠ Dados/Diagnóstico/Intervenção/Resultado. **Este é o
que precisa de ajuste**, e é o motor que a tela nova vai acionar.

### 4.3. ⚠️ Conflito real entre o PASSO 4 e a trava anti-alucinação

Preciso apontar isto antes de qualquer alteração. O bloco 2 do seu brief diz:

> "2. Diagnóstico — **interpretação de enfermagem** sobre o dado"

Mas as duas travas centrais do produto proíbem exatamente isso:

```
generate-evolucao.ts:43
  4. É PROIBIDO criar diagnósticos de enfermagem, rótulos NANDA, julgamentos
     clínicos, condutas ou recomendações que não estejam literalmente nos
     dados fornecidos.

prompts.ts:38
  Diagnóstico de Enfermagem — APENAS se o enfermeiro ditou explicitamente um
  diagnóstico nomeado. […] valores numéricos ou achados isolados (ex:
  temperatura 38,7°C) NUNCA autorizam criar diagnóstico — isso é decisão
  clínica, não redação.
```

`lib/prompts.ts:1-8` diz que essa é *"a peça que mais importa neste projeto"*
e aponta `CHECKLIST_NAO_REGRESSAO.md`.

**Se "interpretação de enfermagem" significa a IA inferir o diagnóstico a
partir do dado, isso reverte a trava** — o LLM passa a emitir decisão clínica.
Duas leituras possíveis, e a escolha é sua:

- **(i) Estrutural** — o bloco Diagnóstico sempre aparece, mas só é preenchido
  com o que o enfermeiro ditou; sem dado, "Sem registro para esta seção".
  Trava preservada. É o que o Motor A já faz.
- **(ii) Interpretativa** — a IA infere o diagnóstico a partir dos dados.
  Cumpre o texto literal do brief, mas **remove a principal garantia clínica
  do produto**.

Não vou implementar (ii) sem você dizer explicitamente que é isso que quer.

### 4.4. 🛑 BLOQUEIO: COREN não existe no sistema

> "incluir nome completo e COREN do profissional (puxar do perfil logado)"

Busquei em todo o projeto. **O COREN não é coletado, não é armazenado e não é
exibido em lugar nenhum.**

| Onde | O que tem |
|---|---|
| `contexts/AuthContext.tsx:52` | `user_metadata` = `{ nome, perfil }` — só isso |
| `pages/cadastro.tsx` | não pede COREN |
| `pages/perfil.tsx` | linha "Dados pessoais" existe, valor = **"Em breve"** |
| `supabase/migrations/` | 16 migrations, **nenhuma tabela de perfil** |

O corpus KRONOS confirma que o dado é obrigatório:

> "A data, a hora, […] a assinatura e carimbo contendo a categoria do
> profissional e o número do Coren de sua jurisdição"
> — COFEN, *Registros de Enfermagem*, p.59

**Para cumprir o PASSO 4 é preciso antes:** (a) campo COREN no cadastro,
(b) persistência (migration ou `user_metadata`), (c) exibição no perfil.
Isso é uma feature própria, fora do escopo desta tela. Não implementei.

Hoje os dois motores usam marcador em vez de dado real:
- `prompts.ts:22` → *"revisar e assinar (COREN) antes de inserir no prontuário oficial"*
- `generate-evolucao.ts:49` → `"Enfermeiro(a) Responsável — [data/hora]"`, com
  instrução explícita de **nunca inventar data/hora**.

Data e hora, sim, dá para injetar do cliente hoje. **Nome** também
(`user_metadata.nome`). **COREN, não** — não existe.

### 4.5. Escopo do produto — ✅ auditado, nada a corrigir

Procurei por copy que sugira prontuário eletrônico:

```
grep -rni "assinad|registro oficial|prontuário oficial|documento oficial" pages/ lib/
```

Um único resultado, e ele **reforça** o posicionamento correto:

- `lib/prompts.ts:22` — "revisar e assinar (COREN) antes de inserir no
  prontuário oficial"
- `pages/encerramento.tsx:311` — "Revise cada item, complete o que for
  necessário e assine (COREN) antes de inserir no prontuário."

Nenhuma ocorrência de "documento assinado" ou "registro oficial salvo".
**Nada a mudar.**

---

## PASSO 5 — Campo-tags e favoritos

### 5.1. Campo-tags: não é possível como especificado

> "Substitua pelos 3 campos mais distintivos que REALMENTE existem no
> VISIBILITY_RULES de cada setor."

`VISIBILITY_RULES` não tem setores (PASSO 1), então não há de onde extrair.
O que **é** possível: extrair de `FIELD_SCHEMAS`, para os 8 tipos que têm
campos. Tabela do que dá para preencher com dado real hoje:

| Card do protótipo | Campos ILUSTRATIVOS hoje | Dá para usar dado real? | Fonte |
|---|---|---|---|
| UTI | Ventilação mecânica · Drogas vasoativas · RASS | ✅ sim | `FIELD_SCHEMAS['evolucao_uti']` |
| Centro cirúrgico | Aldrete-Kroulik · Dreno · SRPA | ❌ não | sem tipo/schema correspondente |
| UTI Neonatal | Peso (g) · Apgar · Incubadora | ❌ não | **(CONFERIR)** — setor não existe |
| Clínica Médica | Sinais vitais · Eliminações · Dispositivos | ✅ sim | `FIELD_SCHEMAS['evolucao_plantao']` |
| Clínica Cirúrgica | Curativo · Dreno · Ferida operatória | ❌ não | sem schema |
| Pediatria | Peso/Altura · Sinais vitais ped. · Responsável | ❌ não | **(CONFERIR)** |
| Gestante | Dilatação · BCF · Contrações | ❌ não | **(CONFERIR)** |
| Centro de Parto Normal | Fase do parto · BCF · Analgesia | ❌ não | **(CONFERIR)** |
| Puerpério | Loquiação · Amamentação · Involução uterina | ❌ não | sem schema |
| Hemodiálise | FAV/CDL · Balanço hídrico · Frêmito | ✅ sim | `FIELD_SCHEMAS['evolucao_hemodialise']` |
| Emergência | Classificação de risco · Queixa · Tempo de espera | ⚠️ parcial | `DOC_TYPES['admissao_pronto_socorro']` existe, **sem schema** |

**3 de 11 cards** podem ter campo-tag com dado real hoje. Os outros 8 seriam
texto inventado — que é exatamente o que você pediu para evitar. Por isso não
mexi em nenhum: preencher 3 e inventar 8 é pior que a situação atual, onde ao
menos todos estão uniformemente marcados como ilustrativos.

### 5.2. Fontes usadas — tabela consolidada

| Campo | Setor | Fonte |
|---|---|---|
| Ventilação mecânica, drogas vasoativas, RASS | UTI | **KRONOS**¹ / `FIELD_SCHEMAS` |
| Sinais vitais, eliminações, dispositivos | Clínica Médica | `FIELD_SCHEMAS` |
| FAV/CDL, balanço hídrico, frêmito | Hemodiálise | `FIELD_SCHEMAS` |
| Local, dimensão, exsudato, dor, desbridamento, tipo de curativo, material | Ferida/Ostomia | **KRONOS** — COFEN Registros §6.26 / §9.21 |
| Estadiamento LPP (1–4, NC, TLP) | Ferida | **escala padronizada** (NPUAP/EPUAP) — conhecimento geral |
| Tecido do leito | Ferida | **escala padronizada** — conhecimento geral |
| Apgar | UTI Neonatal | **escala padronizada** — conhecimento geral |
| Pele perilesional | Ferida | **(CONFERIR)** |
| Tipo de estoma | Ferida/Ostomia | **(CONFERIR)** |
| Faixas de SV pediátricas | Pediatria | **(CONFERIR)** |
| Faixas de SV neonatais | UTI Neonatal | **(CONFERIR)** |
| Peso em gramas | UTI Neonatal | seu brief |
| BCF — faixa normal | Gestante/CPN | **(CONFERIR)** |
| Dilatação, contrações | Gestante/CPN | seu brief |
| Fase do trabalho de parto | CPN | **(CONFERIR)** |
| Loquiação, involução uterina | Puerpério | **(CONFERIR)** |
| Aldrete-Kroulik | Centro Cirúrgico | **escala padronizada** — conhecimento geral |
| Classificação de risco (Manchester) | Emergência | **escala padronizada** — conhecimento geral |

¹ RASS aparece nas regras do protótipo HTML e em `FIELD_SCHEMAS`; o corpus
KRONOS não traz a tabela da escala.

**Acesso ao KRONOS neste ambiente: ✅ confirmado.** Consultei o corpus direto
(13 documentos, 1 913 fragmentos) — §7 tem a saída. O que o corpus **não**
tem: faixa de referência pediátrica, neonatal ou obstétrica. Por isso todas
elas caem em (CONFERIR), nunca em valor inventado.

### 5.3. Rastreabilidade dos (CONFERIR)

Você pediu que o marcador não se perca. Proposta — **os três, não um só**:

1. Constante exportada `CAMPOS_A_CONFERIR` no módulo de setores, tipada, com
   `campo`, `setor`, `motivo`.
2. Teste em `lib/__tests__/` que **falha** se algum campo `(CONFERIR)` for
   marcado como validado sem entrada correspondente — quebra o CI, não o
   silêncio.
3. Seção fixa neste arquivo, atualizada a cada mudança.

Aguardando seu aval antes de implementar.

### 5.4. Favoritos — o que é viável hoje

**Já existe favorito real do usuário**, e não é o que o protótipo assume:

```
pages/evolucao-avulsa/index.tsx:6   const FAVORITES_KEY = 'kronia-evolucao-favoritos';
                              :11   JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]')
```

- Mecanismo: **estrela manual**, não frequência de uso.
- Armazenamento: `localStorage`, por dispositivo (não sincroniza).
- Chave: `DOC_TYPES.id` — **não** ids de setor.

Não há contador de uso em lugar nenhum do projeto (verifiquei).

Então, respondendo o que é viável **agora**:

| Opção | Viável? |
|---|---|
| Favorito por frequência de uso real | ❌ nenhum dado de uso é coletado |
| Favorito manual por setor | ✅ mesmo padrão, chave nova |
| Migrar os favoritos existentes para setores | ❌ espaços de chave incompatíveis |
| Default fixo até haver histórico | ✅ recomendado |

Recomendo: manter o default fixo (UTI, Emergência, Clínica Médica,
Hemodiálise) e reusar o padrão de estrela manual com chave nova. O usuário
que já tem favoritos de tipo **não** os perde — a tela antiga continua lendo
a chave antiga.

---

## PASSO 6 — Roteamento e ícones: 🛑 bloqueado

- **Roteamento** — não há para onde apontar: a tela de seleção de setor não
  existe como página Next, e criá-la depende da decisão do PASSO 1.
- **`lucide-react` não está instalado.** `package.json` tem 4 dependências
  (supabase, next, react, react-dom). Adicionar é fácil; a troca dos **72
  SVGs inline** é que é um refactor amplo, tocando 14 arquivos — inclusive
  `cadastro.tsx` e `biblioteca.tsx`, que estão fora do escopo desta tela.

Recomendo separar: instalar `lucide-react` e usá-lo **só na tela nova**;
migrar os 72 inline num PR próprio, sem misturar com mudança clínica.

---

## §7 — Evidência de execução

Todos os comandos rodados neste ambiente, com saída real.

**Baseline, antes de qualquer alteração:**
```
$ npx jest
Test Suites: 9 passed, 9 total
Tests:       145 passed, 145 total
Time:        4.156 s
```

**Typecheck depois das alterações:**
```
$ npx tsc --noEmit
TYPECHECK_EXIT=0        (nenhuma saída = nenhum erro)
```

**Testes depois das alterações:**
```
$ npx jest
Test Suites: 9 passed, 9 total
Tests:       145 passed, 145 total
Time:        3.157 s
```

**Build de produção — prova que as fontes carregam:**
```
$ npx next build
 ✓ Compiled successfully
 (25 rotas geradas, sem erro)

$ find .next -name "*.woff2" | wc -l
25

$ grep -rho "\--font-space-grotesk|--font-inter|--font-ibm-plex-mono|kronia-fontes" .next/static/css/*.css | sort | uniq -c
      2 --font-ibm-plex-mono
      2 --font-inter
      2 --font-space-grotesk
      1 kronia-fontes
```
25 `.woff2` self-hosted + as três variables e a classe `.kronia-fontes` no CSS
compilado. As fontes passaram a carregar de fato.

**Acesso ao corpus KRONOS:**
```
$ node probe.mjs
URL host: uguxeoftfnljrxhwvdkj.supabase.co
conhecimento_documentos  => 13 linhas
conhecimento_fragmentos  => 1913 linhas
knowledge_base           => 103 linhas
```
Documentos: NANDA-I · COFEN (Registros, Código de Ética, Diretrizes
emergência, CTLN) · COREN-SP (anotação de enfermagem, processo de enfermagem,
protocolo) · COREN-SE (POP) · ANVISA (RDC-11, caderno-4 IRAS, práticas de
segurança) · MS (Portaria 529).

Busca por faixas pediátricas/neonatais: os fragmentos que citam "neonat" (72)
e "pediátr" (16) são índice taxonômico da NANDA-I e material de controle de
infecção da ANVISA — **nenhuma faixa de referência**. Daí os (CONFERIR).

---

## Resumo: o que precisa da sua decisão

| # | Decisão | Bloqueia |
|---|---|---|
| 1 | Caminho A, B ou C para "setor" (§PASSO 1) | passos 1, 2, 5, 6 |
| 2 | Bloco Diagnóstico: leitura (i) estrutural ou (ii) interpretativa | passo 4 |
| 3 | Aplicar o diff `358/2009 → 736/2024` em `prompts.ts:29`? | passo 4 |
| 4 | Impor os 4 blocos no Motor B (`generate-evolucao.ts`)? | passo 4 |
| 5 | Coletar COREN é feature à parte — priorizar quando? | passo 4 |
| 6 | Peso 800: baixar para 700 ou aceitar faux bold? | passo 0 (já entregue) |
| 7 | Validar cada (CONFERIR) da tabela §5.2 | passos 2, 3 |
