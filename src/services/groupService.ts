
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/types/supabase";

type Tables = Database['public']['Tables'];
type Group = Tables['groups']['Row'];
type Subgroup = Tables['subgroups']['Row'];

export type { Group, Subgroup };

export async function getGroups(): Promise<Group[]> {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching groups:", error);
    toast.error("Erro ao carregar grupos");
    return [];
  }
}

export async function getSubgroups(groupId?: string): Promise<Subgroup[]> {
  try {
    let query = supabase
      .from('subgroups')
      .select('*')
      .order('name');
    
    if (groupId) {
      query = query.eq('group_id', groupId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching subgroups:", error);
    toast.error("Erro ao carregar subgrupos");
    return [];
  }
}

export async function createGroup(group: Omit<Group, 'id' | 'created_at'>): Promise<Group | null> {
  try {
    const { data, error } = await supabase
      .from('groups')
      .insert([group])
      .select()
      .single();
    
    if (error) throw error;
    toast.success("Grupo criado com sucesso");
    return data;
  } catch (error) {
    console.error("Error creating group:", error);
    toast.error("Erro ao criar grupo");
    return null;
  }
}

export async function updateGroup(id: string, group: Partial<Omit<Group, 'id' | 'created_at'>>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('groups')
      .update(group)
      .eq('id', id);
    
    if (error) throw error;
    toast.success("Grupo atualizado com sucesso");
    return true;
  } catch (error) {
    console.error("Error updating group:", error);
    toast.error("Erro ao atualizar grupo");
    return false;
  }
}

export async function deleteGroup(id: string): Promise<boolean> {
  try {
    // Check for linked subgroups
    const { data: subgroups } = await supabase
      .from('subgroups')
      .select('id')
      .eq('group_id', id);
    
    if (subgroups && subgroups.length > 0) {
      toast.error("Não é possível excluir um grupo que possui subgrupos");
      return false;
    }
    
    // Check for linked products
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .eq('group_id', id);
    
    if (products && products.length > 0) {
      toast.error("Não é possível excluir um grupo que possui produtos vinculados");
      return false;
    }
    
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

export async function createSubgroup(subgroup: Omit<Subgroup, 'id' | 'created_at'>): Promise<Subgroup | null> {
  try {
    const { data, error } = await supabase
      .from('subgroups')
      .insert([subgroup])
      .select()
      .single();
    
    if (error) throw error;
    toast.success("Subgrupo criado com sucesso");
    return data;
  } catch (error) {
    console.error("Error creating subgroup:", error);
    toast.error("Erro ao criar subgrupo");
    return null;
  }
}

export async function updateSubgroup(id: string, subgroup: Partial<Omit<Subgroup, 'id' | 'created_at'>>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('subgroups')
      .update(subgroup)
      .eq('id', id);
    
    if (error) throw error;
    toast.success("Subgrupo atualizado com sucesso");
    return true;
  } catch (error) {
    console.error("Error updating subgroup:", error);
    toast.error("Erro ao atualizar subgrupo");
    return false;
  }
}

export async function deleteSubgroup(id: string): Promise<boolean> {
  try {
    // Check for linked products
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .eq('subgroup_id', id);
    
    if (products && products.length > 0) {
      toast.error("Não é possível excluir um subgrupo que possui produtos vinculados");
      return false;
    }
    
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
