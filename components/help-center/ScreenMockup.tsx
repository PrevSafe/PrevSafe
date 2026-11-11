'use client';

import React from 'react';
import { TutorialStep } from './tutorialsData';
import { 
  Monitor, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
  FileText,
  Smartphone
} from 'lucide-react';

interface ScreenMockupProps {
  step: TutorialStep;
  activeNumber?: number;
}

export const ScreenMockup: React.FC<ScreenMockupProps> = ({ step, activeNumber }) => {
  const { mockupDetails, screenType, tip, highlightAction } = step;

  return (
    <div className="rounded-2xl border border-borda bg-superficie overflow-hidden shadow-sm transition-all">
      {/* Browser / App Window Chrome */}
      <div className="bg-fundo px-4 py-2.5 border-b border-borda flex items-center justify-between select-none">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-marca-suave" />
          </div>
          <span className="text-[11px] font-mono text-tinta-2 ml-2 flex items-center space-x-1">
            <Shield className="w-3 h-3 text-marca-escura inline mr-1" />
            <span>app.prevsafe.com.br/{mockupDetails.breadcrumbs.map(b => b.toLowerCase().replace(/\s+/g, '-')).join('/')}</span>
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-superficie-2 text-tinta border border-borda font-mono">
            {screenType === 'PWA' ? '📱 Mobile PWA' : '💻 Web App'}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-marca-suave text-marca-escura font-bold border border-marca-borda">
            Print Ilustrado Passo {step.stepNumber}
          </span>
        </div>
      </div>

      {/* Screen Body */}
      <div className="bg-superficie p-4 sm:p-6 space-y-4">
        {/* Mockup Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-borda">
          <div>
            <div className="flex items-center space-x-1.5 text-xs text-tinta-2 mb-1">
              {mockupDetails.breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <span>{crumb}</span>
                  {idx < mockupDetails.breadcrumbs.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-tinta-2" />
                  )}
                </React.Fragment>
              ))}
            </div>
            <h4 className="text-base font-bold text-tinta flex items-center space-x-2">
              <span>{mockupDetails.screenTitle}</span>
            </h4>
          </div>

          {mockupDetails.mainActionLabel && (
            <div className="bg-marca-escura inline-flex items-center px-3.5 py-1.5 text-white rounded-xl text-xs font-semibold shadow-sm ring-2 ring-marca-escura animate-pulse">
              <span>{mockupDetails.mainActionLabel}</span>
            </div>
          )}
        </div>

        {/* Mockup Content Layout */}
        <div className="space-y-3">
          {mockupDetails.fieldsOrItems && mockupDetails.fieldsOrItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {mockupDetails.fieldsOrItems.map((item, idx) => (
                <div 
                  key={idx}
                  className="p-3 bg-fundo rounded-xl border border-borda hover:border-borda transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-tinta">{item.label}</span>
                    {item.status && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-marca-suave text-marca-escura font-medium">
                        {item.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-tinta-2 font-mono">{item.value}</p>
                  {item.badge && (
                    <span className="inline-block mt-2 text-[10px] px-2 py-0.5 bg-teal-500/20 text-teal-800 rounded font-sans border border-teal-500/30">
                      {item.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Highlight Callout Box */}
          {mockupDetails.highlightBox && (
            <div className={`p-4 rounded-xl border ${
              mockupDetails.highlightBox.color === 'emerald'
                ? 'bg-marca-suave border-marca-borda text-marca-escura'
                : mockupDetails.highlightBox.color === 'blue'
                ? 'bg-teal-50 border-teal-500/40 text-teal-700'
                : mockupDetails.highlightBox.color === 'amber'
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-teal-50 border-teal-500/40 text-teal-700'
            }`}>
              <div className="flex items-start space-x-2.5">
                <div className="p-1.5 rounded-lg bg-superficie shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-marca-escura" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-tinta">{mockupDetails.highlightBox.title}</h5>
                  <p className="text-xs text-tinta mt-0.5">{mockupDetails.highlightBox.desc}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tip / Recommendation Bar */}
        {tip && (
          <div className="pt-2 border-t border-borda flex items-center justify-between text-xs text-tinta-2">
            <span className="flex items-center space-x-1.5">
              <span className="font-bold text-amber-700">💡 Dica de Ouro:</span>
              <span>{tip}</span>
            </span>
            <span className="text-[11px] text-marca-escura font-semibold hidden md:inline">
              Ação: {highlightAction}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
