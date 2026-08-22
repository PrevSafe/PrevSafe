export function Comprovante({
  emAnalise = false, nomeUnidade, titulo,
}: {
  emAnalise?: boolean;
  nomeUnidade: string;
  titulo: string;
}) {
  const agora = new Date().toLocaleString('pt-BR', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
  });

  return (
    <div className="mx-auto flex min-h-dvh max-w-[36rem] flex-col justify-center px-6 py-12">
      <div className="animate-cipa-entrar rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
        <span
          aria-hidden
          className={`grid h-16 w-16 place-items-center rounded-2xl text-3xl text-white
            ${emAnalise ? 'bg-warning' : 'bg-secondary'}`}
        >
          {emAnalise ? '⏳' : '✓'}
        </span>
        <h1 className="mt-6 text-headline-lg font-extrabold leading-tight text-on-surface">
          {emAnalise ? 'Voto enviado para conferência' : 'Voto registrado'}
        </h1>
        <p className="mt-3 text-on-surface-variant">
          {emAnalise
            ? 'A comissão eleitoral vai conferir seu CPF com a lista de funcionários. Você não precisa votar de novo — e não conseguirá votar duas vezes.'
            : 'Seu nome entrou na lista de presença da eleição. Em quem você votou não fica registrado em nenhum lugar.'}
        </p>
        <dl className="mt-8 space-y-3 border-t border-outline-variant pt-6 text-label-md">
          <div className="flex justify-between gap-4">
            <dt className="text-outline">Unidade</dt>
            <dd className="text-right font-medium text-on-surface">{nomeUnidade}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-outline">Eleição</dt>
            <dd className="text-right font-medium text-on-surface">{titulo}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-outline">Data e hora</dt>
            <dd className="text-right font-mono font-medium text-on-surface">{agora}</dd>
          </div>
        </dl>
      </div>
      <p className="mt-8 text-center text-label-sm text-outline">Pode fechar esta página.</p>
    </div>
  );
}
