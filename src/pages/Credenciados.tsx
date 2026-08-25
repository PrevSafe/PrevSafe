import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { somenteDigitos } from '@/lib/cipa/cpf';

type Clinica = {
  id: string;
  nome_fantasia: string;
  cnpj: string | null;
  regiao_uf: string;
  regiao_cidade: string;
  telefone: string | null;
  ativo: boolean;
};

export default function Credenciados() {
  const { empresaAtiva, can } = useAuth();
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'ativos' | 'todos'>('ativos');
  const [ufFiltro, setUfFiltro] = useState('');
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
      supabase
        .from('clinicas_credenciadas')
        .select('id, nome_fantasia, cnpj, regiao_uf, regiao_cidade, telefone, ativo'),
      empresaAtiva.empresa_id
    )
      .order('nome_fantasia')
      .then(({ data, error }) => {
        if (error) setErro(error.message);
        else setClinicas((data ?? []) as Clinica[]);
        setCarregando(false);
      });
  }, [empresaAtiva]);

  const termo = busca.trim().toLowerCase();
  const termoDigits = somenteDigitos(busca);
  const ufsDisponiveis = Array.from(new Set(clinicas.map((c) => c.regiao_uf))).sort();
  const filtroAtivo = Boolean(termo) || statusFiltro !== 'ativos' || Boolean(ufFiltro);

  const filtradas = clinicas.filter((c) => {
    if (statusFiltro === 'ativos' && !c.ativo) return false;
    if (ufFiltro && c.regiao_uf !== ufFiltro) return false;
    if (!termo) return true;
    const nomeMatch = c.nome_fantasia.toLowerCase().includes(termo);
    const cnpjMatch = termoDigits.length > 0 && (c.cnpj ?? '').includes(termoDigits);
    return nomeMatch || cnpjMatch;
  });

  const podeCriar = can('credenciados', 'criar');

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">Clínicas Credenciadas</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Rede de clínicas parceiras por região, usada para exames complementares do PCMSO
          </p>
        </div>
        {podeCriar && (
          <Link
            to="/credenciados/novo"
            className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nova Clínica
          </Link>
        )}
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
              placeholder="Buscar por nome fantasia ou CNPJ"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full h-12 rounded-lg border border-outline-variant bg-surface-container-lowest pl-11 pr-4 text-body-md placeholder:text-outline focus:outline-none focus:border-2 focus:border-primary-container"
            />
          </div>
          <select
            value={ufFiltro}
            onChange={(e) => setUfFiltro(e.target.value)}
            className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container sm:w-40"
          >
            <option value="">Todas as UFs</option>
            {ufsDisponiveis.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as 'ativos' | 'todos')}
            className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container sm:w-52"
          >
            <option value="ativos">Ativas</option>
            <option value="todos">Todos os status</option>
          </select>
        </div>

        {carregando ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/40">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">
              local_hospital
            </span>
            <p className="text-body-md text-on-surface-variant mb-4">
              {filtroAtivo
                ? 'Nenhuma clínica encontrada para este filtro.'
                : 'Nenhuma clínica credenciada cadastrada ainda.'}
            </p>
            {!filtroAtivo && podeCriar && (
              <Link
                to="/credenciados/novo"
                className="text-label-md text-primary-container hover:underline"
              >
                Cadastrar a primeira clínica
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtradas.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/credenciados/${c.id}`)}
                className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex gap-4 items-start"
              >
                <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                  <span className="material-symbols-outlined">local_hospital</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-body-lg text-primary font-semibold truncate">
                    {c.nome_fantasia}
                  </h3>
                  <p className="text-label-sm text-on-surface-variant truncate">
                    {c.regiao_cidade} / {c.regiao_uf}
                  </p>
                  <p className="text-label-sm text-on-surface-variant truncate mt-1">
                    {c.telefone || 'Sem telefone cadastrado'}
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-label-sm ${
                    c.ativo
                      ? 'bg-secondary-container/40 text-on-secondary-container'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {c.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
