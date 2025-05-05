import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean; 
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) { 
  const { isAuthenticated, loading, isAdmin } = useAuth();
  const location = useLocation();

  console.log('[ProtectedRoute] Render: isAuthenticated =', isAuthenticated, '| loading =', loading);

  if (loading) {
    console.log('[ProtectedRoute] Exibindo tela de carregamento... (loading = true)');
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!isAuthenticated) {
    console.log('[ProtectedRoute] Redirecionando para login (isAuthenticated = false)');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    console.warn('[ProtectedRoute] Acesso negado: Rota requer privilégios de admin.');
    return <Navigate to="/" replace state={{ error: 'Acesso não autorizado' }} />;
  }

  console.log('[ProtectedRoute] Renderizando children protegidos!');
  return <>{children}</>;
}
