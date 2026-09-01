'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { AuditLog } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { 
  History, 
  Search, 
  ShieldCheck, 
  Filter, 
  Lock, 
  User, 
  Calendar, 
  Building, 
  Sliders, 
  Database,
  CheckCircle2,
  Server,
  Link2,
  Copy,
  Terminal,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Code2,
  Layers,
  FileCode2,
  Play,
  Check
} from 'lucide-react';
import { SUPABASE_PROJECT_REF, SUPABASE_PROJECT_NAME, DEFAULT_SUPABASE_URL } from '@/lib/supabase';
import { SUPABASE_SQL_SCHEMA, SUPABASE_MIGRATIONS, SupabaseMigration } from '@/lib/supabaseSchema';

export const AuditLogsView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { auditLogs } = usePrevSafe();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('ALL');

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entity_number && log.entity_number.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesEntity = selectedEntity === 'ALL' || log.entity_type === selectedEntity;
    return matchesSearch && matchesEntity;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bento Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Trilha de Auditoria Geral (Audit Logs)</h1>
            <p className="text-xs text-slate-400 mt-0.5">Registro imutável de todas as ações de usuários, alterações de status de OS, assinaturas de contratos e acessos.</p>
          </div>
        </div>
      </div>

      {/* Filter Bento Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por ação, usuário ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-medium">Entidade:</span>
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-medium text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Todas as Entidades</option>
            <option value="SERVICE_ORDER">Ordem de Serviço (OS)</option>
            <option value="CONTRACT">Contrato</option>
            <option value="PROPOSAL">Proposta</option>
            <option value="CLIENT">Cliente</option>
            <option value="REQUEST">Pendência</option>
            <option value="DOCUMENT">Documento</option>
          </select>
        </div>
      </div>

      {/* Logs Table in Bento Card */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-5">Data / Hora</th>
                <th className="py-3.5 px-5">Usuário / Perfil</th>
                <th className="py-3.5 px-5">Ação Realizada</th>
                <th className="py-3.5 px-5">Entidade / Ref</th>
                <th className="py-3.5 px-5">Parâmetros Alterados</th>
                <th className="py-3.5 px-5 text-right">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-5 text-slate-400 whitespace-nowrap">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="py-3.5 px-5 font-sans font-medium text-white">
                    {log.user_name} <span className="text-[10px] text-slate-500">({log.user_role})</span>
                  </td>
                  <td className="py-3.5 px-5 font-bold text-emerald-400">
                    {log.action}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="bg-slate-950 text-indigo-300 border border-slate-800 px-2 py-0.5 rounded-full text-[10px] mr-2">
                      {log.entity_type}
                    </span>
                    <span className="text-slate-200 font-bold">{log.entity_number || log.entity_id}</span>
                  </td>
                  <td className="py-3.5 px-5 font-sans text-slate-400 max-w-xs truncate">
                    {log.new_data ? JSON.stringify(log.new_data) : 'Nenhum dado adicional'}
                  </td>
                  <td className="py-3.5 px-5 text-right text-slate-500 font-mono">
                    {log.ip_address}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const SettingsView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { organization, resetDatabaseToSeed } = usePrevSafe();
  const [copiedCli, setCopiedCli] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedMigrationIdx, setCopiedMigrationIdx] = useState<number | null>(null);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [activeMigrationTab, setActiveMigrationTab] = useState<number>(0);
  const [connectionResult, setConnectionResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    hasAnonKey: boolean;
  }>({
    tested: false,
    success: false,
    message: '',
    hasAnonKey: false,
  });

  const cliCommand = `supabase link --project-ref ${SUPABASE_PROJECT_REF}`;
  const pushCommand = `supabase db push`;

  const copyToClipboard = (text: string, type: 'cli' | 'sql' | 'push' | number) => {
    navigator.clipboard.writeText(text);
    if (type === 'cli') {
      setCopiedCli(true);
      setTimeout(() => setCopiedCli(false), 2000);
    } else if (type === 'sql') {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } else if (typeof type === 'number') {
      setCopiedMigrationIdx(type);
      setTimeout(() => setCopiedMigrationIdx(null), 2000);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConn(true);
    try {
      const res = await fetch('/api/supabase/status');
      const data = await res.json();
      setConnectionResult({
        tested: true,
        success: data.connected,
        message: data.message || (data.connected ? 'Conexão validada com sucesso.' : 'Erro ao validar conexão.'),
        hasAnonKey: data.hasAnonKey,
      });
    } catch (err: any) {
      setConnectionResult({
        tested: true,
        success: false,
        message: `Falha na requisição de diagnóstico: ${err.message}`,
        hasAnonKey: false,
      });
    } finally {
      setIsTestingConn(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bento Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Configurações Gerais & Banco de Dados</h1>
            <p className="text-xs text-slate-400 mt-0.5">Parâmetros da consultoria de SST, migrations do Supabase e eSocial.</p>
          </div>
        </div>
      </div>

      {/* Supabase Prev Workflow Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 p-6 rounded-3xl border border-emerald-500/30 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Banco de Dados Supabase (PostgreSQL)</h2>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Prev Workflow
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Conectado ao projeto <strong>{SUPABASE_PROJECT_NAME}</strong> (Ref: <code className="font-mono text-emerald-300">{SUPABASE_PROJECT_REF}</code>)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={isTestingConn}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingConn ? 'animate-spin' : ''}`} />
              <span>{isTestingConn ? 'Testando Conexão...' : 'Testar Conexão Supabase'}</span>
            </button>
            <button
              onClick={() => setShowSqlModal(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-2"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ver Migrations SQL</span>
            </button>
          </div>
        </div>

        {/* Connection Diagnostics Banner if tested */}
        {connectionResult.tested && (
          <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
            connectionResult.success 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' 
              : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
          }`}>
            {connectionResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold">
                {connectionResult.success ? 'Conexão Estabelecida com Sucesso' : 'Aviso de Diagnóstico'}
              </div>
              <div>{connectionResult.message}</div>
            </div>
          </div>
        )}

        {/* Project Technical Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">Project Name</span>
            <span className="font-bold text-white">{SUPABASE_PROJECT_NAME}</span>
          </div>

          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">Project Reference</span>
            <span className="font-mono text-emerald-400 font-bold">{SUPABASE_PROJECT_REF}</span>
          </div>

          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">Supabase Endpoint URL</span>
            <span className="font-mono text-slate-300 truncate block text-[11px]">{DEFAULT_SUPABASE_URL}</span>
          </div>
        </div>

        {/* Migrations Summary Card */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <FileCode2 className="w-4 h-4 text-emerald-400" />
              <span>Arquivos de Migration no Repositório ({SUPABASE_MIGRATIONS.length})</span>
            </div>
            <button
              onClick={() => setShowSqlModal(true)}
              className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
            >
              <span>Abrir Gerenciador de Migrations</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SUPABASE_MIGRATIONS.map((m, idx) => (
              <div key={m.version} className="p-3 bg-slate-900/90 border border-slate-800/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center">
                      0{idx + 1}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-200 truncate max-w-[200px]">
                      {m.filename}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(m.sql, idx)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] flex items-center gap-1 transition"
                    title="Copiar SQL da migration"
                  >
                    {copiedMigrationIdx === idx ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedMigrationIdx === idx ? 'Copiado' : 'Copiar SQL'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">{m.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CLI Link & Push Commands */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Comandos Supabase CLI (Link & Push):</span>
            </div>
            <button
              onClick={() => copyToClipboard(`${cliCommand}\n${pushCommand}`, 'cli')}
              className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition"
            >
              {copiedCli ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Comandos Copiados!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Comandos</span>
                </>
              )}
            </button>
          </div>
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-emerald-300 overflow-x-auto select-all space-y-1">
            <div>{cliCommand}</div>
            <div>{pushCommand}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-5 lg:col-span-2">
          <h2 className="text-base font-bold text-white">Dados da Consultoria de SST</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-400 mb-1">Razão Social</label>
              <input type="text" defaultValue={organization.legal_name} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block font-semibold text-slate-400 mb-1">Nome Fantasia</label>
              <input type="text" defaultValue={organization.name} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block font-semibold text-slate-400 mb-1">CNPJ</label>
              <input type="text" defaultValue={organization.document_number} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-2xl font-mono text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block font-semibold text-slate-400 mb-1">E-mail Corporativo</label>
              <input type="text" defaultValue={organization.email} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          <h2 className="text-base font-bold text-white pt-4 border-t border-slate-800">Integração com eSocial & Mensageria</h2>
          <div className="space-y-3 text-xs">
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Eventos de SST (S-2210, S-2220, S-2240)</div>
                <div className="text-slate-400 text-[11px] mt-0.5">Transmissão direta com Certificado Digital A1</div>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2.5 py-1 rounded-full">
                ATIVO
              </span>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-white">WhatsApp Business API (Meta Cloud)</div>
                <div className="text-slate-400 text-[11px] mt-0.5">Disparo automatizado de avisos de SLA e cobranças D-3/D-1/D0</div>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2.5 py-1 rounded-full">
                CONECTADO
              </span>
            </div>
          </div>
        </div>

        {/* Database & Demo Reset */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Demonstração & Reset Local</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Restaure a base completa de dados de simulação (clientes, propostas, contratos assinados, OS com SLA e auditoria) para testar os fluxos operacionais.
            </p>
          </div>

          <div className="pt-4 space-y-2.5">
            <button
              onClick={() => setShowSqlModal(true)}
              className="w-full px-4 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-2xl text-xs font-bold transition flex items-center justify-center space-x-2"
            >
              <Code2 className="w-4 h-4" />
              <span>Gerenciar Migrations SQL</span>
            </button>

            <button
              onClick={() => {
                if (confirm('Deseja restaurar todos os dados iniciais de demonstração da PrevSafe?')) {
                  resetDatabaseToSeed();
                  alert('Base de dados restaurada com sucesso!');
                }
              }}
              className="w-full px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-2xl text-xs font-bold transition flex items-center justify-center space-x-2"
            >
              <Database className="w-4 h-4" />
              <span>Restaurar Base de Demonstração</span>
            </button>
          </div>
        </div>
      </div>

      {/* Migrations Modal with Tabs */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Gerenciador de Migrations Supabase</h3>
                  <p className="text-xs text-slate-400">Projeto: {SUPABASE_PROJECT_NAME} ({SUPABASE_PROJECT_REF})</p>
                </div>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold p-2 hover:bg-slate-800 rounded-xl transition"
              >
                ✕
              </button>
            </div>

            {/* Migration Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/60 px-5 gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveMigrationTab(0)}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                  activeMigrationTab === 0 
                    ? 'border-emerald-400 text-emerald-300' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>01. Schema & Tabelas DDL</span>
              </button>
              <button
                onClick={() => setActiveMigrationTab(1)}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                  activeMigrationTab === 1 
                    ? 'border-emerald-400 text-emerald-300' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>02. Seed NRs & Catálogo</span>
              </button>
              <button
                onClick={() => setActiveMigrationTab(2)}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                  activeMigrationTab === 2 
                    ? 'border-emerald-400 text-emerald-300' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Instruções CLI & SQL Completo</span>
              </button>
            </div>

            {/* Content Area */}
            <div className="p-5 overflow-y-auto flex-1 font-mono text-[11px] bg-slate-950 text-emerald-300 leading-relaxed select-all">
              {activeMigrationTab === 0 && (
                <div>
                  <div className="text-slate-500 mb-3 font-sans text-xs">
                    Arquivo: <code className="text-emerald-400 font-mono">supabase/migrations/{SUPABASE_MIGRATIONS[0].filename}</code>
                  </div>
                  <pre>{SUPABASE_MIGRATIONS[0].sql}</pre>
                </div>
              )}
              {activeMigrationTab === 1 && (
                <div>
                  <div className="text-slate-500 mb-3 font-sans text-xs">
                    Arquivo: <code className="text-emerald-400 font-mono">supabase/migrations/{SUPABASE_MIGRATIONS[1].filename}</code>
                  </div>
                  <pre>{SUPABASE_MIGRATIONS[1].sql}</pre>
                </div>
              )}
              {activeMigrationTab === 2 && (
                <div className="space-y-4 font-sans text-xs text-slate-300">
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                    <h4 className="font-bold text-white text-sm">Como executar no Supabase CLI:</h4>
                    <ol className="list-decimal pl-5 space-y-1.5 text-slate-400">
                      <li>Certifique-se de ter a CLI do Supabase instalada: <code className="text-emerald-400 font-mono">npm i -g supabase</code></li>
                      <li>Vincule o projeto com: <code className="text-emerald-400 font-mono">{cliCommand}</code></li>
                      <li>Envie e execute todas as migrations com: <code className="text-emerald-400 font-mono">supabase db push</code></li>
                    </ol>
                  </div>

                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                    <h4 className="font-bold text-white text-sm">Como executar no painel Web do Supabase:</h4>
                    <p className="text-slate-400">
                      Acesse <strong>supabase.com/dashboard/project/{SUPABASE_PROJECT_REF}</strong> &gt; <strong>SQL Editor</strong> &gt; <strong>New Query</strong>, cole o SQL unificado abaixo e clique em <strong>Run</strong>.
                    </p>
                  </div>

                  <div className="font-mono text-[11px] text-emerald-300 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
                    <pre>{SUPABASE_SQL_SCHEMA + '\n\n' + SUPABASE_MIGRATIONS[1].sql}</pre>
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900">
              <span className="text-xs text-slate-400">
                {activeMigrationTab === 0 && 'Cria as 15 tabelas, RLS, triggers e índices'}
                {activeMigrationTab === 1 && 'Insere organização, perfis e catálogo de NRs SST'}
                {activeMigrationTab === 2 && 'Script pronto para ser colado no SQL Editor do Supabase'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const content = activeMigrationTab === 0 
                      ? SUPABASE_MIGRATIONS[0].sql 
                      : activeMigrationTab === 1 
                      ? SUPABASE_MIGRATIONS[1].sql 
                      : SUPABASE_SQL_SCHEMA + '\n\n' + SUPABASE_MIGRATIONS[1].sql;
                    copyToClipboard(content, 'sql');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedSql ? 'SQL Copiado com Sucesso!' : 'Copiar SQL desta Aba'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

