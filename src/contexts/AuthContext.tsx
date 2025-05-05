import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { queryClient } from '@/lib/react-query';

interface Company {
  id: string;
  name: string;
}

interface CompanyUserRole {
  role: 'admin' | 'user';
}

interface CombinedCompanyData extends Company, CompanyUserRole {}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  activeCompany: CombinedCompanyData | null;
  setActiveCompany: (company: CombinedCompanyData | null) => void;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  needsPasswordChange: boolean;
  setNeedsPasswordChange: (value: boolean) => void;
  checkPasswordChangeRequirement: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCompany, setActiveCompany] = useState<CombinedCompanyData | null>(null);
  const [needsPasswordChange, _setNeedsPasswordChange] = useState(false);

  const setNeedsPasswordChange = (value: boolean) => {
    _setNeedsPasswordChange(prev => {
      if (prev !== value) return value;
      return prev;
    });
  }

  const checkPasswordChangeRequirement = async () => {
    if (!user) return false;

    try {
      console.log('checkPasswordChangeRequirement chamado para user', user?.id);
      const { data, error, status } = await supabase
        .from('profiles')
        .select('force_password_change')
        .eq('id', user.id)
        .maybeSingle();

      if (status === 406 || (error && error.code === 'PGRST116')) {
        console.warn('Perfil não encontrado ou acesso negado para verificar troca de senha. Assumindo false.', error);
        setNeedsPasswordChange(false);
        return false;
      }
      
      if (error) throw error;

      const needsChange = data?.force_password_change || false;
      setNeedsPasswordChange(needsChange);
      return needsChange;
    } catch (error) {
      console.error('Erro ao verificar requisito de troca de senha:', error);
      setNeedsPasswordChange(false); 
      return false;
    }
  };

  useEffect(() => {
    console.log('[AuthContext:Refactored] Configurando onAuthStateChange...');
    
    // localStorage.removeItem('activeCompany'); // Comentado: Limpeza desnecessária no início

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[AuthContext:Refactored] onAuthStateChange Event: ${event}, Session:`, session);
        
        // Primeiro atualizar o loading para true apenas se não estivermos no evento PASSWORD_RECOVERY
        if (event !== 'PASSWORD_RECOVERY') {
          setLoading(true);
        }

        let finalCompanyData: CombinedCompanyData | null = null; 

        if (event === 'PASSWORD_RECOVERY') {
            console.log('[AuthContext:Refactored] Evento PASSWORD_RECOVERY detectado.');
            setSession(session);
            setUser(session?.user ?? null);
            setActiveCompany(null); 
            setNeedsPasswordChange(true);
            setLoading(false); 
            return;
        }

        if (session?.user) {
            console.log(`[AuthContext:Refactored] Usuário ${session.user.id} logado ou sessão inicial válida.`);
            setSession(session);
            setUser(session.user);

            console.log(`[AuthContext:Refactored] Buscando empresa+role para user ${session.user.id}`);
            try {
                console.log('[AuthContext:Debug] ANTES da query company_users');
                const { data: companyUserData, error: companyError } = await supabase
                    .from('company_users')
                    .select('role, company:company_id(id, name)') 
                    .eq('user_id', session.user.id)
                    .limit(1)
                    .maybeSingle(); 
                console.log('[AuthContext:Debug] DEPOIS da query company_users');
                console.log('[AuthContext:Debug] companyUserData:', companyUserData);
                console.log('[AuthContext:Debug] companyError:', companyError);

                console.log('[AuthContext:Debug] Resultado da query company_users:', {companyUserData, companyError});
                if (companyError) {
                    console.error('[AuthContext:Refactored] Erro ao buscar empresa/role:', companyError);
                    localStorage.removeItem('activeCompany');
                    setLoading(false);
                    alert('Erro ao buscar empresa vinculada ao usuário. Faça login novamente.');
                    window.location.href = '/login';
                    return;
                } else if (companyUserData && companyUserData.company) {
                    finalCompanyData = {
                        id: companyUserData.company.id,
                        name: companyUserData.company.name,
                        role: companyUserData.role as 'admin' | 'user', 
                    };
                    console.log('[AuthContext:Refactored] Empresa+role encontrados:', finalCompanyData);
                    localStorage.setItem('activeCompany', JSON.stringify(finalCompanyData)); 
                } else {
                    console.warn('[AuthContext:Refactored] Usuário logado mas sem empresa/role associado encontrado. Redirecionando para login.');
                    localStorage.removeItem('activeCompany');
                    setLoading(false);
                    alert('Nenhuma empresa vinculada ao usuário. Faça login novamente.');
                    window.location.href = '/login';
                    return;
                }
            } catch (lookupError) {
                console.error('[AuthContext:Refactored] Erro DETALHADO ao buscar empresa/role:', lookupError);
                setLoading(false); // ADICIONADO: Garantir que loading finalize em erro inesperado
            } finally {
                // Segurança extra: nunca deixe loading travado
                setLoading(false);
            }

            // localStorage.removeItem('activeCompany'); // Removido pois limpava a empresa ativa indevidamente
        }

        else {
            // console.log('[AuthContext:Refactored] Usuário deslogado ou sessão inicial vazia.'); // Comentado para teste
            setSession(null); 
            setUser(null); 
            finalCompanyData = null; 
            localStorage.removeItem('activeCompany');
            setLoading(false); // ADICIONADO: Garantir que loading finalize quando deslogado
        }

        console.log(`[AuthContext:Refactored] Definindo activeCompany final:`, finalCompanyData);
        setActiveCompany(finalCompanyData);
        
        // Comentado: Bloco if(loading) desnecessário com as correções acima e o finally
        // if (loading) {
        //   console.log(`[AuthContext:Refactored] Definindo loading como false.`);
        //   setLoading(false);
        // }
      }
    );

    return () => {
      console.log('[AuthContext:Refactored] Limpando inscrição onAuthStateChange.');
      subscription.unsubscribe();
    };
  }, []); 

  useEffect(() => {
    if (user && needsPasswordChange) {
      checkPasswordChangeRequirement();
    }
  }, [user, needsPasswordChange]);

  const signOut = async () => {
    console.log('[AuthContext:Refactored] Iniciando signOut...');
    await supabase.auth.signOut();
    localStorage.removeItem('activeCompany');
    queryClient.clear(); 
    console.log('[AuthContext:Refactored] signOut concluído.');
  };

  const isAuthenticated = !!user;
  const isAdmin = activeCompany?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      loading,
      activeCompany,
      setActiveCompany, 
      isAdmin,
      signOut,
      needsPasswordChange,
      setNeedsPasswordChange,
      checkPasswordChangeRequirement,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
