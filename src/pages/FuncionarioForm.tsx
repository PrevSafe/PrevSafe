import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Secao, Campo, Seletor, Botao } from '@/components/ui/Form';
import { cpfValido, mascaraCpf, mascaraPis, mascaraTelefone } from '@/lib/funcionarios';

type StatusFuncionario = 'ativo' | 'afastado' | 'ferias' | 'desligado';
type MotivoMudanca = 'transferencia' | 'promocao' | 'retorno';

type Categoria = { codigo: number; grupo: string; descricao: string };
type LotacaoCatalogo = { id: string; unidade_id: string; setor_id: string; cargo_id: string | null };
type Unidade = { id: string; razao_social: string; nome_fantasia: string | null };
type Setor = { id: string; nome: string };
type Cargo = { id: string; nome: string };
type LotacaoHistorico = {
  id: string;
  lotacao_id: string;
  data_inicio: string;
  data_fim: string | null;
  motivo: string;
};

type FormState = {
  codigo: string;
  nome: string;
  data_nascimento: string;
  nacionalidade: string;
  naturalidade: string;
  cpf: string;
  rg: string;
  rg_orgao: string;
  rg_uf: string;
  rg_expedicao: string;
  pis: string;
  ctps: string;
  ctps_serie: string;
  ctps_uf: string;
  matricula_esocial: string;
  cod_categoria: string;
  unidade_id: string;
  setor_id: string;
  cargo_id: string;
  data_admissao: string;
  telefone: string;
  email: string;
  status: StatusFuncionario;
  data_desligamento: string;
  data_mudanca: string;
  motivo_mudanca: MotivoMudanca;
};

const so = (v: string) => v.replace(/\D/g, '');

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function diaAnterior(dataIso: string) {
  const d = new Date(`${dataIso}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function formatarData(iso: string | null) {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

const MOTIVO_LABEL: Record<string, string> = {
  admissao: 'Admissão',
  transferencia: 'Transferência',
  promocao: 'Promoção',
  retorno: 'Retorno',
  desligamento: 'Desligamento',
};

const VAZIO: FormState = {
  codigo: '',
  nome: '',
  data_nascimento: '',
  nacionalidade: 'Brasileira',
  naturalidade: '',
  cpf: '',
  rg: '',
  rg_orgao: '',
  rg_uf: '',
  rg_expedicao: '',
  pis: '',
  ctps: '',
  ctps_serie: '',
  ctps_uf: '',
  matricula_esocial: '',
  cod_categoria: '',
  unidade_id: '',
  setor_id: '',
  cargo_id: '',
  data_admissao: '',
  telefone: '',
  email: '',
  status: 'ativo',
  data_desligamento: '',
  data_mudanca: '',
  motivo_mudanca: 'transferencia',
};

export default function FuncionarioForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { perfil } = useAuth();

  const [form, setForm] = useState<FormState>(() => ({ ...VAZIO, data_mudanca: hoje() }));
  const [erros, setErros] = useState<Partial<Record<keyof FormState, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [lotacoesCatalogo, setLotacoesCatalogo] = useState<LotacaoCatalogo[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [historico, setHistorico] = useState<LotacaoHistorico[]>([]);
  const [lotacaoAbertaId, setLotacaoAbertaId] = useState<string | null>(null);
  const [lotacaoOriginalId, setLotacaoOriginalId] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const [rc, rl, ru, rs, rcg] = await Promise.all([
        supabase.from('categorias_trabalhador_esocial').select('codigo, grupo, descricao').order('codigo'),
        supabase.from('lotacoes').select('id, unidade_id, setor_id, cargo_id'),
        supabase.from('unidades').select('id, razao_social, nome_fantasia').order('razao_social'),
        supabase.from('setores').select('id, nome').order('nome'),
        supabase.from('cargos').select('id, nome').order('nome'),
      ]);
      if (!ativo) return;

      const erroBase = rc.error ?? rl.error ?? ru.error ?? rs.error ?? rcg.error;
      if (erroBase) {
        setErroGeral(erroBase.message);
        setCarregando(false);
        return;
      }

      const catalogoData = (rl.data ?? []) as LotacaoCatalogo[];
      setCategorias((rc.data ?? []) as Categoria[]);
      setLotacoesCatalogo(catalogoData);
      setUnidades((ru.data ?? []) as Unidade[]);
      setSetores((rs.data ?? []) as Setor[]);
      setCargos((rcg.data ?? []) as Cargo[]);

      if (id) {
        const [rf, rh] = await Promise.all([
          supabase.from('funcionarios').select('*').eq('id', id).single(),
          supabase
            .from('funcionarios_lotacoes')
            .select('id, lotacao_id, data_inicio, data_fim, motivo')
            .eq('funcionario_id', id)
            .order('data_inicio', { ascending: false }),
        ]);
        if (!ativo) return;

        if (rf.error) {
          setErroGeral(rf.error.message);
          setCarregando(false);
          return;
        }

        const f = rf.data;
        const historicoData = (rh.data ?? []) as LotacaoHistorico[];
        setHistorico(historicoData);

        const aberta = historicoData.find((h) => h.data_fim === null) ?? null;
        const lot = aberta ? catalogoData.find((l) => l.id === aberta.lotacao_id) : undefined;

        setForm({
          codigo: f.codigo ?? '',
          nome: f.nome ?? '',
          data_nascimento: f.data_nascimento ?? '',
          nacionalidade: f.nacionalidade ?? '',
          naturalidade: f.naturalidade ?? '',
          cpf: mascaraCpf(f.cpf ?? ''),
          rg: f.rg ?? '',
          rg_orgao: f.rg_orgao ?? '',
          rg_uf: f.rg_uf ?? '',
          rg_expedicao: f.rg_expedicao ?? '',
          pis: mascaraPis(f.pis ?? ''),
          ctps: f.ctps ?? '',
          ctps_serie: f.ctps_serie ?? '',
          ctps_uf: f.ctps_uf ?? '',
          matricula_esocial: f.matricula_esocial ?? '',
          cod_categoria: f.cod_categoria != null ? String(f.cod_categoria) : '',
          unidade_id: lot?.unidade_id ?? '',
          setor_id: lot?.setor_id ?? '',
          cargo_id: lot?.cargo_id ?? '',
          data_admissao: f.data_admissao ?? '',
          telefone: mascaraTelefone(f.telefone ?? ''),
          email: f.email ?? '',
          status: (f.status as StatusFuncionario) ?? 'ativo',
          data_desligamento: f.data_desligamento ?? '',
          data_mudanca: hoje(),
          motivo_mudanca: 'transferencia',
        });
        setLotacaoAbertaId(aberta?.id ?? null);
        setLotacaoOriginalId(aberta?.lotacao_id ?? null);
      }

      setCarregando(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [id]);

  function set<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  function mudarUnidade(valor: string) {
    setForm((f) => ({ ...f, unidade_id: valor, setor_id: '', cargo_id: '' }));
    setErros((e) => ({ ...e, unidade_id: undefined, setor_id: undefined, cargo_id: undefined }));
  }

  function mudarSetor(valor: string) {
    setForm((f) => ({ ...f, setor_id: valor, cargo_id: '' }));
    setErros((e) => ({ ...e, setor_id: undefined, cargo_id: undefined }));
  }

  const gruposCategorias = useMemo(() => {
    const mapa = new Map<string, Categoria[]>();
    for (const c of categorias) {
      if (!mapa.has(c.grupo)) mapa.set(c.grupo, []);
      mapa.get(c.grupo)!.push(c);
    }
    return Array.from(mapa.entries()).map(([nome, itens]) => ({ nome, itens }));
  }, [categorias]);

  const unidadesDisponiveis = useMemo(() => {
    const ids = new Set(lotacoesCatalogo.map((l) => l.unidade_id));
    return unidades
      .filter((u) => ids.has(u.id))
      .sort((a, b) => (a.nome_fantasia || a.razao_social).localeCompare(b.nome_fantasia || b.razao_social));
  }, [lotacoesCatalogo, unidades]);

  const setoresDisponiveis = useMemo(() => {
    if (!form.unidade_id) return [];
    const ids = new Set(
      lotacoesCatalogo.filter((l) => l.unidade_id === form.unidade_id).map((l) => l.setor_id)
    );
    return setores.filter((s) => ids.has(s.id)).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [form.unidade_id, lotacoesCatalogo, setores]);

  const cargosDisponiveis = useMemo(() => {
    if (!form.unidade_id || !form.setor_id) return [];
    const ids = new Set(
      lotacoesCatalogo
        .filter((l) => l.unidade_id === form.unidade_id && l.setor_id === form.setor_id && l.cargo_id)
        .map((l) => l.cargo_id as string)
    );
    return cargos.filter((c) => ids.has(c.id)).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [form.unidade_id, form.setor_id, lotacoesCatalogo, cargos]);

  const lotacaoIdSelecionada = useMemo(() => {
    if (!form.unidade_id || !form.setor_id || !form.cargo_id) return null;
    return (
      lotacoesCatalogo.find(
        (l) =>
          l.unidade_id === form.unidade_id && l.setor_id === form.setor_id && l.cargo_id === form.cargo_id
      )?.id ?? null
    );
  }, [form.unidade_id, form.setor_id, form.cargo_id, lotacoesCatalogo]);

  const lotacaoMudou =
    editando && lotacaoIdSelecionada !== null && lotacaoIdSelecionada !== lotacaoOriginalId;

  const unidadesPorId = useMemo(() => new Map(unidades.map((u) => [u.id, u])), [unidades]);
  const setoresPorId = useMemo(() => new Map(setores.map((s) => [s.id, s])), [setores]);
  const cargosPorId = useMemo(() => new Map(cargos.map((c) => [c.id, c])), [cargos]);
  const lotacoesPorId = useMemo(() => new Map(lotacoesCatalogo.map((l) => [l.id, l])), [lotacoesCatalogo]);

  function resolverLotacao(lotacaoId: string) {
    const lot = lotacoesPorId.get(lotacaoId);
    if (!lot) return '—';
    const unidade = unidadesPorId.get(lot.unidade_id);
    const setor = setoresPorId.get(lot.setor_id);
    const cargo = lot.cargo_id ? cargosPorId.get(lot.cargo_id) : null;
    const nomeUnidade = unidade ? unidade.nome_fantasia || unidade.razao_social : '—';
    return `${nomeUnidade} › ${setor?.nome ?? '—'} › ${cargo?.nome ?? 'Sem cargo definido'}`;
  }

  function validar() {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.nome.trim()) e.nome = 'Informe o nome completo.';

    const cpfDigits = so(form.cpf);
    if (!cpfDigits) e.cpf = 'Informe o CPF.';
    else if (!cpfValido(cpfDigits)) e.cpf = 'CPF inválido — confira os dígitos.';

    if (form.pis && so(form.pis).length !== 11) e.pis = 'PIS deve ter 11 dígitos.';
    if (form.rg_uf && form.rg_uf.length !== 2) e.rg_uf = 'Use a sigla com 2 letras.';
    if (form.ctps_uf && form.ctps_uf.length !== 2) e.ctps_uf = 'Use a sigla com 2 letras.';

    if (!form.cod_categoria) e.cod_categoria = 'Selecione a categoria do trabalhador.';

    if (lotacoesCatalogo.length > 0) {
      if (!form.unidade_id || !form.setor_id || !form.cargo_id || !lotacaoIdSelecionada)
        e.cargo_id = 'Selecione a lotação completa (unidade, setor e cargo).';
    }

    if (form.status === 'desligado' && !form.data_desligamento)
      e.data_desligamento = 'Informe a data de desligamento.';

    if (lotacaoMudou && form.status !== 'desligado') {
      if (!form.data_mudanca) e.data_mudanca = 'Informe a data da mudança.';
      if (!form.motivo_mudanca) e.motivo_mudanca = 'Selecione o motivo.';
    }

    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setErroGeral(null);
    if (!validar()) return;
    setSalvando(true);

    const payload = {
      empresa_id: perfil!.empresa_id,
      codigo: form.codigo.trim() || null,
      nome: form.nome.trim(),
      cpf: so(form.cpf),
      data_nascimento: form.data_nascimento || null,
      nacionalidade: form.nacionalidade.trim() || null,
      naturalidade: form.naturalidade.trim() || null,
      rg: form.rg.trim() || null,
      rg_orgao: form.rg_orgao.trim() || null,
      rg_uf: form.rg_uf.trim().toUpperCase() || null,
      rg_expedicao: form.rg_expedicao || null,
      pis: so(form.pis) || null,
      ctps: form.ctps.trim() || null,
      ctps_serie: form.ctps_serie.trim() || null,
      ctps_uf: form.ctps_uf.trim().toUpperCase() || null,
      matricula_esocial: form.matricula_esocial.trim() || null,
      cod_categoria: form.cod_categoria ? Number(form.cod_categoria) : null,
      data_admissao: form.data_admissao || null,
      data_desligamento: form.status === 'desligado' ? form.data_desligamento || null : null,
      telefone: form.telefone.trim() || null,
      email: form.email.trim() || null,
      status: editando ? form.status : 'ativo',
    };

    if (!editando) {
      const { data: novo, error: erroFuncionario } = await supabase
        .from('funcionarios')
        .insert(payload)
        .select('id')
        .single();

      if (erroFuncionario) {
        setSalvando(false);
        setErroGeral(
          erroFuncionario.code === '23505'
            ? 'Já existe um funcionário cadastrado com este CPF.'
            : erroFuncionario.message
        );
        return;
      }

      const { error: erroLotacao } = await supabase.from('funcionarios_lotacoes').insert({
        empresa_id: perfil!.empresa_id,
        funcionario_id: novo.id,
        lotacao_id: lotacaoIdSelecionada,
        data_inicio: form.data_admissao || hoje(),
        motivo: 'admissao',
      });

      setSalvando(false);

      if (erroLotacao) {
        setErroGeral(
          `Funcionário cadastrado, mas houve um erro ao registrar a lotação: ${erroLotacao.message}`
        );
        return;
      }

      navigate('/funcionarios', { replace: true });
      return;
    }

    const { error: erroFuncionario } = await supabase.from('funcionarios').update(payload).eq('id', id!);

    if (erroFuncionario) {
      setSalvando(false);
      setErroGeral(
        erroFuncionario.code === '23505'
          ? 'Já existe um funcionário cadastrado com este CPF.'
          : erroFuncionario.message
      );
      return;
    }

    if (form.status === 'desligado' && lotacaoAbertaId) {
      const { error } = await supabase
        .from('funcionarios_lotacoes')
        .update({ data_fim: form.data_desligamento })
        .eq('id', lotacaoAbertaId);
      if (error) {
        setSalvando(false);
        setErroGeral(error.message);
        return;
      }
    } else if (lotacaoMudou) {
      if (lotacaoAbertaId) {
        const { error } = await supabase
          .from('funcionarios_lotacoes')
          .update({ data_fim: diaAnterior(form.data_mudanca || hoje()) })
          .eq('id', lotacaoAbertaId);
        if (error) {
          setSalvando(false);
          setErroGeral(error.message);
          return;
        }
      }
      const { error } = await supabase.from('funcionarios_lotacoes').insert({
        empresa_id: perfil!.empresa_id,
        funcionario_id: id,
        lotacao_id: lotacaoIdSelecionada,
        data_inicio: form.data_mudanca || hoje(),
        motivo: form.motivo_mudanca,
      });
      if (error) {
        setSalvando(false);
        setErroGeral(error.message);
        return;
      }
    }

    setSalvando(false);
    navigate('/funcionarios', { replace: true });
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
          onClick={() => navigate('/funcionarios')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar funcionário' : 'Novo funcionário'}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full pb-32">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erroGeral}
          </div>
        )}

        <Secao icone="person" titulo="Dados pessoais">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Campo
              rotulo="Código (opcional)"
              name="codigo"
              value={form.codigo}
              onChange={(e) => set('codigo', e.target.value)}
              autoFocus
            />
            <Campo
              rotulo="Nome completo"
              name="nome"
              className="sm:col-span-3"
              placeholder="Nome completo do funcionário"
              value={form.nome}
              onChange={(e) => set('nome', e.target.value)}
              erro={erros.nome}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Campo
              rotulo="Data de nascimento"
              name="data_nascimento"
              type="date"
              value={form.data_nascimento}
              onChange={(e) => set('data_nascimento', e.target.value)}
            />
            <Campo
              rotulo="Nacionalidade"
              name="nacionalidade"
              value={form.nacionalidade}
              onChange={(e) => set('nacionalidade', e.target.value)}
            />
            <Campo
              rotulo="Naturalidade"
              name="naturalidade"
              placeholder="Cidade/UF de nascimento"
              value={form.naturalidade}
              onChange={(e) => set('naturalidade', e.target.value)}
            />
          </div>
        </Secao>

        <Secao icone="badge" titulo="Documentação">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo
              rotulo="CPF"
              name="cpf"
              placeholder="000.000.000-00"
              inputMode="numeric"
              value={form.cpf}
              onChange={(e) => set('cpf', mascaraCpf(e.target.value))}
              erro={erros.cpf}
            />
            <Campo
              rotulo="PIS"
              name="pis"
              placeholder="000.00000.00-0"
              inputMode="numeric"
              value={form.pis}
              onChange={(e) => set('pis', mascaraPis(e.target.value))}
              erro={erros.pis}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Campo rotulo="RG" name="rg" value={form.rg} onChange={(e) => set('rg', e.target.value)} />
            <Campo
              rotulo="Órgão expedidor"
              name="rg_orgao"
              value={form.rg_orgao}
              onChange={(e) => set('rg_orgao', e.target.value)}
            />
            <Campo
              rotulo="UF"
              name="rg_uf"
              placeholder="BA"
              maxLength={2}
              value={form.rg_uf}
              onChange={(e) => set('rg_uf', e.target.value.toUpperCase())}
              erro={erros.rg_uf}
            />
            <Campo
              rotulo="Data de expedição"
              name="rg_expedicao"
              type="date"
              value={form.rg_expedicao}
              onChange={(e) => set('rg_expedicao', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Campo
              rotulo="CTPS"
              name="ctps"
              value={form.ctps}
              onChange={(e) => set('ctps', e.target.value)}
            />
            <Campo
              rotulo="Série"
              name="ctps_serie"
              value={form.ctps_serie}
              onChange={(e) => set('ctps_serie', e.target.value)}
            />
            <Campo
              rotulo="UF"
              name="ctps_uf"
              placeholder="BA"
              maxLength={2}
              value={form.ctps_uf}
              onChange={(e) => set('ctps_uf', e.target.value.toUpperCase())}
              erro={erros.ctps_uf}
            />
          </div>
          <Campo
            rotulo="Matrícula eSocial"
            name="matricula_esocial"
            value={form.matricula_esocial}
            onChange={(e) => set('matricula_esocial', e.target.value)}
          />
        </Secao>

        <Secao icone="workspace_premium" titulo="Vínculo eSocial">
          <Seletor
            rotulo="Categoria do trabalhador"
            name="cod_categoria"
            value={form.cod_categoria}
            onChange={(e) => set('cod_categoria', e.target.value)}
            erro={erros.cod_categoria}
            dica="Tabela 01 do eSocial. Define o tipo de vínculo nos eventos S-2200 e S-2240."
          >
            <option value="">Selecione a categoria</option>
            {gruposCategorias.map((grupo) => (
              <optgroup key={grupo.nome} label={grupo.nome}>
                {grupo.itens.map((c) => (
                  <option key={c.codigo} value={c.codigo}>
                    {c.codigo} - {c.descricao}
                  </option>
                ))}
              </optgroup>
            ))}
          </Seletor>
        </Secao>

        <Secao icone="lan" titulo="Lotação">
          {lotacoesCatalogo.length === 0 ? (
            <div className="flex items-start gap-2 bg-[#F97316]/10 text-[#9a3412] px-3 py-2 rounded-lg text-label-sm">
              <span className="material-symbols-outlined text-[16px] mt-px">warning</span>
              <span>
                Nenhuma lotação cadastrada ainda. Configure a estrutura organizacional antes de cadastrar
                funcionários.{' '}
                <Link to="/estrutura" className="underline font-medium">
                  Ir para Estrutura organizacional
                </Link>
              </span>
            </div>
          ) : (
            <>
              <Seletor
                rotulo="Unidade"
                name="unidade_id"
                value={form.unidade_id}
                onChange={(e) => mudarUnidade(e.target.value)}
                erro={erros.unidade_id}
              >
                <option value="">Selecione a unidade</option>
                {unidadesDisponiveis.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome_fantasia || u.razao_social}
                  </option>
                ))}
              </Seletor>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Seletor
                  rotulo="Setor"
                  name="setor_id"
                  value={form.setor_id}
                  onChange={(e) => mudarSetor(e.target.value)}
                  disabled={!form.unidade_id}
                  erro={erros.setor_id}
                >
                  <option value="">Selecione</option>
                  {setoresDisponiveis.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </Seletor>
                <Seletor
                  rotulo="Cargo"
                  name="cargo_id"
                  value={form.cargo_id}
                  onChange={(e) => set('cargo_id', e.target.value)}
                  disabled={!form.setor_id}
                  erro={erros.cargo_id}
                >
                  <option value="">Selecione</option>
                  {cargosDisponiveis.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </Seletor>
              </div>
              <Campo
                rotulo="Data de admissão"
                name="data_admissao"
                type="date"
                value={form.data_admissao}
                onChange={(e) => set('data_admissao', e.target.value)}
              />

              {lotacaoMudou && form.status !== 'desligado' && (
                <div className="flex flex-col gap-4 bg-surface-container rounded-lg p-4">
                  <p className="text-label-sm text-on-surface-variant">
                    A lotação foi alterada. Informe os dados da mudança para manter o histórico.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Campo
                      rotulo="Data da mudança"
                      name="data_mudanca"
                      type="date"
                      value={form.data_mudanca}
                      onChange={(e) => set('data_mudanca', e.target.value)}
                      erro={erros.data_mudanca}
                    />
                    <Seletor
                      rotulo="Motivo"
                      name="motivo_mudanca"
                      value={form.motivo_mudanca}
                      onChange={(e) => set('motivo_mudanca', e.target.value as MotivoMudanca)}
                      erro={erros.motivo_mudanca}
                    >
                      <option value="transferencia">Transferência</option>
                      <option value="promocao">Promoção</option>
                      <option value="retorno">Retorno</option>
                    </Seletor>
                  </div>
                </div>
              )}
            </>
          )}
        </Secao>

        {editando && (
          <Secao icone="history" titulo="Histórico de lotações">
            {historico.length === 0 ? (
              <p className="text-label-sm text-on-surface-variant italic">
                Nenhum histórico registrado.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-outline-variant/30">
                {historico.map((h) => (
                  <div key={h.id} className="py-3 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-label-md text-on-surface font-medium">
                        {formatarData(h.data_inicio)} — {h.data_fim ? formatarData(h.data_fim) : 'Atual'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-label-sm bg-surface-container-high text-on-surface-variant shrink-0">
                        {MOTIVO_LABEL[h.motivo] ?? h.motivo}
                      </span>
                    </div>
                    <p className="text-label-sm text-on-surface-variant">{resolverLotacao(h.lotacao_id)}</p>
                  </div>
                ))}
              </div>
            )}
          </Secao>
        )}

        <Secao icone="call" titulo="Contato">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo
              rotulo="Telefone / Celular"
              name="telefone"
              placeholder="(00) 00000-0000"
              inputMode="numeric"
              value={form.telefone}
              onChange={(e) => set('telefone', mascaraTelefone(e.target.value))}
            />
            <Campo
              rotulo="E-mail"
              name="email"
              type="email"
              placeholder="email@exemplo.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>
        </Secao>

        {editando && (
          <Secao icone="toggle_on" titulo="Situação">
            <Seletor
              rotulo="Status"
              name="status"
              value={form.status}
              onChange={(e) => set('status', e.target.value as StatusFuncionario)}
            >
              <option value="ativo">Ativo</option>
              <option value="afastado">Afastado</option>
              <option value="ferias">Férias</option>
              <option value="desligado">Desligado</option>
            </Seletor>
            {form.status === 'desligado' && (
              <Campo
                rotulo="Data de desligamento"
                name="data_desligamento"
                type="date"
                value={form.data_desligamento}
                onChange={(e) => set('data_desligamento', e.target.value)}
                erro={erros.data_desligamento}
              />
            )}
          </Secao>
        )}
      </div>

      <footer className="fixed bottom-0 left-0 md:left-80 right-0 bg-surface-container-lowest p-4 border-t border-outline-variant flex gap-3 z-30 pb-24 md:pb-4">
        <div className="flex gap-3 w-full max-w-3xl mx-auto md:mx-0 md:ml-md">
          <Botao
            type="button"
            variante="secundario"
            className="flex-1"
            onClick={() => navigate('/funcionarios')}
          >
            Cancelar
          </Botao>
          <Botao
            type="submit"
            icone="save"
            carregando={salvando}
            disabled={lotacoesCatalogo.length === 0}
            className="flex-1"
          >
            {salvando ? 'Salvando...' : 'Salvar funcionário'}
          </Botao>
        </div>
      </footer>
    </form>
  );
}
