# KRONIA Nurse — Estrutura de Layout

> **Reestruturação em curso.** O layout novo (tema escuro, splash → login →
> home, só o motor determinístico, sem Kronos e sem IA) está especificado em
> [`docs/LAYOUT_MOTOR_ADAPTATIVO.md`](LAYOUT_MOTOR_ADAPTATIVO.md) e
> implementado em `mockups/kronia-nurse-motor-adaptativo.jsx`. O documento
> abaixo continua descrevendo o app Next.js atual, que ainda não foi migrado.

Documento de referência da **ordem** e da **composição** do layout do app.
Descreve o que existe hoje em `pages/_app.tsx`, `components/Layout.tsx` e
`styles/globals.css` — não é proposta, é o estado atual do código.

Para tokens de cor/tipografia, ver o bloco `:root` / `[data-theme="dark"]`
em `styles/globals.css` (§8 resume os que afetam layout).

---

## 1. Princípio de forma

O app é **mobile-first travado**: um shell de largura fixa centralizado, com
navegação inferior fixa e uma única coluna de conteúdo rolável. Não há
layout de desktop, sidebar, breakpoints de coluna ou grid responsivo de
página. Em telas largas, o shell simplesmente centraliza em `480px` e o
fundo sobra dos lados.

Consequência prática: **toda tela nova é uma pilha vertical de blocos de
largura total dentro de 480px**. Não existe "onde colocar na direita".

---

## 2. Árvore de composição

Do mais externo para o mais interno:

```
_app.tsx
└── <Head>  ......................... viewport: width=device-width,
│                                     initial-scale=1, maximum-scale=1
└── <ThemeProvider>  ................ lib/theme-context.tsx → data-theme no <html>
    └── <AuthProvider>  ............. contexts/AuthContext.tsx
        └── <AuthGate>  ............. bloqueia render até resolver sessão
            │                         · loading → splash centrado (logo + spinner)
            │                         · sem user + rota privada → redirect /login
            └── <Component> (a página)
                └── <Layout>  ....... components/Layout.tsx
                    ├── <ShiftPulseBar />      (condicional)
                    ├── <main className="main-content">  ← conteúdo da página
                    └── <nav className="bottom-nav">
```

Pontos de atenção:

- O `Layout` **não é aplicado em `_app.tsx`**. Cada página importa e
  envolve o próprio conteúdo. Páginas públicas (`/`, `/login`, `/cadastro`)
  não usam `Layout` — desenham a tela inteira por conta própria.
- O estado de `loading` de cada página normalmente é renderizado
  **dentro** do `Layout`, para a navegação não piscar:
  `if (!carregado) return <Layout><div className="estado-vazio">Carregando...</div></Layout>;`

---

## 3. App Shell (`.app-shell`)

```css
max-width: 480px;      /* trava mobile */
margin: 0 auto;        /* centraliza */
min-height: 100dvh;    /* dvh, não vh — respeita barra de URL móvel */
display: flex;
flex-direction: column;
position: relative;
background: var(--color-bg);
```

Três filhos, **nesta ordem vertical, sempre**:

| # | Elemento            | Posição            | Altura            | z-index |
|---|---------------------|--------------------|-------------------|---------|
| 1 | `.shift-pulse-bar`  | `sticky; top: 0`   | conteúdo (~30px)  | 20      |
| 2 | `.main-content`     | fluxo, `flex: 1`   | resto             | —       |
| 3 | `.bottom-nav`       | `fixed; bottom: 0` | `--nav-height` 68px | 100   |

O `.top-bar` (`sticky; top: 0; z-index: 10`) existe no CSS como header
sticky por tela, **abaixo** da pulse bar na pilha de z. Hoje as telas usam
`.tela-header` (não-sticky) ou um header inline; o `.top-bar` está
disponível mas pouco usado.

### 3.1. `.main-content`

```css
flex: 1;
overflow-y: auto;
padding: 0 16px calc(var(--nav-height) + 20px);
```

- **Gutter horizontal de 16px** vem daqui. Blocos filhos não repetem
  padding lateral — eles são de largura total dentro desses 16px.
- **Sem padding-top.** O espaçamento superior é responsabilidade do
  primeiro bloco da tela (o header, normalmente `padding: 16–18px 0 10–12px`).
- **Padding-bottom = 88px** (`68 + 20`) para o conteúdo não terminar
  embaixo da bottom nav fixa.

---

## 4. ShiftPulseBar — barra de contexto de plantão

`components/ShiftPulseBar.tsx`. Faixa azul-escura (`--color-clinical-deep`),
sticky no topo, que só existe quando há plantão ativo em tela de app.

Ordem interna (flex, `space-between`):

```
[● dot pulsante] PLANTÃO ATIVO  desde HH:MM        ·        {N}p · {N}r
└──────────── grupo esquerdo ────────────┘          └── contadores ──┘
```

- Esquerda: dot verde com animação `pulse-green` (2s infinita), rótulo
  `PLANTÃO ATIVO`, e a hora de início em mono/opacidade 0.65.
- Direita: `{pacientes}p · {registros}r`, mono, opacidade 0.75, 0.68rem.

**Regra de exibição** (`components/Layout.tsx`):

```ts
const ROTAS_SEM_PULSE = ['/login', '/cadastro', '/'];
showPulseBar (default true) && !ROTAS_SEM_PULSE.includes(rota)
```

A prop `showPulseBar` existe para desligar caso a caso, mas hoje nenhuma
página a passa — todas herdam o default.

---

## 5. Bottom Nav — ordem canônica dos 5 slots

`.bottom-nav`: flex, `justify-content: space-around`, altura 68px, fixa,
centrada via `left: 50%; transform: translateX(-50%)` com `max-width: 480px`.

A ordem **é fixa e semântica** — esquerda→direita é fluxo de trabalho do
plantão, com a ação de escrita no centro:

| Slot | Rótulo     | Ícone         | Destino       | Ativo quando `router.pathname` é                                 |
|------|------------|---------------|---------------|------------------------------------------------------------------|
| 1    | Home       | casa          | `/plantao`    | `/plantao`                                                        |
| 2    | Pacientes  | duas pessoas  | `/pacientes`  | `/pacientes`                                                      |
| 3    | — (FAB)    | `+`           | `/registrar`  | nunca marca ativo                                                 |
| 4    | KRONOS     | livro aberto  | `/biblioteca` | `/biblioteca`, `/conhecimento*`, `/escalas`                       |
| 5    | Perfil     | pessoa        | `/perfil`     | `/perfil`, `/encerramento`                                        |

Detalhes de forma:

- `.nav-item`: coluna (ícone 22px sobre rótulo 0.62rem), `gap: 3px`,
  `min-width: 52px`. Inativo `--color-ink-faint`; ativo `--color-clinical`
  + `font-weight: 700`.
- `.nav-fab`: círculo 54px, fundo `--color-clinical`, ícone 28px branco,
  `margin-bottom: 24px` (é o que faz ele "subir" e transbordar a barra),
  sombra azul `0 6px 16px rgba(11,79,138,.45)`, `:active` → `scale(0.93)`.
- O FAB **não tem rótulo** e **não recebe estado ativo** — é ação, não aba.
- Slot 4 aponta para `/biblioteca`, mas o estado ativo cobre também
  `/escalas` e `/conhecimento/*`: KRONOS é tratado como uma seção, não
  como uma rota única.

---

## 6. Ordem interna canônica de uma tela

Dentro de `.main-content`, as telas seguem esta pilha. Nem toda tela tem
todos os degraus, mas a **ordem relativa nunca é invertida**:

```
1. Header da tela          .tela-header / bloco inline
                           título à esquerda, ação/avatar à direita
2. Busca ou filtro         .auth-input-wrap  |  .pill (linha rolável)
3. Métricas                grid 1fr 1fr, gap 10, .stat-card
4. Ações rápidas           grid 1fr 1fr, gap 10, .btn / .kronos-grid
5. Bloco de destaque       card com fundo --color-clinical-tint (CTA da tela)
6. Conteúdo principal      .card, listas, formulários
7. Estado vazio            .estado-vazio  ou  card centrado com ícone
```

Espaçamento vertical entre blocos: **`margin-bottom: 16px`** entre seções;
`10px` entre cards irmãos de uma mesma lista (`.card`).

Raios: `14px` para blocos/cards, `10px` para botões dentro de cards,
`20px` para pills/badges, `50%` para avatar e FAB.

### 6.1. Padrões de header

Existem dois, e a escolha depende da tela:

**a) Header identitário** (só `/plantao`) — saudação em mono/uppercase
0.65rem sobre o primeiro nome em display 1.45rem, com botão de iniciais
40px circular à direita levando a `/perfil`.

**b) `.tela-header`** (demais telas) — flex `space-between`,
`padding: 16px 0 12px`, `.tela-titulo` em display 1.3rem à esquerda,
ação opcional à direita.

---

## 7. Ordem bloco a bloco, por tela

### `/plantao` — Home (`pages/plantao.tsx`)

```
1. Header identitário      saudação + primeiro nome | avatar-iniciais → /perfil
2. Stat cards              [Pacientes] [Registros]            grid 1fr 1fr
3. Ações rápidas           [+ Novo registro] [Pacientes]      grid 1fr 1fr
                           primário → /evoluir   secundário
4. .kronos-grid            [Escalas] [KRONOS]                 grid 1fr 1fr
                           variante linha: ícone 28px + label à direita
5. Card "Encerrar turno"   fundo clinical-tint, texto à esquerda + botão
                           primário "Gerar evolução" → /encerramento
6. Atividade recente       .card > .card-titulo + .evento-linha[]
                           (hora mono | leito + texto | badge "Registrado")
7. Estado vazio            só quando eventos == 0 — card centrado, ícone 48px
```

### `/pacientes` (`pages/pacientes.tsx`)

```
1. .tela-header            "Pacientes"
2. .aviso-privacidade      texto fixo sobre não usar identificadores diretos
3. Cards de paciente[]     .card com badge de complexidade + .btn-icone (editar/excluir)
4. Formulário add/edit     .card > .card-titulo + .campo[] (leito, dx, complexidade)
                           + [Salvar primário] [Cancelar secundário]
```

O aviso de privacidade vem **antes** da lista, por decisão de produto: é
condição de uso, não rodapé.

### `/registrar` — FAB (`pages/registrar.tsx`)

```
1. .contexto-bar           leito ativo (.contexto-leito) + sub (.contexto-sub)
                           + .contexto-select para trocar paciente
2. .captura-wrapper        área de captura; ganha .ativa em foco
   ├─ .captura-status      .captura-dot (.pulsando) + .captura-label
   ├─ .captura-textarea    campo livre (ditado = teclado nativo)
   ├─ .captura-preview     leito detectado em tempo real pelo leito-parser
   └─ .captura-acoes       [Adicionar primário] [Limpar secundário]
3. .sessoes-header         .sessoes-titulo do histórico
4. .sessao-card[]          histórico estilo "Past Sessions"
   ├─ .sessao-card-header  .sessao-hora-pill · .sessao-leito-pill
   │                       (ou .sessao-sem-leito-pill) · .sessao-tipo-pill
   │                       + .sessao-acoes (.btn-icone editar/excluir)
   └─ .sessao-texto        card ganha .editando quando em edição inline
```

### `/biblioteca` — KRONOS (`pages/biblioteca.tsx`)

```
1. .tela-header            "Conhecimento"
2. .auth-input-wrap        busca com ícone (margin-bottom 16)
3. Stat cards              [Conhecimentos] [Atualizados (14d)]
4. Carrossel de categorias flex + overflow-x auto, com fade nas bordas
                           1º chip "Todos", 2º "Escalas" → /escalas, depois categorias
5. Lista de conhecimentos  .card > .evento-linha[]
6. Estados                 carregando (.spinner-clinical) / erro (card com
                           borda-esquerda danger) / vazio (.estado-vazio)
```

Os estados de carregando/erro ocupam a posição 5 quando ativos —
substituem a lista, não empilham com ela.

### `/perfil` (`pages/perfil.tsx`)

```
1. .tela-header            "Perfil"
2. Bloco de identidade     .avatar 64px + nome/registro
3. Stat cards              métricas do usuário                grid 1fr 1fr
4. Seção "Conta"           .card > .card-titulo + .profile-row[]
5. Seção "Preferências"    .card > .card-titulo + .profile-row[]
                           inclui a linha de toggle de tema
6. CTA "Encerrar turno"    tratamento dedicado — é a ação de maior peso da tela
7. Sair                    ação destrutiva, por último
```

`.profile-row`: ícone 34px em tint à esquerda, label `flex: 1`, valor
opcional à direita, `border-bottom` exceto no último.

### `/encerramento` (`pages/encerramento.tsx`)

```
1. .tela-header            "Encerrar plantão"
2. Resumo do turno
3. Stat cards                                                  grid 1fr 1fr
4. Aviso de deleção de dados
5. [Processar plantão completo]   .btn.btn-primario.btn-bloco
6. .card de processamento         .spinner-clinical durante geração
7. .documento-area                textarea editável com o resultado
                                  + [Copiar] secundário
8. .texto-responsabilidade        texto legal fixo — sempre imediatamente antes
9. [Encerrar plantão]             .btn.btn-perigo.btn-bloco (sem desfazer)
```

A ordem 8→9 é obrigatória: o texto de responsabilidade precede o botão
destrutivo, nunca vem depois nem em modal separado.

### `/escalas` (`pages/escalas.tsx`)

```
1. .tela-header            "Escalas"
2. Seletor de escala       NEWS2 / Braden / Morse
3. Formulário              .escala-opcao[] (radio + label, hover em tint)
4. .escala-resultado       .escala-total (mono, grande) + .escala-risco
                           atualiza ao vivo enquanto preenche
5. Ação opcional           salvar resultado como EventoTurno
```

### Rotas públicas — `/`, `/login`, `/cadastro`

Não usam `Layout`: sem pulse bar, sem bottom nav. Desenham um container
próprio centrado, geralmente `min-height: 100dvh` + flex center. O splash
do `AuthGate` segue o mesmo formato (logo em display 1.4rem sobre
`.spinner.spinner-clinical`, `gap: 12`).

---

## 8. Tokens que governam layout

| Token           | Valor                | Papel                                        |
|-----------------|----------------------|----------------------------------------------|
| `--nav-height`  | `68px`               | altura da bottom nav; base do padding inferior |
| `--shadow-card` | claro: blur curto duplo / escuro: `inset` highlight no topo | elevação de `.card`, `.stat-card`, `.kronos-grid-item` |
| `--font-display`| Space Grotesk        | títulos, valores de identidade               |
| `--font-body`   | Inter                | corpo, labels de nav                         |
| `--font-mono`   | IBM Plex Mono        | números, horas, contadores, scores           |

Constantes não-tokenizadas, mas consistentes no código:

- Largura do shell: `480px`
- Gutter: `16px`
- Gap de grid 2-col: `10px`
- Margem entre seções: `16px`
- Raio de card: `14px`

**Nota sobre modo escuro:** sombra preta não separa superfície de fundo já
escuro; por isso `--shadow-card` no dark vira um realce interno no topo
(`inset 0 1px 0 rgba(255,255,255,.05)`). Blocos novos devem usar o token,
não sombra literal.

---

## 9. Regras de z-index

```
100  .bottom-nav        sempre por cima
 20  .shift-pulse-bar   sticky topo
 10  .top-bar           header sticky por tela (abaixo da pulse bar)
  —  conteúdo
```

Qualquer overlay/modal novo precisa passar de 100 ou ser renderizado fora
do `.app-shell` — caso contrário a bottom nav fica por cima dele.

---

## 10. Checklist para uma tela nova

1. A página importa `Layout` e envolve o próprio conteúdo (não é `_app`).
2. O estado `carregando` também retorna dentro de `<Layout>`.
3. Primeiro bloco fornece o espaçamento superior (`.tela-header` ou header
   inline) — `.main-content` não tem `padding-top`.
4. Blocos são de largura total; nada de padding lateral duplicado.
5. Ordem segue §6: header → busca/filtro → métricas → ações → destaque →
   conteúdo → vazio.
6. Se a rota deve aparecer marcada na nav, atualizar a condição do slot
   correspondente em `components/Layout.tsx` (KRONOS e Perfil já agregam
   várias rotas).
7. Se a rota é pública, adicionar a `ROTAS_PUBLICAS` em `_app.tsx` **e** a
   `ROTAS_SEM_PULSE` em `Layout.tsx` — são listas separadas.
8. Cores e sombras via token; nada de hex literal em `style` inline.
