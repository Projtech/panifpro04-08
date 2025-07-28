// TEMPORARIAMENTE DESABILITADO - AutoLogout
// Todo o conteúdo foi comentado para evitar logout automático por inatividade

/*
import React, { useEffect, useState, useRef } from 'react';
import { LogoutManager } from '@/services/LogoutManager';

interface AutoLogoutProps {
  inactivityTimeout?: number; // Tempo em milissegundos
}

export const AutoLogout: React.FC<AutoLogoutProps> = ({ 
  inactivityTimeout = 30 * 60 * 1000 // 30 minutos por padrão
}) => {
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const isPageVisible = useRef<boolean>(true);
  
  useEffect(() => {
    // Função para atualizar o timestamp da última atividade
    const updateLastActivity = () => {
      setLastActivity(Date.now());
    };
    
    // Função para verificar inatividade
    const checkInactivity = () => {
      // Só verificamos inatividade se a página estiver visível
      if (isPageVisible.current) {
        const now = Date.now();
        const timeSinceLastActivity = now - lastActivity;
        
        if (timeSinceLastActivity >= inactivityTimeout) {
          console.log('Inatividade detectada, realizando logout automático...');
          LogoutManager.logout({
            reason: 'inactivity',
            showNotification: true,
            notificationMessage: 'Sessão expirada por inatividade'
          });
        }
      }
    };
    
    // Função para atualizar o estado de visibilidade da página
    const handleVisibilityChange = () => {
      isPageVisible.current = document.visibilityState === 'visible';
      
      // Se a página voltar a ficar visível, atualizamos a última atividade
      if (isPageVisible.current) {
        updateLastActivity();
      }
    };
    
    // Eventos que indicam atividade do usuário
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    // Adiciona event listeners para todos os eventos
    events.forEach(event => {
      window.addEventListener(event, updateLastActivity);
    });
    
    // Adiciona listener para mudanças de visibilidade
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Configura o intervalo para verificar inatividade a cada minuto
    const intervalId = setInterval(checkInactivity, 60000);
    
    // Atualiza a atividade quando o componente é montado
    updateLastActivity();
    
    // Limpa os event listeners e o intervalo quando o componente for desmontado
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateLastActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };  }, [lastActivity, inactivityTimeout]);
  
  // Este componente não renderiza nada visualmente
  return null;
};

export default AutoLogout;
*/

// Componente vazio temporário
export const AutoLogout: React.FC<{ inactivityTimeout?: number }> = () => {
  console.log('[AutoLogout] DESABILITADO - Não executando lógica de logout por inatividade');
  return null;
};

export default AutoLogout;
