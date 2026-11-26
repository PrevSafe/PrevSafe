import React from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { programasPorId } from '@/lib/programas';

/**
 * Coluna de acesso rapido do painel.
 *
 * Os destinos saem do mesmo catalogo que monta o menu lateral
 * (lib/programas.ts), entao rotulo, icone e codigo sao sempre os mesmos que
 * o menu mostra para aquela tela -- e um atalho nao pode apontar para uma
 * tela que o papel do usuario nao alcanca, porque o catalogo ja filtra.
 */
const DESTINOS = [
  'crm-clients',
  'service-orders',
  'sst-engineering',
  'documents',
  'esocial',
  'epi-management',
  'cipa-management',
  'reports',
];

export function AcessoRapido({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { currentRole } = usePrevSafe();
  const telas = programasPorId(DESTINOS, currentRole || '');

  if (telas.length === 0) return null;

  return (
    <aside className="bg-superficie border border-borda rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-borda">
        <h2 className="text-[11px] font-bold tracking-[0.1em] text-tinta-2 uppercase">
          Acesso rápido
        </h2>
      </div>

      {telas.map((tela, i) => {
        const Icone = tela.icon;
        return (
          <button
            key={tela.id}
            onClick={() => onNavigate(tela.id)}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left transition hover:bg-superficie-2 ${
              i < telas.length - 1 ? 'border-b border-borda' : ''
            }`}
          >
            <Icone className="w-4 h-4 text-tinta-2 flex-shrink-0" />
            <span className="flex-1 min-w-0 truncate font-medium text-tinta">{tela.label}</span>
            {tela.code && (
              <span className="text-[11px] font-semibold tabular-nums text-tinta-3 flex-shrink-0">
                {tela.code}
              </span>
            )}
          </button>
        );
      })}
    </aside>
  );
}
