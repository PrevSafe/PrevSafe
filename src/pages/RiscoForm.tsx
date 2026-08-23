import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Secao, Campo, Seletor, AreaTexto, Botao } from '@/components/ui/Form';
import {
  TIPO_RISCO_LABEL,
  calcularNivelRisco,
  classificarNivelRisco,
  corNivelRisco,
  NIVEL_RISCO_LABEL,
  type TipoRisco,
} from '@/lib/riscos';

type Ghe = { id: string; nome: string };

type FormState = {
  ghe_id: string;
  tipo_risco: TipoRisco;
  descricao: string;
  fonte_geradora: string;
  medidas_controle: string;
  probabilidade: string;
  severidade: string;
};

const VAZIO: FormState = {
  ghe_id: '',
  tipo_risco: 'fisico',
  descricao: '',
  fonte_geradora: '',
  medidas_controle: '',
  probabilidade: '1',
  severidade: '1',
};

export default function RiscoForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { empresaAtiva } = useAuth();

  const [form, setForm] = useState<FormState>(VAZIO);
  const [ghes, setGhes] = useState<Ghe[]>([]);
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
    const empresaId = empresaAtiva.empresa_id;

    async function carregar() {
      const rg = await daEmpresa(supabase.from('ghes').select('id, nome'), empresaId).order('nome');
      if (!ativo) return;

      if (rg.error) {
        setErroGeral(rg.error.message);
        setCarregando(false);
        return;
      }
      setGhes((rg.data ?? []) as Ghe[]);

      if (id) {
        const { data, error } = await daEmpresa(supabase.from('riscos_inventario').select('*'), empresaId)
          .eq('id', id)
          .single();
        if (!ativo) return;
        if (error) {
          setErroGeral(error.message);
          setCarregando(false);
          return;
        }
        setForm({
          ghe_id: data.ghe_id ?? '',
          tipo_risco: (data.tipo_risco as TipoRisco) ?? 'fisico',
          descricao: data.descricao ?? '',
          fonte_geradora: data.fonte_geradora ?? '',
          medidas_controle: data.medidas_controle ?? '',
          probabilidade: String(data.probabilidade ?? 1),
          severidade: String(data.severidade ?? 1),
        });
      }

      setCarregando(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [id, empresaAtiva]);

  function set<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  function validar() {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.ghe_id) e.ghe_id = 'Selecione o GHE.';
    if (!form.descricao.trim()) e.descricao = 'Descreva o risco identificado.';
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
      ghe_id: form.ghe_id,
      tipo_risco: form.tipo_risco,
      descricao: form.descricao.trim(),
      fonte_geradora: form.fonte_geradora.trim() || null,
      medidas_controle: form.medidas_controle.trim() || null,
      probabilidade: Number(form.probabilidade),
      severidade: Number(form.severidade),
    };

    const { error } = editando
      ? await supabase.from('riscos_inventario').update(payload).eq('id', id!)
      : await supabase.from('riscos_inventario').insert(payload);

    setSalvando(false);

    if (error) {
      setErroGeral(error.message);
      return;
    }
    navigate('/riscos', { replace: true });
  }

  const produto = calcularNivelRisco(Number(form.probabilidade), Number(form.severidade));
  const nivel = classificarNivelRisco(produto);

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
          onClick={() => navigate('/riscos')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar risco' : 'Novo risco'}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full pb-32">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erroGeral}
          </div>
        )}

        {ghes.length === 0 ? (
          <div className="flex items-start gap-2 bg-[#F97316]/10 text-[#9a3412] px-3 py-2 rounded-lg text-label-sm">
            <span className="material-symbols-outlined text-[16px] mt-px">warning</span>
            <span>Nenhum GHE cadastrado ainda. Cadastre um GHE antes de registrar um risco.</span>
          </div>
        ) : (
          <>
            <Secao icone="inventory_2" titulo="Identificação do risco">
              <Seletor
                rotulo="GHE"
                name="ghe_id"
                value={form.ghe_id}
                onChange={(e) => set('ghe_id', e.target.value)}
                erro={erros.ghe_id}
                autoFocus
              >
                <option value="">Selecione o GHE</option>
                {ghes.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nome}
                  </option>
                ))}
              </Seletor>

              <Seletor
                rotulo="Tipo de risco"
                name="tipo_risco"
                value={form.tipo_risco}
                onChange={(e) => set('tipo_risco', e.target.value as TipoRisco)}
              >
                {(Object.keys(TIPO_RISCO_LABEL) as TipoRisco[]).map((t) => (
                  <option key={t} value={t}>
                    {TIPO_RISCO_LABEL[t]}
                  </option>
                ))}
              </Seletor>

              <AreaTexto
                rotulo="Descrição do risco"
                name="descricao"
                placeholder="Ex.: Exposição a ruído contínuo acima do limite de tolerância"
                value={form.descricao}
                onChange={(e) => set('descricao', e.target.value)}
                erro={erros.descricao}
              />

              <Campo
                rotulo="Fonte geradora (opcional)"
                name="fonte_geradora"
                placeholder="Ex.: Compressor de ar, máquina de corte"
                value={form.fonte_geradora}
                onChange={(e) => set('fonte_geradora', e.target.value)}
              />

              <AreaTexto
                rotulo="Meios de controle existentes (opcional)"
                name="medidas_controle"
                placeholder="Ex.: Uso de protetor auricular, enclausuramento acústico, pausas programadas"
                value={form.medidas_controle}
                onChange={(e) => set('medidas_controle', e.target.value)}
              />
            </Secao>

            <Secao icone="grid_view" titulo="Classificação de risco">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Seletor
                  rotulo="Probabilidade (1 a 5)"
                  name="probabilidade"
                  value={form.probabilidade}
                  onChange={(e) => set('probabilidade', e.target.value)}
                  dica="1 = rara · 5 = praticamente certa"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Seletor>
                <Seletor
                  rotulo="Severidade (1 a 5)"
                  name="severidade"
                  value={form.severidade}
                  onChange={(e) => set('severidade', e.target.value)}
                  dica="1 = leve · 5 = gravíssima"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Seletor>
              </div>

              <div className="flex items-center gap-3 bg-surface-container rounded-lg px-4 py-3">
                <span className="text-label-md text-on-surface-variant">Nível de risco calculado:</span>
                <span className={`px-2.5 py-1 rounded-full text-label-sm ${corNivelRisco(nivel)}`}>
                  {NIVEL_RISCO_LABEL[nivel]} ({produto})
                </span>
              </div>
            </Secao>
          </>
        )}
      </div>

      <footer className="fixed bottom-0 left-0 md:left-80 right-0 bg-surface-container-lowest p-4 border-t border-outline-variant flex gap-3 z-30 pb-24 md:pb-4">
        <div className="flex gap-3 w-full max-w-3xl mx-auto md:mx-0 md:ml-md">
          <Botao type="button" variante="secundario" className="flex-1" onClick={() => navigate('/riscos')}>
            Cancelar
          </Botao>
          <Botao
            type="submit"
            icone="save"
            carregando={salvando}
            disabled={ghes.length === 0}
            className="flex-1"
          >
            {salvando ? 'Salvando...' : 'Salvar risco'}
          </Botao>
        </div>
      </footer>
    </form>
  );
}
