import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabaseServidor } from '@/lib/cipa/supabase';

const CORES: Record<string, string> = {
  RASCUNHO: 'bg-outline-variant text-on-surface-variant',
  AGENDADA: 'bg-warning-container text-warning',
  ABERTA: 'bg-secondary-container text-on-secondary-container',
  ENCERRADA: 'bg-on-surface-variant text-white',
  APURADA: 'bg-on-surface-variant text-white',
  CANCELADA: 'bg-error-container text-on-error-container',
};

type Eleicao = {
  id: string;
  titulo: string;
  norma: string;
  status: string;
  data_inicio: string;
  data_fim: string;
  total_eleitores_aptos: number;
  unidades: { razao_social: string; nome_fantasia: string | null } | null;
};

export default function ListaEleicoes() {
  const [eleicoes, setEleicoes] = useState<Eleicao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const supabase = await supabaseServidor();
      const { data } = await supabase
        .from('eleicoes')
        .select('id, titulo, norma, status, data_inicio, data_fim, total_eleitores_aptos, unidades(razao_social, nome_fantasia)')
        .order('data_inicio', { ascending: false });
      if (!ativo) return;
      setEleicoes((data ?? []) as unknown as Eleicao[]);
      setCarregando(false);
    })();
    return () => { ativo = false; };
  }, []);

  if (carregando) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <span className="material-symbols-outlined animate-spin text-primary text-[32px]">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="px-margin-mobile md:px-md py-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-label-sm uppercase tracking-wider text-outline">Módulo CIPA</p>
          <h1 className="mt-2 text-headline-lg font-extrabold text-on-surface">Eleições</h1>
        </div>
        <Link
          to="/cipa/nova"
          className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nova eleição
        </Link>
      </header>

      {!eleicoes.length && (
        <div className="mt-8 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-8 shadow-sm">
          <p className="text-title-lg font-bold text-on-surface">Nenhuma eleição ainda</p>
          <p className="mt-2 max-w-xl text-on-surface-variant">
            Uma eleição pertence a uma unidade — a NR-05 constitui uma CIPA por estabelecimento.
            Cadastre a unidade e os funcionários antes de começar.
          </p>
          <Link to="/cipa/nova" className="mt-6 inline-flex h-12 items-center rounded-lg bg-primary-container px-5 text-label-md text-white hover:opacity-90 transition-opacity">
            Criar primeira eleição
          </Link>
        </div>
      )}

      <ul className="mt-8 grid gap-3">
        {eleicoes.map((e) => (
          <li key={e.id}>
            <Link
              to={`/cipa/${e.id}`}
              className="flex items-center gap-6 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm hover:border-outline transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-label-sm uppercase tracking-wider text-outline">
                  {e.unidades?.nome_fantasia || e.unidades?.razao_social || '—'} · {e.norma}
                </p>
                <p className="mt-1 truncate text-title-lg font-bold text-on-surface">{e.titulo}</p>
                <p className="mt-1 text-label-md text-on-surface-variant">
                  {new Date(e.data_inicio).toLocaleDateString('pt-BR')} a{' '}
                  {new Date(e.data_fim).toLocaleDateString('pt-BR')} · {e.total_eleitores_aptos} aptos
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${CORES[e.status] ?? ''}`}>
                {e.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
