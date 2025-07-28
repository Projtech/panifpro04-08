-- =====================================================
-- FASE 2: EXPANSÃO DO RLS PARA SUPORTE A CONSULTORES
-- Sistema Multi-Empresa com Usuários Consultores
-- =====================================================

-- Este script expande o RLS atual para suportar:
-- 1. Usuários consultores que podem acessar múltiplas empresas
-- 2. Políticas específicas para o role 'consultant'
-- 3. Manutenção da segurança por empresa
-- 4. Flexibilidade para acesso multi-empresa controlado

-- =====================================================
-- 1. ANÁLISE DO SISTEMA ATUAL
-- =====================================================

-- Verificar roles existentes na tabela company_users
DO $$
BEGIN
    RAISE NOTICE '=== ANÁLISE DO SISTEMA ATUAL ===';
    RAISE NOTICE 'Verificando roles existentes na tabela company_users...';
END $$;

-- Consultar roles únicos existentes
SELECT DISTINCT role, COUNT(*) as quantidade
FROM public.company_users 
GROUP BY role 
ORDER BY role;

-- Verificar status únicos existentes
SELECT DISTINCT status, COUNT(*) as quantidade
FROM public.company_users 
GROUP BY status 
ORDER BY status;

-- =====================================================
-- 2. CRIAÇÃO DE CONSTRAINTS PARA ROLES E STATUS
-- =====================================================

-- Adicionar constraint para roles válidos (incluindo consultant)
DO $$
BEGIN
    -- Remover constraint existente se houver
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'company_users_role_check') THEN
        ALTER TABLE public.company_users DROP CONSTRAINT company_users_role_check;
        RAISE NOTICE 'Constraint de role existente removida';
    END IF;
    
    -- Criar nova constraint com roles expandidos
    ALTER TABLE public.company_users 
    ADD CONSTRAINT company_users_role_check 
    CHECK (role IN ('admin', 'owner', 'user', 'consultant'));
    
    RAISE NOTICE 'Constraint de role criada: admin, owner, user, consultant';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao criar constraint de role: %', SQLERRM;
END $$;

-- Adicionar constraint para status válidos
DO $$
BEGIN
    -- Remover constraint existente se houver
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'company_users_status_check') THEN
        ALTER TABLE public.company_users DROP CONSTRAINT company_users_status_check;
        RAISE NOTICE 'Constraint de status existente removida';
    END IF;
    
    -- Criar nova constraint para status
    ALTER TABLE public.company_users 
    ADD CONSTRAINT company_users_status_check 
    CHECK (status IN ('active', 'inactive', 'pending'));
    
    RAISE NOTICE 'Constraint de status criada: active, inactive, pending';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao criar constraint de status: %', SQLERRM;
END $$;

-- =====================================================
-- 3. POLÍTICAS RLS PARA CONSULTORES
-- =====================================================

-- Política específica para consultores: podem ver dados de todas as empresas onde têm acesso
CREATE POLICY "consultants_multi_company_access" ON public.company_users
    FOR SELECT
    USING (
        -- Consultores podem ver registros de qualquer empresa onde tenham acesso ativo
        EXISTS (
            SELECT 1 FROM public.company_users consultant_check
            WHERE consultant_check.user_id = auth.uid()
            AND consultant_check.role = 'consultant'
            AND consultant_check.status = 'active'
            AND consultant_check.company_id = company_users.company_id
        )
    );

-- Política para consultores gerenciarem usuários (limitada)
CREATE POLICY "consultants_limited_management" ON public.company_users
    FOR UPDATE
    USING (
        -- Consultores podem atualizar apenas registros de usuários comuns (não admins/owners)
        -- nas empresas onde têm acesso
        EXISTS (
            SELECT 1 FROM public.company_users consultant_check
            WHERE consultant_check.user_id = auth.uid()
            AND consultant_check.role = 'consultant'
            AND consultant_check.status = 'active'
            AND consultant_check.company_id = company_users.company_id
        )
        AND company_users.role NOT IN ('admin', 'owner', 'consultant')
    )
    WITH CHECK (
        -- Consultores não podem alterar roles para admin/owner
        role NOT IN ('admin', 'owner')
    );

-- =====================================================
-- 4. FUNÇÃO PARA GERENCIAR ACESSO DE CONSULTORES
-- =====================================================

-- Função para adicionar consultor a uma empresa
CREATE OR REPLACE FUNCTION public.add_consultant_to_company(
    consultant_user_id UUID,
    target_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se o usuário atual é admin/owner da empresa ou superadmin
    IF NOT (
        EXISTS (
            SELECT 1 FROM public.company_users
            WHERE user_id = auth.uid()
            AND company_id = target_company_id
            AND role IN ('admin', 'owner')
            AND status = 'active'
        )
        OR
        auth.jwt() ->> 'email' IN (
            'jcesar.projtech@gmail.com',
            'admin@panifpro.com'
        )
    ) THEN
        RAISE EXCEPTION 'Acesso negado: apenas admins/owners da empresa ou superadmins podem adicionar consultores';
    END IF;
    
    -- Inserir ou atualizar o acesso do consultor
    INSERT INTO public.company_users (user_id, company_id, role, status)
    VALUES (consultant_user_id, target_company_id, 'consultant', 'active')
    ON CONFLICT (user_id, company_id) 
    DO UPDATE SET 
        role = 'consultant',
        status = 'active';
    
    RETURN TRUE;
END;
$$;

-- Função para remover consultor de uma empresa
CREATE OR REPLACE FUNCTION public.remove_consultant_from_company(
    consultant_user_id UUID,
    target_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se o usuário atual é admin/owner da empresa ou superadmin
    IF NOT (
        EXISTS (
            SELECT 1 FROM public.company_users
            WHERE user_id = auth.uid()
            AND company_id = target_company_id
            AND role IN ('admin', 'owner')
            AND status = 'active'
        )
        OR
        auth.jwt() ->> 'email' IN (
            'jcesar.projtech@gmail.com',
            'admin@panifpro.com'
        )
    ) THEN
        RAISE EXCEPTION 'Acesso negado: apenas admins/owners da empresa ou superadmins podem remover consultores';
    END IF;
    
    -- Remover o acesso do consultor
    DELETE FROM public.company_users
    WHERE user_id = consultant_user_id
    AND company_id = target_company_id
    AND role = 'consultant';
    
    RETURN TRUE;
END;
$$;

-- Função para listar empresas de um consultor
CREATE OR REPLACE FUNCTION public.get_consultant_companies(
    consultant_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE(
    company_id UUID,
    company_name TEXT,
    access_status TEXT,
    granted_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se o usuário pode ver essas informações
    IF consultant_user_id != auth.uid() AND NOT (
        auth.jwt() ->> 'email' IN (
            'jcesar.projtech@gmail.com',
            'admin@panifpro.com'
        )
    ) THEN
        RAISE EXCEPTION 'Acesso negado: você só pode ver suas próprias empresas';
    END IF;
    
    RETURN QUERY
    SELECT 
        cu.company_id,
        c.name as company_name,
        cu.status as access_status,
        cu.created_at as granted_at
    FROM public.company_users cu
    JOIN public.companies c ON c.id = cu.company_id
    WHERE cu.user_id = consultant_user_id
    AND cu.role = 'consultant'
    ORDER BY c.name;
END;
$$;

-- =====================================================
-- 5. ATUALIZAÇÃO DA FUNÇÃO get_active_company_for_user
-- =====================================================

-- Atualizar a função para lidar com consultores que têm múltiplas empresas
CREATE OR REPLACE FUNCTION public.get_active_company_for_user_with_consultants(
    user_uuid UUID
)
RETURNS TABLE(
    role TEXT,
    company JSON,
    available_companies JSON[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_companies_count INTEGER;
    primary_company_data JSON;
    all_companies JSON[];
BEGIN
    -- Contar quantas empresas o usuário tem acesso
    SELECT COUNT(*) INTO user_companies_count
    FROM public.company_users cu
    WHERE cu.user_id = user_uuid
    AND cu.status = 'active';
    
    -- Se não tem acesso a nenhuma empresa
    IF user_companies_count = 0 THEN
        RETURN;
    END IF;
    
    -- Buscar todas as empresas do usuário
    SELECT array_agg(
        json_build_object(
            'id', c.id,
            'name', c.name,
            'role', cu.role,
            'status', cu.status
        )
    ) INTO all_companies
    FROM public.company_users cu
    JOIN public.companies c ON c.id = cu.company_id
    WHERE cu.user_id = user_uuid
    AND cu.status = 'active'
    ORDER BY 
        CASE cu.role 
            WHEN 'owner' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'consultant' THEN 3
            WHEN 'user' THEN 4
        END,
        c.name;
    
    -- Para consultores, retornar a primeira empresa como primária
    -- Para outros roles, usar a lógica existente
    SELECT 
        cu.role,
        json_build_object(
            'id', c.id,
            'name', c.name
        )
    INTO role, primary_company_data
    FROM public.company_users cu
    JOIN public.companies c ON c.id = cu.company_id
    WHERE cu.user_id = user_uuid
    AND cu.status = 'active'
    ORDER BY 
        CASE cu.role 
            WHEN 'owner' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'consultant' THEN 3
            WHEN 'user' THEN 4
        END,
        c.name
    LIMIT 1;
    
    RETURN QUERY SELECT role, primary_company_data, all_companies;
END;
$$;

-- =====================================================
-- 6. ÍNDICES PARA OTIMIZAÇÃO
-- =====================================================

-- Índice para consultas de consultores
CREATE INDEX IF NOT EXISTS idx_company_users_consultant_access 
ON public.company_users (user_id, role, status) 
WHERE role = 'consultant' AND status = 'active';

-- Índice para consultas multi-empresa
CREATE INDEX IF NOT EXISTS idx_company_users_multi_company 
ON public.company_users (company_id, role, status);

-- =====================================================
-- 7. TESTES DAS NOVAS FUNCIONALIDADES
-- =====================================================

CREATE OR REPLACE FUNCTION test_consultant_policies()
RETURNS TABLE(
    test_name TEXT,
    success BOOLEAN,
    description TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Teste 1: Verificar se constraints foram criadas
    RETURN QUERY
    SELECT 
        'Constraint de roles'::text,
        EXISTS(SELECT 1 FROM pg_constraint WHERE conname = 'company_users_role_check'),
        'Constraint deve permitir roles: admin, owner, user, consultant'::text;
    
    -- Teste 2: Verificar se políticas de consultor foram criadas
    RETURN QUERY
    SELECT 
        'Políticas de consultor'::text,
        EXISTS(SELECT 1 FROM pg_policies WHERE policyname = 'consultants_multi_company_access'),
        'Política de acesso multi-empresa para consultores deve existir'::text;
    
    -- Teste 3: Verificar se funções de gerenciamento foram criadas
    RETURN QUERY
    SELECT 
        'Funções de gerenciamento'::text,
        EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'add_consultant_to_company'),
        'Função para adicionar consultores deve existir'::text;
    
    -- Teste 4: Verificar se função expandida foi criada
    RETURN QUERY
    SELECT 
        'Função expandida'::text,
        EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_active_company_for_user_with_consultants'),
        'Função para lidar com consultores multi-empresa deve existir'::text;
END;
$$;

-- Executar testes
SELECT * FROM test_consultant_policies();

-- =====================================================
-- 8. DOCUMENTAÇÃO E EXEMPLOS DE USO
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=== FASE 2 CONCLUÍDA: SUPORTE A CONSULTORES ==='; 
    RAISE NOTICE '';
    RAISE NOTICE '✅ FUNCIONALIDADES ADICIONADAS:';
    RAISE NOTICE '   • Role "consultant" adicionado aos constraints';
    RAISE NOTICE '   • Políticas RLS para acesso multi-empresa de consultores';
    RAISE NOTICE '   • Funções para gerenciar acesso de consultores';
    RAISE NOTICE '   • Função expandida para lidar com múltiplas empresas';
    RAISE NOTICE '   • Índices otimizados para consultas multi-empresa';
    RAISE NOTICE '';
    RAISE NOTICE '📋 COMO USAR:';
    RAISE NOTICE '   1. Para adicionar consultor a uma empresa:';
    RAISE NOTICE '      SELECT add_consultant_to_company(''user_uuid'', ''company_uuid'');';
    RAISE NOTICE '';
    RAISE NOTICE '   2. Para remover consultor de uma empresa:';
    RAISE NOTICE '      SELECT remove_consultant_from_company(''user_uuid'', ''company_uuid'');';
    RAISE NOTICE '';
    RAISE NOTICE '   3. Para listar empresas de um consultor:';
    RAISE NOTICE '      SELECT * FROM get_consultant_companies(''user_uuid'');';
    RAISE NOTICE '';
    RAISE NOTICE '   4. Para usar a função expandida no frontend:';
    RAISE NOTICE '      SELECT * FROM get_active_company_for_user_with_consultants(''user_uuid'');';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 SEGURANÇA:';
    RAISE NOTICE '   • Consultores só podem ver/editar dados das empresas onde têm acesso';
    RAISE NOTICE '   • Consultores não podem alterar admins/owners';
    RAISE NOTICE '   • Apenas admins/owners podem adicionar/remover consultores';
    RAISE NOTICE '   • Superadmins mantêm acesso total';
    RAISE NOTICE '';
    RAISE NOTICE '⚡ PRÓXIMOS PASSOS:';
    RAISE NOTICE '   1. Atualizar frontend para suportar seleção de empresa para consultores';
    RAISE NOTICE '   2. Implementar interface de gerenciamento de consultores';
    RAISE NOTICE '   3. Testar todas as funcionalidades em ambiente de desenvolvimento';
END $$;