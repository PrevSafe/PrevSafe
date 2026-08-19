import type { CondicaoIndicado, PapelComissao, PayloadApuracao } from './types';

/**
 * Geração das atas a partir de modelo fixo.
 *
 * Ata é documento com efeito jurídico: precisa ser idêntica a cada execução,
 * conferível linha a linha contra os dados do banco e independente de qualquer
 * serviço externo. Por isso nenhum LLM participa daqui.
 */

const UNIDADES = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const DEZ_A_DEZENOVE = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function porExtenso(numero: number): string {
  const n = Math.floor(Math.abs(numero));
  if (n === 0) return 'zero';
  if (n === 100) return 'cem';
  if (n < 10) return UNIDADES[n]!;
  if (n < 20) return DEZ_A_DEZENOVE[n - 10]!;

  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    return u ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]!;
  }

  if (n < 1000) {
    const c = Math.floor(n / 100);
    const resto = n % 100;
    return resto ? `${CENTENAS[c]} e ${porExtenso(resto)}` : CENTENAS[c]!;
  }

  const milhares = Math.floor(n / 1000);
  const resto = n % 1000;
  const prefixo = milhares === 1 ? 'mil' : `${porExtenso(milhares)} mil`;
  if (!resto) return prefixo;
  const conector = resto < 100 || resto % 100 === 0 ? ' e ' : ' ';
  return `${prefixo}${conector}${porExtenso(resto)}`;
}

function fusoBrasilia(iso: string): Date {
  return new Date(iso);
}

export function dataPorExtenso(iso: string): string {
  const d = fusoBrasilia(iso);
  const dia = d.getDate();
  const ano = d.getFullYear();
  return `aos ${dia} (${porExtenso(dia)}) dias do mês de ${MESES[d.getMonth()]} de ${ano} (${porExtenso(ano)})`;
}

function dataHora(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Percentual no padrão brasileiro: vírgula decimal. */
function pct(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarCnpj(cnpj: string): string {
  const d = (cnpj || '').replace(/\D/g, '');
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function nomeComissao(norma: string): string {
  return norma === 'NR-31'
    ? 'Comissão Interna de Prevenção de Acidentes e de Assédio do Trabalho Rural (CIPATR)'
    : 'Comissão Interna de Prevenção de Acidentes e de Assédio (CIPA)';
}

function siglaComissao(norma: string): string {
  return norma === 'NR-31' ? 'CIPATR' : 'CIPA';
}

/** Bloco de assinaturas, igual nas duas atas. */
function assinaturas(): string {
  return [
    '## Assinaturas',
    '',
    'Nada mais havendo a tratar, lavrou-se a presente ata, que segue assinada pelos membros da comissão eleitoral.',
    '',
    '::assinaturas',
    'Presidente da comissão eleitoral',
    'Secretário(a)',
    'Representante do empregador',
    'Responsável técnico — SESMT',
    '::',
  ].join('\n');
}

const PAPEL_LABEL: Record<PapelComissao, string> = {
  presidente: 'Presidente',
  vice_presidente: 'Vice-presidente',
  secretario: 'Secretário(a)',
  membro: 'Membro',
};

const CONDICAO_LABEL: Record<CondicaoIndicado, string> = {
  titular: 'Titular',
  suplente: 'Suplente',
};

/**
 * Linha em branco para preenchimento manual: markdown.ts protege runs de
 * 3+ underscores contra a interpretação de ênfase, então isso chega ao
 * documento como um traço literal — nunca "null" nem frase cortada.
 */
function lacuna(): string {
  return '_'.repeat(24);
}

function horaCurta(iso: string | null): string {
  if (!iso) return lacuna();
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** "Presidente João Silva, Secretário(a) Maria Souza e Membro Pedro Alves". */
function listaMembros(comissao: PayloadApuracao['comissao']): string {
  if (!comissao.length) return lacuna();
  const partes = comissao.map((m) => `${PAPEL_LABEL[m.papel]} ${m.nome}`);
  if (partes.length === 1) return partes[0]!;
  return `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`;
}

function assinaturasComissao(comissao: PayloadApuracao['comissao']): string {
  const linhas = ['::assinaturas'];
  if (!comissao.length) {
    linhas.push(`${lacuna()} — Membro da Comissão Eleitoral`);
  } else {
    comissao.forEach((m) => linhas.push(`${m.nome} — ${PAPEL_LABEL[m.papel]} da Comissão Eleitoral`));
  }
  linhas.push('::');
  return linhas.join('\n');
}

export function montarAtaEleicao(p: PayloadApuracao): string {
  const referencia = p.eleicao.apuracao_iniciada_em ?? p.eleicao.encerrada_em ?? p.eleicao.data_fim;
  const gestao = p.eleicao.gestao ?? lacuna();
  const municipio = p.empresa.municipio ?? lacuna();
  const uf = p.empresa.uf ?? lacuna();

  const linhas: string[] = [];

  linhas.push('# COMISSÃO INTERNA DE PREVENÇÃO DE ACIDENTES E DE ASSÉDIO — CIPA');
  linhas.push('');
  linhas.push(`## Ata de Apuração dos Votos da Eleição — Gestão ${gestao}`);
  linhas.push('');

  linhas.push(
    `${dataPorExtenso(referencia).replace(/^a/, 'A')}, às ${horaCurta(p.eleicao.apuracao_iniciada_em)}, ` +
    `nas dependências da empresa ${p.empresa.razao_social}, inscrita no CNPJ nº ${formatarCnpj(p.empresa.cnpj)}, ` +
    `sediada em ${municipio} — ${uf}, reuniram-se os membros da Comissão Eleitoral da CIPA, ` +
    `${listaMembros(p.comissao)}, para proceder à apuração dos votos referentes à eleição da Comissão ` +
    `Interna de Prevenção de Acidentes e de Assédio — CIPA, gestão ${gestao}.`,
  );
  linhas.push('');

  linhas.push(
    `A votação ocorreu de forma eletrônica, secreta e nominal, no período de ${dataHora(p.eleicao.data_inicio)} ` +
    `a ${dataHora(p.eleicao.data_fim)}, por meio de sistema que registra a participação do eleitor em lista ` +
    'de presença própria, sem qualquer vínculo com o voto depositado. A Comissão Eleitoral verificou o ' +
    'encerramento do período de votação e a inexistência de votos pendentes de conferência, procedendo à ' +
    `consolidação da apuração pelo sistema às ${horaCurta(p.eleicao.apuracao_encerrada_em)}.`,
  );
  linhas.push('');

  if (p.quorum.aptos > 0) {
    linhas.push(
      `Constaram da relação de eleitores aptos ${p.quorum.aptos} (${porExtenso(p.quorum.aptos)}) trabalhadores, ` +
      `dos quais compareceram à votação ${p.quorum.votantes} (${porExtenso(p.quorum.votantes)}), ` +
      `correspondendo a ${pct(p.quorum.percentual)}% do total de aptos.`,
    );
    linhas.push('');
    linhas.push(
      p.quorum.atingido
        ? '**O quórum mínimo de mais de 50% dos empregados foi atingido**, restando válida a eleição.'
        : '**O quórum mínimo de mais de 50% dos empregados NÃO foi atingido.** A Comissão Eleitoral deverá ' +
          'deliberar quanto à convocação de nova votação, nos termos da norma aplicável e do edital.',
    );
  } else {
    linhas.push(
      '**A eleição correu sem relação prévia de eleitores cadastrada, razão pela qual o quórum não pôde ser ' +
      'apurado. Cabe à Comissão Eleitoral deliberar sobre a validade do quórum, nos termos da norma aplicável ' +
      'e do edital.**',
    );
  }
  linhas.push('');

  linhas.push('**Resultado geral da eleição**');
  linhas.push('');
  linhas.push('| Nome | Quantidade de votos |');
  linhas.push('|---|---:|');
  for (const c of p.apuracao.classificacao) {
    linhas.push(`| ${c.nome_completo} | ${c.total_votos} |`);
  }
  linhas.push(`| Votos em branco | ${p.apuracao.votos_brancos} |`);
  linhas.push(`| Votos nulos | ${p.apuracao.votos_nulos} |`);
  linhas.push('');

  linhas.push('Encerrada a apuração, foram considerados eleitos os seguintes membros:');
  linhas.push('');

  const titulares = p.apuracao.classificacao.filter((c) => c.situacao === 'EFETIVO');
  const suplentes = p.apuracao.classificacao.filter((c) => c.situacao === 'SUPLENTE');

  linhas.push('**Resultado final — eleitos**');
  linhas.push('');
  if (!titulares.length && !suplentes.length) {
    linhas.push('Não houve candidatos eleitos nesta apuração.');
    linhas.push('');
  } else {
    if (titulares.length) {
      linhas.push('*Titulares*');
      linhas.push('');
      linhas.push('| Nome | Setor | Votos |');
      linhas.push('|---|---|---:|');
      titulares.forEach((c) => linhas.push(`| ${c.nome_completo} | ${c.setor ?? '—'} | ${c.total_votos} |`));
      linhas.push('');
    }
    if (suplentes.length) {
      linhas.push('*Suplentes*');
      linhas.push('');
      linhas.push('| Nome | Setor | Votos |');
      linhas.push('|---|---|---:|');
      suplentes.forEach((c) => linhas.push(`| ${c.nome_completo} | ${c.setor ?? '—'} | ${c.total_votos} |`));
      linhas.push('');
    }
  }

  linhas.push('**Representantes indicados pelo empregador**');
  linhas.push('');
  if (!p.indicados.length) {
    linhas.push('_A indicação dos representantes do empregador será registrada em ata de posse._');
  } else {
    linhas.push('| Nome | Setor | Condição |');
    linhas.push('|---|---|---|');
    p.indicados.forEach((i) =>
      linhas.push(`| ${i.nome} | ${i.setor ?? '—'} | ${CONDICAO_LABEL[i.condicao]} |`));
  }
  linhas.push('');

  linhas.push(
    `Nada mais havendo a registrar, a apuração foi encerrada às ${horaCurta(p.eleicao.apuracao_encerrada_em)}. ` +
    `A presente ata foi lavrada por ${p.eleicao.ata_lavrada_por ?? lacuna()} e vai assinada pelos membros ` +
    'da Comissão Eleitoral.',
  );
  linhas.push('');
  linhas.push(`${municipio} — ${uf}, ${dataPorExtenso(referencia)}.`);
  linhas.push('');

  linhas.push(assinaturasComissao(p.comissao));
  linhas.push('');
  linhas.push(`::rodape::Documento gerado pelo sistema em ${dataHora(new Date().toISOString())}.`);

  return linhas.join('\n');
}

export function montarAtaPosse(p: PayloadApuracao): string {
  const sigla = siglaComissao(p.eleicao.norma);
  const referencia = p.eleicao.encerrada_em ?? p.eleicao.data_fim;
  const eleitos = p.apuracao.classificacao.filter((c) => c.situacao === 'EFETIVO');
  const suplentes = p.apuracao.classificacao.filter((c) => c.situacao === 'SUPLENTE');

  const linhas: string[] = [];

  linhas.push(`# Ata de Instalação e Posse — ${sigla}`);
  linhas.push('');
  linhas.push(`**Empresa:** ${p.empresa.razao_social}`);
  linhas.push(`**CNPJ:** ${formatarCnpj(p.empresa.cnpj)}`);
  linhas.push(`**Gestão:** ${p.eleicao.gestao ?? '—'}`);
  linhas.push('');
  linhas.push('---');
  linhas.push('');

  linhas.push('## 1. Da instalação');
  linhas.push('');
  linhas.push(
    `${dataPorExtenso(referencia).replace(/^a/, 'A')}, reuniram-se os representantes eleitos e indicados ` +
    `para a instalação e posse da ${nomeComissao(p.eleicao.norma)}, gestão ${p.eleicao.gestao ?? '—'}, ` +
    'nos termos da norma regulamentadora aplicável.',
  );
  linhas.push('');

  linhas.push('## 2. Representantes dos empregados (eleitos)');
  linhas.push('');
  linhas.push('| Nome | Função | Condição |');
  linhas.push('|---|---|---|');
  eleitos.forEach((c) => linhas.push(`| ${c.nome_completo} | ${c.cargo_funcao ?? '—'} | Titular |`));
  suplentes.forEach((c) => linhas.push(`| ${c.nome_completo} | ${c.cargo_funcao ?? '—'} | Suplente |`));
  if (!eleitos.length && !suplentes.length) linhas.push('| — | — | — |');
  linhas.push('');

  linhas.push('## 3. Representantes do empregador (indicados)');
  linhas.push('');
  linhas.push('_A ser preenchido pelo empregador, em número paritário ao de representantes eleitos._');
  linhas.push('');
  linhas.push('| Nome | Função | Condição |');
  linhas.push('|---|---|---|');
  const paritarios = Math.max(eleitos.length + suplentes.length, 1);
  for (let i = 0; i < paritarios; i++) linhas.push('| | | |');
  linhas.push('');

  linhas.push('## 4. Da designação');
  linhas.push('');
  linhas.push('- **Presidente** (indicado pelo empregador): \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_');
  linhas.push('- **Vice-Presidente** (escolhido entre os eleitos): \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_');
  linhas.push('- **Secretário(a)**: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_');
  linhas.push('');
  linhas.push('## 5. Do mandato e do calendário');
  linhas.push('');
  linhas.push('- Início da gestão: \\_\\_\\_\\_ / \\_\\_\\_\\_ / \\_\\_\\_\\_\\_\\_');
  linhas.push('- Término da gestão: \\_\\_\\_\\_ / \\_\\_\\_\\_ / \\_\\_\\_\\_\\_\\_');
  linhas.push('- Data das reuniões ordinárias mensais: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_');
  linhas.push('');
  linhas.push('---');
  linhas.push('');
  linhas.push(assinaturas());
  linhas.push('');
  linhas.push(`::rodape::Documento gerado pelo sistema em ${dataHora(new Date().toISOString())}.`);

  return linhas.join('\n');
}
