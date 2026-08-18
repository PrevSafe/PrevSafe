import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { STATUS_LABEL, corStatus, formatarCpf, iniciais } from '@/lib/funcionarios';

type StatusFuncionario = 'ativo' | 'afastado' | 'ferias' | 'desligado';

type Funcionario = {
  id: string;
  codigo: string | null;
  nome: string;
  cpf: string;
  matricula_esocial: string | null;
  status: StatusFuncionario;
};

type LotacaoAberta = { funcionario_id: string; lotacao_id: string };
type LotacaoCatalogo = { id: string; unidade_id: string; setor_id: string; cargo_id: string | null };
type Unidade = { id: string; razao_social: string; nome_fantasia: string | null };
type Setor = { id: string; nome: string };
type Cargo = { id: string; nome: string };

export default function Funcionarios() {
  const { empresaAtiva } = useAuth();
  const navigate = useNavigate();

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [lotacoesAbertas, setLotacoesAbertas] = useState<LotacaoAberta[]>([]);
  const [lotacoesCatalogo, setLotacoesCatalogo] = useState<LotacaoCatalogo[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | StatusFuncionario>('ativo');

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    setCarregando(true);
    const empresaId = empresaAtiva.empresa_id;
    Promise.all([
      daEmpresa(
        supabase.from('funcionarios').select('id, codigo, nome, cpf, matricula_esocial, status'),
        empresaId
      ).order('nome'),
      daEmpresa(
        supabase.from('funcionarios_lotacoes').select('funcionario_id, lotacao_id'),
        empresaId
      ).is('data_fim', null),
      daEmpresa(supabase.from('lotacoes').select('id, unidade_id, setor_id, cargo_id'), empresaId),
      daEmpresa(supabase.from('unidades').select('id, razao_social, nome_fantasia'), empresaId),
      daEmpresa(supabase.from('setores').select('id, nome'), empresaId),
      daEmpresa(supabase.from('cargos').select('id, nome'), empresaId),
    ]).then(([rf, rla, rl, ru, rs, rc]) => {
      if (!ativo) return;
      const erroCombinado = rf.error ?? rla.error ?? rl.error ?? ru.error ?? rs.error ?? rc.error;
      if (erroCombinado) {
        setErro(erroCombinado.message);
      } else {
        setFuncionarios(rf.data as Funcionario[]);
        setLotacoesAbertas(rla.data as LotacaoAberta[]);
        setLotacoesCatalogo(rl.data as LotacaoCatalogo[]);
        setUnidades(ru.data as Unidade[]);
        setSetores(rs.data as Setor[]);
        setCargos(rc.data as Cargo[]);
      }
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [empresaAtiva]);

  const lotacoesPorId = useMemo(() => new Map(lotacoesCatalogo.map((l) => [l.id, l])), [lotacoesCatalogo]);
  const unidadesPorId = useMemo(() => new Map(unidades.map((u) => [u.id, u])), [unidades]);
  const setoresPorId = useMemo(() => new Map(setores.map((s) => [s.id, s])), [setores]);
  const cargosPorId = useMemo(() => new Map(cargos.map((c) => [c.id, c])), [cargos]);
  const lotacaoAbertaPorFuncionario = useMemo(
    () => new Map(lotacoesAbertas.map((l) => [l.funcionario_id, l.lotacao_id])),
    [lotacoesAbertas]
  );

  function lotacaoLabel(funcionarioId: string) {
    const lotacaoId = lotacaoAbertaPorFuncionario.get(funcionarioId);
    if (!lotacaoId) return null;
    const lot = lotacoesPorId.get(lotacaoId);
    if (!lot) return null;
    const unidade = unidadesPorId.get(lot.unidade_id);
    const setor = setoresPorId.get(lot.setor_id);
    if (!unidade || !setor) return null;
    const cargo = lot.cargo_id ? cargosPorId.get(lot.cargo_id) : null;
    return `${unidade.nome_fantasia || unidade.razao_social} › ${setor.nome} › ${cargo?.nome ?? 'Sem cargo definido'}`;
  }

  const termo = busca.trim().toLowerCase();
  const termoDigits = busca.replace(/\D/g, '');

  const filtrados = funcionarios.filter((f) => {
    if (statusFiltro !== 'todos' && f.status !== statusFiltro) return false;
    if (!termo) return true;
    const nomeMatch = f.nome.toLowerCase().includes(termo);
    const cpfMatch = termoDigits.length > 0 && f.cpf.includes(termoDigits);
    const matriculaMatch = (f.matricula_esocial ?? '').toLowerCase().includes(termo);
    return nomeMatch || cpfMatch || matriculaMatch;
  });

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">Funcionários</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Trabalhadores da empresa, com vínculo eSocial e lotação atual
          </p>
        </div>
        <Link
          to="/funcionarios/novo"
          className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Novo funcionário
        </Link>
      </header>

      <div className="px-margin-mobile md:px-md pb-8 flex-1 flex flex-col gap-4">
        {erro && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erro}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
              search
            </span>
            <input
              type="search"
              placeholder="Buscar por nome, CPF ou matrícula"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full h-12 rounded-lg border border-outline-variant bg-surface-container-lowest pl-11 pr-4 text-body-md placeholder:text-outline focus:outline-none focus:border-2 focus:border-primary-container"
            />
          </div>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as 'todos' | StatusFuncionario)}
            className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container sm:w-52"
          >
            <option value="ativo">Ativos</option>
            <option value="afastado">Afastados</option>
            <option value="ferias">Em férias</option>
            <option value="desligado">Desligados</option>
            <option value="todos">Todos os status</option>
          </select>
        </div>

        {carregando ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/40">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">group</span>
            <p className="text-body-md text-on-surface-variant mb-4">
              {termo || statusFiltro !== 'ativo'
                ? 'Nenhum funcionário encontrado para este filtro.'
                : 'Nenhum funcionário cadastrado ainda.'}
            </p>
            {!termo && (
              <Link
                to="/funcionarios/novo"
                className="text-label-md text-primary-container hover:underline"
              >
                Cadastrar o primeiro funcionário
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtrados.map((f) => (
              <button
                key={f.id}
                onClick={() => navigate(`/funcionarios/${f.id}`)}
                className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex gap-4 items-start"
              >
                <div className="h-12 w-12 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                  <span className="text-label-md font-bold">{iniciais(f.nome)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-body-lg text-primary font-semibold truncate">{f.nome}</h3>
                  <p className="text-label-sm text-on-surface-variant truncate">{formatarCpf(f.cpf)}</p>
                  <p className="text-label-sm text-on-surface-variant truncate mt-1">
                    {lotacaoLabel(f.id) ?? 'Sem lotação definida'}
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-label-sm ${corStatus(f.status)}`}
                >
                  {STATUS_LABEL[f.status]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
