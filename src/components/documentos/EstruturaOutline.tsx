import { useState } from 'react';
import type {
  AcaoCronograma,
  Capitulo,
  CapituloId,
  ExameDocumento,
  Personalizacao,
  RiscoDocumento,
  TipoDocumento,
} from '@/lib/documentos';
import { TEMA } from './tema';

type StatusSalvar = 'ocioso' | 'salvando' | 'salvo' | 'erro';

/** Capítulos de texto livre e o campo de `Personalizacao` que cada um edita. */
const CAMPO_TEXTO: Partial<Record<CapituloId, keyof Personalizacao>> = {
  introducao: 'textoIntroducao',
  metodologia: 'textoMetodologia',
  anexos: 'textoAnexos',
  encerramento: 'textoEncerramento',
};

const PLACEHOLDER_PADRAO: Partial<Record<CapituloId, string>> = {
  introducao: 'Deixe em branco para usar a introdução padrão gerada automaticamente com o nome da empresa e a norma aplicável.',
  metodologia: 'Deixe em branco para usar a metodologia padrão (GRO, matriz de probabilidade × severidade)...',
  anexos: 'Deixe em branco para usar a lista padrão de anexos (ART, calibrações, FISPQ, planta baixa).',
  encerramento: 'Deixe em branco para usar o texto de encerramento padrão. As assinaturas continuam aparecendo abaixo dele.',
};

function Feedback({ status }: { status: StatusSalvar }) {
  if (status === 'salvo') {
    return (
      <span className="text-xs text-[#16A34A] flex items-center gap-1 shrink-0">
        <span className="material-symbols-outlined text-[14px]">check_circle</span>
        Salvo
      </span>
    );
  }
  if (status === 'erro') {
    return <span className="text-xs text-[#DC2626] shrink-0">Falha ao salvar</span>;
  }
  return null;
}

function EditorTexto({
  campo,
  valorSalvo,
  onSalvar,
}: {
  campo: CapituloId;
  valorSalvo: string | null;
  onSalvar: (novoValor: string | null) => Promise<void>;
}) {
  const [rascunho, setRascunho] = useState(valorSalvo ?? '');
  const [status, setStatus] = useState<StatusSalvar>('ocioso');
  const sujo = rascunho !== (valorSalvo ?? '');

  async function salvar(valor: string | null) {
    setStatus('salvando');
    try {
      await onSalvar(valor);
      setStatus('salvo');
      setTimeout(() => setStatus((s) => (s === 'salvo' ? 'ocioso' : s)), 2000);
    } catch {
      setStatus('erro');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={rascunho}
        onChange={(e) => setRascunho(e.target.value)}
        rows={6}
        placeholder={PLACEHOLDER_PADRAO[campo]}
        className={`${TEMA.campo} h-auto py-2 leading-relaxed resize-y`}
      />
      <p className={`text-[11px] ${TEMA.muted}`}>Deixe uma linha em branco para separar parágrafos.</p>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          disabled={!sujo || status === 'salvando'}
          onClick={() => salvar(rascunho)}
          className={`h-8 px-3 rounded-md text-xs font-semibold ${TEMA.botaoPrimario}`}
        >
          {status === 'salvando' ? 'Salvando…' : 'Salvar texto'}
        </button>
        {valorSalvo && (
          <button
            type="button"
            onClick={() => {
              setRascunho('');
              void salvar(null);
            }}
            className={`h-8 px-3 rounded-md text-xs ${TEMA.botaoSecundario}`}
          >
            Restaurar padrão
          </button>
        )}
        <Feedback status={status} />
      </div>
    </div>
  );
}

function EditorCapa({
  personalizacao,
  onSalvar,
}: {
  personalizacao: Personalizacao;
  onSalvar: (patch: Partial<Personalizacao>) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState(personalizacao.capaTitulo ?? '');
  const [subtitulo, setSubtitulo] = useState(personalizacao.capaSubtitulo ?? '');
  const [responsavel, setResponsavel] = useState(personalizacao.capaResponsavel ?? '');
  const [status, setStatus] = useState<StatusSalvar>('ocioso');

  const sujo =
    titulo !== (personalizacao.capaTitulo ?? '') ||
    subtitulo !== (personalizacao.capaSubtitulo ?? '') ||
    responsavel !== (personalizacao.capaResponsavel ?? '');

  async function salvar() {
    setStatus('salvando');
    try {
      await onSalvar({ capaTitulo: titulo, capaSubtitulo: subtitulo, capaResponsavel: responsavel });
      setStatus('salvo');
      setTimeout(() => setStatus((s) => (s === 'salvo' ? 'ocioso' : s)), 2000);
    } catch {
      setStatus('erro');
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-[#475569]">Título alternativo</span>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: PGR — Unidade Sede"
          className={TEMA.campo}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-[#475569]">Subtítulo</span>
        <input
          value={subtitulo}
          onChange={(e) => setSubtitulo(e.target.value)}
          placeholder="Ex.: Revisão 2026"
          className={TEMA.campo}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-[#475569]">Responsável / elaborado por</span>
        <input
          value={responsavel}
          onChange={(e) => setResponsavel(e.target.value)}
          placeholder="Ex.: Eng. Ana Souza — CREA 12345"
          className={TEMA.campo}
        />
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!sujo || status === 'salvando'}
          onClick={salvar}
          className={`h-8 px-3 rounded-md text-xs font-semibold ${TEMA.botaoPrimario}`}
        >
          {status === 'salvando' ? 'Salvando…' : 'Salvar'}
        </button>
        <Feedback status={status} />
      </div>
    </div>
  );
}

function ItemComNota({ label, valorSalvo, onSalvar }: { label: string; valorSalvo: string | null; onSalvar: (nota: string) => Promise<void> }) {
  const [rascunho, setRascunho] = useState(valorSalvo ?? '');
  const [status, setStatus] = useState<StatusSalvar>('ocioso');
  const sujo = rascunho !== (valorSalvo ?? '');

  async function salvar() {
    setStatus('salvando');
    try {
      await onSalvar(rascunho);
      setStatus('salvo');
      setTimeout(() => setStatus((s) => (s === 'salvo' ? 'ocioso' : s)), 1500);
    } catch {
      setStatus('erro');
    }
  }

  return (
    <div className="flex flex-col gap-1 py-2 border-b border-[#E2E8F0] last:border-b-0">
      <p className="text-xs text-[#1E293B] font-medium truncate" title={label}>
        {label}
      </p>
      <div className="flex items-center gap-1.5">
        <input
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          placeholder="Nota para o laudo (opcional)"
          className="flex-1 min-w-0 h-8 rounded-md border border-[#E2E8F0] bg-white px-2 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
        />
        {sujo && (
          <button
            type="button"
            disabled={status === 'salvando'}
            onClick={salvar}
            className="h-8 px-2 rounded-md text-[11px] font-semibold bg-[#1E3A8A] text-white shrink-0 disabled:opacity-50"
          >
            {status === 'salvando' ? '…' : 'Salvar'}
          </button>
        )}
        {status === 'salvo' && <span className="material-symbols-outlined text-[16px] text-[#16A34A] shrink-0">check</span>}
      </div>
    </div>
  );
}

type Props = {
  tipoDocumento: TipoDocumento;
  capitulos: Capitulo[];
  onChange: (capitulos: Capitulo[]) => void;
  paginasPorCapitulo: Map<CapituloId, number>;
  itensDinamicos: Partial<Record<CapituloId, number>>;
  personalizacao: Personalizacao;
  onSalvarPersonalizacao: (patch: Partial<Personalizacao>) => Promise<void>;
  riscos: RiscoDocumento[];
  exames: ExameDocumento[];
  cronograma: AcaoCronograma[];
  onSalvarNotaRisco: (riscoId: string, nota: string) => Promise<void>;
  onSalvarNotaAcao: (acaoId: string, nota: string) => Promise<void>;
};

export default function EstruturaOutline({
  tipoDocumento,
  capitulos,
  onChange,
  paginasPorCapitulo,
  itensDinamicos,
  personalizacao,
  onSalvarPersonalizacao,
  riscos,
  exames,
  cronograma,
  onSalvarNotaRisco,
  onSalvarNotaAcao,
}: Props) {
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<number | null>(null);
  const [expandido, setExpandido] = useState<CapituloId | null>(null);

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

  function temTextoPersonalizado(id: CapituloId): boolean {
    if (id === 'capa') {
      return Boolean(personalizacao.capaTitulo || personalizacao.capaSubtitulo || personalizacao.capaResponsavel);
    }
    const campo = CAMPO_TEXTO[id];
    return campo ? Boolean(personalizacao[campo]) : false;
  }

  function renderEditor(capitulo: Capitulo) {
    if (capitulo.id === 'capa') {
      return <EditorCapa personalizacao={personalizacao} onSalvar={onSalvarPersonalizacao} />;
    }

    const campo = CAMPO_TEXTO[capitulo.id];
    if (campo) {
      return (
        <EditorTexto
          campo={capitulo.id}
          valorSalvo={personalizacao[campo]}
          onSalvar={(valor) => onSalvarPersonalizacao({ [campo]: valor } as Partial<Personalizacao>)}
        />
      );
    }

    if (capitulo.id === 'inventario_riscos') {
      if (tipoDocumento === 'PCMSO') {
        if (exames.length === 0) {
          return <p className={`text-xs ${TEMA.muted}`}>Nenhum exame vinculado aos riscos cadastrados ainda.</p>;
        }
        return (
          <div className="max-h-64 overflow-y-auto -mx-1 px-1">
            <p className={`text-[11px] ${TEMA.muted} mb-1`}>
              Este capítulo lista os exames do PCMSO — as notas por item ficam disponíveis nos riscos (PGR/LTCAT).
            </p>
            {exames.map((e) => (
              <div key={e.id} className="py-1.5 border-b border-[#E2E8F0] last:border-b-0 text-xs text-[#1E293B]">
                {e.nomeExame} <span className={TEMA.muted}>— {e.riscoDescricao}</span>
              </div>
            ))}
          </div>
        );
      }
      if (riscos.length === 0) {
        return <p className={`text-xs ${TEMA.muted}`}>Nenhum risco cadastrado no inventário ainda.</p>;
      }
      return (
        <div className="max-h-64 overflow-y-auto -mx-1 px-1">
          {riscos.map((r) => (
            <ItemComNota
              key={r.id}
              label={r.descricao}
              valorSalvo={r.notaDocumento}
              onSalvar={(nota) => onSalvarNotaRisco(r.id, nota)}
            />
          ))}
        </div>
      );
    }

    if (capitulo.id === 'cronograma_acoes') {
      if (cronograma.length === 0) {
        return <p className={`text-xs ${TEMA.muted}`}>Nenhuma ação cadastrada no plano 5W2H ainda.</p>;
      }
      return (
        <div className="max-h-64 overflow-y-auto -mx-1 px-1">
          {cronograma.map((a) => (
            <ItemComNota key={a.id} label={a.oQue} valorSalvo={a.notaDocumento} onSalvar={(nota) => onSalvarNotaAcao(a.id, nota)} />
          ))}
        </div>
      );
    }

    return null;
  }

  return (
    <div className="h-full flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className={`text-base font-semibold ${TEMA.titulo}`}>Estrutura do Laudo</h2>
        <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#1E3A8A]/10 text-[#1E3A8A]">
          {tipoDocumento}
        </span>
      </div>
      <p className={`text-xs ${TEMA.muted} -mt-2`}>
        {totalAtivos} de {capitulos.length} capítulos ativos · arraste para reordenar · clique para editar o texto
      </p>

      <ol className="flex flex-col gap-2">
        {capitulos.map((capitulo, indice) => {
          const paginas = paginasPorCapitulo.get(capitulo.id) ?? 0;
          const contagem = itensDinamicos[capitulo.id];
          const aberto = expandido === capitulo.id;
          const personalizado = temTextoPersonalizado(capitulo.id);

          return (
            <li key={capitulo.id} className="flex flex-col">
              <div
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
                className={`group flex items-start gap-2 border px-3 py-2.5 cursor-grab active:cursor-grabbing transition-colors ${
                  aberto ? 'rounded-t-lg border-b-0' : 'rounded-lg'
                } ${
                  sobre === indice && arrastando !== null && arrastando !== indice
                    ? 'border-[#2563EB] bg-[#2563EB]/5'
                    : aberto
                      ? 'border-[#2563EB]'
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

                <button
                  type="button"
                  onClick={() => setExpandido(aberto ? null : capitulo.id)}
                  className="flex-1 min-w-0 text-left cursor-pointer"
                >
                  <p
                    className={`text-sm leading-snug ${
                      capitulo.ativo ? TEMA.texto + ' font-medium' : TEMA.muted + ' line-through'
                    }`}
                  >
                    {capitulo.titulo}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {capitulo.dinamico && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#2563EB] bg-[#2563EB]/10 px-1.5 py-0.5 rounded">
                        Dinâmico
                      </span>
                    )}
                    {personalizado && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#16A34A] bg-[#16A34A]/10 px-1.5 py-0.5 rounded">
                        Personalizado
                      </span>
                    )}
                    {capitulo.ativo && (
                      <span className={`text-[11px] ${TEMA.muted}`}>
                        {paginas} pág{paginas === 1 ? '.' : 's.'}
                        {contagem != null ? ` · ${contagem} item${contagem === 1 ? '' : 's'}` : ''}
                      </span>
                    )}
                  </div>
                </button>

                <span
                  className={`material-symbols-outlined text-[18px] mt-0.5 shrink-0 transition-transform text-[#94A3B8] ${
                    aberto ? 'rotate-180' : ''
                  }`}
                  aria-hidden
                >
                  expand_more
                </span>
              </div>

              {aberto && (
                <div className="rounded-b-lg border border-t-0 border-[#2563EB] bg-[#F8FAFC] px-3 py-3">
                  {renderEditor(capitulo)}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
