import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionCheck } from '@/hooks/useSessionCheck';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  useSessionCheck();

  console.log('[ProtectedRoute] Render: isAuthenticated =', isAuthenticated, '| loading =', loading);

  if (loading) {
    console.log('[ProtectedRoute] Exibindo tela de carregamento... (loading = true)');
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!isAuthenticated) {
    console.log('[ProtectedRoute] Redirecionando para login (isAuthenticated = false)');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('[ProtectedRoute] Renderizando children protegidos!');
  return <>{children}</>;
}
