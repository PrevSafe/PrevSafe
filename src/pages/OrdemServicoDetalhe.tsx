import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Botao, AreaTexto } from '@/components/ui/Form';
import Modal from '@/components/ui/Modal';
import {
  STATUS_OS_LABEL,
  STATUS_ETAPA_LABEL,
  STATUS_TAREFA_LABEL,
  PRIORIDADE_OS_LABEL,
  corStatusOS,
  corStatusEtapa,
  corPrioridadeOS,
  formatarDataOS,
  type StatusOS,
  type StatusEtapa,
  type StatusTarefa,
  type PrioridadeOS,
} from '@/lib/ordensServico';

type OrdemServico = {
  id: string;
  numero: string | null;
  titulo: string;
  descricao: string | null;
  status: StatusOS;
  prioridade: PrioridadeOS;
  data_inicio: string | null;
  data_prazo: string | null;
  data_conclusao: string | null;
  progresso: number;
  motivo_bloqueio: string | null;
  modelos_servico: { nome: string; codigo: string } | null;
};

type Etapa = {
  id: string;
  nome: string;
  ordem: number;
  status: StatusEtapa;
  obrigatoria: boolean;
  aguarda_cliente: boolean;
  data_prazo: string | null;
  motivo_bloqueio: string | null;
};

type Tarefa = {
  id: string;
  etapa_id: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  status: StatusTarefa;
  obrigatoria: boolean;
};

/** Modal de bloqueio pendente: OS inteira ou uma etapa específica (motivo é
 *  obrigatório para etapa — o banco rejeita sem ele; para a OS é apenas
 *  boa prática, o banco não exige). */
type BloqueioPendente = { alvo: 'os' } | { alvo: 'etapa'; etapaId: string };

export default function OrdemServicoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { empresaAtiva, can } = useAuth();
  const podeEditar = can('ordens_servico', 'editar');

  const [os, setOs] = useState<OrdemServico | null>(null);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [bloqueioPendente, setBloqueioPendente] = useState<BloqueioPendente | null>(null);
  const [motivoInput, setMotivoInput] = useState('');

  const carregar = useCallback(async () => {
    if (!empresaAtiva || !id) return;
    setErro(null);

    const { data: osData, error: osError } = await daEmpresa(
      supabase.from('ordens_servico').select('*, modelos_servico(nome, codigo)'),
      empresaAtiva.empresa_id
    )
      .eq('id', id)
      .single();

    if (osError) {
      setErro(osError.code === 'PGRST116' ? 'Ordem de serviço não encontrada.' : osError.message);
      setOs(null);
      setCarregando(false);
      return;
    }
    setOs(osData as unknown as OrdemServico);

    const { data: etapasData, error: etapasError } = await supabase
      .from('ordens_servico_etapas')
      .select('id, nome, ordem, status, obrigatoria, aguarda_cliente, data_prazo, motivo_bloqueio')
      .eq('ordem_servico_id', id)
      .order('ordem');

    if (etapasError) {
      setErro(etapasError.message);
      setCarregando(false);
      return;
    }
    const listaEtapas = (etapasData ?? []) as Etapa[];
    setEtapas(listaEtapas);

    const etapaIds = listaEtapas.map((e) => e.id);
    if (etapaIds.length === 0) {
      setTarefas([]);
      setCarregando(false);
      return;
    }

    const { data: tarefasData, error: tarefasError } = await supabase
      .from('ordens_servico_tarefas')
      .select('id, etapa_id, nome, descricao, ordem, status, obrigatoria')
      .in('etapa_id', etapaIds)
      .order('ordem');

    if (tarefasError) setErro(tarefasError.message);
    setTarefas((tarefasData ?? []) as Tarefa[]);
    setCarregando(false);
  }, [empresaAtiva, id]);

  useEffect(() => {
    setCarregando(true);
    carregar();
  }, [carregar]);

  async function mudarStatusOS(novoStatus: StatusOS, motivo?: string) {
    if (!id) return;
    setSalvando(true);
    setErro(null);
    const payload: Record<string, unknown> = { status: novoStatus };
    if (novoStatus === 'bloqueada') payload.motivo_bloqueio = motivo ?? '';
    const { error } = await supabase.from('ordens_servico').update(payload).eq('id', id);
    setSalvando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    await carregar();
  }

  async function mudarStatusEtapa(etapaId: string, novoStatus: StatusEtapa, motivo?: string) {
    setSalvando(true);
    setErro(null);
    const payload: Record<string, unknown> = { status: novoStatus };
    if (novoStatus === 'bloqueada') payload.motivo_bloqueio = motivo ?? '';
    const { error } = await supabase.from('ordens_servico_etapas').update(payload).eq('id', etapaId);
    setSalvando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    await carregar();
  }

  async function mudarStatusTarefa(tarefaId: string, novoStatus: StatusTarefa) {
    setSalvando(true);
    setErro(null);
    const { error } = await supabase.from('ordens_servico_tarefas').update({ status: novoStatus }).eq('id', tarefaId);
    setSalvando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    await carregar();
  }

  function selecionarStatusOS(novoStatus: StatusOS) {
    if (novoStatus === 'bloqueada') {
      setMotivoInput(os?.motivo_bloqueio ?? '');
      setBloqueioPendente({ alvo: 'os' });
      return;
    }
    mudarStatusOS(novoStatus);
  }

  function selecionarStatusEtapa(etapa: Etapa, novoStatus: StatusEtapa) {
    if (novoStatus === 'bloqueada') {
      setMotivoInput(etapa.motivo_bloqueio ?? '');
      setBloqueioPendente({ alvo: 'etapa', etapaId: etapa.id });
      return;
    }
    mudarStatusEtapa(etapa.id, novoStatus);
  }

  function confirmarBloqueio() {
    if (!bloqueioPendente) return;
    if (bloqueioPendente.alvo === 'os') mudarStatusOS('bloqueada', motivoInput);
    else mudarStatusEtapa(bloqueioPendente.etapaId, 'bloqueada', motivoInput);
    setBloqueioPendente(null);
    setMotivoInput('');
  }

  if (carregando) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <span className="material-symbols-outlined animate-spin text-primary text-[32px]">
          progress_activity
        </span>
      </div>
    );
  }

  if (!os) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 text-center px-margin-mobile">
        <span className="material-symbols-outlined text-5xl text-outline-variant">error</span>
        <p className="text-body-md text-on-surface-variant">{erro ?? 'Ordem de serviço não encontrada.'}</p>
        <Link to="/ordens-servico" className="text-label-md text-primary-container hover:underline">
          Voltar para Ordens de Serviço
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-8">
      <header className="sticky top-0 z-20 flex items-center bg-surface-container-lowest px-margin-mobile md:px-md py-4 border-b border-outline-variant gap-2">
        <button
          type="button"
          onClick={() => navigate('/ordens-servico')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1 truncate">{os.numero ?? os.titulo}</h2>
        {podeEditar && (
          <Link
            to={`/ordens-servico/${os.id}/editar`}
            className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
            aria-label="Editar OS"
          >
            <span className="material-symbols-outlined">edit</span>
          </Link>
        )}
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md">
        {erro && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erro}
          </div>
        )}

        <section className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-4 border border-outline-variant/40">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-headline-lg text-primary truncate">{os.titulo}</h1>
              <p className="text-body-md text-on-surface-variant mt-1">
                {os.modelos_servico ? `${os.modelos_servico.nome} (${os.modelos_servico.codigo})` : 'Sem modelo de serviço'}
              </p>
              {os.descricao && <p className="text-body-md text-on-surface-variant mt-2">{os.descricao}</p>}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <select
                value={os.status}
                disabled={!podeEditar || salvando}
                onChange={(e) => selecionarStatusOS(e.target.value as StatusOS)}
                className={`px-3 py-1.5 rounded-full text-label-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary-container disabled:opacity-70 ${corStatusOS(os.status)}`}
              >
                {(Object.keys(STATUS_OS_LABEL) as StatusOS[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_OS_LABEL[s]}
                  </option>
                ))}
              </select>
              <span className={`px-2.5 py-1 rounded-full text-label-sm ${corPrioridadeOS(os.prioridade)}`}>
                Prioridade {PRIORIDADE_OS_LABEL[os.prioridade]}
              </span>
            </div>
          </div>

          {os.status === 'bloqueada' && os.motivo_bloqueio && (
            <div className="flex items-start gap-2 bg-error-container/60 text-on-error-container px-3 py-2 rounded-lg text-label-sm">
              <span className="material-symbols-outlined text-[16px] mt-px">block</span>
              <span>{os.motivo_bloqueio}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 rounded-full bg-surface-container-high overflow-hidden">
              <div className="h-full bg-primary-container transition-all" style={{ width: `${os.progresso}%` }} />
            </div>
            <span className="text-label-md text-on-surface-variant shrink-0">{os.progresso}%</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-label-sm">
            <div>
              <p className="text-outline">Início</p>
              <p className="text-on-surface">{formatarDataOS(os.data_inicio)}</p>
            </div>
            <div>
              <p className="text-outline">Prazo</p>
              <p className="text-on-surface">{formatarDataOS(os.data_prazo)}</p>
            </div>
            <div>
              <p className="text-outline">Conclusão</p>
              <p className="text-on-surface">{os.data_conclusao ? formatarDataOS(os.data_conclusao.slice(0, 10)) : '—'}</p>
            </div>
            <div>
              <p className="text-outline">Etapas</p>
              <p className="text-on-surface">{etapas.length}</p>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-title-lg text-primary-container px-1">Etapas e Tarefas</h2>

          {etapas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/40">
              <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">list_alt</span>
              <p className="text-body-md text-on-surface-variant">
                Nenhuma etapa neste workflow — a OS não tem um modelo de serviço associado.
              </p>
            </div>
          ) : (
            etapas.map((etapa) => {
              const tarefasDaEtapa = tarefas.filter((t) => t.etapa_id === etapa.id);
              return (
                <div
                  key={etapa.id}
                  className="bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-label-sm text-outline shrink-0">{etapa.ordem}.</span>
                      <div className="min-w-0">
                        <p className="text-body-lg text-on-surface truncate">
                          {etapa.nome}
                          {etapa.obrigatoria && <span className="text-error"> *</span>}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {etapa.aguarda_cliente && (
                            <span className="px-2 py-0.5 rounded-full text-label-sm bg-primary-container/15 text-primary-container">
                              Aguarda cliente
                            </span>
                          )}
                          {etapa.data_prazo && (
                            <span className="text-label-sm text-outline">Prazo: {formatarDataOS(etapa.data_prazo)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <select
                      value={etapa.status}
                      disabled={!podeEditar || salvando}
                      onChange={(e) => selecionarStatusEtapa(etapa, e.target.value as StatusEtapa)}
                      className={`px-2.5 py-1 rounded-full text-label-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary-container disabled:opacity-70 shrink-0 ${corStatusEtapa(etapa.status)}`}
                    >
                      {(Object.keys(STATUS_ETAPA_LABEL) as StatusEtapa[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_ETAPA_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {etapa.status === 'bloqueada' && etapa.motivo_bloqueio && (
                    <div className="flex items-start gap-2 bg-error-container/60 text-on-error-container px-3 py-2 rounded-lg text-label-sm ml-6">
                      <span className="material-symbols-outlined text-[16px] mt-px">block</span>
                      <span>{etapa.motivo_bloqueio}</span>
                    </div>
                  )}

                  {tarefasDaEtapa.length > 0 && (
                    <ul className="flex flex-col gap-1.5 ml-6 border-l border-outline-variant/40 pl-4">
                      {tarefasDaEtapa.map((tarefa) => (
                        <li key={tarefa.id} className="flex items-center justify-between gap-3 py-1">
                          <span className="text-body-md text-on-surface-variant truncate min-w-0">
                            {tarefa.nome}
                            {tarefa.obrigatoria && <span className="text-error"> *</span>}
                          </span>
                          <select
                            value={tarefa.status}
                            disabled={!podeEditar || salvando}
                            onChange={(e) => mudarStatusTarefa(tarefa.id, e.target.value as StatusTarefa)}
                            className={`px-2 py-0.5 rounded-full text-label-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary-container disabled:opacity-70 shrink-0 ${corStatusEtapa(tarefa.status)}`}
                          >
                            {(Object.keys(STATUS_TAREFA_LABEL) as StatusTarefa[]).map((s) => (
                              <option key={s} value={s}>
                                {STATUS_TAREFA_LABEL[s]}
                              </option>
                            ))}
                          </select>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })
          )}

          {etapas.length > 0 && (
            <p className="text-label-sm text-outline italic px-1">* Obrigatória para concluir a etapa/entregar a OS.</p>
          )}
        </section>
      </div>

      <Modal
        aberto={bloqueioPendente !== null}
        titulo="Motivo do bloqueio"
        onFechar={() => setBloqueioPendente(null)}
        rodape={
          <>
            <Botao type="button" variante="secundario" className="flex-1" onClick={() => setBloqueioPendente(null)}>
              Cancelar
            </Botao>
            <Botao
              type="button"
              variante="perigo"
              className="flex-1"
              disabled={bloqueioPendente?.alvo === 'etapa' && !motivoInput.trim()}
              onClick={confirmarBloqueio}
            >
              Confirmar bloqueio
            </Botao>
          </>
        }
      >
        <AreaTexto
          rotulo={
            bloqueioPendente?.alvo === 'etapa'
              ? 'Descreva por que esta etapa está bloqueada (obrigatório)'
              : 'Descreva por que esta OS está bloqueada (opcional)'
          }
          name="motivo_bloqueio"
          value={motivoInput}
          onChange={(e) => setMotivoInput(e.target.value)}
          autoFocus
        />
      </Modal>
    </div>
  );
}
