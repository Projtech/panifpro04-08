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
  ativo: boolean; // Alterado para obrigatório já que todos os registros devem ter esse campo
}

export interface SetorForm {
  id?: string;
  name: string;
  description: string | null;
  color: string | null;
  company_id: string;
  ativo: boolean;
}

/**
 * Interface para operações de atualização de setores
 */
export interface SetorUpdateData {
  id?: string;
  name?: string;
  description?: string | null;
  color?: string | null;
  company_id?: string;
  created_at?: string;
  updated_at?: string;
  ativo?: boolean;
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
    // Agora buscamos apenas setores ativos diretamente na consulta
    const { data: setores, error } = await supabase
      .from('setores')
      .select('*')
      .eq('company_id', companyId)
      .eq('ativo', true)
      .order('name');
    
    if (error) {
      console.error("[SETORES] Error fetching setores:", error);
      return [];
    }
    
    if (!setores) return [];
    
    // Garantimos que todos os registros têm o campo ativo
    return setores.map(setor => ({
      ...setor,
      ativo: setor.ativo ?? true
    }));
  } catch (error) {
    console.error("[SETORES] Error fetching setores:", error);
    // Não exibimos toast de erro para o usuário quando não há setores
    // para evitar confusão
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
      .eq('ativo', true) // Verifica se o setor está ativo
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Registro não encontrado ou inativo
      }
      throw error;
    }
    
    if (!data) return null;
    
    // Garantimos que o setor tem o campo ativo
    return {
      ...data,
      ativo: data.ativo ?? true
    };
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
  if (!setorData || !companyId) return null;

  try {
    // Verificar duplicidade de nome
    const exists = await checkSetorNameExists(setorData.name, companyId);
    if (exists) {
      toast.error("Já existe um setor com esse nome");
      return null;
    }

    const dataToInsert = {
      ...setorData,
      company_id: companyId,
      ativo: true, // Garantir que novos setores sejam criados como ativos
    };

    const { data, error } = await supabase
      .from('setores')
      .insert([dataToInsert])
      .select();

    if (error) throw error;

    toast.success(`Setor "${setorData.name}" criado com sucesso`);
    
    // Garantir que o campo ativo esteja presente
    if (!data || data.length === 0) return null;
    
    return data.map(setor => ({
      ...setor,
      ativo: setor.ativo ?? true
    }))[0];
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
      .select();
    
    if (error) throw error;
    
    toast.success(`Setor atualizado com sucesso`);
    
    // Garantir que o campo ativo esteja presente
    if (!data || data.length === 0) return null;
    
    return data.map(setor => ({
      ...setor,
      ativo: setor.ativo ?? true
    }))[0];
  } catch (error) {
    console.error("[SETORES] Error updating setor:", error);
    toast.error("Erro ao atualizar setor");
    return null;
  }
}

/**
 * Desativa um setor (exclusão lógica/soft delete)
 * @param id ID do setor
 * @param companyId ID da empresa
 * @returns true se desativado com sucesso, false caso contrário
 */
export async function deleteSetor(id: string, companyId: string): Promise<boolean> {
  if (!id || !companyId) return false;
  
  try {
    // Ainda verificamos se o setor está em uso, para dar feedback adequado
    // mesmo com exclusão lógica, é bom informar ao usuário
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id')
      .eq('setor_id', id)
      .limit(1) as { data: any[] | null, error: any };
    
    if (productsError) throw productsError;
    
    // Agora apenas informamos que o setor está em uso, mas podemos desativá-lo mesmo assim
    // já que a exclusão é lógica
    if (products && products.length > 0) {
      toast.warning("Este setor está sendo usado em produtos. Os produtos vinculados serão mantidos.");
      // Continuamos com a desativação mesmo assim
    }
    
    // Soft delete - apenas marcamos como inativo
    const updateData: SetorUpdateData = { ativo: false };
    const { error } = await supabase
      .from('setores')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', companyId);
    
    if (error) throw error;
    
    toast.success("Setor desativado com sucesso");
    return true;
  } catch (error) {
    console.error("[SETORES] Error deactivating setor:", error);
    toast.error("Erro ao desativar setor");
    return false;
  }
}
