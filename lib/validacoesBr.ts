/**
 * VALIDAÇÃO DE DOCUMENTOS BRASILEIROS — CPF, CNPJ e PIS/PASEP/NIS/NIT.
 *
 * ---------------------------------------------------------------------------
 * POR QUE ISTO EXISTE
 * ---------------------------------------------------------------------------
 * Até aqui o sistema aceitava qualquer sequência de números nos campos de
 * documento. Um CPF digitado errado atravessava o cadastro sem resistência e
 * saía impresso no ASO, na ficha de entrega de EPI e na CAT, e ia parar dentro
 * do evento do eSocial (S-2210, S-2220, S-2240, S-2200) — onde o erro só
 * aparece quando o governo rejeita o lote, ou pior, depois do documento já ter
 * sido entregue ao cliente com um número que não identifica ninguém.
 *
 * Estas funções sao o portao de entrada. Elas NAO corrigem, NAO completam e
 * NAO adivinham: dizem apenas se o numero fecha ou nao fecha, e por que. Um
 * documento invalido tem que ser recusado na tela, na hora da digitacao, e nao
 * silenciosamente carregado adiante ate virar problema de outra pessoa.
 *
 * Onde entra:
 *   - CPF  -> trabalhador (ASO, ficha de EPI, CAT, eSocial S-2200/S-2210/...)
 *   - CNPJ -> empresa contratante e prestador (cabecalho de laudo, contrato,
 *             eSocial S-1000, consulta de CNAE/grau de risco da NR-04)
 *   - PIS  -> trabalhador no eSocial e na CAT (campo NIS)
 *
 * ---------------------------------------------------------------------------
 * LIMITE DESTA VERIFICACAO — leia antes de confiar demais
 * ---------------------------------------------------------------------------
 * Digito verificador prova apenas COERENCIA ARITMETICA do numero. Nao prova
 * que o documento existe, nem que esta ativo, nem que pertence a pessoa que o
 * informou. `validarCPF` devolver true significa "este numero pode ser um
 * CPF", nunca "este e o CPF do Fulano". Quem precisa de existencia real tem
 * que consultar a base oficial (Receita / CNIS); esta biblioteca nao faz isso
 * e nao deve fingir que faz.
 *
 * Sem dependencias, sem I/O, sem estado: funcoes puras, testadas por
 * `scripts/verificar-validacoes.mjs`.
 */

// ---------------------------------------------------------------------------
// Normalizacao
// ---------------------------------------------------------------------------

/**
 * Remove tudo que nao for digito. Usado por CPF e PIS, que sao puramente
 * numericos. NAO serve para CNPJ, que desde 2026 pode conter letras.
 */
export function apenasDigitos(valor: string): string {
  if (typeof valor !== 'string') return '';
  return valor.replace(/\D/g, '');
}

/**
 * Normaliza CNPJ: remove a mascara (ponto, barra, hifen) e espacos, e sobe
 * para maiuscula.
 *
 * Sobre a maiuscula: a implementacao de referencia da Receita Federal recusa
 * letra minuscula literalmente ('1345c3A5000106' e invalido para ela). Aqui a
 * caixa e tratada como apresentacao, igual a mascara: o alfabeto do CNPJ
 * alfanumerico e apenas A-Z, entao 'a' e 'A' designam o mesmo caractere e nao
 * ha ambiguidade possivel. Isso e normalizacao de digitacao, nao complacencia
 * com dado invalido — nenhum caractere e inventado ou substituido por outro.
 */
function normalizarCnpj(valor: string): string {
  if (typeof valor !== 'string') return '';
  return valor.replace(/[\s./-]/g, '').toUpperCase();
}

/** Verdadeiro quando todos os caracteres da string sao iguais entre si. */
function todosIguais(valor: string): boolean {
  return valor.length > 0 && valor.split('').every((c) => c === valor[0]);
}

// ---------------------------------------------------------------------------
// CPF
// ---------------------------------------------------------------------------

/**
 * Valida CPF pelos dois digitos verificadores (modulo 11).
 *
 * Aceita com ou sem pontuacao. Devolve false para vazio, null, undefined e
 * para qualquer quantidade de digitos diferente de 11.
 *
 * As dez sequencias de digitos repetidos (00000000000 ate 99999999999) sao
 * recusadas explicitamente: TODAS AS DEZ fecham o calculo do digito
 * verificador, e sao exatamente o que um campo obrigatorio recebe quando
 * alguem quer "so passar da tela". Aceita-las seria dar aparencia de validade
 * a um preenchimento que nao identifica ninguem.
 */
export function validarCPF(valor: string): boolean {
  const cpf = apenasDigitos(valor);
  if (cpf.length !== 11) return false;
  if (todosIguais(cpf)) return false;

  // Primeiro digito: pesos 10..2 sobre os 9 primeiros digitos.
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
  let resto = soma % 11;
  const dv1 = resto < 2 ? 0 : 11 - resto;
  if (dv1 !== Number(cpf[9])) return false;

  // Segundo digito: pesos 11..2 sobre os 10 primeiros (ja incluindo o dv1).
  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);
  resto = soma % 11;
  const dv2 = resto < 2 ? 0 : 11 - resto;
  return dv2 === Number(cpf[10]);
}

// ---------------------------------------------------------------------------
// CNPJ
// ---------------------------------------------------------------------------

/**
 * Pesos do modulo 11 do CNPJ: [6,5,4,3,2,9,8,7,6,5,4,3,2].
 *
 * O primeiro DV usa as posicoes 1..12 desta lista — 5,4,3,2,9,8,7,6,5,4,3,2,
 * que e a sequencia classica "5432198765432" truncada em 12. O segundo DV usa
 * as posicoes 0..12, incluindo o peso 2 aplicado ao DV1 recem-calculado.
 */
const PESOS_CNPJ = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** Doze caracteres alfanumericos maiusculos + dois digitos numericos. */
const FORMATO_CNPJ = /^[A-Z0-9]{12}[0-9]{2}$/;

/** Valor de um caractere do CNPJ no modulo 11: codigo ASCII menos 48. */
function valorCaractereCnpj(caractere: string): number {
  return caractere.charCodeAt(0) - 48; // '0'..'9' -> 0..9 ; 'A'..'Z' -> 17..42
}

/**
 * Calcula os dois digitos verificadores de um CNPJ de 12 caracteres, ja
 * normalizado. Devolve os dois digitos como string ('00' a '99').
 */
function calcularDvCnpj(base12: string): string {
  let somaDv1 = 0;
  let somaDv2 = 0;
  for (let i = 0; i < 12; i++) {
    const v = valorCaractereCnpj(base12[i]);
    somaDv1 += v * PESOS_CNPJ[i + 1];
    somaDv2 += v * PESOS_CNPJ[i];
  }
  const dv1 = somaDv1 % 11 < 2 ? 0 : 11 - (somaDv1 % 11);
  somaDv2 += dv1 * PESOS_CNPJ[12];
  const dv2 = somaDv2 % 11 < 2 ? 0 : 11 - (somaDv2 % 11);
  return `${dv1}${dv2}`;
}

/**
 * Valida CNPJ pelos dois digitos verificadores (modulo 11), nos formatos
 * NUMERICO e ALFANUMERICO.
 *
 * ---------------------------------------------------------------------------
 * CNPJ ALFANUMERICO — em vigor, algoritmo conferido em fonte oficial
 * ---------------------------------------------------------------------------
 * FONTE: Receita Federal, "Calculo do DV do CNPJ Alfanumerico" —
 * https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj
 * O algoritmo abaixo foi transcrito da implementacao de referencia publicada
 * pela propria Receita no pacote `codigos-cnpj.zip` daquela pagina
 * (src/typescript/cnpj.ts), e nao de interpretacao de terceiros.
 *
 * VIGENCIA: Instrucao Normativa RFB nº 2.229/2024; o primeiro CNPJ
 * alfanumerico foi emitido em 31/07/2026. Ou seja: JA ESTA VALENDO. CNPJ
 * alfanumerico pode chegar neste sistema hoje, e recusa-lo seria barrar
 * empresa legitima.
 *
 * O QUE MUDA: as 12 primeiras posicoes passam a aceitar A-Z alem de 0-9; as
 * duas ultimas (os DVs) continuam exclusivamente numericas. O modulo 11 e os
 * pesos NAO mudaram — o que mudou foi que cada caractere entra na conta pelo
 * seu codigo ASCII menos 48 (A=17, B=18, ... Z=42), o que para '0'..'9' da
 * exatamente o proprio digito. Por isso o algoritmo e um so: todo CNPJ
 * numerico continua validando com o mesmo codigo e o mesmo resultado de antes.
 *
 * CNPJs ja emitidos nao mudam e seus DVs permanecem os mesmos.
 *
 * Casos de referencia conferidos contra o pacote oficial:
 *   12.ABC.345/01DE-35 · 1345C3A5000106 · ABCDEFGHIJKL80 · 00000000000191
 *
 * Aceita com ou sem pontuacao. Devolve false para vazio, null, undefined,
 * tamanho errado e caractere fora de [A-Z0-9].
 *
 * Sequencias de caracteres todos iguais sao recusadas. Na pratica so
 * '00000000000000' chega a fechar o calculo (e a propria referencia da Receita
 * ja o recusa nominalmente); a checagem generica cobre o resto sem custo.
 */
export function validarCNPJ(valor: string): boolean {
  const cnpj = normalizarCnpj(valor);
  if (cnpj.length !== 14) return false;
  if (!FORMATO_CNPJ.test(cnpj)) return false;
  if (todosIguais(cnpj)) return false;
  return calcularDvCnpj(cnpj.substring(0, 12)) === cnpj.substring(12);
}

// ---------------------------------------------------------------------------
// PIS / PASEP / NIS / NIT
// ---------------------------------------------------------------------------

/** Pesos do PIS/PASEP: 3,2,9,8,7,6,5,4,3,2 sobre os 10 primeiros digitos. */
const PESOS_PIS = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Valida PIS/PASEP/NIS/NIT — sao o mesmo numero de 11 digitos com nomes
 * diferentes conforme o cadastro de origem, e o digito verificador e o mesmo.
 *
 * Calculo: soma dos 10 primeiros digitos pelos pesos 3298765432, resto da
 * divisao por 11, digito = 11 - resto; resto 0 ou 1 (ou seja, digito 11 ou 10)
 * vira 0.
 *
 * Aceita com ou sem pontuacao. Devolve false para vazio, null, undefined e
 * para quantidade de digitos diferente de 11. Sequencias repetidas tambem sao
 * recusadas, pela mesma razao do CPF.
 */
export function validarPIS(valor: string): boolean {
  const pis = apenasDigitos(valor);
  if (pis.length !== 11) return false;
  if (todosIguais(pis)) return false;

  let soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(pis[i]) * PESOS_PIS[i];
  const resto = soma % 11;
  const dv = resto < 2 ? 0 : 11 - resto;
  return dv === Number(pis[10]);
}

// ---------------------------------------------------------------------------
// Formatacao
// ---------------------------------------------------------------------------

/**
 * Formata CPF como 000.000.000-00.
 *
 * Se o valor nao tiver 11 digitos, devolve o que foi recebido SEM alterar, em
 * vez de completar com zeros ou cortar: um documento incompleto tem que
 * continuar parecendo incompleto na tela, nunca ganhar aparencia de CPF
 * formatado que nao tem.
 */
export function formatarCPF(valor: string): string {
  const cpf = apenasDigitos(valor);
  if (cpf.length !== 11) return typeof valor === 'string' ? valor : '';
  return `${cpf.substring(0, 3)}.${cpf.substring(3, 6)}.${cpf.substring(6, 9)}-${cpf.substring(9)}`;
}

/**
 * Formata CNPJ como 00.000.000/0000-00 (ou 12.ABC.345/01DE-35 no caso
 * alfanumerico — a mascara e a mesma nos dois formatos).
 *
 * Se nao tiver 14 caracteres, devolve o recebido sem alterar. Mesma razao do
 * formatarCPF.
 */
export function formatarCNPJ(valor: string): string {
  const cnpj = normalizarCnpj(valor);
  if (cnpj.length !== 14) return typeof valor === 'string' ? valor : '';
  return `${cnpj.substring(0, 2)}.${cnpj.substring(2, 5)}.${cnpj.substring(5, 8)}/${cnpj.substring(8, 12)}-${cnpj.substring(12)}`;
}

/**
 * Formata PIS/PASEP como 000.00000.00-0.
 *
 * Se nao tiver 11 digitos, devolve o recebido sem alterar. Mesma razao do
 * formatarCPF.
 */
export function formatarPIS(valor: string): string {
  const pis = apenasDigitos(valor);
  if (pis.length !== 11) return typeof valor === 'string' ? valor : '';
  return `${pis.substring(0, 3)}.${pis.substring(3, 8)}.${pis.substring(8, 10)}-${pis.substring(10)}`;
}

// ---------------------------------------------------------------------------
// Conferencia com motivo legivel — para uso nas telas
// ---------------------------------------------------------------------------

export type TipoDocumento = 'CPF' | 'CNPJ' | 'PIS';

export type ResultadoValidacao = {
  valido: boolean;
  /** Texto pronto para exibir ao usuário. Presente apenas quando inválido. */
  motivo?: string;
};

const VALIDO: ResultadoValidacao = { valido: true };

/**
 * Confere um documento e devolve, quando invalido, o motivo em portugues
 * pronto para ir direto para a mensagem de erro do campo.
 *
 * O motivo distingue o tipo de problema de proposito: "faltam digitos" e um
 * erro de digitacao em andamento, "digito verificador nao confere" e um numero
 * errado. A tela trata os dois de forma diferente, e o usuario merece saber
 * qual dos dois aconteceu em vez de um "documento inválido" generico.
 */
export function conferirDocumento(valor: string, tipo: TipoDocumento): ResultadoValidacao {
  switch (tipo) {
    case 'CPF':
      return conferirCPF(valor);
    case 'CNPJ':
      return conferirCNPJ(valor);
    case 'PIS':
      return conferirPIS(valor);
    default:
      // Nao retorna valido: tipo desconhecido e erro de programacao, e deixar
      // passar como valido seria exatamente o silencio que esta biblioteca
      // existe para acabar.
      return { valido: false, motivo: `Tipo de documento desconhecido: ${String(tipo)}` };
  }
}

function conferirCPF(valor: string): ResultadoValidacao {
  const cpf = apenasDigitos(valor);
  if (cpf.length === 0) return { valido: false, motivo: 'CPF não informado' };
  if (cpf.length !== 11) {
    return { valido: false, motivo: `CPF deve ter 11 dígitos (foram informados ${cpf.length})` };
  }
  if (todosIguais(cpf)) {
    return { valido: false, motivo: 'CPF com todos os dígitos iguais não é um CPF válido' };
  }
  if (!validarCPF(cpf)) {
    return { valido: false, motivo: 'Dígito verificador do CPF não confere' };
  }
  return VALIDO;
}

function conferirCNPJ(valor: string): ResultadoValidacao {
  const cnpj = normalizarCnpj(valor);
  if (cnpj.length === 0) return { valido: false, motivo: 'CNPJ não informado' };
  if (cnpj.length !== 14) {
    return { valido: false, motivo: `CNPJ deve ter 14 caracteres (foram informados ${cnpj.length})` };
  }
  if (/[^A-Z0-9]/.test(cnpj)) {
    return { valido: false, motivo: 'CNPJ aceita apenas letras de A a Z e dígitos de 0 a 9' };
  }
  if (!/[0-9]{2}$/.test(cnpj)) {
    // Vale tanto para o CNPJ numerico quanto para o alfanumerico.
    return { valido: false, motivo: 'Os dois últimos caracteres do CNPJ (dígito verificador) devem ser numéricos' };
  }
  if (todosIguais(cnpj)) {
    return { valido: false, motivo: 'CNPJ com todos os caracteres iguais não é um CNPJ válido' };
  }
  if (!validarCNPJ(cnpj)) {
    return { valido: false, motivo: 'Dígito verificador do CNPJ não confere' };
  }
  return VALIDO;
}

function conferirPIS(valor: string): ResultadoValidacao {
  const pis = apenasDigitos(valor);
  if (pis.length === 0) return { valido: false, motivo: 'PIS/PASEP não informado' };
  if (pis.length !== 11) {
    return { valido: false, motivo: `PIS/PASEP deve ter 11 dígitos (foram informados ${pis.length})` };
  }
  if (todosIguais(pis)) {
    return { valido: false, motivo: 'PIS/PASEP com todos os dígitos iguais não é válido' };
  }
  if (!validarPIS(pis)) {
    return { valido: false, motivo: 'Dígito verificador do PIS/PASEP não confere' };
  }
  return VALIDO;
}
