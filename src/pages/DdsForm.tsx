import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Secao, Campo, AreaTexto, Botao } from '@/components/ui/Form';

type FormState = {
  data: string;
  tema: string;
  responsavel: string;
  quantidade_participantes: string;
  observacao: string;
};

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

const VAZIO: FormState = {
  data: '',
  tema: '',
  responsavel: '',
  quantidade_participantes: '',
  observacao: '',
};

export default function DdsForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { empresaAtiva } = useAuth();

  const [form, setForm] = useState<FormState>(() => ({ ...VAZIO, data: hoje() }));
  const [erros, setErros] = useState<Partial<Record<keyof FormState, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(editando);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !empresaAtiva) return;
    daEmpresa(supabase.from('dds_registros').select('*'), empresaAtiva.empresa_id)
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) setErroGeral(error.message);
        else if (data)
          setForm({
            data: data.data ?? hoje(),
            tema: data.tema ?? '',
            responsavel: data.responsavel ?? '',
            quantidade_participantes:
              data.quantidade_participantes != null ? String(data.quantidade_participantes) : '',
            observacao: data.observacao ?? '',
          });
        setCarregando(false);
      });
  }, [id, empresaAtiva]);

  function set<K extends keyof FormState>(campo: K, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  function validar() {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.data) e.data = 'Informe a data.';
    if (!form.tema.trim()) e.tema = 'Informe o tema do DDS.';
    if (
      form.quantidade_participantes &&
      (!Number.isInteger(Number(form.quantidade_participantes)) ||
        Number(form.quantidade_participantes) < 0)
    )
      e.quantidade_participantes = 'Informe uma quantidade válida.';
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
      data: form.data,
      tema: form.tema.trim(),
      responsavel: form.responsavel.trim() || null,
      quantidade_participantes: form.quantidade_participantes
        ? Number(form.quantidade_participantes)
        : null,
      observacao: form.observacao.trim() || null,
    };

    const { error } = editando
      ? await supabase.from('dds_registros').update(payload).eq('id', id!)
      : await supabase.from('dds_registros').insert(payload);

    setSalvando(false);

    if (error) {
      setErroGeral(error.message);
      return;
    }
    navigate('/dds', { replace: true });
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
          onClick={() => navigate('/dds')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar DDS' : 'Novo DDS'}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erroGeral}
          </div>
        )}

        <Secao icone="forum" titulo="Diálogo de segurança">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo
              rotulo="Data"
              name="data"
              type="date"
              value={form.data}
              onChange={(e) => set('data', e.target.value)}
              erro={erros.data}
              autoFocus
            />
            <Campo
              rotulo="Quantidade de participantes (opcional)"
              name="quantidade_participantes"
              type="number"
              min={0}
              placeholder="Ex.: 12"
              value={form.quantidade_participantes}
              onChange={(e) => set('quantidade_participantes', e.target.value)}
              erro={erros.quantidade_participantes}
            />
          </div>

          <Campo
            rotulo="Tema"
            name="tema"
            placeholder="Ex.: Uso correto de EPI, riscos de queda, ergonomia..."
            value={form.tema}
            onChange={(e) => set('tema', e.target.value)}
            erro={erros.tema}
          />

          <Campo
            rotulo="Responsável (opcional)"
            name="responsavel"
            placeholder="Ex.: nome de quem conduziu o diálogo"
            value={form.responsavel}
            onChange={(e) => set('responsavel', e.target.value)}
          />

          <AreaTexto
            rotulo="Observações (opcional)"
            name="observacao"
            placeholder="Ex.: pontos levantados pelos participantes, encaminhamentos, etc."
            value={form.observacao}
            onChange={(e) => set('observacao', e.target.value)}
          />
        </Secao>
      </div>

      <footer className="flex gap-3 px-margin-mobile md:px-md py-4 mt-2 max-w-3xl w-full border-t border-outline-variant">
        <Botao type="button" variante="secundario" className="flex-1" onClick={() => navigate('/dds')}>
          Cancelar
        </Botao>
        <Botao type="submit" icone="save" carregando={salvando} className="flex-1">
          {salvando ? 'Salvando...' : 'Salvar DDS'}
        </Botao>
      </footer>
    </form>
  );
}
