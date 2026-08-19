/* eslint-disable no-restricted-globals */
/**
 * Service worker do KRONIA Nurse — GERADO NO BUILD.
 *
 * NÃO EDITE public/sw.js: ele é reescrito por scripts/gerar-sw.js a cada
 * `npm run build`. A fonte é scripts/sw-template.js, e a linha da versão é
 * substituída na geração.
 *
 * A versão embutida é o que faz a atualização funcionar. O navegador só
 * considera um service worker "novo" se os BYTES do arquivo mudarem; com a
 * versão do build aqui dentro, todo deploy produz um sw.js diferente e a
 * troca é detectada sem depender de cabeçalho de cache do servidor.
 */

const VERSAO = '__VERSAO__';
const CACHE = `kronia-nurse-${VERSAO}`;

/**
 * O casco do app. Vale a pena pré-cachear porque é o que faz a evolução
 * abrir sem sinal — plantão em subsolo de hospital é o caso real.
 */
const CASCO = ['/', '/manifest.json', '/kronia-wordmark.png', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (evento) => {
  // ASSUME NA HORA. O app se atualiza sozinho, sem botão e sem perguntar: a
  // evolução em andamento sobrevive porque fica salva em rascunho no
  // aparelho (ver o rascunho em components/KroniaNurseApp.jsx), então
  // recarregar devolve o enfermeiro na mesma pergunta.
  self.skipWaiting();
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll(CASCO)).catch(() => {}));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (evento) => {
  if (evento.data === 'QUAL_VERSAO') {
    evento.source && evento.source.postMessage({ tipo: 'VERSAO', versao: VERSAO });
  }
});

self.addEventListener('fetch', (evento) => {
  const req = evento.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navegação: REDE PRIMEIRO. É o que garante que a versão nova chega assim
  // que existe; o cache só entra quando não há rede.
  if (req.mode === 'navigate') {
    evento.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copia)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/').then((r) => r || Response.error())),
    );
    return;
  }

  // Assets versionados do Next (/_next/static/...) nunca mudam de conteúdo
  // sob o mesmo nome: cache primeiro, sem revalidar.
  if (url.pathname.startsWith('/_next/static/')) {
    evento.respondWith(
      caches.match(req).then(
        (cacheado) =>
          cacheado ||
          fetch(req).then((res) => {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
            return res;
          }),
      ),
    );
    return;
  }

  // Resto (ícones, wordmark, manifest): serve do cache e revalida em segundo
  // plano, para a tela nunca esperar por eles.
  evento.respondWith(
    caches.match(req).then((cacheado) => {
      const daRede = fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
          return res;
        })
        .catch(() => cacheado);
      return cacheado || daRede;
    }),
  );
});
