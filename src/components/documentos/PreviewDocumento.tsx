import { useMemo } from 'react';
import {
  DOCUMENTO_LABEL,
  DOCUMENTO_NORMA,
  MARGEM_CM,
  NIVEL_RISCO_LABEL,
  TIPO_RISCO_LABEL,
  classificarNivelRisco,
  formatarInscricao,
  montarFolhas,
  type BlocoFolha,
  type Capitulo,
  type CapituloId,
  type ConfiguracaoLayout,
  type DadosDocumento,
  type Folha,
  type TipoDocumento,
} from '@/lib/documentos';
import { TEMA } from './tema';

type IndiceEntrada = { titulo: string; pagina: number };
type BlocoIndice = { tipo: 'indice'; entradas: IndiceEntrada[] };

type FolhaFinal = {
  capituloId: CapituloId | 'indice';
  titulo: string;
  bloco: BlocoFolha | BlocoIndice;
  pagina: number;
};

const FONTE_CSS: Record<ConfiguracaoLayout['fonte'], string> = {
  Arial: 'Arial, Helvetica, sans-serif',
  Calibri: '"Calibri", "Carlito", sans-serif',
  'Times New Roman': '"Times New Roman", Times, serif',
};

function montarFolhasFinais(folhasBase: Folha[], exibirIndice: boolean): FolhaFinal[] {
  if (!exibirIndice || folhasBase.length === 0) {
    return folhasBase.map((f, i) => ({ ...f, pagina: i + 1 }));
  }

  const posCapa = folhasBase.findIndex((f) => f.bloco.tipo === 'capa');
  const posInsercao = posCapa === -1 ? 0 : posCapa + 1;

  const comIndice: Array<Folha | { capituloId: 'indice'; titulo: string; bloco: BlocoIndice }> = [
    ...folhasBase.slice(0, posInsercao),
    { capituloId: 'indice', titulo: 'Índice Analítico', bloco: { tipo: 'indice', entradas: [] } },
    ...folhasBase.slice(posInsercao),
  ];

  const inicioPorCapitulo = new Map<string, number>();
  comIndice.forEach((f, i) => {
    if (!inicioPorCapitulo.has(f.capituloId)) inicioPorCapitulo.set(f.capituloId, i + 1);
  });

  const entradas: IndiceEntrada[] = comIndice
    .filter((f) => f.capituloId !== 'indice' && f.bloco.tipo !== 'capa')
    .reduce<IndiceEntrada[]>((acc, f) => {
      if (!acc.some((e) => e.titulo === f.titulo)) {
        acc.push({ titulo: f.titulo, pagina: inicioPorCapitulo.get(f.capituloId) ?? 1 });
      }
      return acc;
    }, []);

  return comIndice.map((f, i) => ({
    ...f,
    bloco: f.bloco.tipo === 'indice' ? { tipo: 'indice' as const, entradas } : f.bloco,
    pagina: i + 1,
  }));
}

function NivelBadge({ probabilidade, severidade }: { probabilidade: number; severidade: number }) {
  const nivel = classificarNivelRisco(probabilidade * severidade);
  const cores: Record<string, string> = {
    baixo: 'bg-[#DCFCE7] text-[#166534]',
    medio: 'bg-[#FEF3C7] text-[#92400E]',
    alto: 'bg-[#FFEDD5] text-[#9A3412]',
    critico: 'bg-[#FEE2E2] text-[#991B1B]',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${cores[nivel]}`}>
      {NIVEL_RISCO_LABEL[nivel]}
    </span>
  );
}

function ConteudoBloco({ bloco, tipoDocumento, dados }: { bloco: BlocoFolha | BlocoIndice; tipoDocumento: TipoDocumento; dados: DadosDocumento }) {
  switch (bloco.tipo) {
    case 'capa':
      return (
        <div className="h-full flex flex-col items-center justify-center text-center gap-6 py-16">
          <div className="h-20 w-20 rounded-lg border-2 border-dashed border-[#CBD5E1] flex items-center justify-center text-[#94A3B8]">
            <span className="material-symbols-outlined text-[32px]">domain</span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#64748B] mb-2">{tipoDocumento}</p>
            <h1 className="text-2xl font-bold text-[#0F172A] max-w-md mx-auto leading-snug">
              {DOCUMENTO_LABEL[tipoDocumento]}
            </h1>
          </div>
          <div className="text-sm text-[#1E293B]">
            <p className="font-semibold">{dados.empresa.nome}</p>
            <p className="text-[#64748B]">{formatarInscricao(dados.empresa.numeroInscricao, dados.empresa.tipoInscricao)}</p>
          </div>
          <p className="text-xs text-[#64748B] max-w-sm">Elaborado conforme {DOCUMENTO_NORMA[tipoDocumento]}</p>
          <p className="text-xs text-[#94A3B8]">
            {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      );

    case 'texto':
      return (
        <div className="flex flex-col gap-3">
          {bloco.paragrafos.map((p, i) => (
            <p key={i} className="leading-relaxed text-justify">
              {p}
            </p>
          ))}
        </div>
      );

    case 'tabela_riscos':
      return (
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-[#1E293B]">
              <th className="py-1.5 pr-2 font-semibold">Risco</th>
              <th className="py-1.5 pr-2 font-semibold">GHE</th>
              <th className="py-1.5 pr-2 font-semibold">Tipo</th>
              <th className="py-1.5 pr-2 font-semibold text-center">P×S</th>
              <th className="py-1.5 font-semibold text-center">Nível</th>
            </tr>
          </thead>
          <tbody>
            {bloco.itens.map((r) => (
              <tr key={r.id} className="border-b border-[#E2E8F0]">
                <td className="py-1.5 pr-2">{r.descricao}</td>
                <td className="py-1.5 pr-2 text-[#64748B]">{r.gheNome ?? '—'}</td>
                <td className="py-1.5 pr-2 text-[#64748B]">{TIPO_RISCO_LABEL[r.tipoRisco]}</td>
                <td className="py-1.5 pr-2 text-center">
                  {r.probabilidade}×{r.severidade}
                </td>
                <td className="py-1.5 text-center">
                  <NivelBadge probabilidade={r.probabilidade} severidade={r.severidade} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );

    case 'tabela_exames':
      return (
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-[#1E293B]">
              <th className="py-1.5 pr-2 font-semibold">Fator de Risco</th>
              <th className="py-1.5 pr-2 font-semibold">Exame (Tabela 27)</th>
              <th className="py-1.5 font-semibold text-center">Periodicidade</th>
            </tr>
          </thead>
          <tbody>
            {bloco.itens.map((e) => (
              <tr key={e.id} className="border-b border-[#E2E8F0]">
                <td className="py-1.5 pr-2">{e.riscoDescricao}</td>
                <td className="py-1.5 pr-2">{e.nomeExame}</td>
                <td className="py-1.5 text-center text-[#64748B]">
                  {e.periodicidadeMeses ? `${e.periodicidadeMeses} meses` : 'Admissional/Demissional'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );

    case 'tabela_cronograma':
      return (
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-[#1E293B]">
              <th className="py-1.5 pr-2 font-semibold">Ação (O quê)</th>
              <th className="py-1.5 pr-2 font-semibold">Prazo</th>
              <th className="py-1.5 pr-2 font-semibold">Responsável</th>
              <th className="py-1.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {bloco.itens.map((a) => (
              <tr key={a.id} className="border-b border-[#E2E8F0]">
                <td className="py-1.5 pr-2">{a.oQue}</td>
                <td className="py-1.5 pr-2 text-[#64748B]">{new Date(`${a.quando}T00:00:00`).toLocaleDateString('pt-BR')}</td>
                <td className="py-1.5 pr-2 text-[#64748B]">{a.quem}</td>
                <td className="py-1.5 text-[#64748B] capitalize">{a.status.replace('_', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );

    case 'anexos':
      return (
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>Anexo I — Anotação de Responsabilidade Técnica (ART/RRT) do responsável pela elaboração.</li>
          <li>Anexo II — Certificados de calibração dos equipamentos de medição utilizados na avaliação quantitativa.</li>
          <li>Anexo III — Fichas de Informação de Segurança de Produtos Químicos (FISPQ) dos agentes químicos identificados.</li>
          <li>Anexo IV — Planta baixa e croqui de identificação das áreas avaliadas.</li>
        </ul>
      );

    case 'encerramento':
      return (
        <div className="flex flex-col gap-10">
          <p className="leading-relaxed text-justify">
            Este documento encerra a avaliação técnica realizada, ficando disponível para consulta dos trabalhadores,
            da fiscalização e demais interessados, nos termos da legislação de Segurança e Saúde no Trabalho vigente.
          </p>
          <div className="grid grid-cols-2 gap-8 mt-auto">
            <div className="text-center">
              <div className="border-t border-[#1E293B] pt-1">
                <p className="font-medium">Responsável Técnico</p>
                <p className="text-[#64748B]">Engenheiro(a) de Segurança do Trabalho</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-[#1E293B] pt-1">
                <p className="font-medium">Representante Legal da Empresa</p>
                <p className="text-[#64748B]">Empregador</p>
              </div>
            </div>
          </div>
        </div>
      );

    case 'indice':
      return (
        <ol className="flex flex-col gap-1.5">
          {bloco.entradas.map((e) => (
            <li key={e.titulo} className="flex items-baseline gap-2">
              <span>{e.titulo}</span>
              <span className="flex-1 border-b border-dotted border-[#CBD5E1] -translate-y-0.75" />
              <span className="text-[#64748B]">{e.pagina}</span>
            </li>
          ))}
        </ol>
      );
  }
}

type Props = {
  tipoDocumento: TipoDocumento;
  capitulos: Capitulo[];
  dados: DadosDocumento;
  config: ConfiguracaoLayout;
};

export default function PreviewDocumento({ tipoDocumento, capitulos, dados, config }: Props) {
  const folhasFinais = useMemo(() => {
    const base = montarFolhas(capitulos, dados, tipoDocumento);
    return montarFolhasFinais(base, config.exibirIndice);
  }, [capitulos, dados, tipoDocumento, config.exibirIndice]);

  const totalPaginas = folhasFinais.length;
  const margemCm = MARGEM_CM[config.margem];

  return (
    <div id="documento-sst-preview" className={`h-full overflow-y-auto ${TEMA.previewBg} p-8 flex flex-col items-center gap-8`}>
      {totalPaginas === 0 ? (
        <div className={`${TEMA.cardArredondado} p-10 text-center max-w-sm`}>
          <span className="material-symbols-outlined text-[32px] text-[#94A3B8] mb-2">description</span>
          <p className={`text-sm ${TEMA.muted}`}>Nenhum capítulo ativo. Marque ao menos um capítulo na Coluna 1.</p>
        </div>
      ) : (
        folhasFinais.map((folha) => (
          <article
            key={`${folha.capituloId}-${folha.pagina}`}
            className="folha-a4 bg-white shadow-md flex flex-col"
            style={{
              width: '210mm',
              minHeight: '297mm',
              padding: `${margemCm}cm`,
              fontFamily: FONTE_CSS[config.fonte],
              fontSize: `${config.tamanhoFonte}pt`,
              color: '#1E293B',
            }}
          >
            {folha.bloco.tipo !== 'capa' && (
              <header className="flex items-center justify-between gap-4 border-b border-[#E2E8F0] pb-2 mb-4 text-[10px] text-[#64748B]">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">domain</span>
                  {dados.empresa.nome} · {formatarInscricao(dados.empresa.numeroInscricao, dados.empresa.tipoInscricao)}
                </span>
                <span className="font-semibold text-[#1E293B]">{tipoDocumento}</span>
              </header>
            )}

            {folha.bloco.tipo !== 'capa' && (
              <h2 className="text-sm font-bold text-[#0F172A] mb-3">{folha.titulo}</h2>
            )}

            <div className="flex-1">
              <ConteudoBloco bloco={folha.bloco} tipoDocumento={tipoDocumento} dados={dados} />
            </div>

            <footer className="mt-6 pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[9px] text-[#94A3B8]">
              <span>
                {config.exibirNotasRodape
                  ? `Documento gerado conforme ${DOCUMENTO_NORMA[tipoDocumento]} e eSocial S-1.3 (NT 06/2026).`
                  : ''}
              </span>
              <span className="flex items-center gap-3 shrink-0">
                {config.exibirAssinaturas && <span>Assinado digitalmente — ICP-Brasil</span>}
                <span>
                  Página {folha.pagina} de {totalPaginas}
                </span>
              </span>
            </footer>
          </article>
        ))
      )}
    </div>
  );
}
