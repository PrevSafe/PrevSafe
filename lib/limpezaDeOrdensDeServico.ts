import type { SSTWorkOrderOS } from '@/types';

/**
 * Remove das Ordens de Servico JA GRAVADAS o conteudo que o gerador antigo
 * inventava.
 *
 * POR QUE ISTO E NECESSARIO
 *
 * Corrigir o gerador nao resolve sozinho: a OS fica salva no banco e o kit a
 * imprime como esta. A OS da recepcionista do caso real continuava declarando
 * ruido, iluminacao e um protetor auricular CA 14235 - texto que o gerador
 * antigo escreveu no momento em que ela foi criada, e que nenhuma correcao de
 * codigo novo apaga.
 *
 * Todas as frases abaixo eram LITERAIS no codigo, entao a deteccao e exata:
 * nao ha risco de apagar um risco que alguem realmente levantou e digitou.
 */

/** Riscos que o gerador antigo escrevia quando o GHE nao tinha inventario. */
const RISCOS_INVENTADOS = [
  'Ruido de fundo operacional e iluminacao de area de trabalho',
  'Ausencia de exposicao habitual a agentes quimicos agressivos',
  'Ausencia de exposicao a micro-organismos patogenicos',
  'Postura de trabalho com exigencia de atencao continua e esforco visual',
  'Queda em mesmo nivel, tropecos e contato com quinas de moveis/maquinas',
];

/** Protecoes coletivas afirmadas sem que ninguem tivesse ido ao local. */
const EPC_INVENTADOS = [
  'Iluminacao natural e artificial dimensionada conforme NHO-11',
  'Sinalizacao de seguranca, faixas de pedestres e rotas de fuga desobstruidas',
  'Sistema de combate a incendio com extintores e hidrantes inspecionados',
  'Aterramento eletrico de tomadas e quadros protegidos por disjuntores DR',
];

/** Rotinas acrescentadas a qualquer cargo, inclusive administrativo. */
const ROTINAS_INVENTADAS = [
  'Manutencao da ordem e limpeza do posto de trabalho 5S',
  'Inspecao visual preliminar de maquinas e ferramentas de uso',
  'Executar as atribuicoes inerentes a funcao contratada conforme orientacoes da lideranca',
  'Participar dos DDS (Dialogos Diarios de Seguranca)',
  'Conservar os materiais e equipamentos sob sua responsabilidade',
];

/**
 * O EPI pescado do catalogo. O caminho legitimo (EPI do cadastro do
 * colaborador) gravava outra recomendacao de uso, e e essa diferenca que
 * distingue os dois - por isso a comparacao e por este texto, e nao pelo nome
 * do equipamento.
 */
const USO_DO_EPI_PESCADO_DO_CATALOGO = 'Uso obrigatorio nas dependencias operacionais';

/**
 * O que a OS declara quando o GHE nao tem inventario de riscos.
 *
 * Exportado porque DOIS caminhos escrevem esta mesma frase: o gerador, ao
 * criar uma OS nova, e a limpeza, ao esvaziar uma OS antiga. Duas copias da
 * mesma frase divergem - a primeira ja tinha saido sem acento -, e a mesma
 * situacao passaria a aparecer de dois jeitos no documento.
 */
export const AVISO_SEM_INVENTARIO =
  'Inventário de riscos não elaborado para este GHE — pendente (NR-01 item 1.5.4)';

/** Compara ignorando acento, caixa e espaco repetido. */
function mesmoTexto(a: string, b: string): boolean {
  const normal = (t: string) =>
    String(t || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  return normal(a) === normal(b);
}

const semNenhumDe = (lista: any, proibidas: string[]): string[] =>
  (Array.isArray(lista) ? lista : []).filter(
    (item: any) => !proibidas.some((p) => mesmoTexto(item, p))
  );

/**
 * Devolve a OS sem o conteudo inventado, ou a MESMA referencia quando nada
 * havia a remover - assim o React nao re-renderiza a lista inteira a toa.
 */
export function limparOrdemDeServico(os: SSTWorkOrderOS): SSTWorkOrderOS {
  if (!os || typeof os !== 'object') return os;

  const fisicos = semNenhumDe((os as any).physical_risks, RISCOS_INVENTADOS);
  const quimicos = semNenhumDe((os as any).chemical_risks, RISCOS_INVENTADOS);
  const biologicos = semNenhumDe((os as any).biological_risks, RISCOS_INVENTADOS);
  const ergonomicos = semNenhumDe((os as any).ergonomic_risks, RISCOS_INVENTADOS);
  const acidentes = semNenhumDe((os as any).accident_mechanical_risks, RISCOS_INVENTADOS);
  const epc = semNenhumDe((os as any).collective_protections_epc, EPC_INVENTADOS);
  const rotina = semNenhumDe((os as any).routine_activities, ROTINAS_INVENTADAS);

  const epis = (Array.isArray((os as any).mandatory_epis) ? (os as any).mandatory_epis : []).filter(
    (e: any) => !mesmoTexto(e?.usage_recommendation, USO_DO_EPI_PESCADO_DO_CATALOGO)
  );

  const mudou =
    fisicos.length !== ((os as any).physical_risks?.length || 0) ||
    quimicos.length !== ((os as any).chemical_risks?.length || 0) ||
    biologicos.length !== ((os as any).biological_risks?.length || 0) ||
    ergonomicos.length !== ((os as any).ergonomic_risks?.length || 0) ||
    acidentes.length !== ((os as any).accident_mechanical_risks?.length || 0) ||
    epc.length !== ((os as any).collective_protections_epc?.length || 0) ||
    rotina.length !== ((os as any).routine_activities?.length || 0) ||
    epis.length !== ((os as any).mandatory_epis?.length || 0);

  if (!mudou) return os;

  // Tirado o texto inventado, as cinco categorias ficam vazias. Vazio nao
  // explica nada a quem le a OS: entra o mesmo aviso que o gerador novo
  // escreve quando o GHE nao tem inventario.
  const ficouTudoVazio =
    fisicos.length === 0 &&
    quimicos.length === 0 &&
    biologicos.length === 0 &&
    ergonomicos.length === 0 &&
    acidentes.length === 0;

  const aviso = ficouTudoVazio ? [AVISO_SEM_INVENTARIO] : [];

  return {
    ...os,
    physical_risks: fisicos.length > 0 ? fisicos : aviso,
    chemical_risks: quimicos.length > 0 ? quimicos : aviso,
    biological_risks: biologicos.length > 0 ? biologicos : aviso,
    ergonomic_risks: ergonomicos.length > 0 ? ergonomicos : aviso,
    accident_mechanical_risks: acidentes.length > 0 ? acidentes : aviso,
    collective_protections_epc: epc,
    routine_activities: rotina,
    mandatory_epis: epis,
  } as SSTWorkOrderOS;
}

/** Aplica a limpeza a uma lista inteira de OS. */
export function limparOrdensDeServico(lista: SSTWorkOrderOS[]): SSTWorkOrderOS[] {
  if (!Array.isArray(lista)) return lista;
  return lista.map(limparOrdemDeServico);
}
