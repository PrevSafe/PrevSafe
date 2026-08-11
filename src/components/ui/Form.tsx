import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const BASE_CAMPO =
  'w-full rounded-lg border bg-surface-container-lowest h-12 px-4 text-body-md text-on-surface placeholder:text-outline transition-colors focus:outline-none focus:border-2 focus:border-primary-container';

/** Bloco de seção do formulário, com ícone e título. */
export function Secao({
  icone,
  titulo,
  children,
}: {
  icone: string;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-4 border border-outline-variant/40">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-primary-container text-[20px]">
          {icone}
        </span>
        <h3 className="text-title-lg text-primary-container">{titulo}</h3>
      </div>
      {children}
    </section>
  );
}

type CampoProps = InputHTMLAttributes<HTMLInputElement> & {
  rotulo: string;
  erro?: string;
  dica?: string;
  sufixoIcone?: string;
};

export function Campo({ rotulo, erro, dica, sufixoIcone, className = '', ...props }: CampoProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-label-md text-on-surface" htmlFor={props.id ?? props.name}>
        {rotulo}
      </label>
      <div className="relative">
        <input
          id={props.id ?? props.name}
          className={`${BASE_CAMPO} ${sufixoIcone ? 'pr-10' : ''} ${
            erro ? 'border-error' : 'border-outline-variant'
          } ${className}`}
          {...props}
        />
        {sufixoIcone && (
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">
            {sufixoIcone}
          </span>
        )}
      </div>
      {erro ? (
        <p className="text-label-sm text-error">{erro}</p>
      ) : dica ? (
        <p className="text-label-sm text-outline italic">{dica}</p>
      ) : null}
    </div>
  );
}

type SeletorProps = SelectHTMLAttributes<HTMLSelectElement> & {
  rotulo: string;
  erro?: string;
  dica?: string;
  children: ReactNode;
};

export function Seletor({ rotulo, erro, dica, children, className = '', ...props }: SeletorProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-label-md text-on-surface" htmlFor={props.id ?? props.name}>
        {rotulo}
      </label>
      <div className="relative">
        <select
          id={props.id ?? props.name}
          className={`${BASE_CAMPO} appearance-none pr-10 ${
            erro ? 'border-error' : 'border-outline-variant'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
          expand_more
        </span>
      </div>
      {erro ? (
        <p className="text-label-sm text-error">{erro}</p>
      ) : dica ? (
        <p className="text-label-sm text-outline italic">{dica}</p>
      ) : null}
    </div>
  );
}

type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  rotulo: string;
  erro?: string;
};

export function AreaTexto({ rotulo, erro, className = '', ...props }: AreaProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-label-md text-on-surface" htmlFor={props.id ?? props.name}>
        {rotulo}
      </label>
      <textarea
        id={props.id ?? props.name}
        className={`w-full rounded-lg border bg-surface-container-lowest min-h-[80px] p-4 text-body-md text-on-surface placeholder:text-outline resize-none transition-colors focus:outline-none focus:border-2 focus:border-primary-container ${
          erro ? 'border-error' : 'border-outline-variant'
        } ${className}`}
        {...props}
      />
      {erro && <p className="text-label-sm text-error">{erro}</p>}
    </div>
  );
}

export function Botao({
  variante = 'primario',
  icone,
  carregando,
  children,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'secundario' | 'perigo';
  icone?: string;
  carregando?: boolean;
  children: ReactNode;
}) {
  const estilos = {
    primario: 'bg-primary-container text-white hover:opacity-90',
    secundario: 'border border-outline text-on-surface-variant hover:bg-surface-container',
    perigo: 'bg-error text-on-error hover:opacity-90',
  };

  return (
    <button
      className={`h-12 rounded-lg text-label-md flex items-center justify-center gap-2 px-4 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${estilos[variante]} ${className}`}
      disabled={carregando || props.disabled}
      {...(props as object)}
    >
      {carregando ? (
        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
      ) : (
        icone && <span className="material-symbols-outlined text-[18px]">{icone}</span>
      )}
      {children}
    </button>
  );
}
