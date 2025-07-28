/**
 * FASE 2: UNIFICAÇÃO DOS MECANISMOS DE LOGOUT
 * 
 * LogoutManager - Serviço centralizado para coordenar todos os triggers de logout
 * Resolve conflitos entre múltiplos mecanismos de logout simultâneos
 */

import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/react-query';

type LogoutReason = 
  | 'user_action'        // Usuário clicou em logout
  | 'inactivity'         // Timeout por inatividade
  | 'visibility_change'  // Página ficou oculta por muito tempo
  | 'auth_error'         // Erro de autenticação
  | 'session_expired'    // Sessão expirou
  | 'force_logout';      // Logout forçado pelo sistema

interface LogoutOptions {
  reason: LogoutReason;
  redirectTo?: string;
  showNotification?: boolean;
  notificationMessage?: string;
}

class LogoutManagerClass {
  private isLoggingOut = false;
  private logoutPromise: Promise<void> | null = null;
  private logoutCallbacks: Array<() => void | Promise<void>> = [];

  /**
   * Registra um callback para ser executado durante o logout
   */
  onLogout(callback: () => void | Promise<void>) {
    this.logoutCallbacks.push(callback);
    
    // Retorna função para remover o callback
    return () => {
      const index = this.logoutCallbacks.indexOf(callback);
      if (index > -1) {
        this.logoutCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Executa logout de forma coordenada e segura
   */
  async logout(options: LogoutOptions): Promise<void> {
    // Prevenir múltiplos logouts simultâneos
    if (this.isLoggingOut) {
      console.log('🔄 Logout já em andamento, aguardando conclusão...');
      return this.logoutPromise || Promise.resolve();
    }

    this.isLoggingOut = true;
    console.log(`🚪 Iniciando logout - Motivo: ${options.reason}`);

    this.logoutPromise = this._performLogout(options);
    
    try {
      await this.logoutPromise;
    } finally {
      this.isLoggingOut = false;
      this.logoutPromise = null;
    }
  }

  /**
   * Execução interna do logout
   */
  private async _performLogout(options: LogoutOptions): Promise<void> {
    try {
      // 1. Executar callbacks registrados
      console.log('📞 Executando callbacks de logout...');
      await Promise.all(
        this.logoutCallbacks.map(async (callback) => {
          try {
            await callback();
          } catch (error) {
            console.error('❌ Erro em callback de logout:', error);
          }
        })
      );

      // 2. Limpeza imediata do localStorage
      console.log('🧹 Limpando localStorage...');
      this._clearLocalStorage();

      // 3. Limpar cache do React Query
      console.log('🗑️ Limpando cache do React Query...');
      queryClient.clear();
      queryClient.removeQueries();

      // 4. Logout do Supabase
      console.log('🔐 Fazendo logout do Supabase...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Erro no logout do Supabase:', error);
        // Mesmo com erro, continuar com o logout local
      }

      // 5. Mostrar notificação se solicitado
      if (options.showNotification && options.notificationMessage) {
        this._showLogoutNotification(options.notificationMessage, options.reason);
      }

      // 6. Redirecionamento forçado
      console.log('🔄 Redirecionando para login...');
      this._forceRedirect(options.redirectTo || '/login');

      console.log('✅ Logout concluído com sucesso');

    } catch (error) {
      console.error('❌ Erro durante logout:', error);
      
      // Em caso de erro, ainda assim limpar dados locais e redirecionar
      this._clearLocalStorage();
      queryClient.clear();
      this._forceRedirect('/login');
    }
  }

  /**
   * Limpeza completa do localStorage
   */
  private _clearLocalStorage(): void {
    try {
      // Remover dados específicos do app
      localStorage.removeItem('activeCompany');
      localStorage.removeItem('userPreferences');
      localStorage.removeItem('tableConfigs');
      
      // Remover dados do Supabase
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('✅ localStorage limpo');
    } catch (error) {
      console.error('❌ Erro ao limpar localStorage:', error);
    }
  }

  /**
   * Mostra notificação de logout
   */
  private _showLogoutNotification(message: string, reason: LogoutReason): void {
    try {
      // Usar toast se disponível
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast({
          title: 'Logout realizado',
          description: message,
          variant: reason === 'auth_error' ? 'destructive' : 'default'
        });
      } else {
        console.log(`📢 ${message}`);
      }
    } catch (error) {
      console.error('❌ Erro ao mostrar notificação:', error);
    }
  }

  /**
   * Redirecionamento forçado
   */
  private _forceRedirect(path: string): void {
    try {
      // Usar window.location para garantir redirecionamento completo
      window.location.href = path;
    } catch (error) {
      console.error('❌ Erro no redirecionamento:', error);
      // Fallback
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  }

  /**
   * Verifica se logout está em andamento
   */
  isLoggingOutNow(): boolean {
    return this.isLoggingOut;
  }

  /**
   * Logout rápido para situações de emergência
   */
  async emergencyLogout(): Promise<void> {
    console.log('🚨 LOGOUT DE EMERGÊNCIA');
    
    // Forçar reset do estado
    this.isLoggingOut = false;
    this.logoutPromise = null;
    
    // Executar logout imediato
    await this.logout({
      reason: 'force_logout',
      showNotification: true,
      notificationMessage: 'Logout de emergência executado'
    });
  }
}

// Instância singleton
export const LogoutManager = new LogoutManagerClass();

// Exportar tipos para uso em outros arquivos
export type { LogoutReason, LogoutOptions };