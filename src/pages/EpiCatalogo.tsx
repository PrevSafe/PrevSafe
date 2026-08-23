import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';

type Epi = {
  id: string;
  nome: string;
  ca: string;
  vida_util_dias: number | null;
  ativo: boolean;
};

export default function EpiCatalogo() {
  const { empresaAtiva } = useAuth();
  const [epis, setEpis] = useState<Epi[]>([]);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'ativos' | 'todos'>('ativos');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    daEmpresa(
      supabase.from('epis').select('id, nome, ca, vida_util_dias, ativo'),
      empresaAtiva.empresa_id
    )
      .order('nome')
      .then(({ data, error }) => {
        if (error) setErro(error.message);
        else setEpis(data as Epi[]);
        setCarregando(false);
      });
  }, [empresaAtiva]);

  const termo = busca.trim().toLowerCase();
  const termoDigits = busca.replace(/\D/g, '');

  const filtrados = epis.filter((e) => {
    if (statusFiltro === 'ativos' && !e.ativo) return false;
    if (!termo) return true;
    const nomeMatch = e.nome.toLowerCase().includes(termo);
    const caMatch = termoDigits.length > 0 && e.ca.includes(termoDigits);
    return nomeMatch || caMatch;
  });

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <Link
            to="/epi"
            className="text-label-sm uppercase tracking-wider text-outline hover:text-primary"
          >
            ← Entrega de EPI
          </Link>
          <h1 className="text-headline-lg text-primary mt-1">Catálogo de EPIs</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Tipos de equipamento cadastrados, com CA e vida útil — usados ao registrar entregas
          </p>
        </div>
        <Link
          to="/epi/catalogo/novo"
          className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Novo tipo de EPI
        </Link>
      </header>

      <div className="px-margin-mobile md:px-md pb-8 flex-1 flex flex-col gap-4">
        {erro && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erro}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
              search
            </span>
            <input
              type="search"
              placeholder="Buscar por nome ou CA"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full h-12 rounded-lg border border-outline-variant bg-surface-container-lowest pl-11 pr-4 text-body-md placeholder:text-outline focus:outline-none focus:border-2 focus:border-primary-container"
            />
          </div>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as 'ativos' | 'todos')}
            className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container sm:w-52"
          >
            <option value="ativos">Ativos</option>
            <option value="todos">Todos os status</option>
          </select>
        </div>

        {carregando ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/40">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">
              engineering
            </span>
            <p className="text-body-md text-on-surface-variant mb-4">
              {termo || statusFiltro !== 'ativos'
                ? 'Nenhum equipamento encontrado para este filtro.'
                : 'Nenhum tipo de EPI cadastrado ainda.'}
            </p>
            {!termo && (
              <Link
                to="/epi/catalogo/novo"
                className="text-label-md text-primary-container hover:underline"
              >
                Cadastrar o primeiro tipo de EPI
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtrados.map((e) => (
              <button
                key={e.id}
                onClick={() => navigate(`/epi/catalogo/${e.id}`)}
                className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex gap-4 items-start"
              >
                <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                  <span className="material-symbols-outlined">engineering</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-body-lg text-primary font-semibold truncate">{e.nome}</h3>
                  <p className="text-label-sm text-on-surface-variant truncate">CA {e.ca}</p>
                  <p className="text-label-sm text-on-surface-variant truncate mt-1">
                    {e.vida_util_dias ? `Vida útil: ${e.vida_util_dias} dias` : 'Sem vida útil definida'}
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-label-sm ${
                    e.ativo
                      ? 'bg-secondary-container/40 text-on-secondary-container'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {e.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
