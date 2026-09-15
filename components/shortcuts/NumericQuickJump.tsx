'use client';

import React from 'react';
import { NavigationCodeItem } from '@/lib/navigationCodes';
import { 
  Zap, 
  CornerDownLeft, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface NumericQuickJumpIndicatorProps {
  digits: string;
  matchedItem?: NavigationCodeItem;
  countdownMs?: number;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const NumericQuickJumpIndicator: React.FC<NumericQuickJumpIndicatorProps> = ({
  digits,
  matchedItem,
  countdownMs = 1200,
  onConfirm,
  onCancel
}) => {
  if (!digits) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in zoom-in-95 duration-150">
      <div className="bg-slate-900/95 border-2 border-emerald-500/80 rounded-2xl shadow-2xl shadow-emerald-950/60 p-3 sm:p-4 backdrop-blur-md flex items-center gap-3 sm:gap-4 max-w-md w-full">
        {/* Animated Badge with Typed Digits */}
        <div className="flex flex-col items-center justify-center bg-slate-950 border border-emerald-500/50 rounded-xl px-3 sm:px-4 py-2 min-w-[72px] shadow-inner">
          <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
            <Zap className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>Código</span>
          </div>
          <span className="text-xl sm:text-2xl font-black font-mono text-white tracking-widest mt-0.5">
            {digits}
          </span>
        </div>

        {/* Matched Resource Details or Typing State */}
        <div className="flex-1 min-w-0">
          {matchedItem ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded border border-emerald-500/40">
                  {matchedItem.category}
                </span>
                <span className="text-[10px] text-slate-400">Navegando...</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
                <span>{matchedItem.title}</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {matchedItem.description}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-300">
                Atalho de Recurso: <span className="text-emerald-300 font-mono font-bold">{digits}</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Exemplos: <strong className="text-emerald-400">100</strong> (Funcionários), <strong className="text-emerald-400">050</strong> (OS), <strong className="text-emerald-400">200</strong> (EPIs)
              </p>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {matchedItem ? (
            <button
              type="button"
              onClick={onConfirm}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition active:scale-95"
              title="Pressione Enter para ir imediatamente"
            >
              <span>Ir</span>
              <kbd className="font-mono text-[9px] bg-emerald-700/80 px-1 py-0.2 rounded border border-emerald-500/40">↵ Enter</kbd>
            </button>
          ) : (
            <div className="text-[10px] text-slate-400 font-mono bg-slate-800/80 px-2 py-1 rounded">
              Digitando...
            </div>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="text-[10px] text-slate-400 hover:text-slate-200"
            title="Cancelar navegação"
          >
            Esc cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
