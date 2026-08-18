import type { CandidatoCedula } from '@/lib/cipa/types';

/** O número da urna domina o card: é o que o trabalhador reconhece do voto em papel. */
export function CardCandidato({
  candidato, selecionado, aoSelecionar,
}: {
  candidato: CandidatoCedula;
  selecionado: boolean;
  aoSelecionar: () => void;
}) {
  const iniciais = candidato.nome_urna.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  return (
    <button
      type="button"
      onClick={aoSelecionar}
      aria-pressed={selecionado}
      className={`flex w-full items-center gap-4 rounded-2xl border-2 bg-surface-container-lowest p-4 text-left transition
        ${selecionado
          ? 'border-primary shadow-[0_0_0_4px_rgba(0,36,45,0.12)]'
          : 'border-outline-variant hover:border-outline'}`}
    >
      <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface">
        {candidato.foto_url ? (
          <img src={candidato.foto_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-outline">
            {iniciais}
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        {candidato.numero_urna !== null && (
          <span className="block font-mono text-3xl font-bold leading-none tracking-tight text-on-surface">
            {String(candidato.numero_urna).padStart(2, '0')}
          </span>
        )}
        <span className="mt-1 block truncate text-title-lg font-bold leading-tight text-on-surface">
          {candidato.nome_urna}
        </span>
        {candidato.cargo && (
          <span className="mt-0.5 block truncate text-label-md text-on-surface-variant">
            {candidato.cargo}{candidato.setor ? ` · ${candidato.setor}` : ''}
          </span>
        )}
      </span>

      <span
        aria-hidden
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-white
          ${selecionado ? 'border-primary bg-primary' : 'border-outline-variant'}`}
      >
        {selecionado ? '✓' : ''}
      </span>
    </button>
  );
}
