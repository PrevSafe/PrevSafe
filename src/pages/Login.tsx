import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const { entrar, recuperarSenha } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setEnviando(true);
    try {
      await entrar(email, senha);
      navigate('/documentos', { replace: true });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setEnviando(false);
    }
  }

  async function handleRecuperar() {
    setErro(null);
    setAviso(null);
    if (!email) {
      setErro('Informe seu e-mail no campo acima para receber o link de redefinição.');
      return;
    }
    try {
      await recuperarSenha(email);
      setAviso('Se este e-mail estiver cadastrado, você receberá um link em instantes.');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro inesperado.');
    }
  }

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen flex flex-col items-center justify-center p-margin-mobile md:p-margin-desktop relative">
      <div className="absolute inset-0 bg-surface/90 backdrop-blur-sm z-0" />

      <main className="w-full max-w-[400px] z-10 flex flex-col bg-surface-container-lowest rounded-xl border border-surface-container-high shadow-sm p-lg relative">
        <header className="flex flex-col items-center mb-xl">
          <div className="h-32 w-32 mb-xs flex items-center justify-center rounded-xl bg-primary text-on-primary">
            <span className="text-headline-lg font-bold tracking-tight">PrevSafe</span>
          </div>
          <p className="text-body-md text-on-surface-variant text-center">
            Acesse sua conta para iniciar as vistorias
          </p>
        </header>

        <form className="flex flex-col gap-lg w-full" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-base">
            <label className="text-label-md text-on-surface" htmlFor="email">
              E-MAIL
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-on-surface-variant pointer-events-none">
                account_circle
              </span>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                autoFocus
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg py-3 pl-10 pr-3 text-body-md text-on-surface placeholder:text-outline transition-colors duration-200 focus:outline-none focus:border-2 focus:border-primary-container"
              />
            </div>
          </div>

          <div className="flex flex-col gap-base">
            <div className="flex justify-between items-center">
              <label className="text-label-md text-on-surface" htmlFor="senha">
                SENHA
              </label>
              <button
                type="button"
                onClick={handleRecuperar}
                className="text-label-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary-container rounded"
              >
                Esqueci minha senha
              </button>
            </div>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-on-surface-variant pointer-events-none">
                lock
              </span>
              <input
                id="senha"
                name="senha"
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="Sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg py-3 pl-10 pr-10 text-body-md text-on-surface placeholder:text-outline transition-colors duration-200 focus:outline-none focus:border-2 focus:border-primary-container"
              />
              <button
                type="button"
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setMostrarSenha((v) => !v)}
                className="absolute right-3 text-on-surface-variant focus:outline-none flex items-center justify-center p-1 rounded-full hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined">
                  {mostrarSenha ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {erro && (
            <div
              role="alert"
              className="flex items-start gap-2 bg-error-container text-on-error-container rounded-lg px-3 py-2 text-label-md"
            >
              <span className="material-symbols-outlined text-[18px] mt-px">error</span>
              <span>{erro}</span>
            </div>
          )}

          {aviso && (
            <div
              role="status"
              className="flex items-start gap-2 bg-secondary-container text-on-secondary-container rounded-lg px-3 py-2 text-label-md"
            >
              <span className="material-symbols-outlined text-[18px] mt-px">mark_email_read</span>
              <span>{aviso}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-success hover:bg-secondary-fixed-dim disabled:opacity-70 disabled:cursor-not-allowed text-white text-label-md rounded-lg py-4 px-md flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] mt-sm shadow-sm"
          >
            {enviando ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Acessando...
              </>
            ) : (
              <>
                Entrar
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-xl text-center">
          <span className="text-label-sm text-on-surface-variant flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[16px]">contact_support</span>
            Ainda não tem acesso? Solicite ao administrador
          </span>
        </div>
      </main>
    </div>
  );
}
