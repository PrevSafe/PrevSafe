/**
 * Conversor minimo de Markdown para HTML, suficiente para o formato das atas
 * (titulos, listas, tabelas, negrito, italico e regras). Escapa o texto antes
 * de tudo: o conteudo vem de um LLM e nao e confiavel por definicao.
 *
 * Extensoes proprias, sem equivalente no Markdown padrao:
 * - "::assinaturas" ... "::" -> bloco de linhas de assinatura (ver ata.ts).
 *   Cada linha e um assinante; "nome||papel" gera duas linhas empilhadas
 *   dentro do mesmo quadro (nome e depois o papel por extenso).
 * - "::rodape::texto" -> paragrafo de rodape do documento, em italico.
 * - "::logotipo::texto" -> paragrafo reservado para o logotipo do cliente.
 * - "::titulo::texto" / "::subtitulo::texto" -> cabecalho centralizado do documento.
 * - "::tituloTabela::texto" -> titulo centralizado acima de uma tabela.
 * - "| ::grupo:: texto |" dentro de uma tabela -> linha de agrupamento em
 *   negrito ocupando todas as colunas (ex.: "Titular" / "Suplente").
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

type Alinhamento = 'right' | 'center' | null;

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
        const partes = l.trim().split('||');
        const conteudo = partes.length > 1
          ? partes.map((parte) => `<span class="rotulo-assinatura-linha">${inline(parte.trim())}</span>`).join('')
          : inline(partes[0]!);
        saida.push(
          `<div class="assinatura-item"><p class="linha-assinatura"></p>` +
          `<p class="rotulo-assinatura">${conteudo}</p></div>`,
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

    const logotipo = l.match(/^::logotipo::(.*)$/);
    if (logotipo) {
      fechar();
      saida.push(`<p class="documento-logotipo">${inline(logotipo[1]!.trim())}</p>`);
      continue;
    }

    const titulo2 = l.match(/^::titulo::(.*)$/);
    if (titulo2) {
      fechar();
      saida.push(`<p class="documento-titulo">${inline(titulo2[1]!.trim())}</p>`);
      continue;
    }

    const subtitulo = l.match(/^::subtitulo::(.*)$/);
    if (subtitulo) {
      fechar();
      saida.push(`<p class="documento-subtitulo">${inline(subtitulo[1]!.trim())}</p>`);
      continue;
    }

    const tituloTabela = l.match(/^::tituloTabela::(.*)$/);
    if (tituloTabela) {
      fechar();
      saida.push(`<p class="documento-titulo-tabela">${inline(tituloTabela[1]!.trim())}</p>`);
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

      if (emTabela && celulas.length === 1 && celulas[0]!.startsWith('::grupo::')) {
        const texto = celulas[0]!.replace(/^::grupo::\s*/, '');
        const colunas = alinhamentos.length || 1;
        saida.push(`<tr class="linha-grupo"><td colspan="${colunas}">${inline(texto)}</td></tr>`);
        continue;
      }

      if (celulas.every((c) => /^:?-{2,}:?$/.test(c))) {
        alinhamentos = celulas.map((c) => {
          const direita = c.endsWith(':');
          const esquerda = c.startsWith(':');
          if (direita && esquerda) return 'center';
          return direita ? 'right' : null;
        });
        continue;
      }
      if (!emTabela) {
        saida.push('<table><thead><tr>' + celulas.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>');
        emTabela = true;
        continue;
      }
      saida.push(
        '<tr>' +
        celulas.map((c, i) => `<td${alinhamentos[i] ? ` style="text-align:${alinhamentos[i]}"` : ''}>${inline(c)}</td>`).join('') +
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
