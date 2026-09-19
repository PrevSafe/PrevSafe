import { getSupabaseClient } from '@/lib/supabase';

/**
 * Upload das imagens do site publico.
 *
 * O bucket `prevsafe-site` e publico, ao contrario do de evidencias de campo:
 * capa de artigo aparece em pagina aberta e em cartao de rede social, e URL
 * assinada expiraria, quebrando o compartilhamento e o cache do buscador.
 *
 * Antes de enviar, a imagem e redimensionada no proprio navegador. Isso evita
 * que uma foto de 4 MB vinda do celular entre no site inteira: alem de gastar
 * o armazenamento e a banda do plano, imagem grande deixa a pagina lenta, e
 * lentidao custa posicao no Google.
 */

export const BUCKET_SITE = 'prevsafe-site';

const LARGURA_MAXIMA = 1600;
const QUALIDADE = 0.82;
const TAMANHO_MAXIMO_BYTES = 3 * 1024 * 1024;

export interface ResultadoUpload {
  ok: boolean;
  url?: string;
  caminho?: string;
  mensagem?: string;
  /** Diferença entre o arquivo escolhido e o que foi realmente enviado. */
  reducao?: { de: number; para: number };
}

function extensaoDe(tipo: string): string {
  if (tipo.includes('png')) return 'png';
  if (tipo.includes('webp')) return 'webp';
  if (tipo.includes('avif')) return 'avif';
  if (tipo.includes('svg')) return 'svg';
  return 'jpg';
}

/**
 * Reduz a imagem mantendo a proporcao. SVG passa direto: e vetor, nao tem
 * pixel para redimensionar, e o canvas o rasterizaria.
 */
async function otimizar(file: File): Promise<Blob> {
  if (file.type.includes('svg')) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const escala = Math.min(1, LARGURA_MAXIMA / bitmap.width);
  if (escala === 1 && file.size <= TAMANHO_MAXIMO_BYTES) {
    bitmap.close();
    return file;
  }

  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  // WebP economiza bastante sobre JPEG com qualidade equivalente, e é aceito
  // por todos os navegadores atuais.
  const blob = await new Promise<Blob | null>(res =>
    canvas.toBlob(b => res(b), 'image/webp', QUALIDADE)
  );

  // Se a conversão não ajudou, fica o original: melhor enviar o arquivo
  // conhecido do que um resultado pior.
  return blob && blob.size < file.size ? blob : file;
}

export async function enviarImagemDoSite(
  organizationId: string,
  file: File
): Promise<ResultadoUpload> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, mensagem: 'Supabase não configurado.' };

  if (!file.type.startsWith('image/')) {
    return { ok: false, mensagem: 'Escolha um arquivo de imagem.' };
  }

  const otimizada = await otimizar(file);

  if (otimizada.size > TAMANHO_MAXIMO_BYTES) {
    return {
      ok: false,
      mensagem: `A imagem tem ${(otimizada.size / 1024 / 1024).toFixed(1)} MB, acima do limite de 3 MB. Use uma versão menor.`,
    };
  }

  const ext = extensaoDe(otimizada.type || file.type);
  const caminho = `${organizationId}/site/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET_SITE)
    .upload(caminho, otimizada, { contentType: otimizada.type || file.type, upsert: false });

  if (error) {
    const bruto = error.message || '';
    if (/row-level security|permission/i.test(bruto)) {
      return { ok: false, mensagem: 'Seu usuário não tem permissão para enviar imagens.' };
    }
    if (/exceeded|too large/i.test(bruto)) {
      return { ok: false, mensagem: 'Arquivo acima do limite aceito pelo servidor (3 MB).' };
    }
    return { ok: false, mensagem: `Falha no envio: ${bruto}` };
  }

  const { data } = supabase.storage.from(BUCKET_SITE).getPublicUrl(caminho);

  return {
    ok: true,
    url: data.publicUrl,
    caminho,
    reducao: otimizada.size < file.size ? { de: file.size, para: otimizada.size } : undefined,
  };
}

/** Remove uma imagem do bucket a partir da URL publica. */
export async function removerImagemDoSite(url: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !url) return false;

  const marcador = `/${BUCKET_SITE}/`;
  const i = url.indexOf(marcador);
  if (i === -1) return false; // URL externa: não é nossa para apagar

  const caminho = decodeURIComponent(url.slice(i + marcador.length));
  const { error } = await supabase.storage.from(BUCKET_SITE).remove([caminho]);
  return !error;
}

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
