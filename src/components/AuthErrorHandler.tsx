import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Componente responsável por observar o estado `authError` do AuthContext.
 * Quando um erro é detectado (e o carregamento inicial terminou):
 * 1. Exibe uma notificação de erro.
 * 2. Aguarda um breve período.
 * 3. Realiza o logout do usuário.
 * 4. Redireciona para a página de login.
 */
export function AuthErrorHandler() {
  const { authError, signOut, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;

    // Só age se não estiver carregando e houver um erro
    if (!loading && authError) {
      console.error('[AuthErrorHandler] Erro de autenticação detectado:', authError);
      
      // Exibe a mensagem de erro para o usuário
      toast.error(authError, {
        duration: 5000, // Manter o toast um pouco mais visível
        // action: { // Opcional: Botão para deslogar imediatamente
        //   label: 'Logout Agora',
        //   onClick: async () => {
        //     if (timerId) clearTimeout(timerId);
        //     await signOut();
        //     navigate('/login', { replace: true });
        //   },
        // },
      });

      // Define um timer para deslogar e redirecionar após um tempo
      timerId = setTimeout(async () => {
        console.log('[AuthErrorHandler] Tempo esgotado. Deslogando e redirecionando...');
        try {
          await signOut();
          navigate('/login', { replace: true }); 
        } catch (signOutError) {
          console.error("[AuthErrorHandler] Erro durante o signOut:", signOutError);
          // Mesmo em caso de erro no signOut, tenta redirecionar
          navigate('/login', { replace: true });
        }
      }, 2500); // Tempo de espera em milissegundos (2.5 segundos)
    }

    // Função de limpeza para o useEffect
    return () => {
      if (timerId) {
        console.log('[AuthErrorHandler] Limpando timeout...');
        clearTimeout(timerId);
      }
    };
    
  }, [authError, loading, signOut, navigate]); // Dependências do useEffect

  // Este componente não renderiza nada visualmente
  return null;
}
