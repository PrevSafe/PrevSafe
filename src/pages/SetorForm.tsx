import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Secao, Campo, AreaTexto, Botao } from '@/components/ui/Form';

type Form = {
  codigo: string;
  nome: string;
  descricao: string;
};

const VAZIO: Form = {
  codigo: '',
  nome: '',
  descricao: '',
};

export default function SetorForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { empresaAtiva } = useAuth();

  const [form, setForm] = useState<Form>(VAZIO);
  const [erros, setErros] = useState<Partial<Record<keyof Form, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(editando);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !empresaAtiva) return;
    daEmpresa(supabase.from('setores').select('*'), empresaAtiva.empresa_id)
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) setErroGeral(error.message);
        else if (data)
          setForm({
            codigo: data.codigo ?? '',
            nome: data.nome ?? '',
            descricao: data.descricao ?? '',
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
    if (!form.nome.trim()) e.nome = 'Informe o nome do setor.';
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
      codigo: form.codigo.trim() || null,
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
    };

    const { error } = editando
      ? await supabase.from('setores').update(payload).eq('id', id!)
      : await supabase.from('setores').insert(payload);

    setSalvando(false);

    if (error) {
      setErroGeral(
        error.code === '23505' ? 'Já existe um setor com este nome.' : error.message
      );
      return;
    }
    navigate('/setores', { replace: true });
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
          onClick={() => navigate('/setores')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar setor' : 'Novo setor'}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full pb-32">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erroGeral}
          </div>
        )}

        <Secao icone="account_tree" titulo="Dados do setor">
          <Campo
            rotulo="Nome do setor"
            name="nome"
            placeholder="Ex.: Campo, Manutenção, Administrativo"
            value={form.nome}
            onChange={(e) => set('nome', e.target.value)}
            erro={erros.nome}
            autoFocus
          />
          <Campo
            rotulo="Código (opcional)"
            name="codigo"
            placeholder="Código interno do setor"
            value={form.codigo}
            onChange={(e) => set('codigo', e.target.value)}
          />
          <AreaTexto
            rotulo="Descrição (opcional)"
            name="descricao"
            placeholder="Detalhes sobre as atividades do setor"
            value={form.descricao}
            onChange={(e) => set('descricao', e.target.value)}
          />
        </Secao>
      </div>

      <footer className="fixed bottom-0 left-0 md:left-80 right-0 bg-surface-container-lowest p-4 border-t border-outline-variant flex gap-3 z-30 pb-24 md:pb-4">
        <div className="flex gap-3 w-full max-w-3xl mx-auto md:mx-0 md:ml-md">
          <Botao
            type="button"
            variante="secundario"
            className="flex-1"
            onClick={() => navigate('/setores')}
          >
            Cancelar
          </Botao>
          <Botao type="submit" icone="save" carregando={salvando} className="flex-1">
            {salvando ? 'Salvando...' : 'Salvar setor'}
          </Botao>
        </div>
      </footer>
    </form>
  );
}
