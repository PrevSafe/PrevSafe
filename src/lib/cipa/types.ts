export type TipoVoto = 'NOMINAL' | 'BRANCO' | 'NULO';
export type OrigemVoto = 'LINK_MAGICO' | 'QR_CODE';
export type StatusEleicao =
  | 'RASCUNHO' | 'AGENDADA' | 'ABERTA' | 'ENCERRADA' | 'APURADA' | 'CANCELADA';
export type StatusAnalise = 'PENDENTE' | 'APROVADO' | 'REJEITADO';

export type CandidatoCedula = {
  id: string;
  numero_urna: number | null;
  nome_urna: string;
  cargo: string | null;
  setor: string | null;
  foto_url: string | null;
  ordem: number | null;
};

export type Cedula = {
  eleicao: {
    id: string;
    titulo: string;
    norma: 'NR-05' | 'NR-31';
    gestao: string | null;
    status: StatusEleicao;
    data_inicio: string;
    data_fim: string;
    permite_voto_branco: boolean;
    permite_voto_nulo: boolean;
    permite_qr_code: boolean;
    aceitando_votos: boolean;
  };
  unidade: {
    razao_social: string;
    nome_fantasia: string | null;
    municipio: string | null;
    uf: string | null;
  };
  candidatos: CandidatoCedula[];
};

export type SessaoEleitor = {
  eleicao_id: string;
  nome: string;
  cpf_mascara: string;
  ja_votou: boolean;
};

export type Painel = {
  status: StatusEleicao;
  aptos: number;
  votantes: number;
  quorum_percent: number;
  quorum_atingido: boolean;
  quarentena_pendente: number;
  por_origem: Partial<Record<OrigemVoto, number>>;
  modulo_ativo: boolean;
  resultado_disponivel: boolean;
};

export type EnvelopeQuarentena = {
  id: string;
  nome_declarado: string;
  cpf_mascara: string;
  cargo_declarado: string | null;
  data_hora: string;
  ip_dispositivo: string | null;
  status_analise: StatusAnalise;
  alerta:
    | 'OK'
    | 'CPF_NAO_ENCONTRADO_RH'
    | 'DIVERGENCIA_NOME'
    | 'TENTATIVA_DUPLICADA'
    | 'MULTIPLOS_VOTOS_MESMO_IP';
  nome_rh: string | null;
  cargo_rh: string | null;
  votos_mesmo_ip: number;
};

export type VotoCorrigivel = {
  id: string;
  eleitor_nome: string;
  eleitor_cpf: string;
  origem: OrigemVoto;
  tipo_voto: TipoVoto;
  candidato_nome: string | null;
  criado_em: string;
};

export type MotivoTentativaNegada = 'CPF_FORA_DA_LISTA' | 'CPF_JA_VOTOU';

export type TentativaNegada = {
  id: string;
  cpf: string;
  nome_declarado: string | null;
  motivo: MotivoTentativaNegada;
  ip_dispositivo: string | null;
  criado_em: string;
};

export type PapelComissao = 'presidente' | 'vice_presidente' | 'secretario' | 'membro';

export type MembroComissao = {
  id: string;
  nome: string;
  cpf: string | null;
  cargo: string | null;
  papel: PapelComissao;
};

export type CondicaoIndicado = 'titular' | 'suplente';

export type Indicado = {
  id: string;
  nome: string;
  cargo: string | null;
  setor: string | null;
  condicao: CondicaoIndicado;
  ordem: number;
};

export type PayloadApuracao = {
  empresa: {
    razao_social: string; cnpj: string; total_funcionarios: number;
    grau_risco: number | null; cnae: string | null;
    municipio: string | null; uf: string | null;
  };
  eleicao: {
    titulo: string; norma: string; gestao: string | null;
    data_inicio: string; data_fim: string; encerrada_em: string | null;
    vagas_efetivos: number; vagas_suplentes: number;
    apuracao_iniciada_em: string | null; apuracao_encerrada_em: string | null;
    ata_lavrada_por: string | null; local_apuracao: string | null;
  };
  quorum: { aptos: number; votantes: number; percentual: number; atingido: boolean };
  apuracao: {
    votos_brancos: number;
    votos_nulos: number;
    votos_nominais: number;
    classificacao: Array<{
      posicao: number; nome_completo: string; nome_urna: string;
      cargo_funcao: string | null; setor: string | null; numero_urna: number | null;
      total_votos: number; data_admissao: string | null;
      situacao: 'EFETIVO' | 'SUPLENTE' | 'NAO_ELEITO';
      empate: boolean; desempate_por_admissao: boolean;
    }>;
  };
  quarentena: Partial<Record<StatusAnalise, number>>;
  comissao: Array<{ nome: string; cpf: string | null; cargo: string | null; papel: PapelComissao }>;
  indicados: Array<{ nome: string; cargo: string | null; setor: string | null; condicao: CondicaoIndicado; ordem: number }>;
};

export type EleitorComToken = {
  eleitor_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  token: string;
};

/** Unidades disponíveis para ancorar uma eleição. */
export type UnidadeOpcao = {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  numero_inscricao: string;
  municipio: string | null;
  uf: string | null;
  matriz: boolean;
};
