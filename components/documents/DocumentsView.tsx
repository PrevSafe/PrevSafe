'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { Document } from '@/types';
import { 
  FolderKanban, 
  FileText, 
  Download, 
  Plus, 
  Search, 
  CheckCircle2, 
  Lock, 
  History, 
  ShieldCheck, 
  Building2,
  Edit2,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export const DocumentsView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { 
    documents = [], 
    clients = [], 
    serviceOrders = [], 
    createNewDocument, 
    updateDocument,
    deleteDocument,
    toggleDocumentRelease 
  } = usePrevSafe();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  
  // Modals & States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<Document | null>(null);

  // Form State
  const [docForm, setDocForm] = useState({
    name: 'PGR - Programa de Gerenciamento de Riscos 2026',
    document_type: 'PGR' as Document['document_type'],
    client_id: clients?.[0]?.id || '',
    service_order_id: serviceOrders[0]?.id || '',
    notes: 'Documento técnico homologado e publicado no repositório.',
    is_client_released: true
  });

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.doc_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'ALL' || doc.document_type === selectedType;
    return matchesSearch && matchesType;
  });

  const handleOpenNewDoc = () => {
    setEditingDoc(null);
    setDocForm({
      name: 'PGR - Programa de Gerenciamento de Riscos 2026',
      document_type: 'PGR',
      client_id: clients[0]?.id || '',
      service_order_id: serviceOrders[0]?.id || '',
      notes: 'Documento técnico homologado e publicado no repositório.',
      is_client_released: true
    });
    setShowUploadModal(true);
  };

  const handleOpenEditDoc = (doc: Document) => {
    setEditingDoc(doc);
    setDocForm({
      name: doc.name,
      document_type: doc.document_type,
      client_id: doc.client_id,
      service_order_id: doc.service_order_id || '',
      notes: '',
      is_client_released: doc.is_client_released
    });
    setShowUploadModal(true);
  };

  const handleSaveDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.name || !docForm.client_id) {
      alert('Preencha o nome do documento e selecione um cliente.');
      return;
    }

    if (editingDoc) {
      updateDocument(editingDoc.id, {
        name: docForm.name,
        document_type: docForm.document_type,
        client_id: docForm.client_id,
        service_order_id: docForm.service_order_id || undefined,
        is_client_released: docForm.is_client_released
      });
      setShowUploadModal(false);
      setEditingDoc(null);
    } else {
      createNewDocument({
        client_id: docForm.client_id,
        service_order_id: docForm.service_order_id || undefined,
        name: docForm.name,
        document_type: docForm.document_type,
        file_name: `${docForm.name.toLowerCase().replace(/\s+/g, '_')}_v1.pdf`,
        file_size: 4850200,
        notes: docForm.notes,
        is_client_released: docForm.is_client_released
      });
      setShowUploadModal(false);
    }
  };

  const handleDeleteDocConfirm = () => {
    if (!deletingDoc) return;
    deleteDocument(deletingDoc.id);
    setDeletingDoc(null);
  };

  return (
    <div id="documents-view-container" className="space-y-6 pb-12">
      {/* Header Bento Card */}
      <div id="documents-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-superficie border border-borda rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex items-center justify-center text-teal-800">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-tinta">Repositório de Documentos & Laudos SST</h1>
            <p className="text-xs text-tinta-2 mt-0.5">Laudos finais (PGR, PCMSO, LTCAT, AET), controle de versão, releases e integridade.</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            type="button"
            onClick={() => onNavigate('reports')}
            className="px-3.5 py-2.5 bg-superficie-2 hover:bg-superficie-3 text-teal-700 hover:text-teal-700 border border-teal-500/30 rounded-2xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
            title="Ir para o módulo de relatórios com filtros multidimensionais e exportações"
          >
            <FolderKanban className="w-4 h-4 text-teal-700" />
            <span>Central de Relatórios BI (Excel / PDF)</span>
          </button>
          <button 
            id="btn-new-document"
            onClick={handleOpenNewDoc}
            className="bg-marca-escura px-4 py-2.5 text-white rounded-2xl text-xs font-bold shadow-sm transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Publicar Laudo / Documento</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bento Bar */}
      <div id="documents-filter-bar" className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-superficie p-4 rounded-3xl border border-borda shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-tinta-2 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-documents"
            type="text"
            placeholder="Buscar por título ou número de documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-fundo border border-borda rounded-2xl text-xs text-tinta placeholder-tinta-3 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-tinta-2 font-medium">Tipo:</span>
          <select
            id="select-doc-type-filter"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-fundo border border-borda rounded-2xl text-xs font-medium text-tinta focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="PGR">PGR (NR-01)</option>
            <option value="PCMSO">PCMSO (NR-07)</option>
            <option value="LTCAT">LTCAT Previdenciário</option>
            <option value="AET">AET Ergonômica</option>
            <option value="RELATÓRIO">Relatório de Campo</option>
          </select>
        </div>
      </div>

      {/* Documents Bento Grid */}
      <div id="documents-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDocs.map((doc) => {
          const client = clients.find(c => c.id === doc.client_id);
          const os = serviceOrders.find(o => o.id === doc.service_order_id);

          return (
            <div key={doc.id} id={`doc-card-${doc.id}`} className="bg-superficie p-6 rounded-3xl border border-borda shadow-sm flex flex-col justify-between space-y-4 hover:border-borda transition group">
              <div>
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-marca-suave text-marca-escura border border-marca-borda font-mono">
                    {doc.document_type}
                  </span>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs font-mono font-bold text-tinta-2 mr-1">
                      v{doc.current_version}.0
                    </span>
                    <button
                      onClick={() => handleOpenEditDoc(doc)}
                      className="p-1 hover:bg-superficie-2 text-tinta-2 hover:text-tinta rounded transition"
                      title="Editar Documento"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingDoc(doc)}
                      className="p-1 hover:bg-rose-50 text-tinta-2 hover:text-rose-800 rounded transition"
                      title="Excluir Documento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-tinta mt-3">{doc.name}</h3>
                <p className="text-xs text-tinta-2 mt-0.5 font-mono">{doc.doc_number}</p>

                <div className="mt-4 pt-3.5 border-t border-borda space-y-1 text-xs text-tinta-2">
                  <div>Cliente: <strong className="text-tinta">{client?.trade_name}</strong></div>
                  {os && <div>OS: <span className="font-mono text-teal-700">{os.os_number}</span></div>}
                  <div className="text-[10px] text-tinta-2 font-mono mt-1">
                    Status: {doc.status} • {doc.is_client_released ? 'Liberado para o Cliente' : 'Interno'}
                  </div>
                </div>
              </div>

              <div className="pt-3.5 border-t border-borda flex items-center justify-between">
                <button
                  onClick={() => toggleDocumentRelease(doc.id)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-xl transition ${
                    doc.is_client_released 
                      ? 'bg-marca-suave text-marca-escura border border-marca-borda' 
                      : 'bg-superficie-2 text-tinta-2 border border-borda'
                  }`}
                >
                  {doc.is_client_released ? '✓ Visível no Portal' : 'Oculto no Portal'}
                </button>
                <button
                  onClick={() => alert(`O download em PDF de "${doc.name}" ainda não está disponível nesta versão do sistema.`)}
                  className="bg-marca-escura px-3.5 py-1.5 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload / Edit Modal */}
      {showUploadModal && (
        <div id="modal-document-form" className="fixed inset-0 bg-fundo backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-superficie rounded-3xl max-w-md w-full p-6 shadow-sm border border-borda text-tinta">
            <div className="flex items-center justify-between border-b border-borda pb-3 mb-4">
              <h3 className="text-sm font-bold text-tinta">
                {editingDoc ? 'Editar Documento Técnico' : 'Publicar Novo Laudo / Documento Técnico'}
              </h3>
              <button 
                onClick={() => {
                  setShowUploadModal(false);
                  setEditingDoc(null);
                }} 
                className="text-tinta-2 hover:text-tinta"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDocument} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-tinta mb-1">Título do Documento *</label>
                <input
                  type="text"
                  required
                  value={docForm.name}
                  onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-fundo border border-borda rounded-xl text-xs text-tinta focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-tinta mb-1">Tipo de Documento</label>
                <select
                  value={docForm.document_type}
                  onChange={(e) => setDocForm({ ...docForm, document_type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-fundo border border-borda rounded-xl text-xs text-tinta focus:outline-none focus:border-teal-500"
                >
                  <option value="PGR">PGR (NR-01) - Gerenciamento de Riscos</option>
                  <option value="PCMSO">PCMSO (NR-07) - Controle Médico</option>
                  <option value="LTCAT">LTCAT - Laudo Técnico Previdenciário</option>
                  <option value="AET">AET (NR-17) - Análise Ergonômica</option>
                  <option value="RELATÓRIO">Relatório Fotográfico de Vistoria</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-tinta mb-1">Cliente Vinculado</label>
                <select
                  value={docForm.client_id}
                  onChange={(e) => setDocForm({ ...docForm, client_id: e.target.value })}
                  className="w-full px-3 py-2 bg-fundo border border-borda rounded-xl text-xs text-tinta focus:outline-none focus:border-teal-500"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.trade_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-tinta mb-1">Ordem de Serviço (Opcional)</label>
                <select
                  value={docForm.service_order_id}
                  onChange={(e) => setDocForm({ ...docForm, service_order_id: e.target.value })}
                  className="w-full px-3 py-2 bg-fundo border border-borda rounded-xl text-xs text-tinta focus:outline-none focus:border-teal-500"
                >
                  <option value="">Sem vínculo com OS específica</option>
                  {serviceOrders.map(o => (
                    <option key={o.id} value={o.id}>{o.os_number} - {o.service_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-tinta mb-1">Observações Técnicas</label>
                <textarea
                  rows={2}
                  value={docForm.notes}
                  onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-fundo border border-borda rounded-xl text-xs text-tinta focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-doc-released"
                  checked={docForm.is_client_released}
                  onChange={(e) => setDocForm({ ...docForm, is_client_released: e.target.checked })}
                  className="rounded border-borda bg-fundo text-marca-escura focus:ring-0"
                />
                <label htmlFor="chk-doc-released" className="text-tinta cursor-pointer">
                  Liberar visualização no Portal do Cliente
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-borda">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setEditingDoc(null);
                  }}
                  className="px-4 py-2 bg-superficie-2 text-tinta rounded-xl font-semibold hover:bg-superficie-3"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-marca-escura hover:opacity-90 text-white rounded-xl font-bold shadow-md"
                >
                  {editingDoc ? 'Atualizar Documento' : 'Publicar Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Document Modal */}
      {deletingDoc && (
        <div id="modal-delete-document" className="fixed inset-0 bg-fundo backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-superficie rounded-3xl max-w-md w-full p-6 shadow-sm border border-rose-200 text-tinta space-y-4">
            <div className="flex items-center space-x-3 text-rose-700">
              <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-tinta">Excluir Documento Técnico</h3>
                <p className="text-xs text-tinta-2">Esta ação removerá o laudo do repositório.</p>
              </div>
            </div>

            <p className="text-xs text-tinta">
              Tem certeza de que deseja remover o documento <strong className="text-tinta">{deletingDoc.name}</strong> ({deletingDoc.doc_number})?
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingDoc(null)}
                className="px-4 py-2 bg-superficie-2 hover:bg-superficie-3 text-tinta rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteDocConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
