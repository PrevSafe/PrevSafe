import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Secao, Campo, Seletor, Botao } from '@/components/ui/Form';
import { TIPO_COBRANCA_LABEL, hojeBrasil, type TipoCobranca } from '@/lib/financeiro';

type Form = {
  tipo_cobranca: TipoCobranca;
  valor_unitario: string;
  vigencia_inicio: string;
  vigencia_fim: string;
  ativo: 'true' | 'false';
};

const VAZIO: Form = {
  tipo_cobranca: 'vidas_ativas',
  valor_unitario: '',
  vigencia_inicio: hojeBrasil(),
  vigencia_fim: '',
  ativo: 'true',
};

export default function PlanoFaturamentoForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { empresaAtiva, can } = useAuth();
  const podeSalvar = can('financeiro', editando ? 'editar' : 'criar');

  const [form, setForm] = useState<Form>(VAZIO);
  const [erros, setErros] = useState<Partial<Record<keyof Form, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(editando);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !empresaAtiva) {
      setCarregando(false);
      return;
    }
    daEmpresa(supabase.from('planos_faturamento').select('*'), empresaAtiva.empresa_id)
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) setErroGeral(error.code === 'PGRST116' ? 'Plano não encontrado.' : error.message);
        else if (data)
          setForm({
            tipo_cobranca: (data.tipo_cobranca as TipoCobranca) ?? 'vidas_ativas',
            valor_unitario: data.valor_unitario != null ? String(data.valor_unitario) : '',
            vigencia_inicio: data.vigencia_inicio ?? hojeBrasil(),
            vigencia_fim: data.vigencia_fim ?? '',
            ativo: data.ativo ? 'true' : 'false',
          });
        setCarregando(false);
      });
  }, [id, empresaAtiva]);

  function set<K extends keyof Form>(campo: K, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  function validar() {
    const e: Partial<Record<keyof Form, string>> = {};
    const valor = Number(form.valor_unitario);
    if (!form.valor_unitario || Number.isNaN(valor) || valor < 0)
      e.valor_unitario = 'Informe um valor unitário válido.';
    if (!form.vigencia_inicio) e.vigencia_inicio = 'Informe o início da vigência.';
    if (form.vigencia_fim && form.vigencia_inicio && form.vigencia_fim < form.vigencia_inicio)
      e.vigencia_fim = 'O fim da vigência não pode ser anterior ao início.';
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
      tipo_cobranca: form.tipo_cobranca,
      valor_unitario: Number(form.valor_unitario),
      vigencia_inicio: form.vigencia_inicio,
      vigencia_fim: form.vigencia_fim || null,
      ...(editando ? { ativo: form.ativo === 'true' } : {}),
    };

    const { error } = editando
      ? await supabase.from('planos_faturamento').update(payload).eq('id', id!)
      : await supabase.from('planos_faturamento').insert(payload);

    setSalvando(false);

    if (error) {
      setErroGeral(error.message);
      return;
    }
    navigate('/financeiro/planos', { replace: true });
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
          onClick={() => navigate('/financeiro/planos')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar plano de faturamento' : 'Novo plano de faturamento'}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erroGeral}
          </div>
        )}

        <Secao icone="payments" titulo="Regra de Cobrança">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Seletor
              rotulo="Tipo de cobrança"
              name="tipo_cobranca"
              value={form.tipo_cobranca}
              onChange={(e) => set('tipo_cobranca', e.target.value)}
              erro={erros.tipo_cobranca}
              autoFocus
            >
              <option value="vidas_ativas">{TIPO_COBRANCA_LABEL.vidas_ativas}</option>
              <option value="por_exame">{TIPO_COBRANCA_LABEL.por_exame}</option>
            </Seletor>
            <Campo
              rotulo="Valor unitário (R$)"
              name="valor_unitario"
              type="number"
              min={0}
              step="0.01"
              placeholder="0,00"
              value={form.valor_unitario}
              onChange={(e) => set('valor_unitario', e.target.value)}
              erro={erros.valor_unitario}
              dica="Valor cobrado por vida ativa ou por exame realizado, conforme o tipo escolhido."
            />
          </div>
        </Secao>

        <Secao icone="event" titulo="Vigência">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo
              rotulo="Início da vigência"
              name="vigencia_inicio"
              type="date"
              value={form.vigencia_inicio}
              onChange={(e) => set('vigencia_inicio', e.target.value)}
              erro={erros.vigencia_inicio}
            />
            <Campo
              rotulo="Fim da vigência (opcional)"
              name="vigencia_fim"
              type="date"
              value={form.vigencia_fim}
              onChange={(e) => set('vigencia_fim', e.target.value)}
              erro={erros.vigencia_fim}
              dica="Deixe em branco enquanto o plano estiver vigente."
            />
          </div>
        </Secao>

        {editando && (
          <Secao icone="toggle_on" titulo="Situação">
            <Seletor
              rotulo="Status"
              name="ativo"
              value={form.ativo}
              onChange={(e) => set('ativo', e.target.value)}
              dica="Planos inativos deixam de aparecer na seleção ao gerar novas faturas."
            >
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </Seletor>
          </Secao>
        )}
      </div>

      <footer className="flex gap-3 px-margin-mobile md:px-md py-4 mt-2 max-w-3xl w-full border-t border-outline-variant">
        <Botao
          type="button"
          variante="secundario"
          className="flex-1"
          onClick={() => navigate('/financeiro/planos')}
        >
          {editando ? 'Voltar' : 'Cancelar'}
        </Botao>
        {podeSalvar && (
          <Botao type="submit" icone="save" carregando={salvando} className="flex-1">
            {salvando ? 'Salvando...' : 'Salvar plano'}
          </Botao>
        )}
      </footer>
    </form>
  );
}
