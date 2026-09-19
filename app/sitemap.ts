import type { MetadataRoute } from 'next';
import { listarPublicados } from '@/lib/siteContent';
import { SERVICOS_PADRAO } from '@/lib/siteServicos';

export const revalidate = 3600;

function base(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://www.prevsafe.com.br').replace(/\/+$/, '');
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = base();

  const fixas: MetadataRoute.Sitemap = [
    { url: `${url}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${url}/servicos`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${url}/para-empresas`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${url}/para-trabalhadores`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${url}/atualizacoes`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${url}/contato`, changeFrequency: 'yearly', priority: 0.7 },
    { url: `${url}/guia-do-sistema`, changeFrequency: 'monthly', priority: 0.6 },
  ];

  const [artigos, servicos] = await Promise.all([
    listarPublicados('ARTIGO'),
    listarPublicados('SERVICO'),
  ]);

  const slugsPublicados = new Set(servicos.map(s => s.slug));

  return [
    ...fixas,
    ...servicos.map(s => ({
      url: `${url}/servicos/${s.slug}`,
      lastModified: new Date(s.atualizado_em),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    // Servicos do catalogo padrao que ainda nao foram publicados na
    // administracao tambem sao paginas reais e precisam ser indexadas.
    ...SERVICOS_PADRAO.filter(s => !slugsPublicados.has(s.slug)).map(s => ({
      url: `${url}/servicos/${s.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...artigos.map(a => ({
      url: `${url}/atualizacoes/${a.slug}`,
      lastModified: new Date(a.atualizado_em),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
