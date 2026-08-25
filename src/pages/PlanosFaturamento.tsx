import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { formatarMoeda } from '@/lib/inspecoes';
import {
  TIPO_COBRANCA_LABEL,
  formatarData,
  type TipoCobranca,
} from '@/lib/financeiro';

type Plano = {
  id: string;
  tipo_cobranca: TipoCobranca;
  valor_unitario: number;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  ativo: boolean;
};

export default function PlanosFaturamento() {
  const { empresaAtiva, can } = useAuth();
  const podeCriar = can('financeiro', 'criar');

  const [planos, setPlanos] = useState<Plano[]>([]);
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | TipoCobranca>('todos');
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
      supabase
        .from('planos_faturamento')
        .select('id, tipo_cobranca, valor_unitario, vigencia_inicio, vigencia_fim, ativo'),
      empresaAtiva.empresa_id
    )
      .order('vigencia_inicio', { ascending: false })
      .then(({ data, error }) => {
        if (error) setErro(error.message);
        else setPlanos((data ?? []) as Plano[]);
        setCarregando(false);
      });
  }, [empresaAtiva]);

  const filtrados = planos.filter((p) => {
    if (statusFiltro === 'ativos' && !p.ativo) return false;
    if (tipoFiltro !== 'todos' && p.tipo_cobranca !== tipoFiltro) return false;
    return true;
  });

  const filtroAtivo = tipoFiltro !== 'todos' || statusFiltro !== 'ativos';

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">Planos de Faturamento</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Regras de cobrança da empresa — por vidas ativas ou por exame realizado
          </p>
        </div>
        {podeCriar && (
          <Link
            to="/financeiro/planos/novo"
            className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Novo Plano
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
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as 'todos' | TipoCobranca)}
            className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container sm:w-56"
          >
            <option value="todos">Todos os tipos</option>
            <option value="vidas_ativas">{TIPO_COBRANCA_LABEL.vidas_ativas}</option>
            <option value="por_exame">{TIPO_COBRANCA_LABEL.por_exame}</option>
          </select>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as 'ativos' | 'todos')}
            className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container sm:w-44"
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
              payments
            </span>
            <p className="text-body-md text-on-surface-variant mb-4">
              {filtroAtivo
                ? 'Nenhum plano encontrado para este filtro.'
                : 'Nenhum plano de faturamento cadastrado ainda.'}
            </p>
            {!filtroAtivo && podeCriar && (
              <Link
                to="/financeiro/planos/novo"
                className="text-label-md text-primary-container hover:underline"
              >
                Cadastrar o primeiro plano
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtrados.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/financeiro/planos/${p.id}`)}
                className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex gap-4 items-start"
              >
                <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-body-lg text-primary font-semibold truncate">
                    {TIPO_COBRANCA_LABEL[p.tipo_cobranca]}
                  </h3>
                  <p className="text-label-sm text-on-surface-variant truncate">
                    {formatarMoeda(p.valor_unitario)}
                  </p>
                  <p className="text-label-sm text-outline truncate mt-1">
                    {formatarData(p.vigencia_inicio)} — {p.vigencia_fim ? formatarData(p.vigencia_fim) : 'vigente'}
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-label-sm ${
                    p.ativo
                      ? 'bg-secondary-container/40 text-on-secondary-container'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {p.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
