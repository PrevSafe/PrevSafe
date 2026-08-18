import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

type TipoVoto = 'NOMINAL' | 'BRANCO' | 'NULO';

type Corpo = {
  origem: 'LINK_MAGICO' | 'QR_CODE';
  tipo_voto: TipoVoto;
  candidato_id?: string | null;
  token?: string;
  eleicao_id?: string;
  cpf?: string;
  nome?: string;
  cargo?: string;
};

const MENSAGENS: Record<string, string> = {
  TOKEN_INVALIDO: 'Este link não é válido. Peça um novo link ao SESMT.',
  TOKEN_EXPIRADO: 'Este link expirou. Peça um novo link ao SESMT.',
  JA_VOTOU: 'Este CPF já votou nesta eleição.',
  VOTO_EM_ANALISE: 'Seu voto já foi enviado e está aguardando conferência da comissão.',
  ELEICAO_NAO_ABERTA: 'A votação ainda não foi liberada.',
  ELEICAO_NAO_INICIADA: 'A votação ainda não começou.',
  ELEICAO_ENCERRADA: 'A votação já foi encerrada.',
  ELEICAO_NAO_ENCONTRADA: 'Eleição não encontrada.',
  CPF_INVALIDO: 'CPF inválido. Confira os números.',
  NOME_INVALIDO: 'Escreva seu nome completo.',
  CANDIDATO_INVALIDO: 'Candidato indisponível. Atualize a página.',
  CANDIDATO_OBRIGATORIO: 'Escolha um candidato para continuar.',
  BRANCO_NAO_PERMITIDO: 'Voto em branco não é aceito nesta eleição.',
  NULO_NAO_PERMITIDO: 'Voto nulo não é aceito nesta eleição.',
  QR_CODE_DESABILITADO: 'A votação por QR Code está desativada nesta eleição.',
};

function codigoDoErro(erro: unknown): string {
  const bruto = typeof erro === 'string' ? erro : (erro as { message?: string })?.message ?? '';
  const achado = bruto.match(/[A-Z][A-Z0-9_]{3,}/);
  return achado ? achado[0] : 'ERRO_DESCONHECIDO';
}

function mensagemDoErro(erro: unknown): string {
  const codigo = codigoDoErro(erro);
  return MENSAGENS[codigo] ?? 'Não foi possível concluir. Tente novamente em instantes.';
}

function somenteDigitos(valor: string): string {
  return (valor || '').replace(/\D/g, '');
}

/** Mesma regra do app.cpf_valido() no banco. Valida antes de gastar rede. */
function cpfValido(valor: string): boolean {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (ate: number) => {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(cpf[i]) * (ate + 1 - i);
    const resto = 11 - (soma % 11);
    return resto >= 10 ? 0 : resto;
  };
  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

/**
 * Única porta do PWA que precisa de servidor: é aqui que se enxerga o IP real
 * do dispositivo via `x-forwarded-for`. O browser não tem como ler esse header
 * sobre si mesmo, e a RPC trata `p_ip` como parâmetro confiável — nunca aceitar
 * IP vindo do corpo da requisição.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, mensagem: 'Método não permitido.' });
    return;
  }

  const corpo = req.body as Corpo;
  if (!corpo || typeof corpo !== 'object') {
    res.status(400).json({ ok: false, mensagem: 'Requisição inválida.' });
    return;
  }

  if (corpo.origem === 'QR_CODE' && !cpfValido(corpo.cpf ?? '')) {
    res.status(422).json({ ok: false, codigo: 'CPF_INVALIDO', mensagem: mensagemDoErro('CPF_INVALIDO') });
    return;
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const encaminhado = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(encaminhado) ? encaminhado[0] : encaminhado)?.split(',')[0]?.trim()
    ?? (Array.isArray(req.headers['x-real-ip']) ? req.headers['x-real-ip'][0] : req.headers['x-real-ip'])
    ?? null;
  const userAgent = (req.headers['user-agent'] as string | undefined)?.slice(0, 400) ?? null;
  const tipo: TipoVoto = corpo.tipo_voto ?? 'NOMINAL';
  const candidato = tipo === 'NOMINAL' ? corpo.candidato_id ?? null : null;

  const { data, error } =
    corpo.origem === 'LINK_MAGICO'
      ? await supabase.rpc('cipa_registrar_voto_link', {
          p_token: corpo.token,
          p_tipo_voto: tipo,
          p_candidato_id: candidato,
          p_ip: ip,
          p_user_agent: userAgent,
        })
      : await supabase.rpc('cipa_registrar_voto_qr', {
          p_eleicao_id: corpo.eleicao_id,
          p_cpf: somenteDigitos(corpo.cpf ?? ''),
          p_nome: corpo.nome?.trim(),
          p_cargo: corpo.cargo?.trim() || null,
          p_tipo_voto: tipo,
          p_candidato_id: candidato,
          p_ip: ip,
          p_user_agent: userAgent,
        });

  if (error) {
    res.status(422).json({ ok: false, codigo: codigoDoErro(error), mensagem: mensagemDoErro(error) });
    return;
  }

  res.status(200).json({ ok: true, resultado: data });
}
