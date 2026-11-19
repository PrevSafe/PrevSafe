/**
 * Mede contraste no navegador, nao por nome de classe.
 *
 * O scripts/contraste.py le cada className isolado e nao enxerga o fundo que
 * vem de um elemento pai -- no site isso e fatal, porque ha secoes escuras
 * legitimas onde texto branco esta certo. Aqui o fundo efetivo vem da arvore
 * real: sobe pelos ancestrais ate achar uma cor opaca, como o olho faz.
 *
 *   node scripts/contraste-navegador.mjs [base]
 */
import { createRequire } from 'node:module';

// O playwright esta instalado fora do projeto, entao e resolvido por require
// em vez de import: o import ESM so olharia o node_modules local.
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PATH || 'playwright'
);

const BASE = process.argv[2] || 'http://localhost:3000';
const ROTAS = ['/', '/servicos', '/para-empresas', '/para-trabalhadores',
               '/contato', '/atualizacoes', '/guia-do-sistema'];

const MEDIR = () => {
  // O Chrome devolve cor em varias sintaxes. Ler os numeros crus como se
  // fossem RGB 0-255 faz um branco translucido em oklab virar quase preto,
  // entao cada sintaxe e convertida de verdade.
  const nums = (s) => (s.match(/-?[\d.]+%?/g) || []).map((v) =>
    v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v));

  const deOklab = (L, a, b, alpha) => {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s2 = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
    const lin = [
       4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s2,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s2,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s2,
    ];
    const g = (u) => {
      u = Math.max(0, Math.min(1, u));
      return 255 * (u <= 0.0031308 ? 12.92 * u : 1.055 * u ** (1 / 2.4) - 0.055);
    };
    return [...lin.map(g), alpha ?? 1];
  };

  const rgb = (s) => {
    if (!s) return [];
    if (s.startsWith('oklab')) {
      const [L, a, b, al] = nums(s);
      return deOklab(L, a, b, al);
    }
    if (s.startsWith('oklch')) {
      const [L, C, h, al] = nums(s);
      const r = (h * Math.PI) / 180;
      return deOklab(L, C * Math.cos(r), C * Math.sin(r), al);
    }
    if (s.startsWith('#')) {
      const h = s.slice(1);
      const w = h.length <= 4 ? 1 : 2;
      const partes = [];
      for (let i = 0; i < h.length; i += w) {
        const t = h.slice(i, i + w);
        partes.push(parseInt(w === 1 ? t + t : t, 16));
      }
      if (partes.length === 4) partes[3] /= 255;
      return partes;
    }
    return nums(s);   // rgb() / rgba()
  };
  const lum = ([r, g, b]) => {
    const c = (u) => { u /= 255; return u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
  };
  const razao = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const sobre = (frente, fundo) => {           // composicao alpha
    const a = frente[3] ?? 1;
    return [0, 1, 2].map((i) => frente[i] * a + fundo[i] * (1 - a));
  };

  // primeiro ancestral com fundo opaco, compondo os translucidos pelo caminho
  const fundoDe = (el) => {
    const pilha = [];
    for (let n = el; n; n = n.parentElement) {
      const c = rgb(getComputedStyle(n).backgroundColor);
      if (c.length < 3) continue;
      const a = c[3] ?? 1;
      if (a === 0) continue;
      pilha.push(c);
      if (a === 1) break;
    }
    pilha.push([255, 255, 255]);
    return pilha.reverse().reduce((acc, c) => sobre(c, acc));
  };

  const achados = [];
  for (const el of document.querySelectorAll('body *')) {
    const texto = [...el.childNodes]
      .filter((n) => n.nodeType === 3).map((n) => n.textContent.trim())
      .join(' ').trim();
    if (!texto) continue;
    const e = getComputedStyle(el);
    if (e.visibility === 'hidden' || e.display === 'none' || +e.opacity === 0) continue;

    // Logotipo e isento: a WCAG 1.4.3 diz que texto que faz parte de uma
    // logomarca ou nome de marca nao tem exigencia de contraste. O verde da
    // PrevSafe e #2FB24A por definicao da identidade visual -- escurecer para
    // passar na medicao seria adulterar a marca, nao corrigir um defeito.
    if (el.closest('[data-logotipo]')) continue;
    const caixa = el.getBoundingClientRect();
    if (caixa.width < 2 || caixa.height < 2) continue;

    const cor = rgb(e.color);
    const frente = sobre(cor, fundoDe(el));
    const r = razao(frente, fundoDe(el));

    // AA: 4.5 normal, 3.0 para texto grande (>=24px, ou >=18.66px em negrito)
    const px = parseFloat(e.fontSize);
    const peso = parseInt(e.fontWeight, 10) || 400;
    const grande = px >= 24 || (px >= 18.66 && peso >= 700);
    const minimo = grande ? 3 : 4.5;
    if (r >= minimo) continue;

    achados.push({
      texto: texto.slice(0, 60),
      tag: el.tagName.toLowerCase(),
      classe: (el.getAttribute('class') || '').slice(0, 90),
      cor: e.color,
      fundo: `rgb(${fundoDe(el).map(Math.round).join(', ')})`,
      razao: +r.toFixed(2),
      minimo,
    });
  }
  return achados;
};

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
let total = 0;

for (const rota of ROTAS) {
  await pagina.goto(BASE + rota, { waitUntil: 'networkidle' });
  await pagina.waitForTimeout(500);

  // Trava: pagina sem CSS passa em qualquer medicao, porque vira preto no
  // branco. Ja aconteceu de o servidor servir HTML apontando para um CSS
  // que nao existia mais, e a medicao dar verde sem medir nada.
  const temEstilo = await pagina.evaluate(() =>
    [...document.styleSheets].some((f) => {
      try { return f.cssRules.length > 0; } catch { return true; }
    })
  );
  if (!temEstilo) {
    console.error(`\nFALHA: ${rota} carregou sem CSS -- medicao invalida.`);
    console.error('Reconstrua e reinicie o servidor antes de confiar no resultado.');
    await navegador.close();
    process.exit(2);
  }

  const achados = await pagina.evaluate(MEDIR);
  if (!achados.length) continue;
  console.log(`\n### ${rota}  (${achados.length})`);
  for (const a of achados) {
    console.log(`  ${a.razao} < ${a.minimo}  ${a.cor} sobre ${a.fundo}`);
    console.log(`     "${a.texto}"`);
    console.log(`     ${a.tag}.${a.classe}`);
  }
  total += achados.length;
}

await navegador.close();
console.log(`\npares abaixo do minimo -> ${total}`);
process.exit(total ? 1 : 0);
