/**
 * Datas no fuso de quem usa o sistema, e identificadores que nao colidem.
 *
 * O PROBLEMA DA DATA
 *
 * O projeto usava `new Date().toISOString().split('T')[0]` em 39 lugares para
 * dizer "hoje". Esse padrao converte para UTC antes de cortar a data: no
 * horario de Brasilia (UTC-3), das 21h as 23h59 ele devolve o DIA SEGUINTE.
 *
 *     21/09/2026 23:30 em Sao Paulo  ->  toISOString() = 2026-09-22T02:30:00Z
 *                                    ->  data gravada  = 2026-09-22   (errada)
 *
 * Isso atinge data de emissao de ASO, data de exame, data de acidente na CAT e
 * data de evento do eSocial. Uma CAT com data errada tem consequencia
 * previdenciaria, e o prazo legal de comunicacao e de um dia util.
 *
 * `dataDeHoje()` resolve usando o calendario local. O formato 'en-CA' do
 * Intl produz exatamente AAAA-MM-DD, que e o que o resto do sistema espera.
 *
 * O PROBLEMA DO IDENTIFICADOR
 *
 * 24 registros eram criados com `id: \`prefixo-${Date.now()}\``. Dois criados no
 * mesmo milissegundo recebem o mesmo id, e como o armazenamento no Supabase e
 * indexado por (organization_id, collection, record_id), o segundo sobrescreve
 * o primeiro - sem erro, sem aviso. Digitando um cadastro por vez isso nao
 * acontece; gerando eventos do eSocial para varios trabalhadores, acontece.
 */

/** Fuso usado para tudo que e data de documento. */
export const FUSO_PADRAO = 'America/Sao_Paulo';

/**
 * Data de hoje no fuso local, como AAAA-MM-DD.
 *
 * Use esta funcao em vez de `new Date().toISOString().split('T')[0]`.
 */
export function dataDeHoje(fuso: string = FUSO_PADRAO): string {
  return formatarDataISO(new Date(), fuso);
}

/** Converte uma data para AAAA-MM-DD no fuso indicado. */
export function formatarDataISO(data: Date | string | number, fuso: string = FUSO_PADRAO): string {
  const d = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(d.getTime())) return '';

  try {
    // 'en-CA' produz AAAA-MM-DD. E o unico locale padrao que da esse formato
    // sem precisar remontar a string a mao.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: fuso,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    // Runtime sem base de fusos: melhor a data local do dispositivo que a UTC.
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
}

/**
 * Data daqui a N dias, como AAAA-MM-DD no fuso local.
 *
 * Soma em dias de calendario, nao em milissegundos: `Date.now() + 365 * 86400000`
 * erra um dia quando o periodo atravessa a virada do horario de verao, e o
 * calendario gregoriano e o que vale num contrato.
 */
export function dataEmDias(dias: number, fuso: string = FUSO_PADRAO): string {
  const hoje = dataDeHoje(fuso);
  const [ano, mes, dia] = hoje.split('-').map(Number);
  // Meio-dia UTC evita que a aritmetica caia na virada do dia por causa do fuso.
  const base = new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() + dias);
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, '0')}-${String(base.getUTCDate()).padStart(2, '0')}`;
}

/** Data daqui a N meses de calendario, como AAAA-MM-DD. */
export function dataEmMeses(meses: number, fuso: string = FUSO_PADRAO): string {
  const hoje = dataDeHoje(fuso);
  const [ano, mes, dia] = hoje.split('-').map(Number);
  const base = new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0));
  const diaOriginal = base.getUTCDate();
  base.setUTCMonth(base.getUTCMonth() + meses);
  // 31/01 + 1 mes nao existe: o JS rola para marco. Trazemos de volta para o
  // ultimo dia de fevereiro, que e o que se espera de vencimento mensal.
  if (base.getUTCDate() !== diaOriginal) base.setUTCDate(0);
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, '0')}-${String(base.getUTCDate()).padStart(2, '0')}`;
}

let contador = 0;

/**
 * Identificador unico para um registro novo.
 *
 * Mantem o prefixo legivel e a ordenacao por tempo que os ids antigos tinham,
 * e acrescenta um contador de sessao e aleatoriedade - o suficiente para que
 * dois registros criados no mesmo milissegundo nao colidam.
 */
export function novoId(prefixo: string): string {
  contador = (contador + 1) % 1000000;
  const aleatorio = Math.random().toString(36).slice(2, 8);
  return `${prefixo}-${Date.now()}-${contador.toString(36)}${aleatorio}`;
}
