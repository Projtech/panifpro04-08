-- Script para criar a tabela de perfis de usuários e configurar as políticas de RLS
-- Esta tabela é essencial para o sistema de cadastro de usuários com senha padrão

-- Criar tabela de perfis estendidos
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  force_password_change BOOLEAN DEFAULT FALSE,
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Configurar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso
-- Usuários podem ver seus próprios perfis
CREATE POLICY "Usuários podem ver seus próprios perfis" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

-- Usuários podem editar seus próprios perfis
CREATE POLICY "Usuários podem editar seus próprios perfis" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Administradores podem gerenciar todos os perfis da empresa
CREATE POLICY "Administradores podem gerenciar todos os perfis da empresa" 
  ON profiles FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM company_users cu 
      WHERE cu.user_id = auth.uid() 
      AND cu.role = 'admin' 
      AND cu.company_id = profiles.company_id
    )
  );

-- Trigger para criar perfil automaticamente quando novo usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
