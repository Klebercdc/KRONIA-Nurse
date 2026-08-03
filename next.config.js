const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : 'uguxeoftfnljrxhwvdkj.supabase.co';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // Fluxo React substituído pelo HTML estático (public/evolucao-facil.html).
      // Redirect não-permanente: qualquer link/favorito antigo cai na tela real.
      { source: '/evolucao-avulsa/geral', destination: '/evolucao-facil.html', permanent: false },
      { source: '/evolucao-avulsa/geral/preview', destination: '/evolucao-facil.html', permanent: false },
    ];
  },
  images: {
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
};

module.exports = nextConfig;
