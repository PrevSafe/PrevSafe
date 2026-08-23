import { useEffect, useState, useTransition } from 'react';
import { confirmarOtp, solicitarOtp } from '@/lib/cipa/otp';
import { Botao, Campo } from '@/components/ui/Form';

const COOLDOWN_SEGUNDOS = 60;

/**
 * Passo intermediário da Porta B: confirma que quem digitou o CPF tem
 * acesso ao e-mail cadastrado. Sucesso ou "pular" levam ao mesmo lugar —
 * quem decide se o voto é creditado direto ou vai para quarentena é
 * sempre a RPC no servidor, nunca esta tela.
 */
export function VerificacaoCodigo({
  eleicaoId,
  cpf,
  onVerificado,
  onPular,
}: {
  eleicaoId: string;
  cpf: string;
  onVerificado: () => void;
  onPular: () => void;
}) {
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(COOLDOWN_SEGUNDOS);
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    solicitarOtp(eleicaoId, cpf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  function reenviar() {
    if (cooldown > 0) return;
    setErro(null);
    setCooldown(COOLDOWN_SEGUNDOS);
    solicitarOtp(eleicaoId, cpf);
  }

  function confirmar() {
    if (codigo.length !== 6) {
      setErro('Digite os 6 dígitos do código.');
      return;
    }
    iniciar(async () => {
      const r = await confirmarOtp(eleicaoId, cpf, codigo);
      if (r.ok) {
        onVerificado();
        return;
      }
      setErro(r.mensagem ?? 'Código incorreto.');
    });
  }

  return (
    <div className="mx-auto max-w-[36rem] px-5 py-10">
      <p className="text-label-sm uppercase tracking-wider text-outline">Verificação</p>
      <h1 className="mt-2 text-headline-lg font-extrabold leading-tight text-on-surface">
        Digite o código que enviamos
      </h1>
      <p className="mt-2 text-on-surface-variant">
        Se esse CPF estiver na lista de aptos e tiver e-mail cadastrado, mandamos um código de 6
        dígitos para ele agora. Confira sua caixa de entrada (e o spam).
      </p>

      <div className="mt-8 grid gap-5">
        <Campo
          rotulo="Código de 6 dígitos"
          className="text-center font-mono text-2xl tracking-[0.5em]"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />

        {erro && (
          <p
            role="alert"
            className="rounded-xl bg-error-container px-4 py-3 text-label-md font-medium text-on-error-container"
          >
            {erro}
          </p>
        )}

        <Botao type="button" variante="primario" className="h-16 text-body-lg" carregando={pendente} onClick={confirmar}>
          Confirmar e votar
        </Botao>

        <Botao type="button" variante="secundario" className="h-12 text-label-md" disabled={cooldown > 0} onClick={reenviar}>
          {cooldown > 0 ? `Reenviar código (${cooldown}s)` : 'Reenviar código'}
        </Botao>

        <button
          type="button"
          onClick={onPular}
          className="text-label-sm text-outline underline underline-offset-2"
        >
          Não tenho e-mail cadastrado ou não recebi o código — quero que a comissão confira meu voto
        </button>
      </div>
    </div>
  );
}
