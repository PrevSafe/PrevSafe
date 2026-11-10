#!/usr/bin/env python3
"""
Troca a enfase herdada do tema escuro ("pilula berrante + texto quase preto")
pela enfase do tema claro.

  estado selecionado  -> verde da marca com texto branco (igual em todo o sistema)
  botao/selo colorido -> o tom suave do proprio matiz, que informa sem gritar

  python3 scripts/enfase.py --aplicar
"""
import re, sys, pathlib, collections

RAIZ = pathlib.Path(__file__).resolve().parent.parent
APLICAR = "--aplicar" in sys.argv
ASPAS = re.compile(r'(["\'`])((?:[^"\'`\\\n]|\\.)*?)\1')
PILULA = re.compile(r'\bbg-(teal|amber|rose|emerald|green)-(400|500|600)\b')
TEXTO  = re.compile(r'\btext-slate-9[05]0\b')

def e_estado(s):
    """Ramo de ternario (so cor) ou className inteiro (tem espacamento)?"""
    return not re.search(r'\b(px|py|p|w|h)-[\w.\[\]/]+', s)

def converte(s):
    m = PILULA.search(s)
    if not m or not TEXTO.search(s):
        return s, None
    hue, tom = m.group(1), m.group(2)
    cs = s.split()

    if e_estado(s) or hue in ("teal", "emerald", "green"):
        # Selecao e acao primaria falam a mesma lingua: o verde da marca.
        fora = []
        for c in cs:
            if re.fullmatch(r'(hover:)?bg-(teal|amber|rose|emerald|green)-\d{2,3}', c): continue
            if TEXTO.fullmatch(c): continue
            if c in ("shadow-md", "shadow", "shadow-lg"): c = "shadow-sm"
            fora.append(c)
        if "shadow-sm" not in fora and ("shadow-md" in cs or "shadow" in cs or "shadow-lg" in cs):
            fora.append("shadow-sm")
        novas = ["bg-marca-escura", "text-white"] + fora
        if any(c.startswith("hover:") is False and False for c in cs): pass
        if re.search(r'hover:bg-', s):
            novas.append("hover:opacity-90")
        return " ".join(dict.fromkeys(novas)), "estado/acao -> marca"

    # Selo ou botao secundario: mantem o significado do matiz, baixa o volume.
    fora = []
    for c in cs:
        if re.fullmatch(rf'bg-{hue}-\d{{2,3}}', c):        fora.append(f"bg-{hue}-100");  continue
        if re.fullmatch(rf'hover:bg-{hue}-\d{{2,3}}', c):  fora.append(f"hover:bg-{hue}-200"); continue
        if TEXTO.fullmatch(c):                             fora.append(f"text-{hue}-900"); continue
        if c in ("shadow-md", "shadow", "shadow-lg"):      fora.append("shadow-sm"); continue
        fora.append(c)
    if not any(c.startswith("border-") for c in fora):
        fora.append(f"border border-{hue}-200")
    return " ".join(dict.fromkeys(" ".join(fora).split())), f"{hue} berrante -> suave"

total = collections.Counter(); tocados = 0
for p in list((RAIZ/"components").rglob("*.tsx")) + list((RAIZ/"app").rglob("*.tsx")):
    t = p.read_text(encoding="utf-8")
    def tr(m):
        a, s = m.group(1), m.group(2)
        novo, motivo = converte(s)
        if motivo:
            total[motivo] += 1
            return f"{a}{novo}{a}"
        return m.group(0)
    novo = ASPAS.sub(tr, t)
    if novo != t:
        tocados += 1
        if APLICAR: p.write_text(novo, encoding="utf-8")

print(f"arquivos: {tocados}")
for k, v in total.most_common(): print(f"  {v:4d}  {k}")
print("(gravado)" if APLICAR else "(relatorio apenas)")
