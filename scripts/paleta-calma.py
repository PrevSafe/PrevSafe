#!/usr/bin/env python3
"""
Gera as rampas de cor do tema PrevSafe.

O sistema usa ~4.500 classes de cor do Tailwind (teal, amber, rose, slate,
emerald, red). Em vez de reescrever as classes, redefinimos as rampas no
@theme: os tons claros (50-200), usados como fundo de painel, ficam quase
neutros -- so um sopro de cor -- e os tons escuros mantem cor suficiente
para ler como cor. E isso que tira o rosa da pagina e o marrom do banner
sem perder a semantica de cada aviso.

  python3 scripts/paleta-calma.py          -> imprime o CSS
  python3 scripts/paleta-calma.py --provar -> mede os pares mais usados
"""
import math, sys

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

def para_hex(rgb):
    return '#' + ''.join(f'{round(max(0,min(1,v))*255):02X}' for v in rgb)

def luminancia(rgb):
    def c(u):
        return u/12.92 if u <= 0.04045 else ((u+0.055)/1.055)**2.4
    r, g, b = (c(v) for v in rgb)
    return 0.2126*r + 0.7152*g + 0.0722*b

def contraste(a, b):
    la, lb = luminancia(a), luminancia(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi+0.05)/(lo+0.05)

# L e C de cada degrau. Os tons claros sao quase neutros de proposito.
DEGRAUS = [
    ( 50, 0.980, 0.008),
    (100, 0.958, 0.018),
    (200, 0.918, 0.030),
    (300, 0.858, 0.046),
    (400, 0.760, 0.070),
    (500, 0.650, 0.090),
    (600, 0.490, 0.100),
    (700, 0.425, 0.090),
    (800, 0.365, 0.075),
    (900, 0.310, 0.060),
    (950, 0.225, 0.042),
]

# familia -> (matiz, multiplicador de croma)
FAMILIAS = {
    'slate':   (212, 0.32),   # cinza neutro, da identidade (#F2F4F5 / #0E3A46)
    'teal':    (198, 1.15),   # petroleo da marca, acento principal
    'emerald': (148, 1.15),   # verde da marca
    'amber':   ( 72, 1.00),   # areia: avisos
    'rose':    ( 20, 0.95),   # barro, nao rosa: alertas
    'red':     ( 25, 1.05),   # perigo
}

def rampa(familia):
    h, k = FAMILIAS[familia]
    return {n: oklch_para_rgb(L, C*k, h) for n, L, C in DEGRAUS}

def css():
    linhas = []
    for familia in FAMILIAS:
        linhas.append(f'  /* {familia} */')
        for n, rgb in rampa(familia).items():
            linhas.append(f'  --color-{familia}-{n}: {para_hex(rgb)};')
        linhas.append('')
    return '\n'.join(linhas).rstrip()

def provar():
    branco = (1.0, 1.0, 1.0)
    print(f'{"par":38} {"razao":>6}')
    for familia in FAMILIAS:
        r = rampa(familia)
        pares = [
            (f'branco sobre {familia}-600', branco, r[600]),
            (f'branco sobre {familia}-700', branco, r[700]),
            (f'{familia}-700 sobre {familia}-50', r[700], r[50]),
            (f'{familia}-800 sobre {familia}-100', r[800], r[100]),
            (f'{familia}-900 sobre branco', r[900], branco),
        ]
        for nome, a, b in pares:
            c = contraste(a, b)
            marca = 'ok ' if c >= 4.5 else 'NAO'
            print(f'{nome:38} {c:6.2f}  {marca}')
        print()

if __name__ == '__main__':
    provar() if '--provar' in sys.argv else print(css())
