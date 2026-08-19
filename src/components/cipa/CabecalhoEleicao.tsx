import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabaseServidor } from '@/lib/cipa/supabase';

const ABAS = [
  { rota: 'eleitores', texto: 'Eleitores' },
  { rota: 'candidatos', texto: 'Candidatos' },
  { rota: 'quarentena', texto: 'Quarentena' },
  { rota: 'cartaz', texto: 'Cartaz do mural' },
  { rota: 'comissao', texto: 'Comissão eleitoral' },
  { rota: 'apuracao', texto: 'Apuração e atas' },
] as const;

/**
 * Cabeçalho reaproveitável das telas de uma eleição: botão de voltar,
 * breadcrumb e a barra de abas. Sem `titulo`, mostra só a barra de abas
 * (uso no painel da eleição, que já tem seu próprio cabeçalho).
 */
export function CabecalhoEleicao({ eleicaoId, titulo }: { eleicaoId: string; titulo?: string }) {
  const location = useLocation();
  const [tituloEleicao, setTituloEleicao] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const supabase = await supabaseServidor();
      const { data } = await supabase.from('eleicoes').select('titulo').eq('id', eleicaoId).single();
      if (ativo) setTituloEleicao((data as { titulo: string } | null)?.titulo ?? null);
    })();
    return () => { ativo = false; };
  }, [eleicaoId]);

  return (
    <div>
      {titulo && (
        <div className="flex items-center gap-3">
          <Link
            to={`/cipa/${eleicaoId}`}
            aria-label="Voltar ao painel da eleição"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-highest"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <nav className="flex min-w-0 items-center gap-1 text-label-sm uppercase tracking-wider text-outline">
            <Link to="/cipa" className="shrink-0 hover:text-primary">Eleições</Link>
            <span className="shrink-0">›</span>
            <Link to={`/cipa/${eleicaoId}`} className="min-w-0 truncate hover:text-primary">
              {tituloEleicao ?? '…'}
            </Link>
            <span className="shrink-0">›</span>
            <span className="min-w-0 truncate text-on-surface-variant">{titulo}</span>
          </nav>
        </div>
      )}

      <nav className={`flex flex-wrap gap-2 ${titulo ? 'mt-4' : ''}`}>
        {ABAS.map((a) => {
          const href = `/cipa/${eleicaoId}/${a.rota}`;
          const ativa = location.pathname === href;
          return (
            <Link
              key={a.rota}
              to={href}
              className={`flex h-11 items-center rounded-lg px-4 text-label-sm transition-colors ${
                ativa
                  ? 'bg-primary-container text-white'
                  : 'border border-outline text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {a.texto}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
