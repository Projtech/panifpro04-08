import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ForcePasswordChange } from '@/components/ForcePasswordChange';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { isAuthenticated, loading, activeCompany, isAdmin, needsPasswordChange, setNeedsPasswordChange } = useAuth();
  const location = useLocation();

  if (loading) {
    // Exibir indicador de carregamento enquanto verifica autenticação
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!isAuthenticated) {
    // Redirecionar para login se não estiver autenticado
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (needsPasswordChange) {
    // Se o usuário precisa trocar a senha, mostrar tela de troca de senha
    return <ForcePasswordChange onPasswordChanged={() => setNeedsPasswordChange(false)} />;
  }


  if (adminOnly && !isAdmin) {
    // Redirecionar para dashboard se não for admin e a rota for admin-only
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
