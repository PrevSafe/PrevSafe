import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Secao, Campo, Seletor, AreaTexto, Botao } from '@/components/ui/Form';
import {
  STATUS_AGENDAMENTO_LABEL,
  paraCampoDataHoraBrasil,
  paraInstanteBrasil,
  type StatusAgendamento,
} from '@/lib/agendaMedica';

type Funcionario = { id: string; nome: string };
type Procedimento = { codigo_esocial: string; nome_exame: string };
type Clinica = { id: string; nome_fantasia: string };

type FormState = {
  funcionario_id: string;
  procedimento_codigo: string;
  data_agendada: string;
  clinica_credenciada_id: string;
  observacao: string;
  status: StatusAgendamento;
};

const VAZIO: FormState = {
  funcionario_id: '',
  procedimento_codigo: '',
  data_agendada: '',
  clinica_credenciada_id: '',
  observacao: '',
  status: 'agendado',
};

export default function AgendaMedicaForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { empresaAtiva, can } = useAuth();
  const podeSalvar = can('agenda_medica', editando ? 'editar' : 'criar');
  const [searchParams] = useSearchParams();
  const funcionarioPreselecionado = searchParams.get('funcionario_id') ?? '';

  const [form, setForm] = useState<FormState>(() => ({
    ...VAZIO,
    funcionario_id: funcionarioPreselecionado,
  }));
  const [erros, setErros] = useState<Partial<Record<keyof FormState, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    const empresaId = empresaAtiva.empresa_id;

    async function carregar() {
      const [rf, rp, rc] = await Promise.all([
        daEmpresa(supabase.from('funcionarios').select('id, nome'), empresaId)
          .eq('status', 'ativo')
          .order('nome'),
        supabase.from('procedimentos_t27').select('codigo_esocial, nome_exame').order('nome_exame'),
        daEmpresa(
          supabase.from('clinicas_credenciadas').select('id, nome_fantasia').eq('ativo', true),
          empresaId
        ).order('nome_fantasia'),
      ]);
      if (!ativo) return;

      const erroBase = rf.error ?? rp.error ?? rc.error;
      if (erroBase) {
        setErroGeral(erroBase.message);
        setCarregando(false);
        return;
      }

      setFuncionarios((rf.data ?? []) as Funcionario[]);
      setProcedimentos((rp.data ?? []) as Procedimento[]);
      setClinicas((rc.data ?? []) as Clinica[]);

      if (id) {
        const { data, error } = await daEmpresa(supabase.from('agenda_medica').select('*'), empresaId)
          .eq('id', id)
          .single();
        if (!ativo) return;
        if (error) {
          setErroGeral(error.code === 'PGRST116' ? 'Agendamento não encontrado.' : error.message);
          setCarregando(false);
          return;
        }
        if (data)
          setForm({
            funcionario_id: data.funcionario_id ?? '',
            procedimento_codigo: data.procedimento_codigo ?? '',
            data_agendada: data.data_agendada ? paraCampoDataHoraBrasil(data.data_agendada) : '',
            clinica_credenciada_id: data.clinica_credenciada_id ?? '',
            observacao: data.observacao ?? '',
            status: (data.status as StatusAgendamento) ?? 'agendado',
          });
      }

      setCarregando(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [id, empresaAtiva]);

  function set<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  function validar() {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.funcionario_id) e.funcionario_id = 'Selecione o funcionário.';
    if (!form.procedimento_codigo) e.procedimento_codigo = 'Selecione o procedimento.';
    if (!form.data_agendada) e.data_agendada = 'Informe a data e hora do agendamento.';
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
      funcionario_id: form.funcionario_id,
      procedimento_codigo: form.procedimento_codigo,
      data_agendada: paraInstanteBrasil(form.data_agendada),
      clinica_credenciada_id: form.clinica_credenciada_id || null,
      observacao: form.observacao.trim() || null,
      ...(editando ? { status: form.status } : {}),
    };

    const { error } = editando
      ? await supabase.from('agenda_medica').update(payload).eq('id', id!)
      : await supabase.from('agenda_medica').insert(payload);

    setSalvando(false);

    if (error) {
      setErroGeral(error.message);
      return;
    }
    navigate('/agenda-medica', { replace: true });
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
          onClick={() => navigate('/agenda-medica')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar agendamento' : 'Novo agendamento'}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erroGeral}
          </div>
        )}

        {funcionarios.length === 0 ? (
          <div className="flex items-start gap-2 bg-[#F97316]/10 text-[#9a3412] px-3 py-2 rounded-lg text-label-sm">
            <span className="material-symbols-outlined text-[16px] mt-px">warning</span>
            <span>
              Nenhum funcionário ativo cadastrado ainda. Cadastre um funcionário antes de agendar um
              exame.
            </span>
          </div>
        ) : (
          <Secao icone="event_available" titulo="Agendamento">
            <Seletor
              rotulo="Funcionário"
              name="funcionario_id"
              value={form.funcionario_id}
              onChange={(e) => set('funcionario_id', e.target.value)}
              erro={erros.funcionario_id}
              autoFocus
            >
              <option value="">Selecione o funcionário</option>
              {funcionarios.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </Seletor>

            <Seletor
              rotulo="Procedimento"
              name="procedimento_codigo"
              value={form.procedimento_codigo}
              onChange={(e) => set('procedimento_codigo', e.target.value)}
              erro={erros.procedimento_codigo}
            >
              <option value="">Selecione o procedimento</option>
              {procedimentos.map((p) => (
                <option key={p.codigo_esocial} value={p.codigo_esocial}>
                  {p.nome_exame}
                </option>
              ))}
            </Seletor>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo
                rotulo="Data e hora"
                name="data_agendada"
                type="datetime-local"
                value={form.data_agendada}
                onChange={(e) => set('data_agendada', e.target.value)}
                erro={erros.data_agendada}
              />
              <Seletor
                rotulo="Clínica credenciada (opcional)"
                name="clinica_credenciada_id"
                value={form.clinica_credenciada_id}
                onChange={(e) => set('clinica_credenciada_id', e.target.value)}
                dica="Deixe em Interno quando o exame não for realizado em clínica credenciada."
              >
                <option value="">Interno (não é clínica credenciada)</option>
                {clinicas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_fantasia}
                  </option>
                ))}
              </Seletor>
            </div>

            <AreaTexto
              rotulo="Observação (opcional)"
              name="observacao"
              placeholder="Ex.: jejum de 12h, levar exames anteriores, etc."
              value={form.observacao}
              onChange={(e) => set('observacao', e.target.value)}
            />
          </Secao>
        )}

        {editando && (
          <Secao icone="fact_check" titulo="Status">
            <Seletor
              rotulo="Status"
              name="status"
              value={form.status}
              onChange={(e) => set('status', e.target.value as StatusAgendamento)}
            >
              {(Object.keys(STATUS_AGENDAMENTO_LABEL) as StatusAgendamento[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_AGENDAMENTO_LABEL[s]}
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
          onClick={() => navigate('/agenda-medica')}
        >
          {editando ? 'Voltar' : 'Cancelar'}
        </Botao>
        {podeSalvar && (
          <Botao
            type="submit"
            icone="save"
            carregando={salvando}
            disabled={funcionarios.length === 0}
            className="flex-1"
          >
            {salvando ? 'Salvando...' : 'Salvar agendamento'}
          </Botao>
        )}
      </footer>
    </form>
  );
}
