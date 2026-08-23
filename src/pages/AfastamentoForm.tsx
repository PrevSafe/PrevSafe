import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Secao, Campo, Seletor, AreaTexto, Botao } from '@/components/ui/Form';
import { MOTIVO_AFASTAMENTO_LABEL, acidentario, type MotivoAfastamento } from '@/lib/afastamentos';

type Funcionario = { id: string; nome: string };
type Cid10 = { codigo: string; descricao: string };

type FormState = {
  funcionario_id: string;
  data_inicio: string;
  data_fim: string;
  motivo: MotivoAfastamento;
  cid10_codigo: string;
  observacao: string;
};

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

const VAZIO: FormState = {
  funcionario_id: '',
  data_inicio: '',
  data_fim: '',
  motivo: 'doenca_nao_ocupacional',
  cid10_codigo: '',
  observacao: '',
};

export default function AfastamentoForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { empresaAtiva } = useAuth();
  const [searchParams] = useSearchParams();
  const funcionarioPreselecionado = searchParams.get('funcionario_id') ?? '';

  const [form, setForm] = useState<FormState>(() => ({
    ...VAZIO,
    funcionario_id: funcionarioPreselecionado,
    data_inicio: hoje(),
  }));
  const [erros, setErros] = useState<Partial<Record<keyof FormState, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [cid10Busca, setCid10Busca] = useState('');
  const [cid10Resultados, setCid10Resultados] = useState<Cid10[]>([]);
  const [temCat, setTemCat] = useState(false);

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    const empresaId = empresaAtiva.empresa_id;

    async function carregar() {
      const { data: rf, error: erroFunc } = await daEmpresa(supabase.from('funcionarios').select('id, nome'), empresaId)
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
        const { data, error } = await daEmpresa(supabase.from('funcionarios_afastamentos').select('*'), empresaId)
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
          data_inicio: data.data_inicio ?? hoje(),
          data_fim: data.data_fim ?? '',
          motivo: (data.motivo as MotivoAfastamento) ?? 'doenca_nao_ocupacional',
          cid10_codigo: data.cid10_codigo ?? '',
          observacao: data.observacao ?? '',
        });
        if (data.cid10_codigo) {
          const { data: cid } = await supabase.from('cid10').select('codigo, descricao').eq('codigo', data.cid10_codigo).single();
          if (cid) setCid10Busca(`${cid.codigo} — ${cid.descricao}`);
        }
        const { data: cat } = await supabase.from('cat_comunicacoes').select('id').eq('afastamento_id', id).limit(1).maybeSingle();
        setTemCat(Boolean(cat));
      }

      setCarregando(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [id, empresaAtiva]);

  useEffect(() => {
    const termo = cid10Busca.trim();
    if (termo.length < 2) {
      setCid10Resultados([]);
      return;
    }
    let ativo = true;
    const buscar = setTimeout(async () => {
      const { data } = await supabase
        .from('cid10')
        .select('codigo, descricao')
        .or(`codigo.ilike.${termo}%,descricao.ilike.%${termo}%`)
        .limit(20);
      if (ativo) setCid10Resultados((data ?? []) as Cid10[]);
    }, 250);
    return () => {
      ativo = false;
      clearTimeout(buscar);
    };
  }, [cid10Busca]);

  function set<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  function selecionarCid(cid: Cid10) {
    set('cid10_codigo', cid.codigo);
    setCid10Busca(`${cid.codigo} — ${cid.descricao}`);
    setCid10Resultados([]);
  }

  function validar() {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.funcionario_id) e.funcionario_id = 'Selecione o funcionário.';
    if (!form.data_inicio) e.data_inicio = 'Informe a data de início.';
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
      data_inicio: form.data_inicio,
      data_fim: form.data_fim || null,
      motivo: form.motivo,
      cid10_codigo: form.cid10_codigo || null,
      observacao: form.observacao.trim() || null,
    };

    const { data: salvo, error } = editando
      ? await supabase.from('funcionarios_afastamentos').update(payload).eq('id', id!).select('id').single()
      : await supabase.from('funcionarios_afastamentos').insert(payload).select('id').single();

    setSalvando(false);

    if (error) {
      setErroGeral(error.message);
      return;
    }
    if (!editando) {
      navigate(`/afastamentos/${salvo!.id}`, { replace: true });
      return;
    }
    navigate('/afastamentos', { replace: true });
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
          onClick={() => navigate('/afastamentos')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar afastamento' : 'Novo afastamento'}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">{erroGeral}</div>
        )}

        {funcionarios.length === 0 ? (
          <div className="flex items-start gap-2 bg-[#F97316]/10 text-[#9a3412] px-3 py-2 rounded-lg text-label-sm">
            <span className="material-symbols-outlined text-[16px] mt-px">warning</span>
            <span>Nenhum funcionário ativo cadastrado ainda. Cadastre um funcionário antes de registrar um afastamento.</span>
          </div>
        ) : (
          <>
            <Secao icone="event_busy" titulo="Afastamento">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Campo
                  rotulo="Data de início"
                  name="data_inicio"
                  type="date"
                  value={form.data_inicio}
                  onChange={(e) => set('data_inicio', e.target.value)}
                  erro={erros.data_inicio}
                />
                <Campo
                  rotulo="Data de fim (opcional)"
                  name="data_fim"
                  type="date"
                  value={form.data_fim}
                  onChange={(e) => set('data_fim', e.target.value)}
                  dica="Deixe em branco enquanto o afastamento estiver em aberto."
                />
              </div>

              <Seletor
                rotulo="Motivo"
                name="motivo"
                value={form.motivo}
                onChange={(e) => set('motivo', e.target.value as MotivoAfastamento)}
                dica="Acidente de trabalho e doença ocupacional exigem CAT (S-2210)."
              >
                {(Object.keys(MOTIVO_AFASTAMENTO_LABEL) as MotivoAfastamento[]).map((m) => (
                  <option key={m} value={m}>
                    {MOTIVO_AFASTAMENTO_LABEL[m]}
                  </option>
                ))}
              </Seletor>

              <div className="relative">
                <Campo
                  rotulo="CID-10 (opcional)"
                  name="cid10_busca"
                  placeholder="Busque por código ou descrição"
                  value={cid10Busca}
                  onChange={(e) => {
                    setCid10Busca(e.target.value);
                    set('cid10_codigo', '');
                  }}
                />
                {cid10Resultados.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-outline-variant bg-surface-container-lowest shadow-lg">
                    {cid10Resultados.map((cid) => (
                      <li key={cid.codigo}>
                        <button
                          type="button"
                          onClick={() => selecionarCid(cid)}
                          className="w-full text-left px-4 py-2 text-label-md hover:bg-surface-container"
                        >
                          <span className="font-medium">{cid.codigo}</span> — {cid.descricao}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Secao>

            <Secao icone="notes" titulo="Observações">
              <AreaTexto
                rotulo="Observações (opcional)"
                name="observacao"
                value={form.observacao}
                onChange={(e) => set('observacao', e.target.value)}
              />
            </Secao>

            {editando && acidentario(form.motivo) && (
              <div
                className={`rounded-lg px-4 py-3 flex items-center justify-between gap-3 ${
                  temCat ? 'bg-secondary-container/40 text-on-secondary-container' : 'bg-error-container text-on-error-container'
                }`}
              >
                <span className="text-label-md">{temCat ? 'CAT já emitida para este afastamento.' : 'Este afastamento ainda não tem CAT emitida.'}</span>
                <Link to={`/afastamentos/${id}/cat`} className="text-label-md underline underline-offset-2 font-medium shrink-0">
                  {temCat ? 'Ver CAT' : 'Emitir CAT'}
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      <footer className="flex gap-3 px-margin-mobile md:px-md py-4 mt-2 max-w-3xl w-full border-t border-outline-variant">
        <Botao type="button" variante="secundario" className="flex-1" onClick={() => navigate('/afastamentos')}>
          Cancelar
        </Botao>
        <Botao type="submit" icone="save" carregando={salvando} disabled={funcionarios.length === 0} className="flex-1">
          {salvando ? 'Salvando...' : 'Salvar afastamento'}
        </Botao>
      </footer>
    </form>
  );
}
