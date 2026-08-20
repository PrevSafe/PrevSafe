import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Campo, AreaTexto, Seletor, Botao } from '@/components/ui/Form';
import Modal from '@/components/ui/Modal';
import {
  carregarCatalogo,
  listarPerfis,
  criarPerfil,
  excluirPerfil,
  contarUsuariosPorPerfil,
  listarPermissoes,
  concederPermissao,
  revogarPermissao,
  listarVinculos,
  atualizarPerfilDoVinculo,
  listarUnidadesDaEmpresa,
  contarUnidadesPorUsuario,
  listarUnidadesLiberadas,
  liberarUnidade,
  revogarUnidade,
  type Recurso,
  type Acao,
  type RecursoAcao,
  type PerfilAcesso,
  type VinculoUsuario,
  type UnidadeResumo,
} from '@/lib/acessos';

const ORDEM_ACOES = ['visualizar', 'criar', 'editar', 'excluir', 'aprovar'];
const MODULO_LABEL: Record<string, string> = { nucleo: 'Núcleo', cipa: 'CIPA' };

function Spinner() {
  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <span className="material-symbols-outlined animate-spin text-primary text-[32px]">
        progress_activity
      </span>
    </div>
  );
}

export default function Acessos() {
  const { empresaAtiva } = useAuth();
  const [aba, setAba] = useState<'perfis' | 'usuarios'>('perfis');

  if (!empresaAtiva) return <Spinner />;
  if (empresaAtiva.papel !== 'admin') return <Navigate to="/dashboard" replace />;

  return (
    <div className="px-margin-mobile md:px-md py-6">
      <header>
        <h1 className="text-headline-lg text-primary">Controle de Acessos</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Perfis de acesso, matriz de permissões e as unidades que cada pessoa pode ver.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 mt-6">
        {(
          [
            ['perfis', 'Perfis'],
            ['usuarios', 'Usuários'],
          ] as const
        ).map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setAba(valor)}
            className={`flex h-11 items-center rounded-lg px-4 text-label-sm transition-colors ${
              aba === valor
                ? 'bg-primary-container text-white'
                : 'border border-outline text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {texto}
          </button>
        ))}
      </nav>

      <div className="mt-6 pb-8">
        {aba === 'perfis' ? (
          <AbaPerfis empresaId={empresaAtiva.empresa_id} />
        ) : (
          <AbaUsuarios empresaId={empresaAtiva.empresa_id} />
        )}
      </div>
    </div>
  );
}

// =======================================================================
// Aba Perfis
// =======================================================================

function AbaPerfis({ empresaId }: { empresaId: string }) {
  const [perfis, setPerfis] = useState<PerfilAcesso[]>([]);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [recursoAcoes, setRecursoAcoes] = useState<RecursoAcao[]>([]);
  const [contagem, setContagem] = useState<Record<string, number>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<PerfilAcesso | null>(null);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);

  async function carregarTudo() {
    setCarregando(true);
    const [{ data: listaPerfis, error: erroPerfis }, catalogo, contagemUsuarios] = await Promise.all([
      listarPerfis(empresaId),
      carregarCatalogo(),
      contarUsuariosPorPerfil(empresaId),
    ]);
    if (erroPerfis) setErro(erroPerfis.message);
    else if (catalogo.error) setErro(catalogo.error.message);
    else setErro(null);

    setPerfis((listaPerfis ?? []) as PerfilAcesso[]);
    setRecursos(catalogo.recursos);
    setAcoes(catalogo.acoes);
    setRecursoAcoes(catalogo.recursoAcoes);
    setContagem(contagemUsuarios);
    setCarregando(false);
  }

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  function aoExcluirPerfil(perfilId: string) {
    setPerfis((p) => p.filter((x) => x.id !== perfilId));
    setSelecionado(null);
    setContagem((c) => {
      const novo = { ...c };
      delete novo[perfilId];
      return novo;
    });
  }

  if (carregando) return <Spinner />;

  if (selecionado) {
    return (
      <MatrizPermissoes
        perfil={selecionado}
        recursos={recursos}
        acoes={acoes}
        recursoAcoes={recursoAcoes}
        qtdUsuarios={contagem[selecionado.id] ?? 0}
        onFechar={() => setSelecionado(null)}
        onExcluido={() => aoExcluirPerfil(selecionado.id)}
      />
    );
  }

  return (
    <>
      {erro && (
        <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md mb-4">
          {erro}
        </div>
      )}

      <div className="flex justify-end mb-4">
        <Botao icone="add" onClick={() => setModalNovoAberto(true)}>
          Novo perfil
        </Botao>
      </div>

      {perfis.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/40">
          <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">
            shield_person
          </span>
          <p className="text-body-md text-on-surface-variant mb-4">Nenhum perfil de acesso cadastrado ainda.</p>
          <button
            type="button"
            onClick={() => setModalNovoAberto(true)}
            className="text-label-md text-primary-container hover:underline"
          >
            Criar o primeiro perfil
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {perfis.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelecionado(p)}
              className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex flex-col gap-2"
            >
              <div className="flex items-center gap-3">
                <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                  <span className="material-symbols-outlined">shield_person</span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-body-lg text-primary font-semibold truncate">{p.nome}</h3>
                  <span className="text-label-sm text-on-surface-variant">
                    {contagem[p.id] ?? 0} usuário(s)
                  </span>
                </div>
              </div>
              {p.descricao && (
                <p className="text-label-sm text-on-surface-variant line-clamp-2">{p.descricao}</p>
              )}
            </button>
          ))}
        </div>
      )}

      <ModalNovoPerfil
        aberto={modalNovoAberto}
        onFechar={() => setModalNovoAberto(false)}
        onCriado={(perfil) => {
          setPerfis((p) => [...p, perfil].sort((a, b) => a.nome.localeCompare(b.nome)));
          setModalNovoAberto(false);
          setSelecionado(perfil);
        }}
        empresaId={empresaId}
      />
    </>
  );
}

function ModalNovoPerfil({
  aberto,
  onFechar,
  onCriado,
  empresaId,
}: {
  aberto: boolean;
  onFechar: () => void;
  onCriado: (perfil: PerfilAcesso) => void;
  empresaId: string;
}) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setNome('');
      setDescricao('');
      setErro(null);
    }
  }, [aberto]);

  async function salvar() {
    if (!nome.trim()) {
      setErro('Informe o nome do perfil.');
      return;
    }
    setSalvando(true);
    const { data, error } = await criarPerfil(empresaId, nome, descricao);
    setSalvando(false);
    if (error) {
      setErro(error.code === '23505' ? 'Já existe um perfil com este nome.' : error.message);
      return;
    }
    if (data) onCriado(data as PerfilAcesso);
  }

  return (
    <Modal aberto={aberto} titulo="Novo perfil de acesso" onFechar={onFechar}>
      <div className="flex flex-col gap-4 p-2">
        {erro && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erro}
          </div>
        )}
        <Campo
          rotulo="Nome do perfil"
          name="nome"
          placeholder="Ex.: Supervisor de campo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoFocus
        />
        <AreaTexto
          rotulo="Descrição (opcional)"
          name="descricao"
          placeholder="Para que serve este perfil"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
        <Botao icone="save" carregando={salvando} onClick={salvar}>
          {salvando ? 'Criando...' : 'Criar perfil'}
        </Botao>
      </div>
    </Modal>
  );
}

function MatrizPermissoes({
  perfil,
  recursos,
  acoes,
  recursoAcoes,
  qtdUsuarios,
  onFechar,
  onExcluido,
}: {
  perfil: PerfilAcesso;
  recursos: Recurso[];
  acoes: Acao[];
  recursoAcoes: RecursoAcao[];
  qtdUsuarios: number;
  onFechar: () => void;
  onExcluido: () => void;
}) {
  const [permissoes, setPermissoes] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'salvando' | 'salvo'>('idle');
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    listarPermissoes(perfil.id).then(({ data, error }) => {
      if (!ativo) return;
      if (error) setErro(error.message);
      else setPermissoes(new Set((data ?? []).map((p) => `${p.recurso_codigo}:${p.acao_codigo}`)));
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [perfil.id]);

  const acoesPorRecurso = useMemo(() => {
    const mapa = new Map<string, Set<string>>();
    for (const ra of recursoAcoes) {
      if (!mapa.has(ra.recurso_codigo)) mapa.set(ra.recurso_codigo, new Set());
      mapa.get(ra.recurso_codigo)!.add(ra.acao_codigo);
    }
    return mapa;
  }, [recursoAcoes]);

  const acoesOrdenadas = useMemo(
    () => [...acoes].sort((a, b) => ORDEM_ACOES.indexOf(a.codigo) - ORDEM_ACOES.indexOf(b.codigo)),
    [acoes]
  );

  const secoes = useMemo(() => {
    const grupos = new Map<string, Recurso[]>();
    for (const r of recursos) {
      if (!grupos.has(r.modulo)) grupos.set(r.modulo, []);
      grupos.get(r.modulo)!.push(r);
    }
    return [...grupos.entries()];
  }, [recursos]);

  async function alternar(recursoCodigo: string, acaoCodigo: string, concedida: boolean) {
    const chave = `${recursoCodigo}:${acaoCodigo}`;
    setPermissoes((p) => {
      const novo = new Set(p);
      if (concedida) novo.add(chave);
      else novo.delete(chave);
      return novo;
    });
    setStatus('salvando');
    const { error } = concedida
      ? await concederPermissao(perfil.id, recursoCodigo, acaoCodigo)
      : await revogarPermissao(perfil.id, recursoCodigo, acaoCodigo);

    if (error) {
      setErro(error.message);
      setPermissoes((p) => {
        const novo = new Set(p);
        if (concedida) novo.delete(chave);
        else novo.add(chave);
        return novo;
      });
      setStatus('idle');
      return;
    }
    setStatus('salvo');
    setTimeout(() => setStatus((s) => (s === 'salvo' ? 'idle' : s)), 1500);
  }

  async function handleExcluir() {
    if (qtdUsuarios > 0) return;
    if (!window.confirm(`Excluir o perfil "${perfil.nome}"? Essa ação não pode ser desfeita.`)) return;
    setExcluindo(true);
    const { error } = await excluirPerfil(perfil.id);
    setExcluindo(false);
    if (error) {
      setErro(error.message);
      return;
    }
    onExcluido();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onFechar}
            aria-label="Voltar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-highest"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="min-w-0">
            <h2 className="text-title-lg text-primary truncate">{perfil.nome}</h2>
            {perfil.descricao && (
              <p className="text-label-sm text-on-surface-variant truncate">{perfil.descricao}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {status === 'salvando' && (
            <span className="text-label-sm text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
              salvando...
            </span>
          )}
          {status === 'salvo' && (
            <span className="text-label-sm text-secondary flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">check</span>
              salvo
            </span>
          )}
          <Botao
            variante="perigo"
            icone="delete"
            carregando={excluindo}
            disabled={qtdUsuarios > 0}
            title={qtdUsuarios > 0 ? `${qtdUsuarios} usuário(s) usam este perfil` : undefined}
            onClick={handleExcluir}
          >
            {qtdUsuarios > 0 ? `Excluir perfil (${qtdUsuarios} em uso)` : 'Excluir perfil'}
          </Botao>
        </div>
      </div>

      {erro && (
        <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
          {erro}
        </div>
      )}

      {carregando ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto bg-surface-container-lowest rounded-xl border border-outline-variant/40">
          <table className="w-full text-body-md">
            <thead>
              <tr className="border-b border-outline-variant/40">
                <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant">Recurso</th>
                {acoesOrdenadas.map((a) => (
                  <th key={a.codigo} className="text-center px-3 py-3 text-label-sm text-on-surface-variant">
                    {a.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {secoes.map(([modulo, itens]) => (
                <SecaoModulo
                  key={modulo}
                  titulo={MODULO_LABEL[modulo] ?? modulo}
                  recursos={itens}
                  acoesOrdenadas={acoesOrdenadas}
                  acoesPorRecurso={acoesPorRecurso}
                  permissoes={permissoes}
                  onAlternar={alternar}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SecaoModulo({
  titulo,
  recursos,
  acoesOrdenadas,
  acoesPorRecurso,
  permissoes,
  onAlternar,
}: {
  titulo: string;
  recursos: Recurso[];
  acoesOrdenadas: Acao[];
  acoesPorRecurso: Map<string, Set<string>>;
  permissoes: Set<string>;
  onAlternar: (recursoCodigo: string, acaoCodigo: string, concedida: boolean) => void;
}) {
  return (
    <>
      <tr className="bg-surface-container">
        <td colSpan={acoesOrdenadas.length + 1} className="px-4 py-2 text-label-sm uppercase tracking-wider text-outline">
          {titulo}
        </td>
      </tr>
      {recursos.map((r) => {
        const validas = acoesPorRecurso.get(r.codigo) ?? new Set<string>();
        return (
          <tr key={r.codigo} className="border-b border-outline-variant/20 last:border-0">
            <td className="px-4 py-3 text-on-surface">{r.nome}</td>
            {acoesOrdenadas.map((a) => {
              if (!validas.has(a.codigo)) return <td key={a.codigo} className="px-3 py-3" />;
              const chave = `${r.codigo}:${a.codigo}`;
              const marcado = permissoes.has(chave);
              return (
                <td key={a.codigo} className="text-center px-3 py-3">
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={(e) => onAlternar(r.codigo, a.codigo, e.target.checked)}
                    className="h-5 w-5 rounded border-outline-variant text-primary-container accent-[#2e7d32] cursor-pointer"
                  />
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}

// =======================================================================
// Aba Usuários
// =======================================================================

function AbaUsuarios({ empresaId }: { empresaId: string }) {
  const [vinculos, setVinculos] = useState<VinculoUsuario[]>([]);
  const [perfis, setPerfis] = useState<PerfilAcesso[]>([]);
  const [unidades, setUnidades] = useState<UnidadeResumo[]>([]);
  const [contagemUnidades, setContagemUnidades] = useState<Record<string, number>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<VinculoUsuario | null>(null);

  async function carregarTudo() {
    setCarregando(true);
    const [{ data: listaVinculos, error: erroVinculos }, { data: listaPerfis, error: erroPerfis }, { data: listaUnidades, error: erroUnidades }, contagem] =
      await Promise.all([
        listarVinculos(empresaId),
        listarPerfis(empresaId),
        listarUnidadesDaEmpresa(empresaId),
        contarUnidadesPorUsuario(empresaId),
      ]);

    setErro(erroVinculos?.message ?? erroPerfis?.message ?? erroUnidades?.message ?? null);
    setVinculos(listaVinculos);
    setPerfis((listaPerfis ?? []) as PerfilAcesso[]);
    setUnidades((listaUnidades ?? []) as UnidadeResumo[]);
    setContagemUnidades(contagem);
    setCarregando(false);
  }

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  const perfilPorId = useMemo(() => new Map(perfis.map((p) => [p.id, p])), [perfis]);

  if (carregando) return <Spinner />;

  return (
    <>
      {erro && (
        <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md mb-4">
          {erro}
        </div>
      )}

      {vinculos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/40">
          <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">group</span>
          <p className="text-body-md text-on-surface-variant">Nenhum usuário vinculado a esta empresa ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {vinculos.map((v) => {
            const perfil = v.perfil_id ? perfilPorId.get(v.perfil_id) : null;
            const qtdUnidades = contagemUnidades[v.usuario_id] ?? 0;
            return (
              <button
                key={v.id}
                onClick={() => setSelecionado(v)}
                className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-4 hover:shadow-md transition-shadow flex items-center gap-4"
              >
                <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                  <span className="material-symbols-outlined">person</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-body-lg text-primary font-semibold truncate">{v.nome}</h3>
                  <p className="text-label-sm text-on-surface-variant truncate">{v.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 text-label-sm">
                  <span className="px-2.5 py-1 rounded-full bg-secondary-container/40 text-on-secondary-container">
                    {perfil?.nome ?? 'Sem perfil'}
                  </span>
                  <span
                    className={`flex items-center gap-1 ${
                      qtdUnidades === 0 ? 'text-error' : 'text-on-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">apartment</span>
                    {qtdUnidades} unidade(s)
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selecionado && (
        <PainelUsuario
          vinculo={selecionado}
          perfis={perfis}
          unidades={unidades}
          empresaId={empresaId}
          onFechar={() => setSelecionado(null)}
          onAtualizado={carregarTudo}
        />
      )}
    </>
  );
}

function PainelUsuario({
  vinculo,
  perfis,
  unidades,
  empresaId,
  onFechar,
  onAtualizado,
}: {
  vinculo: VinculoUsuario;
  perfis: PerfilAcesso[];
  unidades: UnidadeResumo[];
  empresaId: string;
  onFechar: () => void;
  onAtualizado: () => void;
}) {
  const [perfilId, setPerfilId] = useState<string>(vinculo.perfil_id ?? '');
  const [liberadas, setLiberadas] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    listarUnidadesLiberadas(vinculo.usuario_id, empresaId).then(({ data, error }) => {
      if (!ativo) return;
      if (error) setErro(error.message);
      else setLiberadas(new Set((data ?? []).map((u) => u.unidade_id)));
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [vinculo.usuario_id, empresaId]);

  async function trocarPerfil(novoPerfilId: string) {
    setPerfilId(novoPerfilId);
    setSalvandoPerfil(true);
    const { error } = await atualizarPerfilDoVinculo(vinculo.id, novoPerfilId || null);
    setSalvandoPerfil(false);
    if (error) {
      setErro(error.message);
      return;
    }
    onAtualizado();
  }

  async function alternarUnidade(unidadeId: string, liberar: boolean) {
    setLiberadas((s) => {
      const novo = new Set(s);
      if (liberar) novo.add(unidadeId);
      else novo.delete(unidadeId);
      return novo;
    });
    const { error } = liberar
      ? await liberarUnidade(vinculo.usuario_id, empresaId, unidadeId)
      : await revogarUnidade(vinculo.usuario_id, unidadeId);

    if (error) {
      setErro(error.message);
      setLiberadas((s) => {
        const novo = new Set(s);
        if (liberar) novo.delete(unidadeId);
        else novo.add(unidadeId);
        return novo;
      });
      return;
    }
    onAtualizado();
  }

  return (
    <Modal aberto titulo={vinculo.nome} onFechar={onFechar}>
      <div className="flex flex-col gap-4 p-2">
        {erro && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erro}
          </div>
        )}

        <p className="text-label-sm text-on-surface-variant">
          {vinculo.email} · papel atual: <span className="capitalize">{vinculo.papel}</span>
        </p>

        <Seletor
          rotulo="Perfil de acesso"
          value={perfilId}
          onChange={(e) => trocarPerfil(e.target.value)}
          disabled={salvandoPerfil}
        >
          <option value="">— Sem perfil —</option>
          {perfis.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </Seletor>

        <div>
          <p className="text-label-md text-on-surface mb-2">Unidades liberadas</p>
          {carregando ? (
            <Spinner />
          ) : unidades.length === 0 ? (
            <p className="text-label-sm text-on-surface-variant">Nenhuma unidade cadastrada nesta empresa.</p>
          ) : (
            <div className="flex flex-col gap-1 max-h-[16rem] overflow-y-auto border border-outline-variant/40 rounded-lg p-2">
              {unidades.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-container-high cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={liberadas.has(u.id)}
                    onChange={(e) => alternarUnidade(u.id, e.target.checked)}
                    className="h-5 w-5 rounded border-outline-variant text-primary-container accent-[#2e7d32] cursor-pointer"
                  />
                  <span className="text-body-md text-on-surface truncate">
                    {u.nome_fantasia || u.razao_social}
                  </span>
                </label>
              ))}
            </div>
          )}

          {!carregando && liberadas.size === 0 && (
            <div className="flex items-start gap-2 bg-error-container/60 text-on-error-container px-3 py-2 rounded-lg text-label-sm mt-2">
              <span className="material-symbols-outlined text-[16px] mt-px">warning</span>
              <span>
                Este usuário não conseguirá ver nenhuma unidade até que ao menos uma seja liberada.
              </span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
