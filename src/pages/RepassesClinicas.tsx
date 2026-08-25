import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { formatarMoeda } from '@/lib/inspecoes';
import { Campo, Seletor, Botao } from '@/components/ui/Form';
import {
  STATUS_REPASSE_LABEL,
  corStatusRepasse,
  formatarCompetencia,
  type StatusRepasse,
} from '@/lib/financeiro';

type Repasse = {
  id: string;
  competencia: string;
  valor: number;
  status: StatusRepasse;
  observacao: string | null;
  clinica_id: string;
  clinicas_credenciadas: { nome_fantasia: string } | null;
};

type Clinica = { id: string; nome_fantasia: string };

const NOVO_VAZIO = { clinica_id: '', competencia: '', valor: '', observacao: '' };

export default function RepassesClinicas() {
  const { empresaAtiva, can } = useAuth();
  const podeCriar = can('financeiro', 'criar');
  const podeEditar = can('financeiro', 'editar');

  const [repasses, setRepasses] = useState<Repasse[]>([]);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | StatusRepasse>('todos');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [novo, setNovo] = useState(NOVO_VAZIO);
  const [erroNovo, setErroNovo] = useState<string | null>(null);
  const [lancando, setLancando] = useState(false);

  function carregarRepasses(empresaId: string) {
    setCarregando(true);
    supabase
      .from('repasses_clinicas_credenciadas')
      .select(
        'id, competencia, valor, status, observacao, clinica_id, clinicas_credenciadas!inner(nome_fantasia, empresa_id)'
      )
      .eq('clinicas_credenciadas.empresa_id', empresaId)
      .order('competencia', { ascending: false })
      .then(({ data, error }) => {
        if (error) setErro(error.message);
        else setRepasses((data ?? []) as unknown as Repasse[]);
        setCarregando(false);
      });
  }

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    const empresaId = empresaAtiva.empresa_id;
    carregarRepasses(empresaId);
    daEmpresa(supabase.from('clinicas_credenciadas').select('id, nome_fantasia').eq('ativo', true), empresaId)
      .order('nome_fantasia')
      .then(({ data, error }) => {
        if (!error) setClinicas((data ?? []) as Clinica[]);
      });
  }, [empresaAtiva]);

  async function alterarStatus(repasseId: string, novoStatus: StatusRepasse) {
    setErro(null);
    const anterior = repasses;
    setRepasses((lista) => lista.map((r) => (r.id === repasseId ? { ...r, status: novoStatus } : r)));
    const { error } = await supabase
      .from('repasses_clinicas_credenciadas')
      .update({ status: novoStatus })
      .eq('id', repasseId);
    if (error) {
      setErro(error.message);
      setRepasses(anterior);
    }
  }

  function set<K extends keyof typeof novo>(campo: K, valor: string) {
    setNovo((f) => ({ ...f, [campo]: valor }));
    setErroNovo(null);
  }

  async function lancarRepasse() {
    setErroNovo(null);
    if (!novo.clinica_id) {
      setErroNovo('Selecione a clínica.');
      return;
    }
    if (!novo.competencia) {
      setErroNovo('Informe a competência.');
      return;
    }
    const valor = Number(novo.valor);
    if (!novo.valor || Number.isNaN(valor) || valor < 0) {
      setErroNovo('Informe um valor válido.');
      return;
    }
    if (!empresaAtiva) return;

    setLancando(true);
    const { error } = await supabase.from('repasses_clinicas_credenciadas').insert({
      clinica_id: novo.clinica_id,
      competencia: `${novo.competencia}-01`,
      valor,
      observacao: novo.observacao.trim() || null,
    });
    setLancando(false);

    if (error) {
      setErroNovo(error.message);
      return;
    }
    setNovo(NOVO_VAZIO);
    carregarRepasses(empresaAtiva.empresa_id);
  }

  const termo = busca.trim().toLowerCase();
  const filtrados = repasses.filter((r) => {
    if (statusFiltro !== 'todos' && r.status !== statusFiltro) return false;
    if (!termo) return true;
    return (r.clinicas_credenciadas?.nome_fantasia ?? '').toLowerCase().includes(termo);
  });
  const filtroAtivo = Boolean(termo) || statusFiltro !== 'todos';

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">Repasses de Clínicas Credenciadas</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Conciliação dos valores devidos a cada clínica da rede credenciada por exames
            realizados, por competência
          </p>
        </div>
      </header>

      <div className="px-margin-mobile md:px-md pb-8 flex-1 flex flex-col gap-4">
        {erro && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erro}
          </div>
        )}

        {podeCriar && (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 flex flex-col gap-3">
            <h3 className="text-title-lg text-primary-container">Lançar novo repasse</h3>
            {erroNovo && (
              <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
                {erroNovo}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1fr_1.5fr_auto] gap-3 items-end">
              <Seletor
                rotulo="Clínica"
                name="novo_clinica_id"
                value={novo.clinica_id}
                onChange={(e) => set('clinica_id', e.target.value)}
              >
                <option value="">Selecione</option>
                {clinicas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_fantasia}
                  </option>
                ))}
              </Seletor>
              <Campo
                rotulo="Competência"
                name="novo_competencia"
                type="month"
                value={novo.competencia}
                onChange={(e) => set('competencia', e.target.value)}
              />
              <Campo
                rotulo="Valor (R$)"
                name="novo_valor"
                type="number"
                min={0}
                step="0.01"
                placeholder="0,00"
                value={novo.valor}
                onChange={(e) => set('valor', e.target.value)}
              />
              <Campo
                rotulo="Observação (opcional)"
                name="novo_observacao"
                placeholder="Ex.: referente à competência de agosto"
                value={novo.observacao}
                onChange={(e) => set('observacao', e.target.value)}
              />
              <Botao type="button" icone="add" carregando={lancando} onClick={lancarRepasse}>
                Lançar repasse
              </Botao>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
              search
            </span>
            <input
              type="search"
              placeholder="Buscar por nome da clínica"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full h-12 rounded-lg border border-outline-variant bg-surface-container-lowest pl-11 pr-4 text-body-md placeholder:text-outline focus:outline-none focus:border-2 focus:border-primary-container"
            />
          </div>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as 'todos' | StatusRepasse)}
            className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container sm:w-48"
          >
            <option value="todos">Todos os status</option>
            <option value="pendente">{STATUS_REPASSE_LABEL.pendente}</option>
            <option value="conferido">{STATUS_REPASSE_LABEL.conferido}</option>
            <option value="pago">{STATUS_REPASSE_LABEL.pago}</option>
            <option value="contestado">{STATUS_REPASSE_LABEL.contestado}</option>
          </select>
        </div>

        {carregando ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/40">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">
              sync_alt
            </span>
            <p className="text-body-md text-on-surface-variant">
              {filtroAtivo
                ? 'Nenhum repasse encontrado para este filtro.'
                : 'Nenhum repasse lançado ainda.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtrados.map((r) => (
              <div
                key={r.id}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0 hidden sm:flex">
                  <span className="material-symbols-outlined">sync_alt</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-body-lg text-primary font-semibold truncate">
                    {r.clinicas_credenciadas?.nome_fantasia ?? '—'}
                  </h3>
                  <p className="text-label-sm text-on-surface-variant truncate">
                    {formatarCompetencia(r.competencia)}
                  </p>
                  {r.observacao && (
                    <p className="text-label-sm text-outline truncate mt-1">{r.observacao}</p>
                  )}
                </div>
                <div className="text-body-md text-on-surface shrink-0 sm:w-32 sm:text-right">
                  {formatarMoeda(r.valor)}
                </div>
                <div className="shrink-0 sm:w-48">
                  {podeEditar ? (
                    <select
                      value={r.status}
                      onChange={(e) => alterarStatus(r.id, e.target.value as StatusRepasse)}
                      className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-label-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container"
                    >
                      <option value="pendente">{STATUS_REPASSE_LABEL.pendente}</option>
                      <option value="conferido">{STATUS_REPASSE_LABEL.conferido}</option>
                      <option value="pago">{STATUS_REPASSE_LABEL.pago}</option>
                      <option value="contestado">{STATUS_REPASSE_LABEL.contestado}</option>
                    </select>
                  ) : (
                    <span
                      className={`px-2.5 py-1 rounded-full text-label-sm ${corStatusRepasse(r.status)}`}
                    >
                      {STATUS_REPASSE_LABEL[r.status]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
