import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/ui/Modal';

type Item = { rotulo: string; icone: string; para: string };
type Grupo = { titulo: string; itens: Item[] };

// Estrutura tirada da tela "menu_lateral_prevsafe" do protótipo.
// Rotas ainda não construídas apontam para '#'.
const GRUPOS: Grupo[] = [
  {
    titulo: 'Gestão PGR / PCMSO',
    itens: [
      { rotulo: 'Emitir Documentos (PGR/LTCAT/PCMSO)', icone: 'description', para: '/documentos' },
    ],
  },
  {
    titulo: 'Cadastros Base',
    itens: [
      { rotulo: 'Unidades', icone: 'apartment', para: '/unidades' },
      { rotulo: 'Setores', icone: 'account_tree', para: '/setores' },
      { rotulo: 'Cargos', icone: 'badge', para: '/cargos' },
      { rotulo: 'Estrutura Organizacional', icone: 'lan', para: '/estrutura' },
    ],
  },
];

const NAV_MOBILE: Item[] = [
  { rotulo: 'Início', icone: 'fact_check', para: '/documentos' },
  { rotulo: 'Relatórios', icone: 'analytics', para: '#' },
  { rotulo: 'Agenda', icone: 'calendar_today', para: '#' },
  { rotulo: 'Perfil', icone: 'settings', para: '#' },
];

function LinkNav({ item, onNavigate }: { item: Item; onNavigate?: () => void }) {
  const inativo = item.para === '#';
  const base =
    'flex items-center gap-3 px-4 py-2.5 rounded-full mr-2 transition-colors text-label-md';

  if (inativo) {
    return (
      <span
        className={`${base} text-outline cursor-not-allowed`}
        title="Tela ainda não construída"
      >
        <span className="material-symbols-outlined">{item.icone}</span>
        {item.rotulo}
      </span>
    );
  }

  return (
    <NavLink
      to={item.para}
      onClick={onNavigate}
      className={({ isActive }) =>
        `${base} ${
          isActive
            ? 'bg-primary-container text-on-primary-container font-bold'
            : 'text-on-surface-variant hover:bg-surface-container-highest'
        }`
      }
    >
      <span className="material-symbols-outlined">{item.icone}</span>
      {item.rotulo}
    </NavLink>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { perfil, vinculos, empresaAtiva, trocarEmpresa, sair, can } = useAuth();
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  // No desktop o menu fica visível por padrão; oculta ao selecionar um item
  // (fecharMenus) e volta com o botão flutuante que aparece no lugar dele.
  const [sidebarDesktopAberta, setSidebarDesktopAberta] = useState(true);
  const [seletorEmpresaAberto, setSeletorEmpresaAberto] = useState(false);
  const [temCipa, setTemCipa] = useState(false);

  useEffect(() => {
    if (!empresaAtiva) { setTemCipa(false); return; }
    let ativo = true;
    supabase
      .rpc('modulos_da_empresa', { p_empresa_id: empresaAtiva.empresa_id })
      .then(({ data }: { data: { codigo: string }[] | null }) => {
        if (ativo) setTemCipa(!!data?.some((m) => m.codigo === 'CIPA'));
      });
    return () => { ativo = false; };
  }, [empresaAtiva]);

  let grupos = temCipa
    ? [...GRUPOS, { titulo: 'Módulos', itens: [{ rotulo: 'CIPA', icone: 'how_to_vote', para: '/cipa' }] }]
    : GRUPOS;

  if (can('acessos', 'visualizar')) {
    grupos = [
      ...grupos,
      {
        titulo: 'Administração',
        itens: [{ rotulo: 'Controle de Acessos', icone: 'admin_panel_settings', para: '/acessos' }],
      },
    ];
  }

  const iniciais = (perfil?.nome ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  async function handleSair() {
    await sair();
    navigate('/login', { replace: true });
  }

  /** Fecha o drawer mobile e oculta a coluna fixa do desktop — chamado sempre que o usuário escolhe um destino. */
  function fecharMenus() {
    setMenuAberto(false);
    setSidebarDesktopAberta(false);
  }

  function handleTrocarEmpresa(empresaId: string) {
    trocarEmpresa(empresaId);
    setSeletorEmpresaAberto(false);
    fecharMenus();
    navigate('/documentos');
  }

  const nomeEmpresaAtiva = empresaAtiva
    ? empresaAtiva.empresa.nome_fantasia || empresaAtiva.empresa.razao_social
    : null;

  const blocoEmpresa = empresaAtiva && (
    <div className="mb-6">
      {vinculos.length > 1 ? (
        <button
          type="button"
          onClick={() => setSeletorEmpresaAberto(true)}
          className="flex items-center justify-between gap-2 px-3 py-2 w-full rounded-lg border border-outline-variant/40 hover:bg-surface-container-highest transition-colors text-left"
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-primary-container text-[18px] shrink-0">
              apartment
            </span>
            <span className="text-label-md text-on-surface truncate">{nomeEmpresaAtiva}</span>
          </span>
          <span className="material-symbols-outlined text-outline text-[18px] shrink-0">
            unfold_more
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 text-label-md text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] shrink-0">apartment</span>
          <span className="truncate">{nomeEmpresaAtiva}</span>
        </div>
      )}
    </div>
  );

  const conteudoMenu = (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">
          {perfil?.avatar_url ? (
            <img src={perfil.avatar_url} alt="" className="h-full w-full object-cover rounded-full" />
          ) : (
            <span className="text-label-md font-bold">{iniciais}</span>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-title-lg text-primary truncate">{perfil?.nome}</span>
          <span className="text-label-sm text-on-surface-variant">{empresaAtiva?.perfil_nome}</span>
        </div>
      </div>

      {blocoEmpresa}

      <nav className="flex-1 overflow-y-auto space-y-6 pb-4">
        {grupos.map((grupo) => (
          <div key={grupo.titulo} className="space-y-1">
            <h3 className="px-4 text-label-sm text-outline uppercase tracking-wider mb-2">
              {grupo.titulo}
            </h3>
            {grupo.itens.map((item) => (
              <LinkNav key={item.rotulo} item={item} onNavigate={fecharMenus} />
            ))}
          </div>
        ))}
      </nav>

      <button
        onClick={handleSair}
        className="flex items-center gap-3 px-4 py-2.5 rounded-full text-label-md text-error hover:bg-error-container transition-colors mt-2"
      >
        <span className="material-symbols-outlined">logout</span>
        Sair do sistema
      </button>
    </>
  );

  return (
    <div className="bg-surface-container-low text-on-surface antialiased min-h-screen flex flex-col md:flex-row pb-24 md:pb-0">
      {/* Sidebar desktop — some após o usuário escolher um item; o botão flutuante abaixo a traz de volta. */}
      {sidebarDesktopAberta && (
        <aside className="layout-sidebar hidden md:flex flex-col w-80 h-screen sticky top-0 bg-surface-container-lowest border-r border-surface-container-high p-md">
          {conteudoMenu}
        </aside>
      )}

      {!sidebarDesktopAberta && (
        <button
          type="button"
          onClick={() => setSidebarDesktopAberta(true)}
          aria-label="Abrir menu"
          className="hidden md:flex fixed top-4 left-4 z-30 h-11 w-11 items-center justify-center rounded-full bg-surface-container-lowest border border-surface-container-high shadow-md text-on-surface-variant hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      )}

      {/* Drawer mobile */}
      {menuAberto && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-inverse-surface/40 z-40"
            onClick={() => setMenuAberto(false)}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 w-[88%] max-w-[320px] bg-surface-container-lowest z-50 flex flex-col p-md shadow-lg">
            {conteudoMenu}
          </aside>
        </>
      )}

      <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto min-w-0">
        {/* Top bar mobile */}
        <header className="layout-header-mobile md:hidden sticky top-0 z-30 bg-surface flex items-center justify-between px-margin-mobile h-14 border-b border-surface-container-high">
          <button
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
            className="text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="text-headline-md text-primary font-bold">PrevSafe</h1>
          <span className="w-10" />
        </header>

        {children}
      </div>

      {/* Bottom nav mobile */}
      <nav className="layout-bottom-nav md:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-xs py-xs bg-surface border-t border-surface-container-high">
        {NAV_MOBILE.slice(0, 2).map((i) => (
          <ItemBottom key={i.rotulo} item={i} />
        ))}

        <div className="relative -top-6">
          <button
            disabled
            title="Tela ainda não construída"
            className="bg-success text-white h-14 w-14 rounded-full flex items-center justify-center shadow-lg border-4 border-surface disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-3xl">add</span>
          </button>
        </div>

        {NAV_MOBILE.slice(2).map((i) => (
          <ItemBottom key={i.rotulo} item={i} />
        ))}
      </nav>

      <Modal
        aberto={seletorEmpresaAberto}
        titulo="Trocar de empresa"
        onFechar={() => setSeletorEmpresaAberto(false)}
      >
        <div className="flex flex-col gap-1">
          {vinculos.map((v) => (
            <button
              key={v.empresa_id}
              type="button"
              onClick={() => handleTrocarEmpresa(v.empresa_id)}
              className={`text-left px-3 py-2.5 rounded-lg hover:bg-surface-container-high transition-colors flex items-center justify-between gap-2 ${
                v.empresa_id === empresaAtiva?.empresa_id ? 'bg-primary-container/10' : ''
              }`}
            >
              <span className="text-body-md text-on-surface truncate">
                {v.empresa.nome_fantasia || v.empresa.razao_social}
              </span>
              {v.empresa_id === empresaAtiva?.empresa_id && (
                <span className="material-symbols-outlined text-primary-container text-[18px] shrink-0">
                  check
                </span>
              )}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function ItemBottom({ item }: { item: Item }) {
  if (item.para === '#') {
    return (
      <span className="flex flex-col items-center justify-center px-3 py-1 text-outline">
        <span className="material-symbols-outlined">{item.icone}</span>
        <span className="text-[10px] mt-1">{item.rotulo}</span>
      </span>
    );
  }
  return (
    <NavLink
      to={item.para}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center px-3 py-1 rounded-xl transition-all active:scale-95 ${
          isActive ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'
        }`
      }
    >
      <span className="material-symbols-outlined">{item.icone}</span>
      <span className="text-[10px] mt-1">{item.rotulo}</span>
    </NavLink>
  );
}