---
target: pages/perfil.tsx
total_score: 19
p0_count: 1
p1_count: 2
timestamp: 2026-07-06T02-00-03Z
slug: pages-perfil-tsx
---
⚠️ DEGRADED: single-context (sem sessão Supabase real para renderização ao vivo; análise via leitura de código-fonte)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1 | 4 das 7 linhas tocáveis têm `onClick={() => {}}` — tocar não produz nenhuma resposta |
| 2 | Match System / Real World | 3 | Stat card "Turno atual" mostra `{n}p` — rótulo sugere status/duração, valor é contagem de pacientes |
| 3 | User Control and Freedom | 2 | Tema e logout funcionam sem atrito; 4 linhas mortas são becos sem saída sem sinalização |
| 4 | Consistency and Standards | 2 | Todas as linhas compartilham `.profile-row`, tornando linhas mortas indistinguíveis das funcionais |
| 5 | Error Prevention | 3 | Nenhuma ação destrutiva nesta tela em si |
| 6 | Recognition Rather Than Recall | 3 | Ícone + label sempre, nunca ícone isolado |
| 7 | Flexibility and Efficiency | 2 | Só 2 preferências reais hoje (tema, logout) |
| 8 | Aesthetic and Minimalist Design | 2 | "Encerrar turno" recebe o mesmo tratamento visual de "Notificações" |
| 9 | Error Recovery | 1 | Tocar numa linha morta não dá feedback nenhum |
| 10 | Help and Documentation | 0 | Nenhuma ajuda; linhas mortas não explicam o que conteriam |
| **Total** | | **19/40** | **Poor — mais da metade da superfície navegável é decorativa** |

## Anti-Patterns Verdict

Visualmente segue bem o sistema (avatar, stat-card, profile-row). O anti-pattern real: UI que promete ação (chevron + hover + cursor pointer) e entrega nada — de 6 linhas de navegação, só 2 fazem algo real. Consistente com tela "prototipada", estrutura visual entregue antes da lógica.

## Overall Impression

Aparência mais "acabada" de uma tela de configurações, mas dois terços das opções são placeholders sem função. Risco real numa ferramenta clínica: o usuário conclui "o app está com bug", não "a feature ainda não existe".

## What's Working

1. Cabeçalho de identidade limpo, escaneável em <1s.
2. Toggle de tema totalmente funcional, aria-labels corretos.
3. "Sair da conta" com cor+ícone+label consistentes para ação de risco.

## Priority Issues

**[P0] Quatro linhas de navegação completamente mortas (`onClick={() => {}}`)**
- Why it matters: "Dados pessoais", "Privacidade e dados", "Configurações", "Notificações" não fazem nada, visualmente idênticas às que funcionam.
- Fix: implementar os destinos reais, ou remover o chevron e marcar como "Em breve".
- Suggested command: `$impeccable harden`

**[P1] "Encerrar turno" tem o mesmo peso visual que qualquer preferência trivial**
- Fix: tratamento de CTA dedicado, separado da lista de "Preferências".
- Suggested command: `$impeccable bolder`

**[P1] Todas as linhas são `<div onClick>`, não navegáveis por teclado/leitor de tela**
- Fix: converter para `<button>` real ou adicionar role/tabIndex/handlers de teclado.
- Suggested command: `$impeccable harden`

**[P2] Stat card "Turno atual" com rótulo que não corresponde ao valor**
- Fix: renomear para "Pacientes", escrever por extenso.
- Suggested command: `$impeccable clarify`

## Persona Red Flags

**Jordan**: toca em "Notificações"/"Configurações" esperando algo, não recebe resposta nenhuma.
**Sam**: nenhuma `.profile-row` é focável por teclado, incluindo "Encerrar turno".
**"Bia" (plantão noturno)**: precisa achar "Encerrar turno" rápido, mas está misturada com 4 linhas que não fazem nada.

## Minor Observations

- Fallback de iniciais do avatar gera só uma letra quando não há nome.
- Badge "Enfermagem" é string fixa, não derivada de campo real.
- Toggle de tema sem opção "seguir sistema".
- `duracaoHoras` sem proteção contra valores negativos.

## Questions to Consider

- As quatro linhas mortas deveriam não aparecer nesta v1, ou sinalizar roadmap?
- "Encerrar turno" merece CTA separado da lista de Preferências?
- O que a ausência de resposta em "Notificações" comunica sobre confiabilidade do app?
