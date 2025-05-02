import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Interfaces (adicionando company_id opcional para consistência, embora não estritamente usado em todas as funções)
export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_at: string | null;
  company_id?: string; // Adicionado para refletir a coluna do DB
}

export interface Subgroup extends Omit<Group, 'id'> {
  id: string;
  group_id: string;
  company_id?: string; // Adicionado para refletir a coluna do DB
}

// Tipos para dados de formulário não mudam
export interface GroupData {
  name: string;
  description: string | null;
}

export interface SubgroupData extends GroupData {
  group_id: string;
}

// --- FUNÇÕES CORRIGIDAS ---

// LEITURA
export async function getGroups(companyId: string): Promise<Group[]> {
  if (!companyId) throw new Error('[getGroups] companyId é obrigatório');
  // Adicionado parâmetro companyId
  try {
    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        subgroups (
          *
        )
      `)
      .eq('company_id', companyId); // Adicionado filtro company_id

    if (error) throw error;

    return (data || []) as Group[];
  } catch (error) {
    console.error("Error fetching groups:", error);
    toast.error("Erro ao carregar grupos");
    return [];
  }
}

export async function getSubgroups(companyId: string, groupId?: string): Promise<Subgroup[]> {
  if (!companyId || typeof companyId !== "string") {
    throw new Error('[getSubgroups] companyId é obrigatório');
  }
  // Adicionado parâmetro companyId (como primeiro argumento)
  try {
    let query = supabase
      .from('subgroups')
      .select('*')
      .eq('company_id', companyId); // Adicionado filtro company_id

    if (groupId) {
      query = query.eq('group_id', groupId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []) as Subgroup[];
  } catch (error) {
    console.error("Error fetching subgroups:", error);
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
      .insert([{ ...groupData, company_id: companyId }]) // Adicionado company_id aos dados
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

// EXCLUSÃO
export async function deleteGroup(id: string, companyId: string): Promise<boolean> {
  if (!companyId) throw new Error('[deleteGroup] companyId é obrigatório');
  // Adicionado parâmetro companyId
  try {
    // Primeiro deleta subgrupos associados (também filtrando por companyId)
    const { error: subgroupsError } = await supabase
      .from('subgroups')
      .delete()
      .eq('group_id', id)
      .eq('company_id', companyId); // Adicionado filtro company_id

    if (subgroupsError) throw subgroupsError;

    // Depois deleta o grupo (também filtrando por companyId)
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId); // Adicionado filtro company_id

    if (error) throw error;

    toast.success("Grupo e subgrupos associados excluídos com sucesso"); // Mensagem ajustada
    return true;
  } catch (error) {
    console.error("Error deleting group:", error);
    toast.error("Erro ao excluir grupo");
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
      .insert([{ ...subgroupData, company_id: companyId }]) // Adicionado company_id aos dados
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

// EXCLUSÃO SUBGRUPO
export async function deleteSubgroup(id: string, companyId: string): Promise<boolean> {
  if (!companyId) throw new Error('[deleteSubgroup] companyId é obrigatório');
  // Adicionado parâmetro companyId
  try {
    const { error } = await supabase
      .from('subgroups')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId); // Adicionado filtro company_id

    if (error) throw error;

    toast.success("Subgrupo excluído com sucesso");
    return true;
  } catch (error) {
    console.error("Error deleting subgroup:", error);
    toast.error("Erro ao excluir subgrupo");
    return false;
  }
}