/**
 * Pipeline RAG — KRONIA Nurse
 *
 * Baixa PDFs oficiais do Google Drive (pasta `kronia-nurse-pdfs`), extrai o
 * texto, divide em fragmentos, gera embeddings (Cohere) e grava em
 * conhecimento_documentos / conhecimento_fragmentos no Supabase
 * (migration 20260703_conhecimento_rag.sql).
 *
 * Uso (local, nunca na Vercel):
 *   npm run rag:pipeline
 *
 * Requisitos:
 *   - .env.local com SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL),
 *     SUPABASE_SERVICE_ROLE_KEY e COHERE_API_KEY
 *   - credentials.json (OAuth Google Cloud) na raiz para baixar do Drive.
 *     Sem credentials.json, o download é pulado e o script indexa os PDFs
 *     já presentes em public/pdfs-conhecimento/.
 *
 * O embedding usa embed-multilingual-v3.0 (1024 dims) — o MESMO modelo de
 * lib/embeddings.ts, que gera o embedding das consultas. Indexação e busca
 * precisam compartilhar o espaço vetorial; não trocar só de um lado.
 *
 * Chunking (CHUNKING_VERSION): divisão por sentenças ciente de abreviações
 * do português jurídico/clínico, alvo ~350 tokens (teto duro 480 — a Cohere
 * trunca em 512), overlap de 1–2 sentenças entre chunks consecutivos e
 * remoção de cabeçalhos/rodapés repetidos por página. A versão entra no
 * hash do documento: mudar a estratégia reindexa tudo automaticamente.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PDFParse } = require('pdf-parse');
const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
const { parsearPdfsComDocling } = require('./docling-bridge');

// ═════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═════════════════════════════════════════════════════════════

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cohereApiKey = process.env.COHERE_API_KEY;

const COHERE_EMBED_URL = 'https://api.cohere.com/v2/embed';
const EMBED_MODEL = 'embed-multilingual-v3.0'; // manter igual a lib/embeddings.ts
const COHERE_BATCH_MAX = 96; // limite de textos por chamada da API de embed

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const TOKEN_PATH = path.join(process.cwd(), 'google-drive-token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const PDF_DIR = path.join(process.cwd(), 'public/pdfs-conhecimento');
const DRIVE_FOLDER_NAME = 'kronia-nurse-pdfs';

// Metadados dos PDFs oficiais (chave = nome exato do arquivo no Drive)
const PDF_METADATA = {
  'RDC-11.pdf': {
    tipo: 'RDC',
    instituicao: 'ANVISA',
    versao: '11/2014',
    ano: 2014,
    descricao: 'Resolução - Requisitos Boas Práticas Serviços Diálise',
  },
  'Portaria-no-529-do-Programa-de-Seguranca-do-Paciente.pdf': {
    tipo: 'Portaria',
    instituicao: 'Ministério da Saúde',
    versao: '529/2013',
    ano: 2013,
    descricao: 'Programa Nacional de Segurança do Paciente',
  },
  'caderno-4-medidas-de-prevencao-de-infeccao-relacionada-a-assistencia-a-saude.pdf': {
    tipo: 'Caderno',
    instituicao: 'ANVISA',
    versao: '2ª edição / 2017',
    ano: 2017,
    descricao: 'Medidas de Prevenção de Infecção Relacionada à Assistência à Saúde',
    // Tabelas e layout multi-coluna que o pdf-parse embaralha — ver análise
    // Docling vs. pdf-parse. Docling entra só como parser (reading order +
    // estrutura de tabela); o chunking continua sendo o daqui (ver scripts/docling-bridge.js).
    parser: 'docling',
  },
  'Código-de-Ética-dos-profissionais-de-Enfermagem.pdf': {
    tipo: 'Legislação',
    instituicao: 'COFEN',
    versao: '2018',
    ano: 2018,
    descricao: 'Legislação dos Profissionais de Enfermagem - Código de Ética',
  },
  'processo_de_enfermagem.pdf': {
    tipo: 'Guia',
    instituicao: 'COREN-SP',
    versao: '3ª edição / Resolução 736/2024',
    ano: 2024,
    descricao: 'Processo de Enfermagem - Guia para a Prática',
  },
  'Registros-de-Enfermagem-no-Exercicio-da-Profissao.pdf': {
    tipo: 'Recomendações',
    instituicao: 'COFEN',
    versao: '2023',
    ano: 2023,
    descricao: 'Recomendações para Registros de Enfermagem no Exercício da Profissão',
  },
  'anotacao-de-enfermagem.pdf': {
    tipo: 'Guia',
    instituicao: 'COREN-SP',
    versao: '2022',
    ano: 2022,
    descricao: 'Anotação de Enfermagem',
  },
  'Guia-de-Recomendações-CTLN-Versão-Web.pdf': {
    tipo: 'Guia',
    instituicao: 'COFEN',
    versao: 'CTLN',
    ano: 2015,
    descricao: 'Guia de Recomendações para Registro de Enfermagem no Prontuário',
  },
  'Diretrizes-enfrentamento-as-situacoes-de-emergencia-e-ou-estado-de-calamidade-publica.pdf': {
    tipo: 'Diretrizes',
    instituicao: 'COFEN',
    versao: 'Atual',
    ano: 2022,
    descricao: 'Diretrizes para o Enfrentamento às Situações de Emergência',
  },
  'apresentacao-parte-ii-we-19-22-avaliacao-da-praticas-de-seguranca-do-paciente.pdf': {
    tipo: 'Seminário',
    instituicao: 'ANVISA',
    versao: '2022',
    ano: 2022,
    descricao: 'Avaliação Nacional das Práticas de Segurança do Paciente',
  },
  'MODELO-NORMAS-ROTINAS-E-POP.pdf': {
    tipo: 'Template',
    instituicao: 'COREN-SE',
    versao: 'Modelo Padrão',
    ano: 2020,
    descricao: 'Modelo Padrão de Normas, Rotinas e POP',
  },
  'Protocolo-web.pdf': {
    tipo: 'Guia',
    instituicao: 'COREN-SP',
    versao: 'Edição revista / 2017',
    ano: 2017,
    descricao: 'Guia para Construção de Protocolos Assistenciais de Enfermagem',
  },
  // Fonte primária do primeiro tipo novo de Objeto de Conhecimento
  // (Diagnóstico de Enfermagem — ver context/kits/knowledge-engine-tipos-objeto.md, item 4).
  'NANDA-I-2018_2020.pdf': {
    tipo: 'Taxonomia',
    instituicao: 'NANDA International',
    versao: '2018-2020 (11ª edição)',
    ano: 2018,
    descricao: 'Diagnósticos de Enfermagem da NANDA-I: Definições e Classificação',
  },
  // Pasta "Referências" do Drive — já triado (texto extraível, ver
  // docs/pdf-triage-referencias-pendentes.md item #19) e usado manualmente
  // pra enriquecer PAM/PVC/Nutrição Parenteral/Hemodiálise em
  // knowledge_specs (ver docs/knowledge-base-reconstrucao-status.md).
  // Falta rodar este pipeline de verdade (chunking + embedding) quando
  // COHERE_API_KEY estiver disponível — os campos abaixo já estão prontos.
  'Manual-de-Cuidados-de-Enfermagem-em-Procedimentos-de-Intensivismo.pdf': {
    tipo: 'Livro/Manual',
    instituicao: 'UFCSPA',
    versao: null,
    ano: 2020,
    descricao: 'Manual de Cuidados de Enfermagem em Procedimentos de Intensivismo (Souza, Viégas e Caregnato, orgs.)',
  },
  // Usado manualmente pra enriquecer Cuidados no Pré-Parto/Sala de Parto
  // (item #14 de docs/pdf-triage-referencias-pendentes.md).
  'manual-condutas-obstetricia-maternidade-evangelina-rosa.pdf': {
    tipo: 'Livro/Manual',
    instituicao: 'Maternidade Dona Evangelina Rosa',
    versao: '2ª edição',
    ano: null,
    descricao: 'Manual de Condutas em Obstetrícia — Maternidade Dona Evangelina Rosa (Teresina-PI)',
  },
  // Usado manualmente pra enriquecer Registro de Enfermagem na Consulta de
  // Enfermagem (item #18 de docs/pdf-triage-referencias-pendentes.md).
  'SAE Sistematização da Assistência de Enfermagem (Meire Chucre Tannure e Ana Maria Pinheiro) (z-library.sk, 1lib.sk, z-lib.sk).pdf': {
    tipo: 'Livro/Guia Prático',
    instituicao: 'Guanabara Koogan',
    versao: '2ª edição',
    ano: 2010,
    descricao: 'SAE: Sistematização da Assistência de Enfermagem: Guia Prático (Tannure e Pinheiro)',
  },
  // Usado manualmente (extração por fragmento, não por capítulo — ver
  // docs/constituicao-extracao-conhecimento.md) pra enriquecer Cuidados com
  // Estomas (item #25 de docs/pdf-triage-referencias-pendentes.md). Nome
  // real do conteúdo confere com "Manual de Enfermagem Médico-Cirúrgica"
  // (tradução do Clinical Handbook for Brunner & Suddarth's Textbook, 13ª
  // ed.), não "Tratado" como o nome do arquivo sugeria; ano de copyright da
  // edição brasileira é 2015, não 2016 (nome do arquivo).
  'BrunnerSuddarth 2016 1.pdf': {
    tipo: 'Livro/Manual',
    instituicao: 'Guanabara Koogan',
    versao: '13ª edição',
    ano: 2015,
    descricao: 'Brunner & Suddarth: Manual de Enfermagem Médico-Cirúrgica (Clinical Handbook, 13ª ed. — trad. brasileira)',
  },
};

let _supabase = null;
function getSupabase() {
  if (!_supabase) _supabase = createClient(supabaseUrl, supabaseKey);
  return _supabase;
}

// ═════════════════════════════════════════════════════════════
// 1. AUTENTICAÇÃO GOOGLE DRIVE
// ═════════════════════════════════════════════════════════════

function loadSavedCredentialsIfExist() {
  try {
    const content = fs.readFileSync(TOKEN_PATH, 'utf8');
    return google.auth.fromJSON(JSON.parse(content));
  } catch {
    return null;
  }
}

function saveCredentials(client) {
  const keys = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  fs.writeFileSync(TOKEN_PATH, payload);
}

async function authorize() {
  const saved = loadSavedCredentialsIfExist();
  if (saved) return saved;

  // @google-cloud/local-auth abre o navegador para o consentimento OAuth —
  // só funciona em máquina local. Carregado sob demanda para o script rodar
  // sem essa dependência quando o token já existe ou o Drive é pulado.
  const { authenticate } = require('@google-cloud/local-auth');
  const client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });

  if (client.credentials) saveCredentials(client);
  return client;
}

// ═════════════════════════════════════════════════════════════
// 2. BAIXAR PDFs DO GOOGLE DRIVE
// ═════════════════════════════════════════════════════════════

async function downloadPDFsFromGoogleDrive(authClient) {
  const drive = google.drive({ version: 'v3', auth: authClient });

  console.log(`\n🔍 Procurando pasta: ${DRIVE_FOLDER_NAME}`);

  const folderResponse = await drive.files.list({
    q: `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    spaces: 'drive',
    fields: 'files(id, name)',
    pageSize: 1,
  });

  if (!folderResponse.data.files.length) {
    throw new Error(`Pasta '${DRIVE_FOLDER_NAME}' não encontrada no Google Drive`);
  }

  const folderId = folderResponse.data.files[0].id;
  console.log(`✓ Pasta encontrada: ${folderId}`);

  const filesResponse = await drive.files.list({
    q: `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`,
    spaces: 'drive',
    fields: 'files(id, name)',
    pageSize: 50,
  });

  const files = filesResponse.data.files;
  console.log(`📦 Encontrados ${files.length} PDFs\n`);

  for (const file of files) {
    const filePath = path.join(PDF_DIR, file.name);
    console.log(`⬇️  Baixando: ${file.name}`);

    const res = await drive.files.get(
      { fileId: file.id, alt: 'media' },
      { responseType: 'stream' }
    );

    await new Promise((resolve, reject) => {
      const dest = fs.createWriteStream(filePath);
      res.data.on('error', reject).pipe(dest);
      dest.on('error', reject).on('finish', resolve);
    });

    console.log(`✓ Salvo: ${file.name}`);
  }

  console.log(`\n✅ Todos os PDFs baixados em: ${PDF_DIR}\n`);
  return files.map((f) => f.name);
}

// ═════════════════════════════════════════════════════════════
// 3. DIVIDIR TEXTO EM CHUNKS
// ═════════════════════════════════════════════════════════════

// Versão da estratégia de chunking. Entra no hash do documento: mudar a
// estratégia invalida o dedup e força a reindexação de todos os documentos
// na próxima execução, sem flag manual.
const CHUNKING_VERSION = 'chunker-v4'; // v4: descarta chunks de sumário/índice (leaders de ponto)

// A Cohere trunca silenciosamente em 512 tokens — tudo além disso fica
// invisível para a busca. A contagem aqui é estimada por caracteres com
// fator conservador para pt-BR (~3,5 chars/token), e o teto de 480 deixa
// margem para a diferença entre a estimativa e o tokenizador real.
const CHARS_POR_TOKEN = 3.5;
const ALVO_TOKENS = 350; // alvo por chunk (aceitável 250–450)
const MAX_ACUMULO_TOKENS = 380; // fechar o chunk ao passar disso
const ESTICA_TOKENS = 460; // chunk pequeno pode esticar até aqui p/ não ficar <250
const TETO_TOKENS = 480; // limite duro — nunca gerar chunk acima disso
const MIN_TOKENS_FRAGMENTO = 20; // resto final menor que isso é fundido ao anterior
const OVERLAP_TOKENS = 55; // ~15% do alvo, nas últimas 1–2 sentenças
const OVERLAP_MAX_SENTENCAS = 2;

function estimarTokens(texto) {
  return Math.ceil(texto.length / CHARS_POR_TOKEN);
}

// Abreviações do português jurídico/clínico após as quais um ponto NÃO
// encerra sentença (comparadas sem pontos, em minúsculas).
const ABREVIACOES = new Set([
  'art', 'arts', 'inc', 'incs', 'n', 'nº', 'no', 'num',
  'dr', 'dra', 'drs', 'sr', 'sra', 'srs', 'sras',
  'prof', 'profa', 'enf', 'exmo', 'exma', 'ilmo', 'ilma',
  'obs', 'ref', 'refs', 'p', 'pp', 'pag', 'pág', 'pags', 'págs',
  'cap', 'caps', 'vol', 'vols', 'ed', 'al', 'fl', 'fls', 'cf',
  'tel', 'seç', 'sec', 'res', 'port', 'par', 'parag', 'etc',
]);

// Decide se o ponto em `anterior` (texto até a pontuação) é fim de
// abreviação/numeral/sigla — e portanto não é quebra de sentença.
function terminaEmAbreviacao(anterior) {
  const m = anterior.match(/([\p{L}\p{N}º°ª§.]+)$/u);
  if (!m) return false;
  const palavra = m[1];
  if (/^\d+(\.\d+)*\.?$/.test(palavra)) return true; // "1." / "5.1.3.6."
  if (/^[IVXLCDM]+$/i.test(palavra)) return true; // "VII." / "iv."
  if (/^(\p{Lu}\.)+\p{Lu}?\.?$/u.test(palavra)) return true; // siglas: "E.U.A."
  if (/^\p{L}$/u.test(palavra)) return true; // letra única: alínea "a." / inicial
  const base = palavra.replace(/\./g, '').toLowerCase();
  return ABREVIACOES.has(base);
}

// Detecta cabeçalhos/rodapés repetidos entre páginas. Diagnóstico de
// 04/07/2026: Registros tem título corrido no topo de 111/114 páginas,
// caderno-4 tem cabeçalho ANVISA (53×), MODELO tem rodapé de endereço em
// 35/35 páginas e a apresentação repete o header de slide ~100×. A regra é
// POSICIONAL (primeiras/últimas linhas de cada página) e exige que a linha
// seja quase exclusiva dessa janela — linhas de conteúdo legítimo que se
// repetem (bullets de checklist, assinaturas de exemplo "COREN-SP-000.000")
// aparecem no meio da página e ficam de fora.
const JANELA_CABECALHO = 3; // linhas no início/fim da página consideradas
const MIN_FRACAO_PAGINAS = 0.3; // presente na janela em ≥30% das páginas
const MIN_FRACAO_POSICIONAL = 0.7; // ≥70% das ocorrências dentro da janela

function detectarCabecalhosRodapes(paginas) {
  if (paginas.length < 8) return new Set(); // poucas páginas p/ estatística
  const paginasComLinhaNaJanela = new Map();
  const ocorrenciasTotais = new Map();

  for (const pagina of paginas) {
    const linhas = pagina
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    for (const l of linhas) {
      ocorrenciasTotais.set(l, (ocorrenciasTotais.get(l) || 0) + 1);
    }
    const janela = new Set([
      ...linhas.slice(0, JANELA_CABECALHO),
      ...linhas.slice(-JANELA_CABECALHO),
    ]);
    for (const l of janela) {
      paginasComLinhaNaJanela.set(l, (paginasComLinhaNaJanela.get(l) || 0) + 1);
    }
  }

  const minPaginas = Math.max(5, Math.ceil(paginas.length * MIN_FRACAO_PAGINAS));
  const detectadas = new Set();
  for (const [linha, qtdPaginas] of paginasComLinhaNaJanela) {
    if (qtdPaginas < minPaginas) continue;
    if (linha.length < 4 || /^\d+$/.test(linha)) continue; // nº de página tem regra própria
    if (qtdPaginas / ocorrenciasTotais.get(linha) < MIN_FRACAO_POSICIONAL) continue;
    detectadas.add(linha);
  }
  return detectadas;
}

// Remove cabeçalhos/rodapés detectados de cada página, mantendo o texto
// separado por página (necessário para rastrear em qual página cada chunk
// se origina — ver dividirPaginasEmSentencasTageadas).
function limparPaginas(paginas) {
  const cabecalhos = detectarCabecalhosRodapes(paginas);
  return paginas.map((pagina) =>
    pagina
      .split('\n')
      .filter((l) => !cabecalhos.has(l.trim()))
      .join('\n')
  );
}

// Junta as páginas removendo cabeçalhos/rodapés detectados. O texto bruto
// (conteudo_completo e hash) continua vindo da extração inteira; a limpeza
// vale só para a fragmentação.
function prepararTextoDePaginas(paginas) {
  return limparPaginas(paginas).join('\n');
}

// Remove artefatos de extração que vazam para os chunks. Diagnóstico de
// 04/07/2026: número de página como linha isolada (250 ocorrências em
// processo_de_enfermagem, 117 em Registros, 111 no caderno-4).
function limparTextoParaChunks(texto) {
  return texto
    .replace(/\r/g, '')
    .split('\n')
    .filter((linha) => !/^\s*\d{1,3}\s*$/.test(linha))
    .join('\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n');
}

function dividirEmSentencas(texto) {
  const sentencas = [];
  let inicio = 0;
  // Pontuação final seguida de espaço, ou quebra de linha (parágrafo).
  const re = /[.!?…]+["')\]]?(?=\s)|\n/g;
  let m;
  while ((m = re.exec(texto)) !== null) {
    const fim = m.index + m[0].length;
    if (m[0] !== '\n') {
      if (terminaEmAbreviacao(texto.slice(inicio, m.index))) continue;
      // Se o que vem depois começa em minúscula, a sentença continua
      // (ex.: "etc. e suas atualizações", citações abreviadas).
      const seguinte = texto.slice(fim).match(/\S/);
      if (seguinte && /\p{Ll}/u.test(seguinte[0])) continue;
    }
    const sentenca = texto.slice(inicio, fim).trim();
    if (sentenca) sentencas.push(sentenca);
    inicio = fim;
  }
  const resto = texto.slice(inicio).trim();
  if (resto) sentencas.push(resto);
  return sentencas;
}

// Sentenças-gigante (tabelas/listas sem pontuação) são partidas em pedaços
// de ~ALVO_TOKENS em limite de palavra — nunca no meio de uma palavra.
function partirSentencaGigante(sentenca) {
  const limiteChars = Math.floor(ALVO_TOKENS * CHARS_POR_TOKEN);
  const pedacos = [];
  let atual = '';
  for (const palavra of sentenca.split(' ')) {
    if (atual && atual.length + 1 + palavra.length > limiteChars) {
      pedacos.push(atual);
      atual = '';
    }
    if (palavra.length > limiteChars) {
      // palavra sem espaços maior que o limite (URL longa): fatiar por chars
      for (let i = 0; i < palavra.length; i += limiteChars) {
        const fatia = palavra.slice(i, i + limiteChars);
        if (i + limiteChars < palavra.length) pedacos.push(fatia);
        else atual = fatia;
      }
    } else {
      atual = atual ? `${atual} ${palavra}` : palavra;
    }
  }
  if (atual) pedacos.push(atual);
  return pedacos;
}

// Detecta chunks que são sumário/índice (linhas "Título ...... 26" com
// leaders de ponto, com ou sem espaço entre os pontos) em vez de conteúdo
// de verdade. Diagnóstico de 06/07/2026: fragmentos assim passavam no
// threshold de similaridade (o nome do capítulo bate com a busca) e viravam
// "referência" sem nenhum conteúdo clínico real — o Redator então gerava
// spec vazia ou copiava a própria linha de sumário. Um chunk com 1+
// ocorrência do padrão já é sinal suficiente; conteúdo real não produz isso.
const RE_LEADER_DE_SUMARIO = /(?:\.\s?){6,}/;

function pareceRuidoDeSumario(texto) {
  return RE_LEADER_DE_SUMARIO.test(texto);
}

function chunkText(texto) {
  const sentencas = [];
  for (const s of dividirEmSentencas(limparTextoParaChunks(texto))) {
    if (estimarTokens(s) > MAX_ACUMULO_TOKENS) sentencas.push(...partirSentencaGigante(s));
    else sentencas.push(s);
  }

  const chunks = [];
  let atual = []; // sentenças do chunk corrente
  let qtdOverlap = 0; // quantas sentenças no início de `atual` vieram do chunk anterior

  const tokensDe = (arr) => estimarTokens(arr.join(' '));

  const fecharChunk = () => {
    chunks.push(atual.join(' '));
    // Overlap: últimas 1–2 sentenças abrem o próximo chunk.
    const overlap = [];
    for (let i = atual.length - 1; i >= 0 && overlap.length < OVERLAP_MAX_SENTENCAS; i--) {
      if (tokensDe([atual[i], ...overlap]) > OVERLAP_TOKENS) break;
      overlap.unshift(atual[i]);
    }
    atual = overlap;
    qtdOverlap = overlap.length;
  };

  for (const sentenca of sentencas) {
    if (atual.length && tokensDe([...atual, sentenca]) > MAX_ACUMULO_TOKENS) {
      // Chunk ainda pequeno demais? Esticar até ESTICA_TOKENS antes de fechar,
      // para não deixar um fragmento curto para trás.
      if (tokensDe(atual) < 250 && tokensDe([...atual, sentenca]) <= ESTICA_TOKENS) {
        atual.push(sentenca);
        fecharChunk();
        continue;
      }
      fecharChunk();
      // Se o overlap somado à sentença nova estourar, reduzir o overlap.
      while (atual.length && tokensDe([...atual, sentenca]) > MAX_ACUMULO_TOKENS) {
        atual.shift();
        qtdOverlap -= 1;
      }
    }
    atual.push(sentenca);
  }

  // Resto final: se for curto demais, fundir a parte NOVA ao chunk anterior
  // (o overlap já está lá) — nunca descartar nem indexar sozinho.
  if (atual.length > qtdOverlap) {
    const restante = atual.join(' ');
    const novas = atual.slice(qtdOverlap).join(' ');
    if (chunks.length && estimarTokens(restante) < MIN_TOKENS_FRAGMENTO) {
      chunks[chunks.length - 1] = `${chunks[chunks.length - 1]} ${novas}`;
    } else {
      chunks.push(restante);
    }
  }

  const resultado = chunks
    .map((c) => c.trim())
    .filter((c) => c.length > 0 && !pareceRuidoDeSumario(c));
  for (const c of resultado) {
    if (estimarTokens(c) > TETO_TOKENS) {
      throw new Error(
        `chunkText gerou chunk de ${estimarTokens(c)} tokens (teto ${TETO_TOKENS}): "${c.slice(0, 80)}..."`
      );
    }
  }
  return resultado;
}

// Divide o texto de cada página (já limpo de cabeçalho/rodapé por
// limparPaginas) em sentenças tageadas com o número da página de origem
// (1-based). Uma sentença nunca atravessa página porque a fronteira entre
// páginas já é tratada como quebra de sentença pelo mesmo motivo que uma
// quebra de linha qualquer é (ver dividirEmSentencas) — processar por
// página não muda os cortes, só permite rastrear a origem de cada uma.
function dividirPaginasEmSentencasTageadas(paginasLimpas) {
  const sentencas = [];
  paginasLimpas.forEach((paginaTexto, idx) => {
    const pagina = idx + 1;
    for (const s of dividirEmSentencas(limparTextoParaChunks(paginaTexto))) {
      if (estimarTokens(s) > MAX_ACUMULO_TOKENS) {
        for (const pedaco of partirSentencaGigante(s)) sentencas.push({ texto: pedaco, pagina });
      } else {
        sentencas.push({ texto: s, pagina });
      }
    }
  });
  return sentencas;
}

// Mesma estratégia de acumulação do chunkText, mas operando sobre sentenças
// tageadas com página — cada chunk resultante inclui paginaInicio/paginaFim
// (min/max das páginas de origem das sentenças que o compõem, overlap
// incluso). Usado pelo pipeline; chunkText continua existindo para quem só
// tem o texto já concatenado (ex.: testes que não precisam de página).
function chunkTextComPaginas(paginasLimpas) {
  const sentencas = dividirPaginasEmSentencasTageadas(paginasLimpas);

  const chunks = [];
  let atual = []; // itens {texto, pagina} do chunk corrente
  let qtdOverlap = 0;

  const tokensDe = (arr) => estimarTokens(arr.map((i) => i.texto).join(' '));
  const paginaInicioDe = (arr) => Math.min(...arr.map((i) => i.pagina));
  const paginaFimDe = (arr) => Math.max(...arr.map((i) => i.pagina));

  const fecharChunk = () => {
    chunks.push({
      texto: atual.map((i) => i.texto).join(' '),
      paginaInicio: paginaInicioDe(atual),
      paginaFim: paginaFimDe(atual),
    });
    const overlap = [];
    for (let i = atual.length - 1; i >= 0 && overlap.length < OVERLAP_MAX_SENTENCAS; i--) {
      if (tokensDe([atual[i], ...overlap]) > OVERLAP_TOKENS) break;
      overlap.unshift(atual[i]);
    }
    atual = overlap;
    qtdOverlap = overlap.length;
  };

  for (const item of sentencas) {
    if (atual.length && tokensDe([...atual, item]) > MAX_ACUMULO_TOKENS) {
      if (tokensDe(atual) < 250 && tokensDe([...atual, item]) <= ESTICA_TOKENS) {
        atual.push(item);
        fecharChunk();
        continue;
      }
      fecharChunk();
      while (atual.length && tokensDe([...atual, item]) > MAX_ACUMULO_TOKENS) {
        atual.shift();
        qtdOverlap -= 1;
      }
    }
    atual.push(item);
  }

  if (atual.length > qtdOverlap) {
    const novas = atual.slice(qtdOverlap);
    if (chunks.length && tokensDe(atual) < MIN_TOKENS_FRAGMENTO) {
      const anterior = chunks[chunks.length - 1];
      anterior.texto = `${anterior.texto} ${novas.map((i) => i.texto).join(' ')}`.trim();
      anterior.paginaFim = Math.max(anterior.paginaFim, paginaFimDe(novas));
    } else {
      chunks.push({
        texto: atual.map((i) => i.texto).join(' '),
        paginaInicio: paginaInicioDe(atual),
        paginaFim: paginaFimDe(atual),
      });
    }
  }

  const resultado = chunks
    .map((c) => ({ ...c, texto: c.texto.trim() }))
    .filter((c) => c.texto.length > 0 && !pareceRuidoDeSumario(c.texto));
  for (const c of resultado) {
    if (estimarTokens(c.texto) > TETO_TOKENS) {
      throw new Error(
        `chunkTextComPaginas gerou chunk de ${estimarTokens(c.texto)} tokens (teto ${TETO_TOKENS}): "${c.texto.slice(0, 80)}..."`
      );
    }
  }
  return resultado;
}

// ═════════════════════════════════════════════════════════════
// 4. GERAR EMBEDDINGS COHERE (batch, via REST — igual lib/embeddings.ts)
// ═════════════════════════════════════════════════════════════

async function generateEmbeddings(texts) {
  if (!texts || texts.length === 0) return [];

  // Chave trial da Cohere limita 100k tokens/min — em 429, esperar a janela
  // de 1 minuto virar e tentar de novo. Chave paga nunca entra neste caminho.
  const MAX_TENTATIVAS_429 = 6;
  let resp;
  for (let tentativa = 1; ; tentativa++) {
    resp = await fetch(COHERE_EMBED_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cohereApiKey}`,
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        texts,
        input_type: 'search_document',
        embedding_types: ['float'],
      }),
    });

    if (resp.status !== 429 || tentativa >= MAX_TENTATIVAS_429) break;
    console.warn(`  ⏳ Rate limit da Cohere (429) — aguardando 65s (tentativa ${tentativa}/${MAX_TENTATIVAS_429})...`);
    await new Promise((resolve) => setTimeout(resolve, 65000));
  }

  if (!resp.ok) {
    const corpo = await resp.text().catch(() => '');
    throw new Error(`Cohere Embeddings falhou (${resp.status}): ${corpo}`);
  }

  const data = await resp.json();
  const vetores = data?.embeddings?.float;
  if (!Array.isArray(vetores) || vetores.length !== texts.length) {
    throw new Error('Resposta de embedding inválida (quantidade não confere).');
  }
  return vetores;
}

// ═════════════════════════════════════════════════════════════
// 5. PROCESSAR UM PDF COMPLETO
// ═════════════════════════════════════════════════════════════

async function processPDF(filePath, paginasDocling) {
  const fileName = path.basename(filePath);
  console.log(`\n📄 Processando: ${fileName}`);

  const metadata = PDF_METADATA[fileName];
  if (!metadata) {
    console.warn(`⚠️ Metadados não encontrados para ${fileName}, pulando...`);
    return { status: 'pulado' };
  }

  let fullText;
  let totalPaginas;
  let paginasLimpas;

  if (paginasDocling) {
    // PDF flagado com parser: 'docling' no PDF_METADATA — texto já veio do
    // Docling (reading order + tabelas em Markdown), extraído em lote antes
    // deste loop (ver runPipeline). O chunking a partir daqui é o mesmo de
    // qualquer outro PDF: só a extração de texto por página muda.
    totalPaginas = paginasDocling.paginas_total;
    paginasLimpas = limparPaginas(paginasDocling.paginas);
    fullText = paginasLimpas.join('\n');
  } else {
    // 1. Ler PDF (pdf-parse v2: classe PDFParse)
    const parser = new PDFParse({ data: fs.readFileSync(filePath) });
    try {
      // pageJoiner vazio: sem marcador "-- N of M --" no meio do texto,
      // que sujaria os fragmentos e mudaria o hash do conteúdo
      const pdfData = await parser.getText({ pageJoiner: '' });
      fullText = pdfData.text;
      totalPaginas = pdfData.total;
      // Para os chunks, usar o texto página a página (array, não concatenado)
      // com cabeçalhos/rodapés repetidos removidos — mantém a página de
      // origem rastreável por chunk (conteudo_completo continua sendo o
      // texto bruto).
      paginasLimpas = limparPaginas(pdfData.pages.map((p) => p.text || ''));
    } finally {
      await parser.destroy();
    }
  }

  console.log(`✓ PDF lido: ${fullText.length} caracteres, ${totalPaginas} páginas`);

  // 2. Hash do conteúdo + versão do chunking: mudar a estratégia de
  // fragmentação muda o hash e força a reindexação mesmo com o PDF idêntico.
  const contentHash = crypto
    .createHash('sha256')
    .update(fullText)
    .update(`\n[chunking:${CHUNKING_VERSION}]`)
    .digest('hex');

  // 3. Verificar se já foi indexado com ESTA versão de chunking
  const { data: existingDoc, error: existError } = await getSupabase()
    .from('conhecimento_documentos')
    .select('id')
    .eq('hash_conteudo', contentHash)
    .maybeSingle();

  if (existError) throw existError;
  if (existingDoc) {
    console.log('⚠️ Documento já indexado (hash duplicado), pulando...');
    return { status: 'duplicado' };
  }

  // 4. Inserir documento
  const { data: docData, error: docError } = await getSupabase()
    .from('conhecimento_documentos')
    .insert({
      nome_arquivo: fileName,
      tipo_documento: metadata.tipo,
      instituicao: metadata.instituicao,
      versao: metadata.versao,
      ano_publicacao: metadata.ano,
      descricao: metadata.descricao,
      conteudo_completo: fullText,
      hash_conteudo: contentHash,
      ativo: true,
    })
    .select('id')
    .single();

  if (docError) throw docError;

  const documentoId = docData.id;
  console.log(`✓ Documento inserido com ID: ${documentoId}`);

  try {
    // 5. Dividir em chunks, cada um já com a página de origem
    const chunks = chunkTextComPaginas(paginasLimpas);
    console.log(`✓ Dividido em ${chunks.length} fragmentos`);

    // 6. Gerar embeddings em batch
    const embeddings = [];
    for (let i = 0; i < chunks.length; i += COHERE_BATCH_MAX) {
      const batch = chunks.slice(i, i + COHERE_BATCH_MAX).map((c) => c.texto);
      const batchEmbeddings = await generateEmbeddings(batch);
      embeddings.push(...batchEmbeddings);
      console.log(`  📊 Embeddings: ${Math.min(i + COHERE_BATCH_MAX, chunks.length)}/${chunks.length}`);

      // Delay entre batches para respeitar o rate limit do free tier
      if (i + COHERE_BATCH_MAX < chunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // 7. Inserir fragmentos em batches de 100
    const fragmentsToInsert = chunks.map((chunk, idx) => ({
      documento_id: documentoId,
      numero_sequencia: idx + 1,
      conteudo: chunk.texto,
      embedding: embeddings[idx],
      tamanho_tokens: estimarTokens(chunk.texto),
      pagina_inicio: chunk.paginaInicio,
      pagina_fim: chunk.paginaFim,
    }));

    for (let i = 0; i < fragmentsToInsert.length; i += 100) {
      const batch = fragmentsToInsert.slice(i, i + 100);
      const { error: fragmentError } = await getSupabase()
        .from('conhecimento_fragmentos')
        .insert(batch);

      if (fragmentError) throw fragmentError;
      console.log(`  ✓ Inseridos ${Math.min(i + 100, fragmentsToInsert.length)}/${fragmentsToInsert.length} fragmentos`);
    }
  } catch (err) {
    // Sem os fragmentos o documento é inútil e o hash bloquearia a
    // reindexação — remover para a próxima execução recomeçar do zero.
    // A versão antiga do documento (se houver) fica intacta e continua
    // atendendo às buscas até uma reindexação bem-sucedida.
    await getSupabase().from('conhecimento_documentos').delete().eq('id', documentoId);
    throw err;
  }

  // 8. Reindexação concluída: remover versões antigas do mesmo arquivo
  // (hash de chunking anterior). O ON DELETE CASCADE apaga os fragmentos.
  const { data: versoesAntigas, error: deleteError } = await getSupabase()
    .from('conhecimento_documentos')
    .delete()
    .eq('nome_arquivo', fileName)
    .neq('id', documentoId)
    .select('id');

  if (deleteError) throw deleteError;
  if (versoesAntigas && versoesAntigas.length > 0) {
    console.log(`  ♻️  Removida(s) ${versoesAntigas.length} versão(ões) antiga(s) do documento`);
  }

  console.log(`✅ ${fileName} indexado com sucesso`);
  return { status: 'indexado' };
}

// ═════════════════════════════════════════════════════════════
// 6. EXECUTAR PIPELINE COMPLETO
// ═════════════════════════════════════════════════════════════

async function runPipeline() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   PIPELINE RAG — KRONIA NURSE                  ║');
  console.log('║   PDFs → chunks → embeddings → Supabase        ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  if (!supabaseUrl || !supabaseKey || !cohereApiKey) {
    throw new Error(
      'Variáveis de ambiente não configuradas: SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY e COHERE_API_KEY.'
    );
  }

  if (!fs.existsSync(PDF_DIR)) {
    fs.mkdirSync(PDF_DIR, { recursive: true });
  }

  // Passo 1: baixar do Google Drive (opcional — exige credentials.json)
  if (fs.existsSync(CREDENTIALS_PATH) || fs.existsSync(TOKEN_PATH)) {
    console.log('🔐 Autenticando Google Drive...');
    const authClient = await authorize();
    console.log('✓ Google Drive autenticado');

    console.log('📥 Baixando PDFs do Google Drive...');
    const downloadedFiles = await downloadPDFsFromGoogleDrive(authClient);
    console.log(`✓ ${downloadedFiles.length} PDFs baixados\n`);
  } else {
    console.log(`⚠️ credentials.json não encontrado — pulando download do Drive.`);
    console.log(`   Usando PDFs já presentes em ${PDF_DIR}\n`);
  }

  // Passo 2: processar PDFs locais
  const pdfFiles = fs
    .readdirSync(PDF_DIR)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .sort();

  if (pdfFiles.length === 0) {
    throw new Error(`Nenhum PDF encontrado em ${PDF_DIR}.`);
  }

  console.log(`⚙️  Processando ${pdfFiles.length} PDFs (leitura + chunks + embeddings)...`);

  // Passo 2.1: PDFs flagados com parser: 'docling' no PDF_METADATA (layout
  // complexo/tabelas que o pdf-parse embaralha) saem numa única chamada em
  // lote — os modelos do Docling são carregados uma vez e reaproveitados
  // entre eles, em vez de um spawn por arquivo (ver docling-bridge.js).
  const arquivosDocling = pdfFiles.filter((f) => PDF_METADATA[f]?.parser === 'docling');
  let paginasPorArquivoDocling = {};
  if (arquivosDocling.length > 0) {
    console.log(`🔬 Extraindo ${arquivosDocling.length} PDF(s) com Docling (parser dedicado): ${arquivosDocling.join(', ')}`);
    paginasPorArquivoDocling = await parsearPdfsComDocling(
      arquivosDocling.map((f) => path.join(PDF_DIR, f))
    );
  }

  const resumo = { indexado: 0, duplicado: 0, pulado: 0, erro: 0 };
  for (const file of pdfFiles) {
    try {
      const doclingResultado = paginasPorArquivoDocling[file];
      if (doclingResultado?.erro) {
        throw new Error(`Docling falhou em ${file}: ${doclingResultado.erro}`);
      }
      const { status } = await processPDF(path.join(PDF_DIR, file), doclingResultado);
      resumo[status] += 1;
    } catch (error) {
      resumo.erro += 1;
      console.error(`❌ Erro ao processar ${file}:`, error.message);
    }
  }

  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   PIPELINE CONCLUÍDO                           ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`   Indexados: ${resumo.indexado} | Já indexados: ${resumo.duplicado} | Sem metadados: ${resumo.pulado} | Erros: ${resumo.erro}\n`);

  if (resumo.erro > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runPipeline().catch((error) => {
    console.error('\n❌ ERRO NO PIPELINE:', error.message);
    process.exit(1);
  });
}

module.exports = {
  CHUNKING_VERSION,
  chunkText,
  chunkTextComPaginas,
  dividirPaginasEmSentencasTageadas,
  pareceRuidoDeSumario,
  estimarTokens,
  limparTextoParaChunks,
  limparPaginas,
  dividirEmSentencas,
  detectarCabecalhosRodapes,
  prepararTextoDePaginas,
};
