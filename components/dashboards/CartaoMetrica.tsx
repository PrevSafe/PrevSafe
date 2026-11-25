import React from 'react';

/**
 * Cartao de numero do painel, no formato do shell claro: quadro do icone a
 * esquerda, numero e rotulo a direita.
 *
 * Os cinco cartoes do painel eram cinco blocos quase iguais, cada um com a
 * sua copia das classes. Com um componente so, mudar a aparencia e mudar um
 * lugar -- e os cinco nao podem mais divergir entre si por descuido.
 */
export type TomDoCartao = 'marca' | 'teal' | 'ambar' | 'neutro';

const TONS: Record<TomDoCartao, string> = {
  marca: 'bg-marca-suave text-marca-escura border-marca-borda',
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  ambar: 'bg-amber-50 text-amber-800 border-amber-200',
  neutro: 'bg-superficie-2 text-tinta-2 border-borda',
};

export function CartaoMetrica({
  icone: Icone,
  tom = 'marca',
  rotulo,
  valor,
  nota,
  onClick,
  id,
}: {
  icone: React.ComponentType<{ className?: string }>;
  tom?: TomDoCartao;
  rotulo: string;
  valor: React.ReactNode;
  nota?: React.ReactNode;
  onClick?: () => void;
  id?: string;
}) {
  const Elemento = onClick ? 'button' : 'div';

  return (
    <Elemento
      id={id}
      onClick={onClick}
      className={`bg-superficie border border-borda rounded-2xl p-4 flex items-center gap-3.5 text-left w-full transition ${
        onClick ? 'hover:border-borda-forte hover:bg-superficie-2 cursor-pointer' : ''
      }`}
    >
      <span className={`w-10 h-10 rounded-xl border grid place-items-center flex-shrink-0 ${TONS[tom]}`}>
        <Icone className="w-[18px] h-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block text-[25px] leading-none font-bold tabular-nums text-tinta font-titulo">
          {valor}
        </span>
        <span className="block text-xs text-tinta-2 mt-1">{rotulo}</span>
        {nota && <span className="block text-[11px] mt-0.5">{nota}</span>}
      </span>
    </Elemento>
  );
}
