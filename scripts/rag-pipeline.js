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
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PDFParse } = require('pdf-parse');
const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');

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

function chunkText(text, maxChars = 500) {
  const chunks = [];
  let currentChunk = '';

  // Dividir por períodos, respeitando o tamanho máximo
  const sentences = text.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    if ((currentChunk + ' ' + sentence).length > maxChars && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

// ═════════════════════════════════════════════════════════════
// 4. GERAR EMBEDDINGS COHERE (batch, via REST — igual lib/embeddings.ts)
// ═════════════════════════════════════════════════════════════

async function generateEmbeddings(texts) {
  if (!texts || texts.length === 0) return [];

  const resp = await fetch(COHERE_EMBED_URL, {
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

async function processPDF(filePath) {
  const fileName = path.basename(filePath);
  console.log(`\n📄 Processando: ${fileName}`);

  const metadata = PDF_METADATA[fileName];
  if (!metadata) {
    console.warn(`⚠️ Metadados não encontrados para ${fileName}, pulando...`);
    return { status: 'pulado' };
  }

  // 1. Ler PDF (pdf-parse v2: classe PDFParse)
  const parser = new PDFParse({ data: fs.readFileSync(filePath) });
  let fullText;
  let totalPaginas;
  try {
    // pageJoiner vazio: sem marcador "-- N of M --" no meio do texto,
    // que sujaria os fragmentos e mudaria o hash do conteúdo
    const pdfData = await parser.getText({ pageJoiner: '' });
    fullText = pdfData.text;
    totalPaginas = pdfData.total;
  } finally {
    await parser.destroy();
  }

  console.log(`✓ PDF lido: ${fullText.length} caracteres, ${totalPaginas} páginas`);

  // 2. Hash do conteúdo
  const contentHash = crypto.createHash('sha256').update(fullText).digest('hex');

  // 3. Verificar se já foi indexado
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
    // 5. Dividir em chunks
    const chunks = chunkText(fullText, 500);
    console.log(`✓ Dividido em ${chunks.length} fragmentos`);

    // 6. Gerar embeddings em batch
    const embeddings = [];
    for (let i = 0; i < chunks.length; i += COHERE_BATCH_MAX) {
      const batch = chunks.slice(i, i + COHERE_BATCH_MAX);
      const batchEmbeddings = await generateEmbeddings(batch);
      embeddings.push(...batchEmbeddings);
      console.log(`  📊 Embeddings: ${Math.min(i + COHERE_BATCH_MAX, chunks.length)}/${chunks.length}`);

      // Delay entre batches para respeitar o rate limit do free tier
      if (i + COHERE_BATCH_MAX < chunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // 7. Inserir fragmentos em batches de 100
    const fragmentsToInsert = chunks.map((conteudo, idx) => ({
      documento_id: documentoId,
      numero_sequencia: idx + 1,
      conteudo,
      embedding: embeddings[idx],
      tamanho_tokens: Math.ceil(conteudo.length / 4),
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
    await getSupabase().from('conhecimento_documentos').delete().eq('id', documentoId);
    throw err;
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

  const resumo = { indexado: 0, duplicado: 0, pulado: 0, erro: 0 };
  for (const file of pdfFiles) {
    try {
      const { status } = await processPDF(path.join(PDF_DIR, file));
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

runPipeline().catch((error) => {
  console.error('\n❌ ERRO NO PIPELINE:', error.message);
  process.exit(1);
});
