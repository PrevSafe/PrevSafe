import type { MetadataRoute } from 'next';

function base(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://www.prevsafe.com').replace(/\/+$/, '');
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // O sistema e as rotas internas nao tem por que ser rastreados: sao area
      // logada e endpoints, nao conteudo.
      disallow: ['/sistema', '/system', '/api/', '/redefinir-senha'],
    },
    sitemap: `${base()}/sitemap.xml`,
  };
}
