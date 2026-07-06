---
target: pages/biblioteca.tsx (tela "Conhecimento", implementação real)
total_score: 22
p0_count: 1
p1_count: 3
timestamp: 2026-07-06T02-00-10Z
slug: pages-biblioteca-tsx
---
⚠️ DEGRADED: single-context (sem sessão Supabase real para renderização ao vivo; análise via leitura de código-fonte)

## Design Health Score

| # | Heurística | Nota | Problema-chave |
|---|---|---|---|
| 1 | Visibilidade do status | 2 | Tocar num card não produz nenhum feedback; "Atualizações recentes" duplica 100% da lista principal com catálogo pequeno |
| 2 | Mundo real | 4 | Nenhum vazamento de linguagem de biblioteca/PDF; vocabulário clínico real, princípio "conhecimento não documento" respeitado |
| 3 | Controle e liberdade | 2 | "Todos" limpa filtro; sem busca nesta tela; Favoritos filtra só sobre o que já foi paginado |
| 4 | Consistência | 3 | Reaproveita bem `.pill`/`.badge`/`.card`; `aria-pressed` só na estrela, não nos pills |
| 5 | Prevenção de erros | 2 | Favoritos client-side + localStorage silencioso cria erro invisível |
| 6 | Reconhecimento vs. memorização | 3 | Chips ícone+texto+contagem; badges com cor E texto |
| 7 | Flexibilidade/eficiência | 2 | Sem busca, sem atalhos |
| 8 | Estética minimalista | 2 | Duplicação exata entre "Atualizações recentes" e lista principal |
| 9 | Recuperação de erros | 1 | Erro de fetch sem botão de "tentar novamente" |
| 10 | Ajuda e documentação | 1 | Nada explica NOVO/ATUALIZADO/REVISADO nem o que Favoritos faz |
| **Total** | | **22/40** | **Aceitável — acessibilidade pontual corrigida, mas gap funcional novo supera o ganho** |

## Anti-Patterns Verdict

Não parece "feito por IA" — sem gradiente, sem emoji, sem glassmorphism. `detect.mjs --json pages/biblioteca.tsx` retornou 1 achado (`side-tab` na borda do card de erro) — falso positivo, é convenção já estabelecida em `.alerta-card`/`.contexto-bar`. O problema real não é estética: a tela implementa fielmente o índice (contagens reais, paginação, status derivado), mas não implementa o conhecimento em si — não existe rota de detalhe em todo o projeto.

## Overall Impression

Corrigiu vários achados pontuais da v3/v5 do mockup (badges cor+texto, aria-label na estrela, alt significativo). Mas a crítica descobriu que nenhum card de conhecimento leva a lugar nenhum. Hoje, com 2 itens, uma enfermeira pode ver que algo existe, favoritá-lo — e nunca conseguir abri-lo. Índice funcional de um livro sem páginas.

## What's Working

1. Badges de status com cor + texto — corrige o achado de daltonismo da v3.
2. Vocabulário 100% alinhado ao domínio clínico, zero "PDF/arquivo/documento/guia".
3. Paginação incremental honesta — "Carregar mais (N restantes)" some corretamente quando não há mais itens.

## Priority Issues

**[P0] Nenhum card de conhecimento é clicável — não existe rota de detalhe em todo o projeto**
- Why it matters: nenhum `Link`/`router.push`/`onClick` de navegação em nenhum card; a API nem devolve os campos de conteúdo (passo a passo, indicações, alertas). A missão central do produto ("consultar procedimentos durante o cuidado") é estruturalmente impossível a partir desta tela.
- Fix: criar rota de detalhe (`pages/conhecimento/[id].tsx`) que busca o registro completo por id; envolver o card num Link (exceto o botão de estrela, com stopPropagation).
- Suggested command: `$impeccable harden`

**[P1] "Atualizações recentes" duplica 100% da lista principal com catálogo pequeno**
- Why it matters: com só 2 itens no banco, os mesmos 2 aparecem em dois estilos visuais diferentes na mesma tela — lê como bug, não como feed.
- Fix: suprimir a seção quando ela cobriria a totalidade do que já aparece na lista principal.
- Suggested command: `$impeccable audit`

**[P1] Favoritos falha silenciosamente e mente sobre estado vazio à medida que o catálogo cresce**
- Why it matters: `localStorage` engole erro em silêncio; filtro "Favoritos" roda só sobre itens já paginados — um item favoritado fora da página/categoria atual simplesmente não aparece, gerando "você ainda não marcou nenhum favorito" falso.
- Fix: avisar quando localStorage falhar; buscar favoritos por id direto da API em vez de filtrar client-side sobre o paginado.
- Suggested command: `$impeccable harden`

**[P1] Contraste WCAG AA falha nos mesmos pontos que a v3/v5 já apontavam, agora no design system real**
- Why it matters: `--color-ink-faint` sobre `--color-surface` ≈ 2,55:1 (linha categoria/subcategoria de cada card); `badge-novo` ≈ 3,16:1; `badge-atualizado` ≈ 3,28:1 — todos abaixo de 4,5:1.
- Fix: escurecer `--color-ink-faint`; escurecer texto dos badges novo/atualizado.
- Suggested command: `$impeccable audit`

**[P2] Chips de categoria com nomes reais mais longos + alvos de toque abaixo de 44px**
- Fix: aumentar padding de `.pill`/`.btn-icone` para ~44px; considerar flex-wrap na fileira de chips.
- Suggested command: `$impeccable adapt`

## Persona Red Flags

**Sam**: contraste ~2,55:1 na linha de categoria de todo card; `aria-pressed` só na estrela, não nos pills.
**Jordan**: toca num card esperando ver o procedimento, nada acontece; sem busca nesta tela.
**Riley**: favorita em modo privado sem aviso de que não vai persistir; troca de categoria e a aba Favoritos afirma "vazio" quando pode não estar.

## Minor Observations

- Nenhuma affordance de busca, apesar de `docs/knowledge-center-architecture.md` descrever "O que você precisa saber?".
- Botão de erro de fetch sem ação de "tentar novamente".
- Stat card "2" em mono-font grande comunica involuntariamente "algo incompleto/quebrado".

## Questions to Consider

- Faz sentido ter validado a primeira versão navegável do índice sem que exista, em lugar nenhum, uma tela que mostre o conhecimento em si?
- "Atualizações recentes" ainda faz sentido como seção separada quando o catálogo cabe inteiro na tela sem rolar?
- É o momento certo de decidir se Favoritos precisa de consulta própria à API antes que o catálogo cresça o suficiente para o bug de "falso vazio" aparecer pra uma enfermeira de verdade?
