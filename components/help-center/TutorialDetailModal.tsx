'use client';

import React, { useState } from 'react';
import { TutorialItem } from './tutorialsData';
import { ScreenMockup } from './ScreenMockup';
import { ProcessInfographic } from './ProcessInfographic';
import { InteractiveVideoSimulator } from './InteractiveVideoSimulator';
import { 
  X, 
  BookOpen, 
  Sparkles, 
  ExternalLink, 
  PlayCircle, 
  HelpCircle, 
  CheckSquare, 
  AlertTriangle, 
  Clock, 
  Award, 
  ArrowRight,
  FileSpreadsheet,
  Layers,
  ShieldCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface TutorialDetailModalProps {
  tutorial: TutorialItem | null;
  onClose: () => void;
  onNavigate: (viewId: string) => void;
}

export const TutorialDetailModal: React.FC<TutorialDetailModalProps> = ({
  tutorial,
  onClose,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<'STEPS' | 'INFOGRAPHIC' | 'VIDEO' | 'CHECKLIST' | 'FAQ'>('STEPS');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!tutorial) return null;

  const currentStep = tutorial.steps[currentStepIndex] || tutorial.steps[0];

  const handleLaunchTool = () => {
    onClose();
    onNavigate(tutorial.targetViewId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-950/70 flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {tutorial.categoryLabel}
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                Nível: {tutorial.difficulty}
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono flex items-center space-x-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{tutorial.estimatedMinutes} min de leitura</span>
              </span>
              {tutorial.regulatoryRef && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                  {tutorial.regulatoryRef}
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {tutorial.title}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
              {tutorial.subtitle}
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleLaunchTool}
              className="hidden sm:flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950/50 transition active:scale-95"
            >
              <span>Abrir no Sistema</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Fechar Tutorial"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-4 sm:px-6 bg-slate-950/40 border-b border-slate-800 flex items-center space-x-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('STEPS')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'STEPS'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>1. Passo a Passo com Prints ({tutorial.steps.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('INFOGRAPHIC')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'INFOGRAPHIC'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>2. Infográfico do Processo</span>
          </button>

          <button
            onClick={() => setActiveTab('VIDEO')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'VIDEO'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlayCircle className="w-4 h-4 text-rose-400" />
            <span>3. Vídeo Simulador ({tutorial.videoSimulator.totalDurationSeconds}s)</span>
          </button>

          <button
            onClick={() => setActiveTab('CHECKLIST')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'CHECKLIST'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-blue-400" />
            <span>4. Boas Práticas & Erros Comuns</span>
          </button>

          <button
            onClick={() => setActiveTab('FAQ')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'FAQ'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>5. Perguntas Frequentes</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
          {/* TAB 1: STEPS WITH REAL MOCKUPS */}
          {activeTab === 'STEPS' && (
            <div className="space-y-6">
              {/* Step Navigation Pill Selector */}
              <div className="flex items-center justify-between gap-2 p-2 bg-slate-950/60 rounded-2xl border border-slate-800">
                <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-1">
                  {tutorial.steps.map((st, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentStepIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap ${
                        currentStepIndex === idx
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-slate-950/30 flex items-center justify-center text-[10px]">
                        {st.stepNumber}
                      </span>
                      <span>Passo {st.stepNumber}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    disabled={currentStepIndex === 0}
                    onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={currentStepIndex === tutorial.steps.length - 1}
                    onClick={() => setCurrentStepIndex(prev => Math.min(tutorial.steps.length - 1, prev + 1))}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Active Step Description Card */}
              <div className="p-4 sm:p-5 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-emerald-400 tracking-wider">
                    Passo {currentStep.stepNumber} de {tutorial.steps.length}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Ação: <strong>{currentStep.highlightAction}</strong>
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">
                  {currentStep.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {currentStep.description}
                </p>
              </div>

              {/* Realistic High-Fidelity UI Screenshot Mockup */}
              <ScreenMockup step={currentStep} activeNumber={currentStep.stepNumber} />
            </div>
          )}

          {/* TAB 2: PROCESS INFOGRAPHIC */}
          {activeTab === 'INFOGRAPHIC' && (
            <ProcessInfographic 
              infographic={tutorial.infographic} 
              title={tutorial.title} 
            />
          )}

          {/* TAB 3: VIDEO SIMULATOR */}
          {activeTab === 'VIDEO' && (
            <div className="space-y-4">
              <InteractiveVideoSimulator videoData={tutorial.videoSimulator} />
            </div>
          )}

          {/* TAB 4: CHECKLIST & BOAS PRÁTICAS */}
          {activeTab === 'CHECKLIST' && (
            <div className="space-y-6">
              <div className="p-5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  <span>Por que este processo é importante? (Utilidade no Negócio)</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {tutorial.processUtility}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Boas Práticas Recomendadas</span>
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-start space-x-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Sempre confira os dados cadastrais antes de emitir a versão final.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Mantenha os contatos de e-mail e WhatsApp atualizados para automações.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Acione a Pausa Regulamentar de SLA no primeiro sinal de pendência do cliente.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Erros Comuns a Evitar</span>
                  </h4>
                  <div className="space-y-3">
                    {tutorial.commonMistakes.map((cm, idx) => (
                      <div key={idx} className="text-xs space-y-1">
                        <p className="font-semibold text-rose-300">❌ {cm.mistake}</p>
                        <p className="text-slate-400">💡 <strong>Como prevenir:</strong> {cm.prevention}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: FAQ */}
          {activeTab === 'FAQ' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white mb-3">
                Dúvidas Frequentes sobre {tutorial.title}
              </h3>
              <div className="space-y-3">
                {tutorial.faq.map((item, idx) => (
                  <div key={idx} className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1.5">
                    <h4 className="text-xs sm:text-sm font-bold text-emerald-300 flex items-start space-x-2">
                      <span className="text-slate-500 font-mono">Q{idx + 1}:</span>
                      <span>{item.question}</span>
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed pl-6">
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Sticky Action Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-400 hidden sm:block">
            Módulo Vinculado: <strong className="text-white">{tutorial.categoryLabel}</strong>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Fechar Tutorial
            </button>

            <button
              onClick={handleLaunchTool}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/50 transition active:scale-95"
            >
              <span>Experimentar Ferramenta no Sistema</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
