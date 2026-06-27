# Telas — como usar `useTurno`

Nenhuma tela aqui tem estilo definido de propósito: a UI deve seguir o
design system que o KRONIA já tem (branco/azul #0055FF, ver
`DESIGN_SYSTEM.md` do projeto principal), não a aparência do protótipo
testado no artifact. O que importa portar é o **comportamento**, abaixo.

## Plantão (dashboard)
Lê `turno.pacientes` e `turno.eventos` do `useTurno()`. Mostra contagem por
complexidade e os últimos registros. Botão "Verificar alertas" chama
`POST /api/plantao/calcular-alertas` com `montarDadosRelatorioFinal()` como
`dados` — exibe os resultados retornados (cada um já vem com `risco` calculado
em código, a tela só renderiza).

## Pacientes
Lista `turno.pacientes`. Formulário usa `adicionarPaciente(leito, dx, complexidade)`.
Lixeira usa `removerPaciente(id)`. Aviso fixo na tela: *"Use apenas leito ou
identificador interno. Nunca nome, CPF ou dado que identifique o paciente."*

## Registrar (botão central "+", não uma aba normal)
Campo de texto (com microfone do teclado nativo — sem gravação customizada
no MVP) + botão "Adicionar" chamando `capturar(texto)`. Lista os eventos com
lápis/lixeira chamando `editarEvento` / `excluirEvento` — essencial: foi o
que resolveu, no teste real, o caso de leito mal identificado por ditado.

## KRONOS (calculadoras manuais)
Formulários de NEWS2/Braden/Morse usando os campos de `lib/scales.ts`
(`NEWS2_CAMPOS`, etc.) e as funções `calcularNews2` / `calcularBraden` /
`calcularMorse` — tudo client-side, sem chamar IA. Botão opcional "salvar
como evento" grava o resultado como uma `EventoTurno` no paciente escolhido.

## Encerramento
1. Botão "Processar plantão completo":
   - `POST /api/plantao/reclassificar` com `montarListaParaReclassificacao()`.
   - Aplica o mapeamento retornado localmente (cria pacientes que faltarem,
     corrige `patientId` dos eventos via `editarEvento`).
   - Para cada paciente com eventos: `POST /api/plantao/gerar-documento`
     com `montarDadosPaciente(p, eventos)`.
   - `POST /api/plantao/relatorio-final` com `montarDadosRelatorioFinal()`.
   - Concatena tudo numa área de texto editável + botão copiar.
2. Texto de responsabilidade fixo (ver seção 5 do blueprint) antes do botão
   "Encerrar plantão" — que chama `encerrarPlantao()` e não tem desfazer.
