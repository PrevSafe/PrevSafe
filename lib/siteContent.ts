import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseAnonKey } from '@/lib/supabase';

/**
 * Leitura do conteudo do site publico.
 *
 * Usa a chave anonima de proposito: a RLS de `site_posts` so devolve o que
 * esta PUBLICADO para quem nao esta autenticado, entao rascunho nao vaza nem
 * por engano de codigo. A service role nao entra aqui.
 */

export const ORGANIZATION_ID = 'org-prevsafe-01';

export type TipoPost = 'ARTIGO' | 'SERVICO';

export interface SitePost {
  id: string;
  organization_id: string;
  tipo: TipoPost;
  slug: string;
  titulo: string;
  resumo: string | null;
  conteudo: string | null;
  imagem_url: string | null;
  categoria: string | null;
  tags: string[] | null;
  status: 'RASCUNHO' | 'PUBLICADO';
  destaque: boolean;
  ordem: number;
  seo_titulo: string | null;
  seo_descricao: string | null;
  cta_texto: string | null;
  cta_destino: string | null;
  autor: string | null;
  publicado_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

function client() {
  // Cliente proprio, sem sessao: estas paginas sao renderizadas no servidor e
  // nao devem herdar o estado de autenticacao de ninguem.
  if (!supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Artigos ou servicos publicados, do mais recente para o mais antigo. */
export async function listarPublicados(tipo: TipoPost, limite?: number): Promise<SitePost[]> {
  const supabase = client();
  if (!supabase) return [];

  let query = supabase
    .from('site_posts')
    .select('*')
    .eq('organization_id', ORGANIZATION_ID)
    .eq('tipo', tipo)
    .eq('status', 'PUBLICADO');

  // Servicos seguem a ordem manual definida na administracao; artigos, a data.
  query = tipo === 'SERVICO'
    ? query.order('ordem', { ascending: true }).order('titulo', { ascending: true })
    : query.order('publicado_em', { ascending: false, nullsFirst: false });

  if (limite) query = query.limit(limite);

  const { data, error } = await query;
  if (error) {
    console.error('[site] falha ao listar conteúdo:', error.message);
    return [];
  }
  return (data || []) as SitePost[];
}

/** Um item pelo slug. Retorna null quando nao existe ou nao esta publicado. */
export async function buscarPorSlug(tipo: TipoPost, slug: string): Promise<SitePost | null> {
  const supabase = client();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('site_posts')
    .select('*')
    .eq('organization_id', ORGANIZATION_ID)
    .eq('tipo', tipo)
    .eq('slug', slug)
    .eq('status', 'PUBLICADO')
    .maybeSingle();

  if (error || !data) return null;
  return data as SitePost;
}

/** Categorias em uso, para os filtros da listagem. */
export async function listarCategorias(tipo: TipoPost): Promise<string[]> {
  const posts = await listarPublicados(tipo);
  const categorias = new Set<string>();
  for (const p of posts) {
    if (p.categoria) categorias.add(p.categoria);
  }
  return [...categorias].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function formatarData(valor?: string | null): string {
  if (!valor) return '';
  const d = new Date(valor);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** Estimativa de leitura, exibida na listagem de artigos. */
export function minutosDeLeitura(conteudo?: string | null): number {
  if (!conteudo) return 1;
  const palavras = conteudo.trim().split(/\s+/).length;
  return Math.max(1, Math.round(palavras / 200));
}
