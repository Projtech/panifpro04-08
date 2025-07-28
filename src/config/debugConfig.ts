/**
 * CONFIGURAÇÕES DE DEBUG - Controle centralizado para resolver logout automático
 * 
 * Este arquivo permite ativar/desativar funcionalidades que podem estar
 * causando o logout automático, facilitando o debug e a identificação da causa.
 */

export const DEBUG_CONFIG = {
  // === CONFIGURAÇÕES GERAIS ===
  ENABLE_DETAILED_LOGS: true,
  ENABLE_SESSION_MONITORING: true,
  ENABLE_AUTH_STATE_LOGS: true,
  
  // === COMPONENTES PROBLEMÁTICOS ===
  // Desabilitar temporariamente para identificar causa do logout
  ENABLE_VISIBILITY_HANDLER: false, // DESABILITADO - pode causar logout ao mudar aba
  ENABLE_AUTO_LOGOUT: false, // DESABILITADO - timeout por inatividade
  ENABLE_AUTH_ERROR_HANDLER: true, // MANTIDO - necessário para tratamento de erros
  
  // === CONFIGURAÇÕES DO SUPABASE ===
  SUPABASE_CONFIG: {
    detectSessionInUrl: false, // DESABILITADO - pode causar conflitos
    autoRefreshToken: true, // MANTIDO - necessário para manter sessão
    persistSession: true, // MANTIDO - necessário para persistir login
    flowType: 'pkce' as const // ADICIONADO - melhor segurança
  },
  
  // === CONFIGURAÇÕES DE HOOKS ===
  // Controlar re-renderizações excessivas
  ENABLE_DASHBOARD_DATA_HOOK: true,
  ENABLE_PRODUCTION_LISTS_HOOK: true,
  DEBOUNCE_AUTH_CHECKS: true, // Adicionar debounce em verificações de auth
  
  // === CONFIGURAÇÕES DE CACHE ===
  CLEAR_CACHE_ON_AUTH_ERROR: true,
  PRESERVE_CACHE_ON_VISIBILITY_CHANGE: true,
  
  // === CONFIGURAÇÕES DE LOCALSTORAGE ===
  AUTO_CLEANUP_CORRUPTED_TOKENS: true,
  PRESERVE_USER_PREFERENCES: true,
  
  // === TIMEOUTS E INTERVALOS ===
  SESSION_CHECK_INTERVAL: 30000, // 30 segundos
  AUTH_STATE_DEBOUNCE: 200, // 200ms - reduzido para melhor responsividade
  VISIBILITY_CHANGE_DEBOUNCE: 2000, // 2 segundos
  
  // === CONFIGURAÇÕES DE DESENVOLVIMENTO ===
  LOG_ALL_AUTH_EVENTS: true,
  LOG_SUPABASE_CALLS: false, // Pode ser muito verboso
  LOG_REACT_QUERY_EVENTS: false, // Pode ser muito verboso
  SIMULATE_NETWORK_ISSUES: false, // Para testes
  
  // === CONFIGURAÇÕES DE PRODUÇÃO ===
  // Estas configurações serão diferentes em produção
  PRODUCTION_OVERRIDES: {
    ENABLE_DETAILED_LOGS: false,
    ENABLE_SESSION_MONITORING: false,
    LOG_ALL_AUTH_EVENTS: false
  }
};

/**
 * Função para obter configuração baseada no ambiente
 */
export function getDebugConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    return {
      ...DEBUG_CONFIG,
      ...DEBUG_CONFIG.PRODUCTION_OVERRIDES
    };
  }
  
  return DEBUG_CONFIG;
}

/**
 * Função para log condicional baseado na configuração
 */
export function debugLog(category: keyof typeof DEBUG_CONFIG, message: string, ...args: any[]) {
  const config = getDebugConfig();
  
  if (config[category]) {
    const timestamp = new Date().toISOString();
    console.log(`🐛 [${timestamp}] [${category}] ${message}`, ...args);
  }
}

/**
 * Função para log de erro sempre ativo
 */
export function debugError(category: string, message: string, ...args: any[]) {
  const timestamp = new Date().toISOString();
  console.error(`🚨 [${timestamp}] [${category}] ${message}`, ...args);
}

/**
 * Função para log de warning sempre ativo
 */
export function debugWarn(category: string, message: string, ...args: any[]) {
  const timestamp = new Date().toISOString();
  console.warn(`⚠️ [${timestamp}] [${category}] ${message}`, ...args);
}