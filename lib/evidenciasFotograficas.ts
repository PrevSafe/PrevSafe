/**
 * Fotografias anexadas a AEP: o que as torna prova, e nao ilustracao.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 *
 * A NR-17 nao proibe nem exige imagem na AEP. O subitem 17.3.1.1 admite
 * "abordagens qualitativas, semiquantitativas, quantitativas ou combinacao
 * dessas", e o 17.3.1.2.1 exige apenas que a avaliacao "deve ser registrada
 * pela organizacao". A foto e complemento legitimo do registro.
 *
 * O valor juridico dela, porem, depende de coisas que uma foto colada num
 * documento nao tem:
 *
 *   1. AUTENTICIDADE. CPC, art. 422: a reproducao fotografica faz prova se a
 *      conformidade com o original nao for impugnada. Par. 1o: a fotografia
 *      digital, se impugnada, exige "a respectiva autenticacao eletronica" ou
 *      pericia. O que se apresenta e o hash SHA-256 do arquivo, calculado no
 *      momento do registro e impresso sob a foto.
 *
 *   2. ONDE ELA PROTEGE. A foto nao muda os fatos: torna-os dificeis de
 *      contestar - para os dois lados. A foto do posto inadequado SEM a foto
 *      da correcao documenta que a empresa conhecia o risco. O que protege e o
 *      par "situacao encontrada" / "apos a medida" no mesmo aspecto.
 *
 *   3. IMAGEM DO TRABALHADOR. Pessoa identificavel e dado pessoal (LGPD, art.
 *      5o, I), e no contexto de avaliacao de saude ocupacional pode ser lida
 *      como dado referente a saude. Fotografa-se o posto, nao a pessoa; sem
 *      rosto identificavel e sem nome na legenda.
 *
 *   4. RASTRO. Foto de documento emitido nao pode sumir em silencio. Aqui nao
 *      ha exclusao: ha SUBSTITUICAO (o arquivo antigo fica) e DESCARTE (o
 *      arquivo sai - por exemplo, porque mostrava um rosto -, mas o registro
 *      com hash, autor, data e motivo continua).
 *
 * O QUE O HASH PROVA, E O QUE NAO PROVA
 *
 * Prova que o arquivo guardado e o MESMO que foi registrado naquela data. Nao
 * prova quando nem onde a foto foi TIRADA: o arquivo pode ter sido feito antes
 * do registro. Por isso a legenda diz "registrada em", nunca "tirada em", e a
 * posicao gravada e a do aparelho no momento do registro, declarada por quem
 * estava no local.
 */

import type {
  EvidenciaFotografica,
  MomentoDaEvidencia,
  SituacaoDaEvidencia,
} from '@/types';

/**
 * Formatos que o PDF sabe imprimir. HEIC (iPhone) e WEBP ficam de fora: o
 * gerador de PDF nao os le, e aceitar o envio seria guardar prova que o
 * documento nao consegue mostrar.
 */
export const TIPOS_ACEITOS = ['image/jpeg', 'image/png'] as const;

/**
 * O MESMO limite do bucket (file_size_limit em
 * supabase/migrations/20260918000000_prevsafe_storage_evidencias.sql). Com um
 * limite maior aqui, o arquivo passava nesta conferencia e era recusado pelo
 * armazenamento com uma mensagem que ninguem entende.
 */
export const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024;

export const MOMENTOS: { valor: MomentoDaEvidencia; rotulo: string; ajuda: string }[] = [
  {
    valor: 'SITUACAO_ENCONTRADA',
    rotulo: 'Situação encontrada',
    ajuda: 'Como o posto estava quando foi avaliado.',
  },
  {
    valor: 'APOS_A_MEDIDA',
    rotulo: 'Após a medida',
    ajuda: 'Como ficou depois da adequação. É esta que prova que a medida foi implantada.',
  },
];

export function rotuloDoMomento(momento: MomentoDaEvidencia | string | undefined): string {
  return MOMENTOS.find((m) => m.valor === momento)?.rotulo || 'Momento não informado';
}

/** O arquivo pode ser anexado? */
export function conferirArquivo(arquivo: { type?: string; size?: number } | null | undefined): {
  ok: boolean;
  motivo: string;
} {
  if (!arquivo) return { ok: false, motivo: 'Nenhum arquivo selecionado.' };
  const tipo = String(arquivo.type || '').toLowerCase();
  if (!(TIPOS_ACEITOS as readonly string[]).includes(tipo)) {
    return {
      ok: false,
      motivo:
        `Formato ${tipo || 'desconhecido'} não aceito. Envie JPEG ou PNG — o documento da AEP não `
        + 'consegue imprimir outros formatos, e guardar uma prova que o documento não mostra não serve. '
        + 'No iPhone: Ajustes › Câmera › Formatos › "Mais Compatível".',
    };
  }
  const tamanho = Number(arquivo.size || 0);
  if (tamanho <= 0) return { ok: false, motivo: 'O arquivo está vazio.' };
  if (tamanho > TAMANHO_MAXIMO_BYTES) {
    return {
      ok: false,
      motivo: `O arquivo tem ${(tamanho / 1024 / 1024).toFixed(1)} MB. O limite é `
        + `${TAMANHO_MAXIMO_BYTES / 1024 / 1024} MB.`,
    };
  }
  return { ok: true, motivo: '' };
}

/**
 * SHA-256 em hexadecimal.
 *
 * Calculado sobre os MESMOS bytes que sao enviados ao armazenamento. Se o
 * arquivo fosse comprimido ou convertido depois do calculo, o hash impresso
 * nao corresponderia a nada guardado.
 */
export async function sha256Hex(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  const sutil = (globalThis as any)?.crypto?.subtle;
  if (!sutil) throw new Error('Este navegador não oferece cálculo de SHA-256 (crypto.subtle).');
  const dados = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const resumo = await sutil.digest('SHA-256', dados);
  return Array.from(new Uint8Array(resumo))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Minusculas, sem acento, espacos simples. */
function normalizar(texto: string): string {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A legenda cita um trabalhador pelo nome?
 *
 * Confere o nome completo e o par "primeiro + ultimo nome". So o primeiro nome
 * nao conta: "Ana" numa legenda pode ser qualquer coisa, e bloquear por isso
 * seria atrapalhar sem proteger ninguem.
 *
 * Devolve o nome encontrado, para a mensagem dizer qual.
 */
export function legendaCitaTrabalhador(legenda: string, nomes: string[]): string | null {
  const texto = ` ${normalizar(legenda).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ')} `;
  for (const nome of Array.isArray(nomes) ? nomes : []) {
    const partes = normalizar(nome).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(Boolean);
    if (partes.length < 2) continue;
    const completo = ` ${partes.join(' ')} `;
    const primeiroEUltimo = ` ${partes[0]} ${partes[partes.length - 1]} `;
    if (texto.includes(completo) || texto.includes(primeiroEUltimo)) return nome;
  }
  return null;
}

/** O que impede de registrar esta evidencia. Lista vazia = pode registrar. */
export function conferirNovaEvidencia(entrada: {
  legenda: string;
  momento: MomentoDaEvidencia | '' | undefined;
  semRostoIdentificavel: boolean;
  nomesDosTrabalhadores?: string[];
}): string[] {
  const problemas: string[] = [];

  if (!entrada.momento) {
    problemas.push('Diga se a foto mostra a situação encontrada ou o resultado após a medida.');
  }
  if (!String(entrada.legenda || '').trim()) {
    problemas.push('Escreva uma legenda dizendo o que a foto mostra.');
  }
  if (!entrada.semRostoIdentificavel) {
    problemas.push(
      'Confirme que ninguém é identificável pelo rosto. Fotografe o posto, não a pessoa — se a '
      + 'postura exigir o trabalhador na imagem, deixe o rosto fora do enquadramento ou desfocado.'
    );
  }
  const citado = legendaCitaTrabalhador(entrada.legenda, entrada.nomesDosTrabalhadores || []);
  if (citado) {
    problemas.push(
      `A legenda cita "${citado}". Não identifique o trabalhador: descreva o posto e a tarefa. `
      + 'A imagem de pessoa identificável é dado pessoal (LGPD, art. 5º, I).'
    );
  }

  return problemas;
}

const ORDEM_DO_MOMENTO: Record<string, number> = {
  SITUACAO_ENCONTRADA: 0,
  APOS_A_MEDIDA: 1,
};

/**
 * As fotos que vao para o documento: so as ativas, agrupadas por aspecto na
 * ordem da norma, com "situacao encontrada" antes de "apos a medida".
 *
 * `ordemDosAspectos` vem de NR17_ASPECTOS; recebido por parametro para este
 * arquivo nao depender de lib/nr17.
 */
export function evidenciasParaImpressao(
  evidencias: EvidenciaFotografica[] | undefined,
  ordemDosAspectos: string[] = []
): EvidenciaFotografica[] {
  const posicao = (aspecto?: string) => {
    const i = ordemDosAspectos.indexOf(String(aspecto || ''));
    return i === -1 ? ordemDosAspectos.length : i;
  };
  return (Array.isArray(evidencias) ? evidencias : [])
    .filter((e) => e?.situacao === 'ATIVA' && Boolean(e?.path))
    .slice()
    .sort((a, b) =>
      posicao(a.aspecto) - posicao(b.aspecto)
      || (ORDEM_DO_MOMENTO[a.momento] ?? 9) - (ORDEM_DO_MOMENTO[b.momento] ?? 9)
      || String(a.registrada_em).localeCompare(String(b.registrada_em))
    );
}

/**
 * Aspectos com foto da situacao encontrada e SEM foto apos a medida.
 *
 * Nao e pendencia normativa - a NR-17 nao exige foto - e por isso nao sai no
 * documento. Sai na tela, porque e o caso em que a foto trabalha CONTRA o
 * cliente: documenta o problema sem documentar a correcao.
 */
export function aspectosSemFotoDaCorrecao(evidencias: EvidenciaFotografica[] | undefined): string[] {
  const ativas = (Array.isArray(evidencias) ? evidencias : []).filter((e) => e?.situacao === 'ATIVA');
  const comProblema = new Set(
    ativas.filter((e) => e.momento === 'SITUACAO_ENCONTRADA').map((e) => String(e.aspecto || ''))
  );
  const comCorrecao = new Set(
    ativas.filter((e) => e.momento === 'APOS_A_MEDIDA').map((e) => String(e.aspecto || ''))
  );
  return Array.from(comProblema).filter((a) => !comCorrecao.has(a));
}

function encerrar(
  evidencia: EvidenciaFotografica,
  situacao: SituacaoDaEvidencia,
  motivo: string,
  autor: string,
  quando: string
): EvidenciaFotografica {
  return {
    ...evidencia,
    situacao,
    encerrada_em: quando,
    encerrada_por_nome: autor,
    motivo_encerramento: motivo,
  };
}

/**
 * Troca uma foto por outra. A antiga continua guardada, marcada como
 * substituida e apontando para a nova: a trilha mostra o que mudou.
 */
export function substituirEvidencia(
  evidencias: EvidenciaFotografica[] | undefined,
  idAntiga: string,
  nova: EvidenciaFotografica,
  motivo: string,
  autor: string,
  quando: string
): { ok: boolean; motivo: string; evidencias: EvidenciaFotografica[] } {
  const lista = Array.isArray(evidencias) ? evidencias : [];
  const antiga = lista.find((e) => e.id === idAntiga);
  if (!antiga) return { ok: false, motivo: 'Foto não encontrada.', evidencias: lista };
  if (antiga.situacao !== 'ATIVA') {
    return { ok: false, motivo: 'Só se substitui uma foto ativa.', evidencias: lista };
  }
  if (!String(motivo || '').trim()) {
    return { ok: false, motivo: 'Diga por que a foto está sendo trocada.', evidencias: lista };
  }
  return {
    ok: true,
    motivo: '',
    evidencias: [
      ...lista.map((e) => (
        e.id === idAntiga
          ? { ...encerrar(e, 'SUBSTITUIDA', motivo.trim(), autor, quando), substituida_por: nova.id }
          : e
      )),
      { ...nova, situacao: 'ATIVA' as const },
    ],
  };
}

/**
 * Descarta uma foto: o ARQUIVO sai, o REGISTRO fica.
 *
 * Existe para o caso em que guardar a imagem e o problema - um rosto
 * identificavel, a foto de outra empresa. O hash, quem registrou, quem
 * descartou, quando e por que continuam na AEP; so o caminho do arquivo e
 * apagado, e e devolvido para quem chama remover do armazenamento.
 */
export function descartarEvidencia(
  evidencias: EvidenciaFotografica[] | undefined,
  id: string,
  motivo: string,
  autor: string,
  quando: string
): { ok: boolean; motivo: string; caminhoARemover: string; evidencias: EvidenciaFotografica[] } {
  const lista = Array.isArray(evidencias) ? evidencias : [];
  const alvo = lista.find((e) => e.id === id);
  if (!alvo) return { ok: false, motivo: 'Foto não encontrada.', caminhoARemover: '', evidencias: lista };
  if (alvo.situacao === 'DESCARTADA') {
    return { ok: false, motivo: 'Esta foto já foi descartada.', caminhoARemover: '', evidencias: lista };
  }
  if (!String(motivo || '').trim()) {
    return { ok: false, motivo: 'Diga por que a foto está sendo descartada.', caminhoARemover: '', evidencias: lista };
  }
  return {
    ok: true,
    motivo: '',
    caminhoARemover: alvo.path,
    evidencias: lista.map((e) => (
      e.id === id ? { ...encerrar(e, 'DESCARTADA', motivo.trim(), autor, quando), path: '' } : e
    )),
  };
}

/** Resultado da conferencia feita na hora de emitir o documento. */
export interface ImagemParaImpressao {
  /** data URL da reproducao reduzida, pronta para o PDF. Vazio = indisponivel. */
  dataUrl: string;
  formato: 'JPEG' | 'PNG';
  larguraPx: number;
  alturaPx: number;
  /**
   * O arquivo baixado na emissao tem o mesmo hash do registro?
   * null = nao foi possivel baixar para conferir.
   */
  hashConfere: boolean | null;
}

function dataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso || 'data não registrada';
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} `
    + `${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

/**
 * Legenda impressa sob a foto.
 *
 * Diz "registrada em", e nao "tirada em": o sistema sabe quando o arquivo
 * chegou, nao quando a foto foi feita. E diz o resultado da conferencia de
 * integridade feita NA EMISSAO - se o arquivo guardado nao bate com o hash,
 * o documento diz isso em vez de imprimir a foto como se estivesse tudo bem.
 */
export function legendaDeImpressao(
  evidencia: EvidenciaFotografica,
  rotuloDoAspecto: string,
  imagem?: ImagemParaImpressao | null
): string[] {
  const linhas: string[] = [];
  linhas.push(
    `${rotuloDoMomento(evidencia.momento).toUpperCase()}`
    + (rotuloDoAspecto ? ` · ${rotuloDoAspecto}` : '')
  );
  linhas.push(String(evidencia.legenda || '').trim() || 'Sem legenda.');
  linhas.push(
    `Registrada em ${dataHora(evidencia.registrada_em)} por `
    + `${String(evidencia.registrada_por_nome || '').trim() || 'autor não registrado'}.`
  );
  if (evidencia.local_do_registro) {
    const l = evidencia.local_do_registro;
    linhas.push(
      `Aparelho em ${l.latitude.toFixed(5)}, ${l.longitude.toFixed(5)} `
      + `(± ${Math.round(l.precisao_metros)} m) no momento do registro.`
    );
  }
  linhas.push(`SHA-256 do original: ${evidencia.sha256}`);

  if (!imagem || imagem.hashConfere === null) {
    linhas.push('Integridade NÃO VERIFICADA nesta emissão: o arquivo não pôde ser baixado.');
  } else if (imagem.hashConfere) {
    linhas.push('Integridade conferida nesta emissão: o arquivo guardado tem o hash acima.');
  } else {
    linhas.push(
      'INTEGRIDADE NÃO CONFERE: o arquivo guardado NÃO tem o hash registrado. '
      + 'Esta imagem não deve ser usada como prova sem apuração.'
    );
  }
  return linhas;
}

/** Cabe a imagem numa caixa, sem distorcer. Medidas em mm. */
export function caixaDaImagem(
  larguraPx: number,
  alturaPx: number,
  larguraMaxima: number,
  alturaMaxima: number
): { largura: number; altura: number } {
  const w = Number(larguraPx) > 0 ? Number(larguraPx) : 4;
  const h = Number(alturaPx) > 0 ? Number(alturaPx) : 3;
  const escala = Math.min(larguraMaxima / w, alturaMaxima / h);
  return { largura: w * escala, altura: h * escala };
}

/**
 * Baixa, confere e reduz as fotos antes de emitir o documento.
 *
 * O gerador de PDF e sincrono; baixar do armazenamento privado nao e. Esta
 * etapa roda antes e entrega ao gerador so o que ele precisa. As duas
 * operacoes que dependem do navegador - baixar e reduzir - chegam por
 * parametro, para o teste poder rodar sem navegador.
 *
 * A reducao e so para o PDF nao pesar 50 MB: o hash conferido e o do ARQUIVO
 * ORIGINAL, e o documento diz que a imagem impressa e reproducao reduzida.
 */
export async function prepararImagensParaImpressao(
  evidencias: EvidenciaFotografica[],
  baixar: (path: string) => Promise<ArrayBuffer | null>,
  reduzir: (bytes: ArrayBuffer, mime: string) => Promise<{
    dataUrl: string;
    formato: 'JPEG' | 'PNG';
    larguraPx: number;
    alturaPx: number;
  } | null>
): Promise<Record<string, ImagemParaImpressao>> {
  const resultado: Record<string, ImagemParaImpressao> = {};

  for (const ev of Array.isArray(evidencias) ? evidencias : []) {
    const indisponivel: ImagemParaImpressao = {
      dataUrl: '', formato: 'JPEG', larguraPx: 0, alturaPx: 0, hashConfere: null,
    };
    let bytes: ArrayBuffer | null = null;
    try {
      bytes = await baixar(ev.path);
    } catch {
      bytes = null;
    }
    if (!bytes) {
      resultado[ev.id] = indisponivel;
      continue;
    }

    let hashConfere: boolean | null = null;
    try {
      hashConfere = (await sha256Hex(bytes)) === String(ev.sha256 || '').toLowerCase();
    } catch {
      hashConfere = null;
    }

    let reduzida: Awaited<ReturnType<typeof reduzir>> = null;
    try {
      reduzida = await reduzir(bytes, ev.mime);
    } catch {
      reduzida = null;
    }

    resultado[ev.id] = reduzida
      ? { ...reduzida, hashConfere }
      : { ...indisponivel, hashConfere };
  }

  return resultado;
}

/** Texto unico que abre as fotos no documento, explicando o que o hash prova. */
export const NOTA_SOBRE_AS_FOTOGRAFIAS =
  'As fotografias abaixo são reproduções reduzidas. Os arquivos originais estão guardados no sistema, '
  + 'e o hash SHA-256 impresso sob cada uma foi calculado sobre o original no momento do registro. '
  + 'Coincidência de hash demonstra que o arquivo guardado é o mesmo registrado naquela data '
  + '(autenticação eletrônica, CPC, art. 422, § 1º). Não demonstra quando nem onde a foto foi tirada: '
  + 'por isso a legenda informa a data do REGISTRO, e a posição, quando houver, é a do aparelho no '
  + 'momento do registro.';
