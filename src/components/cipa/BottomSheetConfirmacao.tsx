import { useEffect } from 'react';
import { Botao } from '@/components/ui/Form';

/** A faixa listrada é a marcação de piso que delimita zona de risco. Ação irreversível. */
export function BottomSheetConfirmacao({
  titulo, descricao, numero, enviando, erro, aoConfirmar, aoCorrigir,
}: {
  titulo: string;
  descricao?: string | null;
  numero?: number | null;
  enviando: boolean;
  erro: string | null;
  aoConfirmar: () => void;
  aoCorrigir: () => void;
}) {
  useEffect(() => {
    const fechar = (e: KeyboardEvent) => { if (e.key === 'Escape' && !enviando) aoCorrigir(); };
    window.addEventListener('keydown', fechar);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', fechar); document.body.style.overflow = ''; };
  }, [enviando, aoCorrigir]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-inverse-surface/60" onClick={() => !enviando && aoCorrigir()} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirmação do voto"
        className="relative w-full max-w-xl animate-cipa-subir overflow-hidden rounded-t-3xl bg-surface-container-lowest shadow-lg"
      >
        <div className="cipa-faixa-seguranca h-2" aria-hidden />
        <div className="px-6 pb-8 pt-6">
          <p className="text-label-sm uppercase tracking-wider text-outline">Confira antes de confirmar</p>
          <div className="mt-4 flex items-baseline gap-4">
            {numero !== null && numero !== undefined && (
              <span className="font-mono text-5xl font-bold leading-none text-on-surface">
                {String(numero).padStart(2, '0')}
              </span>
            )}
            <span className="text-headline-md font-extrabold leading-tight text-on-surface">{titulo}</span>
          </div>
          {descricao && <p className="mt-2 text-on-surface-variant">{descricao}</p>}
          <p className="mt-5 text-label-sm text-on-surface-variant">
            Depois de confirmar, o voto não pode ser alterado.
          </p>
          {erro && (
            <p role="alert" className="mt-4 rounded-xl bg-error-container px-4 py-3 text-label-md font-medium text-on-error-container">
              {erro}
            </p>
          )}
          <div className="mt-6 grid gap-3">
            <Botao type="button" variante="primario" className="h-16 text-body-lg" onClick={aoConfirmar} disabled={enviando}>
              {enviando ? 'Registrando…' : 'Confirmar voto'}
            </Botao>
            <Botao type="button" variante="secundario" className="h-14 border-warning text-warning" onClick={aoCorrigir} disabled={enviando}>
              Corrigir
            </Botao>
          </div>
        </div>
      </div>
    </div>
  );
}
