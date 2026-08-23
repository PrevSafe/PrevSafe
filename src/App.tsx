import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import RotaProtegida from '@/components/RotaProtegida';
import AppLayout from '@/components/AppLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Unidades from '@/pages/Unidades';
import UnidadeForm from '@/pages/UnidadeForm';
import Setores from '@/pages/Setores';
import SetorForm from '@/pages/SetorForm';
import Cargos from '@/pages/Cargos';
import CargoForm from '@/pages/CargoForm';
import Estrutura from '@/pages/Estrutura';
import Funcionarios from '@/pages/Funcionarios';
import FuncionarioForm from '@/pages/FuncionarioForm';
import EpiEntregas from '@/pages/EpiEntregas';
import EpiEntregaForm from '@/pages/EpiEntregaForm';
import EpiCatalogo from '@/pages/EpiCatalogo';
import EpiCatalogoForm from '@/pages/EpiCatalogoForm';
import ListaEleicoes from '@/pages/cipa/ListaEleicoes';
import NovaEleicao from '@/pages/cipa/NovaEleicao';
import PainelEleicao from '@/pages/cipa/PainelEleicao';
import Eleitores from '@/pages/cipa/Eleitores';
import Candidatos from '@/pages/cipa/Candidatos';
import Quarentena from '@/pages/cipa/Quarentena';
import AuditoriaVotos from '@/pages/cipa/AuditoriaVotos';
import Cartaz from '@/pages/cipa/Cartaz';
import Comissao from '@/pages/cipa/Comissao';
import Apuracao from '@/pages/cipa/Apuracao';
import VotoLink from '@/pages/cipa/VotoLink';
import VotoQr from '@/pages/cipa/VotoQr';
import Acessos from '@/pages/Acessos';
import AsoLista from '@/pages/AsoLista';
import AsoForm from '@/pages/AsoForm';
import Treinamentos from '@/pages/Treinamentos';
import TreinamentoForm from '@/pages/TreinamentoForm';
import Inspecoes from '@/pages/Inspecoes';
import InspecaoForm from '@/pages/InspecaoForm';
import PlanosAcao from '@/pages/PlanosAcao';
import PlanoAcaoForm from '@/pages/PlanoAcaoForm';
import Ghes from '@/pages/Ghes';
import GheForm from '@/pages/GheForm';
import RiscosInventario from '@/pages/RiscosInventario';
import RiscoForm from '@/pages/RiscoForm';
import MatrizRiscos from '@/pages/MatrizRiscos';
import Frota from '@/pages/Frota';
import FrotaForm from '@/pages/FrotaForm';

/** Envolve a tela no layout autenticado. Evita repetir o aninhamento em cada rota. */
function Protegida({ children }: { children: React.ReactNode }) {
  return (
    <RotaProtegida>
      <AppLayout>{children}</AppLayout>
    </RotaProtegida>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Protegida><Dashboard /></Protegida>} />
          <Route path="/unidades" element={<Protegida><Unidades /></Protegida>} />
          <Route path="/unidades/nova" element={<Protegida><UnidadeForm /></Protegida>} />
          <Route path="/unidades/:id" element={<Protegida><UnidadeForm /></Protegida>} />
          <Route path="/setores" element={<Protegida><Setores /></Protegida>} />
          <Route path="/setores/novo" element={<Protegida><SetorForm /></Protegida>} />
          <Route path="/setores/:id" element={<Protegida><SetorForm /></Protegida>} />
          <Route path="/cargos" element={<Protegida><Cargos /></Protegida>} />
          <Route path="/cargos/novo" element={<Protegida><CargoForm /></Protegida>} />
          <Route path="/cargos/:id" element={<Protegida><CargoForm /></Protegida>} />
          <Route path="/estrutura" element={<Protegida><Estrutura /></Protegida>} />
          <Route path="/funcionarios" element={<Protegida><Funcionarios /></Protegida>} />
          <Route path="/funcionarios/novo" element={<Protegida><FuncionarioForm /></Protegida>} />
          <Route path="/funcionarios/:id" element={<Protegida><FuncionarioForm /></Protegida>} />
          <Route path="/epi" element={<Protegida><EpiEntregas /></Protegida>} />
          <Route path="/epi/nova" element={<Protegida><EpiEntregaForm /></Protegida>} />
          <Route path="/epi/catalogo" element={<Protegida><EpiCatalogo /></Protegida>} />
          <Route path="/epi/catalogo/novo" element={<Protegida><EpiCatalogoForm /></Protegida>} />
          <Route path="/epi/catalogo/:id" element={<Protegida><EpiCatalogoForm /></Protegida>} />
          <Route path="/epi/:id" element={<Protegida><EpiEntregaForm /></Protegida>} />
          <Route path="/cipa" element={<Protegida><ListaEleicoes /></Protegida>} />
          <Route path="/cipa/nova" element={<Protegida><NovaEleicao /></Protegida>} />
          <Route path="/cipa/:id" element={<Protegida><PainelEleicao /></Protegida>} />
          <Route path="/cipa/:id/eleitores" element={<Protegida><Eleitores /></Protegida>} />
          <Route path="/cipa/:id/candidatos" element={<Protegida><Candidatos /></Protegida>} />
          <Route path="/cipa/:id/quarentena" element={<Protegida><Quarentena /></Protegida>} />
          <Route path="/cipa/:id/auditoria" element={<Protegida><AuditoriaVotos /></Protegida>} />
          <Route path="/cipa/:id/cartaz" element={<Protegida><Cartaz /></Protegida>} />
          <Route path="/cipa/:id/comissao" element={<Protegida><Comissao /></Protegida>} />
          <Route path="/cipa/:id/apuracao" element={<Protegida><Apuracao /></Protegida>} />
          <Route path="/acessos" element={<Protegida><Acessos /></Protegida>} />
          <Route path="/aso" element={<Protegida><AsoLista /></Protegida>} />
          <Route path="/aso/novo" element={<Protegida><AsoForm /></Protegida>} />
          <Route path="/aso/:id" element={<Protegida><AsoForm /></Protegida>} />
          <Route path="/treinamentos" element={<Protegida><Treinamentos /></Protegida>} />
          <Route path="/treinamentos/novo" element={<Protegida><TreinamentoForm /></Protegida>} />
          <Route path="/treinamentos/:id" element={<Protegida><TreinamentoForm /></Protegida>} />
          <Route path="/inspecoes" element={<Protegida><Inspecoes /></Protegida>} />
          <Route path="/inspecoes/nova" element={<Protegida><InspecaoForm /></Protegida>} />
          <Route path="/inspecoes/:id" element={<Protegida><InspecaoForm /></Protegida>} />
          <Route path="/planos-acao" element={<Protegida><PlanosAcao /></Protegida>} />
          <Route path="/planos-acao/novo" element={<Protegida><PlanoAcaoForm /></Protegida>} />
          <Route path="/planos-acao/:id" element={<Protegida><PlanoAcaoForm /></Protegida>} />
          <Route path="/ghe" element={<Protegida><Ghes /></Protegida>} />
          <Route path="/ghe/novo" element={<Protegida><GheForm /></Protegida>} />
          <Route path="/ghe/:id" element={<Protegida><GheForm /></Protegida>} />
          <Route path="/riscos" element={<Protegida><RiscosInventario /></Protegida>} />
          <Route path="/riscos/novo" element={<Protegida><RiscoForm /></Protegida>} />
          <Route path="/riscos/:id" element={<Protegida><RiscoForm /></Protegida>} />
          <Route path="/matriz-riscos" element={<Protegida><MatrizRiscos /></Protegida>} />
          <Route path="/frota" element={<Protegida><Frota /></Protegida>} />
          <Route path="/frota/novo" element={<Protegida><FrotaForm /></Protegida>} />
          <Route path="/frota/:id" element={<Protegida><FrotaForm /></Protegida>} />
          {/* Rotas públicas e anônimas do eleitor — NUNCA envolver em <Protegida>. */}
          <Route path="/v/:token" element={<VotoLink />} />
          <Route path="/q/:eleicaoId" element={<VotoQr />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
