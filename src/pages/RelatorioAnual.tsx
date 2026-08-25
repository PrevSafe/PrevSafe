import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { MOTIVO_AFASTAMENTO_LABEL, type MotivoAfastamento } from '@/lib/afastamentos';

type AsoExame = { id: string; data_exame: string; resultado: 'apto' | 'inapto' };
type Afastamento = { id: string; funcionario_id: string; data_inicio: string; motivo: MotivoAfastamento };
type Cat = { id: string; funcionario_id: string; data_emissao: string };

type LotacaoAberta = { funcionario_id: string; lotacao_id: string };
type LotacaoCatalogo = { id: string; setor_id: string };
type Setor = { id: string; nome: string };

const ANO_MAIS_ANTIGO_PADRAO = 5; // quantos anos além do atual oferecer no seletor, no mínimo

/**
 * Extrai o ano de uma data 'yyyy-mm-dd' pelos primeiros 4 caracteres, em vez
 * de `new Date(iso).getFullYear()` — esse parse trata a string como UTC
 * meia-noite e `.getFullYear()` lê de volta no fuso local do navegador,
 * então um evento de 1º de janeiro pode voltar como o ano anterior para
 * usuários no Brasil (UTC-3).
 */
function anoDe(iso: string): number {
  return Number(iso.slice(0, 4));
}

export default function RelatorioAnual() {
  const { empresaAtiva } = useAuth();

  const [asoExames, setAsoExames] = useState<AsoExame[]>([]);
  const [afastamentos, setAfastamentos] = useState<Afastamento[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [lotacoesAbertas, setLotacoesAbertas] = useState<LotacaoAberta[]>([]);
  const [lotacoesCatalogo, setLotacoesCatalogo] = useState<LotacaoCatalogo[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    setCarregando(true);
    const empresaId = empresaAtiva.empresa_id;

    // Busca todo o histórico de cada tabela (sem filtrar por ano na query) para
    // permitir detectar dinamicamente a faixa de anos disponível no seletor, e
    // filtra por ano no cliente ao montar os indicadores.
    Promise.all([
      daEmpresa(supabase.from('aso_exames').select('id, data_exame, resultado'), empresaId),
      daEmpresa(
        supabase.from('funcionarios_afastamentos').select('id, funcionario_id, data_inicio, motivo'),
        empresaId
      ),
      daEmpresa(supabase.from('cat_comunicacoes').select('id, funcionario_id, data_emissao'), empresaId),
      daEmpresa(
        supabase.from('funcionarios_lotacoes').select('funcionario_id, lotacao_id'),
        empresaId
      ).is('data_fim', null),
      daEmpresa(supabase.from('lotacoes').select('id, setor_id'), empresaId),
      daEmpresa(supabase.from('setores').select('id, nome'), empresaId),
    ]).then(([ra, raf, rc, rla, rl, rs]) => {
      if (!ativo) return;
      const erroCombinado = ra.error ?? raf.error ?? rc.error ?? rla.error ?? rl.error ?? rs.error;
      if (erroCombinado) {
        setErro(erroCombinado.message);
        setCarregando(false);
        return;
      }
      setAsoExames((ra.data ?? []) as AsoExame[]);
      setAfastamentos((raf.data ?? []) as Afastamento[]);
      setCats((rc.data ?? []) as Cat[]);
      setLotacoesAbertas((rla.data ?? []) as LotacaoAberta[]);
      setLotacoesCatalogo((rl.data ?? []) as LotacaoCatalogo[]);
      setSetores((rs.data ?? []) as Setor[]);
      setCarregando(false);
    });

    return () => {
      ativo = false;
    };
  }, [empresaAtiva]);

  // Faixa de anos do seletor: do ano corrente até 5 anos atrás, estendida para
  // trás automaticamente se houver dados mais antigos que isso (ex.: empresa
  // migrou histórico de ASO/afastamentos de anos anteriores).
  const anosDisponiveis = useMemo(() => {
    const anoMaisAntigoNosDados = Math.min(
      anoAtual,
      ...asoExames.map((a) => anoDe(a.data_exame)),
      ...afastamentos.map((a) => anoDe(a.data_inicio)),
      ...cats.map((c) => anoDe(c.data_emissao))
    );
    const anoMinimo = Math.min(anoAtual - ANO_MAIS_ANTIGO_PADRAO, anoMaisAntigoNosDados);
    const anos: number[] = [];
    for (let a = anoAtual; a >= anoMinimo; a--) anos.push(a);
    return anos;
  }, [anoAtual, asoExames, afastamentos, cats]);

  // Setor de cada funcionário: usa a lotação VIGENTE (data_fim is null), não a
  // lotação histórica na data do evento (ASO/afastamento/CAT). Limitação
  // conhecida da v1 — um funcionário transferido de setor terá todo o seu
  // histórico anual atribuído ao setor onde está hoje, não ao setor em que
  // estava quando o evento ocorreu. Fazer o cálculo "correto" exigiria
  // reconstruir a lotação vigente em cada data específica a partir do
  // histórico de funcionarios_lotacoes, o que fica para uma v2.
  const setorPorFuncionario = useMemo(() => {
    const lotacoesPorId = new Map(lotacoesCatalogo.map((l) => [l.id, l]));
    const setoresPorId = new Map(setores.map((s) => [s.id, s]));
    const mapa = new Map<string, string>();
    for (const la of lotacoesAbertas) {
      const lot = lotacoesPorId.get(la.lotacao_id);
      const setor = lot ? setoresPorId.get(lot.setor_id) : null;
      mapa.set(la.funcionario_id, setor?.nome ?? 'Sem setor definido');
    }
    return mapa;
  }, [lotacoesAbertas, lotacoesCatalogo, setores]);

  const asoDoAno = useMemo(
    () => asoExames.filter((a) => anoDe(a.data_exame) === ano),
    [asoExames, ano]
  );
  const afastamentosDoAno = useMemo(
    () => afastamentos.filter((a) => anoDe(a.data_inicio) === ano),
    [afastamentos, ano]
  );
  const catsDoAno = useMemo(
    () => cats.filter((c) => anoDe(c.data_emissao) === ano),
    [cats, ano]
  );

  const totalAso = asoDoAno.length;
  const totalApto = asoDoAno.filter((a) => a.resultado === 'apto').length;
  const pctApto = totalAso > 0 ? Math.round((totalApto / totalAso) * 100) : 0;
  const pctInapto = totalAso > 0 ? 100 - pctApto : 0;

  const totalAfastamentos = afastamentosDoAno.length;
  const totalCats = catsDoAno.length;

  const afastamentosPorSetor = useMemo(() => {
    const mapa = new Map<string, { setor: string; afastamentos: number; cats: number }>();
    for (const a of afastamentosDoAno) {
      const setor = setorPorFuncionario.get(a.funcionario_id) ?? 'Sem setor definido';
      const linha = mapa.get(setor) ?? { setor, afastamentos: 0, cats: 0 };
      linha.afastamentos += 1;
      mapa.set(setor, linha);
    }
    for (const c of catsDoAno) {
      const setor = setorPorFuncionario.get(c.funcionario_id) ?? 'Sem setor definido';
      const linha = mapa.get(setor) ?? { setor, afastamentos: 0, cats: 0 };
      linha.cats += 1;
      mapa.set(setor, linha);
    }
    return Array.from(mapa.values()).sort((a, b) => b.afastamentos - a.afastamentos);
  }, [afastamentosDoAno, catsDoAno, setorPorFuncionario]);

  const afastamentosPorMotivo = useMemo(() => {
    const mapa = new Map<MotivoAfastamento, number>();
    for (const a of afastamentosDoAno) {
      mapa.set(a.motivo, (mapa.get(a.motivo) ?? 0) + 1);
    }
    return (Object.keys(MOTIVO_AFASTAMENTO_LABEL) as MotivoAfastamento[])
      .map((motivo) => ({ motivo, total: mapa.get(motivo) ?? 0 }))
      .filter((linha) => linha.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [afastamentosDoAno]);

  const semDadosNoAno = totalAso === 0 && totalAfastamentos === 0 && totalCats === 0;

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">Relatório Analítico Anual</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Compilado estatístico de agravos à saúde e tendências por setor, exigido pelo PCMSO (NR-7)
          </p>
        </div>
        <select
          value={ano}
          onChange={(e) => setAno(Number(e.target.value))}
          className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md focus:outline-none focus:border-2 focus:border-primary-container shrink-0"
        >
          {anosDisponiveis.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </header>

      <div className="px-margin-mobile md:px-md pb-8 flex-1 flex flex-col gap-6">
        {erro && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erro}
          </div>
        )}

        {carregando ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-xl bg-surface-container animate-pulse" />
              ))}
            </div>
            <div className="h-64 rounded-xl bg-surface-container animate-pulse" />
            <div className="h-64 rounded-xl bg-surface-container animate-pulse" />
          </div>
        ) : semDadosNoAno ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/40">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">
              monitoring
            </span>
            <p className="text-body-md text-on-surface-variant">
              Nenhum ASO, afastamento ou CAT registrado em {ano}.
            </p>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <Card rotulo="ASOs realizados" icone="medical_information" valor={String(totalAso)} cor="text-primary" />
              <Card
                rotulo="Apto x Inapto"
                icone="fact_check"
                valor={totalAso > 0 ? `${pctApto}% / ${pctInapto}%` : '—'}
                cor="text-success"
              />
              <Card
                rotulo="Afastamentos no ano"
                icone="event_busy"
                valor={String(totalAfastamentos)}
                cor="text-[#F97316]"
              />
              <Card rotulo="CATs emitidas" icone="report" valor={String(totalCats)} cor="text-error" />
            </section>

            <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/40 overflow-hidden">
              <div className="p-md border-b border-outline-variant/40">
                <h3 className="text-title-lg text-primary">Afastamentos por setor</h3>
                <p className="text-label-sm text-on-surface-variant mt-1">
                  Setor atual do funcionário — não necessariamente o setor em que ele estava na data do evento
                </p>
              </div>
              {afastamentosPorSetor.length === 0 ? (
                <div className="p-md">
                  <Vazio texto="Nenhum afastamento no ano selecionado." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-body-md">
                    <thead>
                      <tr className="border-b border-outline-variant/40">
                        <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant">Setor</th>
                        <th className="text-center px-4 py-3 text-label-sm text-on-surface-variant">
                          Afastamentos
                        </th>
                        <th className="text-center px-4 py-3 text-label-sm text-on-surface-variant">CATs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {afastamentosPorSetor.map((linha) => (
                        <tr key={linha.setor} className="border-b border-outline-variant/20 last:border-0">
                          <td className="px-4 py-3 text-on-surface">{linha.setor}</td>
                          <td className="px-4 py-3 text-center text-on-surface">{linha.afastamentos}</td>
                          <td className="px-4 py-3 text-center text-on-surface">{linha.cats}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/40 overflow-hidden">
              <div className="p-md border-b border-outline-variant/40">
                <h3 className="text-title-lg text-primary">Afastamentos por motivo</h3>
              </div>
              {afastamentosPorMotivo.length === 0 ? (
                <div className="p-md">
                  <Vazio texto="Nenhum afastamento no ano selecionado." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-body-md">
                    <thead>
                      <tr className="border-b border-outline-variant/40">
                        <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant">Motivo</th>
                        <th className="text-center px-4 py-3 text-label-sm text-on-surface-variant">
                          Quantidade
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {afastamentosPorMotivo.map((linha) => (
                        <tr key={linha.motivo} className="border-b border-outline-variant/20 last:border-0">
                          <td className="px-4 py-3 text-on-surface">
                            {MOTIVO_AFASTAMENTO_LABEL[linha.motivo]}
                          </td>
                          <td className="px-4 py-3 text-center text-on-surface">{linha.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}

function Card({
  rotulo,
  icone,
  valor,
  cor,
}: {
  rotulo: string;
  icone: string;
  valor: string;
  cor: string;
}) {
  return (
    <div className="bg-surface-container-lowest p-md rounded-xl border border-surface-container-high shadow-sm flex flex-col justify-between relative overflow-hidden">
      <span
        className={`material-symbols-outlined absolute top-4 right-4 text-4xl opacity-10 ${cor}`}
      >
        {icone}
      </span>
      <p className="text-label-md text-on-surface-variant uppercase tracking-wider">{rotulo}</p>
      <span className={`text-display-lg mt-4 ${cor}`}>{valor}</span>
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
      <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">inbox</span>
      <p className="text-label-md text-on-surface-variant">{texto}</p>
    </div>
  );
}
