const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : 'uguxeoftfnljrxhwvdkj.supabase.co';

// Publicação no GitHub Pages exige site estático. O app é 100% cliente —
// motor determinístico, zero chamada de rede, dados em localStorage — então
// exportar é o formato natural dele.
//
// KRONIA_ESTATICO liga esse modo só no workflow de publicação. `npm run dev`
// e `npm run build` locais seguem no modo servidor, com o pages/api parado
// compilando como sempre.
const estatico = process.env.KRONIA_ESTATICO === '1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    // Sem servidor não há otimizador de imagem.
    ...(estatico ? { unoptimized: true } : {}),
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHostname,
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  // Cada rota vira uma pasta com index.html, que é o que o Pages serve.
  ...(estatico ? { output: 'export', trailingSlash: true } : {}),

  // `redirects` depende de servidor: em site estático não existe quem
  // responda 307, então o bloco só é declarado no modo servidor.
  ...(estatico
    ? {}
    : {
        async redirects() {
          return [
            // Fluxo React substituído pelo HTML estático. Redirect não-permanente:
            // qualquer link/favorito antigo cai na tela real (front door: nova-evolucao.html).
            { source: '/evolucao-avulsa/geral', destination: '/nova-evolucao.html', permanent: false },
            { source: '/evolucao-avulsa/geral/preview', destination: '/nova-evolucao.html', permanent: false },
          ];
        },
      }),
};

module.exports = nextConfig;
