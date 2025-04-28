import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface Company {
  id: string;
  name: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  activeCompany: Company | null;
  setActiveCompany: (company: Company | null) => void;
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
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [needsPasswordChange, _setNeedsPasswordChange] = useState(false);
  // Wrapper para evitar setNeedsPasswordChange redundante
  const setNeedsPasswordChange = (value: boolean) => {
    _setNeedsPasswordChange(prev => {
      if (prev !== value) return value;
      return prev;
    });
  }

  // Função para verificar se o usuário precisa trocar a senha
  const checkPasswordChangeRequirement = async () => {
    if (!user) return false;

    try {
      // O perfil deve ser criado pelo trigger do banco de dados.
      // A política RLS permite que o usuário leia seu próprio perfil.
      console.log('checkPasswordChangeRequirement chamado para user', user?.id);
      const { data, error, status } = await supabase
        .from('profiles')
        .select('force_password_change')
        .eq('id', user.id)
        .maybeSingle();

      // Se o perfil não for encontrado (status 406), pode ser um erro de RLS ou o perfil ainda não foi criado.
      // Vamos tratar como se não precisasse trocar a senha por enquanto para evitar loops.
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
      setNeedsPasswordChange(false); // Define como false em caso de erro
      return false;
    }
  };

  useEffect(() => {
    // Verificar se há uma empresa ativa no localStorage
    const storedCompany = localStorage.getItem('activeCompany');
    if (storedCompany) {
      setActiveCompany(JSON.parse(storedCompany));
    }

    // Configurar o listener de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // --- BLOQUEIO POR ASSOCIAÇÃO DE EMPRESA ---
        if (session?.user) {
          const { data, error } = await supabase
            .from('company_users')
            .select('company_id, company:company_id(name), role')
            .eq('user_id', session.user.id);

          if (!error && (!data || data.length !== 1)) {
            sessionStorage.setItem('loginError', 'no_company_assoc'); // Define a flag de erro
            console.warn(`Usuário ${session.user.id} não possui associação única de empresa válida. Deslogando.`);
            await signOut();
            return;
          }

          if (!error && data && data.length === 1) {
            const companyData = data[0];
            const company: Company = {
              id: companyData.company_id,
              name: companyData.company?.name || '',
              role: companyData.role || 'user',
            };
            setActiveCompany(company);
            localStorage.setItem('activeCompany', JSON.stringify(company));
          }
        }
      }
    );

    // Carregar sessão inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // --- BLOQUEIO POR ASSOCIAÇÃO DE EMPRESA ---
      if (session?.user) {
        const { data, error } = await supabase
          .from('company_users')
          .select('company_id, company:company_id(name), role')
          .eq('user_id', session.user.id);

        if (!error && (!data || data.length !== 1)) {
        sessionStorage.setItem('loginError', 'no_company_assoc'); // Define a flag de erro
        console.warn(`Usuário ${session.user.id} não possui associação única de empresa válida. Deslogando.`);
        await signOut();
        return;
      }

        if (!error && data && data.length === 1) {
          const companyData = data[0];
          const company: Company = {
            id: companyData.company_id,
            name: companyData.company?.name || '',
            role: companyData.role || 'user',
          };
          setActiveCompany(company);
          localStorage.setItem('activeCompany', JSON.stringify(company));
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Verificar troca de senha quando o usuário mudar ou needsPasswordChange for true
  useEffect(() => {
    if (user && needsPasswordChange) {
      checkPasswordChangeRequirement();
    }
  }, [user, needsPasswordChange]);

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('activeCompany');
    setActiveCompany(null);
  };

  // Atualizar localStorage quando a empresa ativa mudar
  const handleSetActiveCompany = (company: Company | null) => {
    setActiveCompany(company);
    if (company) {
      localStorage.setItem('activeCompany', JSON.stringify(company));
    } else {
      localStorage.removeItem('activeCompany');
    }
  };

  const isAuthenticated = !!user;
  const isAdmin = activeCompany?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      loading,
      activeCompany,
      setActiveCompany: handleSetActiveCompany,
      isAdmin,
      signOut,
      needsPasswordChange,
      setNeedsPasswordChange,
      checkPasswordChangeRequirement
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
