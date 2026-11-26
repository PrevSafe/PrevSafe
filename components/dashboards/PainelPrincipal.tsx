import React from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { Building2, Building, AlertTriangle, ClipboardCheck, Plus, Search } from 'lucide-react';
import { CartaoMetrica } from './CartaoMetrica';
import { AcessoRapido } from './AcessoRapido';
import { FUSO_PADRAO } from '@/lib/datas';

/**
 * Painel principal, no layout do prototipo "PrevSafe Shell Claro".
 *
 * A tela e centrada na empresa em uso: quem abre o sistema quer saber de
 * qual empresa esta tratando, quantas unidades ela tem e o que esta em
 * aberto -- antes de qualquer grafico.
 *
 * Os numeros vem do que existe no sistema, e cada cartao diz o que de fato
 * conta. O prototipo tinha um cartao "Inspecoes realizadas"; nao existe
 * colecao de inspecoes no modelo, entao aqui o quarto cartao conta ordens
 * de servico concluidas, com esse nome. Rotular dado de OS como inspecao
 * seria a tela afirmando o que nao e.
 */
export function PainelPrincipal({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { clients, units, pgrActionPlan, serviceOrders, activeClientId, organization, abrirLocalizarEmpresas } =
    usePrevSafe();

  const ativos = (clients || []).filter((c) => c?.status === 'ACTIVE');
  const empresa = ativos.find((c) => c.id === activeClientId) || ativos[0];

  const unidadesDaEmpresa = (units || []).filter((u) => u.client_id === empresa?.id);
  const unidadesAtivas = unidadesDaEmpresa.filter((u) => u.status === 'ACTIVE');

  // Aberto e o que ainda pede trabalho: concluida, eficacia verificada e
  // descartada ja sairam da fila.
  const planosAbertos = (pgrActionPlan || []).filter(
    (p) =>
      p.status !== 'CONCLUIDA' &&
      p.status !== 'EFICACIA_VERIFICADA' &&
      p.status !== 'DESCARTADA'
  ).length;

  const osConcluidas = (serviceOrders || []).filter((o) => o.status === 'COMPLETED').length;

  const hoje = new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO_PADRAO,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const grauDeRisco = (grau?: number) => (
    <span className="inline-grid place-items-center w-6 h-6 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
      {grau ?? '—'}
    </span>
  );

  const situacao = (ativo: boolean) => (
    <span
      className={`inline-block text-[11px] font-bold rounded-full px-2.5 py-0.5 ${
        ativo
          ? 'bg-marca-suave text-marca-escura'
          : 'bg-superficie-2 text-tinta-2 border border-borda'
      }`}
    >
      {ativo ? 'Ativa' : 'Inativa'}
    </span>
  );

  return (
    <div className="space-y-5">
      {/* Cabecalho da pagina */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.11em] text-tinta-3">
            Principal
          </div>
          <h1 className="font-titulo text-[26px] font-bold tracking-tight text-tinta mt-1">
            Painel
          </h1>
          <p className="text-[13px] text-tinta-2 mt-0.5 truncate">
            {empresa ? `${empresa.trade_name || empresa.legal_name} · ${hoje}` : hoje}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={abrirLocalizarEmpresas}
            className="px-3.5 py-2 bg-superficie hover:bg-superficie-2 text-tinta border border-borda rounded-xl text-[13px] font-semibold transition flex items-center gap-2"
          >
            <Search className="w-4 h-4 text-tinta-2" />
            Localizar empresa
          </button>
          <button
            onClick={() => onNavigate('service-orders')}
            className="bg-marca-escura hover:opacity-90 px-4 py-2 text-white rounded-xl text-[13px] font-semibold shadow-sm transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova ordem de serviço
          </button>
        </div>
      </div>

      {/* Os quatro numeros do prototipo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CartaoMetrica icone={Building2} rotulo="Empresa ativa" valor={ativos.length} />
        <CartaoMetrica
          icone={Building}
          tom="teal"
          rotulo="Unidades ativas"
          valor={unidadesAtivas.length}
          onClick={() => onNavigate('crm-clients')}
        />
        <CartaoMetrica
          icone={AlertTriangle}
          tom="ambar"
          rotulo="Planos de ação abertos"
          valor={planosAbertos}
          onClick={() => onNavigate('sst-engineering')}
        />
        <CartaoMetrica
          icone={ClipboardCheck}
          rotulo="Ordens de serviço concluídas"
          valor={osConcluidas}
          onClick={() => onNavigate('service-orders')}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_288px] items-start">
        <div className="min-w-0 space-y-4">
          {/* Empresa em uso */}
          <section className="bg-superficie border border-borda rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2.5 flex-wrap px-4 py-3 border-b border-borda">
              <h2 className="text-[11px] font-bold tracking-[0.1em] text-tinta-2 uppercase">
                Empresa em uso
              </h2>
              {empresa && organization?.principal_client_id === empresa.id && (
                <span className="text-[10px] font-bold tracking-wider rounded-full px-2.5 py-0.5 bg-marca-suave text-marca-escura">
                  ★ PRINCIPAL
                </span>
              )}
              <div className="ml-auto flex items-center gap-2 flex-wrap">
                {/* Abre a janela "Localizar empresas". Antes isto girava a
                    lista em ciclo: com cinco empresas, chegar na quarta
                    custava quatro cliques e nao dava para procurar. */}
                <button
                  onClick={abrirLocalizarEmpresas}
                  className="text-[12.5px] font-semibold text-teal-700 underline px-1 py-1.5"
                >
                  Trocar
                </button>
                <button
                  onClick={() => onNavigate('crm-clients')}
                  className="border border-borda bg-superficie hover:bg-superficie-2 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition"
                >
                  Abrir cadastro
                </button>
                <button
                  onClick={() => onNavigate('crm-clients')}
                  className="flex items-center gap-1.5 bg-marca-escura hover:opacity-90 text-white rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Unidade
                </button>
              </div>
            </div>

            {empresa ? (
              <div className="flex gap-3.5 p-4 flex-wrap">
                <span className="w-10 h-10 rounded-xl bg-petroleo text-white grid place-items-center font-titulo font-bold flex-shrink-0">
                  1
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-titulo text-base font-bold text-tinta">
                    {empresa.legal_name}
                  </div>
                  <div className="text-xs text-tinta-2 mt-0.5">
                    Matriz · {empresa.city}/{empresa.state}
                  </div>

                  <dl className="grid gap-3.5 mt-3.5 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
                    <div>
                      <dt className="text-[10px] font-bold tracking-wider text-tinta-3 uppercase">
                        {empresa.document_type || 'CNPJ'}
                      </dt>
                      <dd className="text-[13.5px] font-semibold mt-0.5 tabular-nums">
                        {empresa.document_number}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold tracking-wider text-tinta-3 uppercase">
                        CNAE principal
                      </dt>
                      <dd className="text-[13.5px] font-semibold mt-0.5">
                        {empresa.main_cnae} {empresa.cnae_description}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold tracking-wider text-tinta-3 uppercase">
                        Grau de risco
                      </dt>
                      <dd className="mt-0.5">{grauDeRisco(empresa.risk_degree)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold tracking-wider text-tinta-3 uppercase">
                        Situação
                      </dt>
                      <dd className="mt-0.5">{situacao(empresa.status === 'ACTIVE')}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            ) : (
              <p className="p-4 text-[13px] text-tinta-2">
                Nenhuma empresa ativa cadastrada. Comece pelo cadastro de clientes.
              </p>
            )}
          </section>

          {/* Unidades */}
          <section className="bg-superficie border border-borda rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-borda">
              <h2 className="text-[11px] font-bold tracking-[0.1em] text-tinta-2 uppercase">
                Unidades ({unidadesDaEmpresa.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[520px]">
                <thead>
                  <tr className="bg-superficie-2">
                    {['Cód.', 'Unidade', 'Cidade', 'GR', 'Situação'].map((c) => (
                      <th
                        key={c}
                        className="text-left text-[10px] font-bold tracking-wider text-tinta-3 uppercase px-4 py-2.5 border-b border-borda"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {unidadesDaEmpresa.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-5 text-tinta-2">
                        Esta empresa ainda não tem unidades cadastradas.
                      </td>
                    </tr>
                  )}
                  {unidadesDaEmpresa.map((u, i) => (
                    <tr key={u.id} className="hover:bg-superficie-2 border-b border-borda last:border-0">
                      <td className="px-4 py-2.5 tabular-nums text-tinta-2">{u.code || i + 1}</td>
                      <td className="px-4 py-2.5 font-bold text-tinta">{u.name}</td>
                      <td className="px-4 py-2.5">
                        {u.city}/{u.state}
                      </td>
                      <td className="px-4 py-2.5">{grauDeRisco(u.risk_degree)}</td>
                      <td className="px-4 py-2.5">{situacao(u.status === 'ACTIVE')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <AcessoRapido onNavigate={onNavigate} />
      </div>
    </div>
  );
}
