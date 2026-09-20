'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { getSupabaseClient } from '@/lib/supabase';
import { markdownParaHtml } from '@/lib/siteMarkdown';
import { enviarImagemDoSite, removerImagemDoSite, formatarTamanho } from '@/lib/siteImagens';
import {
  Newspaper, Plus, Search, Edit3, Trash2, Eye, EyeOff, ExternalLink,
  Save, X, Loader2, AlertTriangle, CheckCircle2, FileText, Wrench,
  ImagePlus, ImageOff,
} from 'lucide-react';

/**
 * Administracao do conteudo do site publico.
 *
 * Escreve direto em `site_posts` com a sessao do proprio usuario: a RLS ja
 * exige vinculo com a organizacao, entao nao ha motivo para passar por uma
 * rota de servidor com service role.
 */

type Tipo = 'ARTIGO' | 'SERVICO';
type Status = 'RASCUNHO' | 'PUBLICADO';

interface Post {
  id: string;
  organization_id: string;
  tipo: Tipo;
  slug: string;
  titulo: string;
  resumo: string | null;
  conteudo: string | null;
  imagem_url: string | null;
  categoria: string | null;
  tags: string[] | null;
  status: Status;
  destaque: boolean;
  ordem: number;
  seo_titulo: string | null;
  seo_descricao: string | null;
  cta_texto: string | null;
  cta_destino: string | null;
  autor: string | null;
  publicado_em: string | null;
  atualizado_em: string;
}

const VAZIO = {
  tipo: 'ARTIGO' as Tipo,
  slug: '',
  titulo: '',
  resumo: '',
  conteudo: '',
  imagem_url: '',
  categoria: '',
  tags: '',
  status: 'RASCUNHO' as Status,
  destaque: false,
  ordem: 0,
  seo_titulo: '',
  seo_descricao: '',
  cta_texto: '',
  cta_destino: '',
  autor: '',
};

/** Gera o slug a partir do titulo: sem acento, sem simbolo, separado por hifen. */
function gerarSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export const SiteContentView: React.FC<{ onNavigate: (view: string) => void }> = () => {
  const { organization, currentProfile } = usePrevSafe();

  const [posts, setPosts] = useState<Post[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | Tipo>('TODOS');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | Status>('TODOS');
  const [busca, setBusca] = useState('');

  const [editando, setEditando] = useState<Post | null>(null);
  const [form, setForm] = useState({ ...VAZIO });
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [previa, setPrevia] = useState(false);
  const [slugTocado, setSlugTocado] = useState(false);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [avisoImagem, setAvisoImagem] = useState<string | null>(null);
  const imagemInputRef = React.useRef<HTMLInputElement | null>(null);

  const carregar = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setErro('Supabase não configurado.');
      setCarregando(false);
      return;
    }
    setCarregando(true);
    const { data, error } = await supabase
      .from('site_posts')
      .select('*')
      .eq('organization_id', organization.id)
      .order('atualizado_em', { ascending: false });

    if (error) setErro(`Não foi possível carregar o conteúdo: ${error.message}`);
    else {
      setPosts((data || []) as Post[]);
      setErro(null);
    }
    setCarregando(false);
  }, [organization.id]);

  useEffect(() => { void carregar(); }, [carregar]);

  const notificar = (mensagem: string) => {
    setAviso(mensagem);
    setTimeout(() => setAviso(null), 4000);
  };

  const abrirNovo = (tipo: Tipo) => {
    setEditando(null);
    setForm({ ...VAZIO, tipo, autor: currentProfile?.full_name || '' });
    setSlugTocado(false);
    setPrevia(false);
    setModalAberto(true);
  };

  const abrirEdicao = (post: Post) => {
    setEditando(post);
    setForm({
      tipo: post.tipo,
      slug: post.slug,
      titulo: post.titulo,
      resumo: post.resumo || '',
      conteudo: post.conteudo || '',
      imagem_url: post.imagem_url || '',
      categoria: post.categoria || '',
      tags: (post.tags || []).join(', '),
      status: post.status,
      destaque: post.destaque,
      ordem: post.ordem,
      seo_titulo: post.seo_titulo || '',
      seo_descricao: post.seo_descricao || '',
      cta_texto: post.cta_texto || '',
      cta_destino: post.cta_destino || '',
      autor: post.autor || '',
    });
    setSlugTocado(true);
    setPrevia(false);
    setModalAberto(true);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) return;

    if (!form.titulo.trim()) { setErro('Informe o título.'); return; }
    const slug = (form.slug || gerarSlug(form.titulo)).trim();
    if (!slug) { setErro('Não foi possível gerar o endereço. Informe manualmente.'); return; }

    setSalvando(true);
    setErro(null);

    const payload = {
      organization_id: organization.id,
      tipo: form.tipo,
      slug,
      titulo: form.titulo.trim(),
      resumo: form.resumo.trim() || null,
      conteudo: form.conteudo || null,
      imagem_url: form.imagem_url.trim() || null,
      categoria: form.categoria.trim() || null,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      status: form.status,
      destaque: form.destaque,
      ordem: Number(form.ordem) || 0,
      seo_titulo: form.seo_titulo.trim() || null,
      seo_descricao: form.seo_descricao.trim() || null,
      cta_texto: form.cta_texto.trim() || null,
      cta_destino: form.cta_destino.trim() || null,
      autor: form.autor.trim() || null,
    };

    const { error } = editando
      ? await supabase.from('site_posts').update(payload).eq('id', editando.id)
      : await supabase.from('site_posts').insert(payload);

    setSalvando(false);

    if (error) {
      setErro(
        error.code === '23505'
          ? 'Já existe um conteúdo com este endereço. Altere o campo "Endereço da página".'
          : `Não foi possível salvar: ${error.message}`
      );
      return;
    }

    setModalAberto(false);
    notificar(editando ? 'Conteúdo atualizado.' : 'Conteúdo criado.');
    void carregar();
  };

  const alternarPublicacao = async (post: Post) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const novo: Status = post.status === 'PUBLICADO' ? 'RASCUNHO' : 'PUBLICADO';
    const { error } = await supabase.from('site_posts').update({ status: novo }).eq('id', post.id);
    if (error) setErro(`Não foi possível alterar: ${error.message}`);
    else {
      notificar(novo === 'PUBLICADO' ? 'Publicado no site.' : 'Despublicado. Saiu do ar.');
      void carregar();
    }
  };

  const excluir = async (post: Post) => {
    if (!confirm(`Excluir "${post.titulo}"? Esta ação não pode ser desfeita.`)) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('site_posts').delete().eq('id', post.id);
    if (error) setErro(`Não foi possível excluir: ${error.message}`);
    else {
      notificar('Conteúdo excluído.');
      void carregar();
    }
  };

  const escolherImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reenviar o mesmo arquivo depois de remover
    if (!file) return;

    setEnviandoImagem(true);
    setAvisoImagem(null);

    const r = await enviarImagemDoSite(organization.id, file);

    if (r.ok && r.url) {
      setForm(f => ({ ...f, imagem_url: r.url as string }));
      setAvisoImagem(
        r.reducao
          ? `Imagem otimizada de ${formatarTamanho(r.reducao.de)} para ${formatarTamanho(r.reducao.para)} antes do envio.`
          : 'Imagem enviada.'
      );
    } else {
      setAvisoImagem(r.mensagem || 'Não foi possível enviar a imagem.');
    }
    setEnviandoImagem(false);
  };

  const removerImagem = async () => {
    const url = form.imagem_url;
    setForm(f => ({ ...f, imagem_url: '' }));
    setAvisoImagem(null);
    // Só apaga do bucket se for nossa; URL externa apenas sai do campo. E só
    // depois de salvo o conteúdo é que a remoção do arquivo faz sentido — se o
    // usuário cancelar a edição, o campo volta ao que estava.
    if (url && editando?.imagem_url === url) {
      await removerImagemDoSite(url);
    }
  };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return posts.filter(p => {
      if (filtroTipo !== 'TODOS' && p.tipo !== filtroTipo) return false;
      if (filtroStatus !== 'TODOS' && p.status !== filtroStatus) return false;
      if (q && !p.titulo.toLowerCase().includes(q) && !p.slug.includes(q)) return false;
      return true;
    });
  }, [posts, filtroTipo, filtroStatus, busca]);

  const publicados = posts.filter(p => p.status === 'PUBLICADO').length;
  const campo = 'w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500';
  const caminhoPublico = form.tipo === 'ARTIGO' ? '/atualizacoes/' : '/servicos/';

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
            <Newspaper className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Site &amp; Conteúdo</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {posts.length} {posts.length === 1 ? 'item' : 'itens'} · {publicados} no ar em prevsafe.com
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <ExternalLink className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            Ver o site
          </a>
          <button
            onClick={() => abrirNovo('SERVICO')}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Wrench className="w-4 h-4 text-teal-400" aria-hidden="true" />
            Nova página de serviço
          </button>
          <button
            onClick={() => abrirNovo('ARTIGO')}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Nova publicação
          </button>
        </div>
      </div>

      {aviso && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          {aviso}
        </div>
      )}
      {erro && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{erro}</span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[14rem]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
          <input
            type="search"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por título ou endereço..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as any)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white">
          <option value="TODOS">Todos os tipos</option>
          <option value="ARTIGO">Publicações</option>
          <option value="SERVICO">Páginas de serviço</option>
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as any)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white">
          <option value="TODOS">Todos os status</option>
          <option value="PUBLICADO">No ar</option>
          <option value="RASCUNHO">Rascunho</option>
        </select>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {carregando ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            Carregando...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-600 mx-auto" aria-hidden="true" />
            <p className="mt-3 font-semibold text-slate-300">
              {posts.length === 0 ? 'Nenhum conteúdo ainda' : 'Nada encontrado com esses filtros'}
            </p>
            <p className="mt-1.5 text-sm text-slate-500 max-w-[28rem] mx-auto">
              {posts.length === 0
                ? 'Publique a primeira atualização de SST. Ela aparece no site assim que o status for "No ar".'
                : 'Ajuste a busca ou os filtros acima.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Título</th>
                  <th className="py-3 px-4 hidden md:table-cell">Tipo</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Categoria</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filtrados.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-100">{p.titulo}</p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {p.tipo === 'ARTIGO' ? '/atualizacoes/' : '/servicos/'}{p.slug}
                      </p>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-slate-400">
                      {p.tipo === 'ARTIGO' ? 'Publicação' : 'Serviço'}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-slate-400">{p.categoria || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        p.status === 'PUBLICADO'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-600/40'
                          : 'bg-slate-700/40 text-slate-300 border border-slate-600/40'
                      }`}>
                        {p.status === 'PUBLICADO' ? 'No ar' : 'Rascunho'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        {p.status === 'PUBLICADO' && (
                          <a
                            href={`${p.tipo === 'ARTIGO' ? '/atualizacoes/' : '/servicos/'}${p.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir no site"
                            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => alternarPublicacao(p)}
                          title={p.status === 'PUBLICADO' ? 'Tirar do ar' : 'Publicar'}
                          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition"
                        >
                          {p.status === 'PUBLICADO' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => abrirEdicao(p)}
                          title="Editar"
                          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => excluir(p)}
                          title="Excluir"
                          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-[56rem] my-8 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900 rounded-t-3xl z-10">
              <div>
                <h2 className="font-bold text-white">
                  {editando ? 'Editar conteúdo' : form.tipo === 'ARTIGO' ? 'Nova publicação' : 'Nova página de serviço'}
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Endereço no site: <span className="font-mono text-emerald-400">{caminhoPublico}{form.slug || gerarSlug(form.titulo) || '...'}</span>
                </p>
              </div>
              <button onClick={() => setModalAberto(false)} className="p-2 text-slate-400 hover:text-white" aria-label="Fechar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={salvar} className="p-5 space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Título *</label>
                  <input
                    type="text"
                    required
                    value={form.titulo}
                    onChange={e => {
                      const titulo = e.target.value;
                      setForm(f => ({ ...f, titulo, slug: slugTocado ? f.slug : gerarSlug(titulo) }));
                    }}
                    placeholder="Ex.: Novo prazo do eSocial para eventos de SST"
                    className={campo}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as Tipo }))} className={campo}>
                    <option value="ARTIGO">Publicação</option>
                    <option value="SERVICO">Página de serviço</option>
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Endereço da página</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={e => { setSlugTocado(true); setForm(f => ({ ...f, slug: gerarSlug(e.target.value) })); }}
                    className={`${campo} font-mono`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Categoria</label>
                  <input
                    type="text"
                    value={form.categoria}
                    onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                    placeholder="Ex.: eSocial, NR-01"
                    className={campo}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Resumo <span className="text-slate-600">— aparece na listagem e no Google</span>
                </label>
                <textarea
                  rows={2}
                  value={form.resumo}
                  onChange={e => setForm(f => ({ ...f, resumo: e.target.value }))}
                  className={campo}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-400">
                    Conteúdo <span className="text-slate-600">— aceita Markdown</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setPrevia(v => !v)}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
                  >
                    {previa ? 'Voltar a editar' : 'Ver prévia'}
                  </button>
                </div>
                {previa ? (
                  <div className="bg-white rounded-xl p-5 max-h-[24rem] overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: markdownParaHtml(form.conteudo) }} />
                  </div>
                ) : (
                  <textarea
                    rows={14}
                    value={form.conteudo}
                    onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
                    placeholder={'## Subtítulo\n\nTexto do parágrafo.\n\n- item de lista\n- outro item\n\n> Destaque importante\n\n[texto do link](https://exemplo.com)'}
                    className={`${campo} font-mono text-[13px] leading-relaxed`}
                  />
                )}
                <p className="text-[11px] text-slate-500 mt-1.5">
                  ## título · **negrito** · *itálico* · - lista · &gt; destaque · [link](url) · ![imagem](url)
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Imagem de capa</label>

                  <input
                    ref={imagemInputRef}
                    type="file"
                    accept="image/*"
                    onChange={escolherImagem}
                    className="hidden"
                  />

                  {form.imagem_url ? (
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.imagem_url}
                        alt="Capa escolhida"
                        className="w-full h-32 object-cover rounded-xl border border-slate-800"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => imagemInputRef.current?.click()}
                          disabled={enviandoImagem}
                          className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-200 rounded-xl text-xs font-semibold transition"
                        >
                          Trocar
                        </button>
                        <button
                          type="button"
                          onClick={removerImagem}
                          className="px-3 py-2 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                        >
                          <ImageOff className="w-3.5 h-3.5" aria-hidden="true" />
                          Remover
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => imagemInputRef.current?.click()}
                      disabled={enviandoImagem}
                      className="w-full py-6 border-2 border-dashed border-slate-800 hover:border-emerald-600 disabled:opacity-60 rounded-xl text-center transition"
                    >
                      {enviandoImagem ? (
                        <Loader2 className="w-6 h-6 mx-auto text-emerald-400 animate-spin" aria-hidden="true" />
                      ) : (
                        <ImagePlus className="w-6 h-6 mx-auto text-slate-500" aria-hidden="true" />
                      )}
                      <span className="block mt-2 text-xs font-semibold text-slate-300">
                        {enviandoImagem ? 'Enviando...' : 'Escolher imagem'}
                      </span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        Redimensionada automaticamente antes do envio
                      </span>
                    </button>
                  )}

                  {avisoImagem && (
                    <p className="text-[11px] text-slate-400 mt-1.5">{avisoImagem}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tags (separadas por vírgula)</label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                    className={campo}
                  />
                </div>
              </div>

              <details className="bg-slate-950/60 border border-slate-800 rounded-xl">
                <summary className="px-4 py-3 text-xs font-semibold text-slate-300 cursor-pointer">
                  Ajustes de SEO e chamada para ação
                </summary>
                <div className="p-4 pt-0 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Título no Google</label>
                      <input type="text" value={form.seo_titulo} onChange={e => setForm(f => ({ ...f, seo_titulo: e.target.value }))} placeholder="Deixe vazio para usar o título" className={campo} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Descrição no Google</label>
                      <input type="text" value={form.seo_descricao} onChange={e => setForm(f => ({ ...f, seo_descricao: e.target.value }))} placeholder="Deixe vazio para usar o resumo" className={campo} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Texto do botão</label>
                      <input type="text" value={form.cta_texto} onChange={e => setForm(f => ({ ...f, cta_texto: e.target.value }))} placeholder="Ex.: Solicitar diagnóstico" className={campo} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Destino do botão</label>
                      <input type="text" value={form.cta_destino} onChange={e => setForm(f => ({ ...f, cta_destino: e.target.value }))} placeholder="/contato" className={campo} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Autor</label>
                      <input type="text" value={form.autor} onChange={e => setForm(f => ({ ...f, autor: e.target.value }))} className={campo} />
                    </div>
                    {form.tipo === 'SERVICO' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Ordem na listagem</label>
                        <input type="number" value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem: Number(e.target.value) }))} className={campo} />
                      </div>
                    )}
                  </div>
                </div>
              </details>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <label className="flex items-center gap-2.5 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.status === 'PUBLICADO'}
                    onChange={e => setForm(f => ({ ...f, status: e.target.checked ? 'PUBLICADO' : 'RASCUNHO' }))}
                    className="w-4 h-4 rounded accent-emerald-500"
                  />
                  <span>
                    Publicar no site
                    <span className="block text-[11px] text-slate-500">
                      Desmarcado, fica salvo como rascunho e não aparece para ninguém.
                    </span>
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setModalAberto(false)} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition">
                    Cancelar
                  </button>
                  <button type="submit" disabled={salvando} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition flex items-center gap-2">
                    {salvando ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
                    {salvando ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
