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

  // Log principal de diagnóstico
  console.log(
    `[ProtectedRoute] Path: ${location.pathname}`,
    {
      loading,
      isAuthenticated,
      needsPasswordChange,
      activeCompanyId: activeCompany?.id,
      userRole: activeCompany?.role,
      isAdmin,
      adminOnly
    }
  );

  if (loading) {
    console.log('[ProtectedRoute] State: Loading');
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!isAuthenticated) {
    console.log('[ProtectedRoute] State: Not Authenticated, redirecting to /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (needsPasswordChange) {
    console.log('[ProtectedRoute] State: Needs Password Change, showing ForcePasswordChange');
    return <ForcePasswordChange onPasswordChanged={() => setNeedsPasswordChange(false)} />;
  }

  if (!activeCompany) {
    console.log('ProtectedRoute: User authenticated but no active company yet, redirecting to select-company');
    return <Navigate to="/select-company" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    console.log('[ProtectedRoute] State: AdminOnly route and user is NOT admin, redirecting to /dashboard');
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  console.log('[ProtectedRoute] State: Access Granted, rendering children');
  return <>{children}</>;
}
