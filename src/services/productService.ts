
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Product {
  id: string;
  name: string;
  unit: string;
  sku: string; // Removido o null para garantir que sempre seja string
  supplier: string;
  cost: number | null;
  min_stock: number;
  current_stock: number | null;
  recipe_id?: string | null;
  unit_price?: number | null;
  unit_weight?: number | null; // Peso da unidade
  kg_weight?: number | null;   // Peso do kg
  group_id?: string | null;    // ID do grupo
  subgroup_id?: string | null; // ID do subgrupo
  all_days?: boolean | null;   // Checkbox para todos os dias
  monday?: boolean | null;     // Checkbox para segunda-feira
  tuesday?: boolean | null;    // Checkbox para terça-feira
  wednesday?: boolean | null;  // Checkbox para quarta-feira
  thursday?: boolean | null;   // Checkbox para quinta-feira
  friday?: boolean | null;     // Checkbox para sexta-feira
  saturday?: boolean | null;   // Checkbox para sábado
  sunday?: boolean | null;     // Checkbox para domingo
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

export async function createProduct(product: Omit<Product, 'id'>): Promise<Product | null> {
  console.log("[PRODUCTS] Creating new product:", product.name);
  try {
    // Verificar se os campos obrigatórios estão preenchidos
    if (!product.name || !product.unit) {
      toast.error("Preencha todos os campos obrigatórios");
      return null;
    }
    
    // Se o produto está sendo criado a partir de uma receita, o SKU pode ser nulo
    if (!product.recipe_id && !product.sku) {
      toast.error("Preencha o campo SKU");
      return null;
    }
    
    // Verificar se já existe um produto com o mesmo nome
    const nameExists = await checkProductNameExists(product.name);
    if (nameExists) {
      toast.error(`Já existe um produto com o nome "${product.name}". Escolha um nome diferente.`);
      return null;
    }
    
    // Verificar se já existe um produto com o mesmo SKU
    if (product.sku) {
      const skuExists = await checkProductSkuExists(product.sku);
      if (skuExists) {
        toast.error(`Já existe um produto com o SKU "${product.sku}". Escolha um SKU diferente.`);
        return null;
      }
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
