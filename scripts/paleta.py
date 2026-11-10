#!/usr/bin/env python3
"""
Limpa a paleta do sistema: tira os paineis escuros que sobraram, colapsa os
13 matizes decorativos nos 5 papeis que o tema tem (marca, teal, ambar, rosa,
neutro) e achata os gradientes de enfeite em cores solidas.

  python3 scripts/paleta.py            -> so relata
  python3 scripts/paleta.py --aplicar  -> grava
"""
import re, sys, pathlib, collections

RAIZ = pathlib.Path(__file__).resolve().parent.parent
APLICAR = "--aplicar" in sys.argv

# Matizes que nao carregam significado nenhum no sistema e so poluem.
# Cada um cai no papel que de fato representa.
COLAPSO = {
    "indigo": "teal", "violet": "teal", "purple": "teal", "fuchsia": "teal",
    "blue": "teal", "sky": "teal", "cyan": "teal",
    "pink": "rose",
    "orange": "amber", "yellow": "amber", "lime": "amber",
}

# Tons escuros: num tema claro nenhum fundo pode usa-los.
ESCURO = re.compile(r"-(8\d0|9\d0|950)(/\d+)?$")

GRAD_UTIL = re.compile(r"\bbg-gradient-to-[a-z]{1,2}\b")
PARADA    = re.compile(r"\b(from|via|to)-[a-z]+-\d{2,3}(/\d+)?\b")
PARADA_TK = re.compile(r"\b(from|via|to)-(marca|marca-escura|marca-suave|teal|petroleo|tinta|superficie|fundo|white|transparent|black)(-\d{2,3})?(/\d+)?\b")

def parada_escura(p):
    """A parada de gradiente pinta escuro?"""
    if re.search(r"-(900|950|800)(/\d+)?$", p):
        return True
    return bool(re.search(r"\b(from|via|to)-(petroleo|tinta|black)\b", p))

def classes(trecho):
    return trecho.split()

def limpa_gradiente(cs):
    """Gradiente escuro vira superficie clara; gradiente claro vira solido."""
    paradas = [c for c in cs if PARADA.fullmatch(c) or PARADA_TK.fullmatch(c)]
    if not any(GRAD_UTIL.fullmatch(c) for c in cs):
        return cs, None
    escuras = [p for p in paradas if parada_escura(p)]

    # A cor que o gradiente vira: a primeira parada, ja normalizada.
    base = None
    for p in paradas:
        if p.startswith("from-"):
            base = p[5:]
            break

    fora = [c for c in cs if not (GRAD_UTIL.fullmatch(c) or c in paradas)]

    if escuras:
        # Painel escuro num tema claro: nao se salva. Se carregava um matiz
        # semantico (aviso/perigo), vira o tom suave dele; senao, superficie.
        juntas = " ".join(paradas)
        if re.search(r"-(rose|red)-", juntas):    novo = "bg-rose-50"
        elif re.search(r"-(amber|orange|yellow)-", juntas): novo = "bg-amber-50"
        else:                                     novo = "bg-superficie"
        motivo = "painel escuro -> claro"
    else:
        # Gradiente decorativo claro: achata na primeira parada.
        if base is None:
            return cs, None
        base = re.sub(r"/\d+$", "", base)
        novo = f"bg-{base}"
        motivo = "gradiente -> solido"

    # Se ja existe um bg- solido, nao duplica.
    if any(c.startswith("bg-") and not c.startswith("bg-gradient") for c in fora):
        if escuras:
            # tira o bg- escuro que por acaso exista e deixa o claro
            fora = [c for c in fora if not (c.startswith("bg-") and ESCURO.search(c))]
            if not any(c.startswith("bg-") for c in fora):
                fora.insert(0, novo)
        return fora, motivo
    fora.insert(0, novo)
    return fora, motivo

def colapsa_matiz(c):
    m = re.match(r"^([a-z-]*?)(from|via|to|bg|text|border|ring|fill|stroke|shadow|decoration|divide|outline|accent|caret|placeholder)-(indigo|violet|purple|fuchsia|blue|sky|cyan|pink|orange|yellow|lime)-(\d{2,3})(/\d+)?$", c)
    if not m:
        return c
    pre, prop, hue, tom, alfa = m.groups()
    return f"{pre}{prop}-{COLAPSO[hue]}-{tom}{alfa or ''}"

def texto_em_painel_claro(cs):
    """Depois de clarear o painel, text-white no container fica invisivel."""
    if not any(c in ("bg-superficie", "bg-rose-50", "bg-amber-50") for c in cs):
        return cs
    return ["text-tinta" if c == "text-white" else c for c in cs]

def borda_neutra(cs):
    """Bordas escuras/saturadas que so faziam sentido no tema escuro."""
    if not any(c in ("bg-superficie", "bg-rose-50", "bg-amber-50") for c in cs):
        return cs
    out = []
    for c in cs:
        m = re.match(r"^border-([a-z]+)-(\d{2,3})(/\d+)?$", c)
        if m:
            hue, tom, _ = m.groups()
            if int(tom) >= 500:
                if hue in ("rose", "red"):   out.append("border-rose-200");  continue
                if hue in ("amber",):        out.append("border-amber-200"); continue
                if hue in ("teal",):         out.append("border-teal-200");  continue
                out.append("border-borda"); continue
        if c in ("border-marca-escura", "border-petroleo", "border-tinta"):
            out.append("border-borda"); continue
        out.append(c)
    return out

GLOW = re.compile(r"^shadow-[a-z]+-\d{2,3}/\d+$")

def sombra_discreta(cs):
    """Brilho colorido e sombra pesada sao recurso de tema escuro."""
    out = []
    for c in cs:
        if GLOW.fullmatch(c):
            continue                      # some
        if c in ("shadow-2xl", "shadow-xl", "shadow-lg"):
            out.append("shadow-sm"); continue
        out.append(c)
    # nao deixa shadow-sm repetido
    vistos, final = set(), []
    for c in out:
        if c == "shadow-sm":
            if "shadow-sm" in vistos: continue
            vistos.add(c)
        final.append(c)
    return final

ASPAS = re.compile(r'(["\'`])((?:[^"\'`\\\n]|\\.)*?)\1')

def processa(caminho):
    txt = caminho.read_text(encoding="utf-8")
    mudancas = collections.Counter()

    def troca(m):
        aspa, dentro = m.group(1), m.group(2)
        if "-" not in dentro or len(dentro) < 3:
            return m.group(0)
        cs = classes(dentro)
        if not cs:
            return m.group(0)
        orig = list(cs)

        cs, motivo = limpa_gradiente(cs)
        if motivo:
            mudancas[motivo] += 1
        cs = texto_em_painel_claro(cs)
        cs = borda_neutra(cs)
        antes_sombra = list(cs)
        cs = sombra_discreta(cs)
        if cs != antes_sombra:
            mudancas["sombra suavizada"] += 1
        novas = [colapsa_matiz(c) for c in cs]
        if novas != cs:
            mudancas["matiz colapsado"] += sum(1 for a, b in zip(cs, novas) if a != b)
        cs = novas

        if cs == orig:
            return m.group(0)
        return f"{aspa}{' '.join(cs)}{aspa}"

    novo = ASPAS.sub(troca, txt)
    return novo, mudancas

alvos = sorted(
    list((RAIZ / "components").rglob("*.tsx")) +
    list((RAIZ / "app").rglob("*.tsx"))
)

total = collections.Counter()
tocados = 0
for a in alvos:
    novo, m = processa(a)
    if m:
        total.update(m)
        if novo != a.read_text(encoding="utf-8"):
            tocados += 1
            if APLICAR:
                a.write_text(novo, encoding="utf-8")

print(f"arquivos alterados: {tocados}")
for k, v in total.most_common():
    print(f"  {v:5d}  {k}")
print("(relatorio apenas; use --aplicar para gravar)" if not APLICAR else "(gravado)")
