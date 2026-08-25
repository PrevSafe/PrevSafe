import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import {
  STATUS_CALIBRACAO_LABEL,
  TIPO_EQUIPAMENTO_ICONE,
  TIPO_EQUIPAMENTO_LABEL,
  corStatusCalibracao,
  statusCalibracao,
  type StatusCalibracao,
  type TipoEquipamentoMedicao,
} from '@/lib/equipamentosMedicao';

type Equipamento = {
  id: string;
  tipo: TipoEquipamentoMedicao;
  identificacao: string;
  numero_serie: string | null;
  fabricante: string | null;
  data_validade_calibracao: string | null;
  ativo: boolean;
};

export default function EquipamentosMedicao() {
  const { empresaAtiva, can } = useAuth();
  const podeCriar = can('equipamentos_medicao', 'criar');

  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | TipoEquipamentoMedicao>('todos');
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
        .from('equipamentos_medicao')
        .select('id, tipo, identificacao, numero_serie, fabricante, data_validade_calibracao, ativo'),
      empresaAtiva.empresa_id
    )
      .order('identificacao')
      .then(({ data, error }) => {
        if (error) setErro(error.message);
        else setEquipamentos((data ?? []) as Equipamento[]);
        setCarregando(false);
      });
  }, [empresaAtiva]);

  const termo = busca.trim().toLowerCase();

  const filtrados = equipamentos.filter((e) => {
    if (statusFiltro === 'ativos' && !e.ativo) return false;
    if (tipoFiltro !== 'todos' && e.tipo !== tipoFiltro) return false;
    if (!termo) return true;
    return (
      e.identificacao.toLowerCase().includes(termo) ||
      (e.numero_serie ?? '').toLowerCase().includes(termo) ||
      (e.fabricante ?? '').toLowerCase().includes(termo)
    );
  });

  const filtroAtivo = Boolean(termo) || tipoFiltro !== 'todos' || statusFiltro !== 'ativos';

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">Equipamentos de Medição</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Decibelímetros, dosímetros, termômetros e luxímetros usados nas medições de campo do
            PGR/LTCAT, com controle de calibração
          </p>
        </div>
        {podeCriar && (
          <Link
            to="/equipamentos-medicao/novo"
            className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Novo Equipamento
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
              placeholder="Buscar por identificação, nº de série ou fabricante"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full h-12 rounded-lg border border-outline-variant bg-surface-container-lowest pl-11 pr-4 text-body-md placeholder:text-outline focus:outline-none focus:border-2 focus:border-primary-container"
            />
          </div>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as 'todos' | TipoEquipamentoMedicao)}
            className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container sm:w-52"
          >
            <option value="todos">Todos os tipos</option>
            <option value="decibelimetro">{TIPO_EQUIPAMENTO_LABEL.decibelimetro}</option>
            <option value="dosimetro">{TIPO_EQUIPAMENTO_LABEL.dosimetro}</option>
            <option value="termometro">{TIPO_EQUIPAMENTO_LABEL.termometro}</option>
            <option value="luximetro">{TIPO_EQUIPAMENTO_LABEL.luximetro}</option>
            <option value="outro">{TIPO_EQUIPAMENTO_LABEL.outro}</option>
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
              sensors
            </span>
            <p className="text-body-md text-on-surface-variant mb-4">
              {filtroAtivo
                ? 'Nenhum equipamento encontrado para este filtro.'
                : 'Nenhum equipamento de medição cadastrado ainda.'}
            </p>
            {!filtroAtivo && podeCriar && (
              <Link
                to="/equipamentos-medicao/novo"
                className="text-label-md text-primary-container hover:underline"
              >
                Cadastrar o primeiro equipamento
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtrados.map((e) => {
              const calibracao: StatusCalibracao = statusCalibracao(e.data_validade_calibracao);
              const mostrarAlertaCalibracao = calibracao === 'vencida' || calibracao === 'vencendo';
              return (
                <button
                  key={e.id}
                  onClick={() => navigate(`/equipamentos-medicao/${e.id}`)}
                  className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex gap-4 items-start"
                >
                  <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                    <span className="material-symbols-outlined">{TIPO_EQUIPAMENTO_ICONE[e.tipo]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body-lg text-primary font-semibold truncate">
                      {e.identificacao}
                    </h3>
                    <p className="text-label-sm text-on-surface-variant truncate">
                      {TIPO_EQUIPAMENTO_LABEL[e.tipo]}
                      {e.fabricante ? ` · ${e.fabricante}` : ''}
                    </p>
                    {e.numero_serie && (
                      <p className="text-label-sm text-outline truncate mt-1">
                        Nº de série: {e.numero_serie}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-full text-label-sm ${
                        e.ativo
                          ? 'bg-secondary-container/40 text-on-secondary-container'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {e.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    {mostrarAlertaCalibracao && (
                      <span
                        className={`px-2.5 py-1 rounded-full text-label-sm ${corStatusCalibracao(calibracao)}`}
                      >
                        {STATUS_CALIBRACAO_LABEL[calibracao]}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
