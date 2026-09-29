/**
 * Quem responde tecnicamente por qual cliente, e por qual documento.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 *
 * A responsabilidade tecnica do sistema era UMA SO, da organizacao inteira:
 *
 *     organization.technical_responsible_name   // um engenheiro
 *     organization.pcmso_physician_name         // um medico
 *
 * Todo PGR, LTCAT, laudo e PCMSO de TODO cliente saia assinado por esses dois
 * nomes. Na pratica de uma consultoria isso e falso de duas maneiras, e as
 * duas tem consequencia legal:
 *
 *   1. o engenheiro responde pelo contrato da empresa A e nao pelo da B. Sair
 *      como responsavel tecnico de um documento da B e assumir, por escrito,
 *      responsabilidade por um servico que ele nao contratou nem executou
 *   2. o medico pode ser o EXAMINADOR de um cliente sem ser o COORDENADOR do
 *      PCMSO dele. A NR-07 trata os dois como pessoas distintas - o ASO pede
 *      os dois nomes, separados - e o eSocial tambem: o S-2220 leva o
 *      coordenador em [respMonit] e o emitente do ASO em [medico]
 *
 * A REGRA AQUI
 *
 * Responsabilidade e sempre POR CLIENTE. Nao existe "responsavel padrao que
 * vale em quem nao tiver especifico": esse padrao e exatamente o defeito -
 * ele faz um profissional assinar por contrato que nao e dele sem que ninguem
 * tenha decidido isso. Atribuir a varios clientes de uma vez e um botao na
 * tela, e cada cliente vira um registro proprio, com vigencia e trilha.
 *
 * Enquanto NAO houver nenhuma atribuicao para o cliente, os documentos seguem
 * usando o responsavel da organizacao - senao todo documento ja emitido viraria
 * "NAO INFORMADO" de um dia para o outro - mas o documento passa a declarar
 * essa pendencia no proprio corpo, onde ja imprime as outras.
 *
 * BASE NORMATIVA (texto conferido, nao de memoria)
 *
 * NR-07, item 7.4.1: "Compete ao empregador: [...] c) indicar medico do
 * trabalho responsavel pelo PCMSO."
 *
 * NR-07, item 7.5.2: "Inexistindo medico do trabalho na localidade, a
 * organizacao pode contratar medico de outra especialidade como responsavel
 * pelo PCMSO." - por isso o papel exige CRM, e nao especialidade.
 *
 * NR-07, item 7.5.19.1: o ASO deve conter "f) o nome e numero de registro
 * profissional do medico responsavel pelo PCMSO, se houver;" e "g) data,
 * numero de registro profissional e assinatura do medico que realizou o exame
 * clinico." Sao dois profissionais, e podem ser pessoas diferentes.
 *
 * NR-01, item 1.5.7.2: "Os documentos integrantes do PGR devem ser elaborados
 * sob a responsabilidade da organizacao, respeitado o disposto nas demais
 * Normas Regulamentadoras, datados e assinados." A NR-01 nao nomeia conselho
 * de classe para o PGR - e por isso este arquivo tambem nao exige um.
 *
 * CLT, art. 195: "A caracterizacao e a classificacao da insalubridade e da
 * periculosidade, segundo as normas do Ministerio do Trabalho, far-se-ao
 * atraves de pericia a cargo de Medico do Trabalho ou Engenheiro do Trabalho,
 * registrados no Ministerio do Trabalho."
 *
 * Lei 8.213/91, art. 58, par. 1o: a comprovacao da exposicao e feita com base
 * em "laudo tecnico de condicoes ambientais do trabalho expedido por medico do
 * trabalho ou engenheiro de seguranca do trabalho".
 *
 * MOS do eSocial S-1.3, S-2220, item 1.7: "O grupo [respMonit] e de
 * preenchimento obrigatorio sempre que houver um medico responsavel/coordenador
 * do PCMSO. Inexistindo obrigatoriedade de elaboracao do PCMSO, o campo nao
 * precisa ser preenchido."
 *
 * MOS do eSocial S-1.3, S-2240, item 11.1: "O grupo [respReg] permite o
 * registro de ate 99 responsaveis pelos registros ambientais de forma
 * concomitante. Ressalta-se que o responsavel pelos registros ambientais e
 * (sao) o(s) profissional(is) que elaboraram o LTCAT ou dos documentos aceitos
 * em sua substituicao ou complementacao, conforme legislacao vigente."
 *
 * O QUE ESTE ARQUIVO NAO FAZ
 *
 * Nao inventa conselho onde a norma nao exige. PGR, AEP e treinamento aceitam
 * qualquer registro porque nenhuma das normas lidas nomeia um - exigir CREA no
 * PGR seria regra minha, nao da NR-01.
 */

import type {
  ConselhoProfissional,
  TechnicalProfessional,
  TechnicalResponsibility,
  TechnicalRoleCode,
} from '@/types';

/** Conselhos que o cadastro aceita. 'OUTRO' obriga a descrever a sigla. */
export const CONSELHOS: { codigo: ConselhoProfissional; nome: string }[] = [
  { codigo: 'CRM', nome: 'CRM - Conselho Regional de Medicina' },
  { codigo: 'CREA', nome: 'CREA - Conselho Regional de Engenharia e Agronomia' },
  { codigo: 'CRO', nome: 'CRO - Conselho Regional de Odontologia' },
  { codigo: 'COREN', nome: 'COREN - Conselho Regional de Enfermagem' },
  { codigo: 'CREFITO', nome: 'CREFITO - Conselho Regional de Fisioterapia e Terapia Ocupacional' },
  { codigo: 'CRFA', nome: 'CRFa - Conselho Regional de Fonoaudiologia' },
  { codigo: 'CRP', nome: 'CRP - Conselho Regional de Psicologia' },
  { codigo: 'MTE', nome: 'Registro MTE (Técnico de Segurança do Trabalho)' },
  { codigo: 'OUTRO', nome: 'Outro conselho / registro' },
];

export interface DefinicaoDePapel {
  codigo: TechnicalRoleCode;
  /** Como o papel aparece na tela. */
  nome: string;
  /** Documento ou evento que este papel assina/alimenta. */
  documento: string;
  /**
   * Conselhos aceitos. `null` = a norma lida nao exige conselho especifico,
   * entao o sistema nao exige tambem.
   */
  conselhosAceitos: ConselhoProfissional[] | null;
  /** De onde vem a exigencia, citada como esta na norma. */
  baseLegal: string;
  /** Papel que so admite um titular vigente por cliente. */
  unicoPorCliente: boolean;
  /** Uma linha explicando para que serve, na tela. */
  descricao: string;
}

/**
 * Os papeis que o sistema reconhece.
 *
 * Cada um existe porque algum documento ou evento do sistema precisa saber o
 * nome de quem responde. Papel que nao alimenta nada nao entra nesta lista -
 * era o que tornava a matriz de exames uma tela sem funcao.
 */
export const PAPEIS_TECNICOS: DefinicaoDePapel[] = [
  {
    codigo: 'PGR_RESP',
    nome: 'Responsável técnico pelo PGR / PGRTR',
    documento: 'PGR, PGRTR (inventário de riscos e plano de ação)',
    conselhosAceitos: null,
    baseLegal:
      'NR-01, item 1.5.7.2: os documentos integrantes do PGR devem ser elaborados sob a '
      + 'responsabilidade da organização, datados e assinados. A NR-01 não nomeia conselho de classe.',
    unicoPorCliente: false,
    descricao: 'Assina o PGR e o plano de ação deste cliente.',
  },
  {
    codigo: 'LTCAT_RESP',
    nome: 'Responsável pelo LTCAT',
    documento: 'LTCAT',
    conselhosAceitos: ['CRM', 'CREA'],
    baseLegal:
      'Lei 8.213/91, art. 58, § 1º: laudo técnico de condições ambientais do trabalho expedido '
      + 'por médico do trabalho ou engenheiro de segurança do trabalho.',
    unicoPorCliente: false,
    descricao: 'Assina o LTCAT deste cliente.',
  },
  {
    codigo: 'LAUDO_INSALUBRIDADE',
    nome: 'Perito do laudo de insalubridade',
    documento: 'Laudo de insalubridade (NR-15)',
    conselhosAceitos: ['CRM', 'CREA'],
    baseLegal:
      'CLT, art. 195: a caracterização e a classificação da insalubridade e da periculosidade '
      + 'far-se-ão através de perícia a cargo de Médico do Trabalho ou Engenheiro do Trabalho.',
    unicoPorCliente: false,
    descricao: 'Assina o laudo de insalubridade deste cliente.',
  },
  {
    codigo: 'LAUDO_PERICULOSIDADE',
    nome: 'Perito do laudo de periculosidade',
    documento: 'Laudo de periculosidade (NR-16)',
    conselhosAceitos: ['CRM', 'CREA'],
    baseLegal:
      'CLT, art. 195: a caracterização e a classificação da insalubridade e da periculosidade '
      + 'far-se-ão através de perícia a cargo de Médico do Trabalho ou Engenheiro do Trabalho.',
    unicoPorCliente: false,
    descricao: 'Assina o laudo de periculosidade deste cliente.',
  },
  {
    codigo: 'PCMSO_COORD',
    nome: 'Médico responsável pelo PCMSO (coordenador)',
    documento: 'PCMSO, campo f) do ASO e grupo [respMonit] do S-2220',
    conselhosAceitos: ['CRM'],
    baseLegal:
      'NR-07, item 7.4.1, alínea c: compete ao empregador indicar médico do trabalho responsável '
      + 'pelo PCMSO. Item 7.5.2: inexistindo médico do trabalho na localidade, pode ser contratado '
      + 'médico de outra especialidade — por isso exige-se CRM, e não a especialidade.',
    unicoPorCliente: true,
    descricao: 'Coordena o PCMSO. Vai no ASO e no [respMonit] do S-2220 deste cliente.',
  },
  {
    codigo: 'PCMSO_ELABORADOR',
    nome: 'Médico elaborador do PCMSO',
    documento: 'PCMSO',
    conselhosAceitos: ['CRM'],
    baseLegal:
      'NR-07, item 7.5.1: o PCMSO deve ser elaborado considerando os riscos identificados e '
      + 'classificados pelo PGR. Elaborar não é coordenar: o coordenador é o do item 7.4.1 "c".',
    unicoPorCliente: false,
    descricao: 'Escreveu o PCMSO sem necessariamente coordená-lo.',
  },
  {
    codigo: 'MEDICO_EXAMINADOR',
    nome: 'Médico examinador (emitente do ASO)',
    documento: 'ASO, campo g) e grupo [medico] do S-2220',
    conselhosAceitos: ['CRM'],
    baseLegal:
      'NR-07, item 7.5.19.1, alínea g: o ASO deve conter data, número de registro profissional e '
      + 'assinatura do médico que realizou o exame clínico.',
    unicoPorCliente: false,
    descricao: 'Realiza o exame clínico e assina o ASO deste cliente.',
  },
  {
    codigo: 'REG_AMBIENTAIS',
    nome: 'Responsável pelos registros ambientais (S-2240)',
    documento: 'Grupo [respReg] do evento S-2240',
    conselhosAceitos: ['CRM', 'CREA'],
    baseLegal:
      'MOS do eSocial S-1.3, S-2240, item 11.1: o responsável pelos registros ambientais é o '
      + 'profissional que elaborou o LTCAT ou os documentos aceitos em sua substituição. '
      + 'O grupo admite até 99 responsáveis concomitantes.',
    unicoPorCliente: false,
    descricao: 'Vai no S-2240 deste cliente, com o CPF.',
  },
  {
    codigo: 'AEP_RESP',
    nome: 'Responsável pela avaliação ergonômica',
    documento: 'AEP / AET (NR-17)',
    conselhosAceitos: null,
    baseLegal:
      'NR-17: a norma não nomeia conselho de classe para a avaliação ergonômica preliminar, '
      + 'então o sistema não exige um.',
    unicoPorCliente: false,
    descricao: 'Assina a AEP e a AET deste cliente.',
  },
  {
    codigo: 'PPP_RESP',
    nome: 'Responsável pelo PPP',
    documento: 'PPP',
    conselhosAceitos: null,
    baseLegal:
      'O PPP é emitido pela empresa com base no LTCAT (Lei 8.213/91, art. 58, § 1º). '
      + 'Quem responde pelos registros ambientais é o papel "Responsável pelos registros ambientais".',
    unicoPorCliente: false,
    descricao: 'Assina o PPP deste cliente.',
  },
  {
    codigo: 'TREINAMENTO_RESP',
    nome: 'Responsável técnico pelo treinamento',
    documento: 'Certificados e listas de presença (NR-01, item 1.7)',
    conselhosAceitos: null,
    baseLegal:
      'NR-01, glossário: "Responsável técnico pelo treinamento: profissional ou trabalhador '
      + 'qualificado, ou ainda profissional legalmente habilitado, salvo disposição de NR '
      + 'específica, responsável pela execução do treinamento, podendo ser o próprio instrutor."',
    unicoPorCliente: false,
    descricao: 'Valida os treinamentos deste cliente.',
  },
];

export function definicaoDoPapel(codigo: TechnicalRoleCode): DefinicaoDePapel | null {
  return PAPEIS_TECNICOS.find((p) => p.codigo === codigo) || null;
}

/** Registro profissional como sai no documento: "CRM 24192/BA". */
export function registroDoProfissional(profissional: TechnicalProfessional | null | undefined): string {
  if (!profissional) return '';
  const sigla = String(
    profissional.council === 'OUTRO'
      ? profissional.council_other || 'Registro'
      : profissional.council || ''
  ).trim();
  const numero = String(profissional.council_number || '').trim();
  const uf = String(profissional.council_uf || '').trim().toUpperCase();
  if (!numero) return sigla;
  return uf ? `${sigla} ${numero}/${uf}` : `${sigla} ${numero}`;
}

/**
 * Linha de assinatura: nome, registro e RQE quando houver.
 *
 * O RQE identifica a especialidade registrada no conselho e e o que distingue
 * um medico do trabalho de um medico de outra especialidade contratado pelo
 * item 7.5.2 da NR-07.
 */
export function linhaDeAssinatura(profissional: TechnicalProfessional | null | undefined): string {
  if (!profissional) return '';
  const nome = String(profissional.full_name || '').trim();
  const partes = [
    String(profissional.specialty || '').trim(),
    registroDoProfissional(profissional),
    String(profissional.rqe || '').trim() ? `RQE ${String(profissional.rqe).trim()}` : '',
  ].filter(Boolean);
  return partes.length > 0 ? `${nome} (${partes.join(' - ')})` : nome;
}

/**
 * O profissional pode assumir este papel?
 *
 * Checagem de habilitacao, nao de competencia: o sistema so sabe conferir o
 * conselho que a norma exige. Onde a norma nao exige nada, isto devolve apto.
 */
export function habilitacaoParaPapel(
  profissional: TechnicalProfessional | null | undefined,
  papel: TechnicalRoleCode
): { apto: boolean; motivo: string } {
  const definicao = definicaoDoPapel(papel);
  if (!definicao) return { apto: false, motivo: 'Papel desconhecido.' };
  if (!profissional) return { apto: false, motivo: 'Nenhum profissional selecionado.' };

  const aceitos = definicao.conselhosAceitos;
  if (!aceitos) return { apto: true, motivo: '' };

  if (aceitos.includes(profissional.council)) return { apto: true, motivo: '' };

  const lista = aceitos.join(' ou ');
  return {
    apto: false,
    motivo:
      `${definicao.nome} exige registro ${lista}. ${profissional.full_name || 'O profissional'} `
      + `tem registro ${profissional.council || 'não informado'}. ${definicao.baseLegal}`,
  };
}

/**
 * A atribuicao esta valendo nesta data?
 *
 * Sem data de inicio declarada, conta como vigente: recusar silenciosamente
 * uma atribuicao por causa de um campo em branco tiraria o responsavel do
 * documento sem dizer por que. O formulario e que cobra a data.
 */
export function atribuicaoVigente(
  atribuicao: TechnicalResponsibility | null | undefined,
  data: string
): boolean {
  if (!atribuicao) return false;
  if (atribuicao.status === 'INACTIVE') return false;
  const dia = String(data || '').slice(0, 10);
  if (!dia) return true;
  const inicio = String(atribuicao.start_date || '').slice(0, 10);
  const fim = String(atribuicao.end_date || '').slice(0, 10);
  if (inicio && inicio > dia) return false;
  if (fim && fim < dia) return false;
  return true;
}

/**
 * Todos os profissionais vigentes num papel, para um cliente.
 *
 * Devolve lista porque o eSocial admite ate 99 responsaveis pelos registros
 * ambientais no mesmo S-2240, e porque perícia assinada por dois e comum.
 */
export function responsaveisDoCliente(
  atribuicoes: TechnicalResponsibility[],
  profissionais: TechnicalProfessional[],
  clientId: string,
  papel: TechnicalRoleCode,
  data: string
): TechnicalProfessional[] {
  const ativos = new Map(
    (Array.isArray(profissionais) ? profissionais : [])
      .filter((p: any) => p && p.status !== 'INACTIVE')
      .map((p: any) => [p.id, p as TechnicalProfessional])
  );

  return (Array.isArray(atribuicoes) ? atribuicoes : [])
    .filter((a: any) => a?.client_id === clientId && a?.role === papel)
    .filter((a: any) => atribuicaoVigente(a, data))
    .map((a: any) => ativos.get(a.professional_id))
    .filter((p): p is TechnicalProfessional => Boolean(p));
}

/**
 * O titular do papel neste cliente, ou null.
 *
 * Havendo mais de um vigente num papel unico (coordenador do PCMSO), devolve o
 * primeiro e sinaliza - nao escolhe em silencio.
 */
export function responsavelDoCliente(
  atribuicoes: TechnicalResponsibility[],
  profissionais: TechnicalProfessional[],
  clientId: string,
  papel: TechnicalRoleCode,
  data: string
): { profissional: TechnicalProfessional | null; duplicado: boolean } {
  const lista = responsaveisDoCliente(atribuicoes, profissionais, clientId, papel, data);
  const definicao = definicaoDoPapel(papel);
  return {
    profissional: lista[0] || null,
    duplicado: Boolean(definicao?.unicoPorCliente) && lista.length > 1,
  };
}

export interface AssinaturaDoDocumento {
  /** Nome que vai sob a linha de assinatura. */
  nome: string;
  /** Nome + especialidade + registro, para o quadro de identificacao. */
  linha: string;
  /** Registro formatado, quando houver. */
  registro: string;
  /** CPF, para os eventos do eSocial. */
  cpf: string;
  /** De onde veio o nome. */
  origem: 'ATRIBUICAO' | 'ORGANIZACAO' | 'NENHUM';
  /** Texto para a lista de pendencias do documento, quando houver. */
  pendencia: string;
}

/**
 * Quem assina este documento, para este cliente.
 *
 * `origem` e o que torna a regressao visivel: 'ORGANIZACAO' significa que
 * ninguem foi atribuido a este cliente e o documento esta saindo com o nome
 * geral da consultoria. O documento imprime isso como pendencia em vez de
 * fingir que esta resolvido.
 */
export function assinaturaDoDocumento(
  papel: TechnicalRoleCode,
  entrada: {
    atribuicoes?: TechnicalResponsibility[];
    profissionais?: TechnicalProfessional[];
    clientId?: string;
    data?: string;
    /** Nome geral da organizacao, usado so enquanto nao ha atribuicao. */
    nomeDaOrganizacao?: string;
    linhaDaOrganizacao?: string;
  }
): AssinaturaDoDocumento {
  const definicao = definicaoDoPapel(papel);
  const rotulo = definicao?.nome || 'Responsável técnico';

  const { profissional, duplicado } = responsavelDoCliente(
    entrada.atribuicoes || [],
    entrada.profissionais || [],
    String(entrada.clientId || ''),
    papel,
    String(entrada.data || '')
  );

  if (profissional) {
    const habilitacao = habilitacaoParaPapel(profissional, papel);
    const avisos: string[] = [];
    if (!habilitacao.apto) avisos.push(habilitacao.motivo);
    if (duplicado) {
      avisos.push(
        `Há mais de um profissional vigente como ${rotulo} neste cliente. `
        + 'O documento saiu com o primeiro — encerre a vigência do anterior.'
      );
    }
    return {
      nome: String(profissional.full_name || '').trim(),
      linha: linhaDeAssinatura(profissional),
      registro: registroDoProfissional(profissional),
      cpf: String(profissional.cpf || '').trim(),
      origem: 'ATRIBUICAO',
      pendencia: avisos.join(' '),
    };
  }

  const nomeGeral = String(entrada.nomeDaOrganizacao || '').trim();
  if (nomeGeral) {
    return {
      nome: nomeGeral,
      linha: String(entrada.linhaDaOrganizacao || nomeGeral).trim(),
      registro: '',
      cpf: '',
      origem: 'ORGANIZACAO',
      pendencia:
        `${rotulo} não atribuído a este cliente. O documento saiu com o responsável geral da `
        + 'organização — atribua em Engenharia SST > Responsabilidade Técnica.',
    };
  }

  return {
    nome: '',
    linha: '',
    registro: '',
    cpf: '',
    origem: 'NENHUM',
    pendencia:
      `${rotulo} não definido para este cliente. Atribua em Engenharia SST > Responsabilidade Técnica.`,
  };
}

/**
 * Grupo [respMonit] do S-2220: o medico responsavel/coordenador do PCMSO.
 *
 * Devolve null quando nao ha coordenador atribuido - o MOS S-1.3, S-2220 item
 * 1.7 diz que o grupo so e obrigatorio "sempre que houver um medico
 * responsavel/coordenador do PCMSO". Preencher com o medico examinador seria
 * declarar coordenacao que ninguem assumiu.
 */
export function respMonitDoCliente(
  atribuicoes: TechnicalResponsibility[],
  profissionais: TechnicalProfessional[],
  clientId: string,
  data: string
): { nome: string; cpf: string; crm: string; uf: string } | null {
  const { profissional } = responsavelDoCliente(
    atribuicoes, profissionais, clientId, 'PCMSO_COORD', data
  );
  if (!profissional) return null;
  return {
    nome: String(profissional.full_name || '').trim(),
    cpf: String(profissional.cpf || '').trim(),
    crm: String(profissional.council_number || '').trim(),
    uf: String(profissional.council_uf || '').trim().toUpperCase(),
  };
}

/**
 * Grupo [respReg] do S-2240: quem elaborou o LTCAT.
 *
 * Lista, e nao um so: o MOS admite ate 99 responsaveis concomitantes. Quem nao
 * tiver CPF cadastrado fica de fora com o motivo - o CPF e o unico campo do
 * grupo, entao sem ele nao ha o que declarar.
 */
export function respRegDoCliente(
  atribuicoes: TechnicalResponsibility[],
  profissionais: TechnicalProfessional[],
  clientId: string,
  data: string
): {
  responsaveis: { nome: string; cpf: string; registro: string }[];
  pendencias: string[];
} {
  const lista = responsaveisDoCliente(
    atribuicoes, profissionais, clientId, 'REG_AMBIENTAIS', data
  );

  const responsaveis: { nome: string; cpf: string; registro: string }[] = [];
  const pendencias: string[] = [];

  for (const p of lista) {
    const cpf = String(p.cpf || '').replace(/\D/g, '');
    if (cpf.length !== 11) {
      pendencias.push(
        `${p.full_name || 'Responsável pelos registros ambientais'} está sem CPF válido. `
        + 'O grupo [respReg] do S-2240 é formado pelo CPF do responsável.'
      );
      continue;
    }
    responsaveis.push({
      nome: String(p.full_name || '').trim(),
      cpf: String(p.cpf || '').trim(),
      registro: registroDoProfissional(p),
    });
  }

  if (lista.length === 0) {
    pendencias.push(
      'Nenhum responsável pelos registros ambientais atribuído a este cliente. '
      + 'Atribua em Engenharia SST > Responsabilidade Técnica antes de emitir o S-2240.'
    );
  }

  return { responsaveis, pendencias };
}

/**
 * Papeis sem titular vigente num cliente, entre os que a operacao usa.
 *
 * Serve para a tela mostrar o que falta antes de o documento sair errado, e
 * nao depois.
 */
export function papeisSemResponsavel(
  atribuicoes: TechnicalResponsibility[],
  profissionais: TechnicalProfessional[],
  clientId: string,
  data: string,
  papeis: TechnicalRoleCode[] = PAPEIS_TECNICOS.map((p) => p.codigo)
): TechnicalRoleCode[] {
  return papeis.filter(
    (papel) =>
      responsaveisDoCliente(atribuicoes, profissionais, clientId, papel, data).length === 0
  );
}

/**
 * Codigo do orgao de classe para o grupo [respReg] do S-2240.
 *
 * A tabela de {ideOC} do leiaute traz 1 para CRM, 4 para CREA e 9 para os
 * demais, caso em que {dscOC} descreve a sigla. O codigo anterior gravava
 * `ideOC` fixo em 1 - todo responsavel saia declarado como medico, inclusive
 * engenheiro com CREA.
 *
 * Se o leiaute mudar a tabela, este e o unico lugar a corrigir.
 */
export function codigoDoOrgaoDeClasse(
  profissional: TechnicalProfessional | null | undefined
): { ideOC: string; dscOC: string; nrOC: string; ufOC: string } {
  const conselho = profissional?.council;
  const ideOC = conselho === 'CRM' ? '1' : conselho === 'CREA' ? '4' : '9';
  return {
    ideOC,
    // dscOC so faz sentido quando o conselho nao e um dos nomeados na tabela.
    dscOC: ideOC === '9'
      ? String(
          (conselho === 'OUTRO' ? profissional?.council_other : conselho) || ''
        ).trim()
      : '',
    nrOC: String(profissional?.council_number || '').replace(/[^\dA-Za-z-]/g, ''),
    ufOC: String(profissional?.council_uf || '').trim().toUpperCase(),
  };
}

export interface ResponsavelComPapeis {
  profissional: TechnicalProfessional;
  papeis: TechnicalRoleCode[];
}

/**
 * Todos os profissionais que respondem por um cliente, com os papeis de cada um.
 *
 * Existe para documentos que nao tem UM papel proprio - o contrato comercial,
 * por exemplo, cobre varios servicos ao mesmo tempo. Em vez de o sistema
 * escolher um papel qualquer para representar "o responsavel tecnico do
 * contrato", ele mostra quem responde e pelo que.
 */
export function responsaveisTecnicosDoCliente(
  atribuicoes: TechnicalResponsibility[],
  profissionais: TechnicalProfessional[],
  clientId: string,
  data: string
): ResponsavelComPapeis[] {
  const porProfissional = new Map<string, ResponsavelComPapeis>();

  for (const definicao of PAPEIS_TECNICOS) {
    for (const p of responsaveisDoCliente(
      atribuicoes, profissionais, clientId, definicao.codigo, data
    )) {
      const atual = porProfissional.get(p.id);
      if (atual) {
        if (!atual.papeis.includes(definicao.codigo)) atual.papeis.push(definicao.codigo);
      } else {
        porProfissional.set(p.id, { profissional: p, papeis: [definicao.codigo] });
      }
    }
  }

  return Array.from(porProfissional.values());
}

/**
 * Uma linha por responsavel, com os papeis, para imprimir numa celula.
 *
 * Devolve string vazia quando ninguem responde - quem chama decide o que
 * dizer, porque num contrato comercial isso nao e pendencia normativa.
 */
export function linhaDeResponsaveis(
  atribuicoes: TechnicalResponsibility[],
  profissionais: TechnicalProfessional[],
  clientId: string,
  data: string
): string {
  return responsaveisTecnicosDoCliente(atribuicoes, profissionais, clientId, data)
    .map(({ profissional, papeis }) => {
      const nomes = papeis
        .map((codigo) => definicaoDoPapel(codigo)?.nome || codigo)
        .join(', ');
      const registro = registroDoProfissional(profissional);
      return `${profissional.full_name}${registro ? ` (${registro})` : ''} — ${nomes}`;
    })
    .join('\n');
}
