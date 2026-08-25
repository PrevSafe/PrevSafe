import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Secao, Campo, Seletor, Botao } from '@/components/ui/Form';
import { TIPO_EQUIPAMENTO_LABEL, type TipoEquipamentoMedicao } from '@/lib/equipamentosMedicao';

type Form = {
  tipo: TipoEquipamentoMedicao;
  identificacao: string;
  numero_serie: string;
  fabricante: string;
  data_calibracao: string;
  data_validade_calibracao: string;
  certificado_numero: string;
  ativo: 'true' | 'false';
};

const VAZIO: Form = {
  tipo: 'decibelimetro',
  identificacao: '',
  numero_serie: '',
  fabricante: '',
  data_calibracao: '',
  data_validade_calibracao: '',
  certificado_numero: '',
  ativo: 'true',
};

export default function EquipamentoMedicaoForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { empresaAtiva, can } = useAuth();
  const podeSalvar = can('equipamentos_medicao', editando ? 'editar' : 'criar');

  const [form, setForm] = useState<Form>(VAZIO);
  const [erros, setErros] = useState<Partial<Record<keyof Form, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(editando);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !empresaAtiva) {
      setCarregando(false);
      return;
    }
    daEmpresa(supabase.from('equipamentos_medicao').select('*'), empresaAtiva.empresa_id)
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) setErroGeral(error.code === 'PGRST116' ? 'Equipamento não encontrado.' : error.message);
        else if (data)
          setForm({
            tipo: (data.tipo as TipoEquipamentoMedicao) ?? 'decibelimetro',
            identificacao: data.identificacao ?? '',
            numero_serie: data.numero_serie ?? '',
            fabricante: data.fabricante ?? '',
            data_calibracao: data.data_calibracao ?? '',
            data_validade_calibracao: data.data_validade_calibracao ?? '',
            certificado_numero: data.certificado_numero ?? '',
            ativo: data.ativo ? 'true' : 'false',
          });
        setCarregando(false);
      });
  }, [id, empresaAtiva]);

  function set<K extends keyof Form>(campo: K, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  function validar() {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!form.identificacao.trim())
      e.identificacao = 'Informe a identificação do equipamento.';
    if (
      form.data_calibracao &&
      form.data_validade_calibracao &&
      form.data_validade_calibracao < form.data_calibracao
    ) {
      e.data_validade_calibracao = 'A validade da calibração não pode ser anterior à data da calibração.';
    }
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setErroGeral(null);
    if (!podeSalvar || !validar() || !empresaAtiva) return;
    setSalvando(true);

    const payload = {
      empresa_id: empresaAtiva.empresa_id,
      tipo: form.tipo,
      identificacao: form.identificacao.trim(),
      numero_serie: form.numero_serie.trim() || null,
      fabricante: form.fabricante.trim() || null,
      data_calibracao: form.data_calibracao || null,
      data_validade_calibracao: form.data_validade_calibracao || null,
      certificado_numero: form.certificado_numero.trim() || null,
      ativo: form.ativo === 'true',
    };

    const { error } = editando
      ? await supabase.from('equipamentos_medicao').update(payload).eq('id', id!)
      : await supabase.from('equipamentos_medicao').insert(payload);

    setSalvando(false);

    if (error) {
      setErroGeral(error.message);
      return;
    }
    navigate('/equipamentos-medicao', { replace: true });
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
          onClick={() => navigate('/equipamentos-medicao')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar equipamento de medição' : 'Novo equipamento de medição'}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erroGeral}
          </div>
        )}

        <Secao icone="sensors" titulo="Dados do Equipamento">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Seletor
              rotulo="Tipo"
              name="tipo"
              value={form.tipo}
              onChange={(e) => set('tipo', e.target.value)}
            >
              <option value="decibelimetro">{TIPO_EQUIPAMENTO_LABEL.decibelimetro}</option>
              <option value="dosimetro">{TIPO_EQUIPAMENTO_LABEL.dosimetro}</option>
              <option value="termometro">{TIPO_EQUIPAMENTO_LABEL.termometro}</option>
              <option value="luximetro">{TIPO_EQUIPAMENTO_LABEL.luximetro}</option>
              <option value="outro">{TIPO_EQUIPAMENTO_LABEL.outro}</option>
            </Seletor>
            <Campo
              rotulo="Identificação"
              name="identificacao"
              placeholder="Ex.: Decibelímetro Instrutherm ITDEC-4000"
              value={form.identificacao}
              onChange={(e) => set('identificacao', e.target.value)}
              erro={erros.identificacao}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo
              rotulo="Número de série (opcional)"
              name="numero_serie"
              placeholder="Ex.: SN-2024-00123"
              value={form.numero_serie}
              onChange={(e) => set('numero_serie', e.target.value)}
              erro={erros.numero_serie}
            />
            <Campo
              rotulo="Fabricante (opcional)"
              name="fabricante"
              placeholder="Ex.: Instrutherm"
              value={form.fabricante}
              onChange={(e) => set('fabricante', e.target.value)}
              erro={erros.fabricante}
            />
          </div>
        </Secao>

        <Secao icone="fact_check" titulo="Calibração e Certificado">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo
              rotulo="Data da calibração (opcional)"
              name="data_calibracao"
              type="date"
              value={form.data_calibracao}
              onChange={(e) => set('data_calibracao', e.target.value)}
              erro={erros.data_calibracao}
            />
            <Campo
              rotulo="Validade da calibração (opcional)"
              name="data_validade_calibracao"
              type="date"
              value={form.data_validade_calibracao}
              onChange={(e) => set('data_validade_calibracao', e.target.value)}
              erro={erros.data_validade_calibracao}
              dica="Usada para destacar equipamentos com calibração vencendo ou vencida na listagem."
            />
          </div>
          <Campo
            rotulo="Número do certificado (opcional)"
            name="certificado_numero"
            placeholder="Ex.: CERT-2024-000456"
            value={form.certificado_numero}
            onChange={(e) => set('certificado_numero', e.target.value)}
            erro={erros.certificado_numero}
          />
        </Secao>

        {editando && (
          <Secao icone="toggle_on" titulo="Situação">
            <Seletor
              rotulo="Status"
              name="ativo"
              value={form.ativo}
              onChange={(e) => set('ativo', e.target.value)}
              dica="Equipamentos inativos deixam de aparecer na seleção ao registrar medições no inventário de riscos."
            >
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </Seletor>
          </Secao>
        )}
      </div>

      <footer className="flex gap-3 px-margin-mobile md:px-md py-4 mt-2 max-w-3xl w-full border-t border-outline-variant">
        <Botao
          type="button"
          variante="secundario"
          className="flex-1"
          onClick={() => navigate('/equipamentos-medicao')}
        >
          {editando ? 'Voltar' : 'Cancelar'}
        </Botao>
        {podeSalvar && (
          <Botao type="submit" icone="save" carregando={salvando} className="flex-1">
            {salvando ? 'Salvando...' : 'Salvar equipamento'}
          </Botao>
        )}
      </footer>
    </form>
  );
}
