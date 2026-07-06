/**
 * Insere em knowledge_specs os rascunhos redigidos e auditados manualmente
 * (sem Groq) — o conteúdo (Redator) e as 5 auditorias já vêm prontos no
 * arquivo de entrada; este script só aplica a MESMA lógica de classificação
 * determinística (classificar(), lib/knowledge-pipeline.ts) usada pelo
 * pipeline automatizado, e grava.
 *
 * RESTRIÇÃO: nunca escreve em knowledge_base — só knowledge_specs, status
 * 'aguardando_aprovacao' ou 'reprovado'. Aprovação continua manual via
 * /api/knowledge-spec/aprovar.
 *
 * Uso:
 *   npx tsx scripts/inserir-especificacoes-manual.ts <itens.json> <criado_por>
 *
 * Formato de <itens.json>: array de objetos:
 * {
 *   tema, categoria, subcategoria, referencias: ReferenciaOficial[],
 *   redator: { titulo, resumo, definicao, objetivo, escopo, indicacoes,
 *     contraindicacoes, materiais, equipamentos, epis, preparacao,
 *     execucao_passos: string[], cuidados, complicacoes, registro,
 *     fundamentacao_cientifica },
 *   auditorOrigem: { aprovado, observacoes, itens_reprovados },
 *   auditorEscopo: { aprovado, observacoes, itens_reprovados },
 *   auditorCoerencia: { aprovado, observacoes, itens_reprovados },
 *   auditorAtualizacao: { observacoes, referencias_para_verificar },
 *   auditorDominio: { dominio, risco_tecnico, variabilidade, divergencias, observacoes }
 * }
 */
import { createHash } from 'crypto';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { classificar } from '../lib/knowledge-pipeline';
import type { ReferenciaOficial } from '../lib/knowledge-spec';

interface ItemManual {
  tema: string;
  categoria: string;
  subcategoria?: string;
  referencias: ReferenciaOficial[];
  redator: {
    titulo?: string; resumo?: string; definicao?: string; objetivo?: string; escopo?: string;
    indicacoes?: string; contraindicacoes?: string; materiais?: string; equipamentos?: string;
    epis?: string; preparacao?: string; execucao_passos?: string[]; cuidados?: string;
    complicacoes?: string; registro?: string; fundamentacao_cientifica?: string;
  };
  auditorOrigem: { aprovado: boolean; observacoes: string[]; itens_reprovados?: string[] };
  auditorEscopo: { aprovado: boolean; observacoes: string[]; itens_reprovados?: string[] };
  auditorCoerencia: { aprovado: boolean; observacoes: string[]; itens_reprovados?: string[] };
  auditorAtualizacao: { observacoes: string[]; referencias_para_verificar?: { referencia: string; motivo: string }[] };
  auditorDominio: {
    dominio: 'proximo' | 'intermediario' | 'distante';
    risco_tecnico: 'baixo' | 'moderado' | 'alto';
    variabilidade: 'nenhuma' | 'moderada' | 'elevada';
    divergencias: string[];
    observacoes: string[];
  };
}

function computarHash(titulo: string, objetivo: string, execucaoPassos: string[], refs: ReferenciaOficial[]): string {
  const payload = JSON.stringify({ titulo, objetivo, execucao_passos: execucaoPassos, referencias_oficiais: refs });
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

async function main() {
  const [arquivoItens, criadoPor] = process.argv.slice(2);
  if (!arquivoItens || !criadoPor) {
    throw new Error('Uso: inserir-especificacoes-manual.ts <itens.json> <criado_por>');
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configuradas.');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const itens: ItemManual[] = JSON.parse(fs.readFileSync(arquivoItens, 'utf8'));
  const resumo = { aguardando_aprovacao: 0, reprovado: 0, erro: 0 };

  for (const [idx, item] of itens.entries()) {
    console.log(`[${idx + 1}/${itens.length}] ${item.tema}`);
    try {
      const r = item.redator;
      const agora = new Date().toISOString();
      const hash = computarHash(r.titulo ?? item.tema, r.objetivo ?? '', r.execucao_passos ?? [], item.referencias);

      const entradaHistorico = {
        versao: 1,
        usuario: criadoPor,
        acao: 'criar_manual_sem_groq',
        data: agora,
        observacao: `Redigido e auditado manualmente (sem Groq), a partir de fontes indexadas via RAG.`,
      };

      const { data: spec, error: errInsert } = await supabase
        .from('knowledge_specs')
        .insert({
          titulo: r.titulo ?? item.tema,
          categoria: item.categoria,
          subcategoria: item.subcategoria || null,
          resumo: r.resumo || null,
          definicao: r.definicao || null,
          objetivo: r.objetivo || null,
          escopo: r.escopo || null,
          indicacoes: r.indicacoes || null,
          contraindicacoes: r.contraindicacoes || null,
          materiais: r.materiais || null,
          equipamentos: r.equipamentos || null,
          epis: r.epis || null,
          preparacao: r.preparacao || null,
          execucao_passos: r.execucao_passos?.length ? r.execucao_passos : null,
          cuidados: r.cuidados || null,
          complicacoes: r.complicacoes || null,
          registro: r.registro || null,
          fundamentacao_cientifica: r.fundamentacao_cientifica || null,
          referencias_oficiais: item.referencias,
          status: 'rascunho',
          hash,
          criado_por: criadoPor,
          historico: [entradaHistorico],
        })
        .select('id')
        .single();

      if (errInsert || !spec) {
        console.error(`  ❌ falha ao salvar: ${errInsert?.message}`);
        resumo.erro += 1;
        continue;
      }

      await supabase.from('knowledge_spec_audit').insert({
        spec_id: spec.id,
        usuario: criadoPor,
        acao: 'criar_manual_sem_groq',
        dados: { tema: item.tema, categoria: item.categoria, refs_encontradas: item.referencias.length },
      });

      const normalizar = (e: { aprovado: boolean; observacoes: string[]; itens_reprovados?: string[] }) => ({
        aprovado: e.aprovado,
        observacoes: e.observacoes,
        itens_reprovados: e.itens_reprovados ?? [],
      });
      const origem = normalizar(item.auditorOrigem);
      const escopo = normalizar(item.auditorEscopo);
      const coerencia = normalizar(item.auditorCoerencia);
      const dominio = { aprovado: true as const, itens_reprovados: [] as [], ...item.auditorDominio };
      const atualizacao = {
        aprovado: true as const,
        observacoes: item.auditorAtualizacao.observacoes,
        itens_reprovados: [] as string[],
        referencias_para_verificar: item.auditorAtualizacao.referencias_para_verificar ?? [],
      };

      const { score, classificacao, resumo: resumoConsolidacao } = origem.aprovado
        ? escopo.aprovado
          ? coerencia.aprovado
            ? classificar(origem, escopo, coerencia, atualizacao, dominio)
            : classificar(origem, escopo, coerencia, undefined, undefined, 'coerencia')
          : classificar(origem, escopo, undefined, undefined, undefined, 'escopo')
        : classificar(origem, undefined, undefined, undefined, undefined, 'origem');

      const statusFinal = classificacao === 'vermelho' ? 'reprovado' : 'aguardando_aprovacao';
      const agoraFinal = new Date().toISOString();

      const pipelineResultado = {
        auditor_origem: origem,
        auditor_escopo: escopo,
        auditor_coerencia: coerencia,
        auditor_atualizacao: atualizacao,
        auditor_dominio: dominio,
        score,
        classificacao,
        resumo_consolidacao: resumoConsolidacao,
        executado_em: agoraFinal,
      };

      await supabase.from('knowledge_specs').update({
        pipeline_resultado: pipelineResultado,
        pipeline_classificacao: classificacao,
        status: statusFinal,
        updated_at: agoraFinal,
        historico: [
          entradaHistorico,
          {
            versao: 2,
            usuario: criadoPor,
            acao: 'auditoria_manual_sem_groq',
            data: agoraFinal,
            observacao: `Auditoria manual. Classificação: ${classificacao}. Score: ${score}%.`,
          },
        ],
      }).eq('id', spec.id);

      await supabase.from('knowledge_spec_audit').insert({
        spec_id: spec.id,
        usuario: criadoPor,
        acao: 'auditoria_manual_sem_groq',
        dados: { classificacao, score, status_final: statusFinal },
      });

      console.log(`  ✓ ${statusFinal} (${classificacao}, score ${score}%, ${item.referencias.length} refs)`);
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
