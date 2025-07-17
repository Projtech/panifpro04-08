import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

// Define a interface para um ProductType com base na nova tabela
export interface ProductType {
  id: string;
  name: string;
  company_id: string;
  created_at: string;
  is_system?: boolean;
}

// Array com os tipos de sistema que não podem ser editados ou excluídos
export const SYSTEM_PRODUCT_TYPES = ['materia_prima', 'receita', 'subreceita'];

// Serviço para verificar e criar os tipos de sistema necessários
export const ensureSystemProductTypes = async (companyId: string): Promise<void> => {
  if (!companyId) {
    console.error('ID da empresa é obrigatório para verificar tipos de sistema');
    return;
  }

  try {
    // Verifica quais tipos de sistema já existem
    const { data: existingTypes } = await supabase
      .from('product_types')
      .select('name')
      .eq('company_id', companyId)
      .in('name', SYSTEM_PRODUCT_TYPES);
    
    const existingTypeNames = new Set((existingTypes || []).map(type => type.name));
    const typesToCreate = SYSTEM_PRODUCT_TYPES.filter(typeName => !existingTypeNames.has(typeName));
    
    // Cria os tipos que ainda não existem
    if (typesToCreate.length > 0) {
      console.log(`Criando ${typesToCreate.length} tipos de sistema faltantes:`, typesToCreate);
      
      const typesData = typesToCreate.map(name => ({
        name,
        company_id: companyId,
        is_system: true
      }));
      
      const { error } = await supabase
        .from('product_types')
        .insert(typesData);
        
      if (error) {
        console.error('Erro ao criar tipos de sistema:', error);
      } else {
        console.log('Tipos de sistema criados com sucesso');
      }
    }
  } catch (error) {
    console.error('Erro ao verificar/criar tipos de sistema:', error);
  }
};

// Serviço para buscar todos os tipos de produto de uma empresa
export const getProductTypes = async (companyId: string): Promise<ProductType[]> => {
  if (!companyId) {
    throw new Error('O ID da empresa é obrigatório para buscar os tipos de produto.');
  }

  // Garante que os tipos de sistema existam antes de buscar
  await ensureSystemProductTypes(companyId);

  const { data, error } = await supabase
    .from('product_types')
    .select('*')
    .eq('company_id', companyId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Erro ao buscar os tipos de produto:', error);
    throw new Error('Não foi possível buscar os tipos de produto.');
  }

  return data || [];
};

// Serviço para adicionar um novo tipo de produto
export const addProductType = async (name: string, companyId: string): Promise<ProductType> => {
  if (!name || !companyId) {
    throw new Error('O nome e o ID da empresa são obrigatórios para adicionar um tipo de produto.');
  }

  const { data, error } = await supabase
    .from('product_types')
    .insert([{ name, company_id: companyId }])
    .select()
    .single();

  if (error) {
    console.error('Erro ao adicionar o tipo de produto:', error);
    if (error.code === '23505') { // violação de unicidade
        throw new Error('Já existe um tipo de produto com este nome.');
    }
    throw new Error('Não foi possível adicionar o tipo de produto.');
  }

  return data;
};

// Serviço para atualizar um tipo de produto
export const updateProductType = async (id: string, name: string): Promise<ProductType> => {
  if (!id || !name) {
    throw new Error('O ID e o nome são obrigatórios para atualizar um tipo de produto.');
  }

  // Verificar se é um tipo do sistema
  const { data: typeData, error: typeError } = await supabase
    .from('product_types')
    .select('name')
    .eq('id', id)
    .single();

  if (typeError) {
    console.error('Erro ao verificar o tipo de produto:', typeError);
    throw new Error('Não foi possível verificar o tipo de produto.');
  }

  // Impedir edição de tipos do sistema
  if (typeData && SYSTEM_PRODUCT_TYPES.includes(typeData.name)) {
    throw new Error('Os tipos de produto do sistema não podem ser modificados.');
  }

  const { data, error } = await supabase
    .from('product_types')
    .update({ name })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar o tipo de produto:', error);
    if (error.code === '23505') {
        throw new Error('Já existe um tipo de produto com este nome.');
    }
    throw new Error('Não foi possível atualizar o tipo de produto.');
  }

  return data;
};

// Serviço para deletar um tipo de produto
export const deleteProductType = async (id: string): Promise<void> => {
  if (!id) {
    throw new Error('O ID é obrigatório para deletar um tipo de produto.');
  }

  // Verificar se é um tipo do sistema
  const { data: typeData, error: typeError } = await supabase
    .from('product_types')
    .select('name')
    .eq('id', id)
    .single();

  if (typeError) {
    console.error('Erro ao verificar o tipo de produto:', typeError);
    throw new Error('Não foi possível verificar o tipo de produto.');
  }

  // Impedir exclusão de tipos do sistema
  if (typeData && SYSTEM_PRODUCT_TYPES.includes(typeData.name)) {
    throw new Error('Os tipos de produto do sistema não podem ser excluídos.');
  }

  const { error } = await supabase
    .from('product_types')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar o tipo de produto:', error);
    if (error.code === '23503') { // violação de chave estrangeira
        throw new Error('Não é possível excluir este tipo, pois ele está sendo usado por um ou mais produtos.');
    }
    throw new Error('Não foi possível excluir o tipo de produto.');
  }
};

// Função para obter o ID de um tipo de produto pelo nome
export const getProductTypeIdByName = async (name: string, companyId: string): Promise<string | null> => {
  if (!name || !companyId) {
    throw new Error('O nome e o ID da empresa são obrigatórios para buscar o tipo de produto.');
  }

  const { data, error } = await supabase
    .from('product_types')
    .select('id')
    .eq('company_id', companyId)
    .ilike('name', name)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar o tipo de produto pelo nome:', error);
    return null;
  }

  return data ? data.id : null;
};
