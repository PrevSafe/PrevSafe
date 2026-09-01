'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { formatDate } from '@/lib/utils';
import { 
  CheckSquare, 
  Clock, 
  AlertOctagon, 
  PauseCircle, 
  User, 
  Play, 
  Calendar, 
  AlertTriangle, 
  ArrowRight, 
  ShieldAlert, 
  HardHat,
  ShieldCheck
} from 'lucide-react';

export const OperationalDashboard: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { serviceOrders, requests, profiles, esocialEvents, updateTaskStatus, toggleSlaPause } = usePrevSafe();

  const technicians = profiles.filter(p => p.role === 'TÉCNICO' || p.role === 'GESTOR');

  // Collect all tasks across all active service orders
  const allTasks: { 
    task: any; 
    stage: any; 
    os: any; 
    isDelayed: boolean; 
  }[] = [];

  serviceOrders.forEach(os => {
    os.stages.forEach(stage => {
      stage.tasks.forEach(task => {
        const isDelayed = task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && new Date(task.due_date) < new Date();
        allTasks.push({ task, stage, os, isDelayed });
      });
    });
  });

  const todayTasks = allTasks.filter(t => t.task.status === 'IN_PROGRESS' || t.task.status === 'TODO');
  const delayedTasks = allTasks.filter(t => t.isDelayed);
  const waitingClientStages = serviceOrders.flatMap(os => os.stages.filter(s => s.status === 'WAITING_CLIENT' || (os.sla_is_paused && s.status === 'IN_PROGRESS')));
  const expiringSoonOS = serviceOrders.filter(os => {
    if (os.status === 'COMPLETED' || os.status === 'CANCELLED') return false;
    const diffDays = Math.ceil((new Date(os.due_date).getTime() - new Date().getTime()) / 86400000);
    return diffDays >= 0 && diffDays <= 7;
  });

  // Technician workload
  const techWorkload = technicians.map(tech => {
    const assignedTasks = allTasks.filter(t => t.task.assigned_to === tech.id || t.stage.assigned_to === tech.id);
    const completed = assignedTasks.filter(t => t.task.status === 'COMPLETED').length;
    const pending = assignedTasks.filter(t => t.task.status !== 'COMPLETED').length;
    return {
      tech,
      total: assignedTasks.length,
      completed,
      pending,
      delayed: assignedTasks.filter(t => t.isDelayed).length
    };
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bento Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Dashboard Operacional SST</h1>
            <p className="text-xs text-slate-400 mt-0.5">Controle de execução diária de campo, SLAs internos, carga técnica e etapas aguardando cliente.</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => onNavigate('esocial')}
            className="px-3.5 py-2 bg-emerald-950/60 border border-emerald-700/50 hover:bg-emerald-900/60 text-emerald-300 rounded-2xl text-xs font-bold transition flex items-center space-x-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Eventos eSocial ({esocialEvents.length})</span>
          </button>
          <button 
            onClick={() => onNavigate('technician-field')}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-950/40 transition flex items-center space-x-1.5"
          >
            <HardHat className="w-4 h-4" />
            <span>Abrir Modo Campo PWA</span>
          </button>
        </div>
      </div>

      {/* Operational KPIs in Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tarefas Ativas</span>
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white mt-3">{todayTasks.length}</div>
            <div className="text-[11px] text-blue-400 mt-1">Em execução pela equipe</div>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tarefas Atrasadas</span>
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-rose-400 mt-3">{delayedTasks.length}</div>
            <div className="text-[11px] text-rose-400 mt-1">Requer intervenção imediata</div>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Aguardando Cliente</span>
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <PauseCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-amber-400 mt-3">{waitingClientStages.length}</div>
            <div className="text-[11px] text-amber-400 mt-1">SLA Interno Pausado (RN006)</div>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">OS Vencendo (7d)</span>
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-purple-400 mt-3">{expiringSoonOS.length}</div>
            <div className="text-[11px] text-purple-400 mt-1">Em fase final de elaboração</div>
          </div>
        </div>
      </div>

      {/* Main Operational Grids in Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Urgent Tasks & Next Milestones */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl lg:col-span-2 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div>
                <h2 className="text-base font-bold text-white">Fila Prioritária de Tarefas & Vistorias</h2>
                <p className="text-xs text-slate-400 mt-0.5">Execução técnica rápida com feedback de status</p>
              </div>
              <span className="text-xs bg-slate-950 text-slate-300 px-3 py-1 rounded-full border border-slate-800 font-mono">
                {todayTasks.length} pendentes
              </span>
            </div>

            <div className="space-y-3 pt-3">
              {todayTasks.slice(0, 6).map((item, idx) => (
                <div 
                  key={idx} 
                  className="p-4 rounded-2xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {item.os.os_number}
                      </span>
                      <span className="text-xs font-bold text-white">{item.task.name}</span>
                      {item.task.is_mandatory && (
                        <span className="text-[9px] uppercase font-bold bg-rose-500/10 text-rose-400 px-1.5 py-0.2 rounded border border-rose-500/20">
                          Obrigatória
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center space-x-3">
                      <span>Etapa: <strong className="text-slate-200">{item.stage.name}</strong></span>
                      <span>•</span>
                      <span>Resp: {item.task.assigned_name || 'Técnico'}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-400">Prazo: {formatDate(item.task.due_date)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateTaskStatus(item.os.id, item.stage.id, item.task.id, 'COMPLETED')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center space-x-1"
                      title="Concluir Tarefa com 1 clique"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Concluir</span>
                    </button>
                    <button
                      onClick={() => onNavigate('service-orders')}
                      className="p-1.5 text-slate-500 hover:text-slate-300 transition"
                      title="Ver Detalhes da OS"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Workload per Technical Specialist */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Carga de Trabalho por Técnico</h2>
            <p className="text-xs text-slate-400 mt-0.5">Distribuição de OS e vistorias</p>
          </div>

          <div className="space-y-3">
            {techWorkload.map((tw, idx) => (
              <div key={idx} className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                      {tw.tech.full_name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{tw.tech.full_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{tw.tech.role}</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-200 bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800">
                    {tw.pending} ativas
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Conclusão</span>
                    <span className="font-semibold text-slate-200 font-mono">
                      {tw.total > 0 ? Math.round((tw.completed / tw.total) * 100) : 100}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="h-full bg-emerald-500 rounded-full" 
                      style={{ width: `${tw.total > 0 ? (tw.completed / tw.total) * 100 : 100}%` }}
                    />
                  </div>
                </div>

                {tw.delayed > 0 && (
                  <div className="text-[10px] text-rose-400 font-medium flex items-center pt-1">
                    <AlertTriangle className="w-3 h-3 mr-1" /> {tw.delayed} tarefa(s) atrasada(s)
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* SLA Pause Rules reminder */}
          <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-xs text-amber-200 space-y-1">
            <div className="font-bold flex items-center text-amber-300">
              <ShieldAlert className="w-4 h-4 mr-1.5 text-amber-400" /> Regra de SLA (RN006)
            </div>
            <p className="text-[11px] text-amber-300/90 leading-relaxed">
              Ao colocar uma etapa em <strong>WAITING_CLIENT</strong>, o relógio de SLA interno é pausado para não penalizar o prazo da consultoria enquanto o cliente não envia dados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
