import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import {
  STATUS_AGENDAMENTO_LABEL,
  corStatusAgendamento,
  formatarData,
  type StatusAgendamento,
} from '@/lib/agendaMedica';

type Agendamento = {
  id: string;
  data_agendada: string;
  status: StatusAgendamento;
  funcionarios: { nome: string } | null;
  procedimentos_t27: { nome_exame: string } | null;
  clinicas_credenciadas: { nome_fantasia: string } | null;
};

export default function AgendaMedica() {
  const { empresaAtiva, can } = useAuth();
  const podeCriar = can('agenda_medica', 'criar');

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | StatusAgendamento>('todos');
  const [periodoFiltro, setPeriodoFiltro] = useState<'proximos' | 'todos'>('proximos');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    setCarregando(true);

    let consulta = daEmpresa(
      supabase
        .from('agenda_medica')
        .select(
          'id, data_agendada, status, funcionarios(nome), procedimentos_t27(nome_exame), clinicas_credenciadas(nome_fantasia)'
        ),
      empresaAtiva.empresa_id
    );

    if (periodoFiltro === 'proximos') {
      consulta = consulta.gte('data_agendada', new Date().toISOString());
    }

    consulta
      .order('data_agendada', { ascending: periodoFiltro === 'proximos' })
      .then(({ data, error }) => {
        if (error) setErro(error.message);
        else setAgendamentos((data ?? []) as unknown as Agendamento[]);
        setCarregando(false);
      });
  }, [empresaAtiva, periodoFiltro]);

  const termo = busca.trim().toLowerCase();

  const filtrados = agendamentos.filter((a) => {
    if (statusFiltro !== 'todos' && a.status !== statusFiltro) return false;
    if (!termo) return true;
    return (a.funcionarios?.nome ?? '').toLowerCase().includes(termo);
  });

  const filtroAtivo = Boolean(termo) || statusFiltro !== 'todos' || periodoFiltro !== 'proximos';

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">Agenda Médica</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Agendamento de exames complementares do PCMSO por trabalhador, internos ou em clínica
            credenciada
          </p>
        </div>
        {podeCriar && (
          <Link
            to="/agenda-medica/novo"
            className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Novo Agendamento
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
              placeholder="Buscar por nome do funcionário"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full h-12 rounded-lg border border-outline-variant bg-surface-container-lowest pl-11 pr-4 text-body-md placeholder:text-outline focus:outline-none focus:border-2 focus:border-primary-container"
            />
          </div>
          <select
            value={periodoFiltro}
            onChange={(e) => setPeriodoFiltro(e.target.value as 'proximos' | 'todos')}
            className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container sm:w-48"
          >
            <option value="proximos">Próximos agendamentos</option>
            <option value="todos">Todos / histórico</option>
          </select>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as 'todos' | StatusAgendamento)}
            className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container sm:w-44"
          >
            <option value="todos">Todos os status</option>
            <option value="agendado">{STATUS_AGENDAMENTO_LABEL.agendado}</option>
            <option value="confirmado">{STATUS_AGENDAMENTO_LABEL.confirmado}</option>
            <option value="realizado">{STATUS_AGENDAMENTO_LABEL.realizado}</option>
            <option value="faltou">{STATUS_AGENDAMENTO_LABEL.faltou}</option>
            <option value="cancelado">{STATUS_AGENDAMENTO_LABEL.cancelado}</option>
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
              event_available
            </span>
            <p className="text-body-md text-on-surface-variant mb-4">
              {filtroAtivo
                ? 'Nenhum agendamento encontrado para este filtro.'
                : 'Nenhum agendamento cadastrado ainda.'}
            </p>
            {!filtroAtivo && podeCriar && (
              <Link
                to="/agenda-medica/novo"
                className="text-label-md text-primary-container hover:underline"
              >
                Criar o primeiro agendamento
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtrados.map((a) => (
              <button
                key={a.id}
                onClick={() => navigate(`/agenda-medica/${a.id}`)}
                className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex gap-4 items-start"
              >
                <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                  <span className="material-symbols-outlined">event_available</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-body-lg text-primary font-semibold truncate">
                    {a.funcionarios?.nome ?? '—'}
                  </h3>
                  <p className="text-label-sm text-on-surface-variant truncate">
                    {a.procedimentos_t27?.nome_exame ?? '—'}
                  </p>
                  <p className="text-label-sm text-on-surface-variant truncate mt-1">
                    {a.clinicas_credenciadas?.nome_fantasia ?? 'Interno'}
                  </p>
                  <p className="text-label-sm text-outline truncate mt-1">
                    {formatarData(a.data_agendada)}
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-label-sm ${corStatusAgendamento(a.status)}`}
                >
                  {STATUS_AGENDAMENTO_LABEL[a.status]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
