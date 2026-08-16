/**
 * Rate limiting por usuário, armazenado no Supabase (tabela rate_limits +
 * função incrementar_rate_limit — migration 20260701_rate_limits).
 *
 * Janela fixa: as requisições são contadas por (usuário, rota, janela);
 * a janela atual é derivada do relógio do banco, então funciona em
 * Vercel serverless sem depender de memória do processo.
 *
 * Fail-open deliberado: se o Supabase falhar, a requisição passa — o
 * limitador é cinto de segurança de custo, nunca pode travar um plantão.
 */
import { getSupabase } from './supabase-client';

export const MSG_RATE_LIMIT =
  'Muitas solicitações em pouco tempo. Aguarde alguns minutos e tente novamente.';

/** Limites por grupo de rota. */
export const LIMITE_PLANTAO = { limite: 30, janelaSegundos: 600 };   // 30 req / 10 min por rota
export const LIMITE_PROFESSOR = { limite: 20, janelaSegundos: 600 }; // 20 req / 10 min
export const LIMITE_PIPELINE = { limite: 10, janelaSegundos: 3600 }; // 10 req / hora (cinto de segurança; rota já exige admin)

/**
 * Incrementa o contador do usuário para a rota e diz se a requisição
 * está dentro do limite. true = pode prosseguir; false = responder 429.
 */
export async function dentroDoRateLimit(
  userId: string,
  rota: string,
  config: { limite: number; janelaSegundos: number }
): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('incrementar_rate_limit', {
    p_user_id: userId,
    p_rota: rota,
    p_janela_segundos: config.janelaSegundos,
  });

  if (error || typeof data !== 'number') {
    console.error('[rate-limit] falha ao verificar limite (liberando):', error);
    return true;
  }
  return data <= config.limite;
}
