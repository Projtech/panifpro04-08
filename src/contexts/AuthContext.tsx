import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { queryClient } from '@/lib/react-query';
import { LogoutManager } from '@/services/LogoutManager'; // Importar LogoutManager
import { getDebugConfig, debugLog, debugError, debugWarn } from '@/config/debugConfig';

// Interface para os dados da empresa ativa
// Redefinido para incluir id e name explicitamente, correspondendo aos dados da query
interface ActiveCompanyData {
  id: string;    // Vem de company.id
  name: string;  // Vem de company.name
  role: string;  // Vem de companyUserData.role
  user_id: string; // Associado manualmente ao usuário atual
}

// Interface para o tipo do contexto
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  loading: boolean;
  activeCompany: ActiveCompanyData | null; // Empresa ativa com role
  setActiveCompany: (companyData: ActiveCompanyData | null) => void;
  signOut: () => Promise<void>;
  authError: string | null; // Estado para armazenar erros de autenticação/busca
  isAdmin: boolean; // Adicionado para lógica de admin
  needsPasswordChange: boolean; // Adicionado
  // A função checkPasswordChangeRequirement foi removida do valor do contexto pois é usada internamente
}

// Cria o contexto com um valor padrão inicial
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook customizado para usar o contexto de autenticação
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Componente Provedor
interface AuthProviderProps {
  children: React.ReactNode;
}

// Contador para IDs únicos de listener e evento (apenas para debug)
let listenerIdCounter = 0;
let eventIdCounter = 0;

// Singleton para gerenciar o estado de autenticação
class AuthManager {
  private static instance: AuthManager;
  private isInitialized = false;
  private subscription: any = null;
  private listeners: Set<(state: any) => void> = new Set();
  private currentState = {
    user: null,
    session: null,
    loading: true,
    authError: null,
    needsPasswordChange: false,
    activeCompany: null
  };
  private debounceTimer: NodeJS.Timeout | null = null;
  private lastAuthEvent: { event: string; timestamp: number } | null = null;

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  addListener(callback: (state: any) => void) {
    this.listeners.add(callback);
    // Envia o estado atual imediatamente
    callback(this.currentState);
  }

  removeListener(callback: (state: any) => void) {
    this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.currentState));
  }

  private updateState(updates: Partial<typeof this.currentState>) {
    this.currentState = { ...this.currentState, ...updates };
    this.notifyListeners();
  }

  async initialize() {
    if (this.isInitialized) return;
    
    const listenerInstanceId = ++listenerIdCounter;
    console.log(`[AuthManager #${listenerInstanceId}] Inicializando AuthManager...`);
    
    this.isInitialized = true;
    this.updateState({ loading: true, authError: null });

    // Tenta carregar a empresa ativa do localStorage
    let initialCompanyFromStorage: ActiveCompanyData | null = null;
    try {
      const storedCompany = localStorage.getItem('activeCompany');
      if (storedCompany) {
        initialCompanyFromStorage = JSON.parse(storedCompany);
        console.log(`[AuthManager #${listenerInstanceId}] Empresa ativa encontrada no localStorage.`, initialCompanyFromStorage);
      }
    } catch (e) {
      console.error(`[AuthManager #${listenerInstanceId}] Erro ao ler empresa ativa do localStorage:`, e);
      localStorage.removeItem('activeCompany');
    }

    // Configura o listener do Supabase com logs detalhados e debounce
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const eventInstanceId = ++eventIdCounter;
      const timestamp = Date.now();
      const config = getDebugConfig();
      
      // Implementar debounce para evitar múltiplas chamadas rápidas
      if (config.DEBOUNCE_AUTH_CHECKS) {
        // Verificar se é um evento duplicado muito próximo
        if (this.lastAuthEvent && 
            this.lastAuthEvent.event === event && 
            (timestamp - this.lastAuthEvent.timestamp) < config.AUTH_STATE_DEBOUNCE) {
          debugWarn('AUTH_DEBOUNCE', `Evento ${event} ignorado por debounce`);
          return;
        }
        
        // Limpar timer anterior se existir
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }
        
        // Agendar processamento do evento
        this.debounceTimer = setTimeout(() => {
          this.processAuthEvent(event, session, eventInstanceId, listenerInstanceId);
        }, 50); // 50ms de debounce - reduzido para melhor responsividade
        
        this.lastAuthEvent = { event, timestamp };
      } else {
        // Processar imediatamente se debounce estiver desabilitado
        this.processAuthEvent(event, session, eventInstanceId, listenerInstanceId);
      }
    });
    
    this.subscription = subscription;
  }
  
  private async processAuthEvent(event: string, session: Session | null, eventInstanceId: number, listenerInstanceId: number) {
    const config = getDebugConfig();
    const timestampStr = new Date().toISOString();
    
    // Log detalhado para identificar causa do logout
    if (config.ENABLE_AUTH_STATE_LOGS) {
      debugLog('ENABLE_DETAILED_LOGS', `[AuthManager #${listenerInstanceId} Event #${eventInstanceId}] ${timestampStr}`);
      debugLog('ENABLE_DETAILED_LOGS', `📋 Evento: ${event}`);
      debugLog('ENABLE_DETAILED_LOGS', `👤 Usuário anterior: ${this.currentState.user?.id || 'nenhum'}`);
      debugLog('ENABLE_DETAILED_LOGS', `👤 Usuário atual: ${session?.user?.id || 'nenhum'}`);
      debugLog('ENABLE_DETAILED_LOGS', `🔐 Sessão válida: ${!!session}`);
      debugLog('ENABLE_DETAILED_LOGS', `⏰ Timestamp da sessão: ${session?.expires_at || 'N/A'}`);
    }
    
    // Detectar logout inesperado
    if (this.currentState.user && !session?.user && event !== 'SIGNED_OUT') {
      debugError('LOGOUT_DETECTION', 'LOGOUT INESPERADO DETECTADO!');
      debugError('LOGOUT_DETECTION', `Evento: ${event}`);
      debugError('LOGOUT_DETECTION', `Usuário perdido: ${this.currentState.user.id}`);
      debugError('LOGOUT_DETECTION', 'Stack trace:', new Error().stack);
    }
    
    const currentUser = session?.user ?? null;
    this.updateState({ 
      session, 
      user: currentUser, 
      authError: null 
    });
    
    // Obter empresa ativa do localStorage
    const initialCompanyFromStorage = this.getActiveCompanyFromStorage();

    if (currentUser && event !== 'INITIAL_SESSION') {
      console.log(`[AuthManager #${listenerInstanceId} Event #${eventInstanceId}] Usuário ${currentUser.id} presente na sessão.`);
      
      // Só executa verificações se for um login real, não uma sessão inicial
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Marca que a sessão do navegador está ativa
        sessionStorage.setItem('browserSessionActive', 'true');
        
        // Verifica necessidade de mudança de senha
        await this.checkPasswordChangeRequirement(currentUser);

        // Gerencia empresa ativa
        let companyToUse: ActiveCompanyData | null = null;
        if (initialCompanyFromStorage && initialCompanyFromStorage.user_id === currentUser.id) {
          companyToUse = initialCompanyFromStorage;
          this.updateState({ activeCompany: companyToUse, loading: false });
        } else {
          if (initialCompanyFromStorage) {
            localStorage.removeItem('activeCompany');
          }
          
          try {
            const { data: companyUserData, error: companyError } = await supabase
              .rpc('get_active_company_for_user', { user_uuid: currentUser.id })
              .single();

            if (!companyError && companyUserData?.company && companyUserData?.role) {
              companyToUse = {
                id: companyUserData.company.id,
                name: companyUserData.company.name,
                role: companyUserData.role,
                user_id: currentUser.id,
              };
              console.log(`[AuthManager #${listenerInstanceId} Event #${eventInstanceId}] Empresa/role encontrados:`, companyToUse);
            }
          } catch (error) {
            console.error(`[AuthManager #${listenerInstanceId} Event #${eventInstanceId}] Erro ao buscar empresa:`, error);
          }
          
          this.updateState({ activeCompany: companyToUse, loading: false });
        }
      } else {
        // Para sessões iniciais, apenas atualiza o estado sem fazer consultas
        this.updateState({ loading: false });
      }
    } else if (currentUser && event === 'INITIAL_SESSION') {
      console.log(`[AuthManager #${listenerInstanceId} Event #${eventInstanceId}] Sessão inicial detectada.`);
      
      // Verifica se há dados de empresa no localStorage (indica login anterior)
      const hasStoredCompany = localStorage.getItem('activeCompany');
      const browserSessionActive = sessionStorage.getItem('browserSessionActive');
      
      // Só faz logout automático se:
      // 1. Há dados de empresa no localStorage (indica que houve login anterior)
      // 2. Mas não há sessionStorage ativo (indica nova sessão do navegador)
      if (hasStoredCompany && !browserSessionActive) {
        console.log(`[AuthManager #${listenerInstanceId} Event #${eventInstanceId}] Nova sessão do navegador detectada após login anterior - fazendo logout automático.`);
        // Nova sessão do navegador após login anterior - fazer logout automático
        this.clearLocalStorage();
        try {
          await supabase.auth.signOut();
          console.log(`[AuthManager #${listenerInstanceId} Event #${eventInstanceId}] Logout automático realizado com sucesso.`);
        } catch (error) {
          console.error(`[AuthManager #${listenerInstanceId} Event #${eventInstanceId}] Erro ao fazer logout automático:`, error);
        }
        this.updateState({ 
          user: null, 
          session: null, 
          activeCompany: null, 
          authError: null, 
          loading: false 
        });
        return;
      }
      
      // Marca que a sessão do navegador está ativa
      sessionStorage.setItem('browserSessionActive', 'true');
      
      // Para sessões iniciais, tenta carregar empresa do localStorage
      let companyToUse: ActiveCompanyData | null = null;
      if (initialCompanyFromStorage && initialCompanyFromStorage.user_id === currentUser.id) {
        companyToUse = initialCompanyFromStorage;
        console.log(`[AuthManager #${listenerInstanceId} Event #${eventInstanceId}] Empresa carregada do localStorage:`, companyToUse);
        this.updateState({ activeCompany: companyToUse, loading: false });
      } else {
        if (initialCompanyFromStorage) {
          localStorage.removeItem('activeCompany');
        }
        console.log(`[AuthManager #${listenerInstanceId} Event #${eventInstanceId}] Nenhuma empresa válida no localStorage. Buscando empresa ativa...`);
        
        // Busca empresa ativa do usuário no Supabase
        try {
          const { data: companyUserData, error: companyError } = await supabase
            .rpc('get_active_company_for_user', { user_uuid: currentUser.id })
            .single();

          if (!companyError && companyUserData?.company && companyUserData?.role) {
            companyToUse = {
              id: companyUserData.company.id,
              name: companyUserData.company.name,
              role: companyUserData.role,
              user_id: currentUser.id,
            };
            console.log(`[AuthManager #${listenerInstanceId} Event #${eventInstanceId}] Empresa ativa encontrada:`, companyToUse);
            // Salva no localStorage para próximas sessões
            localStorage.setItem('activeCompany', JSON.stringify(companyToUse));
          } else {
            console.log(`[AuthManager #${listenerInstanceId} Event #${eventInstanceId}] Nenhuma empresa ativa encontrada para o usuário.`);
          }
        } catch (error) {
          console.error(`[AuthManager #${listenerInstanceId} Event #${eventInstanceId}] Erro ao buscar empresa ativa:`, error);
        }
        
        this.updateState({ activeCompany: companyToUse, loading: false });
      }
    } else {
      console.log(`[AuthManager #${listenerInstanceId} Event #${eventInstanceId}] Usuário deslogado.`);
      // Limpar localStorage e sessionStorage quando usuário faz logout ou sessão expira
      this.clearLocalStorage();
      sessionStorage.removeItem('browserSessionActive');
      this.updateState({ 
        user: null, 
        session: null, 
        activeCompany: null, 
        authError: null, 
        loading: false 
      });
    }
  }

  private async checkPasswordChangeRequirement(user: User) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('force_password_change')
        .eq('user_id', user.id)
        .single();
      
      this.updateState({ needsPasswordChange: profile?.force_password_change || false });
    } catch (error) {
      console.error('Erro ao verificar necessidade de mudança de senha:', error);
      // Se houver erro, assume que não precisa mudar senha
      this.updateState({ needsPasswordChange: false });
    }
  }

  setActiveCompany(company: ActiveCompanyData | null) {
    this.updateState({ activeCompany: company });
    if (company) {
      localStorage.setItem('activeCompany', JSON.stringify(company));
    } else {
      localStorage.removeItem('activeCompany');
    }
  }

  async signOut() {
    console.log('[AuthManager] Iniciando signOut via LogoutManager...');
    
    try {
      this.clearLocalStorage();
      sessionStorage.removeItem('browserSessionActive');
      await LogoutManager.logout({
        reason: 'user_action',
        showNotification: true,
        notificationMessage: 'Logout realizado com sucesso'
      });
      
      this.updateState({ 
        user: null, 
        session: null, 
        activeCompany: null, 
        authError: null, 
        loading: false,
        needsPasswordChange: false
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }

  private getActiveCompanyFromStorage(): ActiveCompanyData | null {
    try {
      const stored = localStorage.getItem('activeCompany');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed;
      }
    } catch (error) {
      console.error('[AuthManager] Erro ao obter empresa ativa do localStorage:', error);
      localStorage.removeItem('activeCompany');
    }
    return null;
  }

  private clearLocalStorage() {
    try {
      localStorage.removeItem('activeCompany');
      console.log('[AuthManager] localStorage limpo');
    } catch (error) {
      console.error('[AuthManager] Erro ao limpar localStorage:', error);
    }
  }

  cleanup() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    
    // Limpar timer de debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    this.listeners.clear();
    this.isInitialized = false;
    this.lastAuthEvent = null;
    
    debugLog('ENABLE_DETAILED_LOGS', 'AuthManager cleanup concluído');
  }
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  console.log('[AuthProvider] Componente AuthProvider Montando/Renderizando...'); // Log de montagem/renderização
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Inicia como true
  const [activeCompany, setActiveCompanyState] = useState<ActiveCompanyData | null>(null);
  const [authError, setAuthError] = useState<string | null>(null); // Estado de erro
  const [needsPasswordChange, setNeedsPasswordChange] = useState<boolean>(false); // Estado para mudança de senha
  
  // Ref para controlar se o componente está montado
  const isMounted = React.useRef(true);
  const authManager = React.useRef<AuthManager | null>(null);

  // const navigate = useNavigate(); // Hook de navegação - Removido pois não é usado diretamente aqui

  // Função para definir a empresa ativa usando AuthManager
  const setActiveCompany = useCallback(
    (companyData: ActiveCompanyData | null) => {
      console.log('[AuthContext] setActiveCompany chamado com:', companyData);
      if (authManager.current) {
        authManager.current.setActiveCompany(companyData);
      }
    },
    []
  );

  // Função de signOut usando AuthManager
  const signOut = useCallback(async () => {
    if (authManager.current) {
      await authManager.current.signOut();
    }
  }, []);

  // Efeito para controlar o ciclo de vida do componente
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Efeito principal para lidar com o estado de autenticação usando AuthManager
  useEffect(() => {
    if (!isMounted.current) return;
    
    console.log('[AuthProvider] Inicializando com AuthManager...');
    
    // Obtém a instância do AuthManager
    authManager.current = AuthManager.getInstance();
    
    // Callback para atualizar os estados locais
    const handleStateChange = (state: any) => {
      if (!isMounted.current) return;
      
      setUser(state.user);
      setSession(state.session);
      setLoading(state.loading);
      setAuthError(state.authError);
      setNeedsPasswordChange(state.needsPasswordChange);
      setActiveCompanyState(state.activeCompany);
    };
    
    // Adiciona o listener
    authManager.current.addListener(handleStateChange);
    
    // Inicializa o AuthManager
    authManager.current.initialize();

    // Função de limpeza
    return () => {
      console.log('[AuthProvider] Removendo listener do AuthManager...');
      if (authManager.current) {
        authManager.current.removeListener(handleStateChange);
      }
    };
  }, []); // Dependências vazias para executar apenas uma vez

  // Calcula isAdmin baseado no role da empresa ativa
  const isAdmin = useMemo(() => activeCompany?.role === 'admin', [activeCompany]);

  // Monta o valor do contexto
  const value = useMemo(
    () => ({
      user,
      session,
      isAuthenticated: !!user, // Derivado de user
      loading,
      activeCompany,
      setActiveCompany,
      signOut,
      authError,
      isAdmin, // Inclui isAdmin no contexto
      needsPasswordChange, // Inclui needsPasswordChange
    }),
    [user, session, loading, activeCompany, setActiveCompany, signOut, authError, isAdmin, needsPasswordChange]
  );

  console.log(`[AuthProvider Render] Fornecendo valor: isAuthenticated=${value.isAuthenticated}, loading=${value.loading}, user=${value.user?.id}, company=${value.activeCompany?.id}, error=${value.authError}`); // Log resumido no render

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Exporta o hook useAuth e o componente AuthProvider
// export default AuthProvider; // Comentado se já houver export default no arquivo
