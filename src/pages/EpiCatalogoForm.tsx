import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Secao, Campo, Seletor, Botao } from '@/components/ui/Form';

type Form = {
  nome: string;
  ca: string;
  vida_util_dias: string;
  ativo: 'true' | 'false';
};

const VAZIO: Form = {
  nome: '',
  ca: '',
  vida_util_dias: '',
  ativo: 'true',
};

const so = (v: string) => v.replace(/\D/g, '');

export default function EpiCatalogoForm() {
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
    daEmpresa(supabase.from('epis').select('*'), empresaAtiva.empresa_id)
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) setErroGeral(error.message);
        else if (data)
          setForm({
            nome: data.nome ?? '',
            ca: data.ca ?? '',
            vida_util_dias: data.vida_util_dias != null ? String(data.vida_util_dias) : '',
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
    if (!form.nome.trim()) e.nome = 'Informe o nome do equipamento.';
    const caDigits = so(form.ca);
    if (!caDigits) e.ca = 'Informe o número do CA.';
    if (form.vida_util_dias && (!Number.isInteger(Number(form.vida_util_dias)) || Number(form.vida_util_dias) <= 0))
      e.vida_util_dias = 'Informe um número de dias válido.';
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
      nome: form.nome.trim(),
      ca: so(form.ca),
      vida_util_dias: form.vida_util_dias ? Number(form.vida_util_dias) : null,
      ativo: form.ativo === 'true',
    };

    const { error } = editando
      ? await supabase.from('epis').update(payload).eq('id', id!)
      : await supabase.from('epis').insert(payload);

    setSalvando(false);

    if (error) {
      setErroGeral(
        error.code === '23505' ? 'Já existe um equipamento cadastrado com este CA.' : error.message
      );
      return;
    }
    navigate('/epi/catalogo', { replace: true });
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
          onClick={() => navigate('/epi/catalogo')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar tipo de EPI' : 'Novo tipo de EPI'}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erroGeral}
          </div>
        )}

        <Secao icone="engineering" titulo="Dados do equipamento">
          <Campo
            rotulo="Nome do equipamento"
            name="nome"
            placeholder="Ex.: Capacete de segurança, Luva de raspa"
            value={form.nome}
            onChange={(e) => set('nome', e.target.value)}
            erro={erros.nome}
            autoFocus
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo
              rotulo="CA (Certificado de Aprovação)"
              name="ca"
              inputMode="numeric"
              placeholder="00000"
              value={form.ca}
              onChange={(e) => set('ca', so(e.target.value))}
              erro={erros.ca}
            />
            <Campo
              rotulo="Vida útil em dias (opcional)"
              name="vida_util_dias"
              type="number"
              min={1}
              placeholder="Ex.: 180"
              value={form.vida_util_dias}
              onChange={(e) => set('vida_util_dias', e.target.value)}
              erro={erros.vida_util_dias}
              dica="Usada para sugerir a data de validade nas entregas."
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
              dica="Equipamentos inativos deixam de aparecer na seleção ao registrar novas entregas."
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
          onClick={() => navigate('/epi/catalogo')}
        >
          Cancelar
        </Botao>
        <Botao type="submit" icone="save" carregando={salvando} className="flex-1">
          {salvando ? 'Salvando...' : 'Salvar equipamento'}
        </Botao>
      </footer>
    </form>
  );
}
