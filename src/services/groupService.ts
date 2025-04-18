
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/supabase";

// Updated interfaces to match Supabase table structure
export interface Group {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Subgroup {
  id: string;
  name: string;
  description: string;
  group_id: string;
  created_at: string;
}

// Função para tratar erros de forma consistente
const handleError = (error: any, message: string) => {
  console.error(message, error);
  toast.error(message);
  return null;
};

// Precisamos adicionar as tabelas groups e subgroups ao tipo Database
// Por enquanto vamos usar 'any' para contornar o problema de tipagem do Supabase
export async function getGroups(): Promise<Group[]> {
  try {
    const { data, error } = await supabase
      .from('groups' as any)
      .select('id, name, description, created_at');
    
    if (error) throw error;
    
    return data as Group[] || [];
  } catch (error) {
    console.error("Erro ao buscar grupos:", error);
    toast.error("Não foi possível carregar os grupos");
    return [];
  }
}

export async function getSubgroups(groupId?: string): Promise<Subgroup[]> {
  try {
    let query = supabase
      .from('subgroups' as any)
      .select('id, name, description, group_id, created_at');
    
    if (groupId) {
      query = query.eq('group_id', groupId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data as Subgroup[] || [];
  } catch (error) {
    console.error("Erro ao buscar subgrupos:", error);
    toast.error("Não foi possível carregar os subgrupos");
    return [];
  }
}

export async function createGroup(groupData: Omit<Group, 'id' | 'created_at'>): Promise<Group | null> {
  try {
    const { data, error } = await supabase
      .from('groups' as any)
      .insert([groupData])
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success("Grupo criado com sucesso");
    return data as Group;
  } catch (error) {
    return handleError(error, "Não foi possível criar o grupo");
  }
}

export async function updateGroup(id: string, groupData: Partial<Omit<Group, 'id' | 'created_at'>>): Promise<Group | null> {
  try {
    const { data, error } = await supabase
      .from('groups' as any)
      .update(groupData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success("Grupo atualizado com sucesso");
    return data as Group;
  } catch (error) {
    return handleError(error, "Não foi possível atualizar o grupo");
  }
}

export async function deleteGroup(id: string): Promise<boolean> {
  try {
    // Primeiro verificar se existem subgrupos associados
    const { data: subgroups } = await supabase
      .from('subgroups' as any)
      .select('id')
      .eq('group_id', id);
    
    if (subgroups && subgroups.length > 0) {
      toast.error("Não é possível excluir o grupo porque existem subgrupos associados");
      return false;
    }
    
    const { error } = await supabase
      .from('groups' as any)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    toast.success("Grupo excluído com sucesso");
    return true;
  } catch (error) {
    console.error("Erro ao excluir grupo:", error);
    toast.error("Não foi possível excluir o grupo");
    return false;
  }
}

export async function createSubgroup(subgroupData: Omit<Subgroup, 'id' | 'created_at'>): Promise<Subgroup | null> {
  try {
    const { data, error } = await supabase
      .from('subgroups' as any)
      .insert([subgroupData])
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success("Subgrupo criado com sucesso");
    return data as Subgroup;
  } catch (error) {
    return handleError(error, "Não foi possível criar o subgrupo");
  }
}

export async function updateSubgroup(id: string, subgroupData: Partial<Omit<Subgroup, 'id' | 'created_at'>>): Promise<Subgroup | null> {
  try {
    const { data, error } = await supabase
      .from('subgroups' as any)
      .update(subgroupData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success("Subgrupo atualizado com sucesso");
    return data as Subgroup;
  } catch (error) {
    return handleError(error, "Não foi possível atualizar o subgrupo");
  }
}

export async function deleteSubgroup(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('subgroups' as any)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    toast.success("Subgrupo excluído com sucesso");
    return true;
  } catch (error) {
    console.error("Erro ao excluir subgrupo:", error);
    toast.error("Não foi possível excluir o subgrupo");
    return false;
  }
}
