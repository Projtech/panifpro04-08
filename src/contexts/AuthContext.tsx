import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client'; // Ajuste o caminho se necessário
import { useNavigate } from 'react-router-dom'; // Importar useNavigate
import { queryClient } from '@/lib/react-query'; // Importar queryClient

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

  // const navigate = useNavigate(); // Hook de navegação - Removido pois não é usado diretamente aqui

  // Função para definir a empresa ativa (e salvar no localStorage)
  const setActiveCompany = useCallback(
    (companyData: ActiveCompanyData | null) => {
      console.log('[AuthContext] setActiveCompany chamado com:', companyData);
      setActiveCompanyState(companyData);
      if (companyData) {
        localStorage.setItem('activeCompany', JSON.stringify(companyData));
      } else {
        localStorage.removeItem('activeCompany');
      }
    },
    []
  );

  // Função de signOut
  const signOut = useCallback(async () => {
    console.log('[AuthContext] Iniciando signOut...');
    if (isMounted.current) {
      setAuthError(null); // Limpa erro ao deslogar
    }
    localStorage.removeItem('activeCompany'); // Remove empresa ativa do localStorage
    if (isMounted.current) {
      setActiveCompanyState(null); // Limpa estado da empresa ativa
      setUser(null); // Limpa usuário
      setSession(null); // Limpa sessão
      setLoading(false); // Garante que não fique carregando
    }
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("[AuthContext] Erro durante supabase.auth.signOut:", error);
    }
    queryClient.clear(); // Limpa cache do React Query
    console.log('[AuthContext] signOut concluído.');
    // Navegação para login é feita pelo ProtectedRoute ou AuthErrorHandler
  }, []);

  // Efeito para verificar se a senha precisa ser alterada
  const checkPasswordChangeRequirement = useCallback(async (currentUser: User | null) => {
    // Verifica o metadado que pode vir do Supabase Auth ou do seu backend
    const needsChange = currentUser?.user_metadata?.needs_password_change ?? false;
    console.log(`[AuthContext] checkPasswordChangeRequirement para user ${currentUser?.id}. Needs change: ${needsChange}`);
    if (isMounted.current) {
      setNeedsPasswordChange(needsChange);
    }
    // Não faz redirecionamento aqui, deixa isso para a UI
  }, []);

  // Efeito para controlar o ciclo de vida do componente
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Efeito principal para lidar com o estado de autenticação
  useEffect(() => {
    const listenerInstanceId = ++listenerIdCounter; // ID único para esta instância do listener
    console.log(`[AuthContext Listener #${listenerInstanceId}] Montando AuthProvider e configurando onAuthStateChange...`);
    setLoading(true); // Garante que loading é true ao iniciar
    setAuthError(null); // Limpa erros anteriores ao iniciar

    // Tenta carregar a empresa ativa do localStorage na montagem inicial
    let initialCompanyFromStorage: ActiveCompanyData | null = null;
    try {
      const storedCompany = localStorage.getItem('activeCompany');
      if (storedCompany) {
        initialCompanyFromStorage = JSON.parse(storedCompany);
        console.log(`[AuthContext Listener #${listenerInstanceId}] Empresa ativa encontrada no localStorage.`, initialCompanyFromStorage);
        // Não define o estado ainda, espera a confirmação da sessão
      } else {
        console.log(`[AuthContext Listener #${listenerInstanceId}] Nenhuma empresa ativa no localStorage.`);
      }
    } catch (e) {
      console.error(`[AuthContext Listener #${listenerInstanceId}] Erro ao ler empresa ativa do localStorage:`, e);
      localStorage.removeItem('activeCompany'); // Limpa em caso de erro de parse
    }

    // Configura o listener do Supabase
    console.log(`[AuthContext Listener #${listenerInstanceId}] ANTES de supabase.auth.onAuthStateChange`);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const eventInstanceId = ++eventIdCounter; // ID único para este evento
      console.log(
        `[AuthContext Listener #${listenerInstanceId} Event #${eventInstanceId}] === Evento onAuthStateChange Recebido === Event:`, event,
        'Session:', session ? { user: session.user ? { id: session.user.id, email: session.user.email, aud: session.user.aud } : null, expires_at: session.expires_at } : null // Log seguro
      );

      // Verifica se o componente ainda está montado antes de atualizar o estado
      if (!isMounted.current) return;
      
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setAuthError(null); // Limpa erro a cada novo evento relevante

      // Lógica principal baseada no usuário da sessão
      if (currentUser) {
        console.log(
          `[AuthContext Listener #${listenerInstanceId} Event #${eventInstanceId}] Usuário ${currentUser.id} presente na sessão.`
        );

        // Verifica necessidade de mudança de senha
        await checkPasswordChangeRequirement(currentUser);

        // Verifica se a empresa carregada do localStorage pertence ao usuário atual
        let companyToUse: ActiveCompanyData | null = null;
        if (initialCompanyFromStorage && initialCompanyFromStorage.user_id === currentUser.id) {
          console.log(`[AuthContext Listener #${listenerInstanceId} Event #${eventInstanceId}] Empresa do localStorage (${initialCompanyFromStorage.id}) pertence ao usuário atual. Usando-a.`);
          companyToUse = initialCompanyFromStorage;
          // Verifica se o componente ainda está montado antes de atualizar o estado
          if (isMounted.current) {
            setActiveCompanyState(companyToUse); // Define o estado com a empresa do storage
            setLoading(false); // Já temos a empresa, podemos parar de carregar
          }
        } else {
          if (initialCompanyFromStorage) {
            console.log(`[AuthContext Listener #${listenerInstanceId} Event #${eventInstanceId}] Empresa do localStorage (${initialCompanyFromStorage.id}) NÃO pertence ao usuário atual (${currentUser.id}). Ignorando e buscando do DB.`);
            localStorage.removeItem('activeCompany'); // Limpa storage inválido
          }
          console.log(
            `[AuthContext Listener #${listenerInstanceId} Event #${eventInstanceId}] Nenhuma empresa válida do storage. Buscando empresa+role para user ${currentUser.id}`
          );
          let finalCompanyData: ActiveCompanyData | null = null;
          try {
            console.log(
              `[AuthContext Listener #${listenerInstanceId} Event #${eventInstanceId}] ANTES da query company_users para user ${currentUser.id}`
            );
            const { data: companyUserData, error: companyError } = await supabase
              .rpc('get_active_company_for_user', { user_uuid: currentUser.id })
              .single();

            console.log(
              `[AuthContext Listener #${listenerInstanceId} Event #${eventInstanceId}] DEPOIS da query company_users. Resultado:`, {
                companyUserData: companyUserData ? { role: companyUserData.role, company: companyUserData.company } : null,
                companyError: companyError ? { message: companyError.message, code: companyError.code } : null
              }
            );

            if (companyError) {
              console.error(
                `[AuthContext Listener #${listenerInstanceId} Event #${eventInstanceId}] Erro ao buscar empresa/role:`, companyError
              );
              if (isMounted.current) {
                setAuthError('Erro ao buscar dados da empresa vinculada. Tente novamente mais tarde.');
              }
              finalCompanyData = null;
            } else if (companyUserData?.company && companyUserData?.role) {
              finalCompanyData = {
                id: companyUserData.company.id,
                name: companyUserData.company.name,
                role: companyUserData.role,
                user_id: currentUser.id, // Associa ao usuário atual
              };
              console.log(
                `[AuthContext Listener #${listenerInstanceId} Event #${eventInstanceId}] Empresa/role encontrados via DB:`, finalCompanyData
              );
              if (isMounted.current) {
                setAuthError(null);
              }
            } else {
              console.warn(
                `[AuthContext Listener #${listenerInstanceId} Event #${eventInstanceId}] Usuário logado mas sem empresa/role associado válido encontrado no DB.`
              );
              if (isMounted.current) {
                setAuthError('Nenhuma empresa ou função válida está vinculada a este usuário.');
              }
              finalCompanyData = null;
            }
          } catch (lookupError) {
            console.error(
              `[AuthContext Listener #${listenerInstanceId} Event #${eventInstanceId}] Erro GERAL (try/catch) ao buscar empresa/role:`, lookupError
            );
            if (isMounted.current) {
              setAuthError('Ocorreu um erro inesperado ao carregar seus dados de acesso.');
            }
            finalCompanyData = null;
          } finally {
            console.log(
              `[AuthContext Listener #${listenerInstanceId} Event #${eventInstanceId}] Bloco FINALLY da busca company_users. Definindo empresa e loading = false.`
            );
            // Define a empresa (ou null) APÓS a busca e limpa o storage se a busca falhou
            if (isMounted.current) {
              setActiveCompany(finalCompanyData);
              setLoading(false); // Garante que loading seja false após a tentativa de busca
            }
          }
        }

      } else {
        // Usuário deslogado ou sessão inicial nula/inválida
        console.log(
          `[AuthContext Listener #${listenerInstanceId} Event #${eventInstanceId}] Usuário nulo na sessão. Limpando dados e definindo loading = false.`
        );
        if (isMounted.current) {
          setUser(null);
          setSession(null);
          setActiveCompany(null); // Garante limpeza da empresa ativa
          setAuthError(null); // Limpa erros
          setLoading(false); // Define loading como false
        }
      }
      console.log(`[AuthContext Listener #${listenerInstanceId} Event #${eventInstanceId}] === Fim do Processamento do Evento ===`);
    });
    console.log(`[AuthContext Listener #${listenerInstanceId}] DEPOIS de supabase.auth.onAuthStateChange`);

    // Função de limpeza ao desmontar o componente
    return () => {
      console.log(`[AuthContext Listener #${listenerInstanceId}] Desmontando AuthProvider e cancelando inscrição onAuthStateChange.`);
      subscription?.unsubscribe();
    };
  }, [setActiveCompany, signOut, checkPasswordChangeRequirement]); // Removido activeCompany das dependências para evitar loops

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
