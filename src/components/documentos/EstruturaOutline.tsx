import { useState } from 'react';
import type { Capitulo, CapituloId, TipoDocumento } from '@/lib/documentos';
import { TEMA } from './tema';

type Props = {
  tipoDocumento: TipoDocumento;
  capitulos: Capitulo[];
  onChange: (capitulos: Capitulo[]) => void;
  paginasPorCapitulo: Map<CapituloId, number>;
  itensDinamicos: Partial<Record<CapituloId, number>>;
};

export default function EstruturaOutline({
  tipoDocumento,
  capitulos,
  onChange,
  paginasPorCapitulo,
  itensDinamicos,
}: Props) {
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<number | null>(null);

  function alternar(id: CapituloId) {
    onChange(capitulos.map((c) => (c.id === id ? { ...c, ativo: !c.ativo } : c)));
  }

  function soltar(indiceDestino: number) {
    if (arrastando === null || arrastando === indiceDestino) {
      setArrastando(null);
      setSobre(null);
      return;
    }
    const lista = [...capitulos];
    const [movido] = lista.splice(arrastando, 1);
    lista.splice(indiceDestino, 0, movido);
    onChange(lista);
    setArrastando(null);
    setSobre(null);
  }

  const totalAtivos = capitulos.filter((c) => c.ativo).length;

  return (
    <div className="h-full flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className={`text-base font-semibold ${TEMA.titulo}`}>Estrutura do Laudo</h2>
        <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#1E3A8A]/10 text-[#1E3A8A]">
          {tipoDocumento}
        </span>
      </div>
      <p className={`text-xs ${TEMA.muted} -mt-2`}>
        {totalAtivos} de {capitulos.length} capítulos ativos · arraste para reordenar
      </p>

      <ol className="flex flex-col gap-2">
        {capitulos.map((capitulo, indice) => {
          const paginas = paginasPorCapitulo.get(capitulo.id) ?? 0;
          const contagem = itensDinamicos[capitulo.id];
          return (
            <li
              key={capitulo.id}
              draggable
              onDragStart={() => setArrastando(indice)}
              onDragOver={(e) => {
                e.preventDefault();
                setSobre(indice);
              }}
              onDragLeave={() => setSobre((s) => (s === indice ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                soltar(indice);
              }}
              onDragEnd={() => {
                setArrastando(null);
                setSobre(null);
              }}
              className={`group flex items-start gap-2 rounded-lg border px-3 py-2.5 cursor-grab active:cursor-grabbing transition-colors ${
                sobre === indice && arrastando !== null && arrastando !== indice
                  ? 'border-[#2563EB] bg-[#2563EB]/5'
                  : TEMA.bordaSutil
              } ${capitulo.ativo ? 'bg-white' : 'bg-[#F8FAFC]'}`}
            >
              <span className="material-symbols-outlined text-[18px] text-[#94A3B8] mt-0.5 shrink-0" aria-hidden>
                drag_indicator
              </span>

              <input
                type="checkbox"
                checked={capitulo.ativo}
                onChange={() => alternar(capitulo.id)}
                className="mt-1 shrink-0 h-4 w-4 rounded border-[#CBD5E1] text-[#1E3A8A] focus:ring-[#2563EB]/30"
                aria-label={`Incluir capítulo ${capitulo.titulo}`}
              />

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm leading-snug ${
                    capitulo.ativo ? TEMA.texto + ' font-medium' : TEMA.muted + ' line-through'
                  }`}
                >
                  {capitulo.titulo}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {capitulo.dinamico && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#2563EB] bg-[#2563EB]/10 px-1.5 py-0.5 rounded">
                      Dinâmico
                    </span>
                  )}
                  {capitulo.ativo && (
                    <span className={`text-[11px] ${TEMA.muted}`}>
                      {paginas} pág{paginas === 1 ? '.' : 's.'}
                      {contagem != null ? ` · ${contagem} item${contagem === 1 ? '' : 's'}` : ''}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
