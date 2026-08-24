import { MARGEM_LABEL, type ConfiguracaoLayout, type Fonte, type Margem } from '@/lib/documentos';
import { TEMA } from './tema';

type Certificado = {
  detectado: boolean;
  nome: string;
  documento: string;
  tipo: string;
};

type Props = {
  config: ConfiguracaoLayout;
  onConfigChange: (config: ConfiguracaoLayout) => void;
  certificado: Certificado;
  validando: boolean;
  onGerar: () => void;
};

function Toggle({ ligado, onClick, rotulo }: { ligado: boolean; onClick: () => void; rotulo: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between gap-3 w-full py-1.5"
      aria-pressed={ligado}
    >
      <span className={`text-sm ${TEMA.texto}`}>{rotulo}</span>
      <span
        className={`relative shrink-0 h-6 w-11 rounded-full transition-colors ${
          ligado ? 'bg-[#1E3A8A]' : 'bg-[#CBD5E1]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            ligado ? 'translate-x-5.5' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}

export default function PainelControle({ config, onConfigChange, certificado, validando, onGerar }: Props) {
  function set<K extends keyof ConfiguracaoLayout>(chave: K, valor: ConfiguracaoLayout[K]) {
    onConfigChange({ ...config, [chave]: valor });
  }

  return (
    <div className="h-full flex flex-col gap-5 p-5">
      <h2 className={`text-base font-semibold ${TEMA.titulo}`}>Painel de Controle</h2>

      <section className={`${TEMA.cardArredondado} p-4 flex flex-col gap-3`}>
        <h3 className={`text-xs font-semibold uppercase tracking-wide ${TEMA.muted}`}>Ajustes de Layout</h3>

        <label className="flex flex-col gap-1">
          <span className={`text-xs ${TEMA.muted}`}>Margens</span>
          <select
            value={config.margem}
            onChange={(e) => set('margem', e.target.value as Margem)}
            className={TEMA.campo}
          >
            {(Object.keys(MARGEM_LABEL) as Margem[]).map((m) => (
              <option key={m} value={m}>
                {MARGEM_LABEL[m]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={`text-xs ${TEMA.muted}`}>Tipografia</span>
          <select
            value={config.fonte}
            onChange={(e) => set('fonte', e.target.value as Fonte)}
            className={TEMA.campo}
          >
            <option value="Arial">Arial</option>
            <option value="Calibri">Calibri</option>
            <option value="Times New Roman">Times New Roman</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={`text-xs ${TEMA.muted}`}>Tamanho da fonte base ({config.tamanhoFonte}pt)</span>
          <input
            type="range"
            min={9}
            max={14}
            step={1}
            value={config.tamanhoFonte}
            onChange={(e) => set('tamanhoFonte', Number(e.target.value))}
            className="w-full accent-[#1E3A8A]"
          />
        </label>

        <div className="border-t border-[#E2E8F0] pt-2 flex flex-col">
          <Toggle
            ligado={config.exibirAssinaturas}
            onClick={() => set('exibirAssinaturas', !config.exibirAssinaturas)}
            rotulo="Exibir assinaturas no rodapé"
          />
          <Toggle
            ligado={config.exibirIndice}
            onClick={() => set('exibirIndice', !config.exibirIndice)}
            rotulo="Exibir índice analítico"
          />
          <Toggle
            ligado={config.exibirNotasRodape}
            onClick={() => set('exibirNotasRodape', !config.exibirNotasRodape)}
            rotulo="Exibir notas de rodapé"
          />
        </div>
      </section>

      <section className={`${TEMA.cardArredondado} p-4 flex flex-col gap-3`}>
        <h3 className={`text-xs font-semibold uppercase tracking-wide ${TEMA.muted}`}>Assinatura Digital</h3>
        <div
          className={`rounded-lg border p-3 flex items-start gap-2.5 ${
            certificado.detectado ? 'border-[#86EFAC] bg-[#F0FDF4]' : 'border-[#E2E8F0] bg-[#F8FAFC]'
          }`}
        >
          <span
            className={`material-symbols-outlined text-[20px] mt-0.5 shrink-0 ${
              certificado.detectado ? 'text-[#16A34A]' : 'text-[#94A3B8]'
            }`}
          >
            {certificado.detectado ? 'verified_user' : 'no_accounts'}
          </span>
          <div className="min-w-0">
            <p className={`text-xs font-semibold ${certificado.detectado ? 'text-[#15803D]' : TEMA.muted}`}>
              {certificado.detectado ? 'Certificado Detectado' : 'Nenhum certificado detectado'}
            </p>
            {certificado.detectado && (
              <>
                <p className={`text-sm ${TEMA.texto} truncate`}>
                  {certificado.nome} — {certificado.documento}
                </p>
                <p className={`text-[11px] ${TEMA.muted}`}>{certificado.tipo}</p>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="mt-auto pt-2">
        <button
          type="button"
          onClick={onGerar}
          disabled={validando}
          className={`w-full h-12 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${TEMA.botaoPrimario}`}
        >
          {validando ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              Validando com o SST Linter…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">print</span>
              Gerar e Imprimir Documento
            </>
          )}
        </button>
      </div>
    </div>
  );
}
