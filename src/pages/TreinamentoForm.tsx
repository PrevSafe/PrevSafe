import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Secao, Campo, Seletor, AreaTexto, Botao } from '@/components/ui/Form';

type Funcionario = { id: string; nome: string };

type FormState = {
  funcionario_id: string;
  nome: string;
  carga_horaria: string;
  data_realizacao: string;
  data_validade: string;
  instrutor: string;
  observacao: string;
};

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

const VAZIO: FormState = {
  funcionario_id: '',
  nome: '',
  carga_horaria: '',
  data_realizacao: '',
  data_validade: '',
  instrutor: '',
  observacao: '',
};

export default function TreinamentoForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { empresaAtiva } = useAuth();

  const [form, setForm] = useState<FormState>(() => ({ ...VAZIO, data_realizacao: hoje() }));
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
      const { data: rf, error: erroFunc } = await daEmpresa(
        supabase.from('funcionarios').select('id, nome'),
        empresaId
      )
        .eq('status', 'ativo')
        .order('nome');
      if (!ativo) return;

      if (erroFunc) {
        setErroGeral(erroFunc.message);
        setCarregando(false);
        return;
      }
      setFuncionarios((rf ?? []) as Funcionario[]);

      if (id) {
        const { data, error } = await daEmpresa(supabase.from('treinamentos').select('*'), empresaId)
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
          nome: data.nome ?? '',
          carga_horaria: data.carga_horaria != null ? String(data.carga_horaria) : '',
          data_realizacao: data.data_realizacao ?? hoje(),
          data_validade: data.data_validade ?? '',
          instrutor: data.instrutor ?? '',
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
    if (!form.nome.trim()) e.nome = 'Informe o nome do treinamento.';
    if (!form.data_realizacao) e.data_realizacao = 'Informe a data de realização.';
    if (
      form.carga_horaria &&
      (!Number.isInteger(Number(form.carga_horaria)) || Number(form.carga_horaria) <= 0)
    )
      e.carga_horaria = 'Informe uma carga horária válida.';
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
      nome: form.nome.trim(),
      carga_horaria: form.carga_horaria ? Number(form.carga_horaria) : null,
      data_realizacao: form.data_realizacao,
      data_validade: form.data_validade || null,
      instrutor: form.instrutor.trim() || null,
      observacao: form.observacao.trim() || null,
    };

    const { error } = editando
      ? await supabase.from('treinamentos').update(payload).eq('id', id!)
      : await supabase.from('treinamentos').insert(payload);

    setSalvando(false);

    if (error) {
      setErroGeral(error.message);
      return;
    }
    navigate('/dds/treinamentos', { replace: true });
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
          onClick={() => navigate('/dds/treinamentos')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar treinamento' : 'Novo treinamento'}
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
            <span>Nenhum funcionário ativo cadastrado ainda. Cadastre um funcionário antes de registrar um treinamento.</span>
          </div>
        ) : (
          <Secao icone="school" titulo="Treinamento">
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

            <Campo
              rotulo="Nome do treinamento"
              name="nome"
              placeholder="Ex.: NR-35 Trabalho em Altura"
              value={form.nome}
              onChange={(e) => set('nome', e.target.value)}
              erro={erros.nome}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Campo
                rotulo="Data de realização"
                name="data_realizacao"
                type="date"
                value={form.data_realizacao}
                onChange={(e) => set('data_realizacao', e.target.value)}
                erro={erros.data_realizacao}
              />
              <Campo
                rotulo="Data de validade (opcional)"
                name="data_validade"
                type="date"
                value={form.data_validade}
                onChange={(e) => set('data_validade', e.target.value)}
                dica="Prazo de reciclagem, quando a norma exigir."
              />
              <Campo
                rotulo="Carga horária (opcional)"
                name="carga_horaria"
                type="number"
                min={1}
                placeholder="Ex.: 8"
                value={form.carga_horaria}
                onChange={(e) => set('carga_horaria', e.target.value)}
                erro={erros.carga_horaria}
              />
            </div>

            <Campo
              rotulo="Instrutor (opcional)"
              name="instrutor"
              placeholder="Ex.: nome do instrutor ou empresa responsável"
              value={form.instrutor}
              onChange={(e) => set('instrutor', e.target.value)}
            />

            <AreaTexto
              rotulo="Observações (opcional)"
              name="observacao"
              placeholder="Ex.: conteúdo programático, certificado emitido, etc."
              value={form.observacao}
              onChange={(e) => set('observacao', e.target.value)}
            />
          </Secao>
        )}
      </div>

      <footer className="fixed bottom-0 left-0 md:left-80 right-0 bg-surface-container-lowest p-4 border-t border-outline-variant flex gap-3 z-30 pb-24 md:pb-4">
        <div className="flex gap-3 w-full max-w-3xl mx-auto md:mx-0 md:ml-md">
          <Botao
            type="button"
            variante="secundario"
            className="flex-1"
            onClick={() => navigate('/dds/treinamentos')}
          >
            Cancelar
          </Botao>
          <Botao
            type="submit"
            icone="save"
            carregando={salvando}
            disabled={funcionarios.length === 0}
            className="flex-1"
          >
            {salvando ? 'Salvando...' : 'Salvar treinamento'}
          </Botao>
        </div>
      </footer>
    </form>
  );
}
