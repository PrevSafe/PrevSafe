import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { STATUS_INSPECAO_LABEL, corStatusInspecao, formatarData, type StatusInspecao } from '@/lib/inspecoes';

type Inspecao = {
  id: string;
  unidade_id: string;
  setor_id: string | null;
  titulo: string;
  data_inspecao: string;
  responsavel_nome: string;
  status: string;
};

type Unidade = { id: string; razao_social: string; nome_fantasia: string | null };
type Setor = { id: string; nome: string };
type ItemResumo = { inspecao_id: string; conforme: boolean };

export default function Inspecoes() {
  const { empresaAtiva } = useAuth();
  const navigate = useNavigate();

  const [inspecoes, setInspecoes] = useState<Inspecao[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [itens, setItens] = useState<ItemResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | StatusInspecao>('todos');

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    setCarregando(true);
    const empresaId = empresaAtiva.empresa_id;
    Promise.all([
      daEmpresa(
        supabase
          .from('inspecoes_checklist')
          .select('id, unidade_id, setor_id, titulo, data_inspecao, responsavel_nome, status'),
        empresaId
      ).order('data_inspecao', { ascending: false }),
      daEmpresa(supabase.from('unidades').select('id, razao_social, nome_fantasia'), empresaId),
      daEmpresa(supabase.from('setores').select('id, nome'), empresaId),
    ]).then(async ([ri, ru, rs]) => {
      if (!ativo) return;
      const erroBase = ri.error ?? ru.error ?? rs.error;
      if (erroBase) {
        setErro(erroBase.message);
        setCarregando(false);
        return;
      }
      const listaInspecoes = (ri.data ?? []) as Inspecao[];
      setInspecoes(listaInspecoes);
      setUnidades((ru.data ?? []) as Unidade[]);
      setSetores((rs.data ?? []) as Setor[]);

      const ids = listaInspecoes.map((i) => i.id);
      if (ids.length > 0) {
        const { data: itensData, error: itensErro } = await supabase
          .from('inspecao_itens')
          .select('inspecao_id, conforme')
          .in('inspecao_id', ids);
        if (ativo && !itensErro) setItens((itensData ?? []) as ItemResumo[]);
      }
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [empresaAtiva]);

  const unidadesPorId = useMemo(() => new Map(unidades.map((u) => [u.id, u])), [unidades]);
  const setoresPorId = useMemo(() => new Map(setores.map((s) => [s.id, s])), [setores]);

  const naoConformidadesPorInspecao = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const item of itens) {
      if (!item.conforme) mapa.set(item.inspecao_id, (mapa.get(item.inspecao_id) ?? 0) + 1);
    }
    return mapa;
  }, [itens]);

  const termo = busca.trim().toLowerCase();

  const filtradas = inspecoes.filter((i) => {
    if (statusFiltro !== 'todos' && i.status !== statusFiltro) return false;
    if (!termo) return true;
    const unidade = unidadesPorId.get(i.unidade_id);
    const nomeUnidade = unidade ? unidade.nome_fantasia || unidade.razao_social : '';
    return (
      i.titulo.toLowerCase().includes(termo) ||
      i.responsavel_nome.toLowerCase().includes(termo) ||
      nomeUnidade.toLowerCase().includes(termo)
    );
  });

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">Histórico de Relatórios</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Inspeções de segurança realizadas nas unidades
          </p>
        </div>
        <Link
          to="/inspecoes/nova"
          className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add_task</span>
          Nova inspeção
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
              placeholder="Buscar por título, unidade ou responsável"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full h-12 rounded-lg border border-outline-variant bg-surface-container-lowest pl-11 pr-4 text-body-md placeholder:text-outline focus:outline-none focus:border-2 focus:border-primary-container"
            />
          </div>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as 'todos' | StatusInspecao)}
            className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container sm:w-56"
          >
            <option value="todos">Todos os status</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluida">Concluídas</option>
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
              fact_check
            </span>
            <p className="text-body-md text-on-surface-variant mb-4">
              {termo || statusFiltro !== 'todos'
                ? 'Nenhuma inspeção encontrada para este filtro.'
                : 'Nenhuma inspeção registrada ainda.'}
            </p>
            {!termo && statusFiltro === 'todos' && (
              <Link to="/inspecoes/nova" className="text-label-md text-primary-container hover:underline">
                Registrar a primeira inspeção
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtradas.map((i) => {
              const unidade = unidadesPorId.get(i.unidade_id);
              const setor = i.setor_id ? setoresPorId.get(i.setor_id) : null;
              const naoConformidades = naoConformidadesPorInspecao.get(i.id) ?? 0;
              return (
                <button
                  key={i.id}
                  onClick={() => navigate(`/inspecoes/${i.id}`)}
                  className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex gap-4 items-start"
                >
                  <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                    <span className="material-symbols-outlined">fact_check</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body-lg text-primary font-semibold truncate">{i.titulo}</h3>
                    <p className="text-label-sm text-on-surface-variant truncate">
                      {unidade ? unidade.nome_fantasia || unidade.razao_social : '—'}
                      {setor ? ` · ${setor.nome}` : ''}
                    </p>
                    <p className="text-label-sm text-outline truncate mt-1">
                      {formatarData(i.data_inspecao)} · Responsável: {i.responsavel_nome}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-full text-label-sm ${corStatusInspecao(i.status)}`}
                    >
                      {STATUS_INSPECAO_LABEL[i.status as StatusInspecao] ?? i.status}
                    </span>
                    {naoConformidades > 0 && (
                      <span className="px-2.5 py-1 rounded-full text-label-sm bg-error-container text-on-error-container">
                        {naoConformidades} não conformidade{naoConformidades > 1 ? 's' : ''}
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
