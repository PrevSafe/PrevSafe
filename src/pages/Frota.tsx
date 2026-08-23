import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import {
  STATUS_LABEL,
  STATUS_MANUTENCAO_LABEL,
  TIPO_LABEL,
  corStatus,
  corStatusManutencao,
  formatarData,
  statusManutencao,
  type StatusFrota,
  type StatusManutencao,
  type TipoFrota,
} from '@/lib/frota';

type Item = {
  id: string;
  unidade_id: string;
  tipo: TipoFrota;
  identificacao: string;
  descricao: string;
  status: StatusFrota;
  data_ultima_manutencao: string | null;
  data_proxima_manutencao: string | null;
};

type Unidade = { id: string; razao_social: string; nome_fantasia: string | null };

export default function Frota() {
  const { empresaAtiva } = useAuth();
  const navigate = useNavigate();

  const [itens, setItens] = useState<Item[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | TipoFrota>('todos');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | StatusFrota>('todos');
  const [manutencaoFiltro, setManutencaoFiltro] = useState<'todos' | StatusManutencao>('todos');

  useEffect(() => {
    function semEmpresa() {
      setCarregando(false);
    }
    if (!empresaAtiva) {
      semEmpresa();
      return;
    }
    let ativo = true;
    function iniciarCarregamento() {
      setCarregando(true);
    }
    iniciarCarregamento();
    const empresaId = empresaAtiva.empresa_id;
    Promise.all([
      daEmpresa(
        supabase
          .from('frota')
          .select(
            'id, unidade_id, tipo, identificacao, descricao, status, data_ultima_manutencao, data_proxima_manutencao'
          ),
        empresaId
      ).order('identificacao'),
      daEmpresa(supabase.from('unidades').select('id, razao_social, nome_fantasia'), empresaId),
    ]).then(([ri, ru]) => {
      if (!ativo) return;
      const erroCombinado = ri.error ?? ru.error;
      if (erroCombinado) {
        setErro(erroCombinado.message);
      } else {
        setItens(ri.data as Item[]);
        setUnidades(ru.data as Unidade[]);
      }
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [empresaAtiva]);

  const unidadesPorId = useMemo(() => new Map(unidades.map((u) => [u.id, u])), [unidades]);

  const termo = busca.trim().toLowerCase();

  const filtrados = itens.filter((i) => {
    if (tipoFiltro !== 'todos' && i.tipo !== tipoFiltro) return false;
    if (statusFiltro !== 'todos' && i.status !== statusFiltro) return false;
    const manutencao = statusManutencao(i.data_proxima_manutencao);
    if (manutencaoFiltro !== 'todos' && manutencao !== manutencaoFiltro) return false;
    if (!termo) return true;
    return (
      i.identificacao.toLowerCase().includes(termo) || i.descricao.toLowerCase().includes(termo)
    );
  });

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">Frota e Maquinário</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Veículos e máquinas/equipamentos sujeitos a controle de manutenção (NR-12 e correlatas)
          </p>
        </div>
        <Link
          to="/frota/novo"
          className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Novo item
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
              placeholder="Buscar por placa, patrimônio ou descrição"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full h-12 rounded-lg border border-outline-variant bg-surface-container-lowest pl-11 pr-4 text-body-md placeholder:text-outline focus:outline-none focus:border-2 focus:border-primary-container"
            />
          </div>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as 'todos' | TipoFrota)}
            className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container sm:w-48"
          >
            <option value="todos">Todos os tipos</option>
            <option value="veiculo">{TIPO_LABEL.veiculo}</option>
            <option value="maquina">{TIPO_LABEL.maquina}</option>
          </select>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as 'todos' | StatusFrota)}
            className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container sm:w-44"
          >
            <option value="todos">Todos os status</option>
            <option value="ativo">{STATUS_LABEL.ativo}</option>
            <option value="manutencao">{STATUS_LABEL.manutencao}</option>
            <option value="inativo">{STATUS_LABEL.inativo}</option>
          </select>
          <select
            value={manutencaoFiltro}
            onChange={(e) => setManutencaoFiltro(e.target.value as 'todos' | StatusManutencao)}
            className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container sm:w-56"
          >
            <option value="todos">Toda manutenção</option>
            <option value="em_dia">{STATUS_MANUTENCAO_LABEL.em_dia}</option>
            <option value="vencendo">{STATUS_MANUTENCAO_LABEL.vencendo}</option>
            <option value="vencida">{STATUS_MANUTENCAO_LABEL.vencida}</option>
            <option value="sem_data">{STATUS_MANUTENCAO_LABEL.sem_data}</option>
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
              agriculture
            </span>
            <p className="text-body-md text-on-surface-variant mb-4">
              {termo || tipoFiltro !== 'todos' || statusFiltro !== 'todos' || manutencaoFiltro !== 'todos'
                ? 'Nenhum item encontrado para este filtro.'
                : 'Nenhum veículo ou máquina cadastrado ainda.'}
            </p>
            {!termo && tipoFiltro === 'todos' && statusFiltro === 'todos' && manutencaoFiltro === 'todos' && (
              <Link to="/frota/novo" className="text-label-md text-primary-container hover:underline">
                Cadastrar o primeiro item da frota
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtrados.map((i) => {
              const unidade = unidadesPorId.get(i.unidade_id);
              const nomeUnidade = unidade ? unidade.nome_fantasia || unidade.razao_social : '—';
              const manutencao = statusManutencao(i.data_proxima_manutencao);
              return (
                <button
                  key={i.id}
                  onClick={() => navigate(`/frota/${i.id}`)}
                  className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex gap-4 items-start"
                >
                  <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                    <span className="material-symbols-outlined">
                      {i.tipo === 'veiculo' ? 'local_shipping' : 'agriculture'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body-lg text-primary font-semibold truncate">{i.identificacao}</h3>
                    <p className="text-label-sm text-on-surface-variant truncate">
                      {TIPO_LABEL[i.tipo]} · {i.descricao}
                    </p>
                    <p className="text-label-sm text-on-surface-variant truncate mt-1">{nomeUnidade}</p>
                    <p className="text-label-sm text-outline truncate mt-1">
                      Próx. manutenção: {formatarData(i.data_proxima_manutencao)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-label-sm ${corStatus(i.status)}`}>
                      {STATUS_LABEL[i.status]}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-label-sm ${corStatusManutencao(manutencao)}`}
                    >
                      {STATUS_MANUTENCAO_LABEL[manutencao]}
                    </span>
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
