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
import AsoControle from '@/pages/AsoControle';
import AsoForm from '@/pages/AsoForm';
import Dds from '@/pages/Dds';
import DdsForm from '@/pages/DdsForm';
import Treinamentos from '@/pages/Treinamentos';
import TreinamentoForm from '@/pages/TreinamentoForm';
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
          <Route path="/aso" element={<Protegida><AsoControle /></Protegida>} />
          <Route path="/aso/novo" element={<Protegida><AsoForm /></Protegida>} />
          <Route path="/aso/:id" element={<Protegida><AsoForm /></Protegida>} />
          <Route path="/dds" element={<Protegida><Dds /></Protegida>} />
          <Route path="/dds/novo" element={<Protegida><DdsForm /></Protegida>} />
          <Route path="/dds/treinamentos" element={<Protegida><Treinamentos /></Protegida>} />
          <Route path="/dds/treinamentos/novo" element={<Protegida><TreinamentoForm /></Protegida>} />
          <Route path="/dds/treinamentos/:id" element={<Protegida><TreinamentoForm /></Protegida>} />
          <Route path="/dds/:id" element={<Protegida><DdsForm /></Protegida>} />
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
          {/* Rotas públicas e anônimas do eleitor — NUNCA envolver em <Protegida>. */}
          <Route path="/v/:token" element={<VotoLink />} />
          <Route path="/q/:eleicaoId" element={<VotoQr />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
