'use client';

/**
 * Fotografias de uma situacao de trabalho avaliada na AEP.
 *
 * A foto so aumenta a seguranca juridica do cliente sob quatro condicoes, e
 * esta tela existe para impor as quatro:
 *
 *   1. autenticavel - hash SHA-256 calculado aqui, sobre os bytes que vao
 *      para o armazenamento, antes do envio (CPC, art. 422, par. 1o)
 *   2. em par - "situacao encontrada" e "apos a medida" no mesmo aspecto. So
 *      a do problema, sem a da correcao, documenta que a empresa sabia
 *   3. sem rosto e sem nome - LGPD, art. 5o, I
 *   4. com rastro - nao ha excluir: ha substituir (a antiga fica) e descartar
 *      (o arquivo sai, o registro fica)
 *
 * As regras estao em lib/evidenciasFotograficas.ts; aqui so a tela.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import type { ErgonomicAssessment, EvidenciaFotografica, MomentoDaEvidencia } from '@/types';
import {
  MOMENTOS,
  TIPOS_ACEITOS,
  aspectosSemFotoDaCorrecao,
  conferirArquivo,
  conferirNovaEvidencia,
  evidenciasParaImpressao,
  rotuloDoMomento,
  sha256Hex,
} from '@/lib/evidenciasFotograficas';
import { NR17_ASPECTOS } from '@/lib/nr17';
import { uploadEvidencePhoto, createEvidenceSignedUrl, removeEvidencePhoto } from '@/lib/supabaseSync';
import { obterLocalizacao } from '@/lib/geolocalizacao';
import { novoId } from '@/lib/datas';
import {
  Camera,
  ImagePlus,
  RefreshCw,
  Archive,
  AlertTriangle,
  ShieldCheck,
  X,
  MapPin,
  Fingerprint,
  History,
  Loader2,
} from 'lucide-react';

interface AepPhotoEvidenceModalProps {
  aep: ErgonomicAssessment;
  onClose: () => void;
}

const MOTIVOS_DE_DESCARTE = [
  'Mostra pessoa identificável (LGPD)',
  'Foto de outra situação ou de outro cliente',
  'Imagem ilegível',
];

const rotuloDoAspecto = (chave?: string) =>
  NR17_ASPECTOS.find((a) => a.chave === chave)?.rotulo || 'Aspecto não indicado';

export const AepPhotoEvidenceModal: React.FC<AepPhotoEvidenceModalProps> = ({ aep, onClose }) => {
  const {
    organization,
    currentProfile,
    employees = [],
    ergonomicAssessments = [],
    registrarEvidenciaDaAEP,
    substituirEvidenciaDaAEP,
    descartarEvidenciaDaAEP,
  } = usePrevSafe();

  // Le a AEP do contexto, e nao da prop: depois de anexar, a prop ainda e a
  // versao de antes.
  const atual = ergonomicAssessments.find((a) => a.id === aep.id) || aep;
  const evidencias = atual.photo_evidence || [];
  const ativas = useMemo(
    () => evidenciasParaImpressao(evidencias, NR17_ASPECTOS.map((a) => a.chave)),
    [evidencias]
  );
  const encerradas = evidencias.filter((e) => e.situacao !== 'ATIVA');
  const semCorrecao = aspectosSemFotoDaCorrecao(evidencias);

  const nomesDosTrabalhadores = useMemo(
    () => employees.filter((e: any) => e?.client_id === atual.client_id).map((e: any) => String(e?.name || '')),
    [employees, atual.client_id]
  );

  // miniaturas: o bucket e privado, entao cada uma precisa de URL assinada
  const [miniaturas, setMiniaturas] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const novas: Record<string, string> = {};
      for (const e of ativas) {
        if (miniaturas[e.id]) continue;
        const url = await createEvidenceSignedUrl(e.path);
        if (url) novas[e.id] = url;
      }
      if (!cancelado && Object.keys(novas).length > 0) {
        setMiniaturas((m) => ({ ...m, ...novas }));
      }
    })();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativas]);

  // formulario de envio (tambem usado para substituir)
  const [substituindo, setSubstituindo] = useState<EvidenciaFotografica | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [momento, setMomento] = useState<MomentoDaEvidencia | ''>('');
  const [aspecto, setAspecto] = useState('');
  const [legenda, setLegenda] = useState('');
  const [semRosto, setSemRosto] = useState(false);
  const [noLocal, setNoLocal] = useState(false);
  const [motivoDaTroca, setMotivoDaTroca] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [problemas, setProblemas] = useState<string[]>([]);
  const [aviso, setAviso] = useState('');

  // descarte
  const [descartando, setDescartando] = useState<EvidenciaFotografica | null>(null);
  const [motivoDescarte, setMotivoDescarte] = useState('');
  const [detalheDescarte, setDetalheDescarte] = useState('');

  const limparFormulario = () => {
    setSubstituindo(null);
    setArquivo(null);
    setMomento('');
    setAspecto('');
    setLegenda('');
    setSemRosto(false);
    setNoLocal(false);
    setMotivoDaTroca('');
    setProblemas([]);
  };

  const iniciarSubstituicao = (e: EvidenciaFotografica) => {
    limparFormulario();
    setSubstituindo(e);
    setMomento(e.momento);
    setAspecto(e.aspecto || '');
    setLegenda(e.legenda);
    setAviso('');
  };

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setAviso('');

    const lista: string[] = [];
    const arq = conferirArquivo(arquivo);
    if (!arq.ok) lista.push(arq.motivo);
    lista.push(...conferirNovaEvidencia({
      legenda, momento, semRostoIdentificavel: semRosto, nomesDosTrabalhadores,
    }));
    if (substituindo && !motivoDaTroca.trim()) lista.push('Diga por que a foto está sendo trocada.');
    setProblemas(lista);
    if (lista.length > 0 || !arquivo || !momento) return;

    setEnviando(true);
    try {
      // O hash e calculado sobre ESTES bytes, e sao estes bytes que sobem.
      // Converter ou comprimir depois deixaria o hash sem arquivo correspondente.
      const bytes = await arquivo.arrayBuffer();
      const sha256 = await sha256Hex(bytes);

      let local: EvidenciaFotografica['local_do_registro'];
      let avisoDoLocal = '';
      if (noLocal) {
        const r = await obterLocalizacao();
        if (r.localizacao) {
          local = {
            latitude: r.localizacao.latitude,
            longitude: r.localizacao.longitude,
            precisao_metros: r.localizacao.precisaoMetros,
            obtida_em: r.localizacao.obtidaEm,
          };
        } else {
          avisoDoLocal = ` A posição não foi registrada: ${r.mensagem}`;
        }
      }

      const envio = await uploadEvidencePhoto(
        organization.id,
        `aep-${atual.id}`,
        new Blob([bytes], { type: arquivo.type }),
        arquivo.name
      );
      if (!envio.ok || !envio.evidence) {
        setProblemas([envio.message || 'Não foi possível enviar a foto.']);
        return;
      }

      const nova: EvidenciaFotografica = {
        id: novoId('foto-aep'),
        path: envio.evidence.path,
        sha256,
        mime: arquivo.type as EvidenciaFotografica['mime'],
        tamanho_bytes: bytes.byteLength,
        momento: momento as MomentoDaEvidencia,
        aspecto: aspecto || undefined,
        legenda: legenda.trim(),
        registrada_em: new Date().toISOString(),
        registrada_por_id: currentProfile?.id || '',
        registrada_por_nome: currentProfile?.full_name || '',
        local_do_registro: local,
        sem_rosto_identificavel: semRosto,
        situacao: 'ATIVA',
      };

      if (substituindo) {
        const r = substituirEvidenciaDaAEP(atual.id, substituindo.id, nova, motivoDaTroca);
        if (!r.ok) {
          setProblemas([r.message]);
          return;
        }
        setAviso(r.message + avisoDoLocal);
      } else {
        registrarEvidenciaDaAEP(atual.id, nova);
        setAviso(`Foto anexada. SHA-256 ${sha256.slice(0, 16)}… registrado.${avisoDoLocal}`);
      }
      if (envio.evidence.signedUrl) {
        setMiniaturas((m) => ({ ...m, [nova.id]: envio.evidence!.signedUrl }));
      }
      limparFormulario();
    } catch (erro: any) {
      setProblemas([erro?.message || 'Falha ao processar a foto.']);
    } finally {
      setEnviando(false);
    }
  };

  const confirmarDescarte = async () => {
    if (!descartando) return;
    const motivo = [motivoDescarte, detalheDescarte.trim()].filter(Boolean).join(' — ');
    if (!motivo) {
      setAviso('Diga por que a foto está sendo descartada.');
      return;
    }
    // Primeiro o arquivo; so depois o registro. Se a remocao falhar, nada
    // muda - melhor que um registro dizendo "descartada" com o arquivo la.
    const remocao = await removeEvidencePhoto(descartando.path);
    if (!remocao.ok) {
      setAviso(remocao.message || 'Não foi possível remover o arquivo. Nada foi alterado.');
      return;
    }
    const r = descartarEvidenciaDaAEP(atual.id, descartando.id, motivo);
    setAviso(r.message);
    setDescartando(null);
    setMotivoDescarte('');
    setDetalheDescarte('');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-[60rem] w-full p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Camera className="w-5 h-5 text-teal-400" />
              Fotografias — {atual.situation_name}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[46rem]">
              A NR-17 não exige nem proíbe foto na AEP (subitens 17.3.1.1 e 17.3.1.2.1). Ela vira prova
              quando é autenticável, vem em par antes/depois e não identifica ninguém.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {aviso && (
          <div className="bg-slate-950 border border-teal-500/30 rounded-lg p-3 text-xs text-slate-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <span className="flex-1">{aviso}</span>
            <button type="button" onClick={() => setAviso('')} className="text-slate-500 hover:text-slate-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {semCorrecao.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200">
              <strong>Foto do problema sem foto da correção:</strong>{' '}
              {semCorrecao.map((c) => (c ? rotuloDoAspecto(c) : 'sem aspecto indicado')).join('; ')}.
              Sozinha, ela documenta que a empresa conhecia o risco. Anexe a foto &quot;após a medida&quot;
              quando a adequação for feita — é esse par que protege o cliente.
            </p>
          </div>
        )}

        {/* ---------------------------------------------------------- fotos ativas */}
        {ativas.length === 0 ? (
          <p className="text-xs text-slate-500 py-2">Nenhuma foto anexada a esta situação.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ativas.map((e) => (
              <div key={e.id} className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <div className="aspect-[4/3] bg-slate-900 flex items-center justify-center">
                  {miniaturas[e.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={miniaturas[e.id]} alt={e.legenda} className="w-full h-full object-cover" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-teal-300">
                    {rotuloDoMomento(e.momento)} · {rotuloDoAspecto(e.aspecto)}
                  </p>
                  <p className="text-xs text-slate-200">{e.legenda}</p>
                  <p className="text-[10px] text-slate-500">
                    Registrada em {new Date(e.registrada_em).toLocaleString('pt-BR')} por {e.registrada_por_nome || '—'}
                  </p>
                  {e.local_do_registro && (
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Aparelho no registro: ± {Math.round(e.local_do_registro.precisao_metros)} m
                    </p>
                  )}
                  <p className="text-[10px] text-slate-600 font-mono flex items-center gap-1" title={e.sha256}>
                    <Fingerprint className="w-3 h-3" />
                    {e.sha256.slice(0, 24)}…
                  </p>
                  <div className="flex gap-2 pt-1.5">
                    <button
                      type="button"
                      onClick={() => iniciarSubstituicao(e)}
                      className="text-[11px] font-bold text-slate-400 hover:text-teal-300 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Substituir
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDescartando(e); setAviso(''); }}
                      className="text-[11px] font-bold text-slate-400 hover:text-rose-300 flex items-center gap-1"
                    >
                      <Archive className="w-3 h-3" />
                      Descartar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ---------------------------------------------------------- descarte */}
        {descartando && (
          <div className="bg-rose-500/5 border border-rose-500/30 rounded-xl p-4 space-y-3 text-xs">
            <p className="text-rose-200 font-semibold">
              Descartar: o arquivo sai do armazenamento; o registro — hash, autor, data e motivo — fica.
            </p>
            <select
              value={motivoDescarte}
              onChange={(e) => setMotivoDescarte(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
            >
              <option value="">Motivo</option>
              {MOTIVOS_DE_DESCARTE.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <input
              type="text"
              placeholder="Detalhe (opcional)"
              value={detalheDescarte}
              onChange={(e) => setDetalheDescarte(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDescartando(null)}
                className="px-3 py-1.5 text-slate-400 hover:text-slate-200 font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarDescarte}
                className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-lg"
              >
                Descartar arquivo
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------- envio */}
        <form onSubmit={enviar} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
          <p className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <ImagePlus className="w-4 h-4 text-teal-400" />
            {substituindo ? 'Substituir foto' : 'Anexar foto'}
          </p>

          <div>
            <input
              type="file"
              accept={TIPOS_ACEITOS.join(',')}
              capture="environment"
              onChange={(e) => setArquivo(e.target.files?.[0] || null)}
              className="block w-full text-slate-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-200 file:font-bold"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              JPEG ou PNG, até 10 MB. O arquivo sobe como está: o hash é calculado sobre ele.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">O que a foto mostra</label>
              <div className="space-y-1.5">
                {MOMENTOS.map((m) => (
                  <label key={m.valor} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="momento"
                      checked={momento === m.valor}
                      onChange={() => setMomento(m.valor)}
                      className="mt-0.5 accent-teal-500"
                    />
                    <span>
                      <span className="text-slate-200 font-semibold">{m.rotulo}</span>
                      <span className="block text-[10px] text-slate-500">{m.ajuda}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Aspecto da NR-17</label>
              <select
                value={aspecto}
                onChange={(e) => setAspecto(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
              >
                <option value="">Não indicado</option>
                {NR17_ASPECTOS.map((a) => (
                  <option key={a.chave} value={a.chave}>{a.rotulo} ({a.fonte})</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                É o aspecto que liga a foto do problema à foto da correção.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Legenda</label>
            <textarea
              rows={2}
              placeholder="Ex.: bancada fixa a 72 cm; operador trabalha com os ombros elevados."
              value={legenda}
              onChange={(e) => setLegenda(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Descreva o posto e a tarefa, não a pessoa. Nome de trabalhador na legenda é recusado.
            </p>
          </div>

          {substituindo && (
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Por que trocar</label>
              <input
                type="text"
                value={motivoDaTroca}
                onChange={(e) => setMotivoDaTroca(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                A foto anterior continua guardada, marcada como substituída.
              </p>
            </div>
          )}

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={semRosto}
              onChange={(e) => setSemRosto(e.target.checked)}
              className="mt-0.5 accent-teal-500"
            />
            <span className="text-slate-300">
              Ninguém é identificável pelo rosto nesta imagem.
              <span className="block text-[10px] text-slate-500">
                Fotografe o posto, não a pessoa. Se a postura exigir o trabalhador na foto, deixe o rosto
                fora do enquadramento ou desfocado — e avise o trabalhador (item 17.3.8).
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={noLocal}
              onChange={(e) => setNoLocal(e.target.checked)}
              className="mt-0.5 accent-teal-500"
            />
            <span className="text-slate-300">
              Estou no posto de trabalho agora — registrar a posição do aparelho
              <span className="block text-[10px] text-slate-500">
                É a posição do aparelho no momento do registro, não a de quando a foto foi tirada. Não
                marque se estiver enviando do escritório.
              </span>
            </span>
          </label>

          {problemas.length > 0 && (
            <ul className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 space-y-1">
              {problemas.map((p) => (
                <li key={p} className="text-red-200 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  {p}
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end gap-2">
            {substituindo && (
              <button
                type="button"
                onClick={limparFormulario}
                className="px-3 py-2 text-slate-400 hover:text-slate-200 font-bold"
              >
                Cancelar troca
              </button>
            )}
            <button
              type="submit"
              disabled={enviando}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold rounded-lg flex items-center gap-1.5"
            >
              {enviando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {substituindo ? 'Substituir' : 'Anexar'}
            </button>
          </div>
        </form>

        {/* ---------------------------------------------------------- historico */}
        {encerradas.length > 0 && (
          <details className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs">
            <summary className="cursor-pointer text-slate-400 font-semibold flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Histórico: {encerradas.length} foto(s) substituída(s) ou descartada(s)
            </summary>
            <ul className="mt-2 divide-y divide-slate-800">
              {encerradas.map((e) => (
                <li key={e.id} className="py-2 space-y-0.5">
                  <p className="text-slate-300">
                    <span className={e.situacao === 'DESCARTADA' ? 'text-rose-300' : 'text-slate-400'}>
                      {e.situacao === 'DESCARTADA' ? 'Descartada' : 'Substituída'}
                    </span>
                    {' '}em {e.encerrada_em ? new Date(e.encerrada_em).toLocaleString('pt-BR') : '—'}
                    {' '}por {e.encerrada_por_nome || '—'}: {e.motivo_encerramento || '—'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {rotuloDoMomento(e.momento)} · {e.legenda} · registrada em{' '}
                    {new Date(e.registrada_em).toLocaleString('pt-BR')} por {e.registrada_por_nome || '—'}
                  </p>
                  <p className="text-[10px] text-slate-600 font-mono break-all">SHA-256 {e.sha256}</p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
};
