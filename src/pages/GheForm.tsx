import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Secao, Campo, Seletor, AreaTexto, Botao } from '@/components/ui/Form';

type Unidade = { id: string; razao_social: string; nome_fantasia: string | null };

type Form = {
  unidade_id: string;
  nome: string;
  descricao: string;
};

const VAZIO: Form = {
  unidade_id: '',
  nome: '',
  descricao: '',
};

export default function GheForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { empresaAtiva } = useAuth();

  const [form, setForm] = useState<Form>(VAZIO);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [erros, setErros] = useState<Partial<Record<keyof Form, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    const empresaId = empresaAtiva.empresa_id;

    async function carregar() {
      const ru = await daEmpresa(
        supabase.from('unidades').select('id, razao_social, nome_fantasia'),
        empresaId
      ).order('razao_social');
      if (!ativo) return;

      if (ru.error) {
        setErroGeral(ru.error.message);
        setCarregando(false);
        return;
      }
      setUnidades((ru.data ?? []) as Unidade[]);

      if (id) {
        const { data, error } = await daEmpresa(supabase.from('ghes').select('*'), empresaId)
          .eq('id', id)
          .single();
        if (!ativo) return;
        if (error) {
          setErroGeral(error.message);
          setCarregando(false);
          return;
        }
        setForm({
          unidade_id: data.unidade_id ?? '',
          nome: data.nome ?? '',
          descricao: data.descricao ?? '',
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
    if (!form.unidade_id) e.unidade_id = 'Selecione a unidade.';
    if (!form.nome.trim()) e.nome = 'Informe o nome do GHE.';
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
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
    };

    const { error } = editando
      ? await supabase.from('ghes').update(payload).eq('id', id!)
      : await supabase.from('ghes').insert(payload);

    setSalvando(false);

    if (error) {
      setErroGeral(error.message);
      return;
    }
    navigate('/ghe', { replace: true });
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
          onClick={() => navigate('/ghe')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar GHE' : 'Novo GHE'}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full pb-32">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erroGeral}
          </div>
        )}

        {unidades.length === 0 ? (
          <div className="flex items-start gap-2 bg-[#F97316]/10 text-[#9a3412] px-3 py-2 rounded-lg text-label-sm">
            <span className="material-symbols-outlined text-[16px] mt-px">warning</span>
            <span>Nenhuma unidade cadastrada ainda. Cadastre uma unidade antes de criar um GHE.</span>
          </div>
        ) : (
          <Secao icone="workspaces" titulo="Dados do GHE">
            <Campo
              rotulo="Nome do GHE"
              name="nome"
              placeholder="Ex.: Operadores de máquina — linha 1"
              value={form.nome}
              onChange={(e) => set('nome', e.target.value)}
              erro={erros.nome}
              autoFocus
            />
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
              rotulo="Descrição (opcional)"
              name="descricao"
              placeholder="Ex.: cargos, setores ou atividades que compõem este grupo de exposição"
              value={form.descricao}
              onChange={(e) => set('descricao', e.target.value)}
            />
          </Secao>
        )}
      </div>

      <footer className="fixed bottom-0 left-0 md:left-80 right-0 bg-surface-container-lowest p-4 border-t border-outline-variant flex gap-3 z-30 pb-24 md:pb-4">
        <div className="flex gap-3 w-full max-w-3xl mx-auto md:mx-0 md:ml-md">
          <Botao type="button" variante="secundario" className="flex-1" onClick={() => navigate('/ghe')}>
            Cancelar
          </Botao>
          <Botao
            type="submit"
            icone="save"
            carregando={salvando}
            disabled={unidades.length === 0}
            className="flex-1"
          >
            {salvando ? 'Salvando...' : 'Salvar GHE'}
          </Botao>
        </div>
      </footer>
    </form>
  );
}
