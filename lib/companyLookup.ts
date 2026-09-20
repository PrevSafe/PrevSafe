/**
 * Módulo de Consulta de Documentos Empresariais e Rurais Brasileiros
 * Suporta: CNPJ (Receita Federal), CPF (Pessoa Física Empregadora), 
 * CAEPF (Produtor Rural / Autônomo) e CNO (Cadastro Nacional de Obras).
 * 
 * Integração em tempo real com BrasilAPI / Receita Federal e validação automática NR-04.
 */

import { lookupRiskDegreeByCnae, formatCnaeCode } from './nr4';
import { DocumentType } from '@/types';

export interface CompanyLookupResult {
  success: boolean;
  document_type: DocumentType;
  document_number: string;
  legal_name: string;
  trade_name: string;
  main_cnae: string;
  cnae_description: string;
  /** null quando o CNAE nao consta no Anexo I da NR-04. Nunca estimado. */
  risk_degree: 1 | 2 | 3 | 4 | null;
  risk_legal_basis: string;
  address: string;
  number?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  status_receita?: 'ATIVA' | 'INAPTA' | 'SUSPENSA' | 'BAIXADA';
  porte?: string;
  natureza_juridica?: string;
  opening_date?: string;
  esocial_tp_insc: '1' | '2' | '3' | '4';
  esocial_explanation: string;
  source: 'RECEITA_FEDERAL_ONLINE' | 'BASE_LOCAL_VERIFICADA' | 'CALCULADO_NR4';
  raw_message?: string;
}

// Base de entidades verificadas para demonstração instantânea e fallback de alta confiabilidade
const VERIFIED_ENTITIES_MOCK: Record<string, Partial<CompanyLookupResult>> = {};


/**
 * Formata qualquer número de documento brasileiro
 */
export function formatDocumentNumber(raw: string, type?: DocumentType): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  if (type === 'CNPJ' || (!type && digits.length === 14 && !raw.includes('/001-') && !raw.includes('/002-'))) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  if (type === 'CPF' || (!type && digits.length === 11)) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  if (type === 'CAEPF' || (!type && digits.length === 14)) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  if (type === 'CNO' || (!type && digits.length === 12)) {
    return digits.replace(/^(\d{2})(\d{3})(\d{5})(\d{2})$/, '$1.$2.$3/$4');
  }
  return raw.trim();
}

/**
 * Detecta o tipo de inscrição e eSocial <tpInsc>
 */
export function detectDocumentTypeAndESocial(digits: string, requestedType?: DocumentType): {
  type: DocumentType;
  tpInsc: '1' | '2' | '3' | '4';
  explanation: string;
} {
  const clean = digits.replace(/\D/g, '');
  
  if (requestedType === 'CAEPF') {
    return {
      type: 'CAEPF',
      tpInsc: '3',
      explanation: 'eSocial <tpInsc: 3> - CAEPF (Cadastro de Atividade Econômica da Pessoa Física - Produtor Rural / Autônomo / Cartório)'
    };
  }

  if (requestedType === 'CNO' || clean.length === 12) {
    return {
      type: 'CNO',
      tpInsc: '4',
      explanation: 'eSocial <tpInsc: 4> - CNO (Cadastro Nacional de Obras de Construção Civil)'
    };
  }

  if (requestedType === 'CPF' || clean.length === 11) {
    return {
      type: 'CPF',
      tpInsc: '2',
      explanation: 'eSocial <tpInsc: 2> - CPF (Pessoa Física Empregadora)'
    };
  }

  // Padrão CNPJ (14 dígitos)
  return {
    type: 'CNPJ',
    tpInsc: '1',
    explanation: 'eSocial <tpInsc: 1> - CNPJ (Pessoa Jurídica Empregadora / Estabelecimento Matriz ou Filial)'
  };
}

/**
 * Busca de Dados Completa por CNPJ, CPF, CAEPF ou CNO
 */
export async function lookupCompanyData(
  input: string, 
  preferredType?: DocumentType
): Promise<CompanyLookupResult> {
  const cleanDigits = input.replace(/\D/g, '');

  if (!cleanDigits || cleanDigits.length < 9) {
    throw new Error('Informe um documento válido com ao menos 9 a 14 dígitos numéricos.');
  }

  const { type, tpInsc, explanation } = detectDocumentTypeAndESocial(cleanDigits, preferredType);

  // 1. Verifica no Mock Local Verificado (resposta imediata)
  if (VERIFIED_ENTITIES_MOCK[cleanDigits]) {
    const mock = VERIFIED_ENTITIES_MOCK[cleanDigits];
    const cnae = mock.main_cnae || '25.11-0-00';
    const nr4 = lookupRiskDegreeByCnae(cnae);

    return {
      success: true,
      document_type: type,
      document_number: formatDocumentNumber(cleanDigits, type),
      legal_name: mock.legal_name || 'Empresa Registrada',
      trade_name: mock.trade_name || mock.legal_name || 'Nome Fantasia',
      main_cnae: nr4.cnaeFormatted || cnae,
      cnae_description: nr4.description || mock.cnae_description || 'Atividades Gerais',
      risk_degree: nr4.riskDegree,
      risk_legal_basis: nr4.legalBasis,
      address: mock.address || 'Av. Principal, 1000',
      neighborhood: mock.neighborhood || 'Centro',
      city: mock.city || 'São Paulo',
      state: mock.state || 'SP',
      zip_code: mock.zip_code || '01001-000',
      phone: mock.phone || '(11) 3000-0000',
      email: mock.email || 'contato@empresa.com.br',
      status_receita: mock.status_receita || 'ATIVA',
      porte: mock.porte || 'EMPRESA REGISTRADA',
      natureza_juridica: mock.natureza_juridica || 'Sociedade Empresária',
      esocial_tp_insc: tpInsc,
      esocial_explanation: explanation,
      source: 'BASE_LOCAL_VERIFICADA'
    };
  }

  // 2. Se for CNPJ (14 dígitos), tenta consulta pública na BrasilAPI (com timeout de segurança)
  if (cleanDigits.length === 14 && type === 'CNPJ') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanDigits}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const rawCnae = String(data.cnae_fiscal || '');
        const nr4 = lookupRiskDegreeByCnae(rawCnae);

        const formattedAddress = [
          data.descricao_tipo_de_logradouro,
          data.logradouro,
          data.numero ? `, nº ${data.numero}` : '',
          data.complemento ? ` - ${data.complemento}` : ''
        ].filter(Boolean).join(' ');

        return {
          success: true,
          document_type: 'CNPJ',
          document_number: formatDocumentNumber(cleanDigits, 'CNPJ'),
          legal_name: data.razao_social || 'Razão Social da Empresa',
          trade_name: data.nome_fantasia || data.razao_social || '',
          main_cnae: nr4.cnaeFormatted || formatCnaeCode(rawCnae),
          cnae_description: nr4.description || data.cnae_fiscal_descricao || 'Atividade Econômica Principal',
          risk_degree: nr4.riskDegree,
          risk_legal_basis: nr4.legalBasis,
          address: formattedAddress || data.logradouro || 'Endereço Comercial',
          neighborhood: data.bairro || '',
          city: data.municipio || 'São Paulo',
          state: data.uf || 'SP',
          zip_code: data.cep ? data.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2') : '',
          phone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.slice(0, 2)}) ${data.ddd_telefone_1.slice(2)}` : '',
          email: data.email ? data.email.toLowerCase() : '',
          status_receita: data.descricao_situacao_cadastral === 'ATIVA' ? 'ATIVA' : 'INAPTA',
          porte: data.porte || 'DEMAIS',
          natureza_juridica: data.natureza_juridica || '',
          opening_date: data.data_inicio_atividade || '',
          esocial_tp_insc: '1',
          esocial_explanation: 'eSocial <tpInsc: 1> - CNPJ Pessoa Jurídica validada na Receita Federal',
          source: 'RECEITA_FEDERAL_ONLINE'
        };
      }
    } catch {
      // Fallback gracioso se a rede estiver offline ou demorar
    }
  }

  // 3. Sem consulta publica disponivel.
  // CNPJ tem API publica: se ela falhou, avisamos em vez de inventar dados.
  if (cleanDigits.length === 14 && type === 'CNPJ') {
    throw new Error('Não foi possível consultar este CNPJ na Receita Federal agora. Verifique sua conexão e tente novamente, ou preencha os dados manualmente.');
  }

  // CPF / CAEPF / CNO nao possuem consulta publica: classificamos o documento para o
  // eSocial e deixamos o cadastro em branco para o usuario preencher. Nada e inventado —
  // em especial o CNAE e o grau de risco, que definem o enquadramento do PGR/PCMSO.
  return {
    success: true,
    document_type: type,
    document_number: formatDocumentNumber(cleanDigits, type),
    legal_name: '',
    trade_name: '',
    main_cnae: '',
    cnae_description: '',
    risk_degree: null,
    risk_legal_basis: 'Grau de risco a confirmar: informe o CNAE da atividade (Anexo I da NR-04).',
    address: '',
    neighborhood: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    porte: '',
    natureza_juridica: '',
    esocial_tp_insc: tpInsc,
    esocial_explanation: explanation,
    source: 'CALCULADO_NR4',
    raw_message: 'Documento classificado para o eSocial. Complete os dados cadastrais manualmente.'
  };
}
