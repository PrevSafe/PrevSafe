/**
 * IP publico do cliente, obtido do servidor.
 *
 * O navegador nao tem acesso ao proprio IP publico. Como ele entra na trilha
 * de auditoria e no carimbo dos documentos assinados, buscamos do servidor uma
 * unica vez por sessao e nunca inventamos um valor: sem resposta, fica vazio e
 * a interface mostra "nao identificado".
 */

let cached: string | null = null;
let inFlight: Promise<string> | null = null;

export async function getClientIp(): Promise<string> {
  if (cached !== null) return cached;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch('/api/client-ip', { cache: 'no-store' });
      const json = await res.json();
      cached = typeof json?.ip === 'string' ? json.ip : '';
    } catch {
      cached = '';
    }
    inFlight = null;
    return cached;
  })();

  return inFlight;
}

/** Ultimo IP conhecido, sem disparar requisicao. Vazio ate a primeira busca. */
export function getCachedClientIp(): string {
  return cached || '';
}

/** Rotulo pronto para a interface e para os PDFs. */
export function formatIpForDisplay(ip?: string): string {
  return ip && ip.trim() ? ip : 'Não identificado';
}
