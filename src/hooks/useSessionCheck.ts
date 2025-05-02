import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useSessionCheck() {
  const { signOut } = useAuth();

  useEffect(() => {
    // Verificar a sessão a cada 5 minutos
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.warn('Sessão expirada. Deslogando usuário.');
          await signOut();
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        await signOut();
      }
    };

    // Iniciar verificação imediata e configurar intervalo
    checkSession();
    const interval = setInterval(checkSession, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [signOut]);
}
