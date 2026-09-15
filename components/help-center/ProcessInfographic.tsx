'use client';

import React from 'react';
import { InfographicNode } from './tutorialsData';
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowDown, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  FileCheck, 
  Sparkles,
  HelpCircle,
  Scale
} from 'lucide-react';

interface ProcessInfographicProps {
  infographic: {
    objective: string;
    flowNodes: InfographicNode[];
    regulatoryCompliance: string;
    criticalSuccessFactor: string;
  };
  title: string;
}

export const ProcessInfographic: React.FC<ProcessInfographicProps> = ({ infographic, title }) => {
  const { objective, flowNodes, regulatoryCompliance, criticalSuccessFactor } = infographic;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-7 space-y-6">
      {/* Header of Infographic */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4" />
          <span>Infográfico de Processo & Utilidade Operacional</span>
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
          Fluxo de Trabalho: {title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
          <strong>Objetivo Estratégico:</strong> {objective}
        </p>
      </div>

      {/* Compliance & Critical Factor Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">Enquadramento Regulamentar & Legal</h4>
            <p className="text-xs text-slate-400 mt-0.5">{regulatoryCompliance}</p>
          </div>
        </div>

        <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">Fator Crítico de Sucesso</h4>
            <p className="text-xs text-slate-400 mt-0.5">{criticalSuccessFactor}</p>
          </div>
        </div>
      </div>

      {/* Visual Flow Pipeline */}
      <div className="space-y-4 pt-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Etapas Sequenciais do Processo (Pontos de Passagem de Bastão)</span>
          <span className="text-[11px] text-emerald-400 lowercase font-normal">
            {flowNodes.length} etapas mapeadas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
          {flowNodes.map((node, index) => {
            const isLast = index === flowNodes.length - 1;

            return (
              <div key={node.id} className="relative flex flex-col">
                <div className={`p-4 rounded-xl border flex-1 flex flex-col justify-between transition-all ${
                  node.actorColor === 'emerald'
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : node.actorColor === 'blue'
                    ? 'bg-blue-950/20 border-blue-500/30'
                    : node.actorColor === 'purple'
                    ? 'bg-purple-950/20 border-purple-500/30'
                    : 'bg-amber-950/20 border-amber-500/30'
                }`}>
                  {/* Phase & Step Pill */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-700">
                        {node.phase}
                      </span>
                      {node.slaTime && (
                        <span className="text-[10px] font-mono text-emerald-300 flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{node.slaTime}</span>
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white mb-1.5 flex items-center space-x-1.5">
                      <span>{node.title}</span>
                    </h4>

                    <div className="text-[11px] font-medium text-slate-300 mb-2 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Responsável: <strong>{node.actor}</strong></span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed mb-3">
                      {node.description}
                    </p>
                  </div>

                  {/* Node Output */}
                  <div className="pt-3 border-t border-slate-800/80">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Entregável / Saída:</span>
                    <div className="text-xs font-semibold text-emerald-300 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60 flex items-center space-x-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{node.output}</span>
                    </div>
                  </div>

                  {/* Decision branching if any */}
                  {node.isDecision && node.decisionChoices && (
                    <div className="mt-2 text-[10px] p-1.5 bg-amber-950/40 border border-amber-500/30 rounded text-amber-200">
                      <strong>Ramificação:</strong> {node.decisionChoices.yes}
                    </div>
                  )}
                </div>

                {/* Arrow Connector for Desktop */}
                {!isLast && (
                  <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 items-center justify-center text-slate-300 shadow-md">
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
