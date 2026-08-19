/**
 * Gera public/sw.js e public/versao.json a partir de scripts/sw-template.js.
 *
 * Roda no `prebuild`. A versão é o commit curto quando há git, senão o
 * timestamp — o que importa é que MUDE a cada build, porque é a mudança dos
 * bytes do sw.js que faz o navegador reconhecer um worker novo.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function versao() {
  try {
    const commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    const sujo = execSync('git status --porcelain', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    // Build com árvore suja não pode reusar o hash do commit: dois builds
    // diferentes ficariam com a mesma versão e a atualização não seria vista.
    return sujo ? `${commit}-${Date.now()}` : commit;
  } catch {
    return String(Date.now());
  }
}

const v = versao();
const raiz = path.join(__dirname, '..');
const template = fs.readFileSync(path.join(__dirname, 'sw-template.js'), 'utf8');

fs.writeFileSync(path.join(raiz, 'public', 'sw.js'), template.replace('__VERSAO__', v));
fs.writeFileSync(
  path.join(raiz, 'public', 'versao.json'),
  `${JSON.stringify({ versao: v, gerado: new Date().toISOString() }, null, 2)}\n`,
);

console.log(`sw.js e versao.json gerados — versão ${v}`);
