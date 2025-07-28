/**
 * MONITOR DE SESSÃO - Sistema para detectar e prevenir logout automático
 * 
 * Este utilitário monitora a sessão do usuário e detecta possíveis causas
 * de logout automático, fornecendo logs detalhados para debug.
 */

import { supabase } from '@/integrations/supabase/client';

class SessionMonitor {
  private static instance: SessionMonitor;
  private isMonitoring = false;
  private sessionCheckInterval: NodeJS.Timeout | null = null;
  private lastSessionCheck: Date | null = null;
  private sessionLogs: Array<{
    timestamp: Date;
    event: string;
    sessionValid: boolean;
    userId?: string;
    details?: any;
  }> = [];

  static getInstance(): SessionMonitor {
    if (!SessionMonitor.instance) {
      SessionMonitor.instance = new SessionMonitor();
    }
    return SessionMonitor.instance;
  }

  /**
   * Inicia o monitoramento da sessão
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.log('🔍 SessionMonitor já está ativo');
      return;
    }

    this.isMonitoring = true;
    console.log('🔍 SessionMonitor iniciado');

    // Verificar sessão a cada 30 segundos
    this.sessionCheckInterval = setInterval(() => {
      this.checkSession();
    }, 30000);

    // Verificação inicial
    this.checkSession();
  }

  /**
   * Para o monitoramento da sessão
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
    console.log('🔍 SessionMonitor parado');
  }

  /**
   * Verifica o estado atual da sessão
   */
  private async checkSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      const now = new Date();
      
      const logEntry = {
        timestamp: now,
        event: 'session_check',
        sessionValid: !!session,
        userId: session?.user?.id,
        details: {
          error: error?.message,
          expiresAt: session?.expires_at,
          timeSinceLastCheck: this.lastSessionCheck ? 
            now.getTime() - this.lastSessionCheck.getTime() : 0
        }
      };

      this.sessionLogs.push(logEntry);
      this.lastSessionCheck = now;

      // Manter apenas os últimos 50 logs
      if (this.sessionLogs.length > 50) {
        this.sessionLogs = this.sessionLogs.slice(-50);
      }

      // Log apenas se houver mudança de estado ou erro
      if (error || !session) {
        console.warn('⚠️ SessionMonitor - Problema detectado:', logEntry);
      }

      // Detectar perda de sessão
      if (this.sessionLogs.length > 1) {
        const previousLog = this.sessionLogs[this.sessionLogs.length - 2];
        if (previousLog.sessionValid && !logEntry.sessionValid) {
          console.error('🚨 SessionMonitor - PERDA DE SESSÃO DETECTADA!');
          console.error('🚨 Log anterior:', previousLog);
          console.error('🚨 Log atual:', logEntry);
          this.logSessionHistory();
        }
      }

    } catch (error) {
      console.error('❌ SessionMonitor - Erro ao verificar sessão:', error);
    }
  }

  /**
   * Registra um evento personalizado
   */
  logEvent(event: string, details?: any) {
    const logEntry = {
      timestamp: new Date(),
      event,
      sessionValid: false, // Será atualizado na próxima verificação
      details
    };

    this.sessionLogs.push(logEntry);
    console.log('📝 SessionMonitor - Evento registrado:', logEntry);
  }

  /**
   * Exibe o histórico completo de logs da sessão
   */
  logSessionHistory() {
    console.group('📊 SessionMonitor - Histórico da Sessão');
    this.sessionLogs.forEach((log, index) => {
      console.log(`${index + 1}. [${log.timestamp.toISOString()}] ${log.event}:`, log);
    });
    console.groupEnd();
  }

  /**
   * Retorna os logs da sessão
   */
  getSessionLogs() {
    return [...this.sessionLogs];
  }

  /**
   * Limpa os logs da sessão
   */
  clearLogs() {
    this.sessionLogs = [];
    console.log('🧹 SessionMonitor - Logs limpos');
  }
}

export const sessionMonitor = SessionMonitor.getInstance();

// Auto-iniciar em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  // Aguardar um pouco para garantir que o Supabase foi inicializado
  setTimeout(() => {
    sessionMonitor.startMonitoring();
  }, 2000);
}