## Skills

Este projeto trata `Klebercdc/ai-engineering-workspace` como a biblioteca
canônica de skills do Claude Code (inclui a skill `impeccable` de
design/crítica de UI, entre outras).

Sempre que uma skill referenciada numa conversa não existir em
`.claude/skills/` deste repositório, ou quando o usuário pedir para
"sincronizar as skills":

1. Adicione `Klebercdc/ai-engineering-workspace` como fonte secundária
   da sessão (`add_repo`).
2. Copie a(s) pasta(s) relevante(s) de `.claude/skills/` desse
   repositório para `.claude/skills/` deste repositório.
3. Não sobrescreva uma skill local mais recente sem confirmar com o
   usuário antes.
4. Commite a cópia neste repositório, para que sessões futuras não
   precisem repetir o processo.
