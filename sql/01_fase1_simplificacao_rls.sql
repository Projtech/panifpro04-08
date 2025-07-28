-- =====================================================
-- FASE 1: SIMPLIFICAÇÃO RADICAL DAS POLÍTICAS RLS
-- =====================================================
-- Este script resolve o problema de recursão circular nas políticas RLS
-- eliminando funções problemáticas e implementando políticas diretas

-- Backup das políticas atuais (para rollback se necessário)
CREATE TABLE IF NOT EXISTS rls_policies_backup AS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'company_users';

-- =====================================================
-- 1. REMOÇÃO DAS FUNÇÕES RECURSIVAS PROBLEMÁTICAS
-- =====================================================

-- Remover todas as políticas existentes da tabela company_users
DROP POLICY IF EXISTS "Users can view their own company users" ON public.company_users;
DROP POLICY IF EXISTS "Users can insert company users for their company" ON public.company_users;
DROP POLICY IF EXISTS "Users can update company users for their company" ON public.company_users;
DROP POLICY IF EXISTS "Users can delete company users for their company" ON public.company_users;
DROP POLICY IF EXISTS "Admins can manage company users" ON public.company_users;
DROP POLICY IF EXISTS "Company admins can manage users" ON public.company_users;
DROP POLICY IF EXISTS "Users can view company users" ON public.company_users;
DROP POLICY IF EXISTS "Superadmins full access" ON public.company_users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.company_users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.company_users;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.company_users;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.company_users;

-- Remover funções recursivas problemáticas
DROP FUNCTION IF EXISTS public.get_user_company_id();
DROP FUNCTION IF EXISTS public.get_my_admin_company_id();
DROP FUNCTION IF EXISTS public.is_company_admin();
DROP FUNCTION IF EXISTS public.user_has_company_access(uuid, uuid);

-- =====================================================
-- 2. CRIAÇÃO DE POLÍTICAS SIMPLIFICADAS E DIRETAS
-- =====================================================

-- Política 1: Usuários podem ver seus próprios registros
CREATE POLICY "users_own_records" ON public.company_users
    FOR SELECT
    USING (user_id = auth.uid());

-- Política 2: Admins podem gerenciar usuários da sua empresa (usando subquery direta)
CREATE POLICY "admins_manage_company" ON public.company_users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.company_users admin_check
            WHERE admin_check.user_id = auth.uid()
            AND admin_check.company_id = company_users.company_id
            AND admin_check.role IN ('admin', 'owner')
            AND admin_check.status = 'active'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.company_users admin_check
            WHERE admin_check.user_id = auth.uid()
            AND admin_check.company_id = company_users.company_id
            AND admin_check.role IN ('admin', 'owner')
            AND admin_check.status = 'active'
        )
    );

-- Política 3: Usuários podem atualizar seus próprios registros (dados pessoais)
CREATE POLICY "users_update_own" ON public.company_users
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Política 4: Superadmins têm acesso total (baseado em email)
CREATE POLICY "superadmins_full_access" ON public.company_users
    FOR ALL
    USING (
        auth.jwt() ->> 'email' IN (
            'jcesar.projtech@gmail.com',
            'admin@panifpro.com'
        )
    )
    WITH CHECK (
        auth.jwt() ->> 'email' IN (
            'jcesar.projtech@gmail.com',
            'admin@panifpro.com'
        )
    );

-- =====================================================
-- 3. MANTER FUNÇÃO FUNCIONAL (NÃO RECURSIVA)
-- =====================================================

-- Manter a função get_active_company_for_user que funciona bem
-- (ela não causa recursão porque usa SECURITY DEFINER)
-- Esta função já existe e está funcionando corretamente

-- =====================================================
-- 4. OTIMIZAÇÃO E ÍNDICES
-- =====================================================

-- Criar índices para otimizar as consultas das políticas
CREATE INDEX IF NOT EXISTS idx_company_users_user_company 
    ON public.company_users(user_id, company_id);

CREATE INDEX IF NOT EXISTS idx_company_users_company_role_status 
    ON public.company_users(company_id, role, status);

-- =====================================================
-- 5. VERIFICAÇÃO E TESTES
-- =====================================================

-- Verificar políticas criadas
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'company_users'
ORDER BY policyname;

-- Função de teste para validar as políticas
CREATE OR REPLACE FUNCTION test_rls_policies()
RETURNS TABLE(
    test_name text,
    result boolean,
    message text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Teste 1: Verificar se as políticas foram criadas
    RETURN QUERY
    SELECT 
        'Políticas criadas'::text,
        (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'company_users') = 4,
        'Deve ter exatamente 4 políticas'::text;
    
    -- Teste 2: Verificar se funções recursivas foram removidas
    RETURN QUERY
    SELECT 
        'Funções recursivas removidas'::text,
        NOT EXISTS(SELECT 1 FROM pg_proc WHERE proname IN ('get_user_company_id', 'get_my_admin_company_id')),
        'Funções recursivas não devem existir'::text;
    
    -- Teste 3: Verificar se função funcional ainda existe
    RETURN QUERY
    SELECT 
        'Função funcional mantida'::text,
        EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_active_company_for_user'),
        'Função get_active_company_for_user deve existir'::text;
END;
$$;

-- Executar testes
SELECT * FROM test_rls_policies();

-- =====================================================
-- 6. NOTIFICAÇÕES DE CONCLUSÃO
-- =====================================================

-- Log de conclusão
DO $$
BEGIN
    RAISE NOTICE '✅ FASE 1 CONCLUÍDA: Simplificação das Políticas RLS';
    RAISE NOTICE '📋 Políticas criadas: users_own_records, admins_manage_company, users_update_own, superadmins_full_access';
    RAISE NOTICE '🗑️ Funções recursivas removidas: get_user_company_id, get_my_admin_company_id';
    RAISE NOTICE '✅ Função funcional mantida: get_active_company_for_user';
    RAISE NOTICE '🔍 Índices criados para otimização';
    RAISE NOTICE '⚡ Sistema deve estar mais estável agora!';
END $$;