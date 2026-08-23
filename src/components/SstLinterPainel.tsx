import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { auditarFuncionario, type Alerta } from '@/lib/sstLinter';

const ESTILO: Record<Alerta['severidade'], { bloco: string; icone: string; rotulo: string }> = {
  HARD_BLOCK: { bloco: 'bg-error-container text-on-error-container', icone: 'block', rotulo: 'Bloqueio' },
  WARNING_ADVISORY: { bloco: 'bg-[#F97316]/15 text-[#9a3412]', icone: 'warning', rotulo: 'Aviso' },
};

export default function SstLinterPainel({ funcionarioId }: { funcionarioId: string }) {
  const { empresaAtiva } = useAuth();
  const [alertas, setAlertas] = useState<Alerta[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState(true);

  useEffect(() => {
    if (!empresaAtiva) return;
    let ativo = true;
    auditarFuncionario(empresaAtiva.empresa_id, funcionarioId)
      .then((a) => {
        if (ativo) setAlertas(a);
      })
      .catch((e) => {
        if (ativo) setErro(e instanceof Error ? e.message : String(e));
      });
    return () => {
      ativo = false;
    };
  }, [empresaAtiva, funcionarioId]);

  if (erro || !alertas || alertas.length === 0) return null;

  const bloqueios = alertas.filter((a) => a.severidade === 'HARD_BLOCK').length;

  return (
    <div className="flex flex-col gap-3 px-margin-mobile md:px-md py-4 max-w-3xl w-full border-t border-outline-variant">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-2 text-title-md text-on-surface"
      >
        <span className="material-symbols-outlined text-primary">fact_check</span>
        Auditoria do SST Linter
        <span className="px-2 py-0.5 rounded-full text-label-sm bg-error-container text-on-error-container">
          {bloqueios} bloqueio{bloqueios === 1 ? '' : 's'}
        </span>
        <span className="material-symbols-outlined ml-auto">{aberto ? 'expand_less' : 'expand_more'}</span>
      </button>

      {aberto && (
        <div className="flex flex-col gap-3">
          {alertas.map((alerta, i) => {
            const estilo = ESTILO[alerta.severidade];
            return (
              <div key={`${alerta.id}-${i}`} className={`rounded-lg px-4 py-3 flex flex-col gap-2 ${estilo.bloco}`}>
                <div className="flex items-center gap-2 text-label-lg">
                  <span className="material-symbols-outlined text-[18px]">{estilo.icone}</span>
                  <span className="font-medium">
                    [{estilo.rotulo}] {alerta.titulo}
                  </span>
                </div>
                <p className="text-label-md">{alerta.diagnostico}</p>
                <p className="text-label-sm">
                  <strong>Impacto: </strong>
                  {alerta.impacto}
                </p>
                <p className="text-label-sm">
                  <strong>Como resolver: </strong>
                  {alerta.resolucao}
                </p>
                {alerta.acao && (
                  <Link
                    to={alerta.acao.para}
                    className="self-start text-label-sm underline underline-offset-2 font-medium"
                  >
                    {alerta.acao.rotulo} →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
