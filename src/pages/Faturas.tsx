import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { formatarMoeda } from '@/lib/inspecoes';
import {
  STATUS_FATURA_LABEL,
  TIPO_COBRANCA_LABEL,
  corStatusFatura,
  formatarCompetencia,
  type StatusFatura,
  type TipoCobranca,
} from '@/lib/financeiro';

type Fatura = {
  id: string;
  competencia: string;
  quantidade_apurada: number;
  valor_total: number;
  status: StatusFatura;
  planos_faturamento: { tipo_cobranca: TipoCobranca } | null;
};

export default function Faturas() {
  const { empresaAtiva, can } = useAuth();
  const podeCriar = can('financeiro', 'criar');

  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [statusFiltro, setStatusFiltro] = useState<'todos' | StatusFatura>('todos');
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
        .from('faturas')
        .select('id, competencia, quantidade_apurada, valor_total, status, planos_faturamento(tipo_cobranca)'),
      empresaAtiva.empresa_id
    )
      .order('competencia', { ascending: false })
      .then(({ data, error }) => {
        if (error) setErro(error.message);
        else setFaturas((data ?? []) as unknown as Fatura[]);
        setCarregando(false);
      });
  }, [empresaAtiva]);

  const filtradas = faturas.filter((f) => statusFiltro === 'todos' || f.status === statusFiltro);
  const filtroAtivo = statusFiltro !== 'todos';

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">Faturas</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Gestão manual das faturas geradas por competência a partir dos planos de faturamento
          </p>
        </div>
        {podeCriar && (
          <Link
            to="/financeiro/faturas/novo"
            className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nova Fatura
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
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as 'todos' | StatusFatura)}
            className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container sm:w-52"
          >
            <option value="todos">Todos os status</option>
            <option value="aberta">{STATUS_FATURA_LABEL.aberta}</option>
            <option value="emitida">{STATUS_FATURA_LABEL.emitida}</option>
            <option value="paga">{STATUS_FATURA_LABEL.paga}</option>
            <option value="cancelada">{STATUS_FATURA_LABEL.cancelada}</option>
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
              receipt_long
            </span>
            <p className="text-body-md text-on-surface-variant mb-4">
              {filtroAtivo
                ? 'Nenhuma fatura encontrada para este filtro.'
                : 'Nenhuma fatura cadastrada ainda.'}
            </p>
            {!filtroAtivo && podeCriar && (
              <Link
                to="/financeiro/faturas/novo"
                className="text-label-md text-primary-container hover:underline"
              >
                Lançar a primeira fatura
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtradas.map((f) => (
              <button
                key={f.id}
                onClick={() => navigate(`/financeiro/faturas/${f.id}`)}
                className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex gap-4 items-start"
              >
                <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                  <span className="material-symbols-outlined">receipt_long</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-body-lg text-primary font-semibold truncate">
                    {formatarCompetencia(f.competencia)}
                  </h3>
                  <p className="text-label-sm text-on-surface-variant truncate">
                    {f.planos_faturamento ? TIPO_COBRANCA_LABEL[f.planos_faturamento.tipo_cobranca] : '—'}
                    {' · '}
                    {f.quantidade_apurada} apurado(s)
                  </p>
                  <p className="text-label-sm text-outline truncate mt-1">
                    {formatarMoeda(f.valor_total)}
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-label-sm ${corStatusFatura(f.status)}`}
                >
                  {STATUS_FATURA_LABEL[f.status]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
