---
target: pages/plantao.tsx
total_score: 25
p0_count: 0
p1_count: 3
timestamp: 2026-07-06T02-00-01Z
slug: pages-plantao-tsx
---
⚠️ DEGRADED: single-context (sem sessão Supabase real para renderização ao vivo; análise via leitura de código-fonte)

## Design Health Score

| # | Heurística | Nota | Achado-chave |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading state, ShiftPulseBar e badge "Registrado" cobrem bem o status; nenhum gap crítico nesta tela |
| 2 | Match System / Real World | 3 | Vocabulário clínico correto (leito, plantão, SAE/COFEN); "KRONOS" some ícone-apenas, sem explicação |
| 3 | User Control and Freedom | 3 | Navegação sempre acessível via bottom nav; nenhuma ação destrutiva ocorre nesta tela em si |
| 4 | Consistency and Standards | 2 | 3 padrões visuais distintos para "ação de navegar" empilhados na mesma tela |
| 5 | Error Prevention | 3 | Sem ações de risco na própria Home; "Encerrar turno" delega a confirmação para outra tela |
| 6 | Recognition Rather Than Recall | 3 | Quase tudo tem rótulo de texto; exceção é o sino (ícone-apenas, e mal-rotulado) |
| 7 | Flexibility and Efficiency | 3 | Atalhos reduzem toques; FAB sempre acessível |
| 8 | Aesthetic and Minimalist Design | 2 | 5-6 cards com peso visual quase idêntico; não há hierarquia clara de "isto é o principal" |
| 9 | Error Recovery | 2 | Só existe estado "carregando" — nenhum caminho de erro visível se a sessão falhar |
| 10 | Help and Documentation | 1 | Nenhuma affordance de ajuda/contexto nesta tela |
| **Total** | | **25/40** | **Acceptable — melhorias significativas necessárias** |

## Anti-Patterns Verdict

**Avaliação manual**: A tela não "grita IA" à primeira vista — usa os tokens certos, nada de gradiente genérico. O tell mais forte está nos quick actions: `globals.css` já define `.kronos-grid`/`.kronos-grid-item`, mas Escalas/KRONOS recriam isso via `style={{...}}` inline, duplicando CSS que já existia. Resultado: três variações do mesmo componente conceitual (botão-pílula, card ícone+label, linha ícone+título+subtítulo+chevron) na mesma tela.

**Scan determinístico**: `detect.mjs --json pages/plantao.tsx` → `[]`, exit 0. Sinal fraco — a leitura manual achou 2 problemas (div sem semântica de botão, contraste insuficiente) que o scan não capturou.

## Overall Impression

A tela cumpre a promessa central do produto (poucos toques até "Novo registro", contagens visíveis) e não comete os pecados do anti-referencial. O maior problema é falta de hierarquia — cinco a seis blocos de peso visual parecido competem pela atenção — e consistência dos padrões de "cartão clicável", que se repetem em três variações diferentes.

## What's Working

1. Persistência de estado resolve um problema real (`salvarTurno` a cada mudança).
2. StatCards e ShiftPulseBar usam os tokens certos, cor com significado único.
3. Estado vazio "Plantão iniciado" acerta o tom — instrutivo, caloroso, sem infantilizar.

## Priority Issues

**[P1] Sino de notificação leva para o Perfil, não para notificações**
- Why it matters: `aria-label="Notificações"` promete uma coisa; `onClick` leva para `/perfil`. Desconexão direta entre anúncio e ação, mais grave para leitor de tela.
- Fix: usar o padrão `.avatar` para o atalho de perfil, ou criar a rota real de notificações.
- Suggested command: `$impeccable clarify`

**[P1] Rótulo "BOM DIA" com contraste abaixo do piso WCAG AA**
- Why it matters: `--color-ink-faint` (~2,6:1 no tema claro) — abaixo de 4,5:1, contradizendo o próprio PRODUCT.md sobre plantão noturno.
- Fix: trocar para `--color-ink-muted` (~6:1).
- Suggested command: `$impeccable harden`

**[P1] Card "Evolução avulsa" é um `<div onClick>` sem semântica de botão**
- Why it matters: inacessível via teclado/leitor de tela; viola WCAG 2.1.1.
- Fix: trocar para `<button>`, replicando o padrão já usado em Escalas/KRONOS.
- Suggested command: `$impeccable harden`

**[P2] Três padrões visuais diferentes para "toque aqui pra ir a outro lugar"**
- Fix: unificar no padrão `.kronos-grid-item`.
- Suggested command: `$impeccable distill`

**[P2] Estado "silencioso" quando há pacientes mas nenhum evento**
- Fix: condição de estado vazio deveria depender só de `eventos.length === 0`.
- Suggested command: `$impeccable harden`

## Persona Red Flags

**Jordan (First-Timer)**: sino sem rótulo visível, destino errado; "KRONOS" sem subtítulo explicativo.
**Sam (Accessibility)**: "Evolução avulsa" inalcançável via teclado; aria-label do sino desconectado da ação; contraste baixo no eyebrow.
**Riley (Stress Tester)**: gap de estado (pacientes>0, eventos=0) produz tela sem feedback nenhum.

## Minor Observations

- Contagens duplicadas entre ShiftPulseBar e StatCards.
- Botão "Gerar evolução" (ação de maior peso clínico) tem alvo de toque menor que "Novo registro".
- Chevron da "Evolução avulsa" com o mesmo problema de contraste do rótulo "BOM DIA".
- Botão do sino em 40×40px, abaixo dos 44×44 recomendados.

## Questions to Consider

- Qual dos botões (Novo registro ou Gerar evolução) merece maior peso visual?
- O sino é um recurso real ainda não construído, ou um atalho de perfil disfarçado?
- Por que Plantão reimplementa `.kronos-grid-item` três vezes em vez de reusar?
