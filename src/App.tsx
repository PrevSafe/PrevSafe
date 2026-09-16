import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import RotaProtegida from '@/components/RotaProtegida';
import AppLayout from '@/components/AppLayout';
import Login from '@/routes/Login';
import Unidades from '@/routes/Unidades';
import UnidadeForm from '@/routes/UnidadeForm';
import Setores from '@/routes/Setores';
import SetorForm from '@/routes/SetorForm';
import Cargos from '@/routes/Cargos';
import CargoForm from '@/routes/CargoForm';
import Estrutura from '@/routes/Estrutura';
import ListaEleicoes from '@/routes/cipa/ListaEleicoes';
import NovaEleicao from '@/routes/cipa/NovaEleicao';
import PainelEleicao from '@/routes/cipa/PainelEleicao';
import Eleitores from '@/routes/cipa/Eleitores';
import Candidatos from '@/routes/cipa/Candidatos';
import Quarentena from '@/routes/cipa/Quarentena';
import AuditoriaVotos from '@/routes/cipa/AuditoriaVotos';
import Cartaz from '@/routes/cipa/Cartaz';
import Comissao from '@/routes/cipa/Comissao';
import Apuracao from '@/routes/cipa/Apuracao';
import VotoLink from '@/routes/cipa/VotoLink';
import VotoQr from '@/routes/cipa/VotoQr';
import Acessos from '@/routes/Acessos';
import DocumentoGerador from '@/routes/DocumentoGerador';

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
          <Route path="*" element={<Navigate to="/documentos" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
