/**
 * Ponte Node -> Python pra rodar scripts/docling_parser.py (Docling roda só
 * em Python; o pipeline de ingestão hoje é Node — ver ressalva de
 * "tradeoff" em .claude/skills/docling/SKILL.md).
 *
 * Correções em relação a um spawn() ingênuo:
 * 1. "python" não existe neste ambiente — Docling foi instalado num venv
 *    isolado (/home/user/.venvs/docling), então precisa apontar pro
 *    interpretador de lá, não pro python/python3 do sistema.
 * 2. stdout chega em pedaços arbitrários — um chunk de `data` não é
 *    necessariamente um JSON completo. Acumula tudo e só faz JSON.parse
 *    depois que o processo fecha (evento `close`), junto com o exit code.
 * 3. stderr do Docling é bem verboso (logs de download de modelo/OCR) —
 *    captura separado do stdout e só usa se o processo falhar.
 */
const { spawn } = require('child_process');
const path = require('path');

const PYTHON_VENV = path.join('/home/user/.venvs/docling/bin/python3');
const PARSER_SCRIPT = path.join(__dirname, 'docling_parser.py');

/**
 * @param {string} caminhoPdf
 * @returns {Promise<{ paginas_total: number, chunks: Array<{ texto: string, pagina_inicio: number, pagina_fim: number }> }>}
 */
function parsearPdfComDocling(caminhoPdf) {
  return new Promise((resolve, reject) => {
    const py = spawn(PYTHON_VENV, [PARSER_SCRIPT, caminhoPdf]);

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (data) => { stdout += data.toString(); });
    py.stderr.on('data', (data) => { stderr += data.toString(); });

    py.on('error', (err) => {
      reject(new Error(`Falha ao iniciar docling_parser.py: ${err.message}`));
    });

    py.on('close', (codigoSaida) => {
      if (codigoSaida !== 0) {
        reject(new Error(`docling_parser.py saiu com código ${codigoSaida}:\n${stderr}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (err) {
        reject(new Error(`Resposta do docling_parser.py não é JSON válido: ${err.message}\nstdout: ${stdout.slice(0, 500)}`));
      }
    });
  });
}

module.exports = { parsearPdfComDocling };

if (require.main === module) {
  const caminho = process.argv[2];
  if (!caminho) {
    console.error('Uso: node docling-bridge.js <caminho.pdf>');
    process.exit(1);
  }
  parsearPdfComDocling(caminho)
    .then((resultado) => {
      console.log(`Páginas: ${resultado.paginas_total} | Chunks: ${resultado.chunks.length}`);
      console.log(JSON.stringify(resultado.chunks.slice(0, 2), null, 2));
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
