# KRONIA Nurse — Estrutura de Layout

Referência do layout **como está no código hoje**: `pages/index.tsx` →
`components/KroniaNurseApp.jsx`. Extraído das telas oficiais (splash, login,
home).

**Escopo do app:** só o motor determinístico. A evolução é montada por regras
(`schema` + `showIf` + `classify`) e sai nos quatro blocos do Processo de
Enfermagem. Nenhuma chamada de IA, nenhuma requisição de rede em todo o
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

## 5. Formato de saída — Processo de Enfermagem

`lib/evolucao/processo-enfermagem.js` monta o documento nos quatro blocos da
Resolução COFEN nº 736/2024, sempre todos presentes e nesta ordem:

| Bloco | Conteúdo |
|---|---|
| **Dados** | a prosa do motor: o que foi observado — vitais, exame físico, dispositivos presentes, suporte em curso, dieta, eliminações |
| **Diagnóstico de Enfermagem** | sempre "Sem registro para esta seção" |
| **Intervenção** | o que foi feito: condutas, fototerapia e medicação em infusão (`INTERVENCAO_IDS`) |
| **Resultado** | sempre "Sem registro para esta seção" |

Depois dos blocos vêm as pendências `(CONFERIR — …)`, recolhidas **uma única
vez** da sequência completa, e por fim
`Enfermeiro(a) Responsável — [data/hora]`, com o marcador literal.

**Diagnóstico é estrutural, não interpretativo.** O schema não tem pergunta
de diagnóstico nomeado, então não existe caminho no código para um valor
numérico virar rótulo clínico. A trava deixou de ser instrução a um modelo e
passou a ser ausência de caminho.

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
