import type { CondicaoIndicado, PapelComissao, PayloadApuracao } from './types';
import { formatarCnpj } from './cpf';

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

const FUSO_BRASIL = 'America/Sao_Paulo';

/**
 * Extrai {dia, mes, ano} no horário oficial de Brasília, não no fuso da máquina que
 * roda o código — a ata é documento legal e precisa do mesmo resultado não importa
 * onde seja gerada ou visualizada.
 */
function partesDataBrasil(iso: string): { dia: number; mes: number; ano: number } {
  const [ano, mes, dia] = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO_BRASIL })
    .format(new Date(iso))
    .split('-')
    .map(Number);
  return { dia: dia!, mes: mes! - 1, ano: ano! };
}

export function dataPorExtenso(iso: string): string {
  const { dia, mes, ano } = partesDataBrasil(iso);
  return `aos ${dia} (${porExtenso(dia)}) dias do mês de ${MESES[mes]} de ${ano} (${porExtenso(ano)})`;
}

function dataHora(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: FUSO_BRASIL });
}

function dataCurta(iso: string | null): string {
  if (!iso) return lacuna();
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: FUSO_BRASIL });
}

/** Dia, nome do mês e ano separados, para a redação "Aos {dia} dias do mês de {mês} de {ano}". */
function diaMesAno(iso: string): { dia: number; mes: string; ano: number } {
  const { dia, mes, ano } = partesDataBrasil(iso);
  return { dia, mes: MESES[mes]!, ano };
}

/** Percentual no padrão brasileiro: vírgula decimal. */
function pct(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO_BRASIL });
}

/** Membro da comissão eleitoral pelo papel exercido, ou lacuna se não cadastrado. */
function membroPorPapel(comissao: PayloadApuracao['comissao'], papel: PapelComissao): string {
  const membro = comissao.find((m) => m.papel === papel);
  return membro ? membro.nome : lacuna();
}

function assinaturasComissao(comissao: PayloadApuracao['comissao']): string {
  const linhas = ['::assinaturas'];
  if (!comissao.length) {
    linhas.push(`${lacuna()}||Membro da Comissão Eleitoral`);
  } else {
    comissao.forEach((m) => linhas.push(`${m.nome}||${PAPEL_LABEL[m.papel]} da Comissão Eleitoral`));
  }
  linhas.push('::');
  return linhas.join('\n');
}

/**
 * Modelo institucional fornecido pelo cliente, reproduzido à risca na estrutura.
 * A urna física do modelo original não existe aqui — a votação é eletrônica —
 * por isso os trechos sobre abertura de lacre e contagem de cédulas foram
 * substituídos pela verificação do encerramento da votação eletrônica.
 */
export function montarAtaEleicao(p: PayloadApuracao): string {
  const referencia = p.eleicao.apuracao_iniciada_em ?? p.eleicao.encerrada_em ?? p.eleicao.data_fim;
  const { dia, mes, ano } = diaMesAno(referencia);
  const gestao = p.eleicao.gestao ?? lacuna();
  const municipio = p.empresa.municipio ?? lacuna();
  const uf = p.empresa.uf ?? lacuna();
  const razaoSocial = p.empresa.razao_social || lacuna();
  const cnpj = p.empresa.cnpj ? formatarCnpj(p.empresa.cnpj) : lacuna();
  const presidente = membroPorPapel(p.comissao, 'presidente');
  const vice = membroPorPapel(p.comissao, 'vice_presidente');
  const horaInicio = horaCurta(p.eleicao.apuracao_iniciada_em);
  const horaFim = horaCurta(p.eleicao.apuracao_encerrada_em);

  const linhas: string[] = [];

  linhas.push('::logotipo::[espaço reservado para o logotipo]');
  linhas.push('');
  linhas.push('::titulo::COMISSÃO INTERNA DE PREVENÇÃO DE ACIDENTES E DE ASSÉDIO – CIPA');
  linhas.push(`::subtitulo::Ata de Apuração dos Votos da Eleição – Gestão ${gestao}`);
  linhas.push('');

  const frasePercentual = p.quorum.aptos > 0
    ? `Conforme registro, ${p.quorum.votantes} colaboradores participaram do pleito, correspondendo a ` +
      `${pct(p.quorum.percentual)}% dos ${p.quorum.aptos} eleitores aptos. ` +
      (p.quorum.atingido
        ? '**O quórum mínimo de mais de 50% dos eleitores aptos foi atingido.** '
        : '**O quórum mínimo de mais de 50% dos eleitores aptos não foi atingido.** ')
    : `**Conforme registro, ${p.quorum.votantes} colaboradores participaram do pleito. Não havia relação ` +
      'prévia de eleitores aptos, razão pela qual o quórum não pôde ser apurado, cabendo à Comissão ' +
      'Eleitoral deliberar a respeito.** ';

  linhas.push(
    `Aos ${dia} dias do mês de ${mes} de ${ano}, às ${horaInicio}, nas dependências da empresa ` +
    `**${razaoSocial}**, inscrita no CNPJ nº **${cnpj}**, sediada em ${municipio} – ${uf}, reuniram-se os ` +
    `membros da Comissão Eleitoral da CIPA, Sr(a). ${presidente} e Sr(a). ${vice}, para dar início à ` +
    'apuração dos votos referentes à eleição da Comissão Interna de Prevenção de Acidentes e de Assédio – ' +
    `CIPA, gestão ${gestao}. A sessão foi aberta pelo Presidente da Comissão Eleitoral, Sr(a). ${presidente}, ` +
    `às ${horaInicio}, com a verificação do encerramento do período de votação eletrônica e a confirmação ` +
    'de que não restavam votos pendentes de conferência, realizada na presença da Vice-presidente da ' +
    `Comissão Eleitoral, Sr(a). ${vice}. A votação ocorreu de forma eletrônica, secreta e nominal, no ` +
    `período de ${dataCurta(p.eleicao.data_inicio)} a ${dataCurta(p.eleicao.data_fim)}, por meio de sistema ` +
    'que registra a participação do eleitor em lista de presença própria, sem qualquer vínculo com o voto ' +
    `depositado. ${frasePercentual}Após a consolidação da apuração pelo sistema, obteve-se o seguinte ` +
    'resultado:',
  );
  linhas.push('');

  linhas.push(`::tituloTabela::Resultado Geral da Eleição – Gestão ${gestao}`);
  linhas.push('');
  linhas.push('| Nome | Quantidade de Votos |');
  linhas.push('|---|:---:|');
  for (const c of p.apuracao.classificacao) {
    linhas.push(`| ${c.nome_completo} | ${c.total_votos} |`);
  }
  linhas.push(`| Votos em Branco | ${p.apuracao.votos_brancos} |`);
  linhas.push(`| Votos Nulos | ${p.apuracao.votos_nulos} |`);
  linhas.push('');

  linhas.push('Encerrada a apuração, foram considerados eleitos os seguintes membros:');
  linhas.push('');

  const titulares = p.apuracao.classificacao.filter((c) => c.situacao === 'EFETIVO');
  const suplentes = p.apuracao.classificacao.filter((c) => c.situacao === 'SUPLENTE');

  linhas.push('::tituloTabela::Resultado final da eleição – Candidatos eleitos');
  linhas.push('');
  if (!titulares.length && !suplentes.length) {
    linhas.push('Não houve candidatos eleitos nesta apuração.');
  } else {
    linhas.push('| Nome | Setor | Quantidade de Votos |');
    linhas.push('|---|---|---|');
    linhas.push('| ::grupo:: Titular |');
    titulares.forEach((c) => linhas.push(`| ${c.nome_completo} | ${c.setor ?? lacuna()} | ${c.total_votos} |`));
    linhas.push('| ::grupo:: Suplente |');
    suplentes.forEach((c) => linhas.push(`| ${c.nome_completo} | ${c.setor ?? lacuna()} | ${c.total_votos} |`));
  }
  linhas.push('');

  linhas.push('::tituloTabela::Representante indicado pela Diretoria');
  linhas.push('');
  linhas.push('| Nome | Setor |');
  linhas.push('|---|---|');
  const indicadosTitulares = p.indicados.filter((i) => i.condicao === 'titular');
  const indicadosSuplentes = p.indicados.filter((i) => i.condicao === 'suplente');
  linhas.push(`| ::grupo:: ${CONDICAO_LABEL.titular} |`);
  if (indicadosTitulares.length) {
    indicadosTitulares.forEach((i) => linhas.push(`| ${i.nome} | ${i.setor ?? lacuna()} |`));
  } else {
    linhas.push(`| ${lacuna()} | ${lacuna()} |`);
  }
  linhas.push(`| ::grupo:: ${CONDICAO_LABEL.suplente} |`);
  if (indicadosSuplentes.length) {
    indicadosSuplentes.forEach((i) => linhas.push(`| ${i.nome} | ${i.setor ?? lacuna()} |`));
  } else {
    linhas.push(`| ${lacuna()} | ${lacuna()} |`);
  }
  linhas.push('');

  linhas.push(
    `Nada mais havendo a registrar, a apuração foi encerrada às ${horaFim}. A presente Ata foi lavrada ` +
    `por mim, ${p.eleicao.ata_lavrada_por ?? lacuna()}, e vai assinada pelo(s) outro(s) membro(s) da ` +
    'Comissão Eleitoral.',
  );
  linhas.push('');
  linhas.push(`${municipio} – ${uf}, ${dia} de ${mes} de ${ano}.`);
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
