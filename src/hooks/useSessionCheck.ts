import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useSessionCheck() {
  const { signOut } = useAuth();

  useEffect(() => {
    console.log('[useSessionCheck] useEffect INÍCIO');
    // Verificar a sessão a cada 5 minutos
    const checkSession = async () => {
      try {
        console.log('[useSessionCheck] Chamando supabase.auth.getSession()...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[useSessionCheck] Resultado de getSession():', session);
        if (!session) {
          console.warn('[useSessionCheck] Sessão não encontrada. Chamando signOut().');
          await signOut();
        }
      } catch (error) {
        console.error('[useSessionCheck] ERRO DETALHADO em getSession:', error);
        console.warn('[useSessionCheck] Chamando signOut() devido a erro em getSession.');
        await signOut();
      }
    };

    // Iniciar verificação imediata e configurar intervalo
    checkSession().catch(error => {
      console.error('[useSessionCheck] ERRO DETALHADO na promise checkSession():', error);
    });
    const interval = setInterval(checkSession, 5 * 60 * 1000); // 5 minutos

    console.log('[useSessionCheck] useEffect FIM');
    return () => clearInterval(interval);
  }, [signOut]);
}
