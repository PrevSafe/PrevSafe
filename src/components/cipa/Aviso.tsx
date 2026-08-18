export function Aviso({ tom, texto }: { tom: 'ok' | 'erro'; texto: string }) {
  return (
    <p
      role="status"
      className={`mt-4 rounded-xl px-4 py-3 text-label-md font-medium ${
        tom === 'ok'
          ? 'bg-secondary-container text-on-secondary-container'
          : 'bg-error-container text-on-error-container'
      }`}
    >
      {texto}
    </p>
  );
}
