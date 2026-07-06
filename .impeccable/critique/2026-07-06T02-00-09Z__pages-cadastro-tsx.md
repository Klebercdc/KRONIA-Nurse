---
target: pages/cadastro.tsx
total_score: 27
p0_count: 1
p1_count: 2
timestamp: 2026-07-06T02-00-09Z
slug: pages-cadastro-tsx
---
Method: single-context com evidência visual real (screenshot Chromium headless 390×844 + inspeção de código); sem sub-agente isolado nesta rodada.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Feedback em tempo real na regra de senha e mismatch |
| 2 | Match System / Real World | 3 | Mesmo padrão de copy natural do login |
| 3 | User Control and Freedom | 3 | "Voltar" sempre visível; tela de sucesso não permite editar o cadastro |
| 4 | Consistency and Standards | 2 | Mesmo bug de overflow do login + botões de olho sem aria-label (regressão vs. login) |
| 5 | Error Prevention | 4 | Melhor da dupla: botão só habilita com tudo válido |
| 6 | Recognition Rather Than Recall | 4 | Regra de senha visível, muda de cor conforme digitado |
| 7 | Flexibility and Efficiency | 2 | autoComplete presente; sem cadastro social/SSO |
| 8 | Aesthetic and Minimalist Design | 3 | Checklist de senha com uma única regra parece incompleto |
| 9 | Error Recovery | 3 | Mismatch mostrado inline em tempo real |
| 10 | Help and Documentation | 0 | Mesma ausência total de ajuda/suporte |
| **Total** | | **27/40** | **Acceptable** |

## Anti-Patterns Verdict

Assim como o login, sem gradiente/glassmorphism/grid decorativo. Mas há um tell que o login não tem: a tela de sucesso usa emoji bruto (📬) como ícone principal, enquanto o resto do app usa SVG stroke customizado — destoa do sistema visual exatamente no momento de maior carga emocional (peak-end), soando como placeholder não refinado.

## Overall Impression

No papel, a tela mais bem construída das duas (login/cadastro) — validação em tempo real, botão que só habilita quando tudo está correto. Mas herda o mesmo bug crítico de layout do login (componentes compartilhados) e introduz regressão própria: botões de olho sem aria-label, e emoji solto na confirmação.

## What's Working

1. Validação de senha em tempo real e desabilitação inteligente do botão.
2. Feedback inline de "As senhas não coincidem" antes do submit.
3. Tela de confirmação dedicada fecha o loop com clareza do próximo passo.

## Priority Issues

**[P0] Mesmo bug de overflow do login: campos e botão "Criar conta" cortados em 390px**
- Fix: mesmo fix do login — `min-width: 0` em `.auth-input-wrap` e inputs (correção única resolve as duas telas, componentes compartilhados).
- Suggested command: `$impeccable harden`

**[P1] Emoji genérico (📬) na tela de sucesso quebra o sistema de ícones**
- Why it matters: único lugar do fluxo com emoji de plataforma em vez de SVG customizado, no momento de maior carga emocional — alinhado ao anti-padrão "elementos de app de consumo" que PRODUCT.md pede para evitar.
- Fix: substituir por ícone SVG no estilo stroke (envelope com check).
- Suggested command: `$impeccable polish`

**[P1] Botões de mostrar/ocultar senha sem aria-label — regressão em relação ao login**
- Why it matters: login tem `aria-label="Mostrar/ocultar senha"`; cadastro não tem em nenhum dos dois botões equivalentes.
- Fix: adicionar aria-labels correspondentes; resolver também o contraste fraco do ícone.
- Suggested command: `$impeccable harden`

**[P2] Checklist de senha com uma única regra parece funcionalidade inacabada**
- Fix: implementar regras reais adicionais ou simplificar a UI para uma linha de ajuda.
- Suggested command: `$impeccable clarify`

**[P2] Nenhum ponto de ajuda/suporte, mesma lacuna do login**
- Suggested command: `$impeccable clarify`

## Persona Red Flags

**Jordan**: checklist de uma regra só sugere mais rigor do que realmente existe.
**Sam**: botões de olho sem aria-label são anunciados só como "button" sem contexto.
**Jordan/Casey (mobile, primeira vez)**: campos e botão "Criar conta" cortados em 390px — pior primeira impressão possível.

## Minor Observations

- Emoji rompe a paleta de cores do sistema (cores nativas do emoji, fora dos tokens).
- Banner de erro genérico pode aparecer simultâneo à mensagem inline de mismatch.
- Foco do link "Voltar" não verificado via teclado nesta rodada.

## Questions to Consider

- Vale a pena investir em 2-3 regras reais de senha, já que a infraestrutura (`Regra[]`) já existe?
- O emoji foi escolha deliberada de calor, ou placeholder que ficou?
- Faz sentido extrair `auth-input-wrap` + ícones para componente único compartilhado entre login/cadastro?
