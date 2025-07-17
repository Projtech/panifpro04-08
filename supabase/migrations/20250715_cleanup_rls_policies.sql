-- Script para limpeza e otimização das políticas RLS na tabela company_users
-- Autor: Cascade AI
-- Data: 2025-07-15

-- Parte 1: Remover todas as políticas redundantes e problemáticas
DO $$
BEGIN
  RAISE NOTICE 'Iniciando limpeza de políticas RLS...';
END;
$$;

-- Remover TODAS as políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Allow user to read own company link(s)" ON public.company_users;
DROP POLICY IF EXISTS "Allow authenticated users to SELECT their own company associati" ON public.company_users;
DROP POLICY IF EXISTS "Diagnostic allow self-select" ON public.company_users;
DROP POLICY IF EXISTS "Users can view own company_users" ON public.company_users;
DROP POLICY IF EXISTS "Enable access for company members or superadmin" ON public.company_users;
DROP POLICY IF EXISTS "Allow ADMINS to DELETE users from their company" ON public.company_users;
DROP POLICY IF EXISTS "Admins can view company users" ON public.company_users;
DROP POLICY IF EXISTS "Allow ADMINS to INSERT users for their company" ON public.company_users;
DROP POLICY IF EXISTS "Allow ADMINS to UPDATE users of their company" ON public.company_users;
DROP POLICY IF EXISTS "First user always access" ON public.company_users;
DROP POLICY IF EXISTS "Superadmins full access" ON public.company_users;
DROP POLICY IF EXISTS "Users can update own record" ON public.company_users;
DROP POLICY IF EXISTS "Users can view own company links" ON public.company_users;
DROP POLICY IF EXISTS "Admins can manage company users" ON public.company_users;

-- Parte 2: Criar um conjunto mínimo e eficiente de políticas

-- Uma única política para SELECT baseada em user_id = auth.uid()
CREATE POLICY "Users can view own company links" ON public.company_users
FOR SELECT
USING (user_id = auth.uid());

-- Política para administradores verem usuários de sua empresa (sem função)
CREATE POLICY "Admins can manage company users" ON public.company_users
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu_admin
    WHERE cu_admin.user_id = auth.uid() 
    AND cu_admin.role = 'admin'
    AND cu_admin.company_id = company_users.company_id
    AND cu_admin.status = 'active'
  )
);

-- Política para usuários atualizarem seus próprios registros
CREATE POLICY "Users can update own record" ON public.company_users
FOR UPDATE
USING (user_id = auth.uid());

-- Política unificada para superadmins
CREATE POLICY "Superadmins full access" ON public.company_users
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() 
    AND (
      email = 'jcmaranhao@panificacaopro.com.br' OR 
      email = 'projtechgestaoetecnologia@gmail.com'
    )
  )
);

-- Parte 3: Verificar as políticas após limpeza
SELECT schemaname, tablename, policyname, permissive, cmd, qual
FROM pg_policies
WHERE tablename = 'company_users';

-- Notificação de conclusão
DO $$
BEGIN
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'Limpeza e otimização de políticas RLS concluídas com sucesso!';
  RAISE NOTICE 'As alterações incluem:';
  RAISE NOTICE '1. Remoção de políticas redundantes e conflitantes';
  RAISE NOTICE '2. Criação de conjunto mínimo de políticas eficientes';
  RAISE NOTICE '3. Eliminação de dependências de funções que podem causar ciclos';
  RAISE NOTICE '================================================================';
END;
$$;
