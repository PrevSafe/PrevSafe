import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { agruparAlertas, auditarEmpresa } from '@/lib/sstLinter';

/**
 * Tabelas de entrada de dados operacionais do dia a dia que alimentam o SST
 * Linter (`auditarEmpresa`/`carregarAuditoriaFuncionario`). Ficam de fora
 * tabelas de catálogo estático (procedimentos_t27, riscos_exames_compatibilidade,
 * cargos) e folha_agente_nocivo, que é lançamento mensal de competência e não
 * muda em rajada durante o uso do sistema.
 */
const TABELAS_LINTER = [
  'riscos_inventario',
  'aso_exames_procedimentos',
  'epi_entregas',
  'funcionarios_afastamentos',
  'cat_comunicacoes',
  'funcionarios',
  'funcionarios_lotacoes',
  'aso_exames',
] as const;

const DEBOUNCE_MS = 900;

type Tarefa = {
  id: string;
  titulo: string;
  tipo: string;
  prioridade: 'alta' | 'normal' | 'baixa';
  inicio_em: string;
  responsavel_nome: string | null;
};

type Resumo = {
  conformidade_geral: number | null;
  conformidade_mes_anterior: number | null;
  proximas_tarefas: Tarefa[];
};

const ICONE_TIPO: Record<string, string> = {
  inspecao: 'engineering',
  documento: 'description',
  treinamento: 'school',
  manutencao: 'build',
  outro: 'task',
};

export default function Dashboard() {
  const { perfil, empresaAtiva } = useAuth();
  const [dados, setDados] = useState<Resumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [linterBloqueios, setLinterBloqueios] = useState(0);
  const [linterAvisos, setLinterAvisos] = useState(0);
  const [linterCarregando, setLinterCarregando] = useState(true);
  const [linterAtualizando, setLinterAtualizando] = useState(false);
  const [linterErro, setLinterErro] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    setCarregando(true);
    supabase
      .rpc('dashboard_resumo', { p_empresa_id: empresaAtiva.empresa_id })
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) setErro(error.message);
        else setDados(data as Resumo);
        setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [empresaAtiva]);

  // Linter SST em tempo real: roda auditarEmpresa ao montar e recalcula,
  // com debounce, sempre que os dados que ele consulta mudam no banco.
  useEffect(() => {
    if (!empresaAtiva) {
      setLinterCarregando(false);
      return;
    }
    let ativo = true;
    const empresaId = empresaAtiva.empresa_id;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    async function recalcular(primeiraCarga: boolean) {
      if (primeiraCarga) setLinterCarregando(true);
      else setLinterAtualizando(true);
      try {
        const brutos = await auditarEmpresa(empresaId);
        const agrupados = agruparAlertas(brutos);
        if (!ativo) return;
        setLinterBloqueios(agrupados.filter((a) => a.severidade === 'HARD_BLOCK').length);
        setLinterAvisos(agrupados.filter((a) => a.severidade === 'WARNING_ADVISORY').length);
        setLinterErro(null);
      } catch (e) {
        if (ativo) setLinterErro(e instanceof Error ? e.message : String(e));
      } finally {
        if (ativo) {
          setLinterCarregando(false);
          setLinterAtualizando(false);
        }
      }
    }

    function agendarRecalculo() {
      if (debounceTimer) clearTimeout(debounceTimer);
      setLinterAtualizando(true);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void recalcular(false);
      }, DEBOUNCE_MS);
    }

    void recalcular(true);

    const channel = supabase.channel(`sst-linter-${empresaId}`);
    for (const tabela of TABELAS_LINTER) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tabela, filter: `empresa_id=eq.${empresaId}` },
        agendarRecalculo
      );
    }
    channel.subscribe();

    return () => {
      ativo = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [empresaAtiva]);

  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const dataFormatada = hoje.charAt(0).toUpperCase() + hoje.slice(1);
  const primeiroNome = perfil?.nome?.split(' ')[0] ?? '';

  const conformidade = dados?.conformidade_geral ?? null;
  const anterior = dados?.conformidade_mes_anterior ?? null;
  const variacao = conformidade !== null && anterior !== null ? conformidade - anterior : null;

  return (
    <>
      <header className="hidden md:flex items-center justify-between px-md py-6">
        <div>
          <h1 className="text-display-lg text-primary">Olá, {primeiroNome}</h1>
          <p className="text-body-lg text-on-surface-variant mt-1">{dataFormatada}</p>
        </div>
      </header>

      <div className="md:hidden px-margin-mobile py-6">
        <h2 className="text-headline-lg text-primary">Olá, {primeiroNome}</h2>
        <p className="text-body-md text-on-surface-variant mt-1">{dataFormatada}</p>
      </div>

      <div className="px-margin-mobile md:px-md space-y-6 md:space-y-8 flex-1 pb-8">
        {erro && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            Não foi possível carregar os indicadores: {erro}
          </div>
        )}

        {carregando ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-32 rounded-xl bg-surface-container animate-pulse ${
                  i === 2 ? 'col-span-2' : ''
                }`}
              />
            ))}
          </div>
        ) : (
          <>
            {/* Cards de resumo */}
            <section className="grid grid-cols-1 gap-4 md:gap-6">
              <div className="bg-surface-container-lowest p-md rounded-xl border border-surface-container-high shadow-sm relative overflow-hidden group">
                <span className="material-symbols-outlined absolute top-4 right-4 text-5xl text-success opacity-10">
                  verified
                </span>
                <p className="text-label-md text-on-surface-variant uppercase tracking-wider">
                  Taxa de conformidade (90 dias)
                </p>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-display-lg text-success">
                    {conformidade !== null ? `${conformidade}%` : '—'}
                  </span>
                  {variacao !== null && variacao !== 0 && (
                    <span className="text-label-sm text-success bg-secondary-container/30 px-2 py-1 rounded-full flex items-center">
                      <span className="material-symbols-outlined text-[14px] mr-1">
                        {variacao > 0 ? 'trending_up' : 'trending_down'}
                      </span>
                      {variacao > 0 ? '+' : ''}
                      {variacao}% vs. mês anterior
                    </span>
                  )}
                </div>
                <div className="w-full bg-surface-container-high h-2 rounded-full mt-4 overflow-hidden">
                  <div
                    className="bg-success h-full rounded-full transition-all duration-500"
                    style={{ width: `${conformidade ?? 0}%` }}
                  />
                </div>
              </div>
            </section>

            {/* Linter SST em tempo real */}
            <section className="bg-surface-container-lowest p-md rounded-xl border border-surface-container-high shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-title-lg text-primary flex items-center">
                  <span className="material-symbols-outlined mr-2">rule</span>
                  Linter SST — Tempo real
                </h3>
                {linterAtualizando && (
                  <span className="flex items-center text-label-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] mr-1 animate-spin">
                      progress_activity
                    </span>
                    Atualizando…
                  </span>
                )}
              </div>

              {linterCarregando ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-24 rounded-lg bg-surface-container animate-pulse" />
                  <div className="h-24 rounded-lg bg-surface-container animate-pulse" />
                </div>
              ) : linterErro ? (
                <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
                  Não foi possível calcular o Linter SST: {linterErro}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-surface-container-high p-4">
                    <p className="text-label-md text-on-surface-variant uppercase tracking-wider">
                      Bloqueios (HARD_BLOCK)
                    </p>
                    <span
                      className={`text-display-lg mt-2 block ${
                        linterBloqueios > 0 ? 'text-error' : 'text-success'
                      }`}
                    >
                      {linterBloqueios}
                    </span>
                  </div>
                  <div className="rounded-lg border border-surface-container-high p-4">
                    <p className="text-label-md text-on-surface-variant uppercase tracking-wider">
                      Avisos (WARNING_ADVISORY)
                    </p>
                    <span
                      className={`text-display-lg mt-2 block ${
                        linterAvisos > 0 ? 'text-[#F97316]' : 'text-success'
                      }`}
                    >
                      {linterAvisos}
                    </span>
                  </div>
                </div>
              )}

              {linterBloqueios > 0 && (
                <Link
                  to="/documentos"
                  className="mt-4 inline-flex items-center text-label-md text-primary hover:underline"
                >
                  Ver detalhes
                  <span className="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
                </Link>
              )}
            </section>

            {/* Agenda */}
            <section className="bg-surface-container-lowest rounded-xl border border-surface-container-high shadow-sm overflow-hidden">
              <div className="p-md border-b border-surface-container-high flex justify-between items-center">
                <h3 className="text-title-lg text-primary flex items-center">
                  <span className="material-symbols-outlined mr-2">calendar_today</span>
                  Próximas tarefas
                </h3>
              </div>

              {dados?.proximas_tarefas.length ? (
                <div className="divide-y divide-surface-container-high">
                  {dados.proximas_tarefas.map((t) => (
                    <div key={t.id} className="p-md flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="shrink-0 bg-surface-container p-3 rounded-lg text-on-surface-variant w-fit">
                        <span className="material-symbols-outlined">
                          {ICONE_TIPO[t.tipo] ?? 'task'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-body-lg text-primary font-semibold">{t.titulo}</h4>
                        <div className="flex flex-wrap items-center mt-1 text-on-surface-variant text-label-sm gap-x-4">
                          <span className="flex items-center">
                            <span className="material-symbols-outlined text-[16px] mr-1">
                              schedule
                            </span>
                            {new Date(t.inicio_em).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {t.responsavel_nome && (
                            <span className="flex items-center">
                              <span className="material-symbols-outlined text-[16px] mr-1">
                                person
                              </span>
                              {t.responsavel_nome}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center px-3 py-1 rounded-full text-label-sm w-fit ${
                          t.prioridade === 'alta'
                            ? 'bg-error-container text-on-error-container'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        {t.prioridade === 'alta' ? 'Alta prioridade' : 'Normal'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-md">
                  <Vazio texto="Nenhuma tarefa agendada." />
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
      <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">
        inbox
      </span>
      <p className="text-label-md text-on-surface-variant">{texto}</p>
    </div>
  );
}