import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Botao } from '@/components/ui/Form';
import { GFIP, corGfip, formatarCbo } from '@/lib/gfip';

type Unidade = { id: string; razao_social: string; nome_fantasia: string | null; matriz: boolean };
type Setor = { id: string; nome: string; ativo: boolean };
type Cargo = { id: string; nome: string; cbo: string | null; codigo_gfip: number; ativo: boolean };
type Lotacao = { id: string; unidade_id: string; setor_id: string; cargo_id: string | null };

type NoCargo = { lotacaoId: string; cargo: Cargo };
type NoSetor = { setor: Setor; cargos: NoCargo[] };
type NoUnidade = { unidade: Unidade; setores: NoSetor[]; totalCargos: number };

export default function Estrutura() {
  const { perfil } = useAuth();

  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [lotacoes, setLotacoes] = useState<Lotacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [expandido, setExpandido] = useState<Set<string>>(new Set());

  const [modalSetor, setModalSetor] = useState<{ unidadeId: string } | null>(null);
  const [modalCargo, setModalCargo] = useState<{ unidadeId: string; setorId: string } | null>(null);
  const [erroModal, setErroModal] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      supabase.from('unidades').select('id, razao_social, nome_fantasia, matriz').order('razao_social'),
      supabase.from('setores').select('id, nome, ativo').order('nome'),
      supabase.from('cargos').select('id, nome, cbo, codigo_gfip, ativo').order('nome'),
      supabase.from('lotacoes').select('id, unidade_id, setor_id, cargo_id'),
    ]).then(([ru, rs, rc, rl]) => {
      if (!ativo) return;
      const erroCombinado = ru.error ?? rs.error ?? rc.error ?? rl.error;
      if (erroCombinado) {
        setErro(erroCombinado.message);
      } else {
        const us = ru.data as Unidade[];
        setUnidades(us);
        setSetores(rs.data as Setor[]);
        setCargos(rc.data as Cargo[]);
        setLotacoes(rl.data as Lotacao[]);
        setExpandido(new Set(us.map((u) => `u:${u.id}`)));
      }
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, []);

  const setoresPorId = useMemo(() => new Map(setores.map((s) => [s.id, s])), [setores]);
  const cargosPorId = useMemo(() => new Map(cargos.map((c) => [c.id, c])), [cargos]);

  const arvoreCompleta = useMemo<NoUnidade[]>(() => {
    return unidades.map((u) => {
      const lotsUnidade = lotacoes.filter((l) => l.unidade_id === u.id);
      const setorIds = Array.from(new Set(lotsUnidade.map((l) => l.setor_id)));
      const setoresNode: NoSetor[] = setorIds.flatMap((sid) => {
        const setor = setoresPorId.get(sid);
        if (!setor) return [];
        const cargosNode: NoCargo[] = lotsUnidade
          .filter((l) => l.setor_id === sid && l.cargo_id)
          .flatMap((l) => {
            const cargo = cargosPorId.get(l.cargo_id as string);
            return cargo ? [{ lotacaoId: l.id, cargo }] : [];
          })
          .sort((a, b) => a.cargo.nome.localeCompare(b.cargo.nome));
        return [{ setor, cargos: cargosNode }];
      });
      setoresNode.sort((a, b) => a.setor.nome.localeCompare(b.setor.nome));
      const totalCargos = lotsUnidade.filter((l) => l.cargo_id).length;
      return { unidade: u, setores: setoresNode, totalCargos };
    });
  }, [unidades, lotacoes, setoresPorId, cargosPorId]);

  const termo = busca.trim().toLowerCase();
  const buscando = termo.length > 0;

  const arvore = useMemo<NoUnidade[]>(() => {
    if (!termo) return arvoreCompleta;
    return arvoreCompleta.flatMap((nu) => {
      const nomeUnidade = (nu.unidade.nome_fantasia || nu.unidade.razao_social).toLowerCase();
      if (nomeUnidade.includes(termo)) return [nu];

      const setoresFiltrados: NoSetor[] = nu.setores.flatMap((ns) => {
        if (ns.setor.nome.toLowerCase().includes(termo)) return [ns];
        const cargosFiltrados = ns.cargos.filter((nc) => nc.cargo.nome.toLowerCase().includes(termo));
        return cargosFiltrados.length > 0 ? [{ ...ns, cargos: cargosFiltrados }] : [];
      });

      return setoresFiltrados.length > 0 ? [{ ...nu, setores: setoresFiltrados }] : [];
    });
  }, [arvoreCompleta, termo]);

  function estaExpandido(id: string) {
    return buscando || expandido.has(id);
  }

  function alternar(id: string) {
    setExpandido((s) => {
      const novo = new Set(s);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  async function adicionarSetores(unidadeId: string, setorIds: string[]) {
    if (!perfil || setorIds.length === 0) return;
    const payload = setorIds.map((setor_id) => ({
      empresa_id: perfil.empresa_id,
      unidade_id: unidadeId,
      setor_id,
      cargo_id: null,
    }));
    const { data, error } = await supabase
      .from('lotacoes')
      .insert(payload)
      .select('id, unidade_id, setor_id, cargo_id');
    if (error) {
      setErroModal(error.message);
      return;
    }
    setLotacoes((ls) => [...ls, ...((data ?? []) as Lotacao[])]);
    setModalSetor(null);
  }

  async function adicionarCargos(unidadeId: string, setorId: string, cargoIds: string[]) {
    if (!perfil || cargoIds.length === 0) return;
    const payload = cargoIds.map((cargo_id) => ({
      empresa_id: perfil.empresa_id,
      unidade_id: unidadeId,
      setor_id: setorId,
      cargo_id,
    }));
    const { data, error } = await supabase
      .from('lotacoes')
      .insert(payload)
      .select('id, unidade_id, setor_id, cargo_id');
    if (error) {
      setErroModal(error.message);
      return;
    }
    setLotacoes((ls) => [...ls, ...((data ?? []) as Lotacao[])]);
    setModalCargo(null);
  }

  async function removerSetor(unidadeId: string, setorId: string) {
    if (
      !window.confirm(
        'Remover este setor da unidade? Os cargos vinculados a ele nesta unidade também serão removidos.'
      )
    )
      return;
    const { error } = await supabase
      .from('lotacoes')
      .delete()
      .eq('unidade_id', unidadeId)
      .eq('setor_id', setorId);
    if (error) {
      setErro(error.message);
      return;
    }
    setLotacoes((ls) => ls.filter((l) => !(l.unidade_id === unidadeId && l.setor_id === setorId)));
  }

  async function removerCargo(lotacaoId: string) {
    if (!window.confirm('Remover este cargo do setor?')) return;
    const { error } = await supabase.from('lotacoes').delete().eq('id', lotacaoId);
    if (error) {
      setErro(error.message);
      return;
    }
    setLotacoes((ls) => ls.filter((l) => l.id !== lotacaoId));
  }

  const modalSetorInfo = useMemo(() => {
    if (!modalSetor) return null;
    const usados = new Set(
      lotacoes.filter((l) => l.unidade_id === modalSetor.unidadeId).map((l) => l.setor_id)
    );
    return setores.filter((s) => s.ativo && !usados.has(s.id));
  }, [modalSetor, lotacoes, setores]);

  const modalCargoInfo = useMemo(() => {
    if (!modalCargo) return null;
    const usados = new Set(
      lotacoes
        .filter((l) => l.unidade_id === modalCargo.unidadeId && l.setor_id === modalCargo.setorId && l.cargo_id)
        .map((l) => l.cargo_id as string)
    );
    return cargos.filter((c) => c.ativo && !usados.has(c.id));
  }, [modalCargo, lotacoes, cargos]);

  return (
    <>
      <header className="flex flex-col gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">Estrutura organizacional</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Define quais cargos existem em cada setor de cada unidade da empresa
          </p>
        </div>
      </header>

      <div className="px-margin-mobile md:px-md pb-8 flex-1 flex flex-col gap-4">
        {erro && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erro}
          </div>
        )}

        {!carregando && unidades.length > 0 && (
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
              search
            </span>
            <input
              type="search"
              placeholder="Buscar por unidade, setor ou cargo"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full h-12 rounded-lg border border-outline-variant bg-surface-container-lowest pl-11 pr-4 text-body-md placeholder:text-outline focus:outline-none focus:border-2 focus:border-primary-container"
            />
          </div>
        )}

        {carregando ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : unidades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/40">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">
              apartment
            </span>
            <p className="text-body-md text-on-surface-variant mb-4">
              Nenhuma unidade cadastrada ainda.
            </p>
            <Link to="/unidades" className="text-label-md text-primary-container hover:underline">
              Cadastrar a primeira unidade
            </Link>
          </div>
        ) : arvore.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/40">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">
              search_off
            </span>
            <p className="text-body-md text-on-surface-variant">
              Nenhum resultado para esta busca.
            </p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/40 divide-y divide-outline-variant/30">
            {arvore.map((nu) => {
              const idUnidade = `u:${nu.unidade.id}`;
              const aberta = estaExpandido(idUnidade);
              const nome = nu.unidade.nome_fantasia || nu.unidade.razao_social;
              return (
                <div key={nu.unidade.id}>
                  <div className="flex items-center gap-2 py-3 px-3 hover:bg-surface-container group">
                    <button
                      type="button"
                      onClick={() => alternar(idUnidade)}
                      className="text-on-surface-variant p-0.5 shrink-0"
                      aria-label={aberta ? 'Recolher unidade' : 'Expandir unidade'}
                    >
                      <span
                        className={`material-symbols-outlined transition-transform duration-150 ${
                          aberta ? 'rotate-90' : ''
                        }`}
                      >
                        chevron_right
                      </span>
                    </button>
                    <span className="material-symbols-outlined text-primary-container shrink-0">
                      apartment
                    </span>
                    <span className="text-body-lg text-primary font-semibold flex-1 truncate">
                      {nome}
                    </span>
                    {nu.unidade.matriz && (
                      <span className="px-2 py-0.5 rounded-full text-label-sm bg-primary-container/15 text-primary-container shrink-0">
                        Matriz
                      </span>
                    )}
                    <span className="text-label-sm text-on-surface-variant shrink-0 hidden sm:inline">
                      {nu.setores.length} setor{nu.setores.length === 1 ? '' : 'es'} ·{' '}
                      {nu.totalCargos} cargo{nu.totalCargos === 1 ? '' : 's'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setErroModal(null);
                        setModalSetor({ unidadeId: nu.unidade.id });
                      }}
                      className="text-primary-container p-1.5 rounded-full hover:bg-surface-container-high shrink-0"
                      aria-label="Adicionar setor à unidade"
                      title="Adicionar setor"
                    >
                      <span className="material-symbols-outlined text-[20px]">add</span>
                    </button>
                  </div>

                  {aberta &&
                    (nu.setores.length === 0 ? (
                      <p className="pl-14 pr-3 pb-3 text-label-sm text-on-surface-variant italic">
                        Nenhum setor nesta unidade ainda.
                      </p>
                    ) : (
                      nu.setores.map((ns) => {
                        const idSetor = `s:${nu.unidade.id}:${ns.setor.id}`;
                        const abertaSetor = estaExpandido(idSetor);
                        return (
                          <div key={ns.setor.id}>
                            <div className="flex items-center gap-2 py-2.5 pl-9 pr-3 hover:bg-surface-container group">
                              <button
                                type="button"
                                onClick={() => alternar(idSetor)}
                                className="text-on-surface-variant p-0.5 shrink-0"
                                aria-label={abertaSetor ? 'Recolher setor' : 'Expandir setor'}
                              >
                                <span
                                  className={`material-symbols-outlined transition-transform duration-150 ${
                                    abertaSetor ? 'rotate-90' : ''
                                  }`}
                                >
                                  chevron_right
                                </span>
                              </button>
                              <span className="material-symbols-outlined text-on-surface-variant shrink-0 text-[20px]">
                                account_tree
                              </span>
                              <span className="text-body-md text-on-surface flex-1 truncate">
                                {ns.setor.nome}
                              </span>
                              <span className="text-label-sm text-on-surface-variant shrink-0 hidden sm:inline">
                                {ns.cargos.length} cargo{ns.cargos.length === 1 ? '' : 's'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setErroModal(null);
                                  setModalCargo({ unidadeId: nu.unidade.id, setorId: ns.setor.id });
                                }}
                                className="text-primary-container p-1.5 rounded-full hover:bg-surface-container-high shrink-0"
                                aria-label="Adicionar cargo ao setor"
                                title="Adicionar cargo"
                              >
                                <span className="material-symbols-outlined text-[20px]">add</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => removerSetor(nu.unidade.id, ns.setor.id)}
                                className="text-on-surface-variant hover:text-error p-1.5 rounded-full hover:bg-error-container opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                aria-label="Remover setor da unidade"
                                title="Remover setor"
                              >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                              </button>
                            </div>

                            {abertaSetor &&
                              (ns.cargos.length === 0 ? (
                                <p className="pl-20 pr-3 pb-2.5 text-label-sm text-on-surface-variant italic">
                                  Nenhum cargo neste setor ainda.
                                </p>
                              ) : (
                                ns.cargos.map((nc) => (
                                  <div
                                    key={nc.lotacaoId}
                                    className="flex items-center gap-2 py-2 pl-[4.5rem] pr-3 hover:bg-surface-container group"
                                  >
                                    <span className="material-symbols-outlined text-on-surface-variant shrink-0 text-[18px]">
                                      badge
                                    </span>
                                    <span className="text-body-md text-on-surface flex-1 truncate">
                                      {nc.cargo.nome}
                                    </span>
                                    <span className="text-label-sm text-on-surface-variant shrink-0">
                                      CBO {formatarCbo(nc.cargo.cbo)}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-label-sm shrink-0 ${corGfip(
                                        nc.cargo.codigo_gfip
                                      )}`}
                                    >
                                      {GFIP[nc.cargo.codigo_gfip]}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removerCargo(nc.lotacaoId)}
                                      className="text-on-surface-variant hover:text-error p-1.5 rounded-full hover:bg-error-container opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                      aria-label="Remover cargo do setor"
                                      title="Remover cargo"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">close</span>
                                    </button>
                                  </div>
                                ))
                              ))}
                          </div>
                        );
                      })
                    ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalSetor && modalSetorInfo && (
        <ModalSelecaoMultipla
          titulo="Adicionar setor à unidade"
          itens={modalSetorInfo.map((s) => ({ id: s.id, rotulo: s.nome }))}
          vazioTexto="Nenhum setor disponível para adicionar. Cadastre setores no catálogo."
          vazioLink={{ to: '/setores', texto: 'Ir para Setores' }}
          erro={erroModal}
          onConfirmar={(ids) => adicionarSetores(modalSetor.unidadeId, ids)}
          onFechar={() => setModalSetor(null)}
        />
      )}

      {modalCargo && modalCargoInfo && (
        <ModalSelecaoMultipla
          titulo="Adicionar cargo ao setor"
          itens={modalCargoInfo.map((c) => ({
            id: c.id,
            rotulo: c.nome,
            sub: `CBO ${formatarCbo(c.cbo)} · ${GFIP[c.codigo_gfip]}`,
          }))}
          vazioTexto="Nenhum cargo disponível para adicionar. Cadastre cargos no catálogo."
          vazioLink={{ to: '/cargos', texto: 'Ir para Cargos' }}
          erro={erroModal}
          onConfirmar={(ids) => adicionarCargos(modalCargo.unidadeId, modalCargo.setorId, ids)}
          onFechar={() => setModalCargo(null)}
        />
      )}
    </>
  );
}

function ModalSelecaoMultipla({
  titulo,
  itens,
  vazioTexto,
  vazioLink,
  erro,
  onConfirmar,
  onFechar,
}: {
  titulo: string;
  itens: { id: string; rotulo: string; sub?: string }[];
  vazioTexto: string;
  vazioLink: { to: string; texto: string };
  erro: string | null;
  onConfirmar: (ids: string[]) => void;
  onFechar: () => void;
}) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  function alternar(id: string) {
    setSelecionados((s) => {
      const novo = new Set(s);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40"
      onClick={onFechar}
    >
      <div
        className="bg-surface-container-lowest rounded-xl shadow-lg w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <h3 className="text-title-lg text-primary-container">{titulo}</h3>
          <button
            type="button"
            onClick={onFechar}
            className="text-on-surface-variant hover:bg-surface-container p-1.5 rounded-full"
            aria-label="Fechar"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {erro && (
          <div className="mx-5 mt-4 bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erro}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {itens.length === 0 ? (
            <div className="flex flex-col items-center text-center py-8">
              <p className="text-body-md text-on-surface-variant mb-3">{vazioTexto}</p>
              <Link to={vazioLink.to} className="text-label-md text-primary-container hover:underline">
                {vazioLink.texto}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {itens.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-container cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selecionados.has(item.id)}
                    onChange={() => alternar(item.id)}
                    className="size-4 accent-primary-container"
                  />
                  <span className="flex-1 text-body-md text-on-surface">{item.rotulo}</span>
                  {item.sub && (
                    <span className="text-label-sm text-on-surface-variant shrink-0">{item.sub}</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {itens.length > 0 && (
          <div className="px-5 py-4 border-t border-outline-variant flex gap-3">
            <Botao type="button" variante="secundario" className="flex-1" onClick={onFechar}>
              Cancelar
            </Botao>
            <Botao
              type="button"
              icone="add"
              className="flex-1"
              disabled={selecionados.size === 0}
              onClick={() => onConfirmar(Array.from(selecionados))}
            >
              Adicionar
            </Botao>
          </div>
        )}
      </div>
    </div>
  );
}
