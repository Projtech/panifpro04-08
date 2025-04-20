import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseDecimalBR } from "@/lib/numberUtils";

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

function validateProduct(product: Omit<Product, 'id'>): string | null {
  if (!product.name || !product.unit) {
    return "Preencha os campos obrigatórios: nome e unidade";
  }

  if (product.unit.toLowerCase() === 'kg') {
    if (!product.kg_weight || product.kg_weight <= 0) {
      return "Para produtos em kg, informe o peso em kg";
    }
  } else {
    if (!product.unit_weight || product.unit_weight <= 0) {
      return "Para produtos em unidades, informe o peso por unidade";
    }
  }

  if (product.cost === null || product.cost < 0) {
    return "O custo não pode ser negativo";
  }

  if (product.min_stock === null || product.min_stock < 0) {
    return "O estoque mínimo não pode ser negativo";
  }

  return null;
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

export async function checkProductNameExists(name: string, excludeId?: string): Promise<boolean> {
  try {
    const query = supabase
      .from('products')
      .select('id, name')
      .ilike('name', name);
    
    if (excludeId) {
      query.neq('id', excludeId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    console.error("[PRODUCTS] Error checking product name:", error);
    return false;
  }
}

export async function checkProductSkuExists(sku: string, excludeId?: string): Promise<boolean> {
  if (!sku) return false;
  
  try {
    const query = supabase
      .from('products')
      .select('id, sku')
      .eq('sku', sku);
    
    if (excludeId) {
      query.neq('id', excludeId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    console.error("[PRODUCTS] Error checking product SKU:", error);
    return false;
  }
}

export async function createProduct(productData: Omit<Product, 'id'>): Promise<Product | null> {
  console.log("[PRODUCTS] Creating new product:", productData.name);
  try {
    const validationError = validateProduct(productData);
    if (validationError) {
      toast.error(validationError);
      return null;
    }

    const nameExists = await checkProductNameExists(productData.name);
    if (nameExists) {
      toast.error(`Já existe um produto com o nome "${productData.name}". Escolha um nome diferente.`);
      return null;
    }

    if (productData.sku) {
      const skuExists = await checkProductSkuExists(productData.sku);
      if (skuExists) {
        toast.error(`Já existe um produto com o SKU "${productData.sku}". Escolha um SKU diferente.`);
        return null;
      }
    }

    const productToCreate = {
      ...productData,
      cost: productData.cost || 0,
      min_stock: productData.min_stock || 0,
      current_stock: productData.current_stock || 0,
      unit_price: productData.unit_price || 0,
      type: productData.type || 'materia_prima'
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

export async function updateProduct(id: string, productData: Partial<Product>): Promise<Product | null> {
  console.log(`[PRODUCTS] Updating product ${id}:`, productData);
  try {
    const currentProduct = await getProduct(id);
    if (!currentProduct) {
      toast.error("Produto não encontrado");
      return null;
    }

    const updatedProduct = {
      ...currentProduct,
      ...productData
    };

    const validationError = validateProduct(updatedProduct);
    if (validationError) {
      toast.error(validationError);
      return null;
    }

    if (productData.name && productData.name !== currentProduct.name) {
      const nameExists = await checkProductNameExists(productData.name, id);
      if (nameExists) {
        toast.error(`Já existe um produto com o nome "${productData.name}". Escolha um nome diferente.`);
        return null;
      }
    }

    if (productData.sku && productData.sku !== currentProduct.sku) {
      const skuExists = await checkProductSkuExists(productData.sku, id);
      if (skuExists) {
        toast.error(`Já existe um produto com o SKU "${productData.sku}". Escolha um SKU diferente.`);
        return null;
      }
    }

    const { data, error } = await supabase
      .from('products')
      .update(productData)
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
