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
    <div className="rounded-2xl border border-slate-700/80 bg-slate-900/95 overflow-hidden shadow-2xl transition-all">
      {/* Browser / App Window Chrome */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between select-none">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[11px] font-mono text-slate-400 ml-2 flex items-center space-x-1">
            <Shield className="w-3 h-3 text-emerald-400 inline mr-1" />
            <span>app.prevsafe.com.br/{mockupDetails.breadcrumbs.map(b => b.toLowerCase().replace(/\s+/g, '-')).join('/')}</span>
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
            {screenType === 'PWA' ? '📱 Mobile PWA' : '💻 Web App'}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
            Print Ilustrado Passo {step.stepNumber}
          </span>
        </div>
      </div>

      {/* Screen Body */}
      <div className="p-4 sm:p-6 bg-gradient-to-b from-slate-900 to-slate-950 space-y-4">
        {/* Mockup Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
              {mockupDetails.breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <span>{crumb}</span>
                  {idx < mockupDetails.breadcrumbs.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-slate-600" />
                  )}
                </React.Fragment>
              ))}
            </div>
            <h4 className="text-base font-bold text-white flex items-center space-x-2">
              <span>{mockupDetails.screenTitle}</span>
            </h4>
          </div>

          {mockupDetails.mainActionLabel && (
            <div className="inline-flex items-center px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-400/40 animate-pulse">
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
                  className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-300">{item.label}</span>
                    {item.status && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                        {item.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-mono">{item.value}</p>
                  {item.badge && (
                    <span className="inline-block mt-2 text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded font-sans border border-blue-500/30">
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
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : mockupDetails.highlightBox.color === 'blue'
                ? 'bg-blue-950/30 border-blue-500/40 text-blue-200'
                : mockupDetails.highlightBox.color === 'amber'
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                : 'bg-purple-950/30 border-purple-500/40 text-purple-200'
            }`}>
              <div className="flex items-start space-x-2.5">
                <div className="p-1.5 rounded-lg bg-slate-900/80 shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white">{mockupDetails.highlightBox.title}</h5>
                  <p className="text-xs text-slate-300 mt-0.5">{mockupDetails.highlightBox.desc}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tip / Recommendation Bar */}
        {tip && (
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center space-x-1.5">
              <span className="font-bold text-amber-400">💡 Dica de Ouro:</span>
              <span>{tip}</span>
            </span>
            <span className="text-[11px] text-emerald-400 font-semibold hidden md:inline">
              Ação: {highlightAction}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
