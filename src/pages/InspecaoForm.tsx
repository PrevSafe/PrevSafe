import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Secao, Campo, Seletor, AreaTexto, Botao } from '@/components/ui/Form';
import { STATUS_INSPECAO_LABEL, STATUS_PLANO_ACAO_EFETIVO_LABEL, corStatusPlanoAcao, statusEfetivoPlanoAcao, type StatusInspecao } from '@/lib/inspecoes';

type Unidade = { id: string; razao_social: string; nome_fantasia: string | null };
type Setor = { id: string; nome: string };

type ItemForm = {
  id?: string;
  descricao: string;
  conforme: boolean;
  observacao: string;
};

type PlanoVinculado = { id: string; inspecao_item_id: string; status: string; quando: string | null };

type FormState = {
  unidade_id: string;
  setor_id: string;
  titulo: string;
  data_inspecao: string;
  responsavel_nome: string;
  status: StatusInspecao;
  observacoes: string;
};

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

const VAZIO: FormState = {
  unidade_id: '',
  setor_id: '',
  titulo: '',
  data_inspecao: '',
  responsavel_nome: '',
  status: 'em_andamento',
  observacoes: '',
};

const ITEM_VAZIO: ItemForm = { descricao: '', conforme: true, observacao: '' };

export default function InspecaoForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { empresaAtiva } = useAuth();

  const [form, setForm] = useState<FormState>(() => ({ ...VAZIO, data_inspecao: hoje() }));
  const [erros, setErros] = useState<Partial<Record<keyof FormState, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [itens, setItens] = useState<ItemForm[]>([]);
  const [itensRemovidos, setItensRemovidos] = useState<string[]>([]);
  const [erroItens, setErroItens] = useState<string | null>(null);
  const [planosVinculados, setPlanosVinculados] = useState<PlanoVinculado[]>([]);

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    const empresaId = empresaAtiva.empresa_id;

    async function carregar() {
      const [ru, rs] = await Promise.all([
        daEmpresa(supabase.from('unidades').select('id, razao_social, nome_fantasia'), empresaId)
          .eq('ativo', true)
          .order('razao_social'),
        daEmpresa(supabase.from('setores').select('id, nome'), empresaId).eq('ativo', true).order('nome'),
      ]);
      if (!ativo) return;

      const erroBase = ru.error ?? rs.error;
      if (erroBase) {
        setErroGeral(erroBase.message);
        setCarregando(false);
        return;
      }
      setUnidades((ru.data ?? []) as Unidade[]);
      setSetores((rs.data ?? []) as Setor[]);

      if (id) {
        const { data, error } = await daEmpresa(supabase.from('inspecoes_checklist').select('*'), empresaId)
          .eq('id', id)
          .single();
        if (!ativo) return;
        if (error) {
          setErroGeral(error.message);
          setCarregando(false);
          return;
        }
        setForm({
          unidade_id: data.unidade_id,
          setor_id: data.setor_id ?? '',
          titulo: data.titulo ?? '',
          data_inspecao: data.data_inspecao ?? hoje(),
          responsavel_nome: data.responsavel_nome ?? '',
          status: (data.status as StatusInspecao) ?? 'em_andamento',
          observacoes: data.observacoes ?? '',
        });

        const { data: itensData, error: itensError } = await supabase
          .from('inspecao_itens')
          .select('id, descricao, conforme, observacao')
          .eq('inspecao_id', id)
          .order('ordem');
        if (!ativo) return;
        if (itensError) {
          setErroItens(itensError.message);
        } else {
          setItens(
            (itensData ?? []).map((it) => ({
              id: it.id,
              descricao: it.descricao,
              conforme: it.conforme,
              observacao: it.observacao ?? '',
            }))
          );

          const idsItens = (itensData ?? []).map((it) => it.id);
          if (idsItens.length > 0) {
            const { data: planosData } = await supabase
              .from('planos_acao_5w2h')
              .select('id, inspecao_item_id, status, quando')
              .in('inspecao_item_id', idsItens);
            if (ativo) setPlanosVinculados((planosData ?? []) as PlanoVinculado[]);
          }
        }
      }

      setCarregando(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [id, empresaAtiva]);

  const planosPorItemId = useMemo(() => {
    const mapa = new Map<string, PlanoVinculado[]>();
    for (const p of planosVinculados) {
      const lista = mapa.get(p.inspecao_item_id) ?? [];
      lista.push(p);
      mapa.set(p.inspecao_item_id, lista);
    }
    return mapa;
  }, [planosVinculados]);

  function set<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  function adicionarItem() {
    setItens((lista) => [...lista, { ...ITEM_VAZIO }]);
    setErroItens(null);
  }

  function mudarItem(indice: number, alteracoes: Partial<ItemForm>) {
    setItens((lista) => lista.map((it, i) => (i === indice ? { ...it, ...alteracoes } : it)));
  }

  function removerItem(indice: number) {
    setItens((lista) => {
      const item = lista[indice];
      if (item.id) setItensRemovidos((r) => [...r, item.id!]);
      return lista.filter((_, i) => i !== indice);
    });
  }

  function validar() {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.unidade_id) e.unidade_id = 'Selecione a unidade.';
    if (!form.titulo.trim()) e.titulo = 'Informe o título da inspeção.';
    if (!form.data_inspecao) e.data_inspecao = 'Informe a data da inspeção.';
    if (!form.responsavel_nome.trim()) e.responsavel_nome = 'Informe o responsável pela inspeção.';
    setErros(e);

    const itensSemDescricao = itens.some((it) => !it.descricao.trim());
    if (itensSemDescricao) {
      setErroItens('Preencha a descrição de todos os itens do checklist, ou remova os que estiverem vazios.');
    } else {
      setErroItens(null);
    }

    return Object.keys(e).length === 0 && !itensSemDescricao;
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setErroGeral(null);
    if (!validar() || !empresaAtiva) return;
    setSalvando(true);

    const payload = {
      empresa_id: empresaAtiva.empresa_id,
      unidade_id: form.unidade_id,
      setor_id: form.setor_id || null,
      titulo: form.titulo.trim(),
      data_inspecao: form.data_inspecao,
      responsavel_nome: form.responsavel_nome.trim(),
      status: form.status,
      observacoes: form.observacoes.trim() || null,
    };

    let inspecaoId = id;

    if (editando) {
      const { error } = await supabase.from('inspecoes_checklist').update(payload).eq('id', id!);
      if (error) {
        setSalvando(false);
        setErroGeral(error.message);
        return;
      }
    } else {
      const { data, error } = await supabase.from('inspecoes_checklist').insert(payload).select('id').single();
      if (error || !data) {
        setSalvando(false);
        setErroGeral(error?.message ?? 'Não foi possível criar a inspeção.');
        return;
      }
      inspecaoId = data.id;
    }

    if (itensRemovidos.length > 0) {
      const { error } = await supabase.from('inspecao_itens').delete().in('id', itensRemovidos);
      if (error) {
        setSalvando(false);
        setErroGeral(error.message);
        return;
      }
    }

    const novos = itens
      .map((it, indice) => ({ ...it, ordem: indice }))
      .filter((it) => !it.id)
      .map((it) => ({
        inspecao_id: inspecaoId,
        descricao: it.descricao.trim(),
        conforme: it.conforme,
        observacao: it.observacao.trim() || null,
        ordem: it.ordem,
      }));
    if (novos.length > 0) {
      const { error } = await supabase.from('inspecao_itens').insert(novos);
      if (error) {
        setSalvando(false);
        setErroGeral(error.message);
        return;
      }
    }

    const existentes = itens
      .map((it, indice) => ({ ...it, ordem: indice }))
      .filter((it) => it.id);
    for (const it of existentes) {
      const { error } = await supabase
        .from('inspecao_itens')
        .update({
          descricao: it.descricao.trim(),
          conforme: it.conforme,
          observacao: it.observacao.trim() || null,
          ordem: it.ordem,
        })
        .eq('id', it.id!);
      if (error) {
        setSalvando(false);
        setErroGeral(error.message);
        return;
      }
    }

    setSalvando(false);
    navigate('/inspecoes', { replace: true });
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

  return (
    <form onSubmit={salvar} className="flex-1 flex flex-col">
      <header className="sticky top-0 md:top-0 z-20 flex items-center bg-surface-container-lowest px-margin-mobile md:px-md py-4 border-b border-outline-variant gap-2">
        <button
          type="button"
          onClick={() => navigate('/inspecoes')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar inspeção' : 'Nova inspeção'}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erroGeral}
          </div>
        )}

        {unidades.length === 0 ? (
          <div className="flex items-start gap-2 bg-[#F97316]/10 text-[#9a3412] px-3 py-2 rounded-lg text-label-sm">
            <span className="material-symbols-outlined text-[16px] mt-px">warning</span>
            <span>Nenhuma unidade ativa cadastrada ainda. Cadastre uma unidade antes de registrar uma inspeção.</span>
          </div>
        ) : (
          <>
            <Secao icone="fact_check" titulo="Dados da inspeção">
              <Campo
                rotulo="Título"
                name="titulo"
                placeholder="Ex.: Inspeção mensal de segurança — Almoxarifado"
                value={form.titulo}
                onChange={(e) => set('titulo', e.target.value)}
                erro={erros.titulo}
                autoFocus
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Seletor
                  rotulo="Unidade"
                  name="unidade_id"
                  value={form.unidade_id}
                  onChange={(e) => set('unidade_id', e.target.value)}
                  erro={erros.unidade_id}
                >
                  <option value="">Selecione a unidade</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome_fantasia || u.razao_social}
                    </option>
                  ))}
                </Seletor>
                <Seletor
                  rotulo="Setor (opcional)"
                  name="setor_id"
                  value={form.setor_id}
                  onChange={(e) => set('setor_id', e.target.value)}
                >
                  <option value="">Não especificado</option>
                  {setores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </Seletor>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Campo
                  rotulo="Data da inspeção"
                  name="data_inspecao"
                  type="date"
                  value={form.data_inspecao}
                  onChange={(e) => set('data_inspecao', e.target.value)}
                  erro={erros.data_inspecao}
                />
                <Campo
                  rotulo="Responsável pela inspeção"
                  name="responsavel_nome"
                  placeholder="Nome de quem aplicou o checklist"
                  value={form.responsavel_nome}
                  onChange={(e) => set('responsavel_nome', e.target.value)}
                  erro={erros.responsavel_nome}
                />
              </div>

              <Seletor
                rotulo="Status"
                name="status"
                value={form.status}
                onChange={(e) => set('status', e.target.value as StatusInspecao)}
              >
                {(Object.keys(STATUS_INSPECAO_LABEL) as StatusInspecao[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_INSPECAO_LABEL[s]}
                  </option>
                ))}
              </Seletor>

              <AreaTexto
                rotulo="Observações gerais (opcional)"
                name="observacoes"
                placeholder="Contexto geral da inspeção, condições observadas, etc."
                value={form.observacoes}
                onChange={(e) => set('observacoes', e.target.value)}
              />
            </Secao>

            <section className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-4 border border-outline-variant/40">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container text-[20px]">checklist</span>
                  <h3 className="text-title-lg text-primary-container">Itens do checklist</h3>
                </div>
                <Botao type="button" variante="secundario" icone="add" onClick={adicionarItem}>
                  Adicionar item
                </Botao>
              </div>

              {erroItens && <p className="text-label-sm text-error">{erroItens}</p>}

              {itens.length === 0 ? (
                <p className="text-body-md text-on-surface-variant">
                  Nenhum item adicionado. Use "Adicionar item" para montar o checklist desta inspeção.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {itens.map((item, indice) => {
                    const planos = item.id ? planosPorItemId.get(item.id) ?? [] : [];
                    return (
                      <div
                        key={item.id ?? `novo-${indice}`}
                        className="rounded-lg border border-outline-variant/60 p-4 flex flex-col gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <Campo
                              rotulo={`Item ${indice + 1}`}
                              name={`item_${indice}_descricao`}
                              placeholder="Ex.: Extintores sinalizados e dentro da validade"
                              value={item.descricao}
                              onChange={(e) => mudarItem(indice, { descricao: e.target.value })}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removerItem(indice)}
                            className="mt-7 text-error flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-error-container/40"
                            aria-label="Remover item"
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-label-md text-on-surface cursor-pointer">
                            <input
                              type="radio"
                              name={`item_${indice}_conforme`}
                              checked={item.conforme}
                              onChange={() => mudarItem(indice, { conforme: true })}
                            />
                            Conforme
                          </label>
                          <label className="flex items-center gap-2 text-label-md text-on-surface cursor-pointer">
                            <input
                              type="radio"
                              name={`item_${indice}_conforme`}
                              checked={!item.conforme}
                              onChange={() => mudarItem(indice, { conforme: false })}
                            />
                            Não conforme
                          </label>
                        </div>

                        <AreaTexto
                          rotulo="Observação (opcional)"
                          name={`item_${indice}_observacao`}
                          value={item.observacao}
                          onChange={(e) => mudarItem(indice, { observacao: e.target.value })}
                        />

                        {!item.conforme && item.id && (
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-outline-variant/40">
                            {planos.length === 0 ? (
                              <Link
                                to={`/planos-acao/novo?inspecao_item_id=${item.id}`}
                                className="text-label-sm text-primary-container hover:underline flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                Criar plano de ação (5W2H)
                              </Link>
                            ) : (
                              planos.map((p) => {
                                const efetivo = statusEfetivoPlanoAcao(p.status, p.quando);
                                return (
                                  <Link
                                    key={p.id}
                                    to={`/planos-acao/${p.id}`}
                                    className={`px-2.5 py-1 rounded-full text-label-sm hover:opacity-80 ${corStatusPlanoAcao(efetivo)}`}
                                  >
                                    Plano de ação: {STATUS_PLANO_ACAO_EFETIVO_LABEL[efetivo]}
                                  </Link>
                                );
                              })
                            )}
                          </div>
                        )}
                        {!item.conforme && !item.id && (
                          <p className="text-label-sm text-outline italic">
                            Salve a inspeção para poder gerar um plano de ação a partir deste item.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <footer className="flex gap-3 px-margin-mobile md:px-md py-4 mt-2 max-w-3xl w-full border-t border-outline-variant">
        <Botao type="button" variante="secundario" className="flex-1" onClick={() => navigate('/inspecoes')}>
          Cancelar
        </Botao>
        <Botao
          type="submit"
          icone="save"
          carregando={salvando}
          disabled={unidades.length === 0}
          className="flex-1"
        >
          {salvando ? 'Salvando...' : 'Salvar inspeção'}
        </Botao>
      </footer>
    </form>
  );
}
