type RespostaOtp = { ok: boolean; mensagem?: string };

async function chamarOtp(corpo: Record<string, unknown>): Promise<RespostaOtp> {
  let resposta: Response;
  try {
    resposta = await fetch('/api/cipa/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
  } catch {
    return { ok: false, mensagem: 'Sem conexão com o servidor. Verifique sua internet.' };
  }

  const json = (await resposta.json().catch(() => null)) as RespostaOtp | null;
  if (!json) return { ok: false, mensagem: 'Não foi possível concluir. Tente novamente.' };
  return json;
}

export function solicitarOtp(eleicaoId: string, cpf: string) {
  return chamarOtp({ acao: 'solicitar', eleicao_id: eleicaoId, cpf });
}

export function confirmarOtp(eleicaoId: string, cpf: string, codigo: string) {
  return chamarOtp({ acao: 'confirmar', eleicao_id: eleicaoId, cpf, codigo });
}
