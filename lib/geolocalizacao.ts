/**
 * Localizacao real do aparelho, para a vistoria de campo.
 *
 * O QUE HAVIA ANTES
 *
 * As coordenadas da vistoria eram uma constante no codigo:
 *
 *     lat: -22.2472, lng: -43.7011, precision: '± 4.2 metros (GPS Alta Precisão)'
 *
 * e o botao "atualizar GPS" sorteava um deslocamento de ate ~50 metros em volta
 * desse mesmo ponto. A precisao de "± 4.2 metros" era texto fixo. Nao existia
 * navigator.geolocation em lugar nenhum do projeto.
 *
 * Esse valor ia para o geo_location do relatorio de vistoria e para o campo de
 * observacoes do documento gerado ("Coordenadas GPS: ..."). Um relatorio de
 * vistoria com coordenada inventada nao e so um dado errado: ele afirma, num
 * documento tecnico assinado, que alguem esteve num lugar onde nao esteve.
 *
 * COMO FUNCIONA AGORA
 *
 * navigator.geolocation.getCurrentPosition, com a precisao REAL devolvida pelo
 * aparelho (coords.accuracy, em metros). Funciona em HTTPS, que e o caso.
 *
 * REGRA: sem posicao, nao ha coordenada. Permissao negada, GPS indisponivel ou
 * tempo esgotado devolvem o motivo - nunca um ponto aproximado, nunca o ultimo
 * ponto conhecido disfarcado de atual.
 *
 * SOBRE PRECISAO
 *
 * `accuracy` e o raio de 68% de confianca em metros. Num celular ao ar livre
 * costuma ficar entre 5 e 20 m; dentro de galpao, dezenas ou centenas; num
 * desktop sem GPS, o navegador estima por rede e pode passar de 1 km. Por isso
 * a precisao e sempre exibida junto da coordenada, e acima de 100 m o texto
 * avisa que a posicao e aproximada - quem le o laudo precisa saber disso.
 *
 * SOBRE FUNCIONAR OFFLINE
 *
 * O receptor GNSS do aparelho nao precisa de rede. Em campo sem sinal de dados
 * a posicao continua vindo, so demora mais para o primeiro fixo. Ja um desktop
 * sem GPS depende de rede para estimar, e offline devolve indisponivel.
 */

export type StatusLocalizacao =
  | 'NAO_OBTIDA'
  | 'OBTENDO'
  | 'OBTIDA'
  | 'PERMISSAO_NEGADA'
  | 'INDISPONIVEL'
  | 'TEMPO_ESGOTADO'
  | 'SEM_SUPORTE';

export interface Localizacao {
  latitude: number;
  longitude: number;
  /** Raio de incerteza em metros, como informado pelo aparelho. */
  precisaoMetros: number;
  /** Altitude em metros, quando o aparelho informa. */
  altitudeMetros?: number;
  /** Momento do fixo, em ISO. Vem do aparelho, nao do relogio da aplicacao. */
  obtidaEm: string;
}

export interface ResultadoLocalizacao {
  status: StatusLocalizacao;
  localizacao: Localizacao | null;
  /** Texto pronto para a tela, explicando o que aconteceu e o que fazer. */
  mensagem: string;
}

const SEM_POSICAO = (status: StatusLocalizacao, mensagem: string): ResultadoLocalizacao => ({
  status,
  localizacao: null,
  mensagem,
});

/**
 * Formata a precisao para leitura humana, e avisa quando ela e grosseira
 * demais para sustentar uma afirmacao de presenca no local.
 */
export function descreverPrecisao(metros: number): string {
  if (!Number.isFinite(metros) || metros <= 0) return 'precisão não informada pelo aparelho';
  if (metros < 1) return `± ${metros.toFixed(1)} m`;
  if (metros <= 100) return `± ${Math.round(metros)} m`;
  if (metros <= 1000) return `± ${Math.round(metros)} m (posição aproximada)`;
  return `± ${(metros / 1000).toFixed(1)} km (posição apenas aproximada, provavelmente estimada por rede)`;
}

/** Coordenada no formato usado nos documentos. */
export function formatarCoordenada(loc: Localizacao): string {
  return `${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`;
}

/**
 * Estado atual da permissao, SEM disparar o pedido ao usuario.
 *
 * Serve para a tela explicar de antemao o que vai acontecer. A Permissions API
 * nao existe em todo navegador, e nesse caso a resposta e 'desconhecida'.
 */
export async function consultarPermissaoLocalizacao(): Promise<'concedida' | 'negada' | 'a_perguntar' | 'desconhecida'> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'desconhecida';
  try {
    const p = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    if (p.state === 'granted') return 'concedida';
    if (p.state === 'denied') return 'negada';
    return 'a_perguntar';
  } catch {
    return 'desconhecida';
  }
}

export interface OpcoesLocalizacao {
  /** Tempo maximo de espera. O primeiro fixo de GPS pode levar dezenas de segundos. */
  timeoutMs?: number;
  /** Idade maxima aceita de um fixo em cache. Zero exige leitura nova. */
  idadeMaximaMs?: number;
  altaPrecisao?: boolean;
}

/**
 * Obtem a posicao atual do aparelho.
 *
 * Nunca lanca excecao: todo desfecho vira um ResultadoLocalizacao com status e
 * mensagem, para a tela poder dizer exatamente o que houve.
 */
export function obterLocalizacao(opcoes: OpcoesLocalizacao = {}): Promise<ResultadoLocalizacao> {
  const {
    // 25s: um primeiro fixo de GPS em campo aberto costuma levar de 5 a 30s.
    // Timeout curto transformaria "demorou" em "indisponivel".
    timeoutMs = 25000,
    // Exige leitura nova. Reaproveitar um fixo antigo poria no relatorio a
    // posicao de onde o aparelho estava antes, nao de onde a vistoria ocorreu.
    idadeMaximaMs = 0,
    altaPrecisao = true,
  } = opcoes;

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(
      SEM_POSICAO(
        'SEM_SUPORTE',
        'Este navegador não oferece acesso à localização. Abra a vistoria pelo aplicativo no celular.'
      )
    );
  }

  return new Promise<ResultadoLocalizacao>((resolver) => {
    let respondido = false;
    const responder = (r: ResultadoLocalizacao) => {
      if (respondido) return;
      respondido = true;
      resolver(r);
    };

    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        const c = posicao.coords;
        responder({
          status: 'OBTIDA',
          localizacao: {
            latitude: c.latitude,
            longitude: c.longitude,
            precisaoMetros: typeof c.accuracy === 'number' ? c.accuracy : NaN,
            altitudeMetros: typeof c.altitude === 'number' && Number.isFinite(c.altitude) ? c.altitude : undefined,
            obtidaEm: new Date(posicao.timestamp || Date.now()).toISOString(),
          },
          mensagem: `Localização obtida (${descreverPrecisao(c.accuracy)}).`,
        });
      },
      (erro) => {
        // Os codigos sao os do GeolocationPositionError.
        if (erro.code === 1) {
          responder(
            SEM_POSICAO(
              'PERMISSAO_NEGADA',
              'Acesso à localização negado. Autorize a localização para este site nas configurações do ' +
                'navegador e tente novamente. Sem isso o relatório sairá sem coordenadas.'
            )
          );
          return;
        }
        if (erro.code === 3) {
          responder(
            SEM_POSICAO(
              'TEMPO_ESGOTADO',
              'Não foi possível obter um sinal a tempo. Em área coberta, vá para um local aberto e tente novamente.'
            )
          );
          return;
        }
        responder(
          SEM_POSICAO(
            'INDISPONIVEL',
            'Localização indisponível no momento. Verifique se o GPS do aparelho está ligado.'
          )
        );
      },
      { enableHighAccuracy: altaPrecisao, timeout: timeoutMs, maximumAge: idadeMaximaMs }
    );
  });
}
