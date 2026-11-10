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
    <div className="bg-superficie border border-borda rounded-2xl p-4 sm:p-7 space-y-6">
      {/* Header of Infographic */}
      <div className="border-b border-borda pb-5">
        <div className="flex items-center space-x-2 text-marca-escura text-xs font-semibold uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4" />
          <span>Infográfico de Processo & Utilidade Operacional</span>
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-tinta tracking-tight">
          Fluxo de Trabalho: {title}
        </h3>
        <p className="text-xs sm:text-sm text-tinta mt-1 max-w-3xl">
          <strong>Objetivo Estratégico:</strong> {objective}
        </p>
      </div>

      {/* Compliance & Critical Factor Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3.5 bg-fundo rounded-xl border border-borda flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-marca-suave text-marca-escura shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-tinta">Enquadramento Regulamentar & Legal</h4>
            <p className="text-xs text-tinta-2 mt-0.5">{regulatoryCompliance}</p>
          </div>
        </div>

        <div className="p-3.5 bg-fundo rounded-xl border border-borda flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-800 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-tinta">Fator Crítico de Sucesso</h4>
            <p className="text-xs text-tinta-2 mt-0.5">{criticalSuccessFactor}</p>
          </div>
        </div>
      </div>

      {/* Visual Flow Pipeline */}
      <div className="space-y-4 pt-2">
        <div className="text-xs font-bold uppercase tracking-wider text-tinta-2 flex items-center justify-between">
          <span>Etapas Sequenciais do Processo (Pontos de Passagem de Bastão)</span>
          <span className="text-[11px] text-marca-escura lowercase font-normal">
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
                    ? 'bg-marca-suave border-marca-escura'
                    : node.actorColor === 'blue'
                    ? 'bg-teal-50 border-teal-500/30'
                    : node.actorColor === 'purple'
                    ? 'bg-teal-50 border-teal-500/30'
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  {/* Phase & Step Pill */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-superficie text-tinta border border-borda">
                        {node.phase}
                      </span>
                      {node.slaTime && (
                        <span className="text-[10px] font-mono text-marca-escura flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{node.slaTime}</span>
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-tinta mb-1.5 flex items-center space-x-1.5">
                      <span>{node.title}</span>
                    </h4>

                    <div className="text-[11px] font-medium text-tinta mb-2 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-marca" />
                      <span>Responsável: <strong>{node.actor}</strong></span>
                    </div>

                    <p className="text-xs text-tinta-2 leading-relaxed mb-3">
                      {node.description}
                    </p>
                  </div>

                  {/* Node Output */}
                  <div className="pt-3 border-t border-borda">
                    <span className="text-[10px] font-bold uppercase text-tinta-2 block mb-0.5">Entregável / Saída:</span>
                    <div className="text-xs font-semibold text-marca-escura bg-fundo p-1.5 rounded-lg border border-borda flex items-center space-x-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-marca-escura shrink-0" />
                      <span className="truncate">{node.output}</span>
                    </div>
                  </div>

                  {/* Decision branching if any */}
                  {node.isDecision && node.decisionChoices && (
                    <div className="mt-2 text-[10px] p-1.5 bg-amber-50 border border-amber-200 rounded text-amber-700">
                      <strong>Ramificação:</strong> {node.decisionChoices.yes}
                    </div>
                  )}
                </div>

                {/* Arrow Connector for Desktop */}
                {!isLast && (
                  <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-superficie-2 border border-borda items-center justify-center text-tinta shadow-md">
                    <ArrowRight className="w-3.5 h-3.5 text-marca-escura" />
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
