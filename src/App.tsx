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
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
