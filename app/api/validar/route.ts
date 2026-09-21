import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl } from '@/lib/supabase';
import { hashDoDocumento } from '@/lib/documentoHash';

export const dynamic = 'force-dynamic';

/**
 * Verificacao publica de autenticidade de documento assinado.
 *
 * E o destino do QR Code impresso no PGR, PCMSO, LTCAT e demais documentos.
 * Quem escaneia normalmente e um auditor ou fiscal, que nao tem login aqui -
 * por isso a rota e publica.
 *
 * Como `prevsafe_records` so e legivel por membros da organizacao, a consulta
 * roda com a service role no servidor. Em troca, a resposta e deliberadamente
 * minima: confirma o que o documento afirma, e nada alem disso.
 *
 * O que NAO sai daqui: CPF completo dos signatarios, e-mail, telefone, IP,
 * a trilha de auditoria e qualquer dado do cliente alem da razao social que
 * ja consta na capa do documento. Sem o par numero + hash correto, nao ha
 * resposta - a rota nao serve para listar nem para varrer documentos.
 */

/** Mostra so os ultimos digitos: confirma a pessoa sem expor o CPF. */
function maskCpf(cpf?: string): string {
  const digits = (cpf || '').replace(/\D/g, '');
  if (digits.length !== 11) return '';
  return `***.***.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export async function GET(req: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { found: false, message: 'Serviço de verificação indisponível no momento.' },
      { status: 503 }
    );
  }

  const documentNumber = (req.nextUrl.searchParams.get('doc') || '').trim();
  const hash = (req.nextUrl.searchParams.get('hash') || '').trim().toLowerCase();

  if (!documentNumber || !hash || hash.length < 8) {
    return NextResponse.json(
      { found: false, message: 'Informe o número do documento e o código de verificação.' },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from('prevsafe_records')
    .select('data')
    .eq('collection', 'sstSignatures')
    .is('deleted_at', null)
    .filter('data->>document_number', 'eq', documentNumber)
    .limit(5);

  if (error) {
    return NextResponse.json(
      { found: false, message: 'Não foi possível consultar o documento agora. Tente novamente.' },
      { status: 502 }
    );
  }

  // O hash da URL e um prefixo do SHA-256 do documento. Exigir os dois casando
  // impede que so o numero do documento revele a existencia do registro.
  const envelope = (data || [])
    .map(row => row.data as any)
    .find(env => String(env?.document_sha256 || '').toLowerCase().startsWith(hash));

  if (!envelope) {
    return NextResponse.json({
      found: false,
      message: 'Nenhum documento corresponde a este número e código de verificação. Confira os dados ou solicite a via original ao emitente.'
    });
  }

  const signers = (envelope.signers || []).map((s: any) => ({
    name: s?.name || '',
    role_title: s?.role_title || s?.role_description || '',
    professional_council_number: s?.professional_council_number || '',
    cpf_masked: maskCpf(s?.cpf),
    signature_status: s?.signature_status || 'PENDING',
    signed_at: s?.signed_at || null
  }));

  const allSigned = signers.length > 0 && signers.every((s: any) => s.signature_status === 'SIGNED');

  // INTEGRIDADE: recalcula o SHA-256 sobre o conteudo guardado e compara com o
  // que foi publicado no documento.
  //
  // Ate aqui esta rota apenas confirmava que o hash da URL era prefixo do hash
  // guardado - e o hash guardado era um numero aleatorio. A verificacao
  // comparava um numero com ele mesmo e respondia "autentico" para qualquer
  // documento, alterado ou nao.
  const hashRecalculado = hashDoDocumento({
    documento: envelope.document_number,
    titulo: envelope.document_title,
    tipo: envelope.document_type,
    cliente: envelope.client_id,
    referencia: envelope.document_reference_id || null,
    signatarios: (envelope.signers || []).map((sg: any) => ({
      nome: sg?.name,
      documento: sg?.cpf || null,
      email: sg?.email || null,
      papel: sg?.signer_role || null,
    })),
  });

  const integro = hashRecalculado === String(envelope.document_sha256 || '').toLowerCase();

  // Envelopes criados antes da correcao do hash guardam um valor aleatorio, que
  // nunca vai bater. Nao da para afirmar que foram adulterados nem que estao
  // integros - so que nao sao verificaveis, e e isso que a resposta diz.

  return NextResponse.json({
    found: true,
    integrity: {
      verified: integro,
      status: integro ? 'INTEGRO' : 'NAO_VERIFICAVEL',
      message: integro
        ? 'O conteúdo registrado confere com o código de verificação impresso no documento.'
        : 'Não foi possível confirmar a integridade deste registro. Ele pode ter sido emitido antes da ' +
          'correção do cálculo de verificação, ou ter sido alterado. Solicite a via original ao emitente.',
      note: 'Assinatura eletrônica simples (Lei 14.063/2020, art. 4º, I). Não constitui assinatura com ' +
            'certificado ICP-Brasil nem carimbo do tempo.'
    },
    document: {
      number: envelope.document_number,
      title: envelope.document_title,
      type: envelope.document_type,
      client_name: envelope.client_name,
      sha256: envelope.document_sha256,
      legal_framework: envelope.legal_framework,
      status: envelope.status,
      fully_signed: allSigned,
      created_at: envelope.created_at,
      expires_at: envelope.expires_at || null,
      signers
    }
  });
}
