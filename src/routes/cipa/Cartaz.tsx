import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { supabaseServidor } from '@/lib/cipa/supabase';
import { BotaoImprimir } from '@/components/cipa/BotaoImprimir';
import { CabecalhoEleicao } from '@/components/cipa/CabecalhoEleicao';

type Eleicao = {
  titulo: string;
  norma: string;
  gestao: string | null;
  data_inicio: string;
  data_fim: string;
  unidades: { razao_social: string; nome_fantasia: string | null } | null;
};

/** Cartaz A4 para o mural: quem não tem e-mail nem telefone entra por aqui. */
export default function Cartaz() {
  const { id } = useParams<{ id: string }>();
  const [eleicao, setEleicao] = useState<Eleicao | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!id) return;
    let ativo = true;
    (async () => {
      const supabase = await supabaseServidor();
      const { data } = await supabase
        .from('eleicoes')
        .select('titulo, norma, gestao, data_inicio, data_fim, unidades(razao_social, nome_fantasia)')
        .eq('id', id).single();
      if (!ativo) return;

      const base = import.meta.env.VITE_APP_URL ?? '';
      const link = `${base}/q/${id}`;
      const dataUrl = await QRCode.toDataURL(link, { width: 900, margin: 1, errorCorrectionLevel: 'H' });
      if (!ativo) return;

      setEleicao(data as unknown as Eleicao | null);
      setUrl(link);
      setQr(dataUrl);
      setCarregando(false);
    })();
    return () => { ativo = false; };
  }, [id]);

  if (carregando) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <span className="material-symbols-outlined animate-spin text-primary text-[32px]">
          progress_activity
        </span>
      </div>
    );
  }

  const u = eleicao?.unidades;

  return (
    <div className="px-margin-mobile md:px-md py-6">
      <div className="nao-imprimir">
        <CabecalhoEleicao eleicaoId={id!} titulo="Cartaz do mural" />
      </div>
      <p className="nao-imprimir mt-6 text-label-sm uppercase tracking-wider text-outline">Mural</p>
      <div className="nao-imprimir mt-2 flex flex-wrap items-center gap-4">
        <h1 className="text-headline-lg font-extrabold text-on-surface">Cartaz para impressão</h1>
        <BotaoImprimir />
      </div>
      <p className="nao-imprimir mt-2 max-w-2xl text-on-surface-variant">
        Imprima e afixe no refeitório, no ponto e no vestiário. Quem votar por aqui cai na fila
        de conferência.
      </p>

      <div className="cartaz-mural mx-auto mt-8 max-w-[210mm] rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-12 text-center shadow-sm">
        <p className="text-label-sm uppercase tracking-wider text-outline">{u?.nome_fantasia || u?.razao_social || ''}</p>
        <h2 className="mt-4 text-5xl font-extrabold leading-[0.95] text-on-surface">
          Vote na sua<br />{eleicao?.norma === 'NR-31' ? 'CIPATR' : 'CIPA'}
        </h2>
        <p className="mt-4 text-xl text-on-surface-variant">
          {eleicao?.titulo} · gestão {eleicao?.gestao ?? '—'}
        </p>

        {qr && <img src={qr} alt={`QR Code para votar: ${url}`} className="mx-auto mt-10 h-72 w-72" />}

        <p className="mt-8 text-2xl font-bold text-on-surface">Aponte a câmera do celular</p>
        <p className="mt-2 text-xl text-on-surface-variant">
          Leva menos de um minuto. Você informa seu CPF só para provar que votou —
          seu voto continua secreto.
        </p>

        <p className="mt-10 font-mono text-label-sm text-outline">{url}</p>
        <p className="mt-2 text-label-sm text-outline">
          Votação de {eleicao && new Date(eleicao.data_inicio).toLocaleDateString('pt-BR')} a{' '}
          {eleicao && new Date(eleicao.data_fim).toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  );
}
