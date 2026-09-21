'use client';

import React, { useState, useMemo } from 'react';
import { TUTORIALS_DATA, TutorialItem } from './tutorialsData';
import { TutorialDetailModal } from './TutorialDetailModal';
import { 
  BookOpen, 
  Search, 
  Sparkles, 
  PlayCircle, 
  Clock, 
  ShieldCheck, 
  SlidersHorizontal, 
  Layers, 
  UserCheck, 
  Smartphone, 
  FileText, 
  DollarSign, 
  Building2, 
  History, 
  ExternalLink,
  CheckCircle2,
  ArrowRight,
  Filter,
  GraduationCap,
  LayoutGrid,
  List,
  Flame,
  Award
} from 'lucide-react';

interface HelpCenterViewProps {
  onNavigate: (viewId: string) => void;
}

export const HelpCenterView: React.FC<HelpCenterViewProps> = ({ onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [selectedFormat, setSelectedFormat] = useState<'ALL' | 'VIDEO' | 'INFOGRAPHIC'>('ALL');
  const [activeTutorial, setActiveTutorial] = useState<TutorialItem | null>(null);
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  // Categories list
  const categories = [
    { id: 'ALL', label: 'Todos os Recursos' },
    { id: 'CLIENTS', label: 'Clientes & RFB' },
    { id: 'COMMERCIAL', label: 'Comercial & Contratos' },
    { id: 'SERVICE_ORDERS', label: 'Ordens de Serviço (OS)' },
    { id: 'FIELD_PWA', label: 'PWA de Campo Offline' },
    { id: 'DOCUMENTS', label: 'Laudos & Regra RN009' },
    { id: 'ESOCIAL', label: 'Eventos eSocial SST' },
    { id: 'FINANCIAL', label: 'Financeiro & Fluxo' },
    { id: 'CLIENT_PORTAL', label: 'Portal do Cliente' },
    { id: 'AI_COPILOT', label: 'IA Copilot SST' },
    { id: 'SAAS_ADMIN', label: 'Super Admin SaaS' },
    { id: 'AUDIT_LOGS', label: 'Auditoria RN011' },
  ];

  const roles = [
    { id: 'ALL', label: 'Todos os Perfis' },
    { id: 'ADMIN', label: 'Administrador' },
    { id: 'GESTOR', label: 'Gestor de Operações' },
    { id: 'TÉCNICO', label: 'Técnico de Campo' },
    { id: 'COMERCIAL', label: 'Comercial' },
    { id: 'FINANCEIRO', label: 'Financeiro' },
    { id: 'CLIENTE_ADMIN', label: 'Cliente (Diretoria/RH)' },
  ];

  // Filter logic
  const filteredTutorials = useMemo(() => {
    return TUTORIALS_DATA.filter((tut) => {
      // Search term matching
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = tut.title.toLowerCase().includes(query);
        const matchesSubtitle = tut.subtitle.toLowerCase().includes(query);
        const matchesTags = tut.tags.some(t => t.toLowerCase().includes(query));
        const matchesRef = tut.regulatoryRef?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesSubtitle && !matchesTags && !matchesRef) return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL' && tut.category !== selectedCategory) {
        return false;
      }

      // Role filter
      if (selectedRole !== 'ALL' && !tut.targetRoles.includes(selectedRole)) {
        return false;
      }

      // Difficulty filter
      if (selectedDifficulty !== 'ALL' && tut.difficulty !== selectedDifficulty) {
        return false;
      }

      return true;
    });
  }, [searchTerm, selectedCategory, selectedRole, selectedDifficulty]);

  // Fast tracks / suggested paths
  const fastTracks = [
    {
      title: '🚀 Trilha de Implantação Completa',
      desc: 'Do cadastro com CNPJ na Receita, Proposta, Contrato até a Emissão de OS.',
      tutId: 'tut-clients-cnpj',
      badge: 'Essencial'
    },
    {
      title: '⚡ Trilha de Campo & Coleta Offline',
      desc: 'Operação do PWA no smartphone, dosimetrias NHO, fotos e registro de localização da vistoria.',
      tutId: 'tut-field-pwa-offline',
      badge: 'Técnico'
    },
    {
      title: '🛡️ Trilha de Mensageria eSocial',
      desc: 'Validação de esquemas XSD, envio de lotes S-2240 e recibos da RFB.',
      tutId: 'tut-esocial-batch-transmission',
      badge: 'Compliance'
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hero Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/50 border border-slate-800 p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-300">
              Academia & Base de Conhecimento PrevSafe SST
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Central de Ajuda, Tutoriais & Guias Práticos
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Aprenda a dominar todos os módulos do sistema com <strong>passo a passo ilustrado com prints reais</strong>, 
            <strong> infográficos de utilidade de processos</strong> e <strong>simuladores de vídeo interativos</strong>.
          </p>

          {/* Search Box */}
          <div className="relative pt-2">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 mt-1" />
            <input
              type="text"
              placeholder="Buscar por funcionalidade (ex: eSocial S-2240, CNPJ Receita, Pausa de SLA RN004, PWA Offline, Pix)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-950/90 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 shadow-xl"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 mt-1 text-xs text-slate-400 hover:text-white"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Popular Tag Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-slate-400">
            <span className="text-slate-500 font-medium">Buscas rápidas:</span>
            {['Consulta CNPJ', 'eSocial S-2240', 'Pausa SLA RN004', 'PWA Offline', 'Liberação RN009', 'Cobrança D-3', 'IA Copilot'].map((tag) => (
              <button
                key={tag}
                onClick={() => setSearchTerm(tag)}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Tutoriais Disponíveis</div>
            <div className="text-xl font-bold text-white mt-0.5">{TUTORIALS_DATA.length} Guias Completos</div>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Prints Ilustrados</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">30+ Telas</div>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Simuladores de Vídeo</div>
            <div className="text-xl font-bold text-rose-400 mt-0.5">100% Interativos</div>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Conformidade Normativa</div>
            <div className="text-xl font-bold text-blue-400 mt-0.5">NRs 01 a 38 & eSocial</div>
          </div>
        </div>
      </div>

      {/* Suggested Fast Tracks */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Flame className="w-4 h-4 text-amber-400" />
          <span>Trilhas Rápidas de Capacitação Recomendadas</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {fastTracks.map((trk, idx) => (
            <div 
              key={idx}
              onClick={() => {
                const targetTut = TUTORIALS_DATA.find(t => t.id === trk.tutId);
                if (targetTut) setActiveTutorial(targetTut);
              }}
              className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 rounded-2xl cursor-pointer transition shadow-lg group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition">
                  {trk.title}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  {trk.badge}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {trk.desc}
              </p>
              <div className="pt-2 flex items-center text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform space-x-1">
                <span>Acessar Guia Passo a Passo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Faceted Filters & View Switcher */}
      <div className="p-4 sm:p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Category Horizontal Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/40'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setViewMode('GRID')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1 ${
                viewMode === 'GRID' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Visualização em Grade (Cards)"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grade</span>
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1 ${
                viewMode === 'LIST' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Visualização em Tabela / Lista"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Lista</span>
            </button>
          </div>
        </div>

        {/* Secondary Select Dropdowns (Role & Difficulty) */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium">Filtrar por Papel:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium">Nível de Dificuldade:</span>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Todos os Níveis</option>
              <option value="INICIANTE">Iniciante</option>
              <option value="INTERMEDIÁRIO">Intermediário</option>
              <option value="AVANÇADO">Avançado</option>
            </select>
          </div>

          <div className="ml-auto text-slate-400 text-xs">
            Exibindo <strong>{filteredTutorials.length}</strong> de {TUTORIALS_DATA.length} tutoriais
          </div>
        </div>
      </div>

      {/* Tutorials Content Grid / List */}
      {filteredTutorials.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Nenhum tutorial encontrado para os filtros selecionados</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Tente buscar com outros termos ou limpe os filtros para visualizar todos os recursos disponíveis.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('ALL');
              setSelectedRole('ALL');
              setSelectedDifficulty('ALL');
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
          >
            Limpar Todos os Filtros
          </button>
        </div>
      ) : viewMode === 'GRID' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTutorials.map((tut) => (
            <div
              key={tut.id}
              onClick={() => setActiveTutorial(tut)}
              className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 shadow-xl group space-y-4"
            >
              <div className="space-y-3">
                {/* Category & Badge header */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {tut.categoryLabel}
                  </span>

                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{tut.estimatedMinutes} min</span>
                  </span>
                </div>

                {/* Title & Subtitle */}
                <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug">
                  {tut.title}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {tut.subtitle}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {tut.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      {tag}
                    </span>
                  ))}
                  {tut.tags.length > 3 && (
                    <span className="text-[10px] px-1.5 py-0.5 text-slate-500">
                      +{tut.tags.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Feature Badges & Action */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                  <span className="flex items-center space-x-1 text-emerald-400">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{tut.steps.length} Passos</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1 text-rose-400">
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>{tut.videoSimulator.totalDurationSeconds}s Vídeo</span>
                  </span>
                </div>

                <div className="flex items-center text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform space-x-1">
                  <span>Ver Tutorial</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List / Table Directory View */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Módulo / Título</th>
                  <th className="py-3 px-4">Papéis Alvo</th>
                  <th className="py-3 px-4">Nível</th>
                  <th className="py-3 px-4">Conteúdo</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredTutorials.map((tut) => (
                  <tr 
                    key={tut.id} 
                    onClick={() => setActiveTutorial(tut)}
                    className="hover:bg-slate-800/50 cursor-pointer transition"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold shrink-0">
                          {tut.categoryLabel}
                        </span>
                        <span className="font-bold text-white hover:text-emerald-300 transition">
                          {tut.title}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {tut.targetRoles.slice(0, 3).join(', ')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 font-mono text-[10px]">
                        {tut.difficulty}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-400">
                        {tut.steps.length} passos • {tut.videoSimulator.totalDurationSeconds}s vídeo
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button className="px-3 py-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-xs font-semibold transition">
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tutorial Deep-Dive Modal */}
      {activeTutorial && (
        <TutorialDetailModal
          tutorial={activeTutorial}
          onClose={() => setActiveTutorial(null)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
};
