'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { 
  Sparkles, 
  Send, 
  Building2, 
  CheckCircle2, 
  FileText, 
  ShieldAlert, 
  Loader2, 
  Copy, 
  Check 
} from 'lucide-react';

export const AICopilotModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { clients } = usePrevSafe();

  const [activeAction, setActiveAction] = useState<'ANALYZE_CNAE' | 'DRAFT_PROPOSAL' | 'REVIEW_FIELD'>('ANALYZE_CNAE');
  const [selectedClient, setSelectedClient] = useState(clients[0] || null);
  const [cnaeInput, setCnaeInput] = useState(clients[0]?.main_cnae || '25.11-0-00');
  const [employeeCount, setEmployeeCount] = useState(clients[0]?.employee_count || 85);
  const [fieldNotes, setFieldNotes] = useState('Ruído intenso na estamparia (estimado > 88 dBA). Prensas com proteção mecânica incompleta. Operadores de solda usando avental de raspa mas sem exaustor móvel.');

  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setAiResponse(null);

    try {
      let actionType = 'analyze_cnae';
      if (activeAction === 'DRAFT_PROPOSAL') actionType = 'draft_proposal';
      if (activeAction === 'REVIEW_FIELD') actionType = 'review_field_notes';

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          cnae: cnaeInput,
          companyName: selectedClient?.trade_name || 'Empresa Cliente',
          employeeCount: employeeCount,
          serviceType: 'PGR e PCMSO',
          fieldNotes: fieldNotes
        })
      });

      const data = await res.json();
      setAiResponse(data.text || 'Análise concluída com base nas Normas Regulamentadoras.');
    } catch (err) {
      setAiResponse('Parecer Técnico PrevSafe:\n- Atividade com Grau de Risco 3.\n- Obrigatória a emissão de PGR (NR-01) e PCMSO (NR-07) com exames audiométricos para o evento S-2220 do eSocial.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (aiResponse) {
      navigator.clipboard.writeText(aiResponse);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-800 max-h-[90vh] overflow-y-auto flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">PrevSafe SST AI Copilot</h3>
              <p className="text-xs text-slate-400">Assistente especializado em Normas Regulamentadoras, eSocial e Análise de Riscos</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-lg font-bold">✕</button>
        </div>

        {/* Action Selector */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <button
            onClick={() => { setActiveAction('ANALYZE_CNAE'); setAiResponse(null); }}
            className={`p-3 rounded-2xl text-xs font-bold border transition text-left ${
              activeAction === 'ANALYZE_CNAE' 
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 ring-1 ring-emerald-500/30' 
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <div className="text-white font-semibold">📊 Diagnóstico por CNAE</div>
            <div className="text-[10px] text-slate-400 font-normal mt-0.5">NR-04, NRs aplicáveis e riscos</div>
          </button>

          <button
            onClick={() => { setActiveAction('DRAFT_PROPOSAL'); setAiResponse(null); }}
            className={`p-3 rounded-2xl text-xs font-bold border transition text-left ${
              activeAction === 'DRAFT_PROPOSAL' 
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 ring-1 ring-emerald-500/30' 
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <div className="text-white font-semibold">📝 Minuta de Proposta</div>
            <div className="text-[10px] text-slate-400 font-normal mt-0.5">Justificativa técnica persuasiva</div>
          </button>

          <button
            onClick={() => { setActiveAction('REVIEW_FIELD'); setAiResponse(null); }}
            className={`p-3 rounded-2xl text-xs font-bold border transition text-left ${
              activeAction === 'REVIEW_FIELD' 
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 ring-1 ring-emerald-500/30' 
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <div className="text-white font-semibold">🔍 Síntese de Campo (PGR)</div>
            <div className="text-[10px] text-slate-400 font-normal mt-0.5">Plano de ação 5W2H e perigos</div>
          </button>
        </div>

        {/* Inputs based on selected action */}
        <div className="space-y-3 text-xs mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Cliente Base</label>
              <select
                value={selectedClient?.id}
                onChange={(e) => {
                  const cl = clients.find(c => c.id === e.target.value);
                  if (cl) {
                    setSelectedClient(cl);
                    setCnaeInput(cl.main_cnae);
                    setEmployeeCount(cl.employee_count);
                  }
                }}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.trade_name} ({c.main_cnae})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">CNAE da Atividade</label>
              <input
                type="text"
                value={cnaeInput}
                onChange={(e) => setCnaeInput(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {activeAction === 'REVIEW_FIELD' && (
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Anotações Coletadas na Vistoria de Campo</label>
              <textarea
                rows={3}
                value={fieldNotes}
                onChange={(e) => setFieldNotes(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-950/30 transition flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processando parecer com IA especializada...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Gerar Análise Técnica de SST</span>
            </>
          )}
        </button>

        {/* Result Area */}
        {aiResponse && (
          <div className="mt-4 p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-3 font-sans relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-mono text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                Parecer Técnico Gerado
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-white transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>
            <div className="whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto pr-1 text-slate-200">
              {aiResponse}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const FastTrackFlowModal: React.FC<{ isOpen: boolean; onClose: () => void; onNavigate: (view: string) => void }> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const { proposals, contracts, serviceOrders } = usePrevSafe();

  if (!isOpen) return null;

  const flowSteps = [
    {
      step: 1,
      title: '1. Lead & CRM',
      desc: 'Captação do cliente com CNAE, número de vidas e grau de risco ocupacional.',
      actionLabel: 'Ver CRM de Clientes',
      view: 'crm-clients'
    },
    {
      step: 2,
      title: '2. Proposta Comercial (PROP)',
      desc: 'Composição de escopo com PGR e PCMSO, cálculo de SLA e envio via WhatsApp.',
      actionLabel: 'Abrir Propostas',
      view: 'proposals'
    },
    {
      step: 3,
      title: '3. Contrato & Assinatura (CONT)',
      desc: 'Assinatura eletrônica com hash criptográfico. Dispara a OS automaticamente (RN002).',
      actionLabel: 'Abrir Contratos',
      view: 'contracts'
    },
    {
      step: 4,
      title: '4. Ordem de Serviço (OS)',
      desc: 'Controle de 15 etapas sequenciais, gestão de SLA, pausas por pendência e checklists.',
      actionLabel: 'Gerenciar OS',
      view: 'service-orders'
    },
    {
      step: 5,
      title: '5. Vistoria de Campo (PWA)',
      desc: 'Inspeção dos 8 perigos das NRs, fotos, geolocalização e assinatura do acompanhante.',
      actionLabel: 'Abrir App de Campo',
      view: 'technician-field'
    },
    {
      step: 6,
      title: '6. Entrega & Aceite Formal',
      desc: 'Cliente recebe o laudo no Portal, revisa o documento e emite o aceite formal (RN008).',
      actionLabel: 'Portal do Cliente',
      view: 'client-portal'
    },
    {
      step: 7,
      title: '7. Avaliação NPS & Pós-Venda',
      desc: 'Nota de satisfação, índice de retrabalho e oportunidade de renovação contratual.',
      actionLabel: 'Ver Avaliações & NPS',
      view: 'evaluations'
    }
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-800 max-h-[90vh] overflow-y-auto text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Fluxo Master PrevSafe SST (Ponta a Ponta)</h3>
            <p className="text-xs text-slate-400">Guia de navegação por todas as etapas do ciclo de prestação de serviços</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-lg font-bold">✕</button>
        </div>

        <div className="space-y-3">
          {flowSteps.map((s) => (
            <div 
              key={s.step} 
              className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition"
            >
              <div className="space-y-0.5">
                <div className="font-bold text-xs text-white">{s.title}</div>
                <p className="text-xs text-slate-400">{s.desc}</p>
              </div>

              <button
                onClick={() => {
                  onNavigate(s.view);
                  onClose();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition whitespace-nowrap"
              >
                {s.actionLabel} →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
