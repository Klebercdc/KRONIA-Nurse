/**
 * Gera rascunhos de knowledge_specs em lote a partir de uma lista de temas,
 * usando o mesmo pipeline de pages/api/kronos/biblioteca/processar.ts
 * (Pesquisador grounded em RAG -> Redator -> Auditoria), mas rodado
 * diretamente como script administrativo (sem HTTP/auth) — uso local,
 * nunca na Vercel.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/gerar-especificacoes-lote.ts <arquivo.json> <criado_por>
 *
 * <arquivo.json>: array de strings (temas), ex.: ["Acesso Venoso", "Curativos"]
 * RESTRIÇÃO: nunca escreve em knowledge_base — só knowledge_specs, com
 * status 'aguardando_aprovacao' ou 'reprovado'. Aprovação continua manual
 * via /api/knowledge-spec/aprovar.
 */
import { createHash } from 'crypto';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { pesquisarFontes, redigirConteudo, executarPipeline } from '../lib/knowledge-pipeline';
import { DOMINIOS_BIBLIOTECA, type KnowledgeSpec, type ReferenciaOficial } from '../lib/knowledge-spec';

function computarHash(titulo: string, objetivo: string, execucaoPassos: string[], refs: ReferenciaOficial[]): string {
  const payload = JSON.stringify({ titulo, objetivo, execucao_passos: execucaoPassos, referencias_oficiais: refs });
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

async function main() {
  const [arquivoTemas, criadoPor] = process.argv.slice(2);
  if (!arquivoTemas || !criadoPor) {
    throw new Error('Uso: gerar-especificacoes-lote.ts <arquivo.json> <criado_por>');
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configuradas.');
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY não configurada.');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const temas: string[] = JSON.parse(fs.readFileSync(arquivoTemas, 'utf8'));
  console.log(`⚙️  Processando ${temas.length} temas...\n`);

  const resumo = { aguardando_aprovacao: 0, reprovado: 0, erro: 0 };

  for (const [idx, tema] of temas.entries()) {
    console.log(`[${idx + 1}/${temas.length}] ${tema}`);
    try {
      const { referencias, categoria, subcategoria, observacao } = await pesquisarFontes(tema, DOMINIOS_BIBLIOTECA);
      const semFontesSuficientes = referencias.length < 2;
      const rascunho = await redigirConteudo(tema, referencias);

      const agora = new Date().toISOString();
      const hash = computarHash(rascunho.titulo ?? tema, rascunho.objetivo ?? '', rascunho.execucao_passos ?? [], referencias);
      const observacaoFonte = semFontesSuficientes
        ? `ATENÇÃO: Fontes indexadas insuficientes (${referencias.length} encontrada(s)). ${observacao}`
        : observacao;

      const entradaHistorico = {
        versao: 1,
        usuario: criadoPor,
        acao: 'criar_automatico',
        data: agora,
        observacao: `Gerado via scripts/gerar-especificacoes-lote.ts (fonte: PDFs indexados). ${observacaoFonte}`.trim(),
      };

      const { data: spec, error: errInsert } = await supabase
        .from('knowledge_specs')
        .insert({
          titulo: rascunho.titulo ?? tema,
          categoria,
          subcategoria: subcategoria || null,
          resumo: rascunho.resumo || null,
          definicao: rascunho.definicao || null,
          objetivo: rascunho.objetivo || null,
          escopo: rascunho.escopo || null,
          indicacoes: rascunho.indicacoes || null,
          contraindicacoes: rascunho.contraindicacoes || null,
          materiais: rascunho.materiais || null,
          equipamentos: rascunho.equipamentos || null,
          epis: rascunho.epis || null,
          preparacao: rascunho.preparacao || null,
          execucao_passos: rascunho.execucao_passos?.length ? rascunho.execucao_passos : null,
          cuidados: rascunho.cuidados || null,
          complicacoes: rascunho.complicacoes || null,
          registro: rascunho.registro || null,
          fundamentacao_cientifica: rascunho.fundamentacao_cientifica || null,
          referencias_oficiais: referencias,
          status: 'rascunho',
          hash,
          criado_por: criadoPor,
          historico: [entradaHistorico],
        })
        .select('id')
        .single();

      if (errInsert || !spec) {
        console.error(`  ❌ falha ao salvar rascunho: ${errInsert?.message}`);
        resumo.erro += 1;
        continue;
      }

      await supabase.from('knowledge_spec_audit').insert({
        spec_id: spec.id,
        usuario: criadoPor,
        acao: 'criar_automatico',
        dados: { tema, categoria, refs_encontradas: referencias.length, sem_fontes_suficientes: semFontesSuficientes },
      });

      await supabase.from('knowledge_specs').update({ status: 'em_auditoria', updated_at: agora }).eq('id', spec.id);

      const { data: specCompleta } = await supabase.from('knowledge_specs').select('*').eq('id', spec.id).single();
      if (!specCompleta) {
        console.error('  ❌ spec não encontrada após inserção.');
        resumo.erro += 1;
        continue;
      }

      const pipelineResultado = await executarPipeline(specCompleta as KnowledgeSpec);
      const statusFinal = pipelineResultado.classificacao === 'vermelho' ? 'reprovado' : 'aguardando_aprovacao';
      const agoraFinal = new Date().toISOString();

      await supabase.from('knowledge_specs').update({
        pipeline_resultado: pipelineResultado,
        pipeline_classificacao: pipelineResultado.classificacao,
        status: statusFinal,
        updated_at: agoraFinal,
        historico: [
          entradaHistorico,
          {
            versao: 2,
            usuario: criadoPor,
            acao: 'pipeline',
            data: agoraFinal,
            observacao: `Pipeline executado. Classificação: ${pipelineResultado.classificacao}. Score: ${pipelineResultado.score}%.`,
          },
        ],
      }).eq('id', spec.id);

      await supabase.from('knowledge_spec_audit').insert({
        spec_id: spec.id,
        usuario: criadoPor,
        acao: 'pipeline',
        dados: {
          classificacao: pipelineResultado.classificacao,
          score: pipelineResultado.score,
          parado_em: pipelineResultado.parado_em ?? null,
          status_final: statusFinal,
        },
      });

      console.log(`  ✓ ${statusFinal} (${pipelineResultado.classificacao}, score ${pipelineResultado.score}%, ${referencias.length} refs)`);
      resumo[statusFinal as 'aguardando_aprovacao' | 'reprovado'] += 1;
    } catch (err) {
      console.error(`  ❌ erro: ${err instanceof Error ? err.message : err}`);
      resumo.erro += 1;
    }
  }

  console.log('\n=== RESUMO ===');
  console.log(resumo);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
