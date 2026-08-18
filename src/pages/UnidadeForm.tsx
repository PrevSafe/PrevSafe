import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Secao, Campo, Seletor, AreaTexto, Botao } from '@/components/ui/Form';

type Form = {
  razao_social: string;
  nome_fantasia: string;
  tipo_inscricao: string;
  numero_inscricao: string;
  inscricao_estadual: string;
  cnae_principal: string;
  cnae_secundario: string;
  grau_risco: string;
  cep: string;
  municipio: string;
  uf: string;
  logradouro: string;
};

const VAZIO: Form = {
  razao_social: '',
  nome_fantasia: '',
  tipo_inscricao: '1',
  numero_inscricao: '',
  inscricao_estadual: '',
  cnae_principal: '',
  cnae_secundario: '',
  grau_risco: '3',
  cep: '',
  municipio: '',
  uf: '',
  logradouro: '',
};

const so = (v: string) => v.replace(/\D/g, '');

function mascaraCnpj(v: string) {
  return so(v)
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function mascaraCep(v: string) {
  return so(v).slice(0, 8).replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

function mascaraCnae(v: string) {
  return so(v).slice(0, 7).replace(/(\d{4})(\d{1,2})/, '$1-$2').replace(/(-\d{2})(\d)/, '$1/$2');
}

/** Valida CNPJ pelos dois dígitos verificadores. */
function cnpjValido(cnpj: string) {
  const n = so(cnpj);
  if (n.length !== 14 || /^(\d)\1{13}$/.test(n)) return false;
  const calc = (base: string) => {
    let peso = base.length - 7;
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * peso--;
      if (peso < 2) peso = 9;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(n.slice(0, 12)) === Number(n[12]) && calc(n.slice(0, 13)) === Number(n[13]);
}

export default function UnidadeForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { empresaAtiva } = useAuth();

  const [form, setForm] = useState<Form>(VAZIO);
  const [erros, setErros] = useState<Partial<Record<keyof Form, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(editando);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !empresaAtiva) return;
    daEmpresa(supabase.from('unidades').select('*'), empresaAtiva.empresa_id)
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) setErroGeral(error.message);
        else if (data)
          setForm({
            razao_social: data.razao_social ?? '',
            nome_fantasia: data.nome_fantasia ?? '',
            tipo_inscricao: String(data.tipo_inscricao ?? 1),
            numero_inscricao: mascaraCnpj(data.numero_inscricao ?? ''),
            inscricao_estadual: data.inscricao_estadual ?? '',
            cnae_principal: mascaraCnae(data.cnae_principal ?? ''),
            cnae_secundario: mascaraCnae(data.cnae_secundario ?? ''),
            grau_risco: String(data.grau_risco ?? 3),
            cep: mascaraCep(data.cep ?? ''),
            municipio: data.municipio ?? '',
            uf: data.uf ?? '',
            logradouro: data.logradouro ?? '',
          });
        setCarregando(false);
      });
  }, [id, empresaAtiva]);

  function set<K extends keyof Form>(campo: K, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  /** Preenche endereço pelo CEP usando a API pública ViaCEP. */
  async function buscarCep(valor: string) {
    const cep = so(valor);
    if (cep.length !== 8) return;
    setBuscandoCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setForm((f) => ({
          ...f,
          municipio: d.localidade ?? f.municipio,
          uf: d.uf ?? f.uf,
          logradouro: [d.logradouro, d.bairro].filter(Boolean).join(', ') || f.logradouro,
        }));
      }
    } catch {
      // CEP é conveniência, não bloqueia o cadastro
    } finally {
      setBuscandoCep(false);
    }
  }

  function validar() {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!form.razao_social.trim()) e.razao_social = 'Informe a razão social.';
    const doc = so(form.numero_inscricao);
    if (!doc) e.numero_inscricao = 'Informe o número de inscrição.';
    else if (form.tipo_inscricao === '1' && !cnpjValido(doc))
      e.numero_inscricao = 'CNPJ inválido — confira os dígitos.';
    if (form.cep && so(form.cep).length !== 8) e.cep = 'CEP deve ter 8 dígitos.';
    if (form.uf && form.uf.length !== 2) e.uf = 'Use a sigla com 2 letras.';
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
      razao_social: form.razao_social.trim(),
      nome_fantasia: form.nome_fantasia.trim() || null,
      tipo_inscricao: Number(form.tipo_inscricao),
      numero_inscricao: so(form.numero_inscricao),
      inscricao_estadual: form.inscricao_estadual.trim() || null,
      cnae_principal: so(form.cnae_principal) || null,
      cnae_secundario: so(form.cnae_secundario) || null,
      grau_risco: Number(form.grau_risco),
      cep: so(form.cep) || null,
      municipio: form.municipio.trim() || null,
      uf: form.uf.trim().toUpperCase() || null,
      logradouro: form.logradouro.trim() || null,
    };

    const { error } = editando
      ? await supabase.from('unidades').update(payload).eq('id', id!)
      : await supabase.from('unidades').insert(payload);

    setSalvando(false);

    if (error) {
      setErroGeral(
        error.code === '23505'
          ? 'Já existe uma unidade com este número de inscrição.'
          : error.message
      );
      return;
    }
    navigate('/unidades', { replace: true });
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
          onClick={() => navigate('/unidades')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar unidade' : 'Nova unidade'}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full pb-32">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erroGeral}
          </div>
        )}

        <Secao icone="business" titulo="Dados da empresa">
          <Campo
            rotulo="Razão social"
            name="razao_social"
            placeholder="Digite a razão social oficial"
            value={form.razao_social}
            onChange={(e) => set('razao_social', e.target.value)}
            erro={erros.razao_social}
            autoFocus
          />
          <Campo
            rotulo="Nome fantasia"
            name="nome_fantasia"
            placeholder="Nome como a unidade é conhecida"
            value={form.nome_fantasia}
            onChange={(e) => set('nome_fantasia', e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Seletor
              rotulo="Tipo de inscrição"
              name="tipo_inscricao"
              value={form.tipo_inscricao}
              onChange={(e) => set('tipo_inscricao', e.target.value)}
            >
              <option value="1">CNPJ</option>
              <option value="3">CAEPF</option>
              <option value="4">CNO</option>
            </Seletor>
            <Campo
              rotulo="Número de inscrição"
              name="numero_inscricao"
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
              value={form.numero_inscricao}
              onChange={(e) => set('numero_inscricao', mascaraCnpj(e.target.value))}
              erro={erros.numero_inscricao}
            />
            <Campo
              rotulo="Inscrição estadual"
              name="inscricao_estadual"
              placeholder="Isento"
              value={form.inscricao_estadual}
              onChange={(e) => set('inscricao_estadual', e.target.value)}
            />
          </div>
        </Secao>

        <Secao icone="shield_with_heart" titulo="Atividade e risco">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo
              rotulo="CNAE principal"
              name="cnae_principal"
              placeholder="0000-0/00"
              inputMode="numeric"
              sufixoIcone="search"
              value={form.cnae_principal}
              onChange={(e) => set('cnae_principal', mascaraCnae(e.target.value))}
            />
            <Campo
              rotulo="CNAE secundário (opcional)"
              name="cnae_secundario"
              placeholder="0000-0/00"
              inputMode="numeric"
              value={form.cnae_secundario}
              onChange={(e) => set('cnae_secundario', mascaraCnae(e.target.value))}
            />
          </div>
          <Seletor
            rotulo="Grau de risco"
            name="grau_risco"
            value={form.grau_risco}
            onChange={(e) => set('grau_risco', e.target.value)}
            dica="Consulte o Quadro I da NR-04 para o CNAE informado. Define dimensionamento de SESMT e CIPA."
          >
            <option value="1">Grau 1</option>
            <option value="2">Grau 2</option>
            <option value="3">Grau 3</option>
            <option value="4">Grau 4</option>
          </Seletor>
          {Number(form.grau_risco) >= 3 && (
            <div className="flex items-center gap-2 bg-[#F97316]/10 text-[#9a3412] px-3 py-2 rounded-lg text-label-sm">
              <span className="material-symbols-outlined text-[16px]">warning</span>
              Grau {form.grau_risco} exige atenção reforçada no dimensionamento de SESMT e CIPA.
            </div>
          )}
        </Secao>

        <Secao icone="location_on" titulo="Endereço">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Campo
              rotulo="CEP"
              name="cep"
              placeholder="00000-000"
              inputMode="numeric"
              sufixoIcone={buscandoCep ? 'progress_activity' : 'travel_explore'}
              value={form.cep}
              onChange={(e) => set('cep', mascaraCep(e.target.value))}
              onBlur={(e) => buscarCep(e.target.value)}
              erro={erros.cep}
            />
            <Campo
              rotulo="Município"
              name="municipio"
              placeholder="Cidade"
              className="sm:col-span-2"
              value={form.municipio}
              onChange={(e) => set('municipio', e.target.value)}
            />
            <Campo
              rotulo="UF"
              name="uf"
              placeholder="BA"
              maxLength={2}
              value={form.uf}
              onChange={(e) => set('uf', e.target.value.toUpperCase())}
              erro={erros.uf}
            />
          </div>
          <AreaTexto
            rotulo="Endereço completo"
            name="logradouro"
            placeholder="Rua, número, bairro e complemento"
            value={form.logradouro}
            onChange={(e) => set('logradouro', e.target.value)}
          />
        </Secao>
      </div>

      <footer className="fixed bottom-0 left-0 md:left-80 right-0 bg-surface-container-lowest p-4 border-t border-outline-variant flex gap-3 z-30 pb-24 md:pb-4">
        <div className="flex gap-3 w-full max-w-3xl mx-auto md:mx-0 md:ml-md">
          <Botao
            type="button"
            variante="secundario"
            className="flex-1"
            onClick={() => navigate('/unidades')}
          >
            Cancelar
          </Botao>
          <Botao type="submit" icone="save" carregando={salvando} className="flex-1">
            {salvando ? 'Salvando...' : 'Salvar unidade'}
          </Botao>
        </div>
      </footer>
    </form>
  );
}
