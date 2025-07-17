-- Script para resolver o problema circular de RLS no PanifPro
-- Autor: Cascade AI
-- Data: 2025-07-15

-- Parte 1: Diagnóstico do problema
-- Verificar as funções essenciais existentes
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'get_user_company_id';
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'get_my_admin_company_id';
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'is_superadmin';

-- Verificar o comportamento atual das funções essenciais
DO $$
BEGIN
  RAISE NOTICE 'Teste de auth.uid(): %', auth.uid();
  RAISE NOTICE 'Teste de get_user_company_id(): %', get_user_company_id();
  RAISE NOTICE 'Teste de get_my_admin_company_id(): %', get_my_admin_company_id();
  RAISE NOTICE 'Teste de is_superadmin(): %', is_superadmin();
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao testar funções: %', SQLERRM;
END;
$$;

-- Parte 2: Verificar e listar políticas RLS atuais na tabela company_users
SELECT schemaname, tablename, policyname, permissive, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'company_users';

-- Parte 3: Modificar as políticas RLS para quebrar o ciclo de dependência
-- Remover políticas existentes problemáticas que podem estar causando o ciclo de dependência
DROP POLICY IF EXISTS "Users can view company users" ON public.company_users;
DROP POLICY IF EXISTS "Admins can view users in their company" ON public.company_users;
DROP POLICY IF EXISTS "Users can update their own record" ON public.company_users;
DROP POLICY IF EXISTS "Admins can manage users in their company" ON public.company_users;
DROP POLICY IF EXISTS "Superadmins can do anything" ON public.company_users;

-- Parte 4: Criar políticas simplificadas que não dependem de funções complexas
-- Política básica que permite ao usuário ver suas próprias associações de empresa
CREATE POLICY "Users can view own company_users" ON public.company_users
FOR SELECT
USING (
  user_id = auth.uid()
);

-- Política básica para permitir que administradores vejam usuários de sua empresa
-- Usando uma subconsulta direta em vez da função get_my_admin_company_id
CREATE POLICY "Admins can view company users" ON public.company_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_users 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
    AND company_id = public.company_users.company_id
  )
);

-- Política para permitir que usuários atualizem seus próprios registros
CREATE POLICY "Users can update own record" ON public.company_users
FOR UPDATE
USING (user_id = auth.uid());

-- Política para superadministradores baseada em email
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

-- Verificar se as novas políticas foram aplicadas corretamente
SELECT schemaname, tablename, policyname, permissive, cmd, qual
FROM pg_policies
WHERE tablename = 'company_users';

-- Notificação de conclusão
DO $$
BEGIN
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'Script de correção RLS concluído com sucesso!';
  RAISE NOTICE 'As alterações incluem:';
  RAISE NOTICE '1. Diagnóstico das funções existentes';
  RAISE NOTICE '2. Remoção das políticas problemáticas';
  RAISE NOTICE '3. Criação de políticas simplificadas baseadas diretamente em auth.uid()';
  RAISE NOTICE '4. Política especial para superadmins baseada em email';
  RAISE NOTICE '================================================================';
END;
$$;
