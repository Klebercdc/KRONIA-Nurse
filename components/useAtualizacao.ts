import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Detecta que existe uma versão nova publicada e devolve o gatilho para trocar.
 *
 * Por que não trocar sozinho: recarregar a página no meio de uma evolução
 * apagaria as respostas em andamento, que vivem em estado de React. Então o
 * worker novo fica esperando e quem decide a hora é o enfermeiro — o app só
 * avisa. Ver o `install` sem skipWaiting em scripts/sw-template.js.
 *
 * Quando checa:
 *   - ao abrir o app;
 *   - toda vez que o app volta para o primeiro plano (o caso real: o celular
 *     ficou no bolso durante o plantão e o enfermeiro volta nele);
 *   - a cada 30 minutos, para uma aba que fica aberta o turno inteiro.
 */
export function useAtualizacao() {
  const [temAtualizacao, setTemAtualizacao] = useState(false);
  const esperando = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // Em desenvolvimento o service worker só atrapalha: serviria arquivo
    // velho enquanto o Next recompila.
    if (process.env.NODE_ENV !== 'production') return;

    let registro: ServiceWorkerRegistration | null = null;
    let cancelado = false;

    const marcar = (sw: ServiceWorker | null) => {
      // Só é ATUALIZAÇÃO se já havia um worker no controle. Na primeira
      // visita o worker também fica "installed", e avisar ali seria mentira.
      if (!sw || !navigator.serviceWorker.controller) return;
      esperando.current = sw;
      setTemAtualizacao(true);
    };

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        if (cancelado) return;
        registro = reg;
        marcar(reg.waiting);

        reg.addEventListener('updatefound', () => {
          const novo = reg.installing;
          if (!novo) return;
          novo.addEventListener('statechange', () => {
            if (novo.state === 'installed') marcar(novo);
          });
        });
      })
      .catch(() => {
        // Sem service worker o app continua funcionando: ele só perde o
        // aviso de versão nova e o modo offline.
      });

    const checar = () => registro?.update().catch(() => {});
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') checar();
    };

    document.addEventListener('visibilitychange', aoVoltar);
    const timer = window.setInterval(checar, 30 * 60 * 1000);

    // O worker novo assumiu: a página recarrega para passar a rodar o código
    // novo. Só acontece depois do clique em "Atualizar", que é o que chama
    // skipWaiting.
    let recarregando = false;
    const aoTrocar = () => {
      if (recarregando) return;
      recarregando = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', aoTrocar);

    return () => {
      cancelado = true;
      document.removeEventListener('visibilitychange', aoVoltar);
      navigator.serviceWorker.removeEventListener('controllerchange', aoTrocar);
      window.clearInterval(timer);
    };
  }, []);

  const atualizar = useCallback(() => {
    const sw = esperando.current;
    if (!sw) {
      window.location.reload();
      return;
    }
    sw.postMessage('TROCAR_AGORA');
  }, []);

  return { temAtualizacao, atualizar };
}
