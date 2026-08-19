/**
 * Conversor minimo de Markdown para HTML, suficiente para o formato das atas
 * (titulos, listas, tabelas, negrito, italico e regras). Escapa o texto antes
 * de tudo: o conteudo vem de um LLM e nao e confiavel por definicao.
 *
 * Duas extensoes proprias, sem equivalente no Markdown padrao:
 * - "::assinaturas" ... "::" -> bloco de linhas de assinatura (ver ata.ts).
 * - "::rodape::texto" -> paragrafo de rodape do documento, em italico.
 */
function escapar(texto: string): string {
  return texto
    .replace(/&nbsp;/g, ' ')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const ABRE_MARCADOR = 'zzCIPAxABREzz';
const FECHA_MARCADOR = 'zzCIPAxFIMzz';

/**
 * Sequencias de 3+ underscores sao linhas de preenchimento (assinatura, campos
 * em branco) e precisam sair como texto literal: nunca escapadas com barra
 * invertida (fonte antiga usava underscores escapados para evitar enfase em
 * Markdown padrao, mas este conversor nao interpreta escapes e imprimia a
 * barra invertida) nem quebradas pelas regras de enfase abaixo. Por isso sao
 * extraidas antes de qualquer outro processamento e devolvidas ao final,
 * intactas. O marcador usa um texto improvavel de ocorrer no documento, para
 * nao colidir com numeros legitimos (ex.: "aos 18 dias").
 */
function protegerLinhasDePreenchimento(texto: string): { protegido: string; restaurar: (html: string) => string } {
  const runs: string[] = [];
  const protegido = texto.replace(/(?:\\_){3,}|_{3,}/g, (m) => {
    const quantidade = m.startsWith('\\') ? m.length / 2 : m.length;
    runs.push('_'.repeat(quantidade));
    return `${ABRE_MARCADOR}${runs.length - 1}${FECHA_MARCADOR}`;
  });
  const marcador = new RegExp(`${ABRE_MARCADOR}(\\d+)${FECHA_MARCADOR}`, 'g');
  const restaurar = (html: string) =>
    html.replace(marcador, (_, i: string) => runs[Number(i)]!);
  return { protegido, restaurar };
}

function inline(texto: string): string {
  const { protegido, restaurar } = protegerLinhasDePreenchimento(texto);
  const html = escapar(protegido)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>');
  return restaurar(html);
}

type Alinhamento = 'right' | null;

export function markdownParaHtml(markdown: string): string {
  const saida: string[] = [];
  let emLista = false;
  let emTabela = false;
  let emAssinaturas = false;
  let alinhamentos: Alinhamento[] = [];

  const fechar = () => {
    if (emLista) { saida.push('</ul>'); emLista = false; }
    if (emTabela) { saida.push('</tbody></table>'); emTabela = false; alinhamentos = []; }
  };

  for (const linha of markdown.split('\n')) {
    const l = linha.trimEnd();

    if (l.trim() === '::assinaturas') {
      fechar();
      saida.push('<div class="bloco-assinaturas">');
      emAssinaturas = true;
      continue;
    }
    if (emAssinaturas) {
      if (l.trim() === '::') {
        saida.push('</div>');
        emAssinaturas = false;
      } else if (l.trim()) {
        saida.push(
          `<div class="assinatura-item"><p class="linha-assinatura"></p>` +
          `<p class="rotulo-assinatura">${inline(l.trim())}</p></div>`,
        );
      }
      continue;
    }

    const rodape = l.match(/^::rodape::(.*)$/);
    if (rodape) {
      fechar();
      saida.push(`<p class="documento-rodape">${inline(rodape[1]!.trim())}</p>`);
      continue;
    }

    if (!l.trim()) { fechar(); continue; }

    const titulo = l.match(/^(#{1,4})\s+(.*)$/);
    if (titulo) {
      fechar();
      const nivel = titulo[1]!.length;
      saida.push(`<h${nivel}>${inline(titulo[2]!)}</h${nivel}>`);
      continue;
    }

    if (/^([-*_])\1{2,}$/.test(l.trim())) { fechar(); saida.push('<hr />'); continue; }

    if (/^\s*[-*]\s+/.test(l)) {
      if (emTabela) fechar();
      if (!emLista) { saida.push('<ul>'); emLista = true; }
      saida.push(`<li>${inline(l.replace(/^\s*[-*]\s+/, ''))}</li>`);
      continue;
    }

    if (l.trim().startsWith('|')) {
      const celulas = l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      if (celulas.every((c) => /^:?-{2,}:?$/.test(c))) {
        alinhamentos = celulas.map((c) => (c.endsWith(':') ? 'right' : null));
        continue;
      }
      if (!emTabela) {
        saida.push('<table><thead><tr>' + celulas.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>');
        emTabela = true;
        continue;
      }
      saida.push(
        '<tr>' +
        celulas.map((c, i) => `<td${alinhamentos[i] === 'right' ? ' style="text-align:right"' : ''}>${inline(c)}</td>`).join('') +
        '</tr>',
      );
      continue;
    }

    fechar();
    saida.push(`<p>${inline(l)}</p>`);
  }

  fechar();
  return saida.join('\n');
}
