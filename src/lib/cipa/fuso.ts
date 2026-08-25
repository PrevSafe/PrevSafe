/**
 * Brasil fica em UTC-3 o ano todo desde o fim do horário de verão em 2019, então um
 * offset fixo é suficiente aqui — sem precisar de fuso horário do sistema.
 *
 * Necessário porque o banco (Supabase) roda com timezone de sessão em UTC: um valor
 * de <input type="datetime-local"> ou type="time"> não carrega fuso nenhum, e se for
 * gravado direto num timestamptz o Postgres o interpreta como UTC — a urna abriria (ou
 * a apuração seria registrada) 3 horas fora do horário de Brasília pretendido.
 */
const OFFSET_BRASIL = '-03:00';
const FUSO_BRASIL = 'America/Sao_Paulo';

/**
 * Converte o valor de um <input type="datetime-local"> (ou uma data combinada com um
 * type="time">), sempre preenchido como hora de Brasília, no instante correspondente —
 * pronto para gravar numa coluna timestamptz.
 */
export function paraInstanteBrasil(dataHoraLocal: string): string {
  return `${dataHoraLocal}:00${OFFSET_BRASIL}`;
}

/** Formata um timestamptz do banco como "YYYY-MM-DDTHH:mm" no horário de Brasília,
 *  para popular o defaultValue de um <input type="datetime-local">. */
export function paraCampoDataHoraBrasil(iso: string): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_BRASIL,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const obter = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';
  return `${obter('year')}-${obter('month')}-${obter('day')}T${obter('hour')}:${obter('minute')}`;
}

/** Formata um timestamptz do banco como "HH:mm" no horário de Brasília, para
 *  popular o defaultValue de um <input type="time">. */
export function paraCampoHoraBrasil(iso: string | null): string {
  if (!iso) return '';
  return paraCampoDataHoraBrasil(iso).slice(11);
}

/** Data de "hoje" ("YYYY-MM-DD") no horário de Brasília, independente do fuso do
 *  navegador do usuário — usada para comparar vencimentos (calibração, validade de CA
 *  etc.) sem que o resultado mude conforme o fuso local de quem está com a tela aberta. */
export function hojeBrasil(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO_BRASIL }).format(new Date());
}
