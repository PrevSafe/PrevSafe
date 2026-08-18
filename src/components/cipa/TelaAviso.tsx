export function TelaAviso({
  tom = 'neutro', titulo, descricao,
}: {
  tom?: 'neutro' | 'atencao' | 'erro';
  titulo: string;
  descricao: string;
}) {
  const cor = tom === 'erro' ? 'bg-error' : tom === 'atencao' ? 'bg-warning' : 'bg-outline';
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-12">
      <span aria-hidden className={`h-2 w-16 rounded-full ${cor}`} />
      <h1 className="mt-6 text-headline-lg font-extrabold leading-tight text-on-surface">{titulo}</h1>
      <p className="mt-3 text-body-lg text-on-surface-variant">{descricao}</p>
      <p className="mt-10 text-label-sm text-outline">
        Em caso de dúvida, procure o SESMT ou a comissão eleitoral da sua empresa.
      </p>
    </div>
  );
}
