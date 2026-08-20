import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

type Papel = 'admin' | 'tecnico' | 'inspetor' | 'leitura';
const PAPEIS: Papel[] = ['admin', 'tecnico', 'inspetor', 'leitura'];

type Corpo = {
  acao: 'criar' | 'resetar_senha';
  empresa_id?: string;
  nome?: string;
  email?: string;
  senha?: string;
  papel?: Papel;
  usuario_id?: string;
  senha_nova?: string;
};

function senhaValida(senha: unknown): senha is string {
  return typeof senha === 'string' && senha.length >= 8;
}

function textoValido(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim().length > 0;
}

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

  if (!textoValido(corpo.empresa_id)) {
    res.status(400).json({ ok: false, mensagem: 'empresa_id é obrigatório.' });
    return;
  }

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!token) {
    res.status(401).json({ ok: false, mensagem: 'Não autenticado.' });
    return;
  }

  const url = process.env.VITE_SUPABASE_URL!;
  const supabaseAnon = createClient(url, process.env.VITE_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
  if (userError || !userData?.user) {
    res.status(401).json({ ok: false, mensagem: 'Não autenticado.' });
    return;
  }

  const supabaseAdmin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: vinculoChamador } = await supabaseAdmin
    .from('usuarios_empresas')
    .select('papel')
    .eq('usuario_id', userData.user.id)
    .eq('empresa_id', corpo.empresa_id)
    .maybeSingle();

  if (vinculoChamador?.papel !== 'admin') {
    res.status(403).json({ ok: false, mensagem: 'Apenas administradores podem gerenciar usuários.' });
    return;
  }

  if (corpo.acao === 'criar') {
    if (!textoValido(corpo.nome) || !textoValido(corpo.email)) {
      res.status(400).json({ ok: false, mensagem: 'Informe nome e e-mail.' });
      return;
    }
    if (!corpo.papel || !PAPEIS.includes(corpo.papel)) {
      res.status(400).json({ ok: false, mensagem: 'Papel inválido.' });
      return;
    }
    if (!senhaValida(corpo.senha)) {
      res.status(400).json({ ok: false, mensagem: 'A senha precisa ter ao menos 8 caracteres.' });
      return;
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: corpo.email.trim().toLowerCase(),
      password: corpo.senha,
      email_confirm: true,
      user_metadata: { nome: corpo.nome.trim(), empresa_id: corpo.empresa_id, papel: corpo.papel },
    });

    if (error) {
      const mensagem = /already.*registered|already.*exists/i.test(error.message)
        ? 'Já existe uma conta com este e-mail.'
        : 'Não foi possível criar o usuário. Tente novamente.';
      res.status(422).json({ ok: false, mensagem });
      return;
    }

    res.status(200).json({ ok: true, usuario_id: data.user.id });
    return;
  }

  if (corpo.acao === 'resetar_senha') {
    if (!textoValido(corpo.usuario_id)) {
      res.status(400).json({ ok: false, mensagem: 'usuario_id é obrigatório.' });
      return;
    }
    if (!senhaValida(corpo.senha_nova)) {
      res.status(400).json({ ok: false, mensagem: 'A senha precisa ter ao menos 8 caracteres.' });
      return;
    }

    const { data: vinculoAlvo } = await supabaseAdmin
      .from('usuarios_empresas')
      .select('id')
      .eq('usuario_id', corpo.usuario_id)
      .eq('empresa_id', corpo.empresa_id)
      .maybeSingle();

    if (!vinculoAlvo) {
      res.status(403).json({ ok: false, mensagem: 'Este usuário não pertence à sua empresa.' });
      return;
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(corpo.usuario_id, {
      password: corpo.senha_nova,
    });

    if (error) {
      res.status(422).json({ ok: false, mensagem: 'Não foi possível redefinir a senha. Tente novamente.' });
      return;
    }

    res.status(200).json({ ok: true });
    return;
  }

  res.status(400).json({ ok: false, mensagem: 'Ação inválida.' });
}
