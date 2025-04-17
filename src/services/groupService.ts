
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Definir interfaces corretas para garantir tipagem
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

export async function getGroups(): Promise<Group[]> {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('*');
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error("Erro ao buscar grupos:", error);
    toast.error("Não foi possível carregar os grupos");
    return [];
  }
}

export async function getSubgroups(groupId?: string): Promise<Subgroup[]> {
  try {
    const query = supabase.from('subgroups').select('*');
    
    if (groupId) {
      query.eq('group_id', groupId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error("Erro ao buscar subgrupos:", error);
    toast.error("Não foi possível carregar os subgrupos");
    return [];
  }
}

export async function createGroup(groupData: Omit<Group, 'id' | 'created_at'>): Promise<Group | null> {
  try {
    const { data, error } = await supabase
      .from('groups')
      .insert(groupData)
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success("Grupo criado com sucesso");
    return data;
  } catch (error) {
    console.error("Erro ao criar grupo:", error);
    toast.error("Não foi possível criar o grupo");
    return null;
  }
}

export async function createSubgroup(subgroupData: Omit<Subgroup, 'id' | 'created_at'>): Promise<Subgroup | null> {
  try {
    const { data, error } = await supabase
      .from('subgroups')
      .insert(subgroupData)
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success("Subgrupo criado com sucesso");
    return data;
  } catch (error) {
    console.error("Erro ao criar subgrupo:", error);
    toast.error("Não foi possível criar o subgrupo");
    return null;
  }
}
