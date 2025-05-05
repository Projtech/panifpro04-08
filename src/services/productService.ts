import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseDecimalBR } from "@/lib/numberUtils";

// Tipo para dados do banco de dados
interface ProductFromDB {
  id: string;
  name: string;
  unit: string;
  sku: string | null;
  supplier: string | null;
  cost: number | null;
  min_stock: number | null;
  current_stock: number | null;
  recipe_id: string | null;
  unit_price: number | null;
  unit_weight: number | null;
  kg_weight: number | null;
  group_id: string | null;
  subgroup_id: string | null;
  product_type: string | null;
  code: string | null;
  all_days: boolean | null;
  monday: boolean | null;
  tuesday: boolean | null;
  wednesday: boolean | null;
  thursday: boolean | null;
  friday: boolean | null;
  saturday: boolean | null;
  sunday: boolean | null;
  ativo: boolean | null;
  company_id: string | null;
}

// Definição corrigida para os tipos de produto válidos
export type ProductType = 'materia_prima' | 'receita' | 'subreceita';

// Função auxiliar para verificar se um valor é um ProductType válido
function isValidProductType(type: string | null | undefined): type is ProductType {
  return type !== null && type !== undefined && 
         ['materia_prima', 'receita', 'subreceita'].includes(type);
}

// Ajustando interface para usar product_type consistentemente
export interface Product {
  id: string; // UUID
  name: string;
  unit: string; // 'UN' ou 'Kg'
  sku: string | null;
  supplier: string | null;
  cost: number | null; // Custo baseado na unidade (cost_per_unit ou cost_per_kg da receita)
  min_stock: number | null; // Permitir null aqui, mas setar default 0 ao criar
  current_stock: number | null;
  recipe_id?: string | null; // UUID da receita vinculada
  unit_price?: number | null; // Preço de VENDA unitário (definido depois)
  unit_weight?: number | null; // Peso (kg) por unidade (calculado se unit='UN')
  kg_weight?: number | null; // Peso total (kg) da receita (registrado se unit='KG')
  group_id?: string | null; // UUID do grupo
  subgroup_id?: string | null; // UUID do subgrupo
  product_type?: ProductType; // *** Usa o tipo corrigido *** (tornando opcional)
  code?: string | null; // Código interno do produto (pode vir da receita)
  all_days?: boolean | null; // Dias não são transferidos da receita
  monday?: boolean | null;
  tuesday?: boolean | null;
  wednesday?: boolean | null;
  thursday?: boolean | null;
  friday?: boolean | null;
  saturday?: boolean | null;
  sunday?: boolean | null;
  ativo?: boolean; // Adicionado se existir no seu ProductForm ou DB
  company_id?: string; // Adicionado se existir no seu ProductForm ou DB
}

function validateProduct(product: Omit<Product, 'id'>): string | null {
  // Ajustar validação para campos realmente obrigatórios
  if (!product.name) {
    return "Nome é obrigatório";
  }

  // Verifica se o tipo do produto é válido
  if (!isValidProductType(product.product_type)) {
    return "Tipo de produto inválido";
  }

  // Unit é obrigatório para todos os tipos
  if (!product.unit) {
    return "Unidade é obrigatória";
  }

  // Validação de unidade e peso - AJUSTADA
  if (product.product_type !== 'materia_prima') { // Só valida pesos se NÃO for matéria prima
    if (product.unit.toLowerCase() === 'kg') {
      if (!product.kg_weight || product.kg_weight <= 0) {
        return "Para produtos em kg, informe o peso total (kg)";
      }
    } else { // Assume 'UN' se não for 'kg'
      if (!product.unit_weight || product.unit_weight <= 0) {
        return "Para produtos em unidades, informe o peso por unidade (kg)";
      }
    }
  } // Fim do IF que exclui matéria prima da validação de peso

  // Custo é obrigatório e não pode ser negativo
  if (product.cost === null || product.cost === undefined || product.cost < 0) {
    return "O custo não pode ser nulo ou negativo";
  }

  // Estoque mínimo não pode ser negativo
  if (product.min_stock !== null && product.min_stock < 0) {
    return "O estoque mínimo não pode ser negativo";
  }

  return null;
}

export async function getProducts(companyId: string): Promise<Product[]> {
  if (!companyId) {
    console.warn("[getProducts] companyId ausente - sessão possivelmente expirada");
    throw new Error("Sessão inválida ou empresa não selecionada");
  }
  console.log("[PRODUCTS] Fetching all products...");
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .order('name');
    
    if (error) throw error;
    console.log(`[PRODUCTS] Successfully fetched ${data?.length || 0} products`);
    
    // Converter dados do banco para o tipo Product
    return (data || []).map((item: ProductFromDB) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      sku: item.sku,
      supplier: item.supplier,
      cost: item.cost,
      min_stock: item.min_stock,
      current_stock: item.current_stock,
      recipe_id: item.recipe_id,
      unit_price: item.unit_price,
      unit_weight: item.unit_weight,
      kg_weight: item.kg_weight,
      group_id: item.group_id,
      subgroup_id: item.subgroup_id,
      product_type: item.product_type as ProductType | undefined,
      code: item.code,
      all_days: item.all_days,
      monday: item.monday,
      tuesday: item.tuesday,
      wednesday: item.wednesday,
      thursday: item.thursday,
      friday: item.friday,
      saturday: item.saturday,
      sunday: item.sunday,
      ativo: item.ativo ?? true,
      company_id: item.company_id ?? companyId
    }));
  } catch (error) {
    console.error("[PRODUCTS] Error fetching products:", error);
    toast.error("Erro ao carregar produtos");
    return [];
  }
}

export async function getProduct(id: string, companyId: string): Promise<Product | null> {
  if (!companyId) {
    console.warn("[getProduct] companyId ausente - sessão possivelmente expirada");
    throw new Error("Sessão inválida ou empresa não selecionada");
  }
  console.log(`[PRODUCTS] Fetching product with ID: ${id}`);
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .maybeSingle();
    if (error) throw error;
    
    if (data) {
      return {
        id: data.id,
        name: data.name,
        unit: data.unit,
        sku: data.sku,
        supplier: data.supplier,
        cost: data.cost,
        min_stock: data.min_stock,
        current_stock: data.current_stock,
        recipe_id: data.recipe_id,
        unit_price: data.unit_price,
        unit_weight: data.unit_weight,
        kg_weight: data.kg_weight,
        group_id: data.group_id,
        subgroup_id: data.subgroup_id,
        product_type: data.product_type as ProductType | undefined,
        code: data.code,
        all_days: data.all_days,
        monday: data.monday,
        tuesday: data.tuesday,
        wednesday: data.wednesday,
        thursday: data.thursday,
        friday: data.friday,
        saturday: data.saturday,
        sunday: data.sunday,
        ativo: data.ativo ?? true,
        company_id: data.company_id ?? companyId
      };
    }
    return null;
  } catch (error) {
    console.error(`[PRODUCTS] Error fetching product with ID ${id}:`, error);
    return null;
  }
}

// Busca produto pelo nome e tipo (materia_prima, subreceita, receita)
export async function findProductByNameAndType(
  name: string,
  type: ProductType,
  companyId: string
): Promise<Product | null> {
  if (!companyId) {
    console.warn("[findProductByNameAndType] companyId ausente - sessão possivelmente expirada");
    throw new Error("Sessão inválida ou empresa não selecionada");
  }
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('name', name)
      .eq('product_type', type)
      .eq('company_id', companyId)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  } catch (error) {
    console.error(`[PRODUCTS] Error finding product by name and type:`, error);
    return null;
  }
}

export async function checkProductNameExists(name: string, companyId: string, excludeId?: string): Promise<boolean> {
  if (!companyId) {
    console.warn("[checkProductNameExists] companyId ausente - sessão possivelmente expirada");
    throw new Error("Sessão inválida ou empresa não selecionada");
  }
  try {
    const query = supabase
      .from('products')
      .select('id, name')
      .ilike('name', name)
      .eq('company_id', companyId);
    
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

export async function checkProductSkuExists(sku: string, companyId: string, excludeId?: string): Promise<boolean> {
  if (!companyId) {
    console.warn("[checkProductSkuExists] companyId ausente - sessão possivelmente expirada");
    throw new Error("Sessão inválida ou empresa não selecionada");
  }
  if (!sku) return false;
  
  try {
    const query = supabase
      .from('products')
      .select('id, sku')
      .eq('sku', sku)
      .eq('company_id', companyId);
    
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

export async function createProduct(productData: Omit<Product, 'id'>, companyId: string): Promise<Product | null> {
  if (!companyId) {
    console.warn("[createProduct] companyId ausente - sessão possivelmente expirada");
    throw new Error("Sessão inválida ou empresa não selecionada");
  }
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

    const nameExists = await checkProductNameExists(productData.name, companyId);
    if (nameExists) {
      toast.error(`Já existe um produto com o nome "${productData.name}". Escolha um nome diferente.`);
      return null;
    }

    if (productData.sku) {
      const skuExists = await checkProductSkuExists(productData.sku, companyId);
      if (skuExists) {
        toast.error(`Já existe um produto com o SKU "${productData.sku}". Escolha um SKU diferente.`);
        return null;
      }
    }

    const productToCreate = {
      // Usar productData que já deve ter product_type
      ...productData,
      company_id: companyId,
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

export async function updateProduct(id: string, productData: Partial<Product>, companyId: string): Promise<Product | null> {
  if (!companyId) {
    console.warn("[updateProduct] companyId ausente - sessão possivelmente expirada");
    throw new Error("Sessão inválida ou empresa não selecionada");
  }
  // Proteção extra: remova campo 'type' se existir
  if ('type' in productData) {
    delete (productData as any).type;
  }
  console.log(`[PRODUCTS] Updating product ${id}:`, productData);
  try {
    const currentProduct = await getProduct(id, companyId);
    if (!currentProduct) {
      toast.error("Produto não encontrado");
      return null;
    }

    const updatedProduct = {
      ...currentProduct,
      ...productData
    };
    // Remover qualquer campo is_active residual ANTES de validar/enviar
    delete (updatedProduct as any).is_active;

    const validationError = validateProduct(updatedProduct);
    if (validationError) {
      toast.error(validationError);
      return null;
    }

    if (productData.name && productData.name !== currentProduct.name) {
      const nameExists = await checkProductNameExists(productData.name, companyId, id);
      if (nameExists) {
        toast.error(`Já existe um produto com o nome "${productData.name}". Escolha um nome diferente.`);
        return null;
      }
    }

    if (productData.sku && productData.sku !== currentProduct.sku) {
      const skuExists = await checkProductSkuExists(productData.sku, companyId, id);
      if (skuExists) {
        toast.error(`Já existe um produto com o SKU "${productData.sku}". Escolha um SKU diferente.`);
        return null;
      }
    }

    const { data, error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .eq('company_id', companyId)
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

export async function deleteProduct(id: string, companyId: string): Promise<boolean> {
  if (!companyId) {
    console.warn("[deleteProduct] companyId ausente - sessão possivelmente expirada");
    throw new Error("Sessão inválida ou empresa não selecionada");
  }
  console.log(`[PRODUCTS] Deleting product with ID: ${id}`);
  try {
    // Verifica se o produto está vinculado a inventory_transactions
    const { data: productionItems, error: productionError } = await supabase
      .from('inventory_transactions')
      .select('id')
      .eq('product_id', id)
      .eq('company_id', companyId)
      .limit(1);
    
    if (productionError) throw productionError;
    
    if (productionItems && productionItems.length > 0) {
      console.log(`[PRODUCTS] Product ${id} is used in production orders and cannot be deleted`);
      toast.error("Um produto já utilizado nos pedidos de produção não pode ser excluído");
      return false;
    }

    // Deleta todos os registros em production_list_items vinculados ao produto
    const { error: prodListItemsError } = await supabase
      .from('production_list_items')
      .delete()
      .eq('product_id', id);
    if (prodListItemsError) throw prodListItemsError;

    // Agora deleta o produto
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);
    
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
export async function findSimilarProductsByName(name: string, companyId: string): Promise<Product[]> {
  if (!companyId) {
    console.warn("[findSimilarProductsByName] companyId ausente - sessão possivelmente expirada");
    throw new Error("Sessão inválida ou empresa não selecionada");
  }
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .ilike('name', `%${name}%`)
    .eq('company_id', companyId); // Usa ilike para case-insensitive e % para wildcard

  if (error) {
    console.error('[findSimilarProductsByName] Erro ao buscar produtos semelhantes:', error);
    toast.error("Erro ao buscar produtos semelhantes"); // Mensagem para o usuário
    return [];
  }
  return data || []; // Retorna os dados ou array vazio se data for null/undefined
}
