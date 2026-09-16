import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Secao, Campo, Seletor, AreaTexto, Botao } from '@/components/ui/Form';

type Ghe = { id: string; nome: string };

type Form = {
  codigo: string;
  nome: string;
  cbo: string;
  codigo_gfip: string;
  ghe_id: string;
  descricao_atividades: string;
};

const VAZIO: Form = {
  codigo: '',
  nome: '',
  cbo: '',
  codigo_gfip: '0',
  ghe_id: '',
  descricao_atividades: '',
};

const so = (v: string) => v.replace(/\D/g, '');

function mascaraCbo(v: string) {
  return so(v).slice(0, 6).replace(/(\d{4})(\d{1,2})/, '$1-$2');
}

const ALIQUOTA_SAT: Record<number, number> = { 2: 12, 3: 9, 4: 6 };

export default function CargoForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { empresaAtiva } = useAuth();

  const [form, setForm] = useState<Form>(VAZIO);
  const [ghes, setGhes] = useState<Ghe[]>([]);
  const [erros, setErros] = useState<Partial<Record<keyof Form, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(editando);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaAtiva) return;
    const empresaId = empresaAtiva.empresa_id;

    daEmpresa(supabase.from('ghes').select('id, nome'), empresaId)
      .order('nome')
      .then(({ data }) => setGhes((data ?? []) as Ghe[]));

    if (!id) return;
    daEmpresa(supabase.from('cargos').select('*'), empresaId)
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) setErroGeral(error.message);
        else if (data)
          setForm({
            codigo: data.codigo ?? '',
            nome: data.nome ?? '',
            cbo: mascaraCbo(data.cbo ?? ''),
            codigo_gfip: String(data.codigo_gfip ?? 0),
            ghe_id: data.ghe_id ?? '',
            descricao_atividades: data.descricao_atividades ?? '',
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
    if (!form.nome.trim()) e.nome = 'Informe o nome do cargo.';
    if (form.cbo && so(form.cbo).length !== 6) e.cbo = 'CBO deve ter 6 dígitos.';
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
      cbo: so(form.cbo) || null,
      codigo_gfip: Number(form.codigo_gfip),
      ghe_id: form.ghe_id || null,
      descricao_atividades: form.descricao_atividades.trim() || null,
    };

    const { error } = editando
      ? await supabase.from('cargos').update(payload).eq('id', id!)
      : await supabase.from('cargos').insert(payload);

    setSalvando(false);

    if (error) {
      setErroGeral(
        error.code === '23505' ? 'Já existe um cargo com este nome.' : error.message
      );
      return;
    }
    navigate('/cargos', { replace: true });
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

  const codigoGfipNum = Number(form.codigo_gfip);

  return (
    <form onSubmit={salvar} className="flex-1 flex flex-col">
      <header className="sticky top-0 md:top-0 z-20 flex items-center bg-surface-container-lowest px-margin-mobile md:px-md py-4 border-b border-outline-variant gap-2">
        <button
          type="button"
          onClick={() => navigate('/cargos')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar cargo' : 'Novo cargo'}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erroGeral}
          </div>
        )}

        <Secao icone="badge" titulo="Dados do cargo">
          <Campo
            rotulo="Nome do cargo"
            name="nome"
            placeholder="Ex.: Tratorista, Auxiliar de campo"
            value={form.nome}
            onChange={(e) => set('nome', e.target.value)}
            erro={erros.nome}
            autoFocus
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo
              rotulo="Código (opcional)"
              name="codigo"
              placeholder="Código interno do cargo"
              value={form.codigo}
              onChange={(e) => set('codigo', e.target.value)}
            />
            <Campo
              rotulo="CBO"
              name="cbo"
              placeholder="0000-00"
              inputMode="numeric"
              value={form.cbo}
              onChange={(e) => set('cbo', mascaraCbo(e.target.value))}
              erro={erros.cbo}
            />
          </div>
        </Secao>

        <Secao icone="shield_with_heart" titulo="Exposição a agentes nocivos (GFIP/SEFIP)">
          <Seletor
            rotulo="Código de ocorrência"
            name="codigo_gfip"
            value={form.codigo_gfip}
            onChange={(e) => set('codigo_gfip', e.target.value)}
            dica="Código de ocorrência da SEFIP/GFIP para o vínculo, conforme exposição a agentes nocivos."
          >
            <option value="0">0 — Nunca esteve exposto</option>
            <option value="1">1 — Já esteve exposto, neutralizado por proteção eficaz</option>
            <option value="2">2 — Especial 15 anos (SAT/RAT +12%)</option>
            <option value="3">3 — Especial 20 anos (SAT/RAT +9%)</option>
            <option value="4">4 — Especial 25 anos (SAT/RAT +6%)</option>
          </Seletor>
          {codigoGfipNum >= 2 && (
            <div className="flex items-start gap-2 bg-[#F97316]/10 text-[#9a3412] px-3 py-2 rounded-lg text-label-sm">
              <span className="material-symbols-outlined text-[16px] mt-px">warning</span>
              <span>
                Este código aplica alíquota suplementar de +{ALIQUOTA_SAT[codigoGfipNum]}% no
                SAT/RAT e exige laudo técnico (LTCAT/PGR) que comprove a exposição, além do envio
                do evento S-2240 no eSocial.
              </span>
            </div>
          )}
          <Seletor
            rotulo="GHE associado (opcional)"
            name="ghe_id"
            value={form.ghe_id}
            onChange={(e) => set('ghe_id', e.target.value)}
            dica="Define os riscos que o SST Linter cruza com os exames e EPIs dos trabalhadores deste cargo."
          >
            <option value="">Nenhum</option>
            {ghes.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
            ))}
          </Seletor>
        </Secao>

        <Secao icone="description" titulo="Atividades">
          <AreaTexto
            rotulo="Descrição das atividades (opcional)"
            name="descricao_atividades"
            placeholder="Descreva as atividades típicas do cargo"
            value={form.descricao_atividades}
            onChange={(e) => set('descricao_atividades', e.target.value)}
          />
        </Secao>
      </div>

      <footer className="flex gap-3 px-margin-mobile md:px-md py-4 mt-2 max-w-3xl w-full border-t border-outline-variant">
        <Botao
          type="button"
          variante="secundario"
          className="flex-1"
          onClick={() => navigate('/cargos')}
        >
          Cancelar
        </Botao>
        <Botao type="submit" icone="save" carregando={salvando} className="flex-1">
          {salvando ? 'Salvando...' : 'Salvar cargo'}
        </Botao>
      </footer>
    </form>
  );
}
