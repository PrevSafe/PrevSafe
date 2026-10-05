/**
 * Conteudo da ordem de servico de SST (NR-01, 1.4.1, "c"; CLT, art. 157, II).
 *
 * A NR-01 define a OS como "instrucoes por escrito quanto as precaucoes para
 * evitar acidentes do trabalho ou doencas ocupacionais" (Anexo I, glossario),
 * e o item 1.4.1 manda informar ao trabalhador os riscos ocupacionais
 * existentes, as medidas de prevencao adotadas, os resultados das avaliacoes
 * ambientais ("b", I, II e IV) e os procedimentos em caso de acidente ("e").
 *
 * O gerador antigo comparava a categoria do risco SEM acento ('FISICO'),
 * e o inventario grava COM acento ('FÍSICO'): todo risco fisico, quimico,
 * biologico e ergonomico do inventario sumia da OS, sem aviso. O resto era
 * texto fixo igual para todo cargo - "proibido calcado aberto em area
 * operacional" na OS de uma recepcionista, "CAT em ate 24 horas", que nao e o
 * prazo da lei. Aqui tudo sai do cadastro: o que nao existe vira pendencia
 * nomeada, e nao texto generico.
 */

import type { RiscoDaOrdemDeServico } from '@/types';
import { formatDate } from '@/lib/utils';

export type CategoriaDaOS = 'FISICO' | 'QUIMICO' | 'BIOLOGICO' | 'ERGONOMICO' | 'ACIDENTES' | 'AUSENCIA' | '';

/** "FÍSICO", "Físico" e "FISICO" sao a mesma categoria. */
export function categoriaDoRisco(r: any): CategoriaDaOS {
  const c = String(r?.risk_category || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().trim();
  if (c.startsWith('FISIC')) return 'FISICO';
  if (c.startsWith('QUIMIC')) return 'QUIMICO';
  if (c.startsWith('BIOLOG')) return 'BIOLOGICO';
  if (c.startsWith('ERGONOM') || c.startsWith('PSICOSS')) return 'ERGONOMICO';
  if (c.startsWith('ACIDENT') || c.startsWith('MECANIC')) return 'ACIDENTES';
  if (c.startsWith('AUSENCIA') || String(r?.risk_code_table_24 || '').startsWith('09.01.001')) return 'AUSENCIA';
  return '';
}

const ROTULO: Record<Exclude<CategoriaDaOS, ''>, string> = {
  FISICO: 'Físico',
  QUIMICO: 'Químico',
  BIOLOGICO: 'Biológico',
  ERGONOMICO: 'Ergonômico',
  ACIDENTES: 'Acidentes',
  AUSENCIA: 'Ausência de risco'
};

const ativo = (x: any) => x && x.status !== 'INACTIVE';
const texto = (v: any) => String(v ?? '').trim();
const naoAplicavel = (t: string) => /^(n[ãa]o\s+(se\s+)?aplic|inaplic|n\/a\b)/i.test(t);

/**
 * Riscos do inventario que alcancam o trabalhador: os ativos do GHE dele. So
 * pelo GHE - o gerador antigo aceitava tambem "mesmo setor", e com setor
 * vazio dos dois lados (undefined === undefined) trazia risco de qualquer
 * cliente.
 */
export function riscosDoTrabalhador(trabalhador: any, riscos: any[]): any[] {
  const ghe = texto(trabalhador?.ghe_id);
  if (!ghe) return [];
  return (Array.isArray(riscos) ? riscos : []).filter((r) =>
    ativo(r) && r?.ghe_id === ghe && (!r?.client_id || !trabalhador?.client_id || r.client_id === trabalhador.client_id)
  );
}

/** Resultado da avaliacao ambiental, so quando houve medicao de verdade. */
function avaliacaoDoRisco(r: any): string {
  const valor = texto(r?.measured_value).replace('.', ',');
  if (!valor || Number(valor.replace(',', '.')) === 0) return '';
  const unidade = texto(r?.measurement_unit);
  const limite = texto(r?.tolerance_limit);
  return `${valor}${unidade ? ` ${unidade}` : ''}${limite ? ` (limite: ${limite})` : ''}`;
}

/** EPI do risco, com o CA. EPI sem CA nao sai: o CA e o que identifica o equipamento. */
function episDoRisco(r: any): Array<{ nome: string; ca: string; ininterrupto: boolean }> {
  if (!r?.epi_required) return [];
  return (Array.isArray(r?.epis) ? r.epis : [])
    .filter((e: any) => texto(e?.epi_name) && texto(e?.ca_number))
    .map((e: any) => ({ nome: texto(e.epi_name), ca: texto(e.ca_number), ininterrupto: e?.uninterrupted_use === true }));
}

export interface ConteudoDaOS {
  physical_risks: string[];
  chemical_risks: string[];
  biological_risks: string[];
  ergonomic_risks: string[];
  accident_mechanical_risks: string[];
  risks_detail: RiscoDaOrdemDeServico[];
  collective_protections_epc: string[];
  mandatory_epis: Array<{ epi_name: string; ca_number: string; protection_type: string; usage_recommendation: string }>;
  /** Medidas administrativas e de organizacao do trabalho ja adotadas (plano de acao concluido). */
  safe_work_procedures: string[];
  emergency_accident_conduct: string[];
  routine_activities: string[];
  job_description: string;
  pendencias: string[];
}

/**
 * O conteudo da OS de um trabalhador. Puro: recebe o cadastro e devolve o que
 * a OS informa, com as pendencias do que faltou.
 */
export function conteudoDaOS(dados: {
  trabalhador: any;
  riscos: any[];
  ghe?: any;
  cargo?: any;
  /** Estabelecimento do trabalhador: procedimentos de emergencia (secao 9.4 do PGR). */
  estabelecimento?: any;
  /** Colecao pgrActionPlan: as medidas concluidas entram como adotadas. */
  acoes?: any[];
}): ConteudoDaOS {
  const { trabalhador, ghe, cargo, estabelecimento } = dados;
  const pendencias: string[] = [];
  const doGhe = riscosDoTrabalhador(trabalhador, dados.riscos);
  const comRisco = doGhe.filter((r) => categoriaDoRisco(r) !== 'AUSENCIA');

  const porCategoria: Record<string, string[]> = { FISICO: [], QUIMICO: [], BIOLOGICO: [], ERGONOMICO: [], ACIDENTES: [] };
  const detalhe: RiscoDaOrdemDeServico[] = [];
  const epcs: string[] = [];
  const epis = new Map<string, { epi_name: string; ca_number: string; protection_type: string; usage_recommendation: string }>();

  comRisco.forEach((r) => {
    const cat = categoriaDoRisco(r);
    const agente = texto(r?.agent_name) || 'Agente sem nome no inventário';
    const psicossocial = !!texto(r?.origin_psychosocial_factor);
    if (cat && cat !== 'AUSENCIA') porCategoria[cat].push(agente);
    const epcDoRisco = r?.epc_implemented && texto(r?.epc_description) ? texto(r.epc_description) : '';
    if (epcDoRisco) epcs.push(`${epcDoRisco} (${agente})`);
    const episDeste = episDoRisco(r);
    episDeste.forEach((e) => {
      const chave = `${e.ca}|${e.nome.toLowerCase()}`;
      const atual = epis.get(chave);
      const para = atual ? `${atual.usage_recommendation}; ${agente}` : `Contra: ${agente}`;
      epis.set(chave, {
        epi_name: e.nome,
        ca_number: e.ca,
        protection_type: 'PROTECAO_ESPECIFICA',
        usage_recommendation: e.ininterrupto && !para.includes('uso ininterrupto') ? `${para} (uso ininterrupto durante a exposição)` : para
      });
    });
    detalhe.push({
      categoria: psicossocial ? 'Psicossocial' : (cat ? ROTULO[cat] : texto(r?.risk_category) || 'Sem categoria'),
      agente,
      ...(texto(r?.generating_source) ? { fonte: texto(r.generating_source) } : {}),
      ...(texto(r?.health_effects) ? { danos: texto(r.health_effects) } : {}),
      ...(avaliacaoDoRisco(r) ? { avaliacao: avaliacaoDoRisco(r) } : {}),
      ...(epcDoRisco ? { epc: epcDoRisco } : {}),
      ...(episDeste.length ? { epis: episDeste.map((e) => `${e.nome} (CA ${e.ca})`) } : {})
    });
  });

  // EPI do cadastro do trabalhador que o inventario nao traz: entra, mas sem
  // dizer contra o que - o cadastro nao diz.
  (Array.isArray(trabalhador?.epis) ? trabalhador.epis : []).forEach((e: any) => {
    const nome = texto(e?.epi_name);
    const ca = texto(e?.ca_number);
    if (!nome || !ca) return;
    const chave = `${ca}|${nome.toLowerCase()}`;
    if (!epis.has(chave)) epis.set(chave, { epi_name: nome, ca_number: ca, protection_type: 'PROTECAO_ESPECIFICA', usage_recommendation: 'Conforme o cadastro do trabalhador' });
  });

  // Medidas administrativas ja adotadas: so as concluidas. Acao em andamento
  // ainda nao e medida adotada (1.4.1, "b", II).
  const idsDosRiscos = new Set(comRisco.map((r) => r?.id));
  const administrativas = (Array.isArray(dados.acoes) ? dados.acoes : [])
    .filter((a: any) => idsDosRiscos.has(a?.risk_id)
      && (a?.status === 'CONCLUIDA' || a?.status === 'EFICACIA_VERIFICADA')
      && (a?.hierarchy === 'ADMINISTRATIVA' || a?.hierarchy === 'ELIMINACAO')
      && texto(a?.measure))
    .map((a: any) => {
      const risco = comRisco.find((r) => r?.id === a.risk_id);
      return `${texto(a.measure)}${risco?.agent_name ? ` (${texto(risco.agent_name)})` : ''}`;
    });
  const coletivasDoPlano = (Array.isArray(dados.acoes) ? dados.acoes : [])
    .filter((a: any) => idsDosRiscos.has(a?.risk_id)
      && (a?.status === 'CONCLUIDA' || a?.status === 'EFICACIA_VERIFICADA')
      && a?.hierarchy === 'PROTECAO_COLETIVA' && texto(a?.measure))
    .map((a: any) => {
      const risco = comRisco.find((r) => r?.id === a.risk_id);
      return `${texto(a.measure)}${risco?.agent_name ? ` (${texto(risco.agent_name)})` : ''}`;
    });
  [...coletivasDoPlano].forEach((m) => { if (!epcs.includes(m)) epcs.push(m); });

  // Emergencia: os procedimentos do estabelecimento (secao 9.4 do PGR).
  const emergencia: string[] = [];
  const cenarios = texto(estabelecimento?.emergency_scenarios);
  const socorros = texto(estabelecimento?.emergency_resources);
  const abandono = texto(estabelecimento?.emergency_evacuation);
  if (cenarios) emergencia.push(`Cenários de emergência previstos: ${cenarios}`);
  if (socorros) emergencia.push(`Primeiros socorros e encaminhamento: ${socorros}`);
  if (abandono && !naoAplicavel(abandono)) emergencia.push(`Abandono do local: ${abandono}`);
  if (emergencia.length > 0) {
    emergencia.push('Em caso de acidente ou doença relacionada ao trabalho, comunique imediatamente a chefia imediata, para o atendimento, a análise das causas e a comunicação do acidente (NR-01, 1.4.1, "e").');
  } else {
    pendencias.push('Procedimentos de emergência do estabelecimento não cadastrados: a OS não informa o que fazer em caso de acidente (NR-01, 1.4.1, "e") (Hierarquia > Estabelecimentos).');
  }

  // Pendencias do vinculo e do inventario.
  if (!texto(trabalhador?.ghe_id)) {
    pendencias.push('Trabalhador sem GHE: sem ele a OS não tem os riscos do inventário (Engenharia SST > 4. Trabalhadores).');
  } else if (doGhe.length === 0) {
    pendencias.push(`Inventário de riscos não elaborado para o GHE ${texto(ghe?.code) || texto(ghe?.name) || ''}`.trim() + ' (NR-01, item 1.5.4) (Engenharia SST > 2. GHE & Inventário de Riscos).');
  }
  const atividades = texto(cargo?.activities_description);
  if (!atividades) {
    pendencias.push(`Descrição das atividades do cargo ${texto(cargo?.name) || texto(trabalhador?.job_title)} não cadastrada (Hierarquia > Cargos & CBO).`);
  }
  if (comRisco.some((r) => r?.epi_required) && epis.size === 0) {
    pendencias.push('Há risco com EPI exigido no inventário e nenhum EPI com CA cadastrado nele (Engenharia SST > 2. GHE & Inventário de Riscos).');
  }

  // So "ausencia de risco" no GHE: a OS diz isso, e nao que nao ha inventario.
  if (comRisco.length === 0 && doGhe.length > 0) {
    detalhe.push({ categoria: ROTULO.AUSENCIA, agente: 'Ausência de risco ocupacional registrada no inventário (PGR)' });
  }

  return {
    physical_risks: porCategoria.FISICO,
    chemical_risks: porCategoria.QUIMICO,
    biological_risks: porCategoria.BIOLOGICO,
    ergonomic_risks: porCategoria.ERGONOMICO,
    accident_mechanical_risks: porCategoria.ACIDENTES,
    risks_detail: detalhe,
    collective_protections_epc: epcs,
    mandatory_epis: [...epis.values()],
    safe_work_procedures: administrativas,
    emergency_accident_conduct: emergencia,
    routine_activities: atividades ? [atividades] : [],
    job_description: atividades,
    pendencias
  };
}

/** Obrigacoes do trabalhador: o texto da NR-01 (1.4.2) e da CLT (art. 158), e nada alem dele. */
export const OBRIGACOES_DO_TRABALHADOR: string[] = [
  'Cumprir as disposições legais e regulamentares sobre segurança e saúde no trabalho, inclusive as ordens de serviço expedidas pelo empregador (NR-01, 1.4.2, "a").',
  'Submeter-se aos exames médicos previstos nas Normas Regulamentadoras (NR-01, 1.4.2, "b").',
  'Colaborar com a organização na aplicação das Normas Regulamentadoras (NR-01, 1.4.2, "c").',
  'Usar o equipamento de proteção individual fornecido pelo empregador (NR-01, 1.4.2, "d").'
];

/** CLT, art. 158, paragrafo unico, alineas "a" e "b". */
export const ATO_FALTOSO =
  'Constitui ato faltoso do empregado a recusa injustificada à observância das instruções expedidas ' +
  'pelo empregador por meio desta ordem de serviço e ao uso dos equipamentos de proteção individual ' +
  'fornecidos pela empresa (CLT, art. 158, parágrafo único, alíneas "a" e "b").';

/** "Local, data" da declaracao de ciencia: a cidade do estabelecimento, se houver. */
export function localEDataDaOS(cidade: string | undefined, data: string): string {
  const c = texto(cidade);
  return `${c ? `${c}, ` : ''}${formatDate(data)}`;
}
