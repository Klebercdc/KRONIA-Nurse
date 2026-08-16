# KRONIA Nurse — Layout

Especificação de layout do app, extraída das telas oficiais (splash, login,
home) e implementada em `components/KroniaNurseApp.jsx`, renderizado por
`pages/index.tsx`.

**Escopo:** só o motor determinístico. Não há tela Kronos, não há chamada de
IA, não há requisição de rede em nenhum ponto do fluxo — o texto da evolução
é montado por regras (`schema` + `showIf` + `classify`). Custo de inferência
= zero.

A estrutura anterior (tema claro, rotas `evoluir/`, `plantao`, `biblioteca`,
`conhecimento`, API routes, Supabase, RAG) foi removida do repositório. O
histórico dela continua no git.

---

## 1. Tokens

Tema único, escuro. Definidos no topo do arquivo, sem CSS global.

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

**Tipografia:** Inter (fallback system-ui). Pesos usados: 300 (wordmark),
400, 500, 600, 700, 800. Títulos de tela em 800 com `letterSpacing` negativo
(−0.4 a −0.8).

**Raios:** 999 (pill), 18 (card de destaque e CTA), 14 (input de login),
12 (botão, opção de pergunta), 11/8 (ícone quadrado, tag).

---

## 2. Shell

Coluna única, mobile-first travada em `maxWidth: 480`, centralizada, fundo
`BG` sobrando dos lados em tela larga. Nenhuma tela tem coluna à direita.

```
<div minHeight:100vh, background:BG, justifyContent:center>
  └── <div maxWidth:480, flex-column>
      ├── header ............... só quando screen ∉ {splash, login}
      ├── <tela ativa>
      └── nav inferior ......... só quando screen === "home"
```

**Header:** wordmark "KRONIA *Nurse*" à esquerda (clicável → home), sino com
ponto verde e avatar à direita. Borda inferior `BORDER` + linha de brilho
`0 1px 0 0 ${ACCENT}12`.

**Nav inferior:** `position: fixed`, 5 slots — Início · Pacientes · **+** ·
Evoluções · Perfil. O botão central é um círculo de 52px em `ACCENT` com
`marginTop: -18` (sobrepõe a barra). "Evoluções" recebe badge com a
contagem do histórico. Só "Início", "+" e "Evoluções" são funcionais.

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
centralizado (`LogoLockup size=150`): ícone do documento + traçado de pulso,
"KRONIA" em peso 300 com `letterSpacing` 0.075×size, "NURSE" em `ACCENT` com
`letterSpacing` 0.12×size. Entra com `fadeUp` 0.6s. Toque pula a espera.

### 4.2. Login
Pilha vertical, padding `26px 22px 30px`, dois grafismos de fundo em
`position: absolute` e `pointerEvents: none`:

- **esquerda:** 6 arcos `<path Q>` com opacidade decrescente (0.16 → 0.06);
- **direita:** onda de ECG a 0.5 de opacidade.

Ordem dos blocos: lockup (128) → título 27px/800 (`Evolua em minutos.` +
`Ganhe tempo no plantão.` em `ACCENT`) → subtítulo com **simples**,
**rápido**, **seguro** em `ACCENT` → campo E-mail (ícone `Mail`) → campo
Senha (ícone `Lock` + toggle `Eye`/`EyeOff`) → "Esqueci minha senha"
alinhado à direita → botão **Entrar** (gradiente `ACCENT → ACCENT_2`, texto
`BG`, sombra `0 14px 30px -12px ${ACCENT}99`) → divisor "ou" → **Entrar com
Google** (contornado, G colorido em SVG inline) → "Não tem uma conta? Criar
conta" → rodapé com cadeado.

Campos de login: `SURFACE`, borda `BORDER`, raio 14, padding `15px 16px`,
ícone à esquerda em `ACCENT`.

Sem autenticação real: ambos os botões levam à home.

### 4.3. Home
Padding `14px 18px 84px` (o 84 reserva a nav). Glow radial
`${ACCENT}22 → transparente` de 330px no canto superior direito, `zIndex: 0`;
todo o conteúdo em `zIndex: 1`.

Ordem: pill "EVOLUÇÃO DE ENFERMAGEM HOSPITALAR" (ponto pulsante) → título
30px/800 `Um caminho.` + `Toda a clínica.` (itálico, `ACCENT`) com o
`PulseHero` à direita → linha "Todas as áreas hospitalares. / Um único fluxo
adaptativo." (círculo com `Building2`) → card de destaque → lista de
recursos → CTA → dica.

**PulseHero:** 148×80. Grade de 14px em `${ACCENT}` a 0.13 de opacidade sob
o traço; traço de 4px com `stroke-dasharray: 340`, animação `pulsoLinha`
2.6s em loop e duplo `drop-shadow`; círculo de 6px na ponta.

**Card de destaque:** três colunas — círculo com `Zap` preenchido / bloco de
texto (`Evolua em minutos.` + `Ganhe tempo no plantão.` em `ACCENT` +
parágrafo 11.5px) / coluna direita com `Clock` 30px e a tag contornada
"MAIS TEMPO PARA CUIDAR" + `Heart`.

**Lista de recursos:** 4 linhas + rodapé de privacidade, divididas por
`1px solid BORDER` (a última sem borda). Cada linha: quadrado 38px raio 11
com ícone / título 14px + subtítulo 11.5px / tag pill à direita. A tag da
primeira linha é gerada do schema — `até ${CONTEXTS[0].questions.length}
perguntas` — hoje **122**.

**CTA "Iniciar evolução":** gradiente `ACCENT → ACCENT_2`, texto em `BG`,
círculo escuro com seta à esquerda, ECG discreto à direita, sombra
`0 16px 32px -12px ${ACCENT}88`.

### 4.4. Identificação
Leito + iniciais (máx. 6 caracteres, forçadas a maiúsculas). Borda e sombra
do input viram `ACCENT` quando preenchido. "Iniciar perguntas" só habilita
com os dois campos preenchidos. Nome completo nunca é pedido.

### 4.5. Quiz
Cabeçalho com nome do contexto, subtítulo + leito/iniciais, barra de
progresso (`pct` = passo/total) e pill "n de N". Bloco "Contexto adaptativo"
diz se a pergunta é fixa ou foi aberta por uma resposta anterior
(`layer === "condicional"`).

Card da pergunta: gradiente `SURFACE → BG`, filete superior
`linear-gradient(90deg, transparent, ${ACCENT}CC, transparent)`, pill
"PERGUNTA ATUAL", enunciado 22px/700 e o campo conforme `type`:

| `type` | componente | seleção |
|---|---|---|
| `select` | botões em coluna | `Radio` |
| `multi_select` | botões em coluna | `CheckBox` |
| `numeric` | `NumericField` | mostra a classificação automática abaixo |
| `numeric_pair` | `BPField` | dois campos separados por `×` |
| `texto_livre` | `TextField` | — |

Rodapé: Voltar / Continuar (desabilitado até `isAnswered`) + selo COFEN.

### 4.6. Resultado
Selo "Salvo", contagem de perguntas da árvore percorrida, card com o texto
em `whiteSpace: pre-wrap`, botão **Copiar** (`navigator.clipboard`) e
`RotateCcw` para recomeçar. As pendências `(CONFERIR — …)` aparecem no mesmo
bloco de texto, no fim.

### 4.7. Histórico do plantão
Lista de cards "Leito X · INICIAIS" com contexto, data/hora `pt-BR`, texto
completo e botão Copiar por item.

---

## 5. Persistência

`store` (topo de `components/KroniaNurseApp.jsx`) usa `window.storage` quando existe (ambiente de
artifact) e cai em `localStorage` no navegador comum. Chave única:
`historico_plantao`. Grava uma vez por evolução, no momento em que a tela de
resultado abre (`savedThisResult`). Nada sai do dispositivo.

---

## 6. Movimento

Três animações, todas desligadas em `prefers-reduced-motion: reduce`:

| Classe | Efeito | Onde |
|---|---|---|
| `kn-pulso-path` | traça a onda em 2.6s, em loop | `PulseHero`, ECG da home |
| `kn-vivo-dot` | ponto pulsando em 1.6s | pill da home |
| `kn-fade` | fade + subida de 10px em 0.6s | lockup do splash |

Transições de estado (`box-shadow`, `border-color`, `width` da barra de
progresso) ficam entre 0.15s e 0.25s `ease`.

---

## 7. O que o layout **não** tem

- Nenhuma tela, botão ou atalho para o Kronos.
- Nenhum indicador de "gerando…", streaming ou spinner de IA — o texto é
  síncrono.
- Nenhum breakpoint de desktop, sidebar ou grid de página.
- Nenhuma foto ou nome completo de paciente em tela.
