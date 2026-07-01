/**
 * POST /api/kronos/biblioteca/processar
 * Executa o pipeline completo (Etapas 1–8) para uma lista de temas.
 *
 * Etapa 1 (Pesquisador): IA identifica fontes oficiais por tema.
 * Etapa 2 (Redator): IA redige conteúdo técnico baseado nas fontes.
 * Etapas 3–8: pipeline de auditoria existente (knowledge-pipeline.ts).
 *
 * RESTRIÇÃO ABSOLUTA (Constitution §APROVAÇÃO HUMANA):
 * Esta rota NUNCA escreve no knowledge_base. Todo conteúdo gerado
 * fica em knowledge_specs com status 'aguardando_aprovacao' ou
 * 'reprovado'. A publicação exige clique humano em /api/knowledge-spec/aprovar.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';
import { getSupabase } from '../../../../lib/supabase-client';
import { getUsuarioAutenticado, usuarioEhAdmin } from '../../../../lib/auth-server';
import {
  pesquisarFontes,
  redigirConteudo,
  executarPipeline,
} from '../../../../lib/knowledge-pipeline';
import { DOMINIOS_BIBLIOTECA, type KnowledgeSpec, type ReferenciaOficial } from '../../../../lib/knowledge-spec';

export const config = { api: { responseLimit: false, bodyParser: true } };

interface ResultadoTema {
  tema: string;
  spec_id: string | null;
  status: string;
  classificacao: string | null;
  score: number | null;
  erro?: string;
  etapa_falha?: string;
}

function computarHash(titulo: string, objetivo: string, procedimento: string, refs: ReferenciaOficial[]): string {
  const payload = JSON.stringify({ titulo, objetivo, procedimento, referencias_oficiais: refs });
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });
  if (!(await usuarioEhAdmin(usuario.id))) return res.status(403).json({ erro: 'Acesso restrito a administradores.' });

  const { temas } = req.body as { temas?: unknown };

  let listaFinal: string[];
  if (Array.isArray(temas) && temas.length > 0) {
    listaFinal = temas.filter((t) => typeof t === 'string' && t.trim()).map((t) => String(t).trim());
  } else {
    return res.status(400).json({ erro: 'Campo "temas" (array de strings) é obrigatório.' });
  }

  if (listaFinal.length > 10) {
    return res.status(400).json({ erro: 'Máximo de 10 temas por requisição para evitar timeout.' });
  }

  const supabase = getSupabase();
  const resultados: ResultadoTema[] = [];

  for (const tema of listaFinal) {
    const resultado: ResultadoTema = { tema, spec_id: null, status: '', classificacao: null, score: null };

    try {
      // ── Etapa 1: Pesquisador ──────────────────────────────────────
      const { referencias, categoria, subcategoria, observacao } = await pesquisarFontes(tema, DOMINIOS_BIBLIOTECA);

      // Se não encontrou fontes suficientes, registra e pula para rascunho
      const semFontesSuficientes = referencias.length < 2;

      // ── Etapa 2: Redator ─────────────────────────────────────────
      const rascunho = await redigirConteudo(tema, referencias);

      // ── Salvar como rascunho ──────────────────────────────────────
      const agora = new Date().toISOString();
      const hash = computarHash(
        rascunho.titulo ?? tema,
        rascunho.objetivo ?? '',
        rascunho.procedimento ?? '',
        referencias
      );

      const observacaoFonte = semFontesSuficientes
        ? `ATENÇÃO: Fontes oficiais insuficientes (${referencias.length} encontrada(s)). ${observacao}`
        : observacao;

      const entradaHistorico = {
        versao: 1,
        usuario: usuario.email,
        acao: 'criar_automatico',
        data: agora,
        observacao: `Gerado automaticamente via /api/kronos/biblioteca/processar. ${observacaoFonte}`.trim(),
      };

      const { data: spec, error: errInsert } = await supabase
        .from('knowledge_specs')
        .insert({
          titulo:                     rascunho.titulo                     ?? tema,
          categoria,
          subcategoria:               subcategoria || null,
          resumo:                     rascunho.resumo                     || null,
          objetivo:                   rascunho.objetivo                   || null,
          escopo:                     rascunho.escopo                     || null,
          indicacoes:                 rascunho.indicacoes                 || null,
          contraindicacoes:           rascunho.contraindicacoes           || null,
          materiais:                  rascunho.materiais                  || null,
          preparacao:                 rascunho.preparacao                 || null,
          procedimento:               rascunho.procedimento               || null,
          cuidados:                   rascunho.cuidados                   || null,
          complicacoes:               rascunho.complicacoes               || null,
          prevencao_eventos_adversos: rascunho.prevencao_eventos_adversos || null,
          pontos_criticos:            rascunho.pontos_criticos            || null,
          observacoes:                rascunho.observacoes                || null,
          limitacoes:                 rascunho.limitacoes                 || null,
          variacoes_institucionais:   rascunho.variacoes_institucionais   || null,
          referencias_oficiais:       referencias,
          status:                     'rascunho',
          hash,
          criado_por:                 usuario.nome,
          historico:                  [entradaHistorico],
        })
        .select('id')
        .single();

      if (errInsert || !spec) {
        resultado.erro = errInsert?.message ?? 'Falha ao salvar rascunho.';
        resultado.etapa_falha = 'salvar';
        resultados.push(resultado);
        continue;
      }

      resultado.spec_id = spec.id;

      await supabase.from('knowledge_spec_audit').insert({
        spec_id: spec.id,
        usuario: usuario.email,
        acao: 'criar_automatico',
        dados: { tema, categoria, refs_encontradas: referencias.length, sem_fontes_suficientes: semFontesSuficientes },
      });

      // ── Etapas 3–8: Pipeline ─────────────────────────────────────
      // Buscar spec completa para passar ao pipeline
      const { data: specCompleta } = await supabase
        .from('knowledge_specs')
        .select('*')
        .eq('id', spec.id)
        .single();

      if (!specCompleta) {
        resultado.erro = 'Spec não encontrada após inserção.';
        resultado.etapa_falha = 'pipeline';
        resultados.push(resultado);
        continue;
      }

      // Marcar em_auditoria
      await supabase.from('knowledge_specs')
        .update({ status: 'em_auditoria', updated_at: agora })
        .eq('id', spec.id);

      let pipelineResultado;
      try {
        pipelineResultado = await executarPipeline(specCompleta as KnowledgeSpec);
      } catch (errPipeline) {
        console.error(`[biblioteca/processar] pipeline error para "${tema}":`, errPipeline);
        await supabase.from('knowledge_specs')
          .update({ status: 'rascunho', updated_at: new Date().toISOString() })
          .eq('id', spec.id);
        resultado.erro = errPipeline instanceof Error ? errPipeline.message : 'Erro no pipeline.';
        resultado.etapa_falha = 'pipeline';
        resultados.push(resultado);
        continue;
      }

      const statusFinal = pipelineResultado.classificacao === 'vermelho' ? 'reprovado' : 'aguardando_aprovacao';
      const agoraFinal = new Date().toISOString();

      const historicoFinal = [
        entradaHistorico,
        {
          versao: 2,
          usuario: usuario.email,
          acao: 'pipeline',
          data: agoraFinal,
          observacao: `Pipeline executado automaticamente. Classificação: ${pipelineResultado.classificacao}. Score: ${pipelineResultado.score}%.`,
        },
      ];

      await supabase.from('knowledge_specs').update({
        pipeline_resultado:     pipelineResultado,
        pipeline_classificacao: pipelineResultado.classificacao,
        status:                 statusFinal,
        updated_at:             agoraFinal,
        historico:              historicoFinal,
      }).eq('id', spec.id);

      await supabase.from('knowledge_spec_audit').insert({
        spec_id: spec.id,
        usuario: usuario.email,
        acao:    'pipeline',
        dados:   {
          classificacao: pipelineResultado.classificacao,
          score:         pipelineResultado.score,
          parado_em:     pipelineResultado.parado_em ?? null,
          status_final:  statusFinal,
        },
      });

      resultado.status       = statusFinal;
      resultado.classificacao = pipelineResultado.classificacao;
      resultado.score        = pipelineResultado.score;
    } catch (err) {
      resultado.erro        = err instanceof Error ? err.message : 'Erro inesperado.';
      resultado.etapa_falha = 'pesquisador_ou_redator';
    }

    resultados.push(resultado);
  }

  const sucessos = resultados.filter((r) => !r.erro).length;
  const erros    = resultados.filter((r) => !!r.erro).length;

  return res.status(200).json({
    ok:          true,
    processados: resultados,
    total:       listaFinal.length,
    sucessos,
    erros,
  });
}
