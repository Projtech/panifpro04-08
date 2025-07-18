import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface PasswordChangeGuardProps {
  children: React.ReactNode;
}

export function PasswordChangeGuard({ children }: PasswordChangeGuardProps) {
  const { needsPasswordChange, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Só redireciona se:
    // 1. Usuário está autenticado
    // 2. Não está carregando
    // 3. Precisa trocar a senha
    // 4. Não está já na página de troca de senha
    if (
      isAuthenticated && 
      !loading && 
      needsPasswordChange && 
      location.pathname !== '/change-password'
    ) {
      console.log('[PasswordChangeGuard] Redirecionando para troca de senha obrigatória');
      navigate('/change-password', { replace: true });
    }
  }, [isAuthenticated, loading, needsPasswordChange, navigate, location.pathname]);

  // Se está carregando ou precisa trocar senha, não renderiza os filhos
  if (loading) {
    return null;
  }

  // Se precisa trocar senha e não está na página de troca, não renderiza os filhos
  if (needsPasswordChange && location.pathname !== '/change-password') {
    return null;
  }

  return <>{children}</>;
}
