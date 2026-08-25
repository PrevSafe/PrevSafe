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
import TreinamentosObrigatorios from '@/pages/TreinamentosObrigatorios';
import TreinamentoObrigatorioForm from '@/pages/TreinamentoObrigatorioForm';
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
import Afastamentos from '@/pages/Afastamentos';
import AfastamentoForm from '@/pages/AfastamentoForm';
import CatForm from '@/pages/CatForm';
import DocumentoGerador from '@/pages/DocumentoGerador';
import Credenciados from '@/pages/Credenciados';
import CredenciadosForm from '@/pages/CredenciadosForm';
import EquipamentosMedicao from '@/pages/EquipamentosMedicao';
import EquipamentoMedicaoForm from '@/pages/EquipamentoMedicaoForm';
import AgendaMedica from '@/pages/AgendaMedica';
import AgendaMedicaForm from '@/pages/AgendaMedicaForm';
import PlanosFaturamento from '@/pages/PlanosFaturamento';
import PlanoFaturamentoForm from '@/pages/PlanoFaturamentoForm';
import Faturas from '@/pages/Faturas';
import FaturaForm from '@/pages/FaturaForm';
import RepassesClinicas from '@/pages/RepassesClinicas';
import RelatorioAnual from '@/pages/RelatorioAnual';
import OrdensServico from '@/pages/OrdensServico';
import OrdemServicoForm from '@/pages/OrdemServicoForm';
import OrdemServicoDetalhe from '@/pages/OrdemServicoDetalhe';

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
          <Route path="/agenda-medica" element={<Protegida><AgendaMedica /></Protegida>} />
          <Route path="/agenda-medica/novo" element={<Protegida><AgendaMedicaForm /></Protegida>} />
          <Route path="/agenda-medica/:id" element={<Protegida><AgendaMedicaForm /></Protegida>} />
          <Route path="/afastamentos" element={<Protegida><Afastamentos /></Protegida>} />
          <Route path="/afastamentos/novo" element={<Protegida><AfastamentoForm /></Protegida>} />
          <Route path="/afastamentos/:id" element={<Protegida><AfastamentoForm /></Protegida>} />
          <Route path="/afastamentos/:afastamentoId/cat" element={<Protegida><CatForm /></Protegida>} />
          <Route path="/dds" element={<Protegida><Dds /></Protegida>} />
          <Route path="/dds/novo" element={<Protegida><DdsForm /></Protegida>} />
          <Route path="/dds/treinamentos" element={<Protegida><Treinamentos /></Protegida>} />
          <Route path="/dds/treinamentos/novo" element={<Protegida><TreinamentoForm /></Protegida>} />
          <Route path="/dds/treinamentos/:id" element={<Protegida><TreinamentoForm /></Protegida>} />
          <Route path="/dds/:id" element={<Protegida><DdsForm /></Protegida>} />
          <Route path="/treinamentos-obrigatorios" element={<Protegida><TreinamentosObrigatorios /></Protegida>} />
          <Route path="/treinamentos-obrigatorios/novo" element={<Protegida><TreinamentoObrigatorioForm /></Protegida>} />
          <Route path="/treinamentos-obrigatorios/:id" element={<Protegida><TreinamentoObrigatorioForm /></Protegida>} />
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
          <Route path="/equipamentos-medicao" element={<Protegida><EquipamentosMedicao /></Protegida>} />
          <Route path="/equipamentos-medicao/novo" element={<Protegida><EquipamentoMedicaoForm /></Protegida>} />
          <Route path="/equipamentos-medicao/:id" element={<Protegida><EquipamentoMedicaoForm /></Protegida>} />
          <Route path="/documentos" element={<Protegida><DocumentoGerador /></Protegida>} />
          <Route path="/relatorio-anual" element={<Protegida><RelatorioAnual /></Protegida>} />
          <Route path="/frota" element={<Protegida><Frota /></Protegida>} />
          <Route path="/frota/novo" element={<Protegida><FrotaForm /></Protegida>} />
          <Route path="/frota/:id" element={<Protegida><FrotaForm /></Protegida>} />
          <Route path="/credenciados" element={<Protegida><Credenciados /></Protegida>} />
          <Route path="/credenciados/novo" element={<Protegida><CredenciadosForm /></Protegida>} />
          <Route path="/credenciados/:id" element={<Protegida><CredenciadosForm /></Protegida>} />
          <Route path="/financeiro/planos" element={<Protegida><PlanosFaturamento /></Protegida>} />
          <Route path="/financeiro/planos/novo" element={<Protegida><PlanoFaturamentoForm /></Protegida>} />
          <Route path="/financeiro/planos/:id" element={<Protegida><PlanoFaturamentoForm /></Protegida>} />
          <Route path="/financeiro/faturas" element={<Protegida><Faturas /></Protegida>} />
          <Route path="/financeiro/faturas/novo" element={<Protegida><FaturaForm /></Protegida>} />
          <Route path="/financeiro/faturas/:id" element={<Protegida><FaturaForm /></Protegida>} />
          <Route path="/financeiro/repasses" element={<Protegida><RepassesClinicas /></Protegida>} />
          <Route path="/ordens-servico" element={<Protegida><OrdensServico /></Protegida>} />
          <Route path="/ordens-servico/nova" element={<Protegida><OrdemServicoForm /></Protegida>} />
          <Route path="/ordens-servico/:id" element={<Protegida><OrdemServicoDetalhe /></Protegida>} />
          <Route path="/ordens-servico/:id/editar" element={<Protegida><OrdemServicoForm /></Protegida>} />
          {/* Rotas públicas e anônimas do eleitor — NUNCA envolver em <Protegida>. */}
          <Route path="/v/:token" element={<VotoLink />} />
          <Route path="/q/:eleicaoId" element={<VotoQr />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
