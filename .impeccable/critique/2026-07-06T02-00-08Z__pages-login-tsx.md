---
target: pages/login.tsx
total_score: 24
p0_count: 1
p1_count: 2
timestamp: 2026-07-06T02-00-08Z
slug: pages-login-tsx
---
Method: single-context com evidência visual real (screenshot Chromium headless 390×844 + inspeção de código); sem sub-agente isolado nesta rodada.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Envio com senha só-espaço falha em silêncio |
| 2 | Match System / Real World | 3 | Copy em PT-BR natural, ícones reconhecíveis |
| 3 | User Control and Freedom | 3 | Fluxo "Esqueci minha senha" com botão de voltar claro |
| 4 | Consistency and Standards | 2 | Layout quebra fisicamente em larguras de celular reais |
| 5 | Error Prevention | 2 | Senha só checada com `!senha` (truthy), não `.trim()` |
| 6 | Recognition Rather Than Recall | 4 | Labels sempre visíveis acima dos campos |
| 7 | Flexibility and Efficiency | 2 | autoComplete correto; sem SSO/atalhos |
| 8 | Aesthetic and Minimalist Design | 3 | Layout limpo, mas bug de overflow quebra a percepção de polimento |
| 9 | Error Recovery | 3 | Mensagem de erro em vermelho, próxima ao contexto |
| 10 | Help and Documentation | 0 | Nenhum link de ajuda/suporte |
| **Total** | | **24/40** | **Acceptable** |

## Anti-Patterns Verdict

Não parece "geração de IA" — sem gradiente, sem glassmorphism, paleta restrita a um único acento. `detect.mjs` retornou `[]`. O achado mais grave é um bug de layout responsivo, fora do escopo do detector estático: comparando screenshot 390px vs 600px, campos de e-mail/senha, link "Esqueci minha senha" e botão "Entrar" são cortados na borda direita especificamente em larguras de celular reais.

## Overall Impression

Sistema de design honesto e bem-comportado. O problema não é estética, é engenharia: a tela quebra fisicamente na largura de tela que a persona-alvo mais usa.

## What's Working

1. Paleta com significado único, sem floreio.
2. Rótulos sempre visíveis acima dos campos.
3. autoComplete correto (email, current-password).

## Priority Issues

**[P0] Campos e botão cortados na borda direita em larguras de celular reais**
- Why it matters: em 390px (iPhone 12/13/14), campo de e-mail, senha, link e botão "Entrar" ficam cortados. Confirmado comparando screenshots.
- Fix: `.auth-input-wrap` é flex mas nem ele nem o `input` interno definem `min-width: 0` — item flex respeita largura mínima de conteúdo, causando overflow. Adicionar `min-width: 0` em ambos.
- Suggested command: `$impeccable harden`

**[P1] Toggle de mostrar/ocultar senha com contraste abaixo do mínimo para controle interativo**
- Why it matters: `--color-ink-faint` sobre branco ≈ 2,55:1, abaixo de 3:1 (WCAG 1.4.11) para componente não-textual.
- Fix: trocar para `--color-ink-muted` (~6:1).
- Suggested command: `$impeccable harden`

**[P1] Envio com senha só-espaço falha silenciosamente**
- Why it matters: `!email.trim() || !senha` — senha não usa `.trim()`; clique não faz nada, sem feedback algum.
- Fix: aplicar `.trim()` também na senha, sempre mostrar mensagem visível.
- Suggested command: `$impeccable harden`

**[P2] Nenhum ponto de ajuda/suporte na tela**
- Suggested command: `$impeccable clarify`

**[P2] Alvo de toque do botão-olho pequeno demais (~26×26px)**
- Suggested command: `$impeccable harden`

## Persona Red Flags

**Jordan**: senha com espaço acidental → app parece travado, sem link de ajuda visível.
**Sam**: botão de mostrar/ocultar senha quase invisível em baixa visão (2,55:1).
**Casey**: sofre diretamente o P0 — campo de senha e botão cortados no celular no corredor.

## Minor Observations

- Selo "protegidos com segurança/LGPD" não é link nem verificável.
- Texto secundário do selo com mesmo contraste fraco (2,55:1).
- Sem spinner visual no botão, só troca de texto para "Entrando...".

## Questions to Consider

- O bug de overflow em 390px já foi testado em dispositivo físico antes?
- A mensagem genérica de erro de login é decisão consciente de segurança ou texto padrão do Supabase?
- Faz sentido SSO/biometria dado o contexto de troca de turno com dispositivo compartilhado?
