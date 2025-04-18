import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_at: string | null;
}

export interface Subgroup extends Omit<Group, 'id'> {
  id: string;
  group_id: string;
}

export interface GroupData {
  name: string;
  description: string | null;
}

export interface SubgroupData extends GroupData {
  group_id: string;
}

export async function getGroups(): Promise<Group[]> {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        subgroups (
          *
        )
      `);
    
    if (error) throw error;
    
    return (data || []) as Group[];
  } catch (error) {
    console.error("Error fetching groups:", error);
    toast.error("Erro ao carregar grupos");
    return [];
  }
}

export async function getSubgroups(groupId?: string): Promise<Subgroup[]> {
  try {
    let query = supabase.from('subgroups').select('*');
    
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

export async function createGroup(groupData: GroupData): Promise<Group | null> {
  try {
    const { data, error } = await supabase
      .from('groups')
      .insert([groupData])
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

export async function updateGroup(id: string, groupData: GroupData): Promise<Group | null> {
  try {
    const { data, error } = await supabase
      .from('groups')
      .update(groupData)
      .eq('id', id)
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

export async function deleteGroup(id: string): Promise<boolean> {
  try {
    const { error: subgroupsError } = await supabase
      .from('subgroups')
      .delete()
      .eq('group_id', id);
    
    if (subgroupsError) throw subgroupsError;
    
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    toast.success("Grupo excluído com sucesso");
    return true;
  } catch (error) {
    console.error("Error deleting group:", error);
    toast.error("Erro ao excluir grupo");
    return false;
  }
}

export async function createSubgroup(subgroupData: SubgroupData): Promise<Subgroup | null> {
  try {
    const { data, error } = await supabase
      .from('subgroups')
      .insert([subgroupData])
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

export async function updateSubgroup(id: string, subgroupData: SubgroupData): Promise<Subgroup | null> {
  try {
    const { data, error } = await supabase
      .from('subgroups')
      .update(subgroupData)
      .eq('id', id)
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

export async function deleteSubgroup(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('subgroups')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    toast.success("Subgrupo excluído com sucesso");
    return true;
  } catch (error) {
    console.error("Error deleting subgroup:", error);
    toast.error("Erro ao excluir subgrupo");
    return false;
  }
}
