import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Secao, Campo, Seletor, AreaTexto, Botao } from '@/components/ui/Form';
import { TIPO_EXAME_LABEL, RESULTADO_LABEL, type TipoExame, type Resultado } from '@/lib/aso';

type Funcionario = { id: string; nome: string };

type FormState = {
  funcionario_id: string;
  tipo_exame: TipoExame;
  data_exame: string;
  data_vencimento: string;
  resultado: Resultado;
  medico_nome: string;
  medico_crm: string;
  observacao: string;
};

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

const VAZIO: FormState = {
  funcionario_id: '',
  tipo_exame: 'periodico',
  data_exame: '',
  data_vencimento: '',
  resultado: 'apto',
  medico_nome: '',
  medico_crm: '',
  observacao: '',
};

export default function AsoForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { empresaAtiva } = useAuth();

  const [form, setForm] = useState<FormState>(() => ({ ...VAZIO, data_exame: hoje() }));
  const [erros, setErros] = useState<Partial<Record<keyof FormState, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    const empresaId = empresaAtiva.empresa_id;

    async function carregar() {
      const rf = await daEmpresa(supabase.from('funcionarios').select('id, nome'), empresaId)
        .eq('status', 'ativo')
        .order('nome');
      if (!ativo) return;

      if (rf.error) {
        setErroGeral(rf.error.message);
        setCarregando(false);
        return;
      }

      setFuncionarios((rf.data ?? []) as Funcionario[]);

      if (id) {
        const { data, error } = await daEmpresa(supabase.from('asos').select('*'), empresaId)
          .eq('id', id)
          .single();
        if (!ativo) return;
        if (error) {
          setErroGeral(error.message);
          setCarregando(false);
          return;
        }
        setForm({
          funcionario_id: data.funcionario_id,
          tipo_exame: (data.tipo_exame as TipoExame) ?? 'periodico',
          data_exame: data.data_exame ?? hoje(),
          data_vencimento: data.data_vencimento ?? '',
          resultado: (data.resultado as Resultado) ?? 'apto',
          medico_nome: data.medico_nome ?? '',
          medico_crm: data.medico_crm ?? '',
          observacao: data.observacao ?? '',
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
    if (!form.tipo_exame) e.tipo_exame = 'Selecione o tipo de exame.';
    if (!form.data_exame) e.data_exame = 'Informe a data do exame.';
    if (!form.resultado) e.resultado = 'Selecione o resultado.';
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
      funcionario_id: form.funcionario_id,
      tipo_exame: form.tipo_exame,
      data_exame: form.data_exame,
      data_vencimento: form.data_vencimento || null,
      resultado: form.resultado,
      medico_nome: form.medico_nome.trim() || null,
      medico_crm: form.medico_crm.trim() || null,
      observacao: form.observacao.trim() || null,
    };

    const { error } = editando
      ? await supabase.from('asos').update(payload).eq('id', id!)
      : await supabase.from('asos').insert(payload);

    setSalvando(false);

    if (error) {
      setErroGeral(error.message);
      return;
    }
    navigate('/aso', { replace: true });
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
          onClick={() => navigate('/aso')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar ASO' : 'Novo ASO'}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full pb-32">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erroGeral}
          </div>
        )}

        {funcionarios.length === 0 ? (
          <div className="flex items-start gap-2 bg-[#F97316]/10 text-[#9a3412] px-3 py-2 rounded-lg text-label-sm">
            <span className="material-symbols-outlined text-[16px] mt-px">warning</span>
            <span>Nenhum funcionário ativo cadastrado ainda. Cadastre um funcionário antes de registrar um ASO.</span>
          </div>
        ) : (
          <>
            <Secao icone="medical_information" titulo="Exame">
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
                rotulo="Tipo de exame"
                name="tipo_exame"
                value={form.tipo_exame}
                onChange={(e) => set('tipo_exame', e.target.value as TipoExame)}
                erro={erros.tipo_exame}
              >
                {(Object.keys(TIPO_EXAME_LABEL) as TipoExame[]).map((t) => (
                  <option key={t} value={t}>
                    {TIPO_EXAME_LABEL[t]}
                  </option>
                ))}
              </Seletor>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Campo
                  rotulo="Data do exame"
                  name="data_exame"
                  type="date"
                  value={form.data_exame}
                  onChange={(e) => set('data_exame', e.target.value)}
                  erro={erros.data_exame}
                />
                <Campo
                  rotulo="Data de vencimento (próximo exame)"
                  name="data_vencimento"
                  type="date"
                  value={form.data_vencimento}
                  onChange={(e) => set('data_vencimento', e.target.value)}
                  dica="Data limite para o próximo exame periódico, se aplicável."
                />
              </div>

              <Seletor
                rotulo="Resultado"
                name="resultado"
                value={form.resultado}
                onChange={(e) => set('resultado', e.target.value as Resultado)}
                erro={erros.resultado}
              >
                {(Object.keys(RESULTADO_LABEL) as Resultado[]).map((r) => (
                  <option key={r} value={r}>
                    {RESULTADO_LABEL[r]}
                  </option>
                ))}
              </Seletor>
            </Secao>

            <Secao icone="medical_services" titulo="Médico responsável">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Campo
                  rotulo="Nome do médico (opcional)"
                  name="medico_nome"
                  placeholder="Ex.: Dr. João Silva"
                  value={form.medico_nome}
                  onChange={(e) => set('medico_nome', e.target.value)}
                />
                <Campo
                  rotulo="CRM (opcional)"
                  name="medico_crm"
                  placeholder="Ex.: CRM/SP 123456"
                  value={form.medico_crm}
                  onChange={(e) => set('medico_crm', e.target.value)}
                />
              </div>

              <AreaTexto
                rotulo="Observações (opcional)"
                name="observacao"
                placeholder="Ex.: restrições indicadas, exames complementares solicitados, etc."
                value={form.observacao}
                onChange={(e) => set('observacao', e.target.value)}
              />
            </Secao>
          </>
        )}
      </div>

      <footer className="fixed bottom-0 left-0 md:left-80 right-0 bg-surface-container-lowest p-4 border-t border-outline-variant flex gap-3 z-30 pb-24 md:pb-4">
        <div className="flex gap-3 w-full max-w-3xl mx-auto md:mx-0 md:ml-md">
          <Botao type="button" variante="secundario" className="flex-1" onClick={() => navigate('/aso')}>
            Cancelar
          </Botao>
          <Botao
            type="submit"
            icone="save"
            carregando={salvando}
            disabled={funcionarios.length === 0}
            className="flex-1"
          >
            {salvando ? 'Salvando...' : 'Salvar ASO'}
          </Botao>
        </div>
      </footer>
    </form>
  );
}
