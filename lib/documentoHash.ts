/**
 * SHA-256 de verdade, e a serializacao canonica do que e assinado.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 *
 * Ate aqui o sistema gerava o "hash SHA-256" dos documentos assim:
 *
 *     Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
 *
 * Sessenta e quatro caracteres hexadecimais aleatorios. Tinham a aparencia
 * exata de um SHA-256 e nao eram hash de coisa nenhuma - nunca passavam pelo
 * conteudo do documento. Esse numero era impresso no papel, entrava na URL do
 * QR code e era o que a pagina publica /validar conferia. A verificacao
 * comparava um numero aleatorio com ele mesmo e respondia que o documento era
 * autentico. Alterar um PGR depois de assinado nao era detectado.
 *
 * POR QUE SINCRONO
 *
 * crypto.subtle.digest do navegador so existe em versao assincrona, e as
 * funcoes de assinatura do contexto sao sincronas (useCallback chamado dentro
 * de setState). Tornar tudo assincrono espalharia mudanca por dezenas de
 * componentes. Entao a implementacao abaixo e a do FIPS 180-4, em TypeScript
 * puro, sincrona - e conferida contra o node:crypto e contra os vetores
 * oficiais do NIST em scripts/verificar-hash.mjs. Um hash que ninguem conferiu
 * e tao pouco confiavel quanto o numero aleatorio que ele substitui.
 *
 * O QUE O HASH GARANTE, E O QUE NAO GARANTE
 *
 * Ele e calculado sobre `conteudoCanonico`, a serializacao deterministica do
 * conteudo que foi apresentado ao signatario. Isso permite provar que o
 * registro guardado e identico ao que foi assinado: /validar recalcula e
 * compara. Nao e assinatura com certificado ICP-Brasil, nao ha carimbo do
 * tempo de terceiro, e nao prova data perante terceiros. Os textos da
 * interface e dos PDFs devem dizer exatamente isso - nem mais.
 */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

/** SHA-256 sobre bytes. Retorna hexadecimal minusculo de 64 caracteres. */
export function sha256Bytes(bytes: Uint8Array): string {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  // Padding do FIPS 180-4: bit 1, zeros, e o comprimento em bits em 64 bits.
  const tamanho = bytes.length;
  const bitsTotais = tamanho * 8;
  const blocos = Math.floor((tamanho + 8) / 64) + 1;
  const buffer = new Uint8Array(blocos * 64);
  buffer.set(bytes);
  buffer[tamanho] = 0x80;

  // O comprimento cabe em 53 bits com seguranca (Number.MAX_SAFE_INTEGER);
  // escrevemos os 8 bytes finais em big-endian.
  const vista = new DataView(buffer.buffer);
  vista.setUint32(buffer.length - 8, Math.floor(bitsTotais / 0x100000000), false);
  vista.setUint32(buffer.length - 4, bitsTotais >>> 0, false);

  const w = new Uint32Array(64);

  for (let bloco = 0; bloco < blocos; bloco++) {
    const base = bloco * 64;

    for (let i = 0; i < 16; i++) w[i] = vista.getUint32(base + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, hh] = h;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }

  let saida = '';
  for (let i = 0; i < 8; i++) saida += h[i].toString(16).padStart(8, '0');
  return saida;
}

/** Codifica em UTF-8 sem depender de TextEncoder (que nao existe em todo runtime). */
function utf8(texto: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(texto);

  const bytes: number[] = [];
  for (let i = 0; i < texto.length; i++) {
    let c = texto.charCodeAt(i);
    if (c < 0x80) {
      bytes.push(c);
    } else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < texto.length) {
      const c2 = texto.charCodeAt(++i);
      c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
      bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return new Uint8Array(bytes);
}

/** SHA-256 de um texto UTF-8. */
export function sha256Hex(texto: string): string {
  return sha256Bytes(utf8(texto));
}

/**
 * Serializacao deterministica do que esta sendo assinado.
 *
 * Determinismo e o ponto: chaves em ordem alfabetica e nenhuma dependencia da
 * ordem em que o objeto foi montado. Sem isso, o mesmo documento produziria
 * hashes diferentes em execucoes diferentes e a verificacao acusaria adulteracao
 * onde nao houve.
 *
 * `undefined` e descartado (como no JSON); `null` e preservado, porque "campo
 * ausente" e "campo vazio" sao coisas diferentes num documento legal.
 */
export function conteudoCanonico(valor: unknown): string {
  if (valor === null) return 'null';

  const tipo = typeof valor;
  if (tipo === 'number') return Number.isFinite(valor as number) ? String(valor) : 'null';
  if (tipo === 'boolean') return String(valor);
  if (tipo === 'string') return JSON.stringify(valor);
  if (tipo === 'undefined' || tipo === 'function') return 'null';

  if (Array.isArray(valor)) {
    return `[${valor.map(item => conteudoCanonico(item)).join(',')}]`;
  }

  const obj = valor as Record<string, unknown>;
  const chaves = Object.keys(obj).filter(k => obj[k] !== undefined).sort();
  return `{${chaves.map(k => `${JSON.stringify(k)}:${conteudoCanonico(obj[k])}`).join(',')}}`;
}

/**
 * Hash do conteudo de um documento. E isto que vai ao papel, ao QR code e ao
 * /validar - e o que /validar recalcula para conferir.
 */
export function hashDoDocumento(conteudo: unknown): string {
  return sha256Hex(conteudoCanonico(conteudo));
}

/**
 * Hash de uma assinatura individual: liga o signatario ao documento e ao
 * momento. Assinaturas diferentes do mesmo documento dao hashes diferentes, e
 * qualquer alteracao em quem assinou, quando ou em que documento muda o valor.
 */
export function hashDaAssinatura(dados: {
  documentoHash: string;
  signerName: string;
  signerDocument?: string;
  signerEmail?: string;
  signedAt: string;
}): string {
  return hashDoDocumento({
    documento: dados.documentoHash,
    nome: dados.signerName,
    documento_signatario: dados.signerDocument || null,
    email: dados.signerEmail || null,
    assinado_em: dados.signedAt,
  });
}

/**
 * Texto curto que acompanha o hash onde ele aparece. Descreve o que a
 * verificacao prova, sem prometer ICP-Brasil nem carimbo do tempo.
 */
export const DECLARACAO_DE_INTEGRIDADE =
  'Assinatura eletrônica simples (Lei 14.063/2020, art. 4º, I). O código SHA-256 acima é calculado ' +
  'sobre o conteúdo do documento e permite conferir, em /validar, que o registro não foi alterado ' +
  'depois de assinado. Não constitui assinatura com certificado ICP-Brasil nem carimbo do tempo.';
