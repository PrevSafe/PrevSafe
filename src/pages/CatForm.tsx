import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Secao, Campo, Seletor, AreaTexto, Botao } from '@/components/ui/Form';

type TipoCat = 'inicial' | 'reabertura' | 'obito';

const TIPO_CAT_LABEL: Record<TipoCat, string> = {
  inicial: 'Inicial',
  reabertura: 'Reabertura',
  obito: 'Comunicação de óbito',
};

type FormState = {
  data_acidente: string;
  data_emissao: string;
  tipo: TipoCat;
  numero_cat: string;
  observacao: string;
};

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export default function CatForm() {
  const { afastamentoId } = useParams();
  const navigate = useNavigate();
  const { empresaAtiva } = useAuth();

  const [catId, setCatId] = useState<string | null>(null);
  const [funcionarioNome, setFuncionarioNome] = useState('');
  const [form, setForm] = useState<FormState>(() => ({
    data_acidente: '',
    data_emissao: hoje(),
    tipo: 'inicial',
    numero_cat: '',
    observacao: '',
  }));
  const [erros, setErros] = useState<Partial<Record<keyof FormState, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaAtiva || !afastamentoId) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    const empresaId = empresaAtiva.empresa_id;

    async function carregar() {
      const { data: afastamento, error: erroAfastamento } = await daEmpresa(
        supabase.from('funcionarios_afastamentos').select('data_inicio, funcionarios(nome)'),
        empresaId
      )
        .eq('id', afastamentoId!)
        .single();
      if (!ativo) return;
      if (erroAfastamento) {
        setErroGeral(erroAfastamento.message);
        setCarregando(false);
        return;
      }
      const funcionario = afastamento.funcionarios as unknown as { nome: string } | null;
      setFuncionarioNome(funcionario?.nome ?? '');
      setForm((f) => ({ ...f, data_acidente: afastamento.data_inicio ?? f.data_acidente }));

      const { data: cat } = await supabase
        .from('cat_comunicacoes')
        .select('*')
        .eq('afastamento_id', afastamentoId!)
        .limit(1)
        .maybeSingle();
      if (cat) {
        setCatId(cat.id);
        setForm({
          data_acidente: cat.data_acidente,
          data_emissao: cat.data_emissao ?? hoje(),
          tipo: cat.tipo as TipoCat,
          numero_cat: cat.numero_cat ?? '',
          observacao: cat.observacao ?? '',
        });
      }

      setCarregando(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [afastamentoId, empresaAtiva]);

  function set<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  function validar() {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.data_acidente) e.data_acidente = 'Informe a data do acidente.';
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setErroGeral(null);
    if (!validar() || !empresaAtiva || !afastamentoId) return;
    setSalvando(true);

    const { data: afastamento, error: erroAfastamento } = await daEmpresa(
      supabase.from('funcionarios_afastamentos').select('funcionario_id'),
      empresaAtiva.empresa_id
    )
      .eq('id', afastamentoId)
      .single();
    if (erroAfastamento) {
      setSalvando(false);
      setErroGeral(erroAfastamento.message);
      return;
    }

    const payload = {
      empresa_id: empresaAtiva.empresa_id,
      afastamento_id: afastamentoId,
      funcionario_id: afastamento.funcionario_id,
      data_acidente: form.data_acidente,
      data_emissao: form.data_emissao,
      tipo: form.tipo,
      numero_cat: form.numero_cat.trim() || null,
      observacao: form.observacao.trim() || null,
    };

    const { error } = catId
      ? await supabase.from('cat_comunicacoes').update(payload).eq('id', catId)
      : await supabase.from('cat_comunicacoes').insert(payload);

    setSalvando(false);

    if (error) {
      setErroGeral(error.message);
      return;
    }
    navigate(`/afastamentos/${afastamentoId}`, { replace: true });
  }

  if (carregando) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span>
      </div>
    );
  }

  return (
    <form onSubmit={salvar} className="flex-1 flex flex-col">
      <header className="sticky top-0 md:top-0 z-20 flex items-center bg-surface-container-lowest px-margin-mobile md:px-md py-4 border-b border-outline-variant gap-2">
        <button
          type="button"
          onClick={() => navigate(`/afastamentos/${afastamentoId}`)}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {catId ? 'Editar CAT' : 'Emitir CAT'} {funcionarioNome && `— ${funcionarioNome}`}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">{erroGeral}</div>
        )}

        <Secao icone="report" titulo="Comunicação de Acidente de Trabalho (S-2210)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo
              rotulo="Data do acidente"
              name="data_acidente"
              type="date"
              value={form.data_acidente}
              onChange={(e) => set('data_acidente', e.target.value)}
              erro={erros.data_acidente}
              autoFocus
            />
            <Campo
              rotulo="Data de emissão"
              name="data_emissao"
              type="date"
              value={form.data_emissao}
              onChange={(e) => set('data_emissao', e.target.value)}
            />
          </div>

          <Seletor rotulo="Tipo" name="tipo" value={form.tipo} onChange={(e) => set('tipo', e.target.value as TipoCat)}>
            {(Object.keys(TIPO_CAT_LABEL) as TipoCat[]).map((t) => (
              <option key={t} value={t}>
                {TIPO_CAT_LABEL[t]}
              </option>
            ))}
          </Seletor>

          <Campo
            rotulo="Número da CAT (opcional)"
            name="numero_cat"
            placeholder="Número de recibo do eSocial/INSS, quando houver"
            value={form.numero_cat}
            onChange={(e) => set('numero_cat', e.target.value)}
          />
        </Secao>

        <Secao icone="notes" titulo="Observações">
          <AreaTexto
            rotulo="Observações (opcional)"
            name="observacao"
            value={form.observacao}
            onChange={(e) => set('observacao', e.target.value)}
          />
        </Secao>
      </div>

      <footer className="flex gap-3 px-margin-mobile md:px-md py-4 mt-2 max-w-3xl w-full border-t border-outline-variant">
        <Botao type="button" variante="secundario" className="flex-1" onClick={() => navigate(`/afastamentos/${afastamentoId}`)}>
          Cancelar
        </Botao>
        <Botao type="submit" icone="save" carregando={salvando} className="flex-1">
          {salvando ? 'Salvando...' : 'Salvar CAT'}
        </Botao>
      </footer>
    </form>
  );
}
