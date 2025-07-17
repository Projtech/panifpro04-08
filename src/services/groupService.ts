import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Interfaces (adicionando company_id opcional para consistência, embora não estritamente usado em todas as funções)
export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_at: string | null;
  company_id?: string; // Adicionado para refletir a coluna do DB
  ativo?: boolean; // Para suportar exclusão lógica (soft delete)
}

export interface Subgroup extends Omit<Group, 'id'> {
  id: string;
  group_id: string;
  company_id?: string; // Adicionado para refletir a coluna do DB
  ativo?: boolean; // Para suportar exclusão lógica (soft delete)
}

// Tipos para dados de formulário não mudam
export interface GroupData {
  name: string;
  description: string | null;
}

export interface SubgroupData extends GroupData {
  group_id: string;
}

// Interfaces para atualização que incluem o campo 'ativo'
export interface GroupUpdateData {
  name?: string;
  description?: string | null;
  ativo?: boolean;
}

export interface SubgroupUpdateData extends GroupUpdateData {
  group_id?: string;
}

// --- FUNÇÕES CORRIGIDAS ---

// LEITURA
export async function getGroups(companyId: string): Promise<Group[]> {
  if (!companyId) throw new Error('[getGroups] companyId é obrigatório');
  try {
    // Buscamos todos os grupos da empresa, sem exigir que tenham subgrupos
    const { data: rawGroups, error } = await supabase
      .from('groups')
      .select('*')
      .eq('company_id', companyId)
      .eq('ativo', true) // Apenas grupos ativos
      .order('name', { ascending: true });

    if (error) {
      console.error("[GROUPS] Erro na consulta de grupos:", error);
      return [];
    }

    if (!rawGroups || rawGroups.length === 0) {
      console.log("[GROUPS] Nenhum grupo encontrado");
      return [];
    }

    // Como já estamos filtrando por ativo=true na consulta, apenas retornamos os grupos
    if (!rawGroups || rawGroups.length === 0) {
      return [];
    }
    
    // Convertendo o resultado diretamente para o tipo Group[]
    return rawGroups as Group[];
  } catch (error) {
    console.error("[GROUPS] Error fetching groups:", error);
    toast.error("Erro ao carregar grupos");
    return [];
  }
}

export async function getSubgroups(companyId: string, groupId?: string): Promise<Subgroup[]> {
  if (!companyId || typeof companyId !== "string") {
    throw new Error('[getSubgroups] companyId é obrigatório');
  }
  try {
    // Construir a consulta base com filtro de 'ativo'
    let query = supabase
      .from('subgroups')
      .select('*')
      .eq('company_id', companyId)
      .eq('ativo', true); // Apenas subgrupos ativos

    // Adicionar filtro de grupo se fornecido
    if (groupId) {
      query = query.eq('group_id', groupId);
    }

    // Executar a consulta
    const { data: rawSubgroups, error } = await query.order('name', { ascending: true });

    if (error) {
      console.error("[SUBGROUPS] Erro na consulta de subgrupos:", error);
      return [];
    }

    if (!rawSubgroups || rawSubgroups.length === 0) {
      console.log("[SUBGROUPS] Nenhum subgrupo encontrado");
      return [];
    }

    // Como já estamos filtrando por ativo=true na consulta, apenas retornamos os subgrupos
    return rawSubgroups as Subgroup[];
  } catch (error) {
    console.error("[SUBGROUPS] Error fetching subgroups:", error);
    toast.error("Erro ao carregar subgrupos");
    return [];
  }
}

// INSERÇÃO
export async function createGroup(groupData: GroupData, companyId: string): Promise<Group | null> {
  if (!companyId) throw new Error('[createGroup] companyId é obrigatório');
  // Adicionado parâmetro companyId
  try {
    const { data, error } = await supabase
      .from('groups')
      .insert([{ ...groupData, company_id: companyId, ativo: true }]) // Adicionado ativo=true
      .select()
      .single();

    if (error) throw error;

    toast.success("Grupo criado com sucesso");
    return data as Group;
  } catch (error) {
    console.error("Error creating group:", error);
    toast.error("Erro ao criar grupo");
    return null;
  }
}

// ATUALIZAÇÃO
export async function updateGroup(id: string, groupData: GroupData, companyId: string): Promise<Group | null> {
  if (!companyId) throw new Error('[updateGroup] companyId é obrigatório');
  // Adicionado parâmetro companyId
  try {
    // Garante que company_id não seja enviado nos dados de atualização
    const { company_id, ...updateData } = groupData as any;

    const { data, error } = await supabase
      .from('groups')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', companyId) // Adicionado filtro company_id
      .select()
      .single();

    if (error) throw error;

    toast.success("Grupo atualizado com sucesso");
    return data as Group;
  } catch (error) {
    console.error("Error updating group:", error);
    toast.error("Erro ao atualizar grupo");
    return null;
  }
}

// EXCLUSÃO LÓGICA (SOFT DELETE)
export async function deleteGroup(id: string, companyId: string): Promise<boolean> {
  if (!companyId) throw new Error('[deleteGroup] companyId é obrigatório');
  try {
    // Primeiro desativa os subgrupos associados (soft delete)
    const { error: subgroupsError } = await supabase
      .from('subgroups')
      .update({ ativo: false } as SubgroupUpdateData)
      .eq('group_id', id)
      .eq('company_id', companyId);

    if (subgroupsError) throw subgroupsError;

    // Depois desativa o grupo (soft delete)
    const { error } = await supabase
      .from('groups')
      .update({ ativo: false } as GroupUpdateData)
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) throw error;

    toast.success("Grupo e subgrupos associados desativados com sucesso");
    return true;
  } catch (error) {
    console.error("Error deactivating group:", error);
    toast.error("Erro ao desativar grupo");
    return false;
  }
}

// INSERÇÃO SUBGRUPO
export async function createSubgroup(subgroupData: SubgroupData, companyId: string): Promise<Subgroup | null> {
  if (!companyId) throw new Error('[createSubgroup] companyId é obrigatório');
  // Adicionado parâmetro companyId
  try {
    const { data, error } = await supabase
      .from('subgroups')
      .insert([{ ...subgroupData, company_id: companyId, ativo: true }]) // Adicionado ativo=true
      .select()
      .single();

    if (error) throw error;

    toast.success("Subgrupo criado com sucesso");
    return data as Subgroup;
  } catch (error) {
    console.error("Error creating subgroup:", error);
    toast.error("Erro ao criar subgrupo");
    return null;
  }
}

// ATUALIZAÇÃO SUBGRUPO
export async function updateSubgroup(id: string, subgroupData: SubgroupData, companyId: string): Promise<Subgroup | null> {
  if (!companyId) throw new Error('[updateSubgroup] companyId é obrigatório');
  // Adicionado parâmetro companyId
  try {
    // Garante que company_id não seja enviado nos dados de atualização
    const { company_id, ...updateData } = subgroupData as any;

    const { data, error } = await supabase
      .from('subgroups')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', companyId) // Adicionado filtro company_id
      .select()
      .single();

    if (error) throw error;

    toast.success("Subgrupo atualizado com sucesso");
    return data as Subgroup;
  } catch (error) {
    console.error("Error updating subgroup:", error);
    toast.error("Erro ao atualizar subgrupo");
    return null;
  }
}

// EXCLUSÃO LÓGICA SUBGRUPO (SOFT DELETE)
export async function deleteSubgroup(id: string, companyId: string): Promise<boolean> {
  if (!companyId) throw new Error('[deleteSubgroup] companyId é obrigatório');
  try {
    // Soft delete - apenas marca como inativo
    const { error } = await supabase
      .from('subgroups')
      .update({ ativo: false } as SubgroupUpdateData)
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) throw error;

    toast.success("Subgrupo desativado com sucesso");
    return true;
  } catch (error) {
    console.error("Error deactivating subgroup:", error);
    toast.error("Erro ao desativar subgrupo");
    return false;
  }
}