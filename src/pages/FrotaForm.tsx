import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Secao, Campo, Seletor, AreaTexto, Botao } from '@/components/ui/Form';
import { STATUS_LABEL, TIPO_LABEL } from '@/lib/frota';

type Unidade = { id: string; razao_social: string; nome_fantasia: string | null };

type Form = {
  unidade_id: string;
  tipo: 'veiculo' | 'maquina';
  identificacao: string;
  descricao: string;
  status: 'ativo' | 'manutencao' | 'inativo';
  data_ultima_manutencao: string;
  data_proxima_manutencao: string;
  observacao: string;
};

const VAZIO: Form = {
  unidade_id: '',
  tipo: 'veiculo',
  identificacao: '',
  descricao: '',
  status: 'ativo',
  data_ultima_manutencao: '',
  data_proxima_manutencao: '',
  observacao: '',
};

export default function FrotaForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { empresaAtiva } = useAuth();

  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [form, setForm] = useState<Form>(VAZIO);
  const [erros, setErros] = useState<Partial<Record<keyof Form, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaAtiva) return;
    let ativo = true;
    const empresaId = empresaAtiva.empresa_id;

    const carregarUnidades = daEmpresa(
      supabase.from('unidades').select('id, razao_social, nome_fantasia'),
      empresaId
    );
    const carregarItem = id
      ? daEmpresa(supabase.from('frota').select('*'), empresaId).eq('id', id).single()
      : Promise.resolve({ data: null, error: null });

    Promise.all([carregarUnidades, carregarItem]).then(([ru, ri]) => {
      if (!ativo) return;
      const erroCombinado = ru.error ?? ri.error;
      if (erroCombinado) {
        setErroGeral(erroCombinado.message);
      } else {
        setUnidades((ru.data ?? []) as Unidade[]);
        if (ri.data) {
          const item = ri.data as Record<string, unknown>;
          setForm({
            unidade_id: (item.unidade_id as string) ?? '',
            tipo: (item.tipo as Form['tipo']) ?? 'veiculo',
            identificacao: (item.identificacao as string) ?? '',
            descricao: (item.descricao as string) ?? '',
            status: (item.status as Form['status']) ?? 'ativo',
            data_ultima_manutencao: (item.data_ultima_manutencao as string) ?? '',
            data_proxima_manutencao: (item.data_proxima_manutencao as string) ?? '',
            observacao: (item.observacao as string) ?? '',
          });
        }
      }
      setCarregando(false);
    });

    return () => {
      ativo = false;
    };
  }, [id, empresaAtiva]);

  function set<K extends keyof Form>(campo: K, valor: Form[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  function validar() {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!form.unidade_id) e.unidade_id = 'Selecione a unidade.';
    if (!form.identificacao.trim())
      e.identificacao = form.tipo === 'veiculo' ? 'Informe a placa.' : 'Informe o código/patrimônio.';
    if (!form.descricao.trim()) e.descricao = 'Informe a descrição/modelo.';
    if (
      form.data_ultima_manutencao &&
      form.data_proxima_manutencao &&
      form.data_proxima_manutencao < form.data_ultima_manutencao
    ) {
      e.data_proxima_manutencao = 'A próxima manutenção não pode ser antes da última.';
    }
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
      unidade_id: form.unidade_id,
      tipo: form.tipo,
      identificacao: form.identificacao.trim().toUpperCase(),
      descricao: form.descricao.trim(),
      status: form.status,
      data_ultima_manutencao: form.data_ultima_manutencao || null,
      data_proxima_manutencao: form.data_proxima_manutencao || null,
      observacao: form.observacao.trim() || null,
    };

    const { error } = editando
      ? await supabase.from('frota').update(payload).eq('id', id!)
      : await supabase.from('frota').insert(payload);

    setSalvando(false);

    if (error) {
      setErroGeral(
        error.code === '23505'
          ? 'Já existe um item cadastrado com esta identificação.'
          : error.message
      );
      return;
    }
    navigate('/frota', { replace: true });
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
          onClick={() => navigate('/frota')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar item da frota' : 'Novo item da frota'}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full pb-32">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erroGeral}
          </div>
        )}

        <Secao icone="agriculture" titulo="Identificação">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Seletor
              rotulo="Tipo"
              name="tipo"
              value={form.tipo}
              onChange={(e) => set('tipo', e.target.value as Form['tipo'])}
              erro={erros.tipo}
            >
              <option value="veiculo">{TIPO_LABEL.veiculo}</option>
              <option value="maquina">{TIPO_LABEL.maquina}</option>
            </Seletor>
            <Campo
              rotulo={form.tipo === 'veiculo' ? 'Placa' : 'Código/patrimônio'}
              name="identificacao"
              placeholder={form.tipo === 'veiculo' ? 'Ex.: ABC1D23' : 'Ex.: PAT-0042'}
              value={form.identificacao}
              onChange={(e) => set('identificacao', e.target.value)}
              erro={erros.identificacao}
              autoFocus
            />
          </div>
          <Campo
            rotulo="Descrição/modelo"
            name="descricao"
            placeholder="Ex.: Caminhonete Toyota Hilux 2022, Serra circular de bancada"
            value={form.descricao}
            onChange={(e) => set('descricao', e.target.value)}
            erro={erros.descricao}
          />
          <Seletor
            rotulo="Unidade"
            name="unidade_id"
            value={form.unidade_id}
            onChange={(e) => set('unidade_id', e.target.value)}
            erro={erros.unidade_id}
          >
            <option value="">Selecione a unidade</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome_fantasia || u.razao_social}
              </option>
            ))}
          </Seletor>
        </Secao>

        <Secao icone="build" titulo="Manutenção">
          <Seletor
            rotulo="Status"
            name="status"
            value={form.status}
            onChange={(e) => set('status', e.target.value as Form['status'])}
            erro={erros.status}
          >
            <option value="ativo">{STATUS_LABEL.ativo}</option>
            <option value="manutencao">{STATUS_LABEL.manutencao}</option>
            <option value="inativo">{STATUS_LABEL.inativo}</option>
          </Seletor>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo
              rotulo="Última manutenção/revisão"
              name="data_ultima_manutencao"
              type="date"
              value={form.data_ultima_manutencao}
              onChange={(e) => set('data_ultima_manutencao', e.target.value)}
              erro={erros.data_ultima_manutencao}
            />
            <Campo
              rotulo="Próxima manutenção/revisão prevista"
              name="data_proxima_manutencao"
              type="date"
              value={form.data_proxima_manutencao}
              onChange={(e) => set('data_proxima_manutencao', e.target.value)}
              erro={erros.data_proxima_manutencao}
              dica="Usada para destacar itens com manutenção vencendo ou vencida na listagem."
            />
          </div>
          <AreaTexto
            rotulo="Observações"
            name="observacao"
            placeholder="Detalhes adicionais, histórico de ocorrências, restrições de uso, etc."
            value={form.observacao}
            onChange={(e) => set('observacao', e.target.value)}
          />
        </Secao>
      </div>

      <footer className="fixed bottom-0 left-0 md:left-80 right-0 bg-surface-container-lowest p-4 border-t border-outline-variant flex gap-3 z-30 pb-24 md:pb-4">
        <div className="flex gap-3 w-full max-w-3xl mx-auto md:mx-0 md:ml-md">
          <Botao type="button" variante="secundario" className="flex-1" onClick={() => navigate('/frota')}>
            Cancelar
          </Botao>
          <Botao type="submit" icone="save" carregando={salvando} className="flex-1">
            {salvando ? 'Salvando...' : 'Salvar item'}
          </Botao>
        </div>
      </footer>
    </form>
  );
}
