import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { AlertaAgrupado } from '@/lib/sstLinter';
import { TEMA } from './tema';

function Overlay({ children, onFechar }: { children: React.ReactNode; onFechar: () => void }) {
  return createPortal(
    <div
      onClick={onFechar}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0F172A]/50"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl max-h-[85vh] flex flex-col">
        {children}
      </div>
    </div>,
    document.body
  );
}

/**
 * Bloqueio (HARD_BLOCK): impede a geração/impressão até que os erros
 * estruturais sejam corrigidos. Cada alerta traz Título, Diagnóstico,
 * Impacto Regulatório e um passo a passo resolutivo com atalho para a
 * tela onde o dado deve ser corrigido.
 */
export function ModalBloqueioLinter({
  alertas,
  onFechar,
}: {
  alertas: AlertaAgrupado[];
  onFechar: () => void;
}) {
  return (
    <Overlay onFechar={onFechar}>
      <div className={`bg-white rounded-xl border-2 border-[#FCA5A5] shadow-2xl flex flex-col overflow-hidden`}>
        <header className={`${TEMA.blocoBg} px-6 py-4 flex items-start gap-3 shrink-0`}>
          <span className={`material-symbols-outlined text-[24px] ${TEMA.blocoTexto}`}>block</span>
          <div className="flex-1 min-w-0">
            <h2 className={`text-base font-bold ${TEMA.blocoTexto}`}>
              Geração bloqueada pelo SST Linter
            </h2>
            <p className={`text-sm ${TEMA.blocoTexto}`}>
              {alertas.length} inconsistência{alertas.length === 1 ? '' : 's'} crítica{alertas.length === 1 ? '' : 's'} impede
              {alertas.length === 1 ? '' : 'm'} o envio dos eventos ao eSocial.
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center hover:bg-[#DC2626]/10 ${TEMA.blocoTexto}`}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </header>

        <div className="overflow-y-auto p-6 flex flex-col gap-5 bg-white">
          {alertas.map((alerta) => (
            <div key={alerta.id} className={`${TEMA.cardArredondado} p-4 flex flex-col gap-2`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className={`text-sm font-semibold ${TEMA.titulo}`}>{alerta.titulo}</h3>
                {alerta.ocorrencias > 1 && (
                  <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626]">
                    Afeta {alerta.ocorrencias} trabalhadores
                  </span>
                )}
              </div>
              <p className={`text-sm ${TEMA.texto}`}>{alerta.diagnostico}</p>
              <p className={`text-xs ${TEMA.muted}`}>
                <strong className={TEMA.texto}>Impacto regulatório: </strong>
                {alerta.impacto}
              </p>
              <div className="rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] p-3 flex flex-col gap-2">
                <p className="text-xs font-semibold text-[#1E3A8A]">Como resolver</p>
                <p className="text-xs text-[#1E3A8A]">{alerta.resolucao}</p>
                {alerta.acao && (
                  <Link
                    to={alerta.acao.para}
                    onClick={onFechar}
                    className="self-start text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#1E40AF] rounded-md px-3 py-1.5 flex items-center gap-1.5 transition-colors"
                  >
                    {alerta.acao.rotulo}
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        <footer className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end shrink-0">
          <button type="button" onClick={onFechar} className={`h-10 px-4 rounded-lg text-sm ${TEMA.botaoSecundario}`}>
            Fechar e corrigir
          </button>
        </footer>
      </div>
    </Overlay>
  );
}

/**
 * Aviso (WARNING_ADVISORY): não bloqueia estruturalmente, mas expõe risco
 * fiscal/regulatório. O usuário decide se assume o risco ou ajusta antes.
 */
export function ModalAvisoLinter({
  alertas,
  onProsseguir,
  onCancelar,
}: {
  alertas: AlertaAgrupado[];
  onProsseguir: () => void;
  onCancelar: () => void;
}) {
  return (
    <Overlay onFechar={onCancelar}>
      <div className="bg-white rounded-xl border-2 border-[#FCD34D] shadow-2xl flex flex-col overflow-hidden">
        <header className={`${TEMA.avisoBg} px-6 py-4 flex items-start gap-3 shrink-0`}>
          <span className={`material-symbols-outlined text-[24px] ${TEMA.avisoTexto}`}>warning</span>
          <div className="flex-1 min-w-0">
            <h2 className={`text-base font-bold ${TEMA.avisoTexto}`}>Avisos de risco fiscal encontrados</h2>
            <p className={`text-sm ${TEMA.avisoTexto}`}>
              O documento pode ser gerado, mas há {alertas.length} ponto{alertas.length === 1 ? '' : 's'} de atenção que
              podem gerar autuação se não forem ajustados.
            </p>
          </div>
        </header>

        <div className="overflow-y-auto p-6 flex flex-col gap-5 bg-white">
          {alertas.map((alerta) => (
            <div key={alerta.id} className={`${TEMA.cardArredondado} p-4 flex flex-col gap-2`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className={`text-sm font-semibold ${TEMA.titulo}`}>{alerta.titulo}</h3>
                {alerta.ocorrencias > 1 && (
                  <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#D97706]">
                    Afeta {alerta.ocorrencias} trabalhadores
                  </span>
                )}
              </div>
              <p className={`text-sm ${TEMA.texto}`}>{alerta.diagnostico}</p>
              <p className={`text-xs ${TEMA.muted}`}>
                <strong className={TEMA.texto}>Impacto regulatório: </strong>
                {alerta.impacto}
              </p>
              <p className="text-xs text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-3">
                <strong>Como resolver: </strong>
                {alerta.resolucao}
              </p>
            </div>
          ))}
        </div>

        <footer className="px-6 py-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row gap-2 sm:justify-end shrink-0">
          <button
            type="button"
            onClick={onCancelar}
            className={`h-10 px-4 rounded-lg text-sm ${TEMA.botaoSecundario}`}
          >
            Cancelar para ajustar no DP
          </button>
          <button
            type="button"
            onClick={onProsseguir}
            className="h-10 px-4 rounded-lg text-sm font-semibold text-white bg-[#D97706] hover:bg-[#B45309] transition-colors"
          >
            Prosseguir com a impressão mesmo assim
          </button>
        </footer>
      </div>
    </Overlay>
  );
}
