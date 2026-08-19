import { useEffect } from 'react';

/**
 * Mantém o app sempre na última versão publicada, sozinho.
 *
 * Sem botão e sem perguntar: o service worker novo assume assim que instala
 * (`skipWaiting` em scripts/sw-template.js) e a página recarrega em seguida.
 *
 * O que torna isso seguro é o RASCUNHO: a evolução em andamento fica salva no
 * aparelho a cada resposta, então recarregar devolve o enfermeiro na mesma
 * pergunta, com as mesmas respostas. Sem o rascunho, esta função apagaria o
 * trabalho do plantão.
 *
 * Quando procura versão nova:
 *   - ao abrir o app;
 *   - toda vez que ele volta ao primeiro plano — o caso real é o celular
 *     saindo do bolso no meio do turno;
 *   - a cada 30 minutos, para a aba que fica aberta o plantão inteiro.
 */
export function useAtualizacao() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // Em desenvolvimento o service worker só atrapalha: serviria arquivo
    // velho enquanto o Next recompila.
    if (process.env.NODE_ENV !== 'production') return;

    // Na PRIMEIRA visita o worker também assume o controle, e isso dispara
    // `controllerchange` sem que exista versão nova nenhuma. Recarregar ali
    // seria um reload gratuito toda vez que alguém abre o app.
    //
    // Por isso a bandeira é MUTÁVEL e não uma foto tirada no início: a
    // primeira tomada de controle apenas a levanta, e só as trocas seguintes
    // — que são deploys de verdade — recarregam. Uma constante aqui deixaria
    // a página sem atualizar para sempre, porque nunca havia controlador no
    // primeiro carregamento.
    let temControlador = Boolean(navigator.serviceWorker.controller);

    let registro: ServiceWorkerRegistration | null = null;
    let cancelado = false;
    let recarregando = false;

    const aoTrocar = () => {
      if (!temControlador) {
        temControlador = true;
        return;
      }
      if (recarregando) return;
      recarregando = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', aoTrocar);

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        if (!cancelado) registro = reg;
      })
      .catch(() => {
        // Sem service worker o app continua funcionando: perde a atualização
        // automática e o modo offline, nada mais.
      });

    const checar = () => registro?.update().catch(() => {});
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') checar();
    };

    document.addEventListener('visibilitychange', aoVoltar);
    const timer = window.setInterval(checar, 30 * 60 * 1000);

    return () => {
      cancelado = true;
      document.removeEventListener('visibilitychange', aoVoltar);
      navigator.serviceWorker.removeEventListener('controllerchange', aoTrocar);
      window.clearInterval(timer);
    };
  }, []);
}
