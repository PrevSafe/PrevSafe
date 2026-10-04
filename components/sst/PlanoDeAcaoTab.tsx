'use client';

/**
 * Plano de acao do PGR (NR-01, subitens 1.5.5.2 e 1.5.5.3): a tela.
 *
 * O plano deixou de ser uma tabela calculada na hora de imprimir e virou
 * registro (colecao pgrActionPlan). E aqui que a acao nasce, e aceita,
 * acompanhada, concluida, aferida, reaberta ou descartada. As regras - o que
 * falta numa acao, quando ela esta atrasada, que prazo a classificacao impoe,
 * o que o contexto recusa - ficam em lib/planoDeAcao.ts, a mesma regra que o
 * PDF do PGR usa. Esta tela nao decide nada que o PGR decida diferente.
 *
 * SUGESTAO NAO E PLANO. A sugestao (do catalogo, do inventario ou cadastrada
 * a mao) so entra no PGR quando alguem a aceita com responsavel, prazo, forma
 * de acompanhamento e forma de afericao. Por isso o aceite nao traz
 * responsavel nem prazo preenchidos: um nome ou uma data que ninguem definiu
 * sairia no PGR como se alguem tivesse definido.
 */

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import type {
  HierarquiaDaMedida,
  JustificativaDaHierarquia,
  PgrActionPlanItem,
  StatusDaAcaoDoPlano,
  TipoDaAcaoDoPlano
} from '@/types';
import {
  ORDEM_DA_HIERARQUIA,
  ROTULO_DA_HIERARQUIA,
  ROTULO_DA_JUSTIFICATIVA,
  ROTULO_DO_TIPO,
  ROTULO_DO_STATUS,
  STATUS_DO_PLANO,
  FALTA_SUGESTAO_NAO_ACEITA,
  EXPOSTOS_QUE_ELEVAM_O_PRAZO,
  FRACAO_DO_EFETIVO_QUE_ELEVA_O_PRAZO,
  acaoAceita,
  acoesDoPlano,
  dataBR,
  dataValida,
  estaAtrasada,
  exigeJustificativa,
  faltasDaAcao,
  hierarquiaDoControle,
  limiteDaFaixa,
  porCriacao,
  statusExibido,
  type AcaoDoPlano,
  type PrazoDaClassificacao
} from '@/lib/planoDeAcao';
import { DECISAO_POR_NIVEL, type RiscoClassificado } from '@/lib/classificacaoDeRisco';
import { dataDeHoje, formatarDataISO, FUSO_PADRAO } from '@/lib/datas';
import {
  ClipboardList,
  Plus,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Trash2,
  CirclePlay,
  Flag,
  Gauge,
  RotateCcw,
  Ban,
  History,
  X,
  Info,
  ChevronDown,
  ChevronRight,
  Users
} from 'lucide-react';

interface PlanoDeAcaoTabProps {
  selectedClientId: string;
}

// ---------------------------------------------------------------------------
// Rotulos e estilos
// ---------------------------------------------------------------------------

const NUMERAIS = ['I', 'II', 'III', 'IV'];
const numeralDa = (h: HierarquiaDaMedida): string => NUMERAIS[ORDEM_DA_HIERARQUIA.indexOf(h)] || '';

const ROTULO_DA_ORIGEM: Record<PgrActionPlanItem['origin'], string> = {
  CATALOGO: 'Catálogo',
  INVENTARIO: 'Inventário',
  MANUAL: 'Manual'
};

const COR_DO_STATUS: Record<StatusDaAcaoDoPlano, string> = {
  SUGERIDA: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  NAO_INICIADA: 'bg-slate-800 text-slate-300 border-slate-700',
  EM_ANDAMENTO: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  CONCLUIDA: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  EFICACIA_VERIFICADA: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  DESCARTADA: 'bg-slate-900 text-slate-500 border-slate-800'
};
const COR_ATRASADA = 'bg-rose-500/15 text-rose-300 border-rose-500/30';

const COR_DO_NIVEL: Record<string, string> = {
  MUITO_ALTO: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  ALTO: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  MEDIO: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  BAIXO: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
};

const ROTULO = 'block text-slate-400 font-semibold mb-1';
const CAMPO =
  'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-teal-500';
const BOTAO = 'px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors border';
const BOTAO_NEUTRO = `${BOTAO} bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-slate-100`;
const BOTAO_PRINCIPAL = `${BOTAO} bg-teal-500 border-teal-400 text-slate-950 hover:bg-teal-400`;
const BOTAO_PERIGO = `${BOTAO} bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20`;

const acaoConcluida = (a: PgrActionPlanItem | null | undefined) =>
  !!a && (a.status === 'CONCLUIDA' || a.status === 'EFICACIA_VERIFICADA');

/** Data e hora do historico no fuso de quem usa o sistema: o ISO gravado e UTC. */
function dataHora(iso: string): string {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return iso || '';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: FUSO_PADRAO,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d).replace(',', '');
  } catch {
    return iso.slice(0, 16).replace('T', ' ');
  }
}

/** accepted_at e data e hora UTC: cortar o ISO daria o dia seguinte depois das 21h. */
const dataLocal = (iso: string | undefined) => (iso ? dataBR(formatarDataISO(iso)) : '');

// ---------------------------------------------------------------------------
// Formularios
// ---------------------------------------------------------------------------

type ModoDoFormulario = 'NOVA' | 'ACEITAR' | 'EDITAR';

interface FormDaAcao {
  measure: string;
  hierarchy: HierarquiaDaMedida | '';
  hierarchy_justification: JustificativaDaHierarquia | '';
  hierarchy_justification_note: string;
  action_type: TipoDaAcaoDoPlano;
  responsible: string;
  deadline: string;
  monitoring: string;
  measurement: string;
  status: StatusDaAcaoDoPlano;
  motivoDoPrazo: string;
}

// Hierarquia em branco: escolher o nivel e decisao tecnica, nao padrao da tela.
const FORM_VAZIO: FormDaAcao = {
  measure: '',
  hierarchy: '',
  hierarchy_justification: '',
  hierarchy_justification_note: '',
  action_type: 'INTRODUZIR',
  responsible: '',
  deadline: '',
  monitoring: '',
  measurement: '',
  status: 'NAO_INICIADA',
  motivoDoPrazo: ''
};

type TipoDeRegistro = 'CONCLUIR' | 'EFICACIA' | 'REABRIR' | 'DESCARTAR';

interface FormDeRegistro {
  /** Conclusao (CONCLUIR) ou afericao (EFICACIA). */
  data: string;
  /** Data em que os trabalhadores foram informados (subitem 1.5.5.1.3). */
  dataInformados: string;
  /** Evidencia, resultado da afericao ou motivo. */
  texto: string;
  /** REABRIR: novo prazo, opcional. */
  novoPrazo: string;
}

const REGISTRO_VAZIO: FormDeRegistro = { data: '', dataInformados: '', texto: '', novoPrazo: '' };

interface GrupoDoRisco {
  risco: any;
  /** R-<GHE>-NN, o mesmo numero do PGR. */
  id: string;
  gheNome: string;
  classificado: RiscoClassificado | null;
  expostos: number;
  prazoDaFaixa: PrazoDaClassificacao | null;
  /** As linhas do risco como saem no quadro do PGR. */
  linhas: AcaoDoPlano[];
}

// ---------------------------------------------------------------------------
// Pecas
// ---------------------------------------------------------------------------

const Modal: React.FC<{
  titulo: React.ReactNode;
  subtitulo?: React.ReactNode;
  icone: React.ReactNode;
  largura: string;
  aoFechar: () => void;
  children: React.ReactNode;
}> = ({ titulo, subtitulo, icone, largura, aoFechar, children }) => (
  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div
      className={`bg-slate-900 border border-slate-800 rounded-2xl w-full ${largura} p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            {icone}
            {titulo}
          </h3>
          {subtitulo && <p className="text-[11px] text-slate-400 mt-1 break-words">{subtitulo}</p>}
        </div>
        <button
          type="button"
          onClick={aoFechar}
          className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 shrink-0"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const ErroDoModal: React.FC<{ texto: string | null }> = ({ texto }) =>
  texto ? (
    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2 text-xs text-rose-200">
      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
      <span className="break-words">{texto}</span>
    </div>
  ) : null;

const Obrigatorio = () => <span className="text-rose-400">*</span>;

// ---------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------

export const PlanoDeAcaoTab: React.FC<PlanoDeAcaoTabProps> = ({ selectedClientId }) => {
  const {
    ghes = [],
    environmentalRisks = [],
    employees = [],
    pgrActionPlan = [],
    addPgrActionPlanItem,
    updatePgrActionPlanItem,
    deletePgrActionPlanItem,
    sugerirAcoesParaRiscosSemPlano
  } = usePrevSafe();

  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  const [formulario, setFormulario] = useState<{
    modo: ModoDoFormulario;
    riscoId: string;
    acao: PgrActionPlanItem | null;
  } | null>(null);
  const [form, setForm] = useState<FormDaAcao>({ ...FORM_VAZIO });
  const [erroDoModal, setErroDoModal] = useState<string | null>(null);

  const [registro, setRegistro] = useState<{ tipo: TipoDeRegistro; acaoId: string } | null>(null);
  const [formRegistro, setFormRegistro] = useState<FormDeRegistro>({ ...REGISTRO_VAZIO });

  const [historicoId, setHistoricoId] = useState<string | null>(null);
  const [descartadasAbertas, setDescartadasAbertas] = useState<Record<string, boolean>>({});

  const hoje = dataDeHoje();

  // O recorte do PGR (exportPGRDocumentPdf): risco de GHE do cliente, ou com o
  // proprio client_id. Recortar diferente mudaria a ordem e o numero R-..., e
  // a tela e o documento chamariam acoes diferentes pelo mesmo numero.
  const ghesDoCliente = ghes.filter((g) => g.client_id === selectedClientId);
  const idsDeGhe = new Set(ghesDoCliente.map((g) => g.id));
  const riscosDoCliente = environmentalRisks.filter(
    (r) => idsDeGhe.has(r.ghe_id) || r.client_id === selectedClientId
  );
  // O PDF recebe os empregados do cliente e conta os expostos entre eles; a
  // regra dos 20% da secao 5.7 usa o efetivo do cliente.
  const empregadosDoCliente = employees.filter((e) => e.client_id === selectedClientId);
  const expostosDoGhe = (gheId: string) => empregadosDoCliente.filter((e) => e.ghe_id === gheId).length;

  const linhas = acoesDoPlano(riscosDoCliente, ghesDoCliente, expostosDoGhe, {
    acoes: pgrActionPlan,
    efetivo: empregadosDoCliente.length,
    hoje
  });

  // Agrupa por risco na ordem do quadro do PGR (prioridade da classificacao e,
  // no mesmo nivel, numero de expostos).
  const grupos: GrupoDoRisco[] = [];
  const grupoDoRisco = new Map<string, GrupoDoRisco>();
  linhas.forEach((l) => {
    const chave = String(l.risco?.id);
    let g = grupoDoRisco.get(chave);
    if (!g) {
      g = {
        risco: l.risco,
        id: l.id,
        gheNome: l.gheNome,
        classificado: l.classificado,
        expostos: l.expostos,
        prazoDaFaixa: l.prazoDaFaixa,
        linhas: []
      };
      grupoDoRisco.set(chave, g);
      grupos.push(g);
    }
    g.linhas.push(l);
  });

  // O numero de cada registro como sai no PGR. Acao fora do quadro (sugestao
  // de risco que ja tem acao aceita, descartada) fica sem numero.
  const numeroDoRegistro = new Map<string, string>();
  linhas.forEach((l) => {
    if (l.registro) numeroDoRegistro.set(l.registro.id, l.numero);
  });

  // A tela mostra TODAS as acoes gravadas do risco, e nao so as do PDF.
  const acoesDoRisco = (riscoId: string) =>
    pgrActionPlan.filter((a) => a?.risk_id === riscoId).sort(porCriacao);
  const acoesDoCliente = pgrActionPlan.filter((a) => grupoDoRisco.has(String(a?.risk_id)));

  /** O que o PGR aponta como pendente na acao. */
  const faltasDe = (a: PgrActionPlanItem): string[] => {
    if (a.status === 'DESCARTADA') return [];
    if (!acaoAceita(a)) return [FALTA_SUGESTAO_NAO_ACEITA];
    const g = grupoDoRisco.get(String(a.risk_id));
    return faltasDaAcao(a, { risco: g?.risco, prazoDaFaixa: g?.prazoDaFaixa ?? null });
  };

  // Resumo
  const riscosSemAcao = grupos.filter((g) => g.linhas.every((l) => !l.registro)).length;
  const riscosSemAceita = grupos.filter((g) => !g.linhas.some((l) => l.aceita)).length;
  const sugeridas = acoesDoCliente.filter((a) => a.status === 'SUGERIDA').length;
  const aceitas = acoesDoCliente.filter(acaoAceita);
  const atrasadas = aceitas.filter((a) => estaAtrasada(a, hoje)).length;
  const comFaltas = aceitas.filter((a) => faltasDe(a).length > 0).length;
  const descartadas = acoesDoCliente.filter((a) => a.status === 'DESCARTADA').length;

  // ------------------------------------------------------------------
  // Acoes da tela
  // ------------------------------------------------------------------

  const sugerir = () => {
    const r = sugerirAcoesParaRiscosSemPlano(selectedClientId);
    setAviso({ ok: r.ok, texto: r.message });
  };

  const abrirNova = (riscoId: string) => {
    setFormulario({ modo: 'NOVA', riscoId, acao: null });
    setForm({ ...FORM_VAZIO });
    setErroDoModal(null);
  };

  const abrirAceite = (a: PgrActionPlanItem) => {
    setFormulario({ modo: 'ACEITAR', riscoId: a.risk_id, acao: a });
    setForm({
      ...FORM_VAZIO,
      measure: a.measure || '',
      hierarchy: a.hierarchy || '',
      hierarchy_justification: a.hierarchy_justification || '',
      hierarchy_justification_note: a.hierarchy_justification_note || '',
      action_type: a.action_type || 'INTRODUZIR',
      // Responsavel e prazo NAO vem da sugestao: quem aceita e quem os define
      // (subitem 1.5.5.2.2). O prazo do limite da faixa fica a um clique.
      responsible: '',
      deadline: '',
      monitoring: a.monitoring || '',
      measurement: a.measurement || '',
      status: 'NAO_INICIADA'
    });
    setErroDoModal(null);
  };

  const abrirEdicao = (a: PgrActionPlanItem) => {
    setFormulario({ modo: 'EDITAR', riscoId: a.risk_id, acao: a });
    setForm({
      measure: a.measure || '',
      hierarchy: a.hierarchy || '',
      hierarchy_justification: a.hierarchy_justification || '',
      hierarchy_justification_note: a.hierarchy_justification_note || '',
      action_type: a.action_type || 'INTRODUZIR',
      responsible: a.responsible || '',
      deadline: a.deadline || '',
      monitoring: a.monitoring || '',
      measurement: a.measurement || '',
      status: a.status,
      motivoDoPrazo: ''
    });
    setErroDoModal(null);
  };

  const grupoDoFormulario = formulario ? grupoDoRisco.get(String(formulario.riscoId)) : undefined;
  const riscoDoFormulario = grupoDoFormulario?.risco;
  const anteriorDoFormulario = formulario?.acao || null;
  const justificarNoFormulario =
    !!form.hierarchy && exigeJustificativa(form.hierarchy as HierarquiaDaMedida, riscoDoFormulario);
  // O contexto recusa mudar o prazo de acao aceita sem motivo; o prazo
  // original fica no registro (secao 8 do PGR).
  const mudaPrazoAceito =
    formulario?.modo === 'EDITAR'
    && !!anteriorDoFormulario
    && acaoAceita(anteriorDoFormulario)
    && dataValida(anteriorDoFormulario.deadline)
    && form.deadline !== anteriorDoFormulario.deadline;

  const salvarFormulario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formulario) return;

    const dados = {
      measure: form.measure.trim(),
      hierarchy: form.hierarchy as HierarquiaDaMedida,
      // Justificativa so onde o subitem 1.5.5.1.2 a exige: trocada a
      // hierarquia para eliminacao ou protecao coletiva, ela sai do registro.
      hierarchy_justification: justificarNoFormulario && form.hierarchy_justification
        ? form.hierarchy_justification as JustificativaDaHierarquia
        : undefined,
      hierarchy_justification_note: justificarNoFormulario
        ? form.hierarchy_justification_note.trim() || undefined
        : undefined,
      action_type: form.action_type,
      responsible: form.responsible.trim() || undefined,
      deadline: form.deadline || undefined,
      monitoring: form.monitoring.trim() || undefined,
      measurement: form.measurement.trim() || undefined,
      status: form.status
    };

    let r: { ok: boolean; message: string };
    if (formulario.modo === 'NOVA') {
      if (!riscoDoFormulario) {
        setErroDoModal('Risco não encontrado no inventário deste cliente.');
        return;
      }
      r = addPgrActionPlanItem({
        client_id: riscoDoFormulario.client_id,
        risk_id: riscoDoFormulario.id,
        ghe_id: riscoDoFormulario.ghe_id,
        origin: 'MANUAL',
        ...dados
      });
    } else {
      r = updatePgrActionPlanItem(
        anteriorDoFormulario!.id,
        dados,
        mudaPrazoAceito ? form.motivoDoPrazo.trim() : undefined
      );
    }

    // A conferencia e do contexto (conferirAcao): a mensagem dele diz o que
    // falta, e o modal fica aberto para corrigir.
    if (!r.ok) {
      setErroDoModal(r.message);
      return;
    }
    setFormulario(null);
    setAviso({ ok: true, texto: r.message });
  };

  const abrirRegistro = (tipo: TipoDeRegistro, a: PgrActionPlanItem) => {
    setRegistro({ tipo, acaoId: a.id });
    setFormRegistro({ ...REGISTRO_VAZIO });
    setErroDoModal(null);
  };

  const acaoDoRegistro = registro ? pgrActionPlan.find((a) => a.id === registro.acaoId) || null : null;

  const salvarRegistro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registro || !acaoDoRegistro) return;
    const f = formRegistro;
    let r: { ok: boolean; message: string };

    if (registro.tipo === 'CONCLUIR') {
      r = updatePgrActionPlanItem(acaoDoRegistro.id, {
        status: 'CONCLUIDA',
        completed_at: f.data || undefined,
        evidence: f.texto.trim() || undefined,
        workers_informed_at: f.dataInformados || undefined
      });
    } else if (registro.tipo === 'EFICACIA') {
      r = updatePgrActionPlanItem(acaoDoRegistro.id, {
        status: 'EFICACIA_VERIFICADA',
        effectiveness_checked_at: f.data || undefined,
        effectiveness_result: f.texto.trim() || undefined
      });
    } else if (registro.tipo === 'REABRIR') {
      // Medida ineficaz se corrige (subitem 1.5.5.3.2.1): volta a andamento,
      // e o motivo vai ao historico. O mesmo motivo cobre o prazo novo.
      if (!f.texto.trim()) {
        setErroDoModal('Informe o motivo de reabrir a ação (subitem 1.5.5.3.2.1).');
        return;
      }
      r = updatePgrActionPlanItem(
        acaoDoRegistro.id,
        { status: 'EM_ANDAMENTO', ...(f.novoPrazo ? { deadline: f.novoPrazo } : {}) },
        f.texto.trim()
      );
    } else {
      r = updatePgrActionPlanItem(acaoDoRegistro.id, {
        status: 'DESCARTADA',
        discard_reason: f.texto.trim() || undefined
      });
    }

    if (!r.ok) {
      setErroDoModal(r.message);
      return;
    }
    setRegistro(null);
    setAviso({ ok: true, texto: r.message });
  };

  const iniciar = (a: PgrActionPlanItem) => {
    const r = updatePgrActionPlanItem(a.id, { status: 'EM_ANDAMENTO' });
    setAviso({ ok: r.ok, texto: r.message });
  };

  const excluirSugestao = (a: PgrActionPlanItem) => {
    const confirmou = confirm(
      `Excluir a sugestão "${a.measure}"?\n\n` +
      'Só a sugestão não aceita pode ser excluída. Ação aceita se descarta, com o motivo, e o registro fica.'
    );
    if (!confirmou) return;
    const r = deletePgrActionPlanItem(a.id);
    setAviso({ ok: r.ok, texto: r.message });
  };

  const acaoDoHistorico = historicoId ? pgrActionPlan.find((a) => a.id === historicoId) || null : null;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  if (!selectedClientId) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        <ClipboardList className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-400">Selecione um cliente para ver o plano de ação do PGR.</p>
      </div>
    );
  }

  const cartaoDaAcao = (a: PgrActionPlanItem) => {
    const aceita = acaoAceita(a);
    const descartada = a.status === 'DESCARTADA';
    const atrasada = estaAtrasada(a, hoje);
    const numero = numeroDoRegistro.get(a.id);
    const faltas = faltasDe(a);
    const justificativa = a.hierarchy_justification
      ? ROTULO_DA_JUSTIFICATIVA[a.hierarchy_justification]
      : '';

    return (
      <div
        key={a.id}
        id={`acao-pgr-${a.id}`}
        className={`rounded-xl border p-3 space-y-2.5 ${
          descartada
            ? 'bg-slate-950/40 border-slate-800/70 opacity-80'
            : aceita
              ? 'bg-slate-950 border-slate-800'
              : 'bg-indigo-950/20 border-dashed border-indigo-700/50'
        }`}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          {numero ? (
            <span className="px-1.5 py-0.5 bg-slate-800 text-slate-200 font-mono font-bold text-[10px] rounded">
              {numero}
            </span>
          ) : (
            <span
              className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-slate-500 text-[10px] rounded"
              title={
                descartada
                  ? 'Ação descartada: não sai no PGR, e o registro fica.'
                  : 'O risco já tem ação aceita: esta sugestão só sai no PGR depois de aceita.'
              }
            >
              fora do quadro do PGR
            </span>
          )}
          <span
            className={`px-1.5 py-0.5 border text-[10px] font-bold rounded ${
              atrasada ? COR_ATRASADA : COR_DO_STATUS[a.status] || COR_DO_STATUS.NAO_INICIADA
            }`}
          >
            {statusExibido(a, hoje)}
          </span>
          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-semibold rounded">
            {ROTULO_DO_TIPO[a.action_type] || a.action_type}
          </span>
          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 text-[10px] rounded">
            Origem: {ROTULO_DA_ORIGEM[a.origin] || a.origin}
          </span>
        </div>

        <p className="text-xs text-slate-100 font-semibold break-words whitespace-pre-line">{a.measure}</p>

        <p className="text-[11px] text-slate-400 break-words">
          <span className="text-slate-500">Hierarquia:</span>{' '}
          {numeralDa(a.hierarchy)}. {ROTULO_DA_HIERARQUIA[a.hierarchy] || a.hierarchy}
          {justificativa && (
            <>
              {' '}— <span className="text-slate-300">{justificativa}</span>
              {a.hierarchy_justification_note ? ` (${a.hierarchy_justification_note})` : ''}
            </>
          )}
        </p>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
          <div className="min-w-0">
            <dt className="text-slate-500">Responsável</dt>
            <dd className="text-slate-200 break-words">
              {a.responsible || (
                <span className={aceita ? 'text-amber-300' : 'text-slate-500'}>
                  {aceita ? 'não definido' : 'a definir no aceite'}
                </span>
              )}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-slate-500">Prazo</dt>
            <dd className="text-slate-200">
              {aceita || descartada ? (
                dataValida(a.deadline) ? (
                  <span className={atrasada ? 'text-rose-300 font-semibold' : ''}>{dataBR(a.deadline)}</span>
                ) : (
                  <span className="text-amber-300">não definido</span>
                )
              ) : dataValida(a.deadline) ? (
                <span className="text-slate-400">sugerido {dataBR(a.deadline)} — a confirmar no aceite</span>
              ) : (
                <span className="text-slate-500">a definir no aceite</span>
              )}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-slate-500">Forma de acompanhamento</dt>
            <dd className="text-slate-300 break-words">{a.monitoring || <span className="text-slate-500">—</span>}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-slate-500">Forma de aferição de resultados</dt>
            <dd className="text-slate-300 break-words">{a.measurement || <span className="text-slate-500">—</span>}</dd>
          </div>
        </dl>

        {a.accepted_at && (
          <p className="text-[10px] text-slate-500">
            Aceita em {dataLocal(a.accepted_at)}{a.accepted_by ? ` por ${a.accepted_by}` : ''}
          </p>
        )}

        {/* Reaberta, a acao guarda a conclusao anterior ate ser concluida de
            novo: o registro da implementacao nao se apaga (1.5.5.3.1). */}
        {(acaoConcluida(a) || (a.completed_at && !descartada)) && (
          <div className="p-2.5 bg-teal-500/5 border border-teal-500/20 rounded-lg text-[11px] space-y-1">
            <p className="text-slate-300">
              <span className="text-slate-500">
                {acaoConcluida(a) ? 'Conclusão:' : 'Conclusão anterior (ação reaberta):'}
              </span>{' '}
              {dataBR(a.completed_at) || '—'}
              <span className="text-slate-500"> · Trabalhadores informados em:</span>{' '}
              {dataBR(a.workers_informed_at) || '—'}
            </p>
            {a.evidence && (
              <p className="text-slate-300 break-words whitespace-pre-line">
                <span className="text-slate-500">Evidência:</span> {a.evidence}
              </p>
            )}
            {a.status === 'EFICACIA_VERIFICADA' && (
              <p className="text-emerald-300 break-words whitespace-pre-line">
                <span className="text-slate-500">Eficácia aferida em {dataBR(a.effectiveness_checked_at) || '—'}:</span>{' '}
                {a.effectiveness_result}
              </p>
            )}
          </div>
        )}

        {descartada && a.discard_reason && (
          <p className="text-[11px] text-slate-400 break-words">
            <span className="text-slate-500">Motivo do descarte:</span> {a.discard_reason}
          </p>
        )}

        {faltas.length > 0 && (
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {aceita ? 'O que falta (sai como pendência no PGR)' : 'Sugestão: não entra no PGR até ser aceita'}
            </p>
            <ul className="mt-1 space-y-0.5 text-[11px] text-amber-200/90 list-disc list-inside">
              {faltas.map((f) => (
                <li key={f} className="break-words">{f}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {a.status === 'SUGERIDA' && (
            <>
              <button type="button" onClick={() => abrirAceite(a)} className={BOTAO_PRINCIPAL}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Aceitar
              </button>
              <button type="button" onClick={() => excluirSugestao(a)} className={BOTAO_PERIGO}>
                <Trash2 className="w-3.5 h-3.5" />
                Excluir sugestão
              </button>
            </>
          )}
          {aceita && (
            <button type="button" onClick={() => abrirEdicao(a)} className={BOTAO_NEUTRO}>
              <Edit3 className="w-3.5 h-3.5" />
              Editar
            </button>
          )}
          {a.status === 'NAO_INICIADA' && (
            <button type="button" onClick={() => iniciar(a)} className={BOTAO_NEUTRO}>
              <CirclePlay className="w-3.5 h-3.5" />
              Em andamento
            </button>
          )}
          {(a.status === 'NAO_INICIADA' || a.status === 'EM_ANDAMENTO') && (
            <button type="button" onClick={() => abrirRegistro('CONCLUIR', a)} className={BOTAO_NEUTRO}>
              <Flag className="w-3.5 h-3.5" />
              Concluir
            </button>
          )}
          {a.status === 'CONCLUIDA' && (
            <button type="button" onClick={() => abrirRegistro('EFICACIA', a)} className={BOTAO_NEUTRO}>
              <Gauge className="w-3.5 h-3.5" />
              Registrar eficácia
            </button>
          )}
          {acaoConcluida(a) && (
            <button type="button" onClick={() => abrirRegistro('REABRIR', a)} className={BOTAO_NEUTRO}>
              <RotateCcw className="w-3.5 h-3.5" />
              Reabrir
            </button>
          )}
          {aceita && (
            <button type="button" onClick={() => abrirRegistro('DESCARTAR', a)} className={BOTAO_PERIGO}>
              <Ban className="w-3.5 h-3.5" />
              Descartar
            </button>
          )}
          <button type="button" onClick={() => setHistoricoId(a.id)} className={BOTAO_NEUTRO}>
            <History className="w-3.5 h-3.5" />
            Histórico ({(a.history || []).length})
          </button>
        </div>
      </div>
    );
  };

  // Dados do formulario aberto
  const desdeDoFormulario =
    formulario?.modo === 'EDITAR' && anteriorDoFormulario?.accepted_at
      ? formatarDataISO(anteriorDoFormulario.accepted_at)
      : hoje;
  const limiteDoFormulario = limiteDaFaixa(grupoDoFormulario?.prazoDaFaixa ?? null, desdeDoFormulario);
  const concluidaNoFormulario = formulario?.modo === 'EDITAR' && acaoConcluida(anteriorDoFormulario);
  const opcoesDeStatus: StatusDaAcaoDoPlano[] =
    formulario?.modo === 'NOVA' ? ['SUGERIDA', 'NAO_INICIADA', 'EM_ANDAMENTO'] : ['NAO_INICIADA', 'EM_ANDAMENTO'];
  const aceitandoNoFormulario = form.status !== 'SUGERIDA';

  const riscoDoRegistro = acaoDoRegistro ? grupoDoRisco.get(String(acaoDoRegistro.risk_id))?.risco : null;
  const ehControleDoRisco =
    !!acaoDoRegistro && !!riscoDoRegistro && acaoDoRegistro.hierarchy === hierarquiaDoControle(riscoDoRegistro);

  return (
    <div className="space-y-4" id="plano-de-acao-tab">
      {/* Cabecalho */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 flex-wrap">
              <ClipboardList className="w-5 h-5 text-teal-400" />
              Plano de Ação do PGR
              <span className="text-[11px] font-semibold text-slate-500">NR-01, subitens 1.5.5.2 e 1.5.5.3</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[46rem]">
              Sugestão <strong className="text-slate-300">não entra no PGR</strong> até ser aceita com
              responsável, prazo, forma de acompanhamento e forma de aferição de resultados — o
              &quot;cronograma com responsáveis, formas de acompanhamento e aferição de resultados&quot; do
              subitem 1.5.5.2.2. Risco sem ação aceita sai no PGR como pendência.
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-[46rem]">
              Ordem e numeração da seção 8 do PGR: prioridade da classificação e, no mesmo nível, número de
              expostos. A implementação e cada ajuste ficam no histórico da ação (subitem 1.5.5.3.1).
            </p>
          </div>
          <button
            type="button"
            id="btn-sugerir-acoes-plano"
            onClick={sugerir}
            disabled={grupos.length === 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-1.5 text-xs shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            Sugerir ações para riscos sem plano
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Riscos sem ação</span>
            <span className={`text-lg font-black ${riscosSemAcao > 0 ? 'text-amber-300' : 'text-slate-100'}`}>
              {riscosSemAcao}
            </span>
            <span className="text-[10px] text-slate-400 block">
              de {grupos.length} · {riscosSemAceita} sem ação aceita
            </span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Sugestões</span>
            <span className={`text-lg font-black ${sugeridas > 0 ? 'text-indigo-300' : 'text-slate-100'}`}>
              {sugeridas}
            </span>
            <span className="text-[10px] text-slate-400 block">aguardando aceite</span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Ações aceitas</span>
            <span className="text-lg font-black text-slate-100">{aceitas.length}</span>
            <span className="text-[10px] text-slate-400 block">no plano do PGR</span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Atrasadas</span>
            <span className={`text-lg font-black ${atrasadas > 0 ? 'text-rose-300' : 'text-slate-100'}`}>
              {atrasadas}
            </span>
            <span className="text-[10px] text-slate-400 block">prazo vencido</span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Com faltas</span>
            <span className={`text-lg font-black ${comFaltas > 0 ? 'text-amber-300' : 'text-slate-100'}`}>
              {comFaltas}
            </span>
            <span className="text-[10px] text-slate-400 block">aceitas, com pendência</span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Descartadas</span>
            <span className="text-lg font-black text-slate-100">{descartadas}</span>
            <span className="text-[10px] text-slate-400 block">registro mantido</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {STATUS_DO_PLANO.map((s) => (
            <span key={s} className={`px-2 py-0.5 rounded border font-semibold ${COR_DO_STATUS[s]}`}>
              {ROTULO_DO_STATUS[s]}: {aceitas.filter((a) => a.status === s).length}
            </span>
          ))}
        </div>
      </div>

      {aviso && (
        <div
          className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
            aviso.ok
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
          }`}
        >
          <div className="flex items-start gap-2 min-w-0">
            {aviso.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            <span className="font-medium break-words">{aviso.texto}</span>
          </div>
          <button
            type="button"
            onClick={() => setAviso(null)}
            className="opacity-70 hover:opacity-100 font-bold shrink-0"
          >
            Fechar
          </button>
        </div>
      )}

      {grupos.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-slate-200 font-semibold">Nenhum risco no inventário deste cliente.</p>
            <p className="text-xs text-slate-400 mt-1">
              O plano de ação nasce do inventário: caracterize os riscos na aba 2 (GHE &amp; Inventário de
              Riscos) e volte aqui.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3" id="plano-de-acao-lista">
          {grupos.map((g) => {
            const r = g.risco;
            const todas = acoesDoRisco(r?.id);
            const ativas = [
              ...todas.filter((a) => acaoAceita(a)),
              ...todas.filter((a) => a.status === 'SUGERIDA')
            ];
            const descartadasDoRisco = todas.filter((a) => a.status === 'DESCARTADA');
            const abertas = !!descartadasAbertas[r?.id];
            const sugestaoDoInventario = g.linhas.find((l) => !l.registro);
            const nivelDaFaixa = g.prazoDaFaixa?.nivel;

            return (
              <div
                key={r?.id}
                id={`plano-risco-${r?.id}`}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 bg-teal-500 text-slate-950 font-mono font-bold text-[10px] rounded">
                        {g.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 border text-[10px] font-bold rounded ${
                          g.classificado
                            ? COR_DO_NIVEL[g.classificado.nivel] || COR_DO_NIVEL.MEDIO
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {g.classificado
                          ? `${g.classificado.rotulo} (${g.classificado.score})`
                          : 'Não classificado'}
                      </span>
                      {r?.risk_category && (
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-semibold rounded">
                          {r.risk_category}
                        </span>
                      )}
                      {r?.status === 'INACTIVE' && (
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-500 text-[10px] rounded">
                          Risco inativo
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-100 break-words">{r?.agent_name}</p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 flex-wrap">
                      <span>{g.gheNome}</span>
                      <span className="text-slate-600">·</span>
                      <Users className="w-3 h-3" />
                      <span>{g.expostos} exposto(s)</span>
                    </p>
                    {g.prazoDaFaixa ? (
                      <p className="text-[11px] text-slate-400">
                        <span className="text-slate-500">Prazo da classificação:</span> {g.prazoDaFaixa.rotulo}
                        {g.prazoDaFaixa.elevado && nivelDaFaixa && (
                          <span className="text-amber-300">
                            {' '}— prazo da faixa de cima ({DECISAO_POR_NIVEL[nivelDaFaixa].rotulo}) pelo número de
                            expostos: {EXPOSTOS_QUE_ELEVAM_O_PRAZO} ou mais, ou{' '}
                            {Math.round(FRACAO_DO_EFETIVO_QUE_ELEVA_O_PRAZO * 100)}% ou mais do efetivo (seção 5.7)
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-[11px] text-amber-300">
                        Sem severidade e probabilidade não há prioridade nem prazo de faixa: classifique o risco no
                        inventário (seção 5.6).
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => abrirNova(r?.id)}
                    className={`${BOTAO_NEUTRO} self-start shrink-0`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nova ação
                  </button>
                </div>

                {ativas.length === 0 && sugestaoDoInventario && (
                  <div className="p-3 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 space-y-1">
                    <p className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Sem ação no plano — no PGR sai como {sugestaoDoInventario.numero}, com a pendência
                    </p>
                    <p className="text-[11px] text-slate-300 break-words">
                      Sugestão pelo estado dos controles: {sugestaoDoInventario.medida}{' '}
                      <span className="text-slate-500">({sugestaoDoInventario.hierarquia} · {sugestaoDoInventario.tipo})</span>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Use &quot;Sugerir ações para riscos sem plano&quot; para gravá-la como sugestão, ou &quot;Nova
                      ação&quot; para cadastrar a medida.
                    </p>
                  </div>
                )}

                {ativas.length > 0 && <div className="space-y-2">{ativas.map((a) => cartaoDaAcao(a))}</div>}

                {descartadasDoRisco.length > 0 && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setDescartadasAbertas((d) => ({ ...d, [r?.id]: !abertas }))}
                      className="text-[11px] text-slate-400 hover:text-slate-200 font-semibold flex items-center gap-1"
                    >
                      {abertas ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      {descartadasDoRisco.length} ação(ões) descartada(s) — o registro fica
                    </button>
                    {abertas && (
                      <div className="space-y-2 mt-2">{descartadasDoRisco.map((a) => cartaoDaAcao(a))}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Formulario da acao: nova, aceite de sugestao ou edicao */}
      {formulario && (
        <Modal
          largura="max-w-[44rem]"
          aoFechar={() => setFormulario(null)}
          icone={<ClipboardList className="w-5 h-5 text-teal-400" />}
          titulo={
            formulario.modo === 'NOVA'
              ? 'Nova ação no plano'
              : formulario.modo === 'ACEITAR'
                ? 'Aceitar a sugestão no plano'
                : `Editar ação ${numeroDoRegistro.get(anteriorDoFormulario?.id || '') || ''}`.trim()
          }
          subtitulo={
            grupoDoFormulario
              ? `${grupoDoFormulario.id} · ${riscoDoFormulario?.agent_name || ''} · ${grupoDoFormulario.gheNome}`
              : undefined
          }
        >
          <form onSubmit={salvarFormulario} className="space-y-4 text-xs">
            <div>
              <label className={ROTULO}>
                Medida de prevenção <Obrigatorio />
              </label>
              <textarea
                rows={3}
                value={form.measure}
                onChange={(e) => setForm({ ...form, measure: e.target.value })}
                placeholder="O que será feito, onde e para quem"
                className={CAMPO}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={ROTULO}>
                  Hierarquia da medida <Obrigatorio />
                </label>
                <select
                  value={form.hierarchy}
                  onChange={(e) => setForm({ ...form, hierarchy: e.target.value as HierarquiaDaMedida | '' })}
                  className={CAMPO}
                >
                  <option value="">Selecione o nível</option>
                  {ORDEM_DA_HIERARQUIA.map((h) => (
                    <option key={h} value={h}>
                      {numeralDa(h)}. {ROTULO_DA_HIERARQUIA[h]}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Ordem de prioridade da alínea &quot;g&quot; do item 1.4.1.
                </p>
              </div>
              <div>
                <label className={ROTULO}>
                  Tipo (subitem 1.5.5.2.1) <Obrigatorio />
                </label>
                <select
                  value={form.action_type}
                  onChange={(e) => setForm({ ...form, action_type: e.target.value as TipoDaAcaoDoPlano })}
                  className={CAMPO}
                >
                  {(Object.keys(ROTULO_DO_TIPO) as TipoDaAcaoDoPlano[]).map((t) => (
                    <option key={t} value={t}>
                      {ROTULO_DO_TIPO[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {justificarNoFormulario && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/30 rounded-xl space-y-2">
                <p className="text-[11px] text-amber-200">
                  {ROTULO_DA_HIERARQUIA[form.hierarchy as HierarquiaDaMedida]} só se adota nas hipóteses do
                  subitem 1.5.5.1.2: inviabilidade técnica da proteção coletiva, proteção coletiva insuficiente
                  ou em fase de estudo, planejamento ou implantação, ou caráter complementar ou emergencial.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={ROTULO}>
                      Justificativa {aceitandoNoFormulario && <Obrigatorio />}
                    </label>
                    <select
                      value={form.hierarchy_justification}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          hierarchy_justification: e.target.value as JustificativaDaHierarquia | ''
                        })
                      }
                      className={CAMPO}
                    >
                      <option value="">Selecione a hipótese</option>
                      {(Object.keys(ROTULO_DA_JUSTIFICATIVA) as JustificativaDaHierarquia[]).map((j) => (
                        <option key={j} value={j}>
                          {ROTULO_DA_JUSTIFICATIVA[j]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={ROTULO}>Observação</label>
                    <input
                      type="text"
                      value={form.hierarchy_justification_note}
                      onChange={(e) => setForm({ ...form, hierarchy_justification_note: e.target.value })}
                      placeholder="O fato do local que sustenta a hipótese"
                      className={CAMPO}
                    />
                  </div>
                </div>
              </div>
            )}
            {form.hierarchy === 'ADMINISTRATIVA' && !justificarNoFormulario && (
              <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                Para fator ergonômico ou psicossocial, a organização do trabalho é a própria medida da NR-17
                (item 17.4), e não a exceção: não precisa da justificativa do subitem 1.5.5.1.2.
              </p>
            )}

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <p className="font-bold text-slate-200">
                Cronograma{' '}
                <span className="text-[10px] font-normal text-slate-500">
                  subitem 1.5.5.2.2{aceitandoNoFormulario ? ' — obrigatório para a ação aceita' : ''}
                </span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={ROTULO}>
                    Responsável {aceitandoNoFormulario && <Obrigatorio />}
                  </label>
                  <input
                    type="text"
                    value={form.responsible}
                    onChange={(e) => setForm({ ...form, responsible: e.target.value })}
                    placeholder="Nome e função de quem executa"
                    className={CAMPO}
                  />
                </div>
                <div>
                  <label className={ROTULO}>
                    Prazo {aceitandoNoFormulario && <Obrigatorio />}
                  </label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className={CAMPO}
                  />
                  {grupoDoFormulario?.prazoDaFaixa ? (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Prazo da classificação: {grupoDoFormulario.prazoDaFaixa.rotulo}
                      {limiteDoFormulario ? `, até ${dataBR(limiteDoFormulario)}` : ''}
                      {formulario.modo === 'EDITAR' && anteriorDoFormulario?.accepted_at
                        ? ` (contado do aceite em ${dataLocal(anteriorDoFormulario.accepted_at)})`
                        : ' (contado de hoje)'}
                      {grupoDoFormulario.prazoDaFaixa.elevado ? ' — faixa elevada pelo número de expostos (seção 5.7)' : ''}
                      {limiteDoFormulario && form.deadline !== limiteDoFormulario && (
                        <>
                          {' '}
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, deadline: limiteDoFormulario })}
                            className="text-teal-400 hover:text-teal-300 font-semibold underline"
                          >
                            usar esta data
                          </button>
                        </>
                      )}
                    </p>
                  ) : (
                    <p className="text-[10px] text-amber-300 mt-1">
                      Risco sem classificação: não há prazo de faixa para conferir (seção 5.6).
                    </p>
                  )}
                  {/* faltasDaAcao confere o prazo ACEITO (o original): prorrogar
                      depois e permitido, com motivo. Por isso o aviso muda. */}
                  {limiteDoFormulario && dataValida(form.deadline) && form.deadline > limiteDoFormulario && (
                    <p className="text-[10px] text-amber-300 mt-1">
                      {mudaPrazoAceito
                        ? 'Prorrogação além do limite da classificação (seção 5.7): fica registrada com o motivo.'
                        : 'Prazo além do limite da classificação: o PGR aponta a pendência (seção 5.7).'}
                    </p>
                  )}
                </div>
              </div>

              {mudaPrazoAceito && (
                <div>
                  <label className={ROTULO}>
                    Motivo da mudança de prazo <Obrigatorio />
                  </label>
                  <input
                    type="text"
                    value={form.motivoDoPrazo}
                    onChange={(e) => setForm({ ...form, motivoDoPrazo: e.target.value })}
                    placeholder="Por que o prazo aceito mudou"
                    className={CAMPO}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Prazo aceito: {dataBR(anteriorDoFormulario?.deadline)}
                    {anteriorDoFormulario?.original_deadline && anteriorDoFormulario.original_deadline !== anteriorDoFormulario.deadline
                      ? ` (original ${dataBR(anteriorDoFormulario.original_deadline)})`
                      : ''}
                    . O prazo original e o motivo ficam no histórico.
                  </p>
                </div>
              )}

              <div>
                <label className={ROTULO}>
                  Forma de acompanhamento {aceitandoNoFormulario && <Obrigatorio />}
                </label>
                <textarea
                  rows={2}
                  value={form.monitoring}
                  onChange={(e) => setForm({ ...form, monitoring: e.target.value })}
                  placeholder="Como e com que frequência a execução será acompanhada"
                  className={CAMPO}
                />
              </div>
              <div>
                <label className={ROTULO}>
                  Forma de aferição de resultados {aceitandoNoFormulario && <Obrigatorio />}
                </label>
                <textarea
                  rows={2}
                  value={form.measurement}
                  onChange={(e) => setForm({ ...form, measurement: e.target.value })}
                  placeholder="Como se verificará que a medida funcionou"
                  className={CAMPO}
                />
              </div>
            </div>

            <div>
              <label className={ROTULO}>Status</label>
              {concluidaNoFormulario ? (
                <p className="text-slate-300">
                  {ROTULO_DO_STATUS[form.status]}{' '}
                  <span className="text-slate-500">— para voltar a andamento, use &quot;Reabrir&quot; e informe o motivo.</span>
                </p>
              ) : (
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as StatusDaAcaoDoPlano })}
                  className={CAMPO}
                >
                  {opcoesDeStatus.map((s) => (
                    <option key={s} value={s}>
                      {s === 'SUGERIDA' ? 'Sugestão — ainda não aceita, fora do PGR' : ROTULO_DO_STATUS[s]}
                    </option>
                  ))}
                </select>
              )}
              {formulario.modo === 'NOVA' && form.status === 'SUGERIDA' && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Registrada como sugestão, a ação não entra no PGR até ser aceita.
                </p>
              )}
            </div>

            <ErroDoModal texto={erroDoModal} />

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setFormulario(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg shadow-md"
              >
                {formulario.modo === 'ACEITAR'
                  ? 'Aceitar e incluir no plano'
                  : formulario.modo === 'NOVA'
                    ? 'Cadastrar ação'
                    : 'Salvar alterações'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Registro: conclusao, eficacia, reabertura, descarte */}
      {registro && acaoDoRegistro && (
        <Modal
          largura="max-w-[38rem]"
          aoFechar={() => setRegistro(null)}
          icone={
            registro.tipo === 'CONCLUIR' ? (
              <Flag className="w-5 h-5 text-teal-400" />
            ) : registro.tipo === 'EFICACIA' ? (
              <Gauge className="w-5 h-5 text-emerald-400" />
            ) : registro.tipo === 'REABRIR' ? (
              <RotateCcw className="w-5 h-5 text-amber-400" />
            ) : (
              <Ban className="w-5 h-5 text-rose-400" />
            )
          }
          titulo={
            registro.tipo === 'CONCLUIR'
              ? 'Concluir a ação'
              : registro.tipo === 'EFICACIA'
                ? 'Registrar a eficácia'
                : registro.tipo === 'REABRIR'
                  ? 'Reabrir a ação'
                  : 'Descartar a ação'
          }
          subtitulo={`${numeroDoRegistro.get(acaoDoRegistro.id) || ''} ${acaoDoRegistro.measure}`.trim()}
        >
          <form onSubmit={salvarRegistro} className="space-y-4 text-xs">
            {registro.tipo === 'CONCLUIR' && (
              <>
                <p className="text-[11px] text-slate-400">
                  A implementação fica registrada com a data e a evidência (subitem 1.5.5.3.1), e com a data em
                  que os trabalhadores foram informados dos procedimentos e das limitações da medida (subitem
                  1.5.5.1.3).
                  {ehControleDoRisco && ' Esta é a medida de controle do risco: concluída, o inventário passa a indicar o controle como implantado.'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={ROTULO}>
                      Data de conclusão <Obrigatorio />
                    </label>
                    <input
                      type="date"
                      max={hoje}
                      value={formRegistro.data}
                      onChange={(e) => setFormRegistro({ ...formRegistro, data: e.target.value })}
                      className={CAMPO}
                    />
                  </div>
                  <div>
                    <label className={ROTULO}>
                      Trabalhadores informados em <Obrigatorio />
                    </label>
                    <input
                      type="date"
                      max={hoje}
                      value={formRegistro.dataInformados}
                      onChange={(e) => setFormRegistro({ ...formRegistro, dataInformados: e.target.value })}
                      className={CAMPO}
                    />
                  </div>
                </div>
                <div>
                  <label className={ROTULO}>
                    Evidência da implementação <Obrigatorio />
                  </label>
                  <textarea
                    rows={3}
                    value={formRegistro.texto}
                    onChange={(e) => setFormRegistro({ ...formRegistro, texto: e.target.value })}
                    placeholder="Ex.: nota fiscal, relatório de instalação, registro fotográfico, lista de presença"
                    className={CAMPO}
                  />
                </div>
              </>
            )}

            {registro.tipo === 'EFICACIA' && (
              <>
                <p className="text-[11px] text-slate-400">
                  A aferição é o que sustenta &quot;eficácia verificada&quot; (subitem 1.5.5.3.2). Forma prevista:{' '}
                  <span className="text-slate-300">{acaoDoRegistro.measurement || 'não definida'}</span>.
                  {ehControleDoRisco && ' Esta é a medida de controle do risco: registrada a eficácia, o inventário passa a indicar o controle como eficaz — o que vai ao PGR, ao LTCAT e ao S-2240.'}
                </p>
                <p className="text-[11px] text-amber-200 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  Se a aferição mostrou que a medida não funcionou, não registre eficácia: use &quot;Reabrir&quot; e
                  informe o motivo (subitem 1.5.5.3.2.1).
                </p>
                <div>
                  <label className={ROTULO}>
                    Data da aferição <Obrigatorio />
                  </label>
                  <input
                    type="date"
                    max={hoje}
                    min={acaoDoRegistro.completed_at || undefined}
                    value={formRegistro.data}
                    onChange={(e) => setFormRegistro({ ...formRegistro, data: e.target.value })}
                    className={CAMPO}
                  />
                  {dataValida(acaoDoRegistro.completed_at) && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Concluída em {dataBR(acaoDoRegistro.completed_at)}: a aferição não pode ser anterior.
                    </p>
                  )}
                </div>
                <div>
                  <label className={ROTULO}>
                    Resultado da aferição <Obrigatorio />
                  </label>
                  <textarea
                    rows={3}
                    value={formRegistro.texto}
                    onChange={(e) => setFormRegistro({ ...formRegistro, texto: e.target.value })}
                    placeholder="O que foi medido ou verificado, e o que se constatou"
                    className={CAMPO}
                  />
                </div>
              </>
            )}

            {registro.tipo === 'REABRIR' && (
              <>
                <p className="text-[11px] text-slate-400">
                  Medida ineficaz se corrige (subitem 1.5.5.3.2.1): a ação volta a &quot;Em andamento&quot; e o motivo
                  fica no histórico.
                  {acaoDoRegistro.status === 'EFICACIA_VERIFICADA' && ehControleDoRisco &&
                    ' A eficácia deixa de estar verificada, e o inventário deixa de indicar o controle como eficaz.'}
                </p>
                <div>
                  <label className={ROTULO}>
                    Motivo <Obrigatorio />
                  </label>
                  <textarea
                    rows={3}
                    value={formRegistro.texto}
                    onChange={(e) => setFormRegistro({ ...formRegistro, texto: e.target.value })}
                    placeholder="O que a aferição ou o acompanhamento mostrou"
                    className={CAMPO}
                  />
                </div>
                <div>
                  <label className={ROTULO}>Novo prazo (opcional)</label>
                  <input
                    type="date"
                    value={formRegistro.novoPrazo}
                    onChange={(e) => setFormRegistro({ ...formRegistro, novoPrazo: e.target.value })}
                    className={CAMPO}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Prazo atual: {dataBR(acaoDoRegistro.deadline) || '—'}. Em branco, o prazo continua o mesmo.
                  </p>
                </div>
              </>
            )}

            {registro.tipo === 'DESCARTAR' && (
              <>
                <p className="text-[11px] text-slate-400">
                  A ação descartada sai do plano do PGR, mas o registro fica, com o motivo (subitem 1.5.5.3.1).
                  Ação descartada não se altera depois: para retomar a medida, cadastre outra ação.
                </p>
                <div>
                  <label className={ROTULO}>
                    Motivo do descarte <Obrigatorio />
                  </label>
                  <textarea
                    rows={3}
                    value={formRegistro.texto}
                    onChange={(e) => setFormRegistro({ ...formRegistro, texto: e.target.value })}
                    className={CAMPO}
                  />
                </div>
              </>
            )}

            <ErroDoModal texto={erroDoModal} />

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRegistro(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`px-4 py-2 font-bold rounded-lg shadow-md ${
                  registro.tipo === 'DESCARTAR'
                    ? 'bg-rose-500 hover:bg-rose-400 text-white'
                    : 'bg-teal-500 hover:bg-teal-400 text-slate-950'
                }`}
              >
                {registro.tipo === 'CONCLUIR'
                  ? 'Registrar conclusão'
                  : registro.tipo === 'EFICACIA'
                    ? 'Registrar eficácia'
                    : registro.tipo === 'REABRIR'
                      ? 'Reabrir'
                      : 'Descartar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Historico (subitem 1.5.5.3.1) */}
      {acaoDoHistorico && (
        <Modal
          largura="max-w-[38rem]"
          aoFechar={() => setHistoricoId(null)}
          icone={<History className="w-5 h-5 text-teal-400" />}
          titulo="Histórico da ação"
          subtitulo={`${numeroDoRegistro.get(acaoDoHistorico.id) || ''} ${acaoDoHistorico.measure}`.trim()}
        >
          <div className="space-y-3 text-xs">
            <p className="text-[11px] text-slate-400">
              Status: <span className="text-slate-200">{statusExibido(acaoDoHistorico, hoje)}</span>
              {acaoDoHistorico.accepted_at && (
                <>
                  {' '}· aceita em {dataLocal(acaoDoHistorico.accepted_at)}
                  {acaoDoHistorico.accepted_by ? ` por ${acaoDoHistorico.accepted_by}` : ''}
                </>
              )}
              {dataValida(acaoDoHistorico.original_deadline) && (
                <> · prazo original {dataBR(acaoDoHistorico.original_deadline)}</>
              )}
            </p>
            {(acaoDoHistorico.history || []).length === 0 ? (
              <p className="text-slate-500">Nenhum evento registrado.</p>
            ) : (
              <ol className="space-y-2">
                {(acaoDoHistorico.history || []).map((h, i) => (
                  <li key={`${h.em}-${i}`} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                    <div className="flex flex-wrap gap-x-2 text-[10px] text-slate-500">
                      <span className="font-mono">{dataHora(h.em)}</span>
                      {h.por && <span>· {h.por}</span>}
                    </div>
                    <p className="text-slate-200 break-words mt-0.5">{h.evento}</p>
                  </li>
                ))}
              </ol>
            )}
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setHistoricoId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
