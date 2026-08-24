import { supabase } from '@/lib/supabase';
import { daEmpresa } from '@/lib/consulta';
import { TIPO_RISCO_LABEL, classificarNivelRisco, NIVEL_RISCO_LABEL, type TipoRisco } from '@/lib/riscos';

export type TipoDocumento = 'PGR' | 'LTCAT' | 'PCMSO';

export const DOCUMENTO_LABEL: Record<TipoDocumento, string> = {
  PGR: 'Programa de Gerenciamento de Riscos',
  LTCAT: 'Laudo Técnico das Condições Ambientais do Trabalho',
  PCMSO: 'Programa de Controle Médico de Saúde Ocupacional',
};

export const DOCUMENTO_NORMA: Record<TipoDocumento, string> = {
  PGR: 'NR-1 (Gerenciamento de Riscos Ocupacionais)',
  LTCAT: 'Instrução Normativa PRES/INSS nº 128/2022 e NR-9',
  PCMSO: 'NR-7 (Programa de Controle Médico de Saúde Ocupacional)',
};

export type CapituloId =
  | 'capa'
  | 'introducao'
  | 'metodologia'
  | 'inventario_riscos'
  | 'cronograma_acoes'
  | 'anexos'
  | 'encerramento';

export type Capitulo = {
  id: CapituloId;
  titulo: string;
  ativo: boolean;
  dinamico: boolean;
};

const TITULOS_CAPITULO: Record<CapituloId, string> = {
  capa: 'Capa e Folha de Rosto',
  introducao: 'Introdução e Objetivos',
  metodologia: 'Metodologia de Avaliação',
  inventario_riscos: 'Inventário de Riscos Ocupacionais',
  cronograma_acoes: 'Cronograma de Ações e Medidas Propostas',
  anexos: 'Anexos e Tabelas Técnicas',
  encerramento: 'Termos de Encerramento e Responsáveis',
};

const CAPITULOS_DINAMICOS = new Set<CapituloId>(['inventario_riscos', 'cronograma_acoes']);

/** Ordem e composição padrão do laudo — o usuário pode desativar ou reordenar a partir daqui. */
export function capitulosPadrao(): Capitulo[] {
  return (Object.keys(TITULOS_CAPITULO) as CapituloId[]).map((id) => ({
    id,
    titulo: TITULOS_CAPITULO[id],
    ativo: true,
    dinamico: CAPITULOS_DINAMICOS.has(id),
  }));
}

export type EmpresaDocumento = {
  nome: string;
  numeroInscricao: string;
  tipoInscricao: number;
};

export type RiscoDocumento = {
  id: string;
  descricao: string;
  tipoRisco: TipoRisco;
  probabilidade: number;
  severidade: number;
  gheNome: string | null;
  fatorRiscoCodigo: string | null;
  fatorRiscoDescricao: string | null;
};

export type ExameDocumento = {
  id: string;
  riscoDescricao: string;
  codigo: string;
  nomeExame: string;
  periodicidadeMeses: number | null;
};

export type AcaoCronograma = {
  id: string;
  oQue: string;
  quando: string;
  quem: string;
  status: string;
};

export type DadosDocumento = {
  empresa: EmpresaDocumento;
  riscos: RiscoDocumento[];
  exames: ExameDocumento[];
  cronograma: AcaoCronograma[];
};

/** Aceita CNPJ (14 dígitos) ou CPF de produtor rural (11 dígitos, tipo_inscricao = 2). */
export function formatarInscricao(numero: string, tipo: number): string {
  const digitos = (numero ?? '').replace(/\D/g, '');
  if (tipo === 2 && digitos.length === 11) {
    return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (digitos.length === 14) {
    return digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return numero;
}

export async function carregarDadosDocumento(empresaId: string): Promise<DadosDocumento> {
  const { data: empresaRaw, error: erroEmpresa } = await supabase
    .from('empresas')
    .select('razao_social, nome_fantasia, numero_inscricao, tipo_inscricao')
    .eq('id', empresaId)
    .single();
  if (erroEmpresa) throw erroEmpresa;

  const [riscosResp, ghesResp, cronogramaResp] = await Promise.all([
    daEmpresa(
      supabase
        .from('riscos_inventario')
        .select(
          'id, ghe_id, tipo_risco, descricao, probabilidade, severidade, fator_risco_t24_codigo, fatores_risco_t24(descricao)'
        ),
      empresaId
    ),
    daEmpresa(supabase.from('ghes').select('id, nome'), empresaId),
    daEmpresa(
      supabase.from('planos_acao_5w2h').select('id, o_que, quando, quem, status'),
      empresaId
    ).order('quando', { ascending: true }),
  ]);
  if (riscosResp.error) throw riscosResp.error;
  if (ghesResp.error) throw ghesResp.error;
  if (cronogramaResp.error) throw cronogramaResp.error;

  const ghesPorId = new Map((ghesResp.data ?? []).map((g) => [g.id as string, g.nome as string]));

  type RiscoRaw = {
    id: string;
    ghe_id: string;
    tipo_risco: TipoRisco;
    descricao: string;
    probabilidade: number;
    severidade: number;
    fator_risco_t24_codigo: string | null;
    fatores_risco_t24: { descricao: string } | { descricao: string }[] | null;
  };

  const riscosRaw = (riscosResp.data ?? []) as unknown as RiscoRaw[];

  const riscos: RiscoDocumento[] = riscosRaw.map((r) => {
    const fator = Array.isArray(r.fatores_risco_t24) ? r.fatores_risco_t24[0] : r.fatores_risco_t24;
    return {
      id: r.id,
      descricao: r.descricao,
      tipoRisco: r.tipo_risco,
      probabilidade: r.probabilidade,
      severidade: r.severidade,
      gheNome: ghesPorId.get(r.ghe_id) ?? null,
      fatorRiscoCodigo: r.fator_risco_t24_codigo,
      fatorRiscoDescricao: fator?.descricao ?? null,
    };
  });

  const codigosFator = [...new Set(riscos.map((r) => r.fatorRiscoCodigo).filter((c): c is string => Boolean(c)))];

  let exames: ExameDocumento[] = [];
  if (codigosFator.length) {
    const { data: compat } = await supabase
      .from('riscos_exames_compatibilidade')
      .select('fator_risco_codigo, procedimento_codigo')
      .in('fator_risco_codigo', codigosFator);

    const codigosProcedimento = [...new Set((compat ?? []).map((c) => c.procedimento_codigo))];
    const procedimentosPorCodigo = new Map<string, { nomeExame: string; periodicidadeMeses: number | null }>();
    if (codigosProcedimento.length) {
      const { data: procs } = await supabase
        .from('procedimentos_t27')
        .select('codigo_esocial, nome_exame, periodicidade_meses')
        .in('codigo_esocial', codigosProcedimento);
      for (const p of procs ?? []) {
        procedimentosPorCodigo.set(p.codigo_esocial, { nomeExame: p.nome_exame, periodicidadeMeses: p.periodicidade_meses });
      }
    }

    const compatPorFator = new Map<string, string[]>();
    for (const c of compat ?? []) {
      const lista = compatPorFator.get(c.fator_risco_codigo) ?? [];
      lista.push(c.procedimento_codigo);
      compatPorFator.set(c.fator_risco_codigo, lista);
    }

    exames = riscos
      .filter((r) => r.fatorRiscoCodigo)
      .flatMap((r) =>
        (compatPorFator.get(r.fatorRiscoCodigo as string) ?? []).map((codigo) => ({
          id: `${r.id}-${codigo}`,
          riscoDescricao: r.fatorRiscoDescricao ?? r.descricao,
          codigo,
          nomeExame: procedimentosPorCodigo.get(codigo)?.nomeExame ?? codigo,
          periodicidadeMeses: procedimentosPorCodigo.get(codigo)?.periodicidadeMeses ?? null,
        }))
      );
  }

  const cronograma: AcaoCronograma[] = (cronogramaResp.data ?? []).map((p) => ({
    id: p.id,
    oQue: p.o_que,
    quando: p.quando,
    quem: p.quem,
    status: p.status,
  }));

  const empresa: EmpresaDocumento = {
    nome: empresaRaw.nome_fantasia || empresaRaw.razao_social,
    numeroInscricao: empresaRaw.numero_inscricao,
    tipoInscricao: empresaRaw.tipo_inscricao,
  };

  return { empresa, riscos, exames, cronograma };
}

export type Margem = 'padrao' | 'estreita' | 'larga';
export type Fonte = 'Arial' | 'Calibri' | 'Times New Roman';

export type ConfiguracaoLayout = {
  margem: Margem;
  fonte: Fonte;
  tamanhoFonte: number;
  exibirAssinaturas: boolean;
  exibirIndice: boolean;
  exibirNotasRodape: boolean;
};

export const MARGEM_LABEL: Record<Margem, string> = {
  padrao: 'Padrão SST/ABNT (2 cm)',
  estreita: 'Estreita (1,5 cm)',
  larga: 'Larga (3 cm)',
};

export const MARGEM_CM: Record<Margem, number> = {
  padrao: 2,
  estreita: 1.5,
  larga: 3,
};

export type BlocoFolha =
  | { tipo: 'capa' }
  | { tipo: 'texto'; paragrafos: string[] }
  | { tipo: 'tabela_riscos'; itens: RiscoDocumento[]; continuacao: boolean }
  | { tipo: 'tabela_exames'; itens: ExameDocumento[]; continuacao: boolean }
  | { tipo: 'tabela_cronograma'; itens: AcaoCronograma[]; continuacao: boolean }
  | { tipo: 'anexos' }
  | { tipo: 'encerramento' };

export type Folha = { capituloId: CapituloId; titulo: string; bloco: BlocoFolha };

const RISCOS_POR_PAGINA = 9;
const EXAMES_POR_PAGINA = 12;
const ACOES_POR_PAGINA = 7;

function paginar<T>(itens: T[], porPagina: number): T[][] {
  if (itens.length === 0) return [[]];
  const paginas: T[][] = [];
  for (let i = 0; i < itens.length; i += porPagina) paginas.push(itens.slice(i, i + porPagina));
  return paginas;
}

function textoIntroducao(tipo: TipoDocumento, empresaNome: string): string[] {
  return [
    `Este documento constitui o ${DOCUMENTO_LABEL[tipo]} da empresa ${empresaNome}, elaborado em conformidade com ${DOCUMENTO_NORMA[tipo]} e com os requisitos de compatibilidade de dados exigidos pelo eSocial na versão simplificada S-1.3 (NT 06/2026).`,
    'O objetivo geral é identificar, avaliar e documentar os riscos ocupacionais aos quais os trabalhadores estão expostos, definindo as medidas de prevenção, controle e monitoramento aplicáveis a cada Grupo de Exposição Homogênea (GHE), de modo a subsidiar o Perfil Profissiográfico Previdenciário (PPP) e as demais obrigações acessórias.',
  ];
}

function textoMetodologia(tipo: TipoDocumento): string[] {
  const base = [
    'A avaliação seguiu a metodologia de Gerenciamento de Riscos Ocupacionais (GRO), com identificação de perigos, classificação por tipo de risco (físico, químico, biológico, ergonômico e de acidentes) e dimensionamento por meio de matriz de probabilidade × severidade (escala de 1 a 5 em cada eixo).',
    'Os riscos foram agrupados por GHE — conjunto de trabalhadores que exercem atividade semelhante em condições ambientais semelhantes — permitindo o tratamento coletivo da exposição e a vinculação automática com os exames complementares exigidos no PCMSO (Tabela 27 do eSocial), conforme a matriz de compatibilidade da Tabela 24.',
  ];
  if (tipo === 'PCMSO') {
    base.push(
      'Para o PCMSO especificamente, a cada fator de risco caracterizado é associado o conjunto de procedimentos médicos obrigatórios e sua periodicidade regulamentar, formando a agenda de exames complementares por GHE.'
    );
  }
  if (tipo === 'LTCAT') {
    base.push(
      'Para fins de caracterização previdenciária (LTCAT), os riscos que ensejam aposentadoria especial foram destacados e cruzados com o código de agente nocivo declarado na folha de pagamento (S-1200), de modo a evidenciar eventuais divergências no recolhimento da alíquota suplementar de SAT/FENTEC.'
    );
  }
  return base;
}

/** Monta a sequência de folhas a partir dos capítulos ativos, na ordem em que estiverem (o usuário pode reordenar via drag-and-drop). */
export function montarFolhas(capitulos: Capitulo[], dados: DadosDocumento, tipo: TipoDocumento): Folha[] {
  const folhas: Folha[] = [];

  for (const capitulo of capitulos) {
    if (!capitulo.ativo) continue;

    switch (capitulo.id) {
      case 'capa':
        folhas.push({ capituloId: capitulo.id, titulo: capitulo.titulo, bloco: { tipo: 'capa' } });
        break;

      case 'introducao':
        folhas.push({
          capituloId: capitulo.id,
          titulo: capitulo.titulo,
          bloco: { tipo: 'texto', paragrafos: textoIntroducao(tipo, dados.empresa.nome) },
        });
        break;

      case 'metodologia':
        folhas.push({
          capituloId: capitulo.id,
          titulo: capitulo.titulo,
          bloco: { tipo: 'texto', paragrafos: textoMetodologia(tipo) },
        });
        break;

      case 'inventario_riscos':
        if (tipo === 'PCMSO') {
          paginar(dados.exames, EXAMES_POR_PAGINA).forEach((itens, i) =>
            folhas.push({
              capituloId: capitulo.id,
              titulo: capitulo.titulo,
              bloco: { tipo: 'tabela_exames', itens, continuacao: i > 0 },
            })
          );
        } else {
          paginar(dados.riscos, RISCOS_POR_PAGINA).forEach((itens, i) =>
            folhas.push({
              capituloId: capitulo.id,
              titulo: capitulo.titulo,
              bloco: { tipo: 'tabela_riscos', itens, continuacao: i > 0 },
            })
          );
        }
        break;

      case 'cronograma_acoes':
        paginar(dados.cronograma, ACOES_POR_PAGINA).forEach((itens, i) =>
          folhas.push({
            capituloId: capitulo.id,
            titulo: capitulo.titulo,
            bloco: { tipo: 'tabela_cronograma', itens, continuacao: i > 0 },
          })
        );
        break;

      case 'anexos':
        folhas.push({ capituloId: capitulo.id, titulo: capitulo.titulo, bloco: { tipo: 'anexos' } });
        break;

      case 'encerramento':
        folhas.push({ capituloId: capitulo.id, titulo: capitulo.titulo, bloco: { tipo: 'encerramento' } });
        break;
    }
  }

  return folhas;
}

export { NIVEL_RISCO_LABEL, TIPO_RISCO_LABEL, classificarNivelRisco };
