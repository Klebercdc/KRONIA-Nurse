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
 * 4. Um spawn por PDF pagaria o carregamento dos modelos (~14s) a cada
 *    arquivo — parsearPdfsComDocling recebe a lista inteira e faz uma única
 *    chamada, docling_parser.py carrega os modelos uma vez e reaproveita
 *    entre os PDFs do lote.
 */
const { spawn } = require('child_process');
const path = require('path');

const PYTHON_VENV = path.join('/home/user/.venvs/docling/bin/python3');
const PARSER_SCRIPT = path.join(__dirname, 'docling_parser.py');

/**
 * @param {string[]} caminhosPdfs
 * @returns {Promise<Record<string, { paginas_total: number, paginas: string[] } | { erro: string }>>}
 *          chave = nome do arquivo (basename), igual ao passado em caminhosPdfs
 */
function parsearPdfsComDocling(caminhosPdfs) {
  return new Promise((resolve, reject) => {
    const py = spawn(PYTHON_VENV, [PARSER_SCRIPT, ...caminhosPdfs]);

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
        resolve(JSON.parse(stdout).documentos);
      } catch (err) {
        reject(new Error(`Resposta do docling_parser.py não é JSON válido: ${err.message}\nstdout: ${stdout.slice(0, 500)}`));
      }
    });
  });
}

module.exports = { parsearPdfsComDocling };

if (require.main === module) {
  const caminhos = process.argv.slice(2);
  if (caminhos.length === 0) {
    console.error('Uso: node docling-bridge.js <caminho1.pdf> [<caminho2.pdf> ...]');
    process.exit(1);
  }
  parsearPdfsComDocling(caminhos)
    .then((documentos) => {
      for (const [nome, resultado] of Object.entries(documentos)) {
        if (resultado.erro) {
          console.log(`${nome}: ERRO — ${resultado.erro}`);
          continue;
        }
        console.log(`${nome}: ${resultado.paginas_total} páginas`);
        console.log(resultado.paginas[0]?.slice(0, 200));
      }
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
