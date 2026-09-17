/**
 * Handoff de mensagens para os apps do próprio usuário (sem custo de provedor).
 *
 * O sistema não envia e-mail/WhatsApp por conta própria: ele monta a mensagem e
 * abre o WhatsApp Web/App ou o cliente de e-mail padrão do usuário, já preenchidos.
 * Por isso nunca há confirmação de entrega — o envio final é manual.
 */

export type ShareChannel = 'WHATSAPP' | 'EMAIL';

export interface ShareResult {
  success: boolean;
  message: string;
}

/**
 * Normaliza telefone para o formato aceito pelo wa.me (só dígitos, com DDI).
 * Números brasileiros vêm do cadastro sem DDI (10 ou 11 dígitos com DDD).
 */
export function normalizePhoneForWhatsApp(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null;

  // A leading "+" means the country code is already there (ex.: +1 415 555 2671),
  // which would otherwise be indistinguishable from a BR mobile (also 11 digits).
  if (phone.trim().startsWith('+')) return digits;

  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function buildWhatsAppUrl(phone: string | undefined, message: string): string | null {
  const normalized = normalizePhoneForWhatsApp(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildMailtoUrl(to: string | undefined, subject: string, body: string): string | null {
  const address = to?.trim();
  if (!address) return null;
  return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Monta a mensagem e abre o app do usuário. Retorna o que dizer na tela.
 */
export function shareViaChannel(
  channel: ShareChannel,
  data: { phone?: string; email?: string; subject: string; message: string; recipientName?: string }
): ShareResult {
  const target = data.recipientName ? ` para ${data.recipientName}` : '';

  const url = channel === 'WHATSAPP'
    ? buildWhatsAppUrl(data.phone, data.message)
    : buildMailtoUrl(data.email, data.subject, data.message);

  if (!url) {
    return {
      success: false,
      message: channel === 'WHATSAPP'
        ? 'Não há WhatsApp/telefone válido cadastrado para este destinatário.'
        : 'Não há e-mail cadastrado para este destinatário.',
    };
  }

  if (typeof window === 'undefined') {
    return { success: false, message: 'Ação disponível apenas no navegador.' };
  }

  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened && channel === 'WHATSAPP') {
    // Popup blocker: navigate in the current tab as a fallback
    window.location.href = url;
  }

  return {
    success: true,
    message: channel === 'WHATSAPP'
      ? `WhatsApp aberto${target} com a mensagem pronta. Confira e toque em enviar.`
      : `Seu programa de e-mail foi aberto${target} com a mensagem pronta. Confira e envie.`,
  };
}
