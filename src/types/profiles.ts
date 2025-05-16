// Definição de tipos para a tabela profiles baseada no esquema real do banco de dados
export interface Profile {
  user_id: string;
  full_name?: string | null;
  force_password_change?: boolean | null;
  company_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProfileInsert {
  user_id: string;
  full_name?: string | null;
  force_password_change?: boolean | null;
  company_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProfileUpdate {
  user_id?: string;
  full_name?: string | null;
  force_password_change?: boolean | null;
  company_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}
