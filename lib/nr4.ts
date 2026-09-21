/**
 * Módulo de Validação e Classificação da NR-04 (Norma Regulamentadora nº 04)
 * Ministério do Trabalho e Emprego (MTE) - Portaria MTP nº 4.219 e atualizações.
 * 
 * Relação oficial entre CNAE (Classificação Nacional de Atividades Econômicas) 
 * e Grau de Risco (1, 2, 3 ou 4) para dimensionamento de SESMT e enquadramento de SST.
 */

import {
  consultarGrauDeRisco,
  formatarClasse,
  buscarClasses,
} from './nr4AnexoI';
import {
  consultarAnexoII,
  OBSERVACAO_ESTABELECIMENTOS_DE_SAUDE,
  ResultadoAnexoIIStatus,
} from './nr4QuadroII';
import { consultarQuadroI, ResultadoQuadroI } from './nr5Quadros';

export interface CnaeRiskEntry {
  code: string;           // Código numérico formatado ex: "25.11-0-00"
  cleanCode: string;      // Código limpo 7 dígitos ex: "2511000"
  description: string;    // Denominação oficial
  riskDegree: 1 | 2 | 3 | 4; // Grau de Risco Quadro I NR-04
  division: string;       // Divisão CNAE
  sector: 'AGROPECUÁRIA' | 'INDÚSTRIA EXTRATIVA' | 'INDÚSTRIA DE TRANSFORMAÇÃO' | 'ELETRICIDADE & GÁS' | 'ÁGUA & ESGOTO' | 'CONSTRUÇÃO CIVIL' | 'COMÉRCIO' | 'TRANSPORTE & LOGÍSTICA' | 'SERVIÇOS & SAÚDE' | 'OUTROS';
  sesmtObs?: string;
}

export interface SesmtDimensioningResult {
  /**
   * Grau de risco aplicado. Vem null em tempo de execucao quando nao foi
   * informado (status 'NAO_DIMENSIONADO'); cheque o status antes de confiar.
   */
  riskDegree: 1 | 2 | 3 | 4;
  employeeCount: number;
  /** Desfecho: obrigado, dispensado ou sem dado para dimensionar. */
  status: ResultadoAnexoIIStatus;
  tecnicoSeguranca: number;
  engenheiroSeguranca: number;
  auxiliarEnfermagem: number;
  enfermeiroTrabalho: number;
  medicoTrabalho: number;
  /** Fundamentacao legal do Anexo II aplicada a este caso. */
  legalBasis: string;
  /** Rotulo da faixa do Anexo II, ou null se nao enquadrou. */
  faixa: string | null;
  /** Notas do Anexo II que incidem sobre este caso (tempo parcial etc.). */
  notes: string[];
  /**
   * Dimensionamento da CIPA, DELEGADO a fonte unica (Quadro I da NR-05,
   * lib/nr5Quadros.ts). Os antigos campos cipaRequired/cipaMinMembers foram
   * removidos: eram uma segunda formula, sem norma, que discordava do
   * cipaService para o mesmo estabelecimento.
   */
  cipa: ResultadoQuadroI;
  observations: string[];
}

/**
 * Base de Dados Completa e Oficial do Quadro I da NR-04
 */
export const NR4_CNAE_DATABASE: CnaeRiskEntry[] = [
  // AGRICULTURA, PECUÁRIA, PRODUÇÃO FLORESTAL, PESCA E AQUICULTURA (Divisões 01 a 03) - CAEPF / CNPJ
  { code: '01.11-3-01', cleanCode: '0111301', description: 'Cultivo de arroz', riskDegree: 3, division: '01', sector: 'AGROPECUÁRIA' },
  { code: '01.11-3-02', cleanCode: '0111302', description: 'Cultivo de milho', riskDegree: 3, division: '01', sector: 'AGROPECUÁRIA' },
  { code: '01.11-3-03', cleanCode: '0111303', description: 'Cultivo de trigo', riskDegree: 3, division: '01', sector: 'AGROPECUÁRIA' },
  { code: '01.12-1-01', cleanCode: '0112101', description: 'Cultivo de algodão herbáceo', riskDegree: 3, division: '01', sector: 'AGROPECUÁRIA' },
  { code: '01.13-0-00', cleanCode: '0113000', description: 'Cultivo de cana-de-açúcar', riskDegree: 3, division: '01', sector: 'AGROPECUÁRIA' },
  { code: '01.15-6-00', cleanCode: '0115600', description: 'Cultivo de soja', riskDegree: 3, division: '01', sector: 'AGROPECUÁRIA' },
  { code: '01.21-1-01', cleanCode: '0121101', description: 'Cultivo de café', riskDegree: 3, division: '01', sector: 'AGROPECUÁRIA' },
  { code: '01.22-9-00', cleanCode: '0122900', description: 'Cultivo de flores e plantas ornamentais', riskDegree: 3, division: '01', sector: 'AGROPECUÁRIA' },
  { code: '01.31-8-00', cleanCode: '0131800', description: 'Cultivo de laranja', riskDegree: 3, division: '01', sector: 'AGROPECUÁRIA' },
  { code: '01.51-2-01', cleanCode: '0151201', description: 'Criação de bovinos para corte', riskDegree: 3, division: '01', sector: 'AGROPECUÁRIA' },
  { code: '01.51-2-02', cleanCode: '0151202', description: 'Criação de bovinos para leite', riskDegree: 3, division: '01', sector: 'AGROPECUÁRIA' },
  { code: '01.54-7-00', cleanCode: '0154700', description: 'Criação de suínos', riskDegree: 3, division: '01', sector: 'AGROPECUÁRIA' },
  { code: '01.55-5-01', cleanCode: '0155501', description: 'Criação de frangos para corte', riskDegree: 3, division: '01', sector: 'AGROPECUÁRIA' },
  { code: '02.10-1-01', cleanCode: '0210101', description: 'Cultivo de eucalipto', riskDegree: 3, division: '02', sector: 'AGROPECUÁRIA' },
  { code: '02.20-9-01', cleanCode: '0220901', description: 'Extração de madeira em florestas nativas', riskDegree: 4, division: '02', sector: 'AGROPECUÁRIA' },
  { code: '03.11-6-01', cleanCode: '0311601', description: 'Pesca de peixes em água salgada', riskDegree: 3, division: '03', sector: 'AGROPECUÁRIA' },

  // INDÚSTRIAS EXTRATIVAS (Divisões 05 a 09) - Grau de Risco 4 Máximo
  { code: '05.00-3-01', cleanCode: '0500301', description: 'Extração de carvão mineral', riskDegree: 4, division: '05', sector: 'INDÚSTRIA EXTRATIVA' },
  { code: '06.00-0-01', cleanCode: '0600001', description: 'Extração de petróleo e gás natural', riskDegree: 4, division: '06', sector: 'INDÚSTRIA EXTRATIVA' },
  { code: '07.10-3-01', cleanCode: '0710301', description: 'Extração de minério de ferro', riskDegree: 4, division: '07', sector: 'INDÚSTRIA EXTRATIVA' },
  { code: '07.21-9-00', cleanCode: '0721900', description: 'Extração de minério de alumínio (Bauxita)', riskDegree: 4, division: '07', sector: 'INDÚSTRIA EXTRATIVA' },
  { code: '07.24-3-01', cleanCode: '0724301', description: 'Extração de minério de ouro', riskDegree: 4, division: '07', sector: 'INDÚSTRIA EXTRATIVA' },
  { code: '08.10-0-02', cleanCode: '0810002', description: 'Extração de granito e beneficiamento associado', riskDegree: 4, division: '08', sector: 'INDÚSTRIA EXTRATIVA' },
  { code: '08.10-0-06', cleanCode: '0810006', description: 'Extração de areia, cascalho ou pedregulho', riskDegree: 4, division: '08', sector: 'INDÚSTRIA EXTRATIVA' },
  { code: '08.10-0-07', cleanCode: '0810007', description: 'Extração de argila e beneficiamento associado', riskDegree: 4, division: '08', sector: 'INDÚSTRIA EXTRATIVA' },
  { code: '09.10-6-00', cleanCode: '0910600', description: 'Atividades de apoio à extração de petróleo e gás natural', riskDegree: 4, division: '09', sector: 'INDÚSTRIA EXTRATIVA' },

  // INDÚSTRIAS DE TRANSFORMAÇÃO (Divisões 10 a 33)
  { code: '10.11-2-01', cleanCode: '1011201', description: 'Frigorífico - abate de bovinos', riskDegree: 3, division: '10', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '10.12-1-01', cleanCode: '1012101', description: 'Abate de aves', riskDegree: 3, division: '10', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '10.31-7-00', cleanCode: '1031700', description: 'Fabricação de conservas de frutas', riskDegree: 3, division: '10', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '10.41-4-00', cleanCode: '1041400', description: 'Fabricação de óleos vegetais em bruto', riskDegree: 3, division: '10', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '10.51-1-00', cleanCode: '1051100', description: 'Preparação do leite e laticínios', riskDegree: 3, division: '10', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '10.61-9-01', cleanCode: '1061901', description: 'Beneficiamento de arroz', riskDegree: 3, division: '10', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '10.71-6-00', cleanCode: '1071600', description: 'Fabricação de açúcar em bruto', riskDegree: 3, division: '10', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '10.91-1-01', cleanCode: '1091101', description: 'Fabricação de produtos de panificação industrial', riskDegree: 3, division: '10', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '11.11-9-01', cleanCode: '1111901', description: 'Fabricação de aguardente de cana-de-açúcar', riskDegree: 3, division: '11', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '11.13-5-02', cleanCode: '1113502', description: 'Fabricação de cervejas e chopes', riskDegree: 3, division: '11', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '11.22-4-01', cleanCode: '1122401', description: 'Fabricação de refrigerantes', riskDegree: 3, division: '11', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '13.11-1-00', cleanCode: '1311100', description: 'Preparação e fiação de fibras de algodão', riskDegree: 3, division: '13', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '13.51-1-00', cleanCode: '1351100', description: 'Fabricação de artefatos têxteis para uso doméstico', riskDegree: 2, division: '13', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '14.12-6-01', cleanCode: '1412601', description: 'Confecção de peças do vestuário, exceto roupas íntimas', riskDegree: 2, division: '14', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '15.31-9-01', cleanCode: '1531901', description: 'Fabricação de calçados de couro', riskDegree: 3, division: '15', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '16.10-2-01', cleanCode: '1610201', description: 'Serrarias com desdobramento de madeira em bruto', riskDegree: 3, division: '16', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '17.10-9-00', cleanCode: '1710900', description: 'Fabricação de celulose e outras pastas para fabricação de papel', riskDegree: 3, division: '17', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '17.21-4-00', cleanCode: '1721400', description: 'Fabricação de papel', riskDegree: 3, division: '17', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '18.11-3-02', cleanCode: '1811302', description: 'Impressão de livros, revistas e outras publicações periódicas', riskDegree: 3, division: '18', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '19.21-7-00', cleanCode: '1921700', description: 'Fabricação de produtos do refino de petróleo', riskDegree: 4, division: '19', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '19.31-4-00', cleanCode: '1931400', description: 'Fabricação de álcool (Etanol)', riskDegree: 3, division: '19', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '20.13-4-00', cleanCode: '2013400', description: 'Fabricação de adubos e fertilizantes', riskDegree: 3, division: '20', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '20.21-5-00', cleanCode: '2021500', description: 'Fabricação de produtos químicos orgânicos', riskDegree: 3, division: '20', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '20.92-4-01', cleanCode: '2092401', description: 'Fabricação de pólvoras, explosivos e detonantes', riskDegree: 4, division: '20', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '21.21-1-01', cleanCode: '2121101', description: 'Fabricação de medicamentos alopáticos para uso humano', riskDegree: 3, division: '21', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '22.11-1-00', cleanCode: '2211100', description: 'Fabricação de pneumáticos e de câmaras-de-ar', riskDegree: 3, division: '22', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '22.22-6-00', cleanCode: '2222600', description: 'Fabricação de embalagens de material plástico', riskDegree: 3, division: '22', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '23.11-7-00', cleanCode: '2311700', description: 'Fabricação de vidro plano e de segurança', riskDegree: 3, division: '23', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '23.20-6-00', cleanCode: '2320600', description: 'Fabricação de cimento', riskDegree: 4, division: '23', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '23.41-9-00', cleanCode: '2341900', description: 'Fabricação de produtos cerâmicos refratários', riskDegree: 4, division: '23', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '24.11-3-00', cleanCode: '2411300', description: 'Produção de ferro-gusa', riskDegree: 4, division: '24', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '24.21-1-00', cleanCode: '2421100', description: 'Produção de semi-acabados de aço', riskDegree: 4, division: '24', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '24.41-5-01', cleanCode: '2441501', description: 'Produção de alumínio e suas ligas em formas primárias', riskDegree: 4, division: '24', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '24.51-2-00', cleanCode: '2451200', description: 'Fundição de ferro e aço', riskDegree: 4, division: '24', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '25.11-0-00', cleanCode: '2511000', description: 'Fabricação de estruturas metálicas', riskDegree: 4, division: '25', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '25.12-8-00', cleanCode: '2512800', description: 'Fabricação de esquadrias de metal', riskDegree: 3, division: '25', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '25.39-0-01', cleanCode: '2539001', description: 'Serviços de usinagem, torneamento e solda', riskDegree: 3, division: '25', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '25.43-8-00', cleanCode: '2543800', description: 'Fabricação de ferramentas', riskDegree: 3, division: '25', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '28.11-9-00', cleanCode: '2811900', description: 'Fabricação de motores e turbinas, exceto para aviões e veículos', riskDegree: 3, division: '28', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '28.22-4-02', cleanCode: '2822402', description: 'Fabricação de máquinas, equipamentos e aparelhos para transporte e elevação de cargas', riskDegree: 3, division: '28', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '29.10-7-01', cleanCode: '2910701', description: 'Fabricação de automóveis, camionetas e utilitários', riskDegree: 3, division: '29', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '29.20-4-01', cleanCode: '2920401', description: 'Fabricação de caminhões e ônibus', riskDegree: 3, division: '29', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '30.41-5-00', cleanCode: '3041500', description: 'Fabricação de aeronaves', riskDegree: 3, division: '30', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '31.01-2-00', cleanCode: '3101200', description: 'Fabricação de móveis com predominância de madeira', riskDegree: 3, division: '31', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '33.11-2-00', cleanCode: '3311200', description: 'Manutenção e reparação de tanques, reservatórios metálicos e caldeiras', riskDegree: 3, division: '33', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },
  { code: '33.14-7-02', cleanCode: '3314702', description: 'Manutenção e reparação de equipamentos hidráulicos e pneumáticos', riskDegree: 3, division: '33', sector: 'INDÚSTRIA DE TRANSFORMAÇÃO' },

  // ELETRICIDADE, GÁS, ÁGUA E ESGOTO (Divisões 35 a 39)
  { code: '35.11-5-01', cleanCode: '3511501', description: 'Geração de energia elétrica', riskDegree: 4, division: '35', sector: 'ELETRICIDADE & GÁS' },
  { code: '35.12-3-00', cleanCode: '3512300', description: 'Transmissão de energia elétrica', riskDegree: 4, division: '35', sector: 'ELETRICIDADE & GÁS' },
  { code: '35.14-0-00', cleanCode: '3514000', description: 'Distribuição de energia elétrica', riskDegree: 4, division: '35', sector: 'ELETRICIDADE & GÁS' },
  { code: '35.20-4-01', cleanCode: '3520401', description: 'Produção de gás; processamento de gás natural', riskDegree: 4, division: '35', sector: 'ELETRICIDADE & GÁS' },
  { code: '36.00-6-01', cleanCode: '3600601', description: 'Captação, tratamento e distribuição de água', riskDegree: 3, division: '36', sector: 'ÁGUA & ESGOTO' },
  { code: '37.01-1-00', cleanCode: '3701100', description: 'Gestão de redes de esgoto', riskDegree: 3, division: '37', sector: 'ÁGUA & ESGOTO' },
  { code: '38.11-4-00', cleanCode: '3811400', description: 'Coleta de resíduos não-perigosos', riskDegree: 3, division: '38', sector: 'ÁGUA & ESGOTO' },
  { code: '38.12-2-00', cleanCode: '3812200', description: 'Coleta de resíduos perigosos', riskDegree: 4, division: '38', sector: 'ÁGUA & ESGOTO' },
  { code: '38.21-1-00', cleanCode: '3821100', description: 'Tratamento e disposição de resíduos não-perigosos (Aterros)', riskDegree: 3, division: '38', sector: 'ÁGUA & ESGOTO' },
  { code: '38.22-0-00', cleanCode: '3822000', description: 'Tratamento e disposição de resíduos perigosos', riskDegree: 4, division: '38', sector: 'ÁGUA & ESGOTO' },

  // CONSTRUÇÃO CIVIL (Divisões 41 a 43) - CNO / CNPJ - Risco 3 a 4
  { code: '41.10-7-00', cleanCode: '4110700', description: 'Incorporação de empreendimentos imobiliários', riskDegree: 1, division: '41', sector: 'CONSTRUÇÃO CIVIL' },
  { code: '41.20-4-00', cleanCode: '4120400', description: 'Construção de edifícios (Residencial e Comercial)', riskDegree: 3, division: '41', sector: 'CONSTRUÇÃO CIVIL', sesmtObs: 'Exige CNO e conformidade estrita com NR-18 e NR-35.' },
  { code: '42.11-1-01', cleanCode: '4211101', description: 'Construção de rodovias e ferrovias', riskDegree: 4, division: '42', sector: 'CONSTRUÇÃO CIVIL' },
  { code: '42.12-0-00', cleanCode: '4212000', description: 'Construção de obras-de-arte especiais (Pontes, Viadutos e Túneis)', riskDegree: 4, division: '42', sector: 'CONSTRUÇÃO CIVIL' },
  { code: '42.13-8-00', cleanCode: '4213800', description: 'Obras de urbanização - ruas, praças e calçadas', riskDegree: 3, division: '42', sector: 'CONSTRUÇÃO CIVIL' },
  { code: '42.21-9-01', cleanCode: '4221901', description: 'Construção de barragens e represas para geração de energia', riskDegree: 4, division: '42', sector: 'CONSTRUÇÃO CIVIL' },
  { code: '42.21-9-02', cleanCode: '4221902', description: 'Construção de redes de distribuição de energia elétrica', riskDegree: 4, division: '42', sector: 'CONSTRUÇÃO CIVIL' },
  { code: '42.91-0-00', cleanCode: '4291000', description: 'Obras portuárias, marítimas e fluviais', riskDegree: 4, division: '42', sector: 'CONSTRUÇÃO CIVIL' },
  { code: '43.11-8-01', cleanCode: '4311801', description: 'Demolição de edifícios e outras estruturas', riskDegree: 4, division: '43', sector: 'CONSTRUÇÃO CIVIL' },
  { code: '43.12-6-00', cleanCode: '4312600', description: 'Perfurações e sondagens para construção', riskDegree: 4, division: '43', sector: 'CONSTRUÇÃO CIVIL' },
  { code: '43.13-4-00', cleanCode: '4313400', description: 'Obras de terraplenagem', riskDegree: 3, division: '43', sector: 'CONSTRUÇÃO CIVIL' },
  { code: '43.21-5-00', cleanCode: '4321500', description: 'Instalação e manutenção elétrica', riskDegree: 3, division: '43', sector: 'CONSTRUÇÃO CIVIL' },
  { code: '43.22-3-01', cleanCode: '4322301', description: 'Instalações hidráulicas, sanitárias e de gás', riskDegree: 3, division: '43', sector: 'CONSTRUÇÃO CIVIL' },
  { code: '43.91-6-00', cleanCode: '4391600', description: 'Obras de fundações para construção', riskDegree: 4, division: '43', sector: 'CONSTRUÇÃO CIVIL' },
  { code: '43.99-1-01', cleanCode: '4399101', description: 'Administração de obras de construção civil', riskDegree: 2, division: '43', sector: 'CONSTRUÇÃO CIVIL' },

  // COMÉRCIO POR ATACADO E VAREJO (Divisões 45 a 47) - Grau de Risco 1 a 2 (ou 3 em combustíveis)
  { code: '45.11-1-01', cleanCode: '4511101', description: 'Comércio a varejo de automóveis, camionetas e utilitários novos', riskDegree: 1, division: '45', sector: 'COMÉRCIO' },
  { code: '45.20-0-01', cleanCode: '4520001', description: 'Serviços de manutenção e reparação mecânica de veículos automotores', riskDegree: 3, division: '45', sector: 'COMÉRCIO' },
  { code: '45.20-0-02', cleanCode: '4520002', description: 'Serviços de lanternagem ou funilaria e pintura de veículos', riskDegree: 3, division: '45', sector: 'COMÉRCIO' },
  { code: '46.11-7-00', cleanCode: '4611700', description: 'Representantes comerciais e agentes do comércio de matérias-primas agrícolas', riskDegree: 1, division: '46', sector: 'COMÉRCIO' },
  { code: '46.39-7-01', cleanCode: '4639701', description: 'Comércio atacadista de produtos alimentícios em geral', riskDegree: 2, division: '46', sector: 'COMÉRCIO' },
  { code: '46.71-1-00', cleanCode: '4671100', description: 'Comércio atacadista de madeira e produtos derivados', riskDegree: 3, division: '46', sector: 'COMÉRCIO' },
  { code: '46.79-6-01', cleanCode: '4679601', description: 'Comércio atacadista de tintas, vernizes e similares', riskDegree: 3, division: '46', sector: 'COMÉRCIO' },
  { code: '46.81-8-01', cleanCode: '4681801', description: 'Comércio atacadista de álcool carburante, biodiesel e gasolina', riskDegree: 3, division: '46', sector: 'COMÉRCIO' },
  { code: '47.11-3-01', cleanCode: '4711301', description: 'Comércio varejista de mercadorias em geral - hipermercados', riskDegree: 2, division: '47', sector: 'COMÉRCIO' },
  { code: '47.11-3-02', cleanCode: '4711302', description: 'Comércio varejista de mercadorias em geral - supermercados', riskDegree: 2, division: '47', sector: 'COMÉRCIO' },
  { code: '47.21-1-02', cleanCode: '4721102', description: 'Padaria e confeitaria com predominância de revenda', riskDegree: 2, division: '47', sector: 'COMÉRCIO' },
  { code: '47.31-8-00', cleanCode: '4731800', description: 'Comércio varejista de combustíveis para veículos automotores (Posto de Gasolina)', riskDegree: 3, division: '47', sector: 'COMÉRCIO', sesmtObs: 'Enquadramento obrigatório na NR-20 (Inflamáveis e Combustíveis).' },
  { code: '47.44-0-99', cleanCode: '4744099', description: 'Comércio varejista de materiais de construção em geral', riskDegree: 2, division: '47', sector: 'COMÉRCIO' },
  { code: '47.71-7-01', cleanCode: '4771701', description: 'Comércio varejista de produtos farmacêuticos (Farmácia)', riskDegree: 2, division: '47', sector: 'COMÉRCIO' },
  { code: '47.81-4-00', cleanCode: '4781400', description: 'Comércio varejista de artigos do vestuário e acessórios', riskDegree: 1, division: '47', sector: 'COMÉRCIO' },

  // TRANSPORTE, ARMAZENAGEM E CORREIO (Divisões 49 a 53)
  { code: '49.11-6-00', cleanCode: '4911600', description: 'Transporte ferroviário de carga', riskDegree: 3, division: '49', sector: 'TRANSPORTE & LOGÍSTICA' },
  { code: '49.21-3-01', cleanCode: '4921301', description: 'Transporte rodoviário coletivo de passageiros - urbano', riskDegree: 3, division: '49', sector: 'TRANSPORTE & LOGÍSTICA' },
  { code: '49.30-2-01', cleanCode: '4930201', description: 'Transporte rodoviário de carga municipal', riskDegree: 3, division: '49', sector: 'TRANSPORTE & LOGÍSTICA' },
  { code: '49.30-2-02', cleanCode: '4930202', description: 'Transporte rodoviário de carga intermunicipal e interestadual', riskDegree: 3, division: '49', sector: 'TRANSPORTE & LOGÍSTICA' },
  { code: '49.30-2-03', cleanCode: '4930203', description: 'Transporte rodoviário de produtos perigosos', riskDegree: 4, division: '49', sector: 'TRANSPORTE & LOGÍSTICA' },
  { code: '50.11-4-01', cleanCode: '5011401', description: 'Transporte marítimo de cabotagem - Carga', riskDegree: 3, division: '50', sector: 'TRANSPORTE & LOGÍSTICA' },
  { code: '51.12-9-01', cleanCode: '5112901', description: 'Serviço de táxi aéreo e locação de aeronaves com tripulação', riskDegree: 3, division: '51', sector: 'TRANSPORTE & LOGÍSTICA' },
  { code: '52.11-7-99', cleanCode: '5211799', description: 'Depósitos de mercadorias para terceiros (Armazéns Gerais)', riskDegree: 3, division: '52', sector: 'TRANSPORTE & LOGÍSTICA' },
  { code: '52.12-5-00', cleanCode: '5212500', description: 'Carga e descarga', riskDegree: 3, division: '52', sector: 'TRANSPORTE & LOGÍSTICA' },
  { code: '53.10-5-01', cleanCode: '5310501', description: 'Atividades do Correio Nacional', riskDegree: 2, division: '53', sector: 'TRANSPORTE & LOGÍSTICA' },
  { code: '53.20-2-02', cleanCode: '5320202', description: 'Serviços de entrega rápida (Motoboy / Entregadores)', riskDegree: 3, division: '53', sector: 'TRANSPORTE & LOGÍSTICA' },

  // ALOJAMENTO E ALIMENTAÇÃO (Divisões 55 e 56)
  { code: '55.10-8-01', cleanCode: '5510801', description: 'Hotéis', riskDegree: 2, division: '55', sector: 'SERVIÇOS & SAÚDE' },
  { code: '56.11-2-01', cleanCode: '5611201', description: 'Restaurantes e similares', riskDegree: 2, division: '56', sector: 'SERVIÇOS & SAÚDE' },
  { code: '56.11-2-03', cleanCode: '5611203', description: 'Lanchonetes, casas de chá, de sucos e similares', riskDegree: 2, division: '56', sector: 'SERVIÇOS & SAÚDE' },
  { code: '56.20-1-01', cleanCode: '5620101', description: 'Fornecimento de alimentos preparados preponderantemente para empresas (Refeições Coletivas)', riskDegree: 3, division: '56', sector: 'SERVIÇOS & SAÚDE' },

  // INFORMAÇÃO E COMUNICAÇÃO (Divisões 58 a 63) - Risco 1 a 2
  { code: '61.10-8-01', cleanCode: '6110801', description: 'Serviços de telefonia fixa comutada', riskDegree: 2, division: '61', sector: 'SERVIÇOS & SAÚDE' },
  { code: '62.01-5-01', cleanCode: '6201501', description: 'Desenvolvimento de programas de computador sob encomenda (Software)', riskDegree: 1, division: '62', sector: 'SERVIÇOS & SAÚDE' },
  { code: '62.02-3-00', cleanCode: '6202300', description: 'Desenvolvimento e licenciamento de programas customizáveis', riskDegree: 1, division: '62', sector: 'SERVIÇOS & SAÚDE' },
  { code: '62.09-1-00', cleanCode: '6209100', description: 'Suporte técnico, manutenção e outros serviços em TI', riskDegree: 1, division: '62', sector: 'SERVIÇOS & SAÚDE' },
  { code: '63.11-9-00', cleanCode: '6311900', description: 'Tratamento de dados, provedores de serviços de aplicação e hospedagem (Data Center)', riskDegree: 2, division: '63', sector: 'SERVIÇOS & SAÚDE' },

  // ATIVIDADES FINANCEIRAS, DE SEGUROS E IMOBILIÁRIAS (Divisões 64 a 68) - Risco 1
  { code: '64.21-2-00', cleanCode: '6421200', description: 'Bancos comerciais', riskDegree: 1, division: '64', sector: 'SERVIÇOS & SAÚDE' },
  { code: '65.11-1-01', cleanCode: '6511101', description: 'Seguros de vida', riskDegree: 1, division: '65', sector: 'SERVIÇOS & SAÚDE' },
  { code: '68.10-2-01', cleanCode: '6810201', description: 'Compra e venda de imóveis próprios', riskDegree: 1, division: '68', sector: 'SERVIÇOS & SAÚDE' },
  { code: '68.22-6-00', cleanCode: '6822600', description: 'Gestão e administração da propriedade imobiliária', riskDegree: 1, division: '68', sector: 'SERVIÇOS & SAÚDE' },

  // SERVIÇOS PROFISSIONAIS, CIENTÍFICOS E TÉCNICOS (Divisões 69 a 75)
  { code: '69.11-7-01', cleanCode: '6911701', description: 'Serviços advocatícios', riskDegree: 1, division: '69', sector: 'SERVIÇOS & SAÚDE' },
  { code: '69.20-6-01', cleanCode: '6920601', description: 'Atividades de contabilidade', riskDegree: 1, division: '69', sector: 'SERVIÇOS & SAÚDE' },
  { code: '70.20-4-00', cleanCode: '7020400', description: 'Atividades de consultoria em gestão empresarial', riskDegree: 1, division: '70', sector: 'SERVIÇOS & SAÚDE' },
  { code: '71.12-0-00', cleanCode: '7112000', description: 'Serviços de engenharia', riskDegree: 1, division: '71', sector: 'SERVIÇOS & SAÚDE' },
  { code: '71.19-7-04', cleanCode: '7119704', description: 'Serviços de perícia técnica relacionados à segurança do trabalho (SST)', riskDegree: 1, division: '71', sector: 'SERVIÇOS & SAÚDE' },
  { code: '71.20-1-00', cleanCode: '7120100', description: 'Testes e análises técnicas (Laboratórios Industriais)', riskDegree: 2, division: '71', sector: 'SERVIÇOS & SAÚDE' },
  { code: '75.00-1-00', cleanCode: '7500100', description: 'Atividades veterinárias', riskDegree: 3, division: '75', sector: 'SERVIÇOS & SAÚDE' },

  // SERVIÇOS ADMINISTRATIVOS E COMPLEMENTARES (Divisões 77 a 82)
  { code: '78.20-5-00', cleanCode: '7820500', description: 'Locação de mão-de-obra temporária', riskDegree: 2, division: '78', sector: 'SERVIÇOS & SAÚDE' },
  { code: '80.11-1-01', cleanCode: '8011101', description: 'Atividades de vigilância e segurança privada', riskDegree: 3, division: '80', sector: 'SERVIÇOS & SAÚDE', sesmtObs: 'Exige atenção ao porte de arma de fogo e periculosidade (NR-16).' },
  { code: '81.21-4-00', cleanCode: '8121400', description: 'Limpeza em prédios e em domicílios', riskDegree: 3, division: '81', sector: 'SERVIÇOS & SAÚDE' },
  { code: '81.22-2-00', cleanCode: '8122200', description: 'Imunização e controle de pragas urbanas (Dedetização)', riskDegree: 3, division: '81', sector: 'SERVIÇOS & SAÚDE' },
  { code: '82.20-2-00', cleanCode: '8220200', description: 'Atividades de teleatendimento (Call Center / Telemarketing)', riskDegree: 2, division: '82', sector: 'SERVIÇOS & SAÚDE', sesmtObs: 'Enquadramento específico no Anexo II da NR-17 (Ergonomia).' },

  // ADMINISTRAÇÃO PÚBLICA, DEFESA E SEGURIDADE SOCIAL (Divisão 84)
  { code: '84.11-6-00', cleanCode: '8411600', description: 'Administração pública em geral', riskDegree: 1, division: '84', sector: 'OUTROS' },
  { code: '84.24-8-00', cleanCode: '8424800', description: 'Segurança e ordem pública (Polícia Civil e Militar)', riskDegree: 3, division: '84', sector: 'OUTROS' },
  { code: '84.25-6-00', cleanCode: '8425600', description: 'Defesa Civil e Corpo de Bombeiros', riskDegree: 4, division: '84', sector: 'OUTROS' },

  // EDUCAÇÃO (Divisão 85) - Risco 1 a 2
  { code: '85.11-2-00', cleanCode: '8511200', description: 'Educação infantil - creche', riskDegree: 2, division: '85', sector: 'SERVIÇOS & SAÚDE' },
  { code: '85.13-9-00', cleanCode: '8513900', description: 'Ensino fundamental', riskDegree: 2, division: '85', sector: 'SERVIÇOS & SAÚDE' },
  { code: '85.20-1-00', cleanCode: '8520100', description: 'Ensino médio', riskDegree: 2, division: '85', sector: 'SERVIÇOS & SAÚDE' },
  { code: '85.31-7-00', cleanCode: '8531700', description: 'Educação superior - graduação', riskDegree: 2, division: '85', sector: 'SERVIÇOS & SAÚDE' },

  // SAÚDE HUMANA E SERVIÇOS SOCIAIS (Divisões 86 a 88) - Risco 3
  { code: '86.10-1-01', cleanCode: '8610101', description: 'Atividades de atendimento hospitalar, exceto pronto-socorro e UTI', riskDegree: 3, division: '86', sector: 'SERVIÇOS & SAÚDE', sesmtObs: 'Obrigatório cumprimento rigoroso da NR-32 (Segurança em Saúde).' },
  { code: '86.10-1-02', cleanCode: '8610102', description: 'Atividades de atendimento em pronto-socorro e unidades para urgências', riskDegree: 3, division: '86', sector: 'SERVIÇOS & SAÚDE' },
  { code: '86.30-5-01', cleanCode: '8630501', description: 'Atividade médica ambulatorial com recursos para realização de procedimentos cirúrgicos', riskDegree: 3, division: '86', sector: 'SERVIÇOS & SAÚDE' },
  { code: '86.30-5-03', cleanCode: '8630503', description: 'Atividade médica ambulatorial restrita a consultas', riskDegree: 1, division: '86', sector: 'SERVIÇOS & SAÚDE' },
  { code: '86.30-5-04', cleanCode: '8630504', description: 'Atividade odontológica', riskDegree: 3, division: '86', sector: 'SERVIÇOS & SAÚDE' },
  { code: '86.40-2-01', cleanCode: '8640201', description: 'Laboratórios de anatomia patológica e citológica', riskDegree: 3, division: '86', sector: 'SERVIÇOS & SAÚDE' },
  { code: '86.40-2-05', cleanCode: '8640205', description: 'Serviços de diagnóstico por imagem com radiação (Raios X, Tomografia)', riskDegree: 3, division: '86', sector: 'SERVIÇOS & SAÚDE', sesmtObs: 'Exige controle radiológico e dosimetria individual (CNEN / NR-32).' },
  { code: '86.90-9-03', cleanCode: '8690903', description: 'Atividades de fisioterapia', riskDegree: 1, division: '86', sector: 'SERVIÇOS & SAÚDE' },

  // OUTRAS ATIVIDADES DE SERVIÇOS (Divisões 94 a 96)
  { code: '94.11-1-00', cleanCode: '9411100', description: 'Atividades de organizações associativas patronais e empresariais', riskDegree: 1, division: '94', sector: 'OUTROS' },
  { code: '94.20-1-00', cleanCode: '9420100', description: 'Atividades de organizações sindicais', riskDegree: 1, division: '94', sector: 'OUTROS' },
  { code: '96.01-7-01', cleanCode: '9601701', description: 'Lavanderias e tinturarias industriais', riskDegree: 3, division: '96', sector: 'SERVIÇOS & SAÚDE' },
  { code: '96.02-5-01', cleanCode: '9602501', description: 'Cabeleireiros, manicure e pedicure', riskDegree: 1, division: '96', sector: 'SERVIÇOS & SAÚDE' },
  { code: '96.03-3-04', cleanCode: '9603304', description: 'Serviços de sepultamento e cremação', riskDegree: 3, division: '96', sector: 'SERVIÇOS & SAÚDE' }
];

/**
 * Mapeamento por Divisão Genérica da CNAE (Fallback de Grau de Risco se CNAE não estiver na lista explícita)
 */
const DIVISION_RISK_MAP: Record<string, { riskDegree: 1 | 2 | 3 | 4; name: string }> = {
  '01': { riskDegree: 3, name: 'Agricultura, Pecuária e Serviços Relacionados' },
  '02': { riskDegree: 3, name: 'Produção Florestal' },
  '03': { riskDegree: 3, name: 'Pesca e Aquicultura' },
  '05': { riskDegree: 4, name: 'Extração de Carvão Mineral' },
  '06': { riskDegree: 4, name: 'Extração de Petróleo e Gás Natural' },
  '07': { riskDegree: 4, name: 'Extração de Minerais Metálicos' },
  '08': { riskDegree: 4, name: 'Extração de Minerais Não-Metálicos' },
  '09': { riskDegree: 4, name: 'Atividades de Apoio à Extração de Minerais' },
  '10': { riskDegree: 3, name: 'Fabricação de Produtos Alimentícios' },
  '11': { riskDegree: 3, name: 'Fabricação de Bebidas' },
  '12': { riskDegree: 3, name: 'Fabricação de Produtos do Fumo' },
  '13': { riskDegree: 3, name: 'Fabricação de Produtos Têxteis' },
  '14': { riskDegree: 2, name: 'Confecção de Artigos do Vestuário' },
  '15': { riskDegree: 3, name: 'Preparação de Couros e Calçados' },
  '16': { riskDegree: 3, name: 'Fabricação de Produtos de Madeira' },
  '17': { riskDegree: 3, name: 'Fabricação de Celulose e Papel' },
  '18': { riskDegree: 3, name: 'Impressão e Reprodução de Gravações' },
  '19': { riskDegree: 4, name: 'Fabricação de Coque, Derivados de Petróleo e Biocombustíveis' },
  '20': { riskDegree: 3, name: 'Fabricação de Produtos Químicos' },
  '21': { riskDegree: 3, name: 'Fabricação de Produtos Farmoquímicos e Farmacêuticos' },
  '22': { riskDegree: 3, name: 'Fabricação de Produtos de Borracha e Material Plástico' },
  '23': { riskDegree: 4, name: 'Fabricação de Produtos de Minerais Não-Metálicos' },
  '24': { riskDegree: 4, name: 'Metalurgia' },
  '25': { riskDegree: 4, name: 'Fabricação de Produtos de Metal, exceto Máquinas' },
  '26': { riskDegree: 3, name: 'Fabricação de Equipamentos de Informática e Eletrônicos' },
  '27': { riskDegree: 3, name: 'Fabricação de Máquinas, Aparelhos e Materiais Elétricos' },
  '28': { riskDegree: 3, name: 'Fabricação de Máquinas e Equipamentos' },
  '29': { riskDegree: 3, name: 'Fabricação de Veículos Automotores' },
  '30': { riskDegree: 3, name: 'Fabricação de Outros Equipamentos de Transporte' },
  '31': { riskDegree: 3, name: 'Fabricação de Móveis' },
  '32': { riskDegree: 3, name: 'Fabricação de Produtos Diversos' },
  '33': { riskDegree: 3, name: 'Manutenção, Reparação e Instalação de Máquinas e Equipamentos' },
  '35': { riskDegree: 4, name: 'Eletricidade, Gás e Outras Utilidades' },
  '36': { riskDegree: 3, name: 'Captação, Tratamento e Distribuição de Água' },
  '37': { riskDegree: 3, name: 'Esgoto e Atividades Relacionadas' },
  '38': { riskDegree: 3, name: 'Coleta, Tratamento e Disposição de Resíduos' },
  '39': { riskDegree: 3, name: 'Descontaminação e Gestão de Resíduos' },
  '41': { riskDegree: 3, name: 'Construção de Edifícios' },
  '42': { riskDegree: 4, name: 'Obras de Infraestrutura' },
  '43': { riskDegree: 3, name: 'Serviços Especializados para Construção' },
  '45': { riskDegree: 2, name: 'Comércio e Reparação de Veículos Automotores' },
  '46': { riskDegree: 2, name: 'Comércio por Atacado' },
  '47': { riskDegree: 2, name: 'Comércio Varejista' },
  '49': { riskDegree: 3, name: 'Transporte Terrestre' },
  '50': { riskDegree: 3, name: 'Transporte Aquaviário' },
  '51': { riskDegree: 3, name: 'Transporte Aéreo' },
  '52': { riskDegree: 3, name: 'Armazenamento e Atividades Auxiliares dos Transportes' },
  '53': { riskDegree: 2, name: 'Correio e Outras Atividades de Entrega' },
  '55': { riskDegree: 2, name: 'Alojamento' },
  '56': { riskDegree: 2, name: 'Alimentação' },
  '58': { riskDegree: 2, name: 'Edição e Edição Integrada à Impressão' },
  '59': { riskDegree: 2, name: 'Atividades Cinematográficas e de Produção de Vídeo' },
  '60': { riskDegree: 1, name: 'Atividades de Rádio e de Televisão' },
  '61': { riskDegree: 2, name: 'Telecomunicações' },
  '62': { riskDegree: 1, name: 'Atividades dos Serviços de Tecnologia da Informação' },
  '63': { riskDegree: 1, name: 'Atividades de Prestação de Serviços de Informação' },
  '64': { riskDegree: 1, name: 'Atividades de Serviços Financeiros' },
  '65': { riskDegree: 1, name: 'Seguros, Resseguros, Previdência Complementar' },
  '66': { riskDegree: 1, name: 'Atividades Auxiliares dos Serviços Financeiros' },
  '68': { riskDegree: 1, name: 'Atividades Imobiliárias' },
  '69': { riskDegree: 1, name: 'Atividades Jurídicas, de Contabilidade e de Auditoria' },
  '70': { riskDegree: 1, name: 'Atividades de Sedes de Empresas e Consultoria' },
  '71': { riskDegree: 1, name: 'Serviços de Arquitetura e Engenharia; Testes e Análises' },
  '72': { riskDegree: 2, name: 'Pesquisa e Desenvolvimento Científico' },
  '73': { riskDegree: 1, name: 'Publicidade e Pesquisa de Mercado' },
  '74': { riskDegree: 1, name: 'Outras Atividades Profissionais, Científicas e Técnicas' },
  '75': { riskDegree: 3, name: 'Atividades Veterinárias' },
  '77': { riskDegree: 1, name: 'Aluguéis Não-Imobiliários e Gestão de Ativos Intangíveis' },
  '78': { riskDegree: 2, name: 'Seleção, Agenciamento e Locação de Mão-de-Obra' },
  '79': { riskDegree: 1, name: 'Agências de Viagens, Operadores Turísticos' },
  '80': { riskDegree: 3, name: 'Atividades de Vigilância, Segurança Privada e Investigação' },
  '81': { riskDegree: 3, name: 'Serviços para Edifícios e Atividades Paisagísticas' },
  '82': { riskDegree: 1, name: 'Serviços de Escritório, de Apoio Administrativo' },
  '84': { riskDegree: 1, name: 'Administração Pública, Defesa e Seguridade Social' },
  '85': { riskDegree: 2, name: 'Educação' },
  '86': { riskDegree: 3, name: 'Atividades de Atenção à Saúde Humana' },
  '87': { riskDegree: 2, name: 'Atividades de Atenção à Saúde Integradas com Assistência Social' },
  '88': { riskDegree: 1, name: 'Serviços de Assistência Social Sem Alojamento' },
  '90': { riskDegree: 1, name: 'Atividades Artísticas, Criativas e de Espetáculos' },
  '91': { riskDegree: 1, name: 'Atividades Ligadas ao Patrimônio Cultural e Ambiental' },
  '92': { riskDegree: 1, name: 'Atividades de Exploração de Jogos de Azar' },
  '93': { riskDegree: 1, name: 'Atividades Esportivas e de Recreação e Lazer' },
  '94': { riskDegree: 1, name: 'Atividades de Organizações Associativas' },
  '95': { riskDegree: 2, name: 'Reparação e Manutenção de Equipamentos de Informática' },
  '96': { riskDegree: 2, name: 'Outras Atividades de Serviços Pessoais' }
};

/**
 * Limpa e formata qualquer entrada de CNAE
 */
export function formatCnaeCode(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 5) return raw.trim();

  // Se 7 dígitos: 25.11-0-00
  if (digits.length === 7) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}-${digits.slice(4, 5)}-${digits.slice(5, 7)}`;
  }
  // Se 5 dígitos: 25.11-0
  if (digits.length === 5) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}-${digits.slice(4, 5)}`;
  }
  return raw.trim();
}

/**
 * Consulta oficial de Grau de Risco por CNAE conforme NR-04 Quadro I
 */
/**
 * Consulta o grau de risco de um CNAE.
 *
 * Passou a ler exclusivamente do Anexo I oficial da NR-04 (lib/nr4AnexoI.ts).
 *
 * A versao anterior desta funcao tinha uma cadeia de aproximacoes: nao achando
 * o codigo de 7 digitos, procurava por prefixo de 5, depois chutava pela
 * divisao de 2 digitos e, por fim, assumia grau 2. Cada degrau dessa escada
 * devolvia um numero com cara de oficial que podia estar errado - foi assim
 * que a classe 86.50-0 (grau 2 no Anexo I) apareceu como grau 3.
 *
 * Agora: ou o CNAE consta na tabela oficial, ou `found` volta false e o grau
 * fica indefinido, para ser preenchido por quem tem habilitacao.
 */
export function lookupRiskDegreeByCnae(cnaeInput: string): {
  found: boolean;
  cnaeFormatted: string;
  cleanCode: string;
  description: string;
  /** null quando o CNAE nao consta no Anexo I. Nunca e estimado. */
  riskDegree: 1 | 2 | 3 | 4 | null;
  sector: string;
  legalBasis: string;
  sesmtNotes?: string;
} {
  const consulta = consultarGrauDeRisco(cnaeInput);
  const limpo = (cnaeInput || '').replace(/\D/g, '');

  if (!consulta.encontrado) {
    return {
      found: false,
      cnaeFormatted: limpo ? formatCnaeCode(limpo) : (cnaeInput || ''),
      cleanCode: limpo,
      description: consulta.classe
        ? 'CNAE não localizado no Anexo I da NR-04'
        : 'CNAE não informado',
      riskDegree: null,
      sector: 'NÃO CLASSIFICADO',
      legalBasis: consulta.fundamentacao,
    };
  }

  return {
    found: true,
    cnaeFormatted: limpo.length >= 7 ? formatCnaeCode(limpo) : formatarClasse(consulta.classe as string),
    cleanCode: limpo,
    description: consulta.denominacao as string,
    riskDegree: consulta.grau as 1 | 2 | 3 | 4,
    sector: setorDaClasse(consulta.classe as string),
    legalBasis: consulta.fundamentacao,
  };
}

/** Agrupamento apenas para exibicao; nao influencia o grau de risco. */
function setorDaClasse(classe: string): string {
  const divisao = Number(classe.slice(0, 2));
  if (divisao <= 3) return 'AGROPECUÁRIA';
  if (divisao <= 9) return 'INDÚSTRIA EXTRATIVA';
  if (divisao <= 33) return 'INDÚSTRIA DE TRANSFORMAÇÃO';
  if (divisao === 35) return 'ELETRICIDADE & GÁS';
  if (divisao <= 39) return 'ÁGUA & ESGOTO';
  if (divisao <= 43) return 'CONSTRUÇÃO CIVIL';
  if (divisao <= 47) return 'COMÉRCIO';
  if (divisao <= 53) return 'TRANSPORTE & LOGÍSTICA';
  if (divisao <= 63) return 'INFORMAÇÃO & COMUNICAÇÃO';
  if (divisao <= 82) return 'SERVIÇOS';
  if (divisao <= 88) return 'SERVIÇOS & SAÚDE';
  return 'OUTROS';
}

/**
 * Dimensionamento do SESMT pelo Anexo II da NR-04.
 *
 * A tabela deixou de ser digitada a mao neste arquivo: ela vive em
 * lib/nr4QuadroII.ts, transcrita do PDF oficial com a fundamentacao citada e
 * verificada por scripts/verificar-sesmt.mjs.
 *
 * Sem grau de risco ou sem numero de trabalhadores, a funcao NAO estima:
 * devolve status 'NAO_DIMENSIONADO' com todos os cargos zerados e uma
 * observacao dizendo o que falta informar.
 *
 * A CIPA nao e mais calculada aqui. Este arquivo tinha uma segunda formula de
 * CIPA (count/30 ou count/50) que nao vinha de norma nenhuma e discordava do
 * cipaService. O campo `cipa` abaixo delega a fonte unica: o Quadro I da
 * NR-05, em lib/nr5Quadros.ts.
 */
export function calculateSesmtDimensioning(
  riskDegree: 1 | 2 | 3 | 4 | null | undefined,
  employeeCount: number | null | undefined
): SesmtDimensioningResult {
  const anexoII = consultarAnexoII(riskDegree as any, employeeCount as any);
  const obs: string[] = [];

  const count =
    anexoII.trabalhadores === null ? 0 : anexoII.trabalhadores;

  const p = anexoII.profissionais;
  const tec = p ? p.tecnicoSegurancaTrabalho : 0;
  const eng = p ? p.engenheiroSegurancaTrabalho : 0;
  const auxEnf = p ? p.auxTecEnfermagemTrabalho : 0;
  const enf = p ? p.enfermeiroTrabalho : 0;
  const med = p ? p.medicoTrabalho : 0;

  if (anexoII.status === 'NAO_DIMENSIONADO') {
    obs.push(anexoII.fundamentacao);
  } else if (anexoII.status === 'DISPENSADO') {
    obs.push(anexoII.fundamentacao);
  } else {
    const partes: string[] = [];
    if (tec > 0) partes.push(`${tec} técnico(s) de segurança do trabalho`);
    if (eng > 0) partes.push(`${eng} engenheiro(s) de segurança do trabalho`);
    if (auxEnf > 0) partes.push(`${auxEnf} auxiliar(es)/técnico(s) em enfermagem do trabalho`);
    if (enf > 0) partes.push(`${enf} enfermeiro(s) do trabalho`);
    if (med > 0) partes.push(`${med} médico(s) do trabalho`);
    obs.push(`SESMT obrigatório: ${partes.join(', ')}.`);
    obs.push(anexoII.fundamentacao);
    for (const nota of anexoII.notas) obs.push(nota);
    if (count > 500) obs.push(OBSERVACAO_ESTABELECIMENTOS_DE_SAUDE);
  }

  // CIPA: fonte unica, sem formula paralela.
  const cipa = consultarQuadroI(riskDegree as any, employeeCount as any);
  obs.push(cipa.fundamentacao);

  return {
    riskDegree: (anexoII.grau ?? null) as 1 | 2 | 3 | 4,
    employeeCount: count,
    status: anexoII.status,
    tecnicoSeguranca: tec,
    engenheiroSeguranca: eng,
    auxiliarEnfermagem: auxEnf,
    enfermeiroTrabalho: enf,
    medicoTrabalho: med,
    legalBasis: anexoII.fundamentacao,
    faixa: anexoII.faixa,
    notes: anexoII.notas,
    cipa,
    observations: obs
  };
}


/**
 * Busca preditiva de CNAEs para auto-complete
 */
export function searchCnaes(query: string): CnaeRiskEntry[] {
  // Busca na tabela oficial do Anexo I, nao mais na lista curada a mao.
  return buscarClasses(query).map(item => ({
    code: item.codigo,
    cleanCode: item.classe,
    description: item.denominacao,
    riskDegree: item.grau,
    division: item.classe.slice(0, 2),
    sector: setorDaClasse(item.classe) as CnaeRiskEntry['sector'],
  }));
}

