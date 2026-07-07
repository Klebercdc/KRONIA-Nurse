#!/bin/bash
set -euo pipefail

# Only needed in Claude Code on the web, where $HOME is reset per container.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

mkdir -p "$HOME/.claude/skills/caveman-compress"
cp "$CLAUDE_PROJECT_DIR/.claude/skills/caveman-compress/SKILL.md" "$HOME/.claude/skills/caveman-compress/SKILL.md"

cat > "$HOME/.claude/CLAUDE.md" << 'EOF'
# Preferências globais

- Use sempre a skill `caveman-compress` (intensidade **full**) em todas as respostas de texto, em qualquer projeto/sessão, para economizar tokens.
- Código, commits, PRs e blocos de código continuam em linguagem normal — caveman-speak é só para o texto de explicação.
- Se o usuário disser "stop caveman" ou "normal mode", volte ao modo normal imediatamente (para o resto da sessão).
EOF
