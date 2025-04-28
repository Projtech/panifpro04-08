import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseDecimalBR } from "@/lib/numberUtils";

export type ProductType = 'materia_prima' | 'embalagem' | 'subreceita' | 'decoracao';

// Ajustando interface para usar product_type consistentemente
export interface Product {
  id: string;
  name: string;
  unit: string;
  sku: string | null;
  supplier: string | null;
  cost: number | null;
  min_stock: number | null; // Permitir null conforme lógica de negócio
  current_stock: number | null;
  recipe_id?: string | null;
  unit_price?: number | null;
  unit_weight?: number | null;
  kg_weight?: number | null;
  group_id?: string | null;
  subgroup_id?: string | null;
  product_type?: string | null; // Usar este campo (TEXT)
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
  // Ajustar validação para campos realmente obrigatórios
  if (!product.name) {
    return "Nome é obrigatório";
  }
  // Unit e Cost são NOT NULL no DB, mas podem ser calculados/definidos
  // A validação deles pode ser mais complexa dependendo do tipo
  if (!product.unit && product.product_type !== 'materia_prima') {
    // Matéria prima terá unit 'Kg' setado, outros tipos precisam de unidade
    return "Unidade é obrigatória para este tipo de produto";
  }

  // Validação de peso só se NÃO for matéria prima
  if (product.product_type !== 'materia_prima') {
    if (product.unit?.toLowerCase() === 'kg') { // Adicionado '?' para segurança
      if (!product.kg_weight || product.kg_weight <= 0) {
        // Este erro não deve mais aparecer para matéria prima
        return "Para produtos em kg, informe o preço por kg (R$)";
      }
    } else { // Assume 'un' ou outro se não for 'kg'
      if (!product.unit_weight || product.unit_weight <= 0) {
        return "Para produtos em unidades, informe o peso por unidade (kg)";
      }
    }
  }

  // Custo é NOT NULL no DB. Precisa ter valor.
  if (product.cost === null || product.cost === undefined || product.cost < 0) {
    return "O custo não pode ser nulo ou negativo";
  }

  // min_stock é NOT NULL no DB, mas opcional na UI. Enviaremos 0 se não informado.
  if (product.min_stock === null || product.min_stock < 0) {
    // Não retornar erro aqui, pois vamos tratar no productToCreate
    // return "O estoque mínimo não pode ser negativo";
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
      .maybeSingle();
    if (error) throw error;
    return data || null;
  } catch (error) {
    console.error(`[PRODUCTS] Error fetching product with ID ${id}:`, error);
    return null;
  }
}

// Busca produto pelo nome e tipo (materia_prima, subreceita, receita)
export async function findProductByNameAndType(
  name: string,
  type: ProductType
): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('name', name)
      .eq('product_type', type)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  } catch (error) {
    console.error(`[PRODUCTS] Error finding product by name and type:`, error);
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
  // Proteção extra: remova campo 'type' se existir
  if ('type' in productData) {
    delete (productData as any).type;
  }
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
      // Usar productData que já deve ter product_type
      ...productData,
      // Garantir valores padrão para campos NOT NULL ou com defaults no DB
      // se productData não os tiver ou forem undefined/null
      cost: productData.cost ?? 0, // Custo é NOT NULL
      min_stock: productData.min_stock ?? 0, // min_stock é NOT NULL
      current_stock: productData.current_stock ?? 0,
      unit_price: productData.unit_price ?? 0,
      product_type: productData.product_type // Assumindo que productData tem product_type
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
  } catch (error: any) {
    console.error("[PRODUCTS] Error creating product:", error);
    // Log do erro bruto vindo do Supabase
    console.error("[PRODUCTS] Raw Supabase Error:", JSON.stringify(error, null, 2));
    toast.error("Erro ao criar produto");
    return null;
  }
}

export async function updateProduct(id: string, productData: Partial<Product>): Promise<Product | null> {
  // Proteção extra: remova campo 'type' se existir
  if ('type' in productData) {
    delete (productData as any).type;
  }
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

// Busca produtos com nomes semelhantes (início, meio ou fim, case insensitive)
export async function findSimilarProductsByName(name: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .ilike('name', `%${name}%`); // Usa ilike para case-insensitive e % para wildcard

  if (error) {
    console.error('[findSimilarProductsByName] Erro ao buscar produtos semelhantes:', error);
    toast.error("Erro ao buscar produtos semelhantes"); // Mensagem para o usuário
    return [];
  }
  return data || []; // Retorna os dados ou array vazio se data for null/undefined
}
