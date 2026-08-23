import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Secao, Campo, Seletor, AreaTexto, Botao } from '@/components/ui/Form';
import { STATUS_PLANO_ACAO_LABEL, type StatusPlanoAcao } from '@/lib/inspecoes';

type Unidade = { id: string; razao_social: string; nome_fantasia: string | null };

type OrigemInspecao = { inspecao_id: string; inspecao_titulo: string; item_descricao: string };

type FormState = {
  unidade_id: string;
  o_que: string;
  por_que: string;
  onde: string;
  quando: string;
  quem: string;
  como: string;
  quanto_custa: string;
  status: StatusPlanoAcao;
};

const VAZIO: FormState = {
  unidade_id: '',
  o_que: '',
  por_que: '',
  onde: '',
  quando: '',
  quem: '',
  como: '',
  quanto_custa: '',
  status: 'pendente',
};

export default function PlanoAcaoForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const inspecaoItemIdParam = searchParams.get('inspecao_item_id');
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { empresaAtiva } = useAuth();

  const [form, setForm] = useState<FormState>({ ...VAZIO });
  const [erros, setErros] = useState<Partial<Record<keyof FormState, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [inspecaoItemId, setInspecaoItemId] = useState<string | null>(null);
  const [origem, setOrigem] = useState<OrigemInspecao | null>(null);

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    const empresaId = empresaAtiva.empresa_id;

    async function carregar() {
      const { data: unidadesData, error: unidadesError } = await daEmpresa(
        supabase.from('unidades').select('id, razao_social, nome_fantasia'),
        empresaId
      )
        .eq('ativo', true)
        .order('razao_social');
      if (!ativo) return;
      if (unidadesError) {
        setErroGeral(unidadesError.message);
        setCarregando(false);
        return;
      }
      setUnidades((unidadesData ?? []) as Unidade[]);

      if (id) {
        const { data, error } = await daEmpresa(supabase.from('planos_acao_5w2h').select('*'), empresaId)
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
          o_que: data.o_que ?? '',
          por_que: data.por_que ?? '',
          onde: data.onde ?? '',
          quando: data.quando ?? '',
          quem: data.quem ?? '',
          como: data.como ?? '',
          quanto_custa: data.quanto_custa != null ? String(data.quanto_custa) : '',
          status: (data.status as StatusPlanoAcao) ?? 'pendente',
        });
        if (data.inspecao_item_id) {
          setInspecaoItemId(data.inspecao_item_id);
          await carregarOrigem(data.inspecao_item_id, ativo);
        }
      } else if (inspecaoItemIdParam) {
        setInspecaoItemId(inspecaoItemIdParam);
        const dadosOrigem = await carregarOrigem(inspecaoItemIdParam, ativo);
        if (dadosOrigem) {
          const { data: inspecaoData } = await daEmpresa(
            supabase.from('inspecoes_checklist').select('unidade_id'),
            empresaId
          )
            .eq('id', dadosOrigem.inspecao_id)
            .single();
          if (ativo && inspecaoData) {
            setForm((f) => ({
              ...f,
              unidade_id: inspecaoData.unidade_id,
              o_que: `Não conformidade: ${dadosOrigem.item_descricao}`,
            }));
          }
        }
      }

      setCarregando(false);
    }

    async function carregarOrigem(itemId: string, ativoRef: boolean): Promise<OrigemInspecao | null> {
      const { data } = await supabase
        .from('inspecao_itens')
        .select('descricao, inspecao_id, inspecoes(titulo)')
        .eq('id', itemId)
        .single();
      if (!ativoRef || !data) return null;
      const inspecaoTitulo = (data as unknown as { inspecoes: { titulo: string } | null }).inspecoes?.titulo ?? '—';
      const resultado: OrigemInspecao = {
        inspecao_id: data.inspecao_id,
        inspecao_titulo: inspecaoTitulo,
        item_descricao: data.descricao,
      };
      setOrigem(resultado);
      return resultado;
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [id, empresaAtiva, inspecaoItemIdParam]);

  function set<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  function validar() {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.unidade_id) e.unidade_id = 'Selecione a unidade.';
    if (!form.o_que.trim()) e.o_que = 'Descreva o que precisa ser feito.';
    if (!form.quando) e.quando = 'Informe o prazo.';
    if (!form.quem.trim()) e.quem = 'Informe o responsável.';
    if (form.quanto_custa && Number.isNaN(Number(form.quanto_custa)))
      e.quanto_custa = 'Informe um valor numérico válido.';
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setErroGeral(null);
    if (!validar() || !empresaAtiva) return;
    setSalvando(true);

    const payload = {
      empresa_id: empresaAtiva.empresa_id,
      unidade_id: form.unidade_id,
      inspecao_item_id: inspecaoItemId,
      o_que: form.o_que.trim(),
      por_que: form.por_que.trim() || null,
      onde: form.onde.trim() || null,
      quando: form.quando,
      quem: form.quem.trim(),
      como: form.como.trim() || null,
      quanto_custa: form.quanto_custa ? Number(form.quanto_custa) : null,
      status: form.status,
    };

    const { error } = editando
      ? await supabase.from('planos_acao_5w2h').update(payload).eq('id', id!)
      : await supabase.from('planos_acao_5w2h').insert(payload);

    setSalvando(false);

    if (error) {
      setErroGeral(error.message);
      return;
    }
    navigate('/planos-acao', { replace: true });
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
          onClick={() => navigate('/planos-acao')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar plano de ação' : 'Novo plano de ação (5W2H)'}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full pb-32">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erroGeral}
          </div>
        )}

        {origem && (
          <div className="flex items-start gap-2 bg-secondary-container/30 text-on-secondary-container px-3 py-2 rounded-lg text-label-sm">
            <span className="material-symbols-outlined text-[16px] mt-px">fact_check</span>
            <span>
              Gerado a partir da não conformidade "{origem.item_descricao}" da inspeção{' '}
              <Link to={`/inspecoes/${origem.inspecao_id}`} className="underline">
                {origem.inspecao_titulo}
              </Link>
              .
            </span>
          </div>
        )}

        {unidades.length === 0 ? (
          <div className="flex items-start gap-2 bg-[#F97316]/10 text-[#9a3412] px-3 py-2 rounded-lg text-label-sm">
            <span className="material-symbols-outlined text-[16px] mt-px">warning</span>
            <span>Nenhuma unidade ativa cadastrada ainda. Cadastre uma unidade antes de criar um plano de ação.</span>
          </div>
        ) : (
          <Secao icone="checklist" titulo="5W2H">
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

            <AreaTexto
              rotulo="O quê — o que precisa ser feito"
              name="o_que"
              placeholder="Ex.: Substituir os extintores vencidos do almoxarifado"
              value={form.o_que}
              onChange={(e) => set('o_que', e.target.value)}
              erro={erros.o_que}
            />

            <AreaTexto
              rotulo="Por quê — motivo da ação (opcional)"
              name="por_que"
              placeholder="Ex.: Extintores fora da validade representam risco em caso de incêndio"
              value={form.por_que}
              onChange={(e) => set('por_que', e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo
                rotulo="Onde (opcional)"
                name="onde"
                placeholder="Ex.: Almoxarifado — corredor B"
                value={form.onde}
                onChange={(e) => set('onde', e.target.value)}
              />
              <Campo
                rotulo="Quando — prazo"
                name="quando"
                type="date"
                value={form.quando}
                onChange={(e) => set('quando', e.target.value)}
                erro={erros.quando}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo
                rotulo="Quem — responsável"
                name="quem"
                placeholder="Nome do responsável pela ação"
                value={form.quem}
                onChange={(e) => set('quem', e.target.value)}
                erro={erros.quem}
              />
              <Campo
                rotulo="Quanto custa — R$ (opcional)"
                name="quanto_custa"
                type="number"
                min={0}
                step="0.01"
                placeholder="0,00"
                value={form.quanto_custa}
                onChange={(e) => set('quanto_custa', e.target.value)}
                erro={erros.quanto_custa}
              />
            </div>

            <AreaTexto
              rotulo="Como — forma de execução (opcional)"
              name="como"
              placeholder="Ex.: Contratar empresa terceirizada para recarga e substituição"
              value={form.como}
              onChange={(e) => set('como', e.target.value)}
            />

            <Seletor
              rotulo="Status"
              name="status"
              value={form.status}
              onChange={(e) => set('status', e.target.value as StatusPlanoAcao)}
            >
              {(Object.keys(STATUS_PLANO_ACAO_LABEL) as StatusPlanoAcao[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_PLANO_ACAO_LABEL[s]}
                </option>
              ))}
            </Seletor>
          </Secao>
        )}
      </div>

      <footer className="fixed bottom-0 left-0 md:left-80 right-0 bg-surface-container-lowest p-4 border-t border-outline-variant flex gap-3 z-30 pb-24 md:pb-4">
        <div className="flex gap-3 w-full max-w-3xl mx-auto md:mx-0 md:ml-md">
          <Botao type="button" variante="secundario" className="flex-1" onClick={() => navigate('/planos-acao')}>
            Cancelar
          </Botao>
          <Botao
            type="submit"
            icone="save"
            carregando={salvando}
            disabled={unidades.length === 0}
            className="flex-1"
          >
            {salvando ? 'Salvando...' : 'Salvar plano de ação'}
          </Botao>
        </div>
      </footer>
    </form>
  );
}
