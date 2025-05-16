import { supabase } from '@/integrations/supabase/client';

export interface CreateUserParams {
  email: string;
  password: string;
  fullName: string;
  companyId: string;
  role: string;
  forcePasswordChange: boolean;
}

/**
 * Cria apenas o usuário no sistema de autenticação
 */
export async function createAuthUser(params: CreateUserParams) {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          display_name: params.fullName,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Usuário não foi criado no Auth.');
    
    return { 
      data: { 
        success: true, 
        user_id: authData.user.id, 
        email: params.email 
      }, 
      error: null 
    };
  } catch (error: any) {
    console.error('Erro ao criar usuário na autenticação:', error);
    return { data: null, error };
  }
}

// Removida a função checkUserExists que usava admin API

/**
 * Atualiza o perfil e cria associação à empresa para um usuário já existente
 * O perfil já é criado automaticamente pelo trigger on_auth_user_created
 */
export async function createUserProfile(userId: string, params: CreateUserParams) {
  try {
    // Atualizar o perfil do usuário que já foi criado pelo trigger
    const profileData = {
      full_name: params.fullName,
      force_password_change: params.forcePasswordChange,
      company_id: params.companyId
    };
    
    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('user_id', userId);

    if (profileError) {
      console.error('Erro ao atualizar perfil:', profileError);
      throw profileError;
    }

    // Associar o usuário à empresa
    const { error: companyUserError } = await supabase
      .from('company_users')
      .insert({
        user_id: userId,
        company_id: params.companyId,
        role: params.role,
        status: 'active'
      });

    if (companyUserError) throw companyUserError;
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Erro ao criar perfil do usuário:', error);
    return { success: false, error };
  }
}

/**
 * Cria um novo usuário em duas etapas: primeiro na autenticação e depois o perfil
 * Esta abordagem resolve problemas de sincronização entre auth.users e profiles
 */
export async function createUserWithProfile(params: CreateUserParams) {
  try {
    // Etapa 1: Criar usuário na autenticação
    const { data: authData, error: authError } = await createAuthUser(params);
    
    if (authError || !authData) {
      throw authError || new Error('Falha ao criar usuário na autenticação');
    }
    
    const userId = authData.user_id;
    
    // Etapa 2: Aguardar um tempo e tentar criar o perfil
    let attempts = 0;
    const maxAttempts = 3;
    let success = false;
    
    while (attempts < maxAttempts && !success) {
      attempts++;
      
      // Aguardar progressivamente mais tempo entre as tentativas
      await new Promise(resolve => setTimeout(resolve, attempts * 2000));
      
      const { success: profileSuccess, error: profileError } = await createUserProfile(userId, params);
      
      if (profileSuccess) {
        success = true;
        break;
      }
      
      console.log(`Tentativa ${attempts}/${maxAttempts} falhou. Aguardando para nova tentativa...`);
    }
    
    if (!success) {
      throw new Error('Não foi possível criar o perfil do usuário após múltiplas tentativas');
    }
    
    return { 
      data: { 
        success: true, 
        user_id: userId, 
        email: params.email 
      }, 
      error: null 
    };
  } catch (error: any) {
    console.error('Erro ao criar usuário com perfil:', error);
    return { data: null, error };
  }
}
