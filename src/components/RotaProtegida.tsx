import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function RotaProtegida({ children }: { children: ReactNode }) {
  const { session, carregando } = useAuth();
  const location = useLocation();

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <span className="material-symbols-outlined animate-spin text-primary text-[32px]">
          progress_activity
        </span>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
