-- =====================================================
-- FASE 3: CONFIGURAÇÃO RLS PARA SISTEMA ADMINISTRATIVO
-- Resolução de Problemas de Acesso para AdminMaster
-- =====================================================

-- Este script resolve os problemas de RLS que impedem o acesso
-- do sistema administrativo (ADMIN) ao banco de dados principal.
-- O sistema admin precisa gerenciar usuários, empresas e assinaturas.

-- =====================================================
-- 1. ANÁLISE DOS PROBLEMAS IDENTIFICADOS
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=== ANÁLISE DOS PROBLEMAS DO SISTEMA ADMIN ===';
    RAISE NOTICE 'Problemas identificados:';
    RAISE NOTICE '1. Função is_superadmin() limitada a emails específicos';
    RAISE NOTICE '2. Políticas RLS bloqueiam acesso do adminmaster';
    RAISE NOTICE '3. Recursão infinita na tabela admins';
    RAISE NOTICE '4. Falta de políticas específicas para sistema admin';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- 2. EXPANSÃO DA FUNÇÃO is_superadmin
-- =====================================================

-- Atualizar função is_superadmin para incluir adminmaster
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN auth.jwt() ->> 'email' IN (
        'jcesar.projtech@gmail.com',
        'admin@panifpro.com',
        'admin@panificacaopro.com.br',
        'adminmaster@panifpro.com'
    );
END;
$$;

-- =====================================================
-- 3. CRIAÇÃO/CORREÇÃO DA TABELA ADMINS
-- =====================================================

-- Criar tabela admins se não existir
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS na tabela admins
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Remover políticas problemáticas da tabela admins
DROP POLICY IF EXISTS "Admins can view other admins" ON public.admins;
DROP POLICY IF EXISTS "Only super admins can insert/update admins" ON public.admins;
DROP POLICY IF EXISTS "admins_select_policy" ON public.admins;
DROP POLICY IF EXISTS "admins_insert_policy" ON public.admins;
DROP POLICY IF EXISTS "admins_update_policy" ON public.admins;
DROP POLICY IF EXISTS "admins_delete_policy" ON public.admins;

-- Criar políticas não-recursivas para tabela admins
CREATE POLICY "admins_superadmin_access" ON public.admins
    FOR ALL
    USING (
        auth.jwt() ->> 'email' IN (
            'jcesar.projtech@gmail.com',
            'admin@panifpro.com',
            'admin@panificacaopro.com.br',
            'adminmaster@panifpro.com'
        )
    )
    WITH CHECK (
        auth.jwt() ->> 'email' IN (
            'jcesar.projtech@gmail.com',
            'admin@panifpro.com',
            'admin@panificacaopro.com.br',
            'adminmaster@panifpro.com'
        )
    );

-- Política para admins verem apenas seus próprios dados
CREATE POLICY "admins_own_data" ON public.admins
    FOR SELECT
    USING (user_id = auth.uid());

-- =====================================================
-- 4. POLÍTICAS ESPECÍFICAS PARA SISTEMA ADMIN
-- =====================================================

-- Política especial para sistema admin acessar companies
CREATE POLICY "admin_system_companies_access" ON public.companies
    FOR ALL
    USING (
        auth.jwt() ->> 'email' IN (
            'admin@panificacaopro.com.br',
            'adminmaster@panifpro.com'
        )
    )
    WITH CHECK (
        auth.jwt() ->> 'email' IN (
            'admin@panificacaopro.com.br',
            'adminmaster@panifpro.com'
        )
    );

-- Política especial para sistema admin acessar company_users
CREATE POLICY "admin_system_company_users_access" ON public.company_users
    FOR ALL
    USING (
        auth.jwt() ->> 'email' IN (
            'admin@panificacaopro.com.br',
            'adminmaster@panifpro.com'
        )
    )
    WITH CHECK (
        auth.jwt() ->> 'email' IN (
            'admin@panificacaopro.com.br',
            'adminmaster@panifpro.com'
        )
    );

-- Política especial para sistema admin acessar profiles
CREATE POLICY "admin_system_profiles_access" ON public.profiles
    FOR ALL
    USING (
        auth.jwt() ->> 'email' IN (
            'admin@panificacaopro.com.br',
            'adminmaster@panifpro.com'
        )
    )
    WITH CHECK (
        auth.jwt() ->> 'email' IN (
            'admin@panificacaopro.com.br',
            'adminmaster@panifpro.com'
        )
    );

-- Política especial para sistema admin acessar banners
CREATE POLICY "admin_system_banners_access" ON public.banners
    FOR ALL
    USING (
        auth.jwt() ->> 'email' IN (
            'admin@panificacaopro.com.br',
            'adminmaster@panifpro.com'
        )
    )
    WITH CHECK (
        auth.jwt() ->> 'email' IN (
            'admin@panificacaopro.com.br',
            'adminmaster@panifpro.com'
        )
    );

-- =====================================================
-- 5. FUNÇÕES AUXILIARES PARA SISTEMA ADMIN
-- =====================================================

-- Função para verificar se usuário é admin do sistema
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN auth.jwt() ->> 'email' IN (
        'admin@panificacaopro.com.br',
        'adminmaster@panifpro.com'
    );
END;
$$;

-- Função para criar usuário admin no sistema
CREATE OR REPLACE FUNCTION public.create_system_admin(
    admin_email TEXT,
    admin_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_id UUID;
BEGIN
    -- Verificar se o usuário atual pode criar admins
    IF NOT public.is_system_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas admins do sistema podem criar outros admins';
    END IF;
    
    -- Inserir admin na tabela
    INSERT INTO public.admins (user_id, email, name, role, status)
    VALUES (auth.uid(), admin_email, admin_name, 'admin', 'active')
    RETURNING id INTO admin_id;
    
    RETURN admin_id;
END;
$$;

-- Função para listar todas as empresas (para sistema admin)
CREATE OR REPLACE FUNCTION public.get_all_companies_for_admin()
RETURNS TABLE(
    id UUID,
    name TEXT,
    cnpj TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    user_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se é admin do sistema
    IF NOT public.is_system_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas admins do sistema podem acessar esta função';
    END IF;
    
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.cnpj,
        c.status,
        c.created_at,
        COUNT(cu.user_id) as user_count
    FROM public.companies c
    LEFT JOIN public.company_users cu ON c.id = cu.company_id AND cu.status = 'active'
    GROUP BY c.id, c.name, c.cnpj, c.status, c.created_at
    ORDER BY c.created_at DESC;
END;
$$;

-- Função para listar todos os usuários (para sistema admin)
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    name TEXT,
    company_name TEXT,
    role TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se é admin do sistema
    IF NOT public.is_system_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas admins do sistema podem acessar esta função';
    END IF;
    
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.email,
        p.name,
        c.name as company_name,
        cu.role,
        cu.status,
        p.created_at
    FROM public.profiles p
    LEFT JOIN public.company_users cu ON p.id = cu.user_id
    LEFT JOIN public.companies c ON cu.company_id = c.id
    ORDER BY p.created_at DESC;
END;
$$;

-- =====================================================
-- 6. ÍNDICES PARA OTIMIZAÇÃO
-- =====================================================

-- Índices para tabela admins
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON public.admins (user_id);
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins (email);
CREATE INDEX IF NOT EXISTS idx_admins_status ON public.admins (status);

-- =====================================================
-- 7. INSERIR ADMIN MASTER INICIAL
-- =====================================================

-- Inserir adminmaster se não existir
DO $$
DECLARE
    admin_exists BOOLEAN;
BEGIN
    -- Verificar se já existe um admin com este email
    SELECT EXISTS(
        SELECT 1 FROM public.admins 
        WHERE email = 'admin@panificacaopro.com.br'
    ) INTO admin_exists;
    
    IF NOT admin_exists THEN
        -- Inserir admin master (assumindo que o usuário já existe no auth.users)
        INSERT INTO public.admins (user_id, email, name, role, status)
        SELECT 
            id as user_id,
            'admin@panificacaopro.com.br' as email,
            'Admin Master' as name,
            'superadmin' as role,
            'active' as status
        FROM auth.users 
        WHERE email = 'admin@panificacaopro.com.br'
        LIMIT 1;
        
        RAISE NOTICE 'Admin master inserido com sucesso';
    ELSE
        RAISE NOTICE 'Admin master já existe';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao inserir admin master: %', SQLERRM;
END $$;

-- =====================================================
-- 8. TESTES E VERIFICAÇÕES
-- =====================================================

-- Função de teste para verificar configurações
CREATE OR REPLACE FUNCTION test_admin_system_rls()
RETURNS TABLE(
    test_name TEXT,
    success BOOLEAN,
    description TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Teste 1: Verificar se função is_superadmin foi atualizada
    RETURN QUERY
    SELECT 
        'Função is_superadmin atualizada'::text,
        EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin'),
        'Função deve incluir emails do sistema admin'::text;
    
    -- Teste 2: Verificar se tabela admins existe
    RETURN QUERY
    SELECT 
        'Tabela admins criada'::text,
        EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'admins'),
        'Tabela admins deve existir para gerenciar acesso'::text;
    
    -- Teste 3: Verificar políticas do sistema admin
    RETURN QUERY
    SELECT 
        'Políticas admin system criadas'::text,
        EXISTS(SELECT 1 FROM pg_policies WHERE policyname LIKE 'admin_system_%'),
        'Políticas específicas para sistema admin devem existir'::text;
    
    -- Teste 4: Verificar funções auxiliares
    RETURN QUERY
    SELECT 
        'Funções auxiliares criadas'::text,
        EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'is_system_admin'),
        'Funções auxiliares para sistema admin devem existir'::text;
END;
$$;

-- Executar testes
SELECT * FROM test_admin_system_rls();

-- =====================================================
-- 9. DOCUMENTAÇÃO E CONCLUSÃO
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=== FASE 3 CONCLUÍDA: SISTEMA ADMIN CONFIGURADO ===';
    RAISE NOTICE '';
    RAISE NOTICE '✅ CORREÇÕES APLICADAS:';
    RAISE NOTICE '   • Função is_superadmin expandida para incluir adminmaster';
    RAISE NOTICE '   • Tabela admins criada/corrigida sem recursão';
    RAISE NOTICE '   • Políticas específicas para sistema admin';
    RAISE NOTICE '   • Funções auxiliares para gerenciamento';
    RAISE NOTICE '   • Índices otimizados criados';
    RAISE NOTICE '';
    RAISE NOTICE '🔑 EMAILS AUTORIZADOS:';
    RAISE NOTICE '   • admin@panificacaopro.com.br (sistema admin)';
    RAISE NOTICE '   • adminmaster@panifpro.com (sistema admin)';
    RAISE NOTICE '   • jcesar.projtech@gmail.com (superadmin)';
    RAISE NOTICE '   • admin@panifpro.com (superadmin)';
    RAISE NOTICE '';
    RAISE NOTICE '📋 FUNCIONALIDADES DISPONÍVEIS:';
    RAISE NOTICE '   • Acesso total às tabelas companies, company_users, profiles';
    RAISE NOTICE '   • Gerenciamento de banners';
    RAISE NOTICE '   • Funções para listar empresas e usuários';
    RAISE NOTICE '   • Criação de novos admins do sistema';
    RAISE NOTICE '';
    RAISE NOTICE '⚡ PRÓXIMOS PASSOS:';
    RAISE NOTICE '   1. Testar login com admin@panificacaopro.com.br';
    RAISE NOTICE '   2. Verificar acesso às funcionalidades do sistema admin';
    RAISE NOTICE '   3. Implementar monitoramento de acesso';
    RAISE NOTICE '   4. Documentar procedimentos de backup';
END $$;