import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Secao, Campo, Seletor, Botao } from '@/components/ui/Form';

type Cargo = { id: string; nome: string };

type Form = {
  cargo_id: string;
  norma_regulamentadora: string;
  nome_treinamento: string;
  carga_horaria: string;
  periodicidade_meses: string;
};

const VAZIO: Form = {
  cargo_id: '',
  norma_regulamentadora: '',
  nome_treinamento: '',
  carga_horaria: '',
  periodicidade_meses: '',
};

export default function TreinamentoObrigatorioForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { empresaAtiva, can } = useAuth();
  const podeSalvar = can('treinamentos_obrigatorios', editando ? 'editar' : 'criar');

  const [form, setForm] = useState<Form>(VAZIO);
  const [erros, setErros] = useState<Partial<Record<keyof Form, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const [cargos, setCargos] = useState<Cargo[]>([]);

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    const empresaId = empresaAtiva.empresa_id;

    async function carregar() {
      const { data: rc, error: erroCargos } = await daEmpresa(
        supabase.from('cargos').select('id, nome').eq('ativo', true),
        empresaId
      ).order('nome');
      if (!ativo) return;

      if (erroCargos) {
        setErroGeral(erroCargos.message);
        setCarregando(false);
        return;
      }
      setCargos((rc ?? []) as Cargo[]);

      if (id) {
        const { data, error } = await daEmpresa(
          supabase.from('treinamentos_obrigatorios').select('*'),
          empresaId
        )
          .eq('id', id)
          .single();
        if (!ativo) return;
        if (error) {
          setErroGeral(
            error.code === 'PGRST116' ? 'Obrigatoriedade não encontrada.' : error.message
          );
          setCarregando(false);
          return;
        }
        if (data)
          setForm({
            cargo_id: data.cargo_id ?? '',
            norma_regulamentadora: data.norma_regulamentadora ?? '',
            nome_treinamento: data.nome_treinamento ?? '',
            carga_horaria: data.carga_horaria != null ? String(data.carga_horaria) : '',
            periodicidade_meses:
              data.periodicidade_meses != null ? String(data.periodicidade_meses) : '',
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
    if (!form.cargo_id) e.cargo_id = 'Selecione o cargo.';
    if (!form.norma_regulamentadora.trim())
      e.norma_regulamentadora = 'Informe a norma regulamentadora.';
    if (!form.nome_treinamento.trim())
      e.nome_treinamento = 'Informe o nome do treinamento.';
    if (
      form.carga_horaria &&
      (!Number.isInteger(Number(form.carga_horaria)) || Number(form.carga_horaria) <= 0)
    )
      e.carga_horaria = 'Informe uma carga horária válida.';
    if (
      !form.periodicidade_meses ||
      !Number.isInteger(Number(form.periodicidade_meses)) ||
      Number(form.periodicidade_meses) <= 0
    )
      e.periodicidade_meses = 'Informe a periodicidade de reciclagem em meses.';
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
      cargo_id: form.cargo_id,
      norma_regulamentadora: form.norma_regulamentadora.trim().toUpperCase(),
      nome_treinamento: form.nome_treinamento.trim(),
      carga_horaria: form.carga_horaria ? Number(form.carga_horaria) : null,
      periodicidade_meses: Number(form.periodicidade_meses),
    };

    const { error } = editando
      ? await supabase.from('treinamentos_obrigatorios').update(payload).eq('id', id!)
      : await supabase.from('treinamentos_obrigatorios').insert(payload);

    setSalvando(false);

    if (error) {
      setErroGeral(
        error.code === '23505'
          ? 'Já existe uma obrigatoriedade cadastrada para este cargo com esta norma.'
          : error.message
      );
      return;
    }
    navigate('/treinamentos-obrigatorios', { replace: true });
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
          onClick={() => navigate('/treinamentos-obrigatorios')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar obrigatoriedade' : 'Nova obrigatoriedade'}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erroGeral}
          </div>
        )}

        {cargos.length === 0 ? (
          <div className="flex items-start gap-2 bg-[#F97316]/10 text-[#9a3412] px-3 py-2 rounded-lg text-label-sm">
            <span className="material-symbols-outlined text-[16px] mt-px">warning</span>
            <span>
              Nenhum cargo ativo cadastrado ainda. Cadastre um cargo antes de definir uma
              obrigatoriedade de treinamento.
            </span>
          </div>
        ) : (
          <Secao icone="assignment_turned_in" titulo="Obrigatoriedade">
            <Seletor
              rotulo="Cargo"
              name="cargo_id"
              value={form.cargo_id}
              onChange={(e) => set('cargo_id', e.target.value)}
              erro={erros.cargo_id}
              autoFocus
            >
              <option value="">Selecione o cargo</option>
              {cargos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Seletor>

            <Campo
              rotulo="Norma regulamentadora"
              name="norma_regulamentadora"
              placeholder="Ex.: NR-35"
              value={form.norma_regulamentadora}
              onChange={(e) => set('norma_regulamentadora', e.target.value)}
              erro={erros.norma_regulamentadora}
            />

            <Campo
              rotulo="Nome do treinamento"
              name="nome_treinamento"
              placeholder="Ex.: Trabalho em Altura"
              value={form.nome_treinamento}
              onChange={(e) => set('nome_treinamento', e.target.value)}
              erro={erros.nome_treinamento}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Campo
                rotulo="Periodicidade de reciclagem (meses)"
                name="periodicidade_meses"
                type="number"
                min={1}
                placeholder="Ex.: 12"
                value={form.periodicidade_meses}
                onChange={(e) => set('periodicidade_meses', e.target.value)}
                erro={erros.periodicidade_meses}
                dica="De quantos em quantos meses a reciclagem é exigida"
              />
            </div>
          </Secao>
        )}
      </div>

      <footer className="flex gap-3 px-margin-mobile md:px-md py-4 mt-2 max-w-3xl w-full border-t border-outline-variant">
        <Botao
          type="button"
          variante="secundario"
          className="flex-1"
          onClick={() => navigate('/treinamentos-obrigatorios')}
        >
          {editando ? 'Voltar' : 'Cancelar'}
        </Botao>
        {podeSalvar && (
          <Botao
            type="submit"
            icone="save"
            carregando={salvando}
            disabled={cargos.length === 0}
            className="flex-1"
          >
            {salvando ? 'Salvando...' : 'Salvar obrigatoriedade'}
          </Botao>
        )}
      </footer>
    </form>
  );
}
