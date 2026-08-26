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
import DocumentoGerador from '@/pages/DocumentoGerador';

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
          <Route path="/documentos" element={<Protegida><DocumentoGerador /></Protegida>} />
          {/* Rotas públicas e anônimas do eleitor — NUNCA envolver em <Protegida>. */}
          <Route path="/v/:token" element={<VotoLink />} />
          <Route path="/q/:eleicaoId" element={<VotoQr />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
