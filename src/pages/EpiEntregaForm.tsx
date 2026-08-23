import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Secao, Campo, Seletor, AreaTexto, Botao } from '@/components/ui/Form';
import Modal from '@/components/ui/Modal';
import { MOTIVO_LABEL, calcularValidade, type MotivoEntrega } from '@/lib/epi';

type Funcionario = { id: string; nome: string };
type Epi = { id: string; nome: string; ca: string; vida_util_dias: number | null };

type FormState = {
  funcionario_id: string;
  epi_id: string;
  quantidade: string;
  data_entrega: string;
  data_validade: string;
  motivo: MotivoEntrega;
  observacao: string;
};

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

const VAZIO: FormState = {
  funcionario_id: '',
  epi_id: '',
  quantidade: '1',
  data_entrega: '',
  data_validade: '',
  motivo: 'entrega_inicial',
  observacao: '',
};

const NOVO_EPI_VAZIO = { nome: '', ca: '', vida_util_dias: '' };

export default function EpiEntregaForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { empresaAtiva } = useAuth();

  const [form, setForm] = useState<FormState>(() => ({ ...VAZIO, data_entrega: hoje() }));
  const [erros, setErros] = useState<Partial<Record<keyof FormState, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [epis, setEpis] = useState<Epi[]>([]);

  const [modalEpiAberto, setModalEpiAberto] = useState(false);
  const [novoEpi, setNovoEpi] = useState(NOVO_EPI_VAZIO);
  const [erroNovoEpi, setErroNovoEpi] = useState<string | null>(null);
  const [salvandoEpi, setSalvandoEpi] = useState(false);

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    const empresaId = empresaAtiva.empresa_id;

    async function carregar() {
      const [rf, re] = await Promise.all([
        daEmpresa(supabase.from('funcionarios').select('id, nome'), empresaId)
          .eq('status', 'ativo')
          .order('nome'),
        daEmpresa(supabase.from('epis').select('id, nome, ca, vida_util_dias'), empresaId)
          .eq('ativo', true)
          .order('nome'),
      ]);
      if (!ativo) return;

      const erroBase = rf.error ?? re.error;
      if (erroBase) {
        setErroGeral(erroBase.message);
        setCarregando(false);
        return;
      }

      setFuncionarios((rf.data ?? []) as Funcionario[]);
      setEpis((re.data ?? []) as Epi[]);

      if (id) {
        const { data, error } = await daEmpresa(supabase.from('epi_entregas').select('*'), empresaId)
          .eq('id', id)
          .single();
        if (!ativo) return;
        if (error) {
          setErroGeral(error.message);
          setCarregando(false);
          return;
        }
        setForm({
          funcionario_id: data.funcionario_id,
          epi_id: data.epi_id,
          quantidade: String(data.quantidade ?? 1),
          data_entrega: data.data_entrega ?? hoje(),
          data_validade: data.data_validade ?? '',
          motivo: (data.motivo as MotivoEntrega) ?? 'entrega_inicial',
          observacao: data.observacao ?? '',
        });
      }

      setCarregando(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [id, empresaAtiva]);

  const episPorId = useMemo(() => new Map(epis.map((e) => [e.id, e])), [epis]);

  function set<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  function mudarEpi(epiId: string) {
    const epi = episPorId.get(epiId);
    setForm((f) => ({
      ...f,
      epi_id: epiId,
      data_validade: epi ? calcularValidade(f.data_entrega, epi.vida_util_dias) ?? '' : f.data_validade,
    }));
    setErros((e) => ({ ...e, epi_id: undefined }));
  }

  function mudarDataEntrega(data: string) {
    const epi = episPorId.get(form.epi_id);
    setForm((f) => ({
      ...f,
      data_entrega: data,
      data_validade: epi ? calcularValidade(data, epi.vida_util_dias) ?? '' : f.data_validade,
    }));
    setErros((e) => ({ ...e, data_entrega: undefined }));
  }

  function validar() {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.funcionario_id) e.funcionario_id = 'Selecione o funcionário.';
    if (!form.epi_id) e.epi_id = 'Selecione o equipamento.';
    const qtd = Number(form.quantidade);
    if (!form.quantidade || !Number.isInteger(qtd) || qtd <= 0)
      e.quantidade = 'Informe uma quantidade válida.';
    if (!form.data_entrega) e.data_entrega = 'Informe a data de entrega.';
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setErroGeral(null);
    if (!validar() || !empresaAtiva) return;
    setSalvando(true);

    const payload = {
      empresa_id: empresaAtiva.empresa_id,
      funcionario_id: form.funcionario_id,
      epi_id: form.epi_id,
      quantidade: Number(form.quantidade),
      data_entrega: form.data_entrega,
      data_validade: form.data_validade || null,
      motivo: form.motivo,
      observacao: form.observacao.trim() || null,
    };

    const { error } = editando
      ? await supabase.from('epi_entregas').update(payload).eq('id', id!)
      : await supabase.from('epi_entregas').insert(payload);

    setSalvando(false);

    if (error) {
      setErroGeral(error.message);
      return;
    }
    navigate('/epi', { replace: true });
  }

  async function salvarNovoEpi(ev: FormEvent) {
    ev.preventDefault();
    setErroNovoEpi(null);
    if (!empresaAtiva) return;

    if (!novoEpi.nome.trim()) {
      setErroNovoEpi('Informe o nome do equipamento.');
      return;
    }
    const caDigits = novoEpi.ca.replace(/\D/g, '');
    if (!caDigits) {
      setErroNovoEpi('Informe o número do CA (Certificado de Aprovação).');
      return;
    }

    setSalvandoEpi(true);
    const { data, error } = await supabase
      .from('epis')
      .insert({
        empresa_id: empresaAtiva.empresa_id,
        nome: novoEpi.nome.trim(),
        ca: caDigits,
        vida_util_dias: novoEpi.vida_util_dias ? Number(novoEpi.vida_util_dias) : null,
      })
      .select('id, nome, ca, vida_util_dias')
      .single();
    setSalvandoEpi(false);

    if (error) {
      setErroNovoEpi(
        error.code === '23505' ? 'Já existe um equipamento cadastrado com este CA.' : error.message
      );
      return;
    }

    const criado = data as Epi;
    setEpis((prev) => [...prev, criado].sort((a, b) => a.nome.localeCompare(b.nome)));
    mudarEpi(criado.id);
    setNovoEpi(NOVO_EPI_VAZIO);
    setModalEpiAberto(false);
  }

  if (carregando) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <span className="material-symbols-outlined animate-spin text-primary text-[32px]">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={salvar} className="flex-1 flex flex-col">
      <header className="sticky top-0 md:top-0 z-20 flex items-center bg-surface-container-lowest px-margin-mobile md:px-md py-4 border-b border-outline-variant gap-2">
        <button
          type="button"
          onClick={() => navigate('/epi')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar entrega' : 'Nova entrega de EPI'}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erroGeral}
          </div>
        )}

        {funcionarios.length === 0 ? (
          <div className="flex items-start gap-2 bg-[#F97316]/10 text-[#9a3412] px-3 py-2 rounded-lg text-label-sm">
            <span className="material-symbols-outlined text-[16px] mt-px">warning</span>
            <span>Nenhum funcionário ativo cadastrado ainda. Cadastre um funcionário antes de registrar uma entrega.</span>
          </div>
        ) : (
          <Secao icone="engineering" titulo="Entrega">
            <Seletor
              rotulo="Funcionário"
              name="funcionario_id"
              value={form.funcionario_id}
              onChange={(e) => set('funcionario_id', e.target.value)}
              erro={erros.funcionario_id}
              autoFocus
            >
              <option value="">Selecione o funcionário</option>
              {funcionarios.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </Seletor>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Seletor
                  rotulo="Equipamento"
                  name="epi_id"
                  value={form.epi_id}
                  onChange={(e) => mudarEpi(e.target.value)}
                  erro={erros.epi_id}
                >
                  <option value="">Selecione o equipamento</option>
                  {epis.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome} — CA {e.ca}
                    </option>
                  ))}
                </Seletor>
              </div>
              <Botao
                type="button"
                variante="secundario"
                icone="add"
                className="shrink-0 h-12"
                onClick={() => setModalEpiAberto(true)}
              >
                Novo tipo
              </Botao>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Campo
                rotulo="Quantidade"
                name="quantidade"
                type="number"
                min={1}
                value={form.quantidade}
                onChange={(e) => set('quantidade', e.target.value)}
                erro={erros.quantidade}
              />
              <Campo
                rotulo="Data de entrega"
                name="data_entrega"
                type="date"
                value={form.data_entrega}
                onChange={(e) => mudarDataEntrega(e.target.value)}
                erro={erros.data_entrega}
              />
              <Campo
                rotulo="Data de validade"
                name="data_validade"
                type="date"
                value={form.data_validade}
                onChange={(e) => set('data_validade', e.target.value)}
                dica="Sugerida a partir da vida útil do equipamento — pode ser ajustada."
              />
            </div>

            <Seletor
              rotulo="Motivo"
              name="motivo"
              value={form.motivo}
              onChange={(e) => set('motivo', e.target.value as MotivoEntrega)}
            >
              {(Object.keys(MOTIVO_LABEL) as MotivoEntrega[]).map((m) => (
                <option key={m} value={m}>
                  {MOTIVO_LABEL[m]}
                </option>
              ))}
            </Seletor>

            <AreaTexto
              rotulo="Observações (opcional)"
              name="observacao"
              placeholder="Ex.: entregue com treinamento de uso, ciência do funcionário, etc."
              value={form.observacao}
              onChange={(e) => set('observacao', e.target.value)}
            />
          </Secao>
        )}
      </div>

      <footer className="flex gap-3 px-margin-mobile md:px-md py-4 mt-2 max-w-3xl w-full border-t border-outline-variant">
        <Botao type="button" variante="secundario" className="flex-1" onClick={() => navigate('/epi')}>
          Cancelar
        </Botao>
        <Botao
          type="submit"
          icone="save"
          carregando={salvando}
          disabled={funcionarios.length === 0}
          className="flex-1"
        >
          {salvando ? 'Salvando...' : 'Salvar entrega'}
        </Botao>
      </footer>

      <Modal
        aberto={modalEpiAberto}
        titulo="Novo tipo de EPI"
        onFechar={() => {
          setModalEpiAberto(false);
          setErroNovoEpi(null);
        }}
      >
        <form onSubmit={salvarNovoEpi} className="flex flex-col gap-4 p-2">
          {erroNovoEpi && (
            <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-sm">
              {erroNovoEpi}
            </div>
          )}
          <Campo
            rotulo="Nome do equipamento"
            name="novo_epi_nome"
            placeholder="Ex.: Capacete de segurança"
            value={novoEpi.nome}
            onChange={(e) => setNovoEpi((v) => ({ ...v, nome: e.target.value }))}
            autoFocus
          />
          <Campo
            rotulo="CA (Certificado de Aprovação)"
            name="novo_epi_ca"
            inputMode="numeric"
            placeholder="00000"
            value={novoEpi.ca}
            onChange={(e) => setNovoEpi((v) => ({ ...v, ca: e.target.value }))}
          />
          <Campo
            rotulo="Vida útil em dias (opcional)"
            name="novo_epi_vida_util"
            type="number"
            min={1}
            placeholder="Ex.: 180"
            value={novoEpi.vida_util_dias}
            onChange={(e) => setNovoEpi((v) => ({ ...v, vida_util_dias: e.target.value }))}
            dica="Usada para sugerir a data de validade nas entregas."
          />
          <Botao type="submit" icone="save" carregando={salvandoEpi}>
            {salvandoEpi ? 'Salvando...' : 'Salvar equipamento'}
          </Botao>
        </form>
      </Modal>
    </form>
  );
}
