import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { agruparAlertas, auditarEmpresa, type AlertaAgrupado } from '@/lib/sstLinter';
import {
  capitulosPadrao,
  carregarDadosDocumento,
  carregarPersonalizacao,
  montarFolhas,
  PERSONALIZACAO_VAZIA,
  salvarNotaAcao,
  salvarNotaRisco,
  salvarPersonalizacao,
  type Capitulo,
  type CapituloId,
  type ConfiguracaoLayout,
  type DadosDocumento,
  type Personalizacao,
  type TipoDocumento,
} from '@/lib/documentos';
import EstruturaOutline from '@/components/documentos/EstruturaOutline';
import PreviewDocumento from '@/components/documentos/PreviewDocumento';
import PainelControle from '@/components/documentos/PainelControle';
import { ModalBloqueioLinter, ModalAvisoLinter } from '@/components/documentos/ModalLinter';
import { TEMA } from '@/components/documentos/tema';

const TIPOS: TipoDocumento[] = ['PGR', 'LTCAT', 'PCMSO'];

const CONFIG_INICIAL: ConfiguracaoLayout = {
  margem: 'padrao',
  fonte: 'Arial',
  tamanhoFonte: 11,
  exibirAssinaturas: true,
  exibirIndice: true,
  exibirNotasRodape: true,
};

const CERTIFICADO_MOCK = {
  detectado: true,
  nome: 'Dr. Carlos Eduardo Lima',
  documento: 'CREA-SP 123456789',
  tipo: 'e-CPF A3 · ICP-Brasil',
};

type ModalValidacao = { tipo: 'bloqueio' | 'aviso'; alertas: AlertaAgrupado[] } | null;

export default function DocumentoGerador() {
  const { empresaAtiva, usuarioId } = useAuth();

  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('PGR');
  const [capitulos, setCapitulos] = useState<Capitulo[]>(capitulosPadrao());
  const [config, setConfig] = useState<ConfiguracaoLayout>(CONFIG_INICIAL);
  const [personalizacao, setPersonalizacao] = useState<Personalizacao>(PERSONALIZACAO_VAZIA);

  const [dados, setDados] = useState<DadosDocumento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [validando, setValidando] = useState(false);
  const [modal, setModal] = useState<ModalValidacao>(null);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    setCarregando(true);
    setErro(null);
    carregarDadosDocumento(empresaAtiva.empresa_id)
      .then((d) => {
        if (ativo) setDados(d);
      })
      .catch((e) => {
        if (ativo) setErro(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [empresaAtiva]);

  useEffect(() => {
    if (!empresaAtiva) {
      setPersonalizacao(PERSONALIZACAO_VAZIA);
      return;
    }
    let ativo = true;
    carregarPersonalizacao(empresaAtiva.empresa_id, tipoDocumento)
      .then((p) => {
        if (ativo) setPersonalizacao(p);
      })
      .catch(() => {
        if (ativo) setPersonalizacao(PERSONALIZACAO_VAZIA);
      });
    return () => {
      ativo = false;
    };
  }, [empresaAtiva, tipoDocumento]);

  const paginasPorCapitulo = useMemo(() => {
    if (!dados) return new Map<CapituloId, number>();
    const folhas = montarFolhas(capitulos, dados, tipoDocumento, personalizacao);
    const mapa = new Map<CapituloId, number>();
    for (const f of folhas) mapa.set(f.capituloId, (mapa.get(f.capituloId) ?? 0) + 1);
    return mapa;
  }, [capitulos, dados, tipoDocumento, personalizacao]);

  const itensDinamicos = useMemo(() => {
    if (!dados) return {};
    return {
      inventario_riscos: tipoDocumento === 'PCMSO' ? dados.exames.length : dados.riscos.length,
      cronograma_acoes: dados.cronograma.length,
    } as Partial<Record<CapituloId, number>>;
  }, [dados, tipoDocumento]);

  function imprimir() {
    window.print();
  }

  async function handleSalvarPersonalizacao(patch: Partial<Personalizacao>) {
    if (!empresaAtiva) return;
    await salvarPersonalizacao(empresaAtiva.empresa_id, tipoDocumento, usuarioId, patch);
    setPersonalizacao((p) => ({ ...p, ...patch }));
  }

  async function handleSalvarNotaRisco(riscoId: string, nota: string) {
    await salvarNotaRisco(riscoId, nota);
    const notaFinal = nota.trim() ? nota : null;
    setDados((d) => (d ? { ...d, riscos: d.riscos.map((r) => (r.id === riscoId ? { ...r, notaDocumento: notaFinal } : r)) } : d));
  }

  async function handleSalvarNotaAcao(acaoId: string, nota: string) {
    await salvarNotaAcao(acaoId, nota);
    const notaFinal = nota.trim() ? nota : null;
    setDados((d) =>
      d ? { ...d, cronograma: d.cronograma.map((a) => (a.id === acaoId ? { ...a, notaDocumento: notaFinal } : a)) } : d
    );
  }

  async function handleGerar() {
    if (!empresaAtiva) return;
    setValidando(true);
    setErroValidacao(null);
    try {
      const brutos = await auditarEmpresa(empresaAtiva.empresa_id);
      const agrupados = agruparAlertas(brutos);
      const bloqueios = agrupados.filter((a) => a.severidade === 'HARD_BLOCK');
      const avisos = agrupados.filter((a) => a.severidade === 'WARNING_ADVISORY');

      if (bloqueios.length > 0) {
        setModal({ tipo: 'bloqueio', alertas: bloqueios });
      } else if (avisos.length > 0) {
        setModal({ tipo: 'aviso', alertas: avisos });
      } else {
        imprimir();
      }
    } catch (e) {
      setErroValidacao(e instanceof Error ? e.message : String(e));
    } finally {
      setValidando(false);
    }
  }

  if (carregando) {
    return (
      <div className={`flex-1 flex items-center justify-center ${TEMA.bgTela} min-h-[60vh]`}>
        <span className="material-symbols-outlined animate-spin text-[28px] text-[#1E3A8A]">progress_activity</span>
      </div>
    );
  }

  if (erro || !dados) {
    return (
      <div className={`flex-1 p-6 ${TEMA.bgTela}`}>
        <div className={`${TEMA.blocoBg} rounded-lg px-4 py-3 text-sm ${TEMA.blocoTexto}`}>
          {erro ?? 'Selecione uma empresa para elaborar o documento.'}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col ${TEMA.bgTela}`}>
      <header className={`nao-imprimir flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b ${TEMA.bordaSutil} bg-white`}>
        <div>
          <h1 className={`text-lg font-bold ${TEMA.titulo}`}>Elaboração e Impressão de Documentos SST</h1>
          <p className={`text-xs ${TEMA.muted}`}>{empresaAtiva?.empresa.nome_fantasia || empresaAtiva?.empresa.razao_social}</p>
        </div>
        <div className="flex gap-1 bg-[#F1F5F9] rounded-lg p-1">
          {TIPOS.map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => setTipoDocumento(tipo)}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                tipoDocumento === tipo ? 'bg-white text-[#1E3A8A] shadow-sm' : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              {tipo}
            </button>
          ))}
        </div>
      </header>

      {erroValidacao && (
        <div className={`nao-imprimir mx-5 mt-3 ${TEMA.blocoBg} rounded-lg px-4 py-3 text-sm ${TEMA.blocoTexto}`}>
          Falha ao rodar o SST Linter: {erroValidacao}
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <aside className={`nao-imprimir w-full lg:w-1/4 lg:h-[calc(100vh-4.5rem)] lg:overflow-y-auto border-b lg:border-b-0 lg:border-r ${TEMA.bordaSutil} bg-white`}>
          <EstruturaOutline
            tipoDocumento={tipoDocumento}
            capitulos={capitulos}
            onChange={setCapitulos}
            paginasPorCapitulo={paginasPorCapitulo}
            itensDinamicos={itensDinamicos}
            personalizacao={personalizacao}
            onSalvarPersonalizacao={handleSalvarPersonalizacao}
            riscos={dados.riscos}
            exames={dados.exames}
            cronograma={dados.cronograma}
            onSalvarNotaRisco={handleSalvarNotaRisco}
            onSalvarNotaAcao={handleSalvarNotaAcao}
          />
        </aside>

        <section className="w-full lg:w-1/2 lg:h-[calc(100vh-4.5rem)]">
          <PreviewDocumento
            tipoDocumento={tipoDocumento}
            capitulos={capitulos}
            dados={dados}
            config={config}
            personalizacao={personalizacao}
          />
        </section>

        <aside className={`nao-imprimir w-full lg:w-1/4 lg:h-[calc(100vh-4.5rem)] lg:overflow-y-auto border-t lg:border-t-0 lg:border-l ${TEMA.bordaSutil} bg-white`}>
          <PainelControle
            config={config}
            onConfigChange={setConfig}
            certificado={CERTIFICADO_MOCK}
            validando={validando}
            onGerar={handleGerar}
          />
        </aside>
      </div>

      {modal?.tipo === 'bloqueio' && (
        <ModalBloqueioLinter alertas={modal.alertas} onFechar={() => setModal(null)} />
      )}
      {modal?.tipo === 'aviso' && (
        <ModalAvisoLinter
          alertas={modal.alertas}
          onCancelar={() => setModal(null)}
          onProsseguir={() => {
            setModal(null);
            imprimir();
          }}
        />
      )}
    </div>
  );
}
