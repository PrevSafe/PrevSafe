import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import {
  TIPO_RISCO_LABEL,
  TIPO_RISCO_ICONE,
  classificarNivelRisco,
  corNivelRisco,
  fundoCelulaMatriz,
  NIVEL_RISCO_LABEL,
  type TipoRisco,
} from '@/lib/riscos';

type Risco = {
  id: string;
  ghe_id: string;
  tipo_risco: TipoRisco;
  descricao: string;
  probabilidade: number;
  severidade: number;
};

type Ghe = { id: string; nome: string };

const ESCALA = [5, 4, 3, 2, 1]; // linhas (probabilidade), do topo para a base
const SEVERIDADES = [1, 2, 3, 4, 5]; // colunas

export default function MatrizRiscos() {
  const { empresaAtiva } = useAuth();
  const navigate = useNavigate();

  const [riscos, setRiscos] = useState<Risco[]>([]);
  const [ghes, setGhes] = useState<Ghe[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [celulaSelecionada, setCelulaSelecionada] = useState<{ probabilidade: number; severidade: number } | null>(
    null
  );

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
        supabase.from('riscos_inventario').select('id, ghe_id, tipo_risco, descricao, probabilidade, severidade'),
        empresaId
      ),
      daEmpresa(supabase.from('ghes').select('id, nome'), empresaId),
    ]).then(([rr, rg]) => {
      if (!ativo) return;
      const erroCombinado = rr.error ?? rg.error;
      if (erroCombinado) {
        setErro(erroCombinado.message);
      } else {
        setRiscos(rr.data as Risco[]);
        setGhes(rg.data as Ghe[]);
      }
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [empresaAtiva]);

  const ghesPorId = useMemo(() => new Map(ghes.map((g) => [g.id, g])), [ghes]);

  const contagem = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const r of riscos) {
      const chave = `${r.probabilidade}-${r.severidade}`;
      mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
    }
    return mapa;
  }, [riscos]);

  const riscosDaCelula = celulaSelecionada
    ? riscos.filter(
        (r) => r.probabilidade === celulaSelecionada.probabilidade && r.severidade === celulaSelecionada.severidade
      )
    : [];

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">Matriz de Riscos</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Grade de probabilidade x severidade com a contagem de riscos do inventário em cada combinação
          </p>
        </div>
        <Link
          to="/riscos"
          className="h-12 rounded-lg border border-outline text-on-surface-variant text-label-md flex items-center justify-center gap-2 px-5 hover:bg-surface-container transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">inventory_2</span>
          Inventário de Riscos
        </Link>
      </header>

      <div className="px-margin-mobile md:px-md pb-8 flex-1 flex flex-col gap-6">
        {erro && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erro}
          </div>
        )}

        {carregando ? (
          <div className="h-96 rounded-xl bg-surface-container animate-pulse" />
        ) : riscos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/40">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">grid_view</span>
            <p className="text-body-md text-on-surface-variant mb-4">
              Nenhum risco cadastrado ainda — a matriz aparece aqui assim que houver riscos no inventário.
            </p>
            <Link to="/riscos/novo" className="text-label-md text-primary-container hover:underline">
              Cadastrar o primeiro risco
            </Link>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 overflow-x-auto">
            <div className="min-w-[520px]">
              <div
                className="grid gap-1.5"
                style={{ gridTemplateColumns: 'auto repeat(5, minmax(0, 1fr))' }}
              >
                <div />
                <div className="col-span-5 text-center text-label-md text-on-surface-variant pb-1">
                  Severidade
                </div>

                {ESCALA.map((probabilidade) => (
                  <div key={probabilidade} className="contents">
                    {probabilidade === 5 ? (
                      <div className="row-span-5 flex items-center justify-center">
                        <span
                          className="text-label-md text-on-surface-variant whitespace-nowrap"
                          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                        >
                          Probabilidade
                        </span>
                      </div>
                    ) : null}
                    {SEVERIDADES.map((severidade) => {
                      const total = contagem.get(`${probabilidade}-${severidade}`) ?? 0;
                      const nivel = classificarNivelRisco(probabilidade * severidade);
                      const selecionada =
                        celulaSelecionada?.probabilidade === probabilidade &&
                        celulaSelecionada?.severidade === severidade;
                      return (
                        <button
                          key={severidade}
                          onClick={() =>
                            setCelulaSelecionada(
                              selecionada ? null : { probabilidade, severidade }
                            )
                          }
                          disabled={total === 0}
                          className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all ${fundoCelulaMatriz(
                            nivel
                          )} ${total === 0 ? 'opacity-40 cursor-default' : 'hover:opacity-80 cursor-pointer'} ${
                            selecionada ? 'ring-2 ring-offset-2 ring-primary' : ''
                          }`}
                          title={`Probabilidade ${probabilidade} × Severidade ${severidade} — ${NIVEL_RISCO_LABEL[nivel]}`}
                        >
                          <span className="text-title-lg font-semibold">{total}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}

                <div />
                {SEVERIDADES.map((s) => (
                  <div key={s} className="text-center text-label-sm text-on-surface-variant pt-1">
                    {s}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-outline-variant/40">
                {(['baixo', 'medio', 'alto', 'critico'] as const).map((n) => (
                  <div key={n} className="flex items-center gap-2">
                    <span className={`size-4 rounded ${fundoCelulaMatriz(n)}`} />
                    <span className="text-label-sm text-on-surface-variant">{NIVEL_RISCO_LABEL[n]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {celulaSelecionada && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-title-lg text-primary">
                Riscos com Probabilidade {celulaSelecionada.probabilidade} × Severidade{' '}
                {celulaSelecionada.severidade}
              </h2>
              <button
                onClick={() => setCelulaSelecionada(null)}
                className="text-label-sm text-primary-container hover:underline"
              >
                Limpar seleção
              </button>
            </div>
            {riscosDaCelula.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">Nenhum risco nesta combinação.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {riscosDaCelula.map((r) => {
                  const nivel = classificarNivelRisco(r.probabilidade * r.severidade);
                  const ghe = ghesPorId.get(r.ghe_id);
                  return (
                    <button
                      key={r.id}
                      onClick={() => navigate(`/riscos/${r.id}`)}
                      className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex gap-4 items-start"
                    >
                      <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                        <span className="material-symbols-outlined">{TIPO_RISCO_ICONE[r.tipo_risco]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-body-lg text-primary font-semibold truncate">{r.descricao}</h3>
                        <p className="text-label-sm text-on-surface-variant truncate">
                          {ghe?.nome ?? '—'} · {TIPO_RISCO_LABEL[r.tipo_risco]}
                        </p>
                      </div>
                      <span className={`shrink-0 px-2.5 py-1 rounded-full text-label-sm ${corNivelRisco(nivel)}`}>
                        {NIVEL_RISCO_LABEL[nivel]}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
