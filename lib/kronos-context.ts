/**
 * Context Engine (mínimo) — context/kits/kronos-arquitetura-cognitiva.md,
 * Domínio 4. Só organiza contexto: nunca consulta documento, nunca faz
 * I/O de rede/banco. Sem histórico de conversa nem especialidade do
 * usuário nesta primeira fatia (decisão já registrada no kit — não existe
 * esse dado no perfil hoje, não inventar campo).
 */

export type ContextoKronos = {
  usuario: {
    id: string;
    nome: string;
  };
  pergunta: string;
};

export function montarContexto(
  usuario: { id: string; nome: string },
  pergunta: string
): ContextoKronos {
  return {
    usuario: { id: usuario.id, nome: usuario.nome },
    pergunta: pergunta.trim(),
  };
}
