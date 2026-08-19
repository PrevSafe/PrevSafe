import { useState } from 'react';
import { encerrarEleicao } from '@/lib/cipa/acoes';
import { markdownParaHtml } from '@/lib/cipa/markdown';
import { Botao } from '@/components/ui/Form';
import { Aviso } from './Aviso';

export function GeradorAta({ eleicaoId, ataSalva }: { eleicaoId: string; ataSalva: string | null }) {
  const [markdown, setMarkdown] = useState<string | null>(ataSalva);
  const [carregando, setCarregando] = useState<null | 'ELEICAO' | 'POSSE'>(null);
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null);

  async function gerar(documento: 'ELEICAO' | 'POSSE') {
    setCarregando(documento);
    setAviso(null);
    try {
      const r = await encerrarEleicao(eleicaoId, documento);
      if (!r.ok || !r.markdown) {
        setAviso({ tom: 'erro', texto: r.mensagem || 'Não foi possível gerar a ata.' });
        return;
      }
      setMarkdown(r.markdown);
      setAviso({ tom: 'ok', texto: 'Ata gerada a partir do modelo padrão. Confira antes de assinar.' });
    } catch {
      setAviso({ tom: 'erro', texto: 'Falha de rede ao encerrar a eleição. Tente novamente.' });
    } finally {
      setCarregando(null);
    }
  }

  return (
    <div className="mt-8">
      <div className="nao-imprimir flex flex-wrap gap-3">
        <Botao type="button" variante="primario" disabled={!!carregando} onClick={() => gerar('ELEICAO')}>
          {carregando === 'ELEICAO' ? 'Gerando…' : 'Encerrar e gerar ata de apuração'}
        </Botao>
        <Botao type="button" variante="secundario" disabled={!!carregando} onClick={() => gerar('POSSE')}>
          {carregando === 'POSSE' ? 'Gerando…' : 'Gerar ata de posse'}
        </Botao>
        {markdown && (
          <Botao type="button" variante="secundario" onClick={() => window.print()}>
            Imprimir / salvar em PDF
          </Botao>
        )}
      </div>

      {aviso && <div className="nao-imprimir"><Aviso tom={aviso.tom} texto={aviso.texto} /></div>}

      {markdown && (
        <article
          className="documento-ata mt-6 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-10
            font-serif leading-loose text-[#000] print:text-[11pt] print:leading-relaxed
            [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-left [&_h1]:text-[#000]
            [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-left [&_h2]:text-[#000]
            [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-1 [&_h3]:text-left [&_h3]:text-[#000]
            [&_p]:mb-3 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1
            [&_hr]:my-8 [&_hr]:border-outline-variant
            [&_table]:w-full [&_table]:my-5 [&_table]:text-[11pt] [&_table]:border-collapse
            [&_th]:border-b [&_th]:border-[#000]/50 [&_th]:py-2 [&_th]:text-left [&_th]:font-sans [&_th]:text-label-sm [&_th]:uppercase [&_th]:tracking-wider
            [&_td]:border-b [&_td]:border-[#000]/15 [&_td]:py-2
            [&_.bloco-assinaturas]:grid [&_.bloco-assinaturas]:grid-cols-2 [&_.bloco-assinaturas]:gap-x-12 [&_.bloco-assinaturas]:gap-y-12 [&_.bloco-assinaturas]:mt-10
            [&_.linha-assinatura]:mt-[3cm] [&_.linha-assinatura]:mb-0 [&_.linha-assinatura]:h-0 [&_.linha-assinatura]:border-b [&_.linha-assinatura]:border-[#000]
            [&_.rotulo-assinatura]:mt-2 [&_.rotulo-assinatura]:mb-0 [&_.rotulo-assinatura]:text-center [&_.rotulo-assinatura]:font-sans [&_.rotulo-assinatura]:text-label-sm
            [&_.documento-rodape]:mt-10 [&_.documento-rodape]:text-left [&_.documento-rodape]:text-label-sm [&_.documento-rodape]:italic [&_.documento-rodape]:text-outline [&_.documento-rodape]:font-sans"
          dangerouslySetInnerHTML={{ __html: markdownParaHtml(markdown) }}
        />
      )}

      <p className="nao-imprimir mt-6 max-w-2xl text-label-sm text-outline">
        A ata é preenchida a partir de modelo fixo com os números apurados no banco — a mesma
        eleição gera sempre o mesmo texto. A conferência e a assinatura continuam sendo
        responsabilidade da comissão eleitoral.
      </p>
    </div>
  );
}
