# KRONIA Nurse — LAYOUT_ATUAL

Referência extraída do código. Todos os valores são cópias literais dos
arquivos citados. Nenhum valor arredondado ou inferido.

**Stack de estilo:** CSS puro global. **Não há Tailwind**, não há
`tailwind.config`, não há `postcss.config`, não há `tokens.ts`.
Fonte única de tokens: `styles/globals.css` (1042 linhas).
Estilos fora do CSS são `style={{}}` inline em JSX.

`package.json` — nenhuma dependência de UI/ícones/estilo:

```json
"dependencies": {
  "@supabase/supabase-js": "^2.108.2",
  "next": "14.2.29",
  "react": "^18.3.1",
  "react-dom": "^18.3.1"
}
```

---

## 1. CORES

### 1.1. Tokens — tema claro
`styles/globals.css:6-33` — bloco `:root`

| Variável | Hex | Linha |
|---|---|---|
| `--color-bg` | `#FAFBFC` | 7 |
| `--color-surface` | `#FFFFFF` | 8 |
| `--color-ink` | `#13161B` | 9 |
| `--color-ink-muted` | `#5B6470` | 10 |
| `--color-ink-faint` | `#6B7480` | 11 |
| `--color-line` | `#E7EAEE` | 12 |
| `--color-clinical` | `#0B4F8A` | 13 |
| `--color-clinical-tint` | `#EAF2F8` | 14 |
| `--color-clinical-deep` | `#08395F` | 15 |
| `--color-ok` | `#1F9D55` | 16 |
| `--color-ok-tint` | `#E8F7EE` | 17 |
| `--color-warn` | `#B5790C` | 18 |
| `--color-warn-tint` | `#FBF1DE` | 19 |
| `--color-danger` | `#C5293A` | 20 |
| `--color-danger-tint` | `#FBEAEC` | 21 |
| `--color-ok-ink` | `#1B7A45` | 24 |
| `--color-warn-ink` | `#8A5A09` | 25 |

Comentário no código (`globals.css:22-23`): `--color-ok`/`--color-warn`
puros ficam abaixo de 4,5:1 sobre seus próprios tints em tema claro —
`--color-ok-ink` / `--color-warn-ink` são as variantes de texto.

### 1.2. Tokens — tema escuro
`styles/globals.css:35-57` — bloco `[data-theme="dark"]`

| Variável | Hex | Linha |
|---|---|---|
| `--color-bg` | `#0E1116` | 36 |
| `--color-surface` | `#171B21` | 37 |
| `--color-ink` | `#F2F4F6` | 38 |
| `--color-ink-muted` | `#9AA3AE` | 39 |
| `--color-ink-faint` | `#9199A6` | 40 |
| `--color-line` | `#262B33` | 41 |
| `--color-clinical` | `#4F9CDB` | 42 |
| `--color-clinical-tint` | `#16293A` | 43 |
| `--color-clinical-deep` | `#0B4F8A` | 44 |
| `--color-ok` | `#34D399` | 45 |
| `--color-ok-tint` | `#102B20` | 46 |
| `--color-warn` | `#F2B73C` | 47 |
| `--color-warn-tint` | `#332408` | 48 |
| `--color-danger` | `#F2697A` | 49 |
| `--color-danger-tint` | `#33141A` | 50 |
| `--color-ok-ink` | `var(--color-ok)` | 52 |
| `--color-warn-ink` | `var(--color-warn)` | 53 |

Troca de tema: atributo `data-theme` no elemento raiz, definido por
`lib/theme-context.tsx` (`ThemeProvider`, montado em `pages/_app.tsx:52`).

### 1.3. Sombra (token)
`styles/globals.css:28` e `:56`

```css
/* claro */
--shadow-card: 0 1px 3px rgba(16,24,40,.07), 0 4px 10px rgba(16,24,40,.10);
/* escuro */
--shadow-card: inset 0 1px 0 rgba(255,255,255,.05);
```

### 1.4. Hex hardcoded fora dos tokens

**a) Cor da UI do sistema** — `pages/_document.tsx:10`
```html
<meta name="theme-color" content="#0a1220" />
```
Não corresponde a nenhum token (nem `--color-bg` claro nem escuro).

**b) Splash / landing** — `pages/index.tsx:33`
```js
background: 'radial-gradient(circle at 50% 42%, #0c2568 0%, #051540 55%, #030d2c 100%)'
```

**c) Dot da ShiftPulseBar** — `styles/globals.css:828`
```css
background: #5FD18A;      /* verde do "plantão ativo", fora do token --color-ok */
```
Keyframe `pulse-green` (`globals.css:836-840`): `rgba(95,209,138,.55)` → `rgba(95,209,138,0)`.

**d) Sombra do FAB** — `styles/globals.css:166`
```css
box-shadow: 0 6px 16px rgba(11,79,138,.45);   /* --color-clinical em rgba literal */
```

**e) Roxo de cadastro** — `pages/cadastro.tsx:45-46`
```js
cor: '#7C5CFC',
corTint: '#EFEAFE',
```

**f) Âmbar de favorito** — `pages/evolucao-avulsa/index.tsx:261`
```js
color: isFav ? '#f59e0b' : 'var(--color-ink-faint)'
```

**g) Paleta paralela completa (escalas tipo Chakra/Tailwind gray+blue)** —
usada **apenas** em `pages/biblioteca-tecnica.tsx` e
`pages/conhecimento-admin.tsx` (telas de admin). Não passa por nenhum token
e **não reage ao tema escuro**:

| Hex | Ocorrências | Papel aparente |
|---|---|---|
| `#718096` | 26 | texto secundário |
| `#E2E8F0` | 16 | borda |
| `#C53030` | 16 | erro |
| `#4A5568` | 13 | texto |
| `#744210` | 12 | texto alerta |
| `#FFF5F5` | 10 | fundo erro |
| `#276749` | 10 | sucesso |
| `#FFFBEB` | 9 | fundo alerta |
| `#F7FAFC` | 9 | fundo |
| `#FC8181` | 8 | erro claro |
| `#CBD5E0` | 8 | borda |
| `#F6AD55` | 7 | alerta |
| `#F0FFF4` | 6 | fundo sucesso |
| `#2B6CB0` | 6 | azul |
| `#EBF8FF` | 5 | fundo azul |
| `#3182CE` | 5 | azul |
| `#9AE6B4` | 4 | sucesso claro |
| `#F0F0F0` | 3 | borda |
| `#90CDF4` | 3 | azul claro |
| `#2D3748` | 3 | título |
| `#822727`, `#FED7D7`, `#FEEBC8`, `#F6E05E` | 1 cada | — |

**h) Branco literal:** `#fff` aparece 39× em CSS + inline (ex.:
`.btn-primario` `globals.css:227`, `.nav-fab` `globals.css:158`).

---

## 2. TIPOGRAFIA

### 2.1. Famílias
`styles/globals.css:30-32`

```css
--font-display: 'Space Grotesk', 'Segoe UI', sans-serif;
--font-body:    'Inter', 'Segoe UI', sans-serif;
--font-mono:    'IBM Plex Mono', 'SF Mono', 'Fira Mono', monospace;
```

**As fontes não são carregadas em lugar nenhum.** Não há `@import`, não há
`@font-face`, não há `next/font`, não há `<link>` para Google Fonts em
`pages/_document.tsx`. Grep por `Space Grotesk|IBM Plex|Inter|@font-face|@import|fonts.googleapis|next/font`
retorna apenas as três linhas de declaração acima. Na prática o app cai no
fallback (`Segoe UI` / `sans-serif` / mono do sistema) salvo se a fonte
estiver instalada no dispositivo.

Base: `html, body` — `font-family: var(--font-body)`, `font-size: 16px`
(`globals.css:66-73`). `1rem = 16px`.

Helpers: `.display-font` / `.mono-font` (`globals.css:183-184`).

### 2.2. Tamanhos e pesos — títulos

| Uso | Seletor / origem | font-size | font-weight | Família |
|---|---|---|---|---|
| Título de tela | `.tela-titulo` `globals.css:935-941` | `1.3rem` | `700` | display |
| Nome do usuário (Home) | inline `pages/plantao.tsx:38-45` | `1.45rem` | `700` | display, `line-height: 1.15` |
| Splash KRONIA Nurse | inline `pages/_app.tsx:32` | `1.4rem` | `800` | display |
| Título de card | `.card-titulo` `globals.css:196-205` | `0.8rem` | `700` | body, uppercase, `letter-spacing: 0.05em` |
| Título de seção admin | inline `pages/biblioteca-tecnica.tsx:1251` | `0.9rem` | `700` | — |
| Avatar (iniciais) | `.avatar` `globals.css:1029-1041` | `1.3rem` | `800` | display |

### 2.3. Tamanhos e pesos — números / displays

| Uso | Seletor | font-size | font-weight | Extra |
|---|---|---|---|---|
| Valor de stat card | `.stat-card-value` `globals.css:861-867` | `1.75rem` | `800` | mono, `line-height: 1` |
| Total de escala | `.escala-total` `globals.css:436-441` | `2.8rem` | `800` | `line-height: 1` |
| Leito ativo | `.contexto-leito` `globals.css:586-592` | `1.1rem` | `800` | `letter-spacing: -0.01em`, `line-height: 1.1` |
| Valor do stepper | `.stepper-value` `globals.css:1019-1026` | `1.15rem` | `700` | mono |

### 2.4. Corpo

| Uso | Seletor | font-size | font-weight | line-height |
|---|---|---|---|---|
| Base | `html, body` `globals.css:70` | `16px` | — | — |
| Texto de evento | `.evento-texto` `globals.css:362-366` | `0.875rem` | — | `1.45` |
| Texto de sessão | `.sessao-texto` `globals.css:788-792` | `0.9rem` | — | `1.5` |
| Textarea de captura | `.captura-textarea` `globals.css:666-677` | `1rem` | — | `1.55` |
| Placeholder | `.captura-textarea::placeholder` `globals.css:679-682` | `0.9rem` | — | — |
| Input de campo | `.campo input/select/textarea` `globals.css:268` | `0.95rem` | — | — |
| Input de auth | `.auth-input-wrap input` `globals.css:302` | `0.95rem` | — | — |
| Área de documento | `.documento-area` `globals.css:452-466` | `0.82rem` | — | `1.6` |
| Estado vazio | `.estado-vazio` `globals.css:520-526` | `0.9rem` | — | — |
| Linha de perfil | `.profile-row-label` `globals.css:915-920` | `0.92rem` | `500` | — |
| Risco de escala | `.escala-risco` `globals.css:444-450` | `0.92rem` | `600` | — |
| Aviso de privacidade | `.aviso-privacidade` `globals.css:547-557` | `0.78rem` | — | `1.5` |
| Texto de responsabilidade | `.texto-responsabilidade` `globals.css:562-572` | `0.78rem` | — | `1.6` |

### 2.5. Labels / captions / pills

| Uso | Seletor | font-size | font-weight | letter-spacing |
|---|---|---|---|---|
| Label de nav | `.nav-item` `globals.css:135-136` | `0.62rem` | `500` (ativo `700`, :147) | — |
| Label de stat card | `.stat-card-label` `globals.css:853-859` | `0.72rem` | `700` | `0.05em` |
| Label de campo | `.campo label` `globals.css:247-255` | `0.75rem` | `700` | `0.04em` |
| Badge | `.badge` `globals.css:308-318` | `0.68rem` | `700` | `0.04em` |
| Tag de tipo | `.tipo-tag` `globals.css:477-484` | `0.65rem` | `700` | `0.04em` |
| Pill de tipo de sessão | `.sessao-tipo-pill` `globals.css:770-779` | `0.65rem` | `700` | `0.04em` |
| Hora de evento | `.evento-hora` `globals.css:353-360` | `0.72rem` | `700` | — |
| Pill de hora | `.sessao-hora-pill` `globals.css:734-744` | `0.72rem` | `800` | `0.02em` |
| Pill de leito | `.sessao-leito-pill` `globals.css:746-757` | `0.72rem` | `700` | — |
| Pill sem leito | `.sessao-sem-leito-pill` `globals.css:760-768` | `0.72rem` | `700` | — |
| ShiftPulseBar | `.shift-pulse-bar` `globals.css:809-822` | `0.72rem` | `600` | `0.02em` |
| Label de captura | `.captura-label` `globals.css:655-662` | `0.72rem` | `700` | `0.06em` |
| Título de sessões | `.sessoes-titulo` `globals.css:707-713` | `0.72rem` | `700` | `0.06em` |
| Sub de contexto | `.contexto-sub` `globals.css:595-599` | `0.72rem` | — | — |
| Preview de captura | `.captura-preview` `globals.css:684-691` | `0.75rem` | `600` | — |
| Select de contexto | `.contexto-select` `globals.css:601-612` | `0.78rem` | `600` | — |
| Pill de filtro | `.pill` `globals.css:870-883` | `0.8rem` | `600` | — |
| Valor de linha de perfil | `.profile-row-value` `globals.css:922-926` | `0.8rem` | — | — |
| Saudação (Home) | inline `pages/plantao.tsx:27-33` | `0.65rem` | — | `0.08em`, mono, uppercase |
| Contadores da pulse bar | inline `components/ShiftPulseBar.tsx:20` | `0.68rem` | `400` | mono |

**Escala de pesos em uso:** `400`, `500`, `600`, `700`, `800`. Não há `300` nem `900`.

---

## 3. ÍCONES

**Nenhuma biblioteca de ícones.** Sem `lucide-react`, sem `heroicons`, sem
`react-icons` — `package.json` não tem dependência de ícones.

Todos os ícones são **SVG inline**, escritos à mão como funções React locais
dentro de cada arquivo (ex.: `IconHome`, `IconPacientes`, `IconMais`,
`IconKronos`, `IconPerfil` em `components/Layout.tsx:75-120`). Os paths são
de traçado Feather/Lucide, mas copiados manualmente — não importados.

**72 SVGs inline**, distribuídos assim:

```
pages/cadastro.tsx                     12    pages/perfil.tsx                 8
pages/biblioteca.tsx                   11    pages/plantao.tsx                7
pages/login.tsx                         6    pages/evolucao-avulsa/index.tsx  6
components/Layout.tsx                   5    pages/evolucao-avulsa/[tipo]/preview.tsx  5
pages/pacientes.tsx                     3    pages/encerramento.tsx           2
pages/escalas.tsx                       2    pages/registrar.tsx              2
pages/evolucao-avulsa/[tipo]/index.tsx  2    pages/conhecimento/[id].tsx      1
```

### Estilo
- **Outline, 100%.** `fill="none"` em 70 de 70 ocorrências de atributo `fill`.
  Única exceção condicional: `pages/biblioteca.tsx:481`
  (`fill={preenchida ? 'currentColor' : 'none'}` — ícone de favorito).
- **`viewBox="0 0 24 24"`** em 72 de 72. Sem exceção.
- **`stroke="currentColor"`** é o padrão; variantes literais existem
  (`stroke="var(--color-clinical)"`, `stroke={cor}`, `stroke="var(--color-ink-faint)"`).
- `strokeLinecap="round"` + `strokeLinejoin="round"` na maioria.

### stroke-width — contagem real

| Valor | Ocorrências | Onde |
|---|---|---|
| `"2"` | 43 | padrão geral |
| `{2}` | 8 | idem, em JSX numérico (`components/Layout.tsx:77,86,106,115`) |
| `"2.5"` | 11 | ícones de ênfase (`+`) |
| `{2.5}` | 1 | `components/Layout.tsx:97` — ícone do FAB |
| `"1.8"` | 7 | `pages/cadastro.tsx:700,709,718`; `pages/biblioteca.tsx:481,543,552,570` |
| `"1.5"` | 2 | ícones grandes: `pages/cadastro.tsx:727` (48px), `pages/login.tsx:366` (32px) |
| `"3"` | 1 | `pages/cadastro.tsx:738` — check de 14px |

**Padrão: `2`. Ênfase: `2.5`. Ícones grandes (32–48px) afinam para `1.5`.**

### Tamanhos renderizados

```
16×16  28×     18×18  20×     14×14   7×     7×7     4×
22×22   2×     20×20   2×     15×15   2×     13×13   3×
48×48   1×     32×32   1×     28×28   1×     17×17   1×
```

Ícones da bottom nav não usam atributo `width`/`height` — o tamanho vem do
CSS: `.nav-item svg { width: 22px; height: 22px; }` (`globals.css:150-153`)
e `.nav-fab svg { width: 28px; height: 28px; }` (`globals.css:177-180`).

---

## 4. COMPONENTES DE CARD / BOTÃO

### 4.1. Card base — `.card` (o mais usado)
`styles/globals.css:187-205`

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 10px;
  box-shadow: var(--shadow-card);
}

.card-titulo {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-ink-muted);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: var(--font-body);
}
```

| Propriedade | Valor |
|---|---|
| radius | `14px` |
| padding | `14px 16px` |
| sombra | `--shadow-card` |
| borda | `1px solid var(--color-line)` |
| margin-bottom | `10px` |

Não existe componente React `<Card>` — `.card` é aplicado direto como
`className` no JSX de cada página.

### 4.2. Stat card
`styles/globals.css:842-867`

```css
.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: var(--shadow-card);
}

.stat-card-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-ink-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-card-value {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--color-ink);
  font-family: var(--font-mono);
  line-height: 1;
}
```

Uso (`pages/plantao.tsx:72-82`):

```jsx
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
  <div className="stat-card">
    <span className="stat-card-label">Pacientes</span>
    <span className="stat-card-value">{turno.pacientes.length}</span>
  </div>
  <div className="stat-card">
    <span className="stat-card-label">Registros</span>
    <span className="stat-card-value">{turno.eventos.length}</span>
  </div>
</div>
```

### 4.3. Card de ação em grid — `.kronos-grid-item`
`styles/globals.css:943-988`

```css
.kronos-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}

.kronos-grid-item {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: 14px;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
  box-shadow: var(--shadow-card);
  transition: border-color 0.15s, background 0.15s, transform 0.15s, box-shadow 0.15s;
}

@media (hover: hover) {
  .kronos-grid-item:hover { transform: translateY(-1px); }
}

@media (prefers-reduced-motion: reduce) {
  .kronos-grid-item { transition: border-color 0.15s, background 0.15s; }
}

.kronos-grid-item:hover {
  border-color: var(--color-clinical);
  background: var(--color-clinical-tint);
}

.kronos-grid-item-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--color-clinical-tint);
  color: var(--color-clinical);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### 4.4. Card de ação da Home (inline, "Evolução avulsa")
`pages/plantao.tsx:120-165` — cópia literal:

```jsx
<button
  onClick={() => router.push('/evolucao-avulsa')}
  style={{
    width: '100%',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-line)',
    borderRadius: 14,
    padding: '14px 16px',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    gap: 12,
    textAlign: 'left',
  }}
>
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <div style={{
      width: 36,
      height: 36,
      borderRadius: 10,
      background: 'var(--color-clinical-tint)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--color-clinical)',
      flexShrink: 0,
    }}>
      <IconEvolucao />
    </div>
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-ink)', marginBottom: 2 }}>
        Evolução avulsa
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
        35 tipos · admissão, alta, transferência, HD e mais
      </div>
    </div>
  </div>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
</button>
```

Nota: este card **não tem `box-shadow`** (diverge de `.card` / `.kronos-grid-item`).

### 4.5. Card de destaque (CTA "Encerrar turno")
`pages/plantao.tsx:167-179`

```jsx
<div
  style={{
    background: 'var(--color-clinical-tint)',
    border: '1px solid rgba(11,79,138,.18)',
    borderRadius: 14,
    padding: '16px',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  }}
>
```

### 4.6. Botões
`styles/globals.css:206-242` — bloco completo:

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 18px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  transition: opacity 0.15s, transform 0.1s;
  font-family: var(--font-body);
  border: none;
  cursor: pointer;
}

.btn:active { transform: scale(0.97); }
.btn:disabled { opacity: 0.45; pointer-events: none; }

.btn-primario {
  background: var(--color-clinical);
  color: #fff;
}
.btn-primario:hover { background: var(--color-clinical-deep); }

.btn-secundario {
  background: var(--color-surface);
  color: var(--color-ink);
  border: 1px solid var(--color-line);
}

.btn-perigo {
  background: var(--color-danger);
  color: #fff;
}

.btn-bloco { width: 100%; }
```

| | Primário | Secundário | Perigo |
|---|---|---|---|
| background | `#0B4F8A` (`--color-clinical`) | `#FFFFFF` (`--color-surface`) | `#C5293A` (`--color-danger`) |
| color | `#fff` | `--color-ink` | `#fff` |
| border | nenhuma | `1px solid var(--color-line)` | nenhuma |
| hover | `--color-clinical-deep` `#08395F` | — | — |
| radius | `12px` | `12px` | `12px` |
| padding | `12px 18px` | `12px 18px` | `12px 18px` |
| font-size | `0.9rem` | `0.9rem` | `0.9rem` |
| font-weight | `600` | `600` | `600` |
| gap ícone/texto | `6px` | `6px` | `6px` |
| sombra | nenhuma | nenhuma | nenhuma |
| :active | `scale(0.97)` | idem | idem |
| :disabled | `opacity: 0.45` | idem | idem |

Uso na Home, com override inline de radius/padding (`pages/plantao.tsx:85-102`):

```jsx
<button
  className="btn btn-primario"
  style={{ borderRadius: 14, padding: '14px 12px', fontSize: '0.88rem', justifyContent: 'center' }}
  onClick={() => router.push('/registrar')}
>
  <IconMais />
  Novo registro
</button>
<button
  className="btn btn-secundario"
  style={{ borderRadius: 14, padding: '14px 12px', fontSize: '0.88rem', justifyContent: 'center' }}
  onClick={() => router.push('/pacientes')}
>
  <IconPacientes />
  Pacientes
</button>
```

O botão azul "Novo registro" **não** usa o radius `12px` do `.btn` — é
sobrescrito para `14px` inline, para casar com os cards.

### 4.7. Botão de ícone — `.btn-icone`
`styles/globals.css:376-395`

```css
.btn-icone {
  background: none;
  color: var(--color-ink-faint);
  padding: 5px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
}

.btn-icone:hover {
  color: var(--color-ink);
  background: var(--color-clinical-tint);
}

.btn-icone.perigo:hover {
  color: var(--color-danger);
  background: var(--color-danger-tint);
}
```

### 4.8. FAB
`styles/globals.css:156-180`

```css
.nav-fab {
  background: var(--color-clinical);
  color: #fff;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  box-shadow: 0 6px 16px rgba(11,79,138,.45);
  transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
  flex-shrink: 0;
  border: none;
  cursor: pointer;
}

.nav-fab:active { transform: scale(0.93); }
.nav-fab svg { width: 28px; height: 28px; }
```

---

## 5. ESPAÇAMENTO

**Não há escala formal.** Nenhum token de spacing, nenhuma variável
`--space-*`. Valores são literais em px, escolhidos caso a caso. Na prática
convergem para uma **base de 2px com preferência forte por pares**.

### Border-radius — contagem real (CSS + inline)

| Valor | Ocorrências |
|---|---|
| `4px` | 3 |
| `6px` | 16 |
| `7px` | 3 |
| `8px` | 18 |
| `10px` | 12 |
| `12px` | 19 |
| `14px` | 18 |
| `16px` | 1 |
| `20px` | 4 |
| `999px` | 4 |
| `50%` | avatar, FAB, dot, spinner |

Convenção observada: **`14px` = card/bloco · `12px` = botão · `10px` = ícone
em container · `8px`/`7px` = elemento pequeno · `20px`/`999px` = pill/badge
· `50%` = circular.**

### Gap — contagem real

| Valor | Ocorrências |
|---|---|
| `0` | 1 |
| `2px` | 2 |
| `3px` | 1 |
| `4px` | 11 |
| `5px` | 1 |
| `6px` | 17 |
| `7px` | 1 |
| `8px` | 38 |
| `10px` | 24 |
| `12px` | 18 |
| `14px` | 5 |
| `16px` | 2 |

**Dominantes: `8px`, `10px`, `12px`.** `gap: 10` é o padrão de grid 2-col.

### Margin-bottom — contagem real

| Valor | Ocorrências |
|---|---|
| `0` | 1 |
| `2px` | 2 |
| `4px` | 6 |
| `5px` | 1 |
| `6px` | 7 |
| `8px` | 14 |
| `10px` | 16 |
| `12px` | 15 |
| `14px` | 12 |
| `16px` | 20 |
| `18px` | 1 |
| `20px` | 11 |
| `24px` | 5 |
| `28px` | 1 |
| `32px` | 1 |

**`16px` entre seções · `10px` entre cards irmãos.**

### Padding — valores em uso (CSS)

```
.card                 14px 16px      .stat-card            14px 16px
.btn                  12px 18px      .kronos-grid-item     16px 14px
.main-content         0 16px calc(var(--nav-height) + 20px)
.bottom-nav           0 4px          .nav-item             6px 8px
.shift-pulse-bar      8px 16px       .top-bar              14px 16px 10px
.tela-header          16px 0 12px    .profile-row          13px 0
.pill                 6px 14px       .badge                (globals.css:308+)
.sessao-card          12px 14px      .contexto-bar         12px 14px
.captura-wrapper      13px 14px      .texto-responsabilidade  12px 14px
.aviso-privacidade    10px 13px      .campo input          10px 12px
.contexto-select      5px 8px        .btn-icone            5px
.estado-vazio         40px 20px      pills de sessão       3px 8px / 3px 7px
```

### Constantes estruturais

| Constante | Valor | Origem |
|---|---|---|
| Largura do shell | `480px` | `.app-shell` `globals.css:94`, `.bottom-nav` `:116` |
| Gutter horizontal | `16px` | `.main-content` `globals.css:106` |
| Altura da nav | `68px` | `--nav-height` `globals.css:29` |
| Padding-bottom do conteúdo | `calc(68px + 20px)` = `88px` | `globals.css:106` |
| Altura mínima | `100dvh` | `.app-shell` `globals.css:96` |

---

## 6. ESTRUTURA DE TELA

### 6.1. Composição

```
pages/_app.tsx
└── <Head> viewport: width=device-width, initial-scale=1, maximum-scale=1   (:50)
└── <ThemeProvider>                                                          (:52)
    └── <AuthProvider>                                                       (:53)
        └── <AuthGate>                                                       (:54)
            └── <Component {...pageProps} />                                 (:55)
                └── <Layout>   ← importado por página, NÃO por _app
```

`ROTAS_PUBLICAS = ['/', '/login', '/cadastro']` (`pages/_app.tsx:9`).

### 6.2. App shell
`styles/globals.css:93-107`

```css
.app-shell {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100dvh;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  position: relative;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px calc(var(--nav-height) + 20px);
}
```

`.main-content` **não tem padding-top** — o espaçamento superior vem do
primeiro bloco de cada tela.

### 6.3. Header / topo

Há **três** mecanismos, e nenhum é um componente `<Header>` compartilhado:

**a) `ShiftPulseBar` — sticky, único header compartilhado**
`components/ShiftPulseBar.tsx` (arquivo inteiro, 25 linhas):

```jsx
import { useTurno } from './useTurno';

export default function ShiftPulseBar() {
  const { turno } = useTurno();

  const inicio = new Date(turno.iniciadoEm);
  const horaInicio = inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const nPacientes = turno.pacientes.length;
  const nRegistros = turno.eventos.length;

  return (
    <div className="shift-pulse-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="shift-pulse-dot" />
        <span>PLANTÃO ATIVO</span>
        <span style={{ opacity: 0.65, marginLeft: 4, fontFamily: 'var(--font-mono)', fontWeight: 400 }}>
          desde {horaInicio}
        </span>
      </div>
      <div style={{ opacity: 0.75, fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: '0.68rem' }}>
        {nPacientes}p · {nRegistros}r
      </div>
    </div>
  );
}
```

CSS (`globals.css:809-840`):

```css
.shift-pulse-bar {
  background: var(--color-clinical-deep);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  position: sticky;
  top: 0;
  z-index: 20;
}

.shift-pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #5FD18A;
  display: inline-block;
  margin-right: 7px;
  flex-shrink: 0;
  animation: pulse-green 2s ease-in-out infinite;
}

@keyframes pulse-green {
  0%   { box-shadow: 0 0 0 0 rgba(95,209,138,.55); }
  70%  { box-shadow: 0 0 0 7px rgba(95,209,138,0); }
  100% { box-shadow: 0 0 0 0 rgba(95,209,138,0); }
}
```

Condição de render (`components/Layout.tsx:4, 21`):

```jsx
const ROTAS_SEM_PULSE = ['/login', '/cadastro', '/'];
...
{showPulseBar && !ROTAS_SEM_PULSE.includes(rota) && <ShiftPulseBar />}
```

`showPulseBar` tem default `true` e nenhuma página passa a prop hoje.

**b) `.tela-header` — não sticky.** Header padrão das telas internas.
`styles/globals.css:928-941`:

```css
.tela-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0 12px;
}

.tela-titulo {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--color-ink);
  font-family: var(--font-display);
}
```

Usado em: `pacientes.tsx:52`, `biblioteca.tsx:178`, `perfil.tsx:28`,
`encerramento.tsx:182`, `escalas.tsx`, `biblioteca-tecnica.tsx:332`.

**c) `.top-bar` — sticky, definido mas não usado nas telas principais.**
`styles/globals.css:800-807`:

```css
.top-bar {
  padding: 14px 16px 10px;
  background: var(--color-bg);
  position: sticky;
  top: 0;
  z-index: 10;
}
```

**d) Header inline da Home** (`pages/plantao.tsx:24-71`) — não usa
`.tela-header` nem `.top-bar`. Bloco `padding: '18px 0 10px'`,
`justifyContent: 'space-between'`: saudação mono `0.65rem` +
nome display `1.45rem` à esquerda; botão circular de 40px com as iniciais
(`background: 'var(--color-clinical-deep)'`, `fontSize: '0.85rem'`,
`fontWeight: 800`) à direita, navegando para `/perfil`.

### 6.4. Bottom nav

`styles/globals.css:110-180`:

```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  height: var(--nav-height);
  background: var(--color-surface);
  border-top: 1px solid var(--color-line);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 100;
  padding: 0 4px;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 8px;
  border-radius: 10px;
  color: var(--color-ink-faint);
  font-size: 0.62rem;
  font-weight: 500;
  min-width: 52px;
  transition: color 0.15s;
  font-family: var(--font-body);
  background: none;
  border: none;
  cursor: pointer;
}

.nav-item.ativo {
  color: var(--color-clinical);
  font-weight: 700;
}

.nav-item svg {
  width: 22px;
  height: 22px;
}
```

JSX (`components/Layout.tsx:25-70`) — cópia literal:

```jsx
<nav className="bottom-nav">
  {/* Home */}
  <button
    className={`nav-item${rota === '/plantao' ? ' ativo' : ''}`}
    onClick={() => navegar('/plantao')}
  >
    <IconHome />
    Home
  </button>

  {/* Pacientes */}
  <button
    className={`nav-item${rota === '/pacientes' ? ' ativo' : ''}`}
    onClick={() => navegar('/pacientes')}
  >
    <IconPacientes />
    Pacientes
  </button>

  {/* FAB */}
  <button
    className="nav-fab"
    onClick={() => navegar('/registrar')}
    aria-label="Registrar"
  >
    <IconMais />
  </button>

  {/* KRONOS — aponta para Conhecimento, que também dá acesso a Escalas */}
  <button
    className={`nav-item${rota === '/biblioteca' || rota.startsWith('/conhecimento') || rota === '/escalas' ? ' ativo' : ''}`}
    onClick={() => navegar('/biblioteca')}
  >
    <IconKronos />
    KRONOS
  </button>

  {/* Perfil */}
  <button
    className={`nav-item${rota === '/perfil' || rota === '/encerramento' ? ' ativo' : ''}`}
    onClick={() => navegar('/perfil')}
  >
    <IconPerfil />
    Perfil
  </button>
</nav>
```

**Itens de hoje — 5 slots, nesta ordem:**

| # | Rótulo | Ícone (path) | Destino | Ativo quando `router.pathname` |
|---|---|---|---|---|
| 1 | Home | casa — `M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z` + `polyline 9 22 9 12 15 12 15 22` | `/plantao` | `=== '/plantao'` |
| 2 | Pacientes | duas pessoas | `/pacientes` | `=== '/pacientes'` |
| 3 | *(sem rótulo)* | `+` — duas `line`, `strokeWidth={2.5}` | `/registrar` | nunca |
| 4 | KRONOS | livro aberto | `/biblioteca` | `=== '/biblioteca'` ou `startsWith('/conhecimento')` ou `=== '/escalas'` |
| 5 | Perfil | pessoa | `/perfil` | `=== '/perfil'` ou `=== '/encerramento'` |

Definições dos ícones: `components/Layout.tsx:75-120`.

### 6.5. Z-index

| Camada | z-index | Origem |
|---|---|---|
| `.bottom-nav` | `100` | `globals.css:123` |
| `.shift-pulse-bar` | `20` | `globals.css:821` |
| `.top-bar` | `10` | `globals.css:806` |

---

## Resumo de divergências encontradas

Fatos, não recomendações:

1. **Fontes declaradas mas nunca carregadas** — `Space Grotesk`, `Inter` e
   `IBM Plex Mono` só existem como nome de família em `globals.css:30-32`.
   Sem `@font-face`, `@import`, `next/font` ou `<link>`.
2. **Duas paletas coexistem** — a tokenizada (`:root` / `[data-theme]`) e uma
   paralela hardcoded (`#718096`, `#E2E8F0`, `#C53030`, `#3182CE`…) restrita
   a `biblioteca-tecnica.tsx` e `conhecimento-admin.tsx`. A segunda não
   reage ao tema escuro.
3. **`theme-color` do PWA** (`#0a1220`, `_document.tsx:10`) não bate com
   `--color-bg` de nenhum dos dois temas.
4. **Radius do `.btn` é sobrescrito inline** (`12px` → `14px`) nas ações da Home.
5. **Sem escala de spacing** — valores literais; convergem para 8/10/12/16
   por hábito, não por sistema.
6. **Ícones sem biblioteca** — 72 SVGs inline duplicados entre arquivos
   (`IconMais`, `IconPacientes`, `IconKronos` existem tanto em
   `components/Layout.tsx` quanto em `pages/plantao.tsx`, com tamanhos
   diferentes).
7. **Card de ação da Home sem `box-shadow`**, diferente de `.card` e
   `.kronos-grid-item` que usam `--shadow-card`.
