-- Criar tabela para armazenar as configurações de tabela dos usuários
CREATE TABLE user_table_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  table_id TEXT NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Adicionar índices para melhorar o desempenho das consultas
CREATE INDEX idx_user_table_configs_user_id ON user_table_configs(user_id);
CREATE INDEX idx_user_table_configs_company_id ON user_table_configs(company_id);
CREATE INDEX idx_user_table_configs_table_id ON user_table_configs(table_id);

-- Adicionar política RLS para garantir que os usuários só possam acessar suas próprias configurações
ALTER TABLE user_table_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias configurações de tabela"
  ON user_table_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias configurações de tabela"
  ON user_table_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id AND company_id IN (
    SELECT company_id FROM user_company_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Usuários podem atualizar suas próprias configurações de tabela"
  ON user_table_configs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir suas próprias configurações de tabela"
  ON user_table_configs FOR DELETE
  USING (auth.uid() = user_id);
