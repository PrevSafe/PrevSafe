import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Secao, Campo, Seletor, AreaTexto, Botao } from '@/components/ui/Form';
import { PRIORIDADE_OS_LABEL, type PrioridadeOS } from '@/lib/ordensServico';

type ModeloServico = { id: string; codigo: string; nome: string };
type Usuario = { id: string; nome: string };

type FormState = {
  modelo_servico_id: string;
  titulo: string;
  descricao: string;
  prioridade: PrioridadeOS;
  data_inicio: string;
  data_prazo: string;
  responsavel_tecnico_id: string;
  gestor_id: string;
};

const VAZIO: FormState = {
  modelo_servico_id: '',
  titulo: '',
  descricao: '',
  prioridade: 'normal',
  data_inicio: '',
  data_prazo: '',
  responsavel_tecnico_id: '',
  gestor_id: '',
};

/** Usuários vinculados e ativos na empresa — usados nos seletores de responsável
 *  técnico e gestor. Duas consultas porque não há FK direta entre
 *  usuarios_empresas e profiles (ambos apontam para auth.users), mesmo padrão
 *  já usado em src/lib/acessos.ts e api/cron/treinamentos-vencendo.ts. */
async function buscarUsuariosDaEmpresa(empresaId: string): Promise<Usuario[]> {
  const { data: vinculos } = await supabase
    .from('usuarios_empresas')
    .select('usuario_id')
    .eq('empresa_id', empresaId)
    .eq('ativo', true);

  const ids = [...new Set((vinculos ?? []).map((v) => v.usuario_id as string))];
  if (ids.length === 0) return [];

  const { data: perfis } = await supabase.from('profiles').select('id, nome').in('id', ids).order('nome');
  return (perfis ?? []) as Usuario[];
}

export default function OrdemServicoForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { empresaAtiva, can } = useAuth();
  const podeSalvar = can('ordens_servico', editando ? 'editar' : 'criar');

  const [form, setForm] = useState<FormState>(VAZIO);
  const [modeloAtual, setModeloAtual] = useState<ModeloServico | null>(null);
  const [modelos, setModelos] = useState<ModeloServico[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [erros, setErros] = useState<Partial<Record<keyof FormState, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    let ativo = true;

    async function carregar() {
      const [{ data: modelosData, error: modelosError }, usuariosData] = await Promise.all([
        supabase.from('modelos_servico').select('id, codigo, nome').eq('ativo', true).order('nome'),
        buscarUsuariosDaEmpresa(empresaAtiva!.empresa_id),
      ]);
      if (!ativo) return;
      if (modelosError) {
        setErroGeral(modelosError.message);
        setCarregando(false);
        return;
      }
      setModelos((modelosData ?? []) as ModeloServico[]);
      setUsuarios(usuariosData);

      if (id) {
        const { data, error } = await daEmpresa(
          supabase.from('ordens_servico').select('*, modelos_servico(id, codigo, nome)'),
          empresaAtiva!.empresa_id
        )
          .eq('id', id)
          .single();
        if (!ativo) return;
        if (error) {
          setErroGeral(error.code === 'PGRST116' ? 'Ordem de serviço não encontrada.' : error.message);
          setCarregando(false);
          return;
        }
        setModeloAtual((data.modelos_servico as ModeloServico | null) ?? null);
        setForm({
          modelo_servico_id: data.modelo_servico_id ?? '',
          titulo: data.titulo ?? '',
          descricao: data.descricao ?? '',
          prioridade: (data.prioridade as PrioridadeOS) ?? 'normal',
          data_inicio: data.data_inicio ?? '',
          data_prazo: data.data_prazo ?? '',
          responsavel_tecnico_id: data.responsavel_tecnico_id ?? '',
          gestor_id: data.gestor_id ?? '',
        });
      }

      setCarregando(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [id, empresaAtiva]);

  function set<K extends keyof FormState>(campo: K, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  function validar() {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!editando && !form.modelo_servico_id) e.modelo_servico_id = 'Selecione o modelo de serviço.';
    if (!form.titulo.trim()) e.titulo = 'Informe o título da OS.';
    if (form.data_inicio && form.data_prazo && form.data_prazo < form.data_inicio) {
      e.data_prazo = 'O prazo não pode ser anterior à data de início.';
    }
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setErroGeral(null);
    if (!podeSalvar || !validar() || !empresaAtiva) return;
    setSalvando(true);

    if (editando) {
      const payload = {
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || null,
        prioridade: form.prioridade,
        data_inicio: form.data_inicio || null,
        data_prazo: form.data_prazo || null,
        responsavel_tecnico_id: form.responsavel_tecnico_id || null,
        gestor_id: form.gestor_id || null,
      };
      const { error } = await supabase.from('ordens_servico').update(payload).eq('id', id!);
      setSalvando(false);
      if (error) {
        setErroGeral(error.message);
        return;
      }
      navigate(`/ordens-servico/${id}`, { replace: true });
      return;
    }

    const payload = {
      empresa_id: empresaAtiva.empresa_id,
      modelo_servico_id: form.modelo_servico_id,
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      prioridade: form.prioridade,
      data_inicio: form.data_inicio || null,
      data_prazo: form.data_prazo || null,
      responsavel_tecnico_id: form.responsavel_tecnico_id || null,
      gestor_id: form.gestor_id || null,
    };
    const { data, error } = await supabase.from('ordens_servico').insert(payload).select('id').single();
    setSalvando(false);

    if (error) {
      setErroGeral(error.message);
      return;
    }
    navigate(`/ordens-servico/${data.id}`, { replace: true });
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
          onClick={() => navigate(editando ? `/ordens-servico/${id}` : '/ordens-servico')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erroGeral}
          </div>
        )}

        <Secao icone="assignment" titulo="Serviço">
          {editando ? (
            <div className="flex flex-col gap-1">
              <span className="text-label-md text-on-surface">Modelo de serviço</span>
              <p className="text-body-md text-on-surface-variant">
                {modeloAtual ? `${modeloAtual.nome} (${modeloAtual.codigo})` : 'Sem modelo associado'}
              </p>
              <p className="text-label-sm text-outline italic">
                O modelo é definido na criação da OS e não pode ser trocado depois — as etapas já
                geradas ficariam inconsistentes.
              </p>
            </div>
          ) : (
            <Seletor
              rotulo="Modelo de serviço"
              name="modelo_servico_id"
              value={form.modelo_servico_id}
              onChange={(e) => set('modelo_servico_id', e.target.value)}
              erro={erros.modelo_servico_id}
              dica="Ao salvar, as etapas e tarefas do modelo são copiadas automaticamente para esta OS."
            >
              <option value="">Selecione o modelo</option>
              {modelos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} ({m.codigo})
                </option>
              ))}
            </Seletor>
          )}

          <Campo
            rotulo="Título"
            name="titulo"
            placeholder="Ex.: PGR 2026 — Matriz ABC Ltda"
            value={form.titulo}
            onChange={(e) => set('titulo', e.target.value)}
            erro={erros.titulo}
            autoFocus={editando}
          />

          <AreaTexto
            rotulo="Descrição (opcional)"
            name="descricao"
            placeholder="Detalhes adicionais sobre esta OS"
            value={form.descricao}
            onChange={(e) => set('descricao', e.target.value)}
          />

          <Seletor
            rotulo="Prioridade"
            name="prioridade"
            value={form.prioridade}
            onChange={(e) => set('prioridade', e.target.value)}
          >
            {(Object.keys(PRIORIDADE_OS_LABEL) as PrioridadeOS[]).map((p) => (
              <option key={p} value={p}>
                {PRIORIDADE_OS_LABEL[p]}
              </option>
            ))}
          </Seletor>
        </Secao>

        <Secao icone="event" titulo="Prazos e Responsáveis">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo
              rotulo="Data de início (opcional)"
              name="data_inicio"
              type="date"
              value={form.data_inicio}
              onChange={(e) => set('data_inicio', e.target.value)}
              dica="Usada para calcular o prazo de cada etapa a partir do prazo padrão do modelo."
            />
            <Campo
              rotulo="Prazo final (opcional)"
              name="data_prazo"
              type="date"
              value={form.data_prazo}
              onChange={(e) => set('data_prazo', e.target.value)}
              erro={erros.data_prazo}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Seletor
              rotulo="Responsável técnico (opcional)"
              name="responsavel_tecnico_id"
              value={form.responsavel_tecnico_id}
              onChange={(e) => set('responsavel_tecnico_id', e.target.value)}
            >
              <option value="">Não definido</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </Seletor>
            <Seletor
              rotulo="Gestor (opcional)"
              name="gestor_id"
              value={form.gestor_id}
              onChange={(e) => set('gestor_id', e.target.value)}
            >
              <option value="">Não definido</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </Seletor>
          </div>
        </Secao>
      </div>

      <footer className="flex gap-3 px-margin-mobile md:px-md py-4 mt-2 max-w-3xl w-full border-t border-outline-variant">
        <Botao
          type="button"
          variante="secundario"
          className="flex-1"
          onClick={() => navigate(editando ? `/ordens-servico/${id}` : '/ordens-servico')}
        >
          Cancelar
        </Botao>
        {podeSalvar && (
          <Botao type="submit" icone="save" carregando={salvando} className="flex-1">
            {salvando ? 'Salvando...' : 'Salvar OS'}
          </Botao>
        )}
      </footer>
    </form>
  );
}
