-- Script para solução definitiva do problema de recursão no join
-- Autor: Cascade AI
-- Data: 2025-07-15

-- Este script cria uma solução que contorna completamente o problema de recursão
-- fornecendo uma função de acesso segura que será usada pelo aplicativo

-- Parte 1: Vamos verificar o status atual das políticas RLS (corrigido)
SELECT pg_class.relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
WHERE nspname = 'public' AND relkind = 'r' AND relname = 'company_users';

-- Parte 2: Criar uma função SECURITY DEFINER que contorna o RLS
-- Esta função permite buscar dados de company_users de forma segura
CREATE OR REPLACE FUNCTION public.get_user_company_data(user_uuid uuid)
RETURNS TABLE (
  role text,
  company_id uuid,
  company_name text
) AS $$
BEGIN
  -- Esta função contorna o RLS por ser SECURITY DEFINER
  RETURN QUERY
  SELECT 
    cu.role,
    c.id AS company_id,
    c.name AS company_name
  FROM 
    public.company_users cu
    JOIN public.companies c ON cu.company_id = c.id
  WHERE 
    cu.user_id = user_uuid
    AND cu.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Parte 3: Criar uma API REST para acessar esta função
-- Esta API será usada pelo aplicativo em vez da chamada direta à tabela
CREATE OR REPLACE FUNCTION public.get_active_company_for_user(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'role', role,
    'company', jsonb_build_object(
      'id', company_id,
      'name', company_name
    )
  ) INTO result
  FROM public.get_user_company_data(user_uuid);

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Parte 4: Instruções de uso para modificação do código do aplicativo
DO $$
BEGIN
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'SOLUÇÃO DE CONTORNO IMPLEMENTADA!';
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'Para resolver o problema, faça as seguintes alterações no código:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Abra o arquivo: D:\PanifPRO\PanfPro v 1.0\src\contexts\AuthContext.tsx';
  RAISE NOTICE '';
  RAISE NOTICE '2. Localize o trecho onde busca company_users (aproximadamente linha 201)';
  RAISE NOTICE '';
  RAISE NOTICE '3. Substitua o código:';
  RAISE NOTICE 'const { data: companyUserData, error: companyError } = await supabase';
  RAISE NOTICE '  .from("company_users")';
  RAISE NOTICE '  .select("role,company:company_id(id,name)")';
  RAISE NOTICE '  .eq("user_id", user.id)';
  RAISE NOTICE '  .eq("status", "active")';
  RAISE NOTICE '  .limit(1)';
  RAISE NOTICE '  .single();';
  RAISE NOTICE '';
  RAISE NOTICE '4. Pelo novo código que usa a função segura:';
  RAISE NOTICE 'const { data: companyUserData, error: companyError } = await supabase';
  RAISE NOTICE '  .rpc("get_active_company_for_user", { user_uuid: user.id })';
  RAISE NOTICE '  .single();';
  RAISE NOTICE '';
  RAISE NOTICE '5. Mantenha o restante da lógica que usa companyUserData e companyError';
  RAISE NOTICE '================================================================';
END;
$$;
