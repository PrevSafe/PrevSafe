'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { 
  ShieldCheck, 
  Key, 
  Server, 
  Lock, 
  Unlock, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Save, 
  FileCode2, 
  Building2, 
  Clock, 
  Send, 
  Radio, 
  Sliders, 
  Eye, 
  EyeOff, 
  Globe, 
  Zap, 
  Check, 
  X, 
  FileText, 
  Bell, 
  Sparkles,
  Info
} from 'lucide-react';
import { ESocialEnvironment, ESocialCertificateType } from '@/types';

interface ESocialConfigViewProps {
  onBack?: () => void;
}

export const ESocialConfigView: React.FC<ESocialConfigViewProps> = ({ onBack }) => {
  const { 
    esocialConfig, 
    updateESocialConfig, 
    testCertificateValidation, 
    uploadCertificateFile,
    organization,
    clients,
    checkSSTDeadlinesAndNotify
  } = usePrevSafe();

  const [environment, setEnvironment] = useState<ESocialEnvironment>(esocialConfig.environment);
  const [softwareHouseCnpj, setSoftwareHouseCnpj] = useState(esocialConfig.software_house_cnpj);
  const [softwareHouseName, setSoftwareHouseName] = useState(esocialConfig.software_house_name);
  const [transmitterCnpj, setTransmitterCnpj] = useState(esocialConfig.transmitter_cnpj);
  const [transmitterType, setTransmitterType] = useState(esocialConfig.transmitter_type);
  const [authType, setAuthType] = useState(esocialConfig.auth_type);
  const [slaExamDays, setSlaExamDays] = useState(esocialConfig.sla_exam_warning_days);
  const [slaDocDays, setSlaDocDays] = useState(esocialConfig.sla_document_warning_days);
  const [autoBatchTransmission, setAutoBatchTransmission] = useState(esocialConfig.auto_batch_transmission);
  const [notifyRh, setNotifyRh] = useState(esocialConfig.notify_rh_on_success);
  const [webhookUrl, setWebhookUrl] = useState(esocialConfig.webhook_url || '');

  // Certificate Test State
  const [certPassword, setCertPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isTestingCert, setIsTestingCert] = useState(false);
  const [certTestResult, setCertTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  // Upload Simulation
  const [isDragging, setIsDragging] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // SLA Trigger Feedback
  const [slaFeedback, setSlaFeedback] = useState<{ count: number; message: string } | null>(null);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const res = uploadCertificateFile(file.name, base64, certPassword);
      if (res.success) {
        setUploadMessage(res.message);
        setTimeout(() => setUploadMessage(null), 5000);
      } else {
        alert(res.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTestCertificate = () => {
    setIsTestingCert(true);
    setCertTestResult(null);
    setTimeout(() => {
      const res = testCertificateValidation(certPassword || 'PrevSafe@2026!');
      setCertTestResult(res);
      setIsTestingCert(false);
    }, 1000);
  };

  const handleSaveConfig = () => {
    updateESocialConfig({
      environment,
      tp_amb: environment === 'PRODUCAO' ? 1 : 2,
      software_house_cnpj: softwareHouseCnpj,
      software_house_name: softwareHouseName,
      transmitter_cnpj: transmitterCnpj,
      transmitter_type: transmitterType,
      auth_type: authType,
      sla_exam_warning_days: Number(slaExamDays),
      sla_document_warning_days: Number(slaDocDays),
      auto_batch_transmission: autoBatchTransmission,
      notify_rh_on_success: notifyRh,
      webhook_url: webhookUrl
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3500);
  };

  const handleTriggerSlaCheck = () => {
    const result = checkSSTDeadlinesAndNotify(true);
    setSlaFeedback({
      count: result.notificationsCreated,
      message: `Auditoria de SLA executada: ${result.details.length} prazos de SST monitorados (${result.notificationsCreated} novos alertas gerados no painel).`
    });
    setTimeout(() => setSlaFeedback(null), 6000);
  };

  const cert = esocialConfig.certificate;
  const isCertValid = cert.status === 'VALID';
  // O sistema nao le o .pfx. 'NAO_VERIFICADO' significa arquivo anexado e
  // conteudo nao conferido - diferente de invalido, e diferente de valido.
  const certAnexado = Boolean(cert.file_name);
  const certNaoVerificado = cert.status === 'NAO_VERIFICADO';

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-teal-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
            <Sliders className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">Configurações do eSocial</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                environment === 'PRODUCAO' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                {environment === 'PRODUCAO' ? 'Produção Oficial' : 'Ambiente de Homologação'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Certificado Digital A1 (.PFX/.P12), credenciais Serpro/Receita Federal e regras de SLA para SST.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-semibold border border-slate-700 transition"
            >
              Voltar aos Eventos
            </button>
          )}
          <button
            onClick={handleSaveConfig}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-indigo-950/40 flex items-center space-x-2"
          >
            {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'Configurações Salvas!' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>

      {isSaved && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center space-x-3 text-emerald-300 text-xs font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>Configurações do eSocial e certificado digital atualizados com sucesso no PrevSafe.</span>
        </div>
      )}

      {slaFeedback && (
        <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl flex items-center space-x-3 text-indigo-300 text-xs font-medium">
          <Bell className="w-5 h-5 text-indigo-400 flex-shrink-0" />
          <span>{slaFeedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Digital Certificate A1 (PFX) - Span 7 */}
        <div className="lg:col-span-7 space-y-6">
          {/* Certificate Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Certificado Digital ICP-Brasil (A1 - PFX/P12)</h2>
                  <p className="text-xs text-slate-400">Assinatura digital padrão XML-DSIG para transmissão oficial ao Serpro</p>
                </div>
              </div>

              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                isCertValid
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : certNaoVerificado
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}>
                {isCertValid
                  ? '✅ Ativo e Válido'
                  : certNaoVerificado
                    ? '📎 Anexado — conteúdo não verificado'
                    : certAnexado ? '⚠️ Inválido ou Expirado' : '⚠️ Não configurado'}
              </span>
            </div>

            {/* Certificate Details Info Box */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Arquivo anexado</span>
                  <div className="text-sm font-bold text-white mt-0.5 flex items-center break-all">
                    <FileCode2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                    {cert.file_name || 'Nenhum arquivo anexado'}
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg border border-slate-700 font-mono shrink-0">
                  {cert.certificate_type}
                </span>
              </div>

              {/* Titular, emissor, serie e validade so aparecem se tiverem sido
                  LIDOS do certificado. Antes eram preenchidos no upload sem
                  abrir o arquivo, e a tela os exibia como fato. */}
              {certNaoVerificado ? (
                <div className="pt-2 border-t border-slate-800/60 text-xs text-amber-200/90 space-y-1">
                  <p className="font-semibold text-amber-300">Conteúdo do certificado não verificado</p>
                  <p>
                    O PrevSafe guarda o arquivo, mas não abre o .PFX/.P12: titular, autoridade
                    certificadora, número de série e validade não são lidos aqui, e o sistema não
                    assina eventos com este certificado.
                  </p>
                  <p>
                    Confira esses dados junto à sua Autoridade Certificadora ou no portal do eSocial
                    antes da transmissão.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/60 text-xs">
                  <div>
                    <span className="text-slate-500">Titular / Subject:</span>
                    <div className="text-slate-200 font-medium">{cert.subject_name || '—'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Autoridade Certificadora:</span>
                    <div className="text-slate-200 font-medium">{cert.issuer_name || '—'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Número de Série:</span>
                    <div className="text-slate-200 font-mono">{cert.serial_number || '—'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Validade Até:</span>
                    <div className="text-slate-200 font-medium">
                      {cert.valid_until
                        ? `${new Date(cert.valid_until).toLocaleDateString('pt-BR')} (${cert.days_remaining} dias restantes)`
                        : '—'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Upload PFX Drag & Drop */}
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition flex flex-col items-center justify-center space-y-2 cursor-pointer ${
                isDragging ? 'border-indigo-400 bg-indigo-950/20' : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
              }`}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pfx,.p12';
                input.onchange = (e: any) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                };
                input.click();
              }}
            >
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-full">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-slate-200">
                Clique para selecionar ou arraste o arquivo <span className="text-indigo-400 font-mono font-bold">.PFX</span> ou <span className="text-indigo-400 font-mono font-bold">.P12</span>
              </div>
              <p className="text-xs text-slate-400 max-w-sm">
                Certificado Digital de Pessoa Jurídica (e-CNPJ) ou Procuração Eletrônica RFB para transmissão de SST.
              </p>
            </div>

            {uploadMessage && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{uploadMessage}</span>
              </div>
            )}

            {/* Test Password & Connection */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Senha do Certificado Digital A1
                </label>
                <span className="text-[11px] text-slate-500">Armazenamento criptografado</span>
              </div>

              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={certPassword}
                    onChange={(e) => setCertPassword(e.target.value)}
                    placeholder="Digite a senha do certificado..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isTestingCert}
                  onClick={handleTestCertificate}
                  className="px-4 py-2.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingCert ? 'animate-spin' : ''}`} />
                  <span>{isTestingCert ? 'Verificando...' : 'Verificar certificado'}</span>
                </button>
              </div>

              {certTestResult && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-start space-x-2.5 ${
                  certTestResult.success 
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                    : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                }`}>
                  {certTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold">{certTestResult.message}</div>
                    {certTestResult.details?.serial_number && (
                      <div className="text-[11px] text-slate-300 mt-1 space-y-0.5">
                        <div>Série: {certTestResult.details.serial_number}</div>
                        <div>Emissor: {certTestResult.details.issuer_name}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SLA & Deadlines Automatic Notifications Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Alertas Automáticos de Prazos SST (S-2220 / PGR / PCMSO)</h2>
                  <p className="text-xs text-slate-400">Regras para disparo de notificações de exames e entregas técnicas</p>
                </div>
              </div>

              <button
                onClick={handleTriggerSlaCheck}
                className="px-3 py-1.5 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-teal-400" />
                <span>Auditar Prazos Agora</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span>Antecedência Vencimento Exame ASO (S-2220)</span>
                  <span className="text-teal-400 font-mono font-bold">{slaExamDays} dias</span>
                </label>
                <input
                  type="number"
                  min="5"
                  max="90"
                  value={slaExamDays}
                  onChange={(e) => setSlaExamDays(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                />
                <p className="text-[11px] text-slate-500">Gera alerta para agendamento de exame periódico antes da expiração.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span>Antecedência Entrega Laudos (PGR / PCMSO)</span>
                  <span className="text-teal-400 font-mono font-bold">{slaDocDays} dias</span>
                </label>
                <input
                  type="number"
                  min="3"
                  max="60"
                  value={slaDocDays}
                  onChange={(e) => setSlaDocDays(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                />
                <p className="text-[11px] text-slate-500">Notifica o responsável técnico antes do estouro de SLA da Ordem de Serviço.</p>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-800/80">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-white">Transmissão Automática de Lote (Robô Watcher)</div>
                  <div className="text-[11px] text-slate-400">Transmite automaticamente eventos válidos conforme o ASO/PGR for concluído.</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoBatchTransmission}
                  onChange={(e) => setAutoBatchTransmission(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-900"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-white">Notificar RH do Cliente por WhatsApp/E-mail</div>
                  <div className="text-[11px] text-slate-400">Envia recibo oficial e comprovante de envio ao RH da empresa cliente após retorno do Serpro.</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifyRh}
                  onChange={(e) => setNotifyRh(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-900"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Environment & Transmitter Credentials - Span 5 */}
        <div className="lg:col-span-5 space-y-6">
          {/* Environment Switcher */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Ambiente de Destino (Governo)</h2>
                <p className="text-xs text-slate-400">Web Service Serpro / Receita Federal do Brasil</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEnvironment('PRODUCAO')}
                className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                  environment === 'PRODUCAO'
                    ? 'bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-950/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`w-3 h-3 rounded-full ${environment === 'PRODUCAO' ? 'bg-emerald-400 ring-4 ring-emerald-500/20' : 'bg-slate-700'}`} />
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">tpAmb: 1</span>
                </div>
                <div className="mt-3">
                  <div className="text-xs font-bold text-white">Produção</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Efeito jurídico real oficial</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setEnvironment('PRODUCAO_RESTRITA')}
                className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                  environment === 'PRODUCAO_RESTRITA'
                    ? 'bg-amber-950/30 border-amber-500/50 shadow-lg shadow-amber-950/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`w-3 h-3 rounded-full ${environment === 'PRODUCAO_RESTRITA' ? 'bg-amber-400 ring-4 ring-amber-500/20' : 'bg-slate-700'}`} />
                  <span className="text-[10px] font-mono text-amber-400 font-bold">tpAmb: 2</span>
                </div>
                <div className="mt-3">
                  <div className="text-xs font-bold text-white">Produção Restrita</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Homologação / Testes</div>
                </div>
              </button>
            </div>

            {/* Web Service URLs */}
            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1.5 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Endpoint WSDL Oficial</span>
              <div className="text-slate-300 font-mono text-[10px] break-all bg-slate-900 p-2 rounded-lg border border-slate-800">
                {environment === 'PRODUCAO' 
                  ? 'https://webservices.producao.esocial.gov.br/servicos/empregador/loteeventos/WsEnviarLoteEventos.svc'
                  : 'https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/loteeventos/WsEnviarLoteEventos.svc'}
              </div>
            </div>
          </div>

          {/* Software House & Transmitter Credentials */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Credenciais do Transmissor / Software House</h2>
                <p className="text-xs text-slate-400">Identificação do emissor no cabeçalho dos lotes</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Tipo de Transmissor</label>
                <select
                  value={transmitterType}
                  onChange={(e: any) => setTransmitterType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="SOFTWARE_HOUSE">Software House / Consultoria SST (Procuração Eletrônica)</option>
                  <option value="EMPREGADOR_DIRETO">Próprio Empregador (Certificado do Cliente)</option>
                  <option value="PROCURACAO_RFB">Procurador Credenciado no e-CAC RFB</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">CNPJ do Transmissor / Consultoria</label>
                <input
                  type="text"
                  value={transmitterCnpj}
                  onChange={(e) => setTransmitterCnpj(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Razão Social Software House</label>
                <input
                  type="text"
                  value={softwareHouseName}
                  onChange={(e) => setSoftwareHouseName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Webhook de Notificação de Status (Opcional)</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://api.empresa.com.br/webhooks/esocial"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
