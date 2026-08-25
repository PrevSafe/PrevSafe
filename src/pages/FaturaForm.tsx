import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Secao, Campo, Seletor, Botao } from '@/components/ui/Form';
import { STATUS_FATURA_LABEL, TIPO_COBRANCA_LABEL, type StatusFatura, type TipoCobranca } from '@/lib/financeiro';

type Plano = { id: string; tipo_cobranca: TipoCobranca };

type Form = {
  plano_id: string;
  competencia: string;
  quantidade_apurada: string;
  valor_total: string;
  vencimento: string;
  status: StatusFatura;
};

const VAZIO: Form = {
  plano_id: '',
  competencia: '',
  quantidade_apurada: '0',
  valor_total: '0',
  vencimento: '',
  status: 'aberta',
};

export default function FaturaForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { empresaAtiva, can } = useAuth();
  const podeSalvar = can('financeiro', editando ? 'editar' : 'criar');

  const [form, setForm] = useState<Form>(VAZIO);
  const [erros, setErros] = useState<Partial<Record<keyof Form, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    const empresaId = empresaAtiva.empresa_id;

    async function carregar() {
      const rp = await daEmpresa(
        supabase.from('planos_faturamento').select('id, tipo_cobranca').eq('ativo', true),
        empresaId
      ).order('tipo_cobranca');
      if (!ativo) return;

      if (rp.error) {
        setErroGeral(rp.error.message);
        setCarregando(false);
        return;
      }
      setPlanos((rp.data ?? []) as Plano[]);

      if (id) {
        const { data, error } = await daEmpresa(supabase.from('faturas').select('*'), empresaId)
          .eq('id', id)
          .single();
        if (!ativo) return;
        if (error) {
          setErroGeral(error.code === 'PGRST116' ? 'Fatura não encontrada.' : error.message);
          setCarregando(false);
          return;
        }
        if (data)
          setForm({
            plano_id: data.plano_id ?? '',
            competencia: data.competencia ? data.competencia.slice(0, 7) : '',
            quantidade_apurada: String(data.quantidade_apurada ?? 0),
            valor_total: data.valor_total != null ? String(data.valor_total) : '0',
            vencimento: data.vencimento ?? '',
            status: (data.status as StatusFatura) ?? 'aberta',
          });
      }

      setCarregando(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [id, empresaAtiva]);

  function set<K extends keyof Form>(campo: K, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  function validar() {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!form.plano_id) e.plano_id = 'Selecione o plano de faturamento.';
    if (!form.competencia) e.competencia = 'Informe a competência.';
    const quantidade = Number(form.quantidade_apurada);
    if (form.quantidade_apurada === '' || Number.isNaN(quantidade) || quantidade < 0)
      e.quantidade_apurada = 'Informe uma quantidade válida.';
    const valor = Number(form.valor_total);
    if (form.valor_total === '' || Number.isNaN(valor) || valor < 0)
      e.valor_total = 'Informe um valor total válido.';
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setErroGeral(null);
    if (!podeSalvar || !validar() || !empresaAtiva) return;
    setSalvando(true);

    const payload = {
      empresa_id: empresaAtiva.empresa_id,
      plano_id: form.plano_id,
      competencia: `${form.competencia}-01`,
      quantidade_apurada: Number(form.quantidade_apurada),
      valor_total: Number(form.valor_total),
      vencimento: form.vencimento || null,
      ...(editando ? { status: form.status } : {}),
    };

    const { error } = editando
      ? await supabase.from('faturas').update(payload).eq('id', id!)
      : await supabase.from('faturas').insert(payload);

    setSalvando(false);

    if (error) {
      setErroGeral(
        error.code === '23505'
          ? 'Já existe uma fatura para este plano nesta competência.'
          : error.message
      );
      return;
    }
    navigate('/financeiro/faturas', { replace: true });
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
          onClick={() => navigate('/financeiro/faturas')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar fatura' : 'Nova fatura'}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erroGeral}
          </div>
        )}

        {planos.length === 0 ? (
          <div className="flex items-start gap-2 bg-[#F97316]/10 text-[#9a3412] px-3 py-2 rounded-lg text-label-sm">
            <span className="material-symbols-outlined text-[16px] mt-px">warning</span>
            <span>
              Nenhum plano de faturamento ativo cadastrado ainda. Cadastre um plano antes de
              lançar uma fatura.
            </span>
          </div>
        ) : (
          <Secao icone="receipt_long" titulo="Dados da Fatura">
            <Seletor
              rotulo="Plano de faturamento"
              name="plano_id"
              value={form.plano_id}
              onChange={(e) => set('plano_id', e.target.value)}
              erro={erros.plano_id}
              autoFocus
            >
              <option value="">Selecione o plano</option>
              {planos.map((p) => (
                <option key={p.id} value={p.id}>
                  {TIPO_COBRANCA_LABEL[p.tipo_cobranca]}
                </option>
              ))}
            </Seletor>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo
                rotulo="Competência"
                name="competencia"
                type="month"
                value={form.competencia}
                onChange={(e) => set('competencia', e.target.value)}
                erro={erros.competencia}
              />
              <Campo
                rotulo="Vencimento (opcional)"
                name="vencimento"
                type="date"
                value={form.vencimento}
                onChange={(e) => set('vencimento', e.target.value)}
                erro={erros.vencimento}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo
                rotulo="Quantidade apurada"
                name="quantidade_apurada"
                type="number"
                min={0}
                step="1"
                value={form.quantidade_apurada}
                onChange={(e) => set('quantidade_apurada', e.target.value)}
                erro={erros.quantidade_apurada}
                dica="Nº de vidas ativas ou de exames realizados na competência, apurado manualmente."
              />
              <Campo
                rotulo="Valor total (R$)"
                name="valor_total"
                type="number"
                min={0}
                step="0.01"
                value={form.valor_total}
                onChange={(e) => set('valor_total', e.target.value)}
                erro={erros.valor_total}
              />
            </div>
          </Secao>
        )}

        {editando && (
          <Secao icone="fact_check" titulo="Status">
            <Seletor
              rotulo="Status"
              name="status"
              value={form.status}
              onChange={(e) => set('status', e.target.value as StatusFatura)}
            >
              {(Object.keys(STATUS_FATURA_LABEL) as StatusFatura[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_FATURA_LABEL[s]}
                </option>
              ))}
            </Seletor>
          </Secao>
        )}
      </div>

      <footer className="flex gap-3 px-margin-mobile md:px-md py-4 mt-2 max-w-3xl w-full border-t border-outline-variant">
        <Botao
          type="button"
          variante="secundario"
          className="flex-1"
          onClick={() => navigate('/financeiro/faturas')}
        >
          {editando ? 'Voltar' : 'Cancelar'}
        </Botao>
        {podeSalvar && (
          <Botao
            type="submit"
            icone="save"
            carregando={salvando}
            disabled={planos.length === 0}
            className="flex-1"
          >
            {salvando ? 'Salvando...' : 'Salvar fatura'}
          </Botao>
        )}
      </footer>
    </form>
  );
}
