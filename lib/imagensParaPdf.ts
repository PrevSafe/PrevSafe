/**
 * A parte do preparo das fotos que so existe no navegador.
 *
 * lib/evidenciasFotograficas.ts faz a conferencia (baixar, recalcular o hash,
 * comparar) e recebe por parametro as duas operacoes que dependem do
 * navegador. Elas moram aqui, separadas, para a regra continuar testavel fora
 * dele.
 */

import type { ErgonomicAssessment } from '@/types';
import {
  evidenciasParaImpressao,
  prepararImagensParaImpressao,
} from '@/lib/evidenciasFotograficas';
import type { ImagemParaImpressao } from '@/lib/evidenciasFotograficas';
import { downloadEvidencePhoto } from '@/lib/supabaseSync';

/**
 * Lado maior da reproducao impressa. 1600 px numa caixa de 78 mm da ~520 dpi:
 * mais que suficiente para ler o posto, e o PDF nao passa de alguns MB.
 */
const LADO_MAXIMO_PX = 1600;

/**
 * Reduz a imagem para o PDF.
 *
 * So para o documento nao pesar dezenas de MB. O hash conferido e o do
 * arquivo ORIGINAL, e o documento diz que a imagem impressa e reproducao
 * reduzida - a prova e o original guardado.
 */
export async function reduzirParaPdf(
  bytes: ArrayBuffer,
  mime: string
): Promise<{ dataUrl: string; formato: 'JPEG' | 'PNG'; larguraPx: number; alturaPx: number } | null> {
  if (typeof document === 'undefined') return null;

  const url = URL.createObjectURL(new Blob([bytes], { type: mime || 'image/jpeg' }));
  try {
    const imagem = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('imagem ilegível'));
      img.src = url;
    });

    const larguraOriginal = imagem.naturalWidth || imagem.width;
    const alturaOriginal = imagem.naturalHeight || imagem.height;
    if (!larguraOriginal || !alturaOriginal) return null;

    const escala = Math.min(1, LADO_MAXIMO_PX / Math.max(larguraOriginal, alturaOriginal));
    const largura = Math.max(1, Math.round(larguraOriginal * escala));
    const altura = Math.max(1, Math.round(alturaOriginal * escala));

    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // PNG com transparencia viraria fundo preto no JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, largura, altura);
    ctx.drawImage(imagem, 0, 0, largura, altura);

    return {
      dataUrl: canvas.toDataURL('image/jpeg', 0.82),
      formato: 'JPEG',
      larguraPx: largura,
      alturaPx: altura,
    };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Baixa, confere e reduz todas as fotos ativas das avaliacoes informadas.
 *
 * Nunca lanca: foto que nao pode ser baixada volta como indisponivel, e o
 * documento diz isso sob a legenda dela.
 */
export async function prepararFotosDaAEP(
  avaliacoes: ErgonomicAssessment[]
): Promise<Record<string, ImagemParaImpressao>> {
  const fotos = (Array.isArray(avaliacoes) ? avaliacoes : [])
    .flatMap((a) => evidenciasParaImpressao(a?.photo_evidence));
  if (fotos.length === 0) return {};
  try {
    return await prepararImagensParaImpressao(fotos, downloadEvidencePhoto, reduzirParaPdf);
  } catch {
    return {};
  }
}
