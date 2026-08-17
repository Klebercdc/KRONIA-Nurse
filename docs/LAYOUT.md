# KRONIA Nurse — Estrutura de Layout

Referência do layout **como está no código hoje**: `pages/index.tsx` →
`components/KroniaNurseApp.jsx`. Extraído das telas oficiais (splash, login,
home).

**Escopo do app:** só o motor determinístico. A evolução é montada por regras
(`schema` + `showIf` + `classify`) e sai como Evolução de Enfermagem. Nenhuma chamada de IA, nenhuma requisição de rede em todo o
fluxo. Custo de inferência: zero.

**O que continua no repositório mas está desligado da interface:** todo o
`pages/api` (KRONOS, conhecimento, geração por IA), `lib/groq-client`,
`lib/prompts`, `lib/knowledge-*`, `lib/kronos-*`, o fluxo antigo de setor/tipo
em `lib/evolucao/{setores,document-types,field-schemas,generate-evolucao}`,
`contexts/AuthContext`, `lib/theme-context`, `lib/fonts`, as migrations do
Supabase e o `scripts/rag-pipeline.js`. Nada disso é chamado a partir de
tela nenhuma — está parado, à espera da decisão sobre usar ou não IA.

Para os tokens do tema claro anterior, ver `LAYOUT_ATUAL.md` (histórico).

---

## 1. Tokens

Tema único, escuro, definido em `style` inline no topo de
`components/KroniaNurseApp.jsx`. Não usa as CSS variables de
`styles/globals.css` — aquele arquivo continua servindo o código parado.

| Token | Hex | Uso |
|---|---|---|
| `ACCENT` | `#25E08C` | verde da marca: ações, destaques, ícones, borda ativa |
| `ACCENT_2` | `#7DF3BE` | fim do gradiente dos botões primários |
| `BG` | `#020B08` | fundo da página e de campos dentro de card |
| `SURFACE` | `#08170F` | fundo de card, input e avatar |
| `BORDER` | `#153A28` | borda de card, input, divisórias |
| `TEXT` | `#F3F8F5` | texto primário |
| `MUTED` | `#8FA79C` | texto secundário |
| `DIM` | `#5C7A6D` | texto terciário, ícone de nav inativo, placeholder |

Transparência é sempre sufixo hex no accent (`${ACCENT}14`, `${ACCENT}44`,
`${ACCENT}99`) — não há `rgba()`.

`pages/index.tsx` pinta `html, body` com `BG` por `styled-jsx` global: sem
isso o overscroll mostra o fundo claro herdado de `styles/globals.css`.

**Tipografia:** Inter (fallback system-ui). Pesos 300 (wordmark), 400, 500,
600, 700, 800. Títulos de tela em 800 com `letterSpacing` negativo.

**Raios:** 999 (pill), 18 (card de destaque e CTA), 14 (input de login),
12 (botão, opção de pergunta), 11/8 (ícone quadrado, tag).

---

## 2. Shell

Coluna única, mobile-first travada em `maxWidth: 480`, centralizada, fundo
`BG` sobrando dos lados em tela larga. Nenhuma tela tem coluna à direita.

```
pages/_app.tsx  ................ Head + globals.css. Sem AuthGate, sem
│                                ThemeProvider, sem wrapper de fontes.
└── pages/index.tsx  ........... Head da página + fundo global
    └── KroniaNurseApp
        ├── header  ............ só quando screen ∉ {splash, login}
        ├── <tela ativa>
        └── nav inferior  ...... só quando screen === "home"
```

**Header:** wordmark "KRONIA *Nurse*" à esquerda (clicável → home), sino com
ponto verde e avatar à direita.

**Nav inferior:** `position: fixed`, 5 slots — Início · Pacientes · **+** ·
Evoluções · Perfil. O botão central é um círculo de 52px em `ACCENT` com
`marginTop: -18`. "Evoluções" recebe badge com a contagem do histórico.

> **Elementos ainda sem função:** sino, avatar, "Pacientes" e "Perfil" vêm
> das telas de referência e hoje não levam a lugar nenhum — as telas que eles
> abriam foram removidas. Estão na interface porque as fotos os têm.
> Funcionam de verdade: "Início", o **+** e "Evoluções".

---

## 3. Máquina de telas

Estado único `screen`, sem rota:

```
splash ──2s ou toque──▶ login ──Entrar / Google──▶ home
                                                    │
                          ┌─────────────────────────┤
                          ▼                         ▼
                   identificacao ──▶ quiz ──▶ resultado
                          │                         │
                          └────── historico ◀───────┘
```

`splash` e `login` renderizam sem header e sem nav (`semShell`).

---

## 4. Tela a tela

### 4.1. Splash
Fundo `radial-gradient(circle at 50% 45%, #08201A 0%, BG 62%)`. Lockup
centralizado (`LogoLockup size=150`). Entra com `fadeUp` 0.6s. Toque pula a
espera de 2s.

### 4.2. Login
Dois grafismos de fundo em `position: absolute` / `pointerEvents: none`:
6 arcos à esquerda (opacidade 0.16 → 0.06) e uma onda de ECG à direita.

Ordem: lockup (128) → título 27px/800 → subtítulo com **simples**, **rápido**,
**seguro** em `ACCENT` → E-mail (ícone `Mail`) → Senha (ícone `Lock` + toggle
`Eye`/`EyeOff`) → "Esqueci minha senha" → **Entrar** (gradiente) → divisor
"ou" → **Entrar com Google** → "Criar conta" → rodapé com cadeado.

**Sem autenticação real:** os dois botões entram no app. Não há sessão,
conta ou verificação.

### 4.3. Home
Padding `14px 18px 84px` (o 84 reserva a nav). Glow radial no canto superior
direito em `zIndex: 0`; conteúdo em `zIndex: 1`.

Ordem: pill "EVOLUÇÃO DE ENFERMAGEM HOSPITALAR" (ponto pulsante) → título
30px/800 com o `PulseHero` à direita → linha "Todas as áreas hospitalares" →
card de destaque → lista de recursos → CTA → dica.

**PulseHero:** 148×80, grade de 14px a 0.13 de opacidade sob o traço de 4px,
animação `pulsoLinha` 2.6s em loop.

**Lista de recursos:** a tag da primeira linha é lida do schema —
`até ${CONTEXTS[0].questions.length} perguntas`, hoje **122**. Não é número
digitado à mão.

### 4.4. Identificação
Leito + iniciais (máx. 6 caracteres, maiúsculas). "Iniciar perguntas" só
habilita com os dois preenchidos. Nome completo nunca é pedido.

### 4.5. Quiz
Barra de progresso, pill "n de N" e o bloco "Contexto adaptativo", que diz se
a pergunta é fixa ou foi aberta por uma resposta anterior
(`layer === "condicional"`). A árvore começa em 6 perguntas e cresce conforme
as respostas.

| `type` | componente | seleção |
|---|---|---|
| `select` | botões em coluna | `Radio` |
| `multi_select` | botões em coluna | `CheckBox` |
| `numeric` | `NumericField` | mostra a classificação automática abaixo |
| `numeric_pair` | `BPField` | dois campos separados por `×` |
| `texto_livre` | `TextField` | — |

"Continuar" fica desabilitado até `isAnswered` — inclusive para número fora
da faixa.

### 4.6. Resultado
Documento em `whiteSpace: pre-wrap`, botão **Copiar** e `RotateCcw` para
recomeçar.

### 4.7. Histórico do plantão
Cards "Leito X · INICIAIS" com data/hora `pt-BR`, texto completo e Copiar.

---

## 5. Formato de saída — Evolução de Enfermagem

`lib/evolucao/evolucao.js` monta a evolução: a **foto do paciente no momento
da avaliação**.

| Seção | Conteúdo |
|---|---|
| **Abertura** | identificação, consciência, estado geral, mobilidade; `Apresenta-se` com coloração, hidratação e os sinais vitais **alterados**; suporte de via aérea |
| **Sinais vitais** | linha própria, sigla + valor exato: `PA 120x80 mmHg, FC 78 bpm, FR 16 irpm, SpO₂ 97%, T 38,4°C` |
| **Ao exame físico** | um bullet por sistema: Neurológico, Cabeça e pescoço, Respiratório, Cardiovascular, Gastrointestinal, Geniturinário, Pele e tegumento, Membros, Dispositivos |
| **Dieta e metabólico** | via de dieta, tolerância, balanço hídrico, glicemia |
| **Cuidados realizados** | condutas frente a alertas, medicação em infusão, terapias |
| **Resposta do paciente** | o que o enfermeiro registrou como resposta às intervenções |
| **Fecho** | acompanhamento, achados psicossociais e de segurança |

Sistema sem achado não vira bullet vazio. Depois das seções vêm as pendências
`(CONFERIR — …)`, recolhidas **uma única vez** da sequência completa, e por
fim `Enfermeiro(a) Responsável — [data/hora]`, com o marcador literal.

O destino de cada pergunta sai de `SISTEMA_POR_SUBGRUPO` (por subgrupo do
motor) com exceções em `SISTEMA_POR_ID`. Mover um achado de seção é editar
uma linha — o texto se reorganiza sozinho.

### 5.1. Evolução não é o Processo de Enfermagem

O PE tem **cinco etapas** (Res. 736/2024, Art. 4º): Avaliação, Diagnóstico,
Planejamento, Implementação e Evolução. A **Evolução é uma delas** — o § 5º a
define como "a avaliação dos resultados alcançados (…) permite a análise e a
revisão de todo o Processo de Enfermagem".

Diagnóstico e Planejamento são registros próprios, de documento separado, no
sistema de cada hospital. A Res. 358/2009 já os listava como três coisas
distintas. **A ausência deles aqui não é lacuna a fechar**, e está verificada
em `lib/__tests__/evolucao.test.ts`.

Uma versão anterior montava a saída em "blocos do Processo de Enfermagem",
com `Dados / Diagnóstico / Intervenção / Resultado` — herança do Art. 6º da
358/2009, que descreve o registro da execução do PE inteiro. Era o erro de
enquadramento que esta estrutura desfaz.

### 5.2. Regras de redação — COREN-SP

Do documento "Anotação de Enfermagem" (COREN-SP, 2022). Travadas por teste em
`lib/__tests__/grafo-adaptativo.test.ts`, no bloco `regras de escrita do
COREN-SP`:

| Regra | Como aparece no código |
|---|---|
| "os sinais vitais mensurados devem ser registrados pontualmente (…) Não registrar como 'normotenso', 'normocárdico'" | o valor vai na linha de sinais vitais, uma vez só. O rótulo de normalidade fica em `label`, que é apoio de tela. Só o achado **alterado** vira descritor na abertura. |
| "Não conter termos que deem conotação de valor (bem, mal, muito, pouco, etc.)" | nenhuma `frase` do schema usa esses termos. Exceção deliberada: os descritores oficiais da RASS. |
| "dados de aplicação de Escala de dor (…) incluindo valor do escore aferido" | as opções de dor registram a faixa da EVA junto da queixa. |
| "cateteres e como se encontram suas inserções e fixações; curativos e seu aspecto" | `avp_sitio_condicao`, `cvc_sitio_condicao`, `dreno_sitio_condicao`. |
| "priorizar a descrição de características, como tamanho mensurado (cm, mm, etc.), quantidade (ml, l, etc.), coloração e forma" | lesão e deiscência levam região e medida em cm; a diurese leva aspecto além do volume. |
| "condições gerais (…) coloração da pele" | `pele_coloracao` e `hidratacao`, na abertura. |

Decimais em padrão brasileiro (38,4°C); `120x80 mmHg` e `RASS -4` passam
intactos.

---

## 6. Persistência

`store`, no topo de `components/KroniaNurseApp.jsx`, usa `window.storage`
quando existe e cai em `localStorage` no navegador comum. Chave única:
`historico_plantao`. Grava uma vez por evolução, quando a tela de resultado
abre. Nada sai do dispositivo.

---

## 7. Movimento

| Classe | Efeito | Onde |
|---|---|---|
| `kn-pulso-path` | traça a onda em 2.6s, em loop | `PulseHero`, ECG da home |
| `kn-vivo-dot` | ponto pulsando em 1.6s | pill da home |
| `kn-fade` | fade + subida de 10px em 0.6s | lockup do splash |

Todas desligadas em `prefers-reduced-motion: reduce`.

---

## 8. O que o layout **não** tem

- Nenhuma tela, botão ou atalho para o KRONOS.
- Nenhum indicador de "gerando…", streaming ou spinner de IA — o texto é
  síncrono.
- Nenhum breakpoint de desktop, sidebar ou grid de página.
- Nenhuma foto ou nome completo de paciente em tela.
