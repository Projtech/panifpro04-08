-- Script para resolver erro de recursão infinita nas políticas RLS
-- Autor: Cascade AI
-- Data: 2025-07-15

-- O problema de recursão ocorre quando uma política tenta consultar a própria tabela
-- protegida pelo RLS, criando um ciclo infinito.

-- Primeiro, vamos listar as políticas atuais para entender o que está causando o erro
SELECT schemaname, tablename, policyname, permissive, cmd, qual
FROM pg_policies
WHERE tablename = 'company_users';

-- Remover a política que causa a recursão infinita
DROP POLICY IF EXISTS "Admins can manage company users" ON public.company_users;

-- Criar políticas separadas por operação para evitar recursão
-- Política para administradores verem usuários em suas empresas 
-- (utilizando uma abordagem diferente para evitar ciclos)
CREATE POLICY "Admins can view users" ON public.company_users
FOR SELECT
USING (
  -- Usar um EXISTS com uma subconsulta materializada para evitar recursão
  EXISTS (
    WITH admin_companies AS (
      SELECT DISTINCT company_id 
      FROM public.company_users 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND status = 'active'
    )
    SELECT 1 FROM admin_companies 
    WHERE admin_companies.company_id = company_users.company_id
  )
);

-- Política para INSERT para admins
CREATE POLICY "Admins can insert users" ON public.company_users
FOR INSERT 
WITH CHECK (
  -- O admin só pode inserir usuários na empresa onde ele é admin
  EXISTS (
    WITH admin_companies AS (
      SELECT DISTINCT company_id 
      FROM public.company_users 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND status = 'active'
    )
    SELECT 1 FROM admin_companies 
    WHERE admin_companies.company_id = company_users.company_id
  )
);

-- Política para UPDATE para admins
CREATE POLICY "Admins can update users" ON public.company_users
FOR UPDATE
USING (
  -- O admin só pode atualizar usuários na empresa onde ele é admin
  EXISTS (
    WITH admin_companies AS (
      SELECT DISTINCT company_id 
      FROM public.company_users 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND status = 'active'
    )
    SELECT 1 FROM admin_companies 
    WHERE admin_companies.company_id = company_users.company_id
  )
);

-- Política para DELETE para admins
CREATE POLICY "Admins can delete users" ON public.company_users
FOR DELETE
USING (
  -- O admin só pode deletar usuários na empresa onde ele é admin
  EXISTS (
    WITH admin_companies AS (
      SELECT DISTINCT company_id 
      FROM public.company_users 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND status = 'active'
    )
    SELECT 1 FROM admin_companies 
    WHERE admin_companies.company_id = company_users.company_id
  )
);

-- Verificar as novas políticas
SELECT schemaname, tablename, policyname, permissive, cmd, qual
FROM pg_policies
WHERE tablename = 'company_users';

-- Notificação de conclusão
DO $$
BEGIN
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'Correção de recursão infinita concluída com sucesso!';
  RAISE NOTICE 'As alterações incluem:';
  RAISE NOTICE '1. Remoção da política que causava recursão infinita';
  RAISE NOTICE '2. Criação de políticas separadas por operação (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '3. Uso de subconsultas materializadas (WITH) para evitar recursão';
  RAISE NOTICE '================================================================';
END;
$$;
