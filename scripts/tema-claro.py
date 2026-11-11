#!/usr/bin/env python3
"""
Converte as classes Tailwind do tema escuro para os tokens do tema claro.

Nao e um sed cego: 'text-white' sobre um botao colorido precisa continuar
branco, entao a troca de texto so acontece em linhas que nao pintam um fundo
escuro ou de marca. Rode e revise o diff — o script resolve o volume, nao
dispensa a leitura.

Uso: python3 scripts/tema-claro.py <arquivo> [arquivo...]
"""
import re, sys, pathlib

# Fundos escuros -> superficies claras (o sufixo de opacidade /40 /80 cai fora)
FUNDOS = [
    (r'\bbg-slate-950(/\d+)?\b',            'bg-fundo'),
    (r'\bbg-slate-900(/\d+)?\b',            'bg-superficie'),
    (r'\bbg-slate-8[05]0(/\d+)?\b',         'bg-superficie-2'),
    (r'\bbg-slate-700(/\d+)?\b',            'bg-superficie-3'),
    (r'\bhover:bg-slate-9\d0(/\d+)?\b',     'hover:bg-superficie-2'),
    (r'\bhover:bg-slate-[78]\d0(/\d+)?\b',  'hover:bg-superficie-3'),
]

# Bordas e divisores
BORDAS = [
    (r'\b(border|divide|ring)-slate-(950|900|8\d0|7\d0|600)(/\d+)?\b', r'\1-borda'),
    (r'\bhover:border-slate-\d{3}(/\d+)?\b', 'hover:border-borda-forte'),
]

# Verde: emerald -> marca
MARCA = [
    (r'\bbg-emerald-\d{3}/\d+\b',             'bg-marca-suave'),
    (r'\bbg-emerald-9\d0\b',                  'bg-marca-suave'),
    (r'\bhover:bg-emerald-[4-6]00\b',         'hover:bg-marca-escura'),
    (r'\bbg-emerald-[3-7]00\b',               'bg-marca'),
    (r'\b(text|border|ring|decoration)-emerald-\d00(/\d+)?\b', r'\1-marca-escura'),
    (r'\bhover:(text|border)-emerald-\d00(/\d+)?\b',           r'hover:\1-marca'),
    (r'\bfrom-emerald-\d00(/\d+)?\b',         'from-marca'),
    (r'\bto-emerald-\d00(/\d+)?\b',           'to-marca-escura'),
]

# Texto. Aplicado so onde a linha nao pinta fundo escuro/colorido.
TEXTO = [
    (r'\btext-slate-(50|100|200|300)\b', 'text-tinta'),
    (r'\btext-slate-(400|500|600)\b',    'text-tinta-2'),
    (r'\btext-white\b',                  'text-tinta'),
    (r'\bhover:text-white\b',            'hover:text-tinta'),
    (r'\bhover:text-slate-[12]00\b',     'hover:text-tinta'),
    (r'\bplaceholder-slate-\d00\b',      'placeholder-tinta-3'),
]

# Se a linha contem um destes, o texto branco em cima dela deve continuar branco.
FUNDO_ESCURO = re.compile(r'\b(bg-marca|bg-tinta|bg-petroleo|bg-teal|bg-red-[5-9]|bg-amber-[5-9]|'
                          r'bg-rose-[5-9]|bg-indigo-[5-9]|bg-blue-[5-9]|from-marca)\b')

def converte(linha: str) -> str:
    for padrao, troca in FUNDOS + BORDAS + MARCA:
        linha = re.sub(padrao, troca, linha)
    if not FUNDO_ESCURO.search(linha):
        for padrao, troca in TEXTO:
            linha = re.sub(padrao, troca, linha)
    return linha

for caminho in sys.argv[1:]:
    p = pathlib.Path(caminho)
    original = p.read_text(encoding='utf-8')
    novo = '\n'.join(converte(l) for l in original.split('\n'))
    if novo != original:
        p.write_text(novo, encoding='utf-8')
        mudadas = sum(1 for a, b in zip(original.split('\n'), novo.split('\n')) if a != b)
        print(f'{caminho}: {mudadas} linhas')
    else:
        print(f'{caminho}: sem alteracao')
