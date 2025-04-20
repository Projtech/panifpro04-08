import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ProductType = 'materia_prima' | 'embalagem' | 'subproduto' | 'decoracao';

export interface Product {
  id: string;
  name: string;
  unit: string;
  sku: string | null;
  supplier: string | null;
  cost: number | null;
  min_stock: number;
  current_stock: number | null;
  recipe_id?: string | null;
  unit_price?: number | null;
  unit_weight?: number | null;
  kg_weight?: number | null;
  group_id?: string | null;
  subgroup_id?: string | null;
  type?: ProductType | null;
  all_days?: boolean | null;
  monday?: boolean | null;
  tuesday?: boolean | null;
  wednesday?: boolean | null;
  thursday?: boolean | null;
  friday?: boolean | null;
  saturday?: boolean | null;
  sunday?: boolean | null;
}

export async function getProducts(): Promise<Product[]> {
  console.log("[PRODUCTS] Fetching all products...");
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    
    if (error) throw error;
    console.log(`[PRODUCTS] Successfully fetched ${data?.length || 0} products`);
    return data || [];
  } catch (error) {
    console.error("[PRODUCTS] Error fetching products:", error);
    toast.error("Erro ao carregar produtos");
    return [];
  }
}

export async function getProduct(id: string): Promise<Product | null> {
  console.log(`[PRODUCTS] Fetching product with ID: ${id}`);
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    console.log(`[PRODUCTS] Successfully fetched product: ${data?.name || id}`);
    return data;
  } catch (error) {
    console.error(`[PRODUCTS] Error fetching product with ID ${id}:`, error);
    toast.error("Erro ao carregar produto");
    return null;
  }
}

// Função para verificar se já existe um produto com o mesmo nome (ignorando case)
export async function checkProductNameExists(name: string, excludeId?: string): Promise<boolean> {
  try {
    const query = supabase
      .from('products')
      .select('id, name')
      .ilike('name', name);
    
    // Se estamos excluindo um ID (caso de edição), adicione essa condição
    if (excludeId) {
      query.neq('id', excludeId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    console.error("[PRODUCTS] Error checking product name:", error);
    return false; // Em caso de erro, permitimos continuar para não bloquear o usuário
  }
}

// Função para verificar se já existe um produto com o mesmo SKU
export async function checkProductSkuExists(sku: string, excludeId?: string): Promise<boolean> {
  if (!sku) return false;
  
  try {
    const query = supabase
      .from('products')
      .select('id, sku')
      .eq('sku', sku);
    
    // Se estamos excluindo um ID (caso de edição), adicione essa condição
    if (excludeId) {
      query.neq('id', excludeId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    console.error("[PRODUCTS] Error checking product SKU:", error);
    return false; // Em caso de erro, permitimos continuar para não bloquear o usuário
  }
}

// Atualizar a função createProduct para refletir os novos campos não obrigatórios
export async function createProduct(product: Omit<Product, 'id'>): Promise<Product | null> {
  console.log("[PRODUCTS] Creating new product:", product.name);
  try {
    // Verificar se os campos obrigatórios estão preenchidos
    if (!product.name || !product.unit) {
      toast.error("Preencha todos os campos obrigatórios");
      return null;
    }

    // Verificar se já existe um produto com o mesmo nome
    const nameExists = await checkProductNameExists(product.name);
    if (nameExists) {
      toast.error(`Já existe um produto com o nome "${product.name}". Escolha um nome diferente.`);
      return null;
    }

    // Garantir que o campo cost tenha um valor válido
    const productToCreate = {
      ...product,
      cost: product.cost === null || product.cost === undefined ? 0 : product.cost
    };

    const { data, error } = await supabase
      .from('products')
      .insert([productToCreate])
      .select()
      .single();
    
    if (error) throw error;
    console.log(`[PRODUCTS] Successfully created product: ${data.name} with ID: ${data.id}`);
    toast.success("Produto criado com sucesso");
    return data;
  } catch (error) {
    console.error("[PRODUCTS] Error creating product:", error);
    toast.error("Erro ao criar produto");
    return null;
  }
}

export async function updateProduct(id: string, product: Partial<Product>): Promise<Product | null> {
  console.log(`[PRODUCTS] Updating product ${id}:`, product);
  try {
    // Verificar se já existe um produto com o mesmo nome (excluindo o produto atual)
    if (product.name) {
      const nameExists = await checkProductNameExists(product.name, id);
      if (nameExists) {
        toast.error(`Já existe um produto com o nome "${product.name}". Escolha um nome diferente.`);
        return null;
      }
    }
    
    // Verificar se já existe um produto com o mesmo SKU (excluindo o produto atual)
    if (product.sku) {
      const skuExists = await checkProductSkuExists(product.sku, id);
      if (skuExists) {
        toast.error(`Já existe um produto com o SKU "${product.sku}". Escolha um SKU diferente.`);
        return null;
      }
    }
    
    // Garantir que o campo cost tenha um valor válido se estiver sendo atualizado
    const productToUpdate = {
      ...product,
      cost: product.cost === null || product.cost === undefined ? 0 : product.cost
    };

    const { data, error } = await supabase
      .from('products')
      .update(productToUpdate)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    console.log(`[PRODUCTS] Successfully updated product: ${data.name}`);
    toast.success("Produto atualizado com sucesso");
    return data;
  } catch (error) {
    console.error(`[PRODUCTS] Error updating product ${id}:`, error);
    toast.error("Erro ao atualizar produto");
    return null;
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  console.log(`[PRODUCTS] Deleting product with ID: ${id}`);
  try {
    // Verificar se o produto foi usado em pedidos de produção
    const { data: productionItems, error: productionError } = await supabase
      .from('inventory_transactions')
      .select('id')
      .eq('product_id', id)
      .limit(1);
    
    if (productionError) throw productionError;
    
    if (productionItems && productionItems.length > 0) {
      console.log(`[PRODUCTS] Product ${id} is used in production orders and cannot be deleted`);
      toast.error("Um produto já utilizado nos pedidos de produção não pode ser excluído");
      return false;
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    console.log(`[PRODUCTS] Successfully deleted product with ID: ${id}`);
    toast.success("Produto excluído com sucesso");
    return true;
  } catch (error) {
    console.error(`[PRODUCTS] Error deleting product ${id}:`, error);
    toast.error("Erro ao excluir produto");
    return false;
  }
}
