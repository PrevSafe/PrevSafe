#!/usr/bin/env python3
"""
Mede o contraste real entre texto e fundo nas classes Tailwind do projeto.

Le a paleta do proprio tailwindcss (oklch) e os tokens do tema em
app/globals.css, converte tudo para sRGB e calcula a razao de contraste da
WCAG. Para cada className, descobre o fundo em vigor e o texto por cima, e
reporta (ou corrige) o que fica abaixo de 4.5:1.

  python3 scripts/contraste.py            -> so relata
  python3 scripts/contraste.py --corrigir -> troca o tom do texto pelo mais
                                             proximo que passa, mantendo a cor
"""
import math, re, sys, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent

# ---------- cor ----------
def oklch_para_rgb(L, C, h):
    hr = math.radians(h); a = C*math.cos(hr); b = C*math.sin(hr)
    l_ = L + 0.3963377774*a + 0.2158037573*b
    m_ = L - 0.1055613458*a - 0.0638541728*b
    s_ = L - 0.0894841775*a - 1.2914855480*b
    l, m, s = l_**3, m_**3, s_**3
    r =  4.0767416621*l - 3.3077115913*m + 0.2309699292*s
    g = -1.2684380046*l + 2.6097574011*m - 0.3413193965*s
    bb = -0.0041960863*l - 0.7034186147*m + 1.7076147010*s
    def g2(u):
        u = max(0.0, min(1.0, u))
        return 12.92*u if u <= 0.0031308 else 1.055*u**(1/2.4) - 0.055
    return tuple(g2(v) for v in (r, g, bb))

def hex_para_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16)/255 for i in (0, 2, 4))

def luminancia(rgb):
    def c(u):
        return u/12.92 if u <= 0.04045 else ((u+0.055)/1.055)**2.4
    r, g, b = (c(v) for v in rgb)
    return 0.2126*r + 0.7152*g + 0.0722*b

def contraste(a, b):
    la, lb = luminancia(a), luminancia(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi+0.05)/(lo+0.05)

def mistura(frente, fundo, alfa):
    return tuple(frente[i]*alfa + fundo[i]*(1-alfa) for i in range(3))

# ---------- paleta ----------
CORES = {}
tw = (RAIZ/'node_modules/tailwindcss/theme.css').read_text(encoding='utf-8')
for nome, L, C, h in re.findall(r'--color-([a-z]+-\d+):\s*oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)', tw):
    CORES[nome] = oklch_para_rgb(float(L)/100, float(C), float(h))
CORES['white'] = (1.0, 1.0, 1.0)
CORES['black'] = (0.0, 0.0, 0.0)

glob = (RAIZ/'app/globals.css').read_text(encoding='utf-8')
for nome, hx in re.findall(r'--color-([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})', glob):
    CORES[nome] = hex_para_rgb(hx)

PAGINA = CORES.get('fundo', (0.95, 0.96, 0.96))

# Classe sem prefixo de variante. Com o \b solto, 'hover:bg-teal-900' casava
# como se fosse o fundo em repouso, e um texto branco sobre fundo claro
# passava despercebido porque o hover escuro mascarava a medicao.
CLASSE = re.compile(r'(?<![\w:-])(bg|text|from)-([a-z]+(?:-\d+)?(?:-[a-z]+)?)(?:/(\d+))?\b')

def cor_de(nome, alfa, atras):
    base = CORES.get(nome)
    if base is None:
        return None
    return mistura(base, atras, alfa/100) if alfa else base

def analisa(trecho, atras_padrao=PAGINA):
    """Devolve (fundo, [(classe_texto, nome, alfa)]) de um className."""
    fundo, textos = atras_padrao, []
    for tipo, nome, alfa in CLASSE.findall(trecho):
        alfa = int(alfa) if alfa else None
        if tipo in ('bg', 'from'):
            c = cor_de(nome, alfa, atras_padrao)
            if c: fundo = c
        else:
            textos.append((nome, alfa))
    return fundo, textos

def melhor_tom(nome, fundo, alvo=4.5):
    """Mesmo matiz, tom mais claro que ainda passa o contraste."""
    # branco ou tom claro de cinza sobre superficie clara: vira a tinta do tema
    if nome in ('white', 'tinta-3') or re.match(r'(slate|gray|zinc|neutral)-(50|100|200|300)$', nome):
        for alvo_tok in ('tinta', 'tinta-2'):
            if contraste(CORES[alvo_tok], fundo) >= alvo:
                return alvo_tok
        return None
    if luminancia(fundo) < 0.35 and contraste(CORES['white'], fundo) >= alvo:
        return 'white'
    m = re.match(r'([a-z]+)-(\d+)$', nome)
    if not m: return None
    fam = m.group(1)
    for tom in (700, 800, 600, 900, 950):
        cand = f'{fam}-{tom}'
        if cand in CORES and contraste(CORES[cand], fundo) >= alvo:
            return cand
    return None

def bg_mais_escuro(nome, alvo=4.5):
    """Fundo solido que ainda contrasta com texto branco."""
    m = re.match(r'([a-z]+)-(\d+)$', nome)
    if m:
        fam = m.group(1)
        for tom in (700, 800, 600, 900):
            cand = f'{fam}-{tom}'
            if cand in CORES and contraste(CORES['white'], CORES[cand]) >= alvo:
                return cand
    if nome == 'marca' and contraste(CORES['white'], CORES['marca-escura']) >= alvo:
        return 'marca-escura'
    return None

corrigir = '--corrigir' in sys.argv
falhas, arrumados = [], 0

for p in sorted(list((RAIZ/'components').rglob('*.tsx')) + list((RAIZ/'app').rglob('*.tsx'))):
    rel = p.relative_to(RAIZ)
    if rel.parts[:2] == ('components', 'site') or '(site)' in str(rel):
        continue
    orig = p.read_text(encoding='utf-8'); linhas = orig.split('\n'); mudou = False
    for i, linha in enumerate(linhas):
        for trecho in re.findall(r'"[^"]*"|\'[^\']*\'', linha):
            if 'bg-' not in trecho and 'text-' not in trecho:
                continue
            fundo, textos = analisa(trecho)
            for nome, alfa in textos:
                c = cor_de(nome, alfa, fundo)
                if c is None: continue
                r = contraste(c, fundo)
                if r >= 4.5: continue
                if nome == 'white':
                    # botao ou selo: manter o branco e escurecer o proprio fundo
                    # pode ser bg-* ou from-* (gradiente); guarda o prefixo
                    bgs = [(tp, n) for tp, n, _a in CLASSE.findall(trecho) if tp in ('bg', 'from')]
                    pref, alvo_bg = bgs[-1] if bgs else (None, None)
                    novo_bg = bg_mais_escuro(alvo_bg) if alvo_bg else None
                    falhas.append((str(rel), i+1, nome, round(r, 2), f'bg-{novo_bg}' if novo_bg else '—'))
                    if corrigir and novo_bg:
                        novo_trecho = trecho.replace(f'{pref}-{alvo_bg}', f'{pref}-{novo_bg}')
                        linhas[i] = linhas[i].replace(trecho, novo_trecho)
                        mudou = True; arrumados += 1
                    elif corrigir and contraste(CORES['tinta'], fundo) >= 4.5:
                        # fundo claro que nao da para escurecer: o texto e que muda
                        suf = f'/{alfa}' if alfa else ''
                        novo_trecho = trecho.replace(f'text-white{suf}', 'text-tinta')
                        linhas[i] = linhas[i].replace(trecho, novo_trecho)
                        mudou = True; arrumados += 1
                    continue
                novo = melhor_tom(nome, fundo)
                falhas.append((str(rel), i+1, nome, round(r, 2), novo or '—'))
                if corrigir and novo:
                    suf = f'/{alfa}' if alfa else ''
                    novo_trecho = trecho.replace(f'text-{nome}{suf}', f'text-{novo}')
                    linhas[i] = linhas[i].replace(trecho, novo_trecho)
                    mudou = True; arrumados += 1
    if mudou:
        p.write_text('\n'.join(linhas), encoding='utf-8')

print(f'pares abaixo de 4.5:1 -> {len(falhas)}')
if corrigir:
    print(f'corrigidos -> {arrumados}')
for f in falhas[:25]:
    print(f'  {f[0]}:{f[1]}  text-{f[2]}  ratio={f[3]}  -> {f[4]}')
if len(falhas) > 25:
    print(f'  ... e mais {len(falhas)-25}')
