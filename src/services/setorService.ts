import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Setor {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  company_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface SetorForm {
  id?: string;
  name: string;
  description: string | null;
  color: string | null;
  company_id: string;
}

/**
 * Busca todos os setores de uma empresa
 * @param companyId ID da empresa
 * @returns Lista de setores
 */
export async function getSetores(companyId: string): Promise<Setor[]> {
  if (!companyId) {
    console.warn("[getSetores] companyId ausente - sessão possivelmente expirada");
    throw new Error("Sessão inválida ou empresa não selecionada");
  }
  
  try {
    const { data, error } = await supabase
      .from('setores')
      .select('*')
      .eq('company_id', companyId)
      .order('name');
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error("[SETORES] Error fetching setores:", error);
    toast.error("Erro ao carregar setores");
    return [];
  }
}

/**
 * Busca um setor pelo ID
 * @param id ID do setor
 * @param companyId ID da empresa
 * @returns O setor encontrado ou null se não existir
 */
export async function getSetor(id: string, companyId: string): Promise<Setor | null> {
  if (!id || !companyId) return null;
  
  try {
    const { data, error } = await supabase
      .from('setores')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Registro não encontrado
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("[SETORES] Error fetching setor:", error);
    toast.error("Erro ao carregar setor");
    return null;
  }
}

/**
 * Verifica se já existe um setor com o mesmo nome
 * @param name Nome do setor
 * @param companyId ID da empresa
 * @param excludeId ID do setor a ser excluído da verificação (para edição)
 * @returns true se já existir, false caso contrário
 */
export async function checkSetorNameExists(
  name: string, 
  companyId: string, 
  excludeId?: string
): Promise<boolean> {
  if (!name || !companyId) return false;
  
  try {
    let query = supabase
      .from('setores')
      .select('id')
      .eq('name', name)
      .eq('company_id', companyId);
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data?.length || 0) > 0;
  } catch (error) {
    console.error("[SETORES] Error checking setor name:", error);
    return false;
  }
}

/**
 * Cria um novo setor
 * @param setorData Dados do setor
 * @param companyId ID da empresa
 * @returns O setor criado ou null em caso de erro
 */
export async function createSetor(
  setorData: Omit<SetorForm, 'id'>, 
  companyId: string
): Promise<Setor | null> {
  if (!companyId) {
    toast.error("Empresa não selecionada");
    return null;
  }
  
  try {
    // Verificar se já existe um setor com o mesmo nome
    const exists = await checkSetorNameExists(setorData.name, companyId);
    if (exists) {
      toast.error(`Já existe um setor com o nome "${setorData.name}"`);
      return null;
    }
    
    const { data, error } = await supabase
      .from('setores')
      .insert({
        ...setorData,
        company_id: companyId
      })
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success(`Setor "${setorData.name}" criado com sucesso`);
    return data;
  } catch (error) {
    console.error("[SETORES] Error creating setor:", error);
    toast.error("Erro ao criar setor");
    return null;
  }
}

/**
 * Atualiza um setor existente
 * @param id ID do setor
 * @param setorData Dados atualizados do setor
 * @param companyId ID da empresa
 * @returns O setor atualizado ou null em caso de erro
 */
export async function updateSetor(
  id: string,
  setorData: Partial<SetorForm>,
  companyId: string
): Promise<Setor | null> {
  if (!id || !companyId) {
    toast.error("ID do setor ou empresa não fornecidos");
    return null;
  }
  
  try {
    // Verificar se já existe outro setor com o mesmo nome
    if (setorData.name) {
      const exists = await checkSetorNameExists(setorData.name, companyId, id);
      if (exists) {
        toast.error(`Já existe outro setor com o nome "${setorData.name}"`);
        return null;
      }
    }
    
    const { data, error } = await supabase
      .from('setores')
      .update({
        ...setorData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success(`Setor atualizado com sucesso`);
    return data;
  } catch (error) {
    console.error("[SETORES] Error updating setor:", error);
    toast.error("Erro ao atualizar setor");
    return null;
  }
}

/**
 * Exclui um setor
 * @param id ID do setor
 * @param companyId ID da empresa
 * @returns true se excluído com sucesso, false caso contrário
 */
export async function deleteSetor(id: string, companyId: string): Promise<boolean> {
  if (!id || !companyId) return false;
  
  try {
    // Verificar se o setor está sendo usado em produtos
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id')
      .eq('setor_id', id)
      .limit(1);
    
    if (productsError) throw productsError;
    
    if (products && products.length > 0) {
      toast.error("Este setor está sendo usado em produtos e não pode ser excluído");
      return false;
    }
    
    const { error } = await supabase
      .from('setores')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);
    
    if (error) throw error;
    
    toast.success("Setor excluído com sucesso");
    return true;
  } catch (error) {
    console.error("[SETORES] Error deleting setor:", error);
    toast.error("Erro ao excluir setor");
    return false;
  }
}
