import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomInt, createHash } from 'node:crypto';
import { Resend } from 'resend';

type Corpo = {
  acao: 'solicitar' | 'confirmar';
  eleicao_id?: string;
  cpf?: string;
  codigo?: string;
};

type RespostaConfirmar = { ok: boolean; mensagem?: string };

const JANELA_EXPIRACAO_MIN = 10;
const COOLDOWN_SEGUNDOS = 60;
const LIMITE_TENTATIVAS = 5;

function somenteDigitos(valor: string): string {
  return (valor || '').replace(/\D/g, '');
}

function textoValido(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim().length > 0;
}

function gerarCodigo(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function hashCodigo(codigo: string): string {
  return createHash('sha256').update(codigo).digest('hex');
}

/**
 * Não revela ao chamador se o CPF é elegível, tem e-mail cadastrado ou já
 * votou — a mesma resposta genérica é devolvida em todos os casos (mesmo
 * princípio anti-oráculo do restante da votação). Erros são só logados.
 */
async function tratarSolicitacao(
  supabaseAdmin: SupabaseClient,
  eleicaoId: string,
  cpf: string
): Promise<void> {
  try {
    const { data: eleitor } = await supabaseAdmin
      .from('eleicao_eleitores')
      .select('email, status_voto')
      .eq('eleicao_id', eleicaoId)
      .eq('cpf', cpf)
      .maybeSingle();

    if (!eleitor?.email || eleitor.status_voto) return;

    const { data: eleicao } = await supabaseAdmin
      .from('eleicoes')
      .select('status, permite_qr_code, data_inicio, data_fim')
      .eq('id', eleicaoId)
      .maybeSingle();

    if (!eleicao || eleicao.status !== 'ABERTA' || !eleicao.permite_qr_code) return;
    const agora = Date.now();
    if (agora < new Date(eleicao.data_inicio).getTime() || agora > new Date(eleicao.data_fim).getTime()) return;

    const { data: pendente } = await supabaseAdmin
      .from('cipa_otp_qr')
      .select('criado_em')
      .eq('eleicao_id', eleicaoId)
      .eq('cpf', cpf)
      .maybeSingle();

    if (pendente && Date.now() - new Date(pendente.criado_em).getTime() < COOLDOWN_SEGUNDOS * 1000) return;

    const codigo = gerarCodigo();
    const agoraIso = new Date().toISOString();
    const expiraEm = new Date(Date.now() + JANELA_EXPIRACAO_MIN * 60 * 1000).toISOString();

    await supabaseAdmin.from('cipa_otp_qr').upsert(
      {
        eleicao_id: eleicaoId,
        cpf,
        codigo_hash: hashCodigo(codigo),
        tentativas: 0,
        expira_em: expiraEm,
        criado_em: agoraIso,
      },
      { onConflict: 'eleicao_id,cpf' }
    );

    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY não configurada — código de OTP não enviado por e-mail.');
      return;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.OTP_EMAIL_REMETENTE ?? 'PrevSafe <votacao@prevsafe.com.br>',
      to: eleitor.email,
      subject: 'Código para confirmar seu voto',
      text: `Seu código de verificação é ${codigo}. Ele expira em ${JANELA_EXPIRACAO_MIN} minutos.\n\nSe você não pediu esse código, ignore este e-mail — ninguém consegue votar no seu lugar só com ele.`,
    });
  } catch (erro) {
    console.error('Falha ao processar solicitação de OTP:', erro);
  }
}

async function tratarConfirmacao(
  supabaseAdmin: SupabaseClient,
  eleicaoId: string,
  cpf: string,
  codigo: string
): Promise<RespostaConfirmar> {
  const { data: desafio } = await supabaseAdmin
    .from('cipa_otp_qr')
    .select('id, codigo_hash, tentativas, expira_em')
    .eq('eleicao_id', eleicaoId)
    .eq('cpf', cpf)
    .maybeSingle();

  if (!desafio || new Date(desafio.expira_em).getTime() < Date.now()) {
    return { ok: false, mensagem: 'Código expirado ou não encontrado. Peça um novo.' };
  }

  if (desafio.tentativas >= LIMITE_TENTATIVAS) {
    await supabaseAdmin.from('cipa_otp_qr').delete().eq('id', desafio.id);
    return { ok: false, mensagem: 'Muitas tentativas erradas. Peça um novo código.' };
  }

  if (hashCodigo(codigo) !== desafio.codigo_hash) {
    await supabaseAdmin
      .from('cipa_otp_qr')
      .update({ tentativas: desafio.tentativas + 1 })
      .eq('id', desafio.id);
    return { ok: false, mensagem: 'Código incorreto.' };
  }

  await supabaseAdmin.from('cipa_otp_qr').delete().eq('id', desafio.id);
  await supabaseAdmin.from('cipa_otp_verificados').upsert(
    {
      eleicao_id: eleicaoId,
      cpf,
      expira_em: new Date(Date.now() + JANELA_EXPIRACAO_MIN * 60 * 1000).toISOString(),
    },
    { onConflict: 'eleicao_id,cpf' }
  );

  return { ok: true };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, mensagem: 'Método não permitido.' });
    return;
  }

  const corpo = req.body as Corpo;
  if (!corpo || typeof corpo !== 'object' || !textoValido(corpo.eleicao_id) || !textoValido(corpo.cpf)) {
    res.status(400).json({ ok: false, mensagem: 'Requisição inválida.' });
    return;
  }

  const cpf = somenteDigitos(corpo.cpf);
  const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (corpo.acao === 'solicitar') {
    await tratarSolicitacao(supabaseAdmin, corpo.eleicao_id!, cpf);
    // Sempre a mesma resposta, elegível ou não — não vaza quem está na lista.
    res.status(200).json({
      ok: true,
      mensagem: 'Se esse CPF puder votar por este canal, enviamos um código para o e-mail cadastrado.',
    });
    return;
  }

  if (corpo.acao === 'confirmar') {
    if (!textoValido(corpo.codigo)) {
      res.status(400).json({ ok: false, mensagem: 'Informe o código.' });
      return;
    }
    const resultado = await tratarConfirmacao(supabaseAdmin, corpo.eleicao_id!, cpf, corpo.codigo!.trim());
    res.status(resultado.ok ? 200 : 422).json(resultado);
    return;
  }

  res.status(400).json({ ok: false, mensagem: 'Ação inválida.' });
}
