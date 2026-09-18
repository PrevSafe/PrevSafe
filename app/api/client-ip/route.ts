import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Devolve o IP publico de quem chamou.
 *
 * O navegador nao consegue ler o proprio IP publico, e o carimbo de
 * autenticidade de um documento assinado (Lei 14.063/2020) e a trilha de
 * auditoria dependem dele. Antes o app gravava um IP fixo inventado, o que e
 * pior do que nao gravar nada: da aparencia de prova a um dado ficticio.
 *
 * Aqui o IP vem dos cabecalhos que o proxy/CDN preenche. Quando nenhum deles
 * existe, a resposta volta vazia e o app registra "nao identificado".
 */
export async function GET(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip =
    forwarded?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    req.headers.get('cf-connecting-ip')?.trim() ||
    '';

  return NextResponse.json(
    { ip },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
