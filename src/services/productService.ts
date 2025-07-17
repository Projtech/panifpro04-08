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
  product_type_id: string | null;
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
  is_deleted: boolean | null;
  company_id: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: any; // Para permitir acesso a propriedades dinâmicas
}

// Interface para refletir a estrutura real do banco de dados
export interface Product {
  id: string; // UUID
  name: string;
  is_deleted?: boolean;
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
  setor_id?: string | null; // UUID do setor (OPCIONAL)
  product_type_id?: string | null; // UUID do tipo de produto (refletindo o banco de dados)
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
  // Informações de tipo de produto
  product_types?: { name: string } | null; // Join com product_types
  product_type?: string | null; // Nome do tipo de produto
  raw_type?: string | null; // Tipo bruto (fallback)
}

// Função para mapear dados do banco para o formato esperado pelo frontend
function mapProductFromDB(data: any, companyId?: string): Product {
  if (!data) {
    console.warn("[mapProductFromDB] Dados nulos ou indefinidos recebidos");
    // Retornar um produto vazio com valores padrão
    return {
      id: "",
      name: "",
      unit: "UN",
      sku: null,
      supplier: null,
      cost: null,
      min_stock: null,
      current_stock: null,
      company_id: companyId
    } as Product;
  }
  
  // Garantir que todos os campos necessários estejam presentes
  return {
    ...data,
    // Definir valores padrão para campos possivelmente ausentes
    unit: data.unit || "UN",
    sku: data.sku || null,
    supplier: data.supplier || null,
    cost: data.cost !== undefined ? data.cost : null,
    min_stock: data.min_stock !== undefined ? data.min_stock : 0,
    current_stock: data.current_stock !== undefined ? data.current_stock : 0,
    company_id: data.company_id || companyId || null,
    ativo: data.ativo !== undefined ? data.ativo : true
  } as Product;
}

function validateProduct(product: Omit<Product, 'id'>): string | null {
  // Ajustar validação para campos realmente obrigatórios
  if (!product.name) {
    return "Nome é obrigatório";
  }

  // Aceitar tanto product_type quanto product_type_id
  // isso resolve o problema de compatibilidade entre o frontend e backend
  if (!product.product_type_id && !(product as any).product_type) {
    return "Tipo de produto inválido";
  }

  // Unit é obrigatório para todos os tipos
  if (!product.unit) {
    return "Unidade é obrigatória";
  }

  // Validação de unidade e peso - AJUSTADA PARA MATÉRIAS-PRIMAS
  // Verificamos se é matéria-prima através do product_type_id
  // Para matérias-primas, as validações de peso são opcionais
  
  // Vamos verificar se este produto tem um tipo específico que deve ser tratado de forma diferente
  // Como não temos acesso direto ao nome do tipo aqui, vamos usar uma abordagem mais flexível
  
  // Para produtos em kg, sempre exigir kg_weight
  if (product.unit.toLowerCase() === 'kg') {
    if (!product.kg_weight || product.kg_weight <= 0) {
      return "Para produtos em kg, informe o peso total (kg)";
    }
  } else { 
    // Para produtos em unidades, só exigir unit_weight se não for matéria-prima
    // Identificamos matéria-prima se o custo está definido mas unit_weight não
    // (padrão para matérias-primas calculadas por peso/valor)
    const isPossibleRawMaterial = product.cost !== null && product.cost !== undefined && product.cost > 0;
    
    if (!isPossibleRawMaterial && (!product.unit_weight || product.unit_weight <= 0)) {
      return "Para produtos em unidades, informe o peso por unidade (kg)";
    }
  }

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

/**
 * Busca todos os produtos de uma empresa
 * @param companyId ID da empresa
 * @returns Lista de produtos
 */
export async function getProducts(companyId: string): Promise<Product[]> {
  if (!companyId) {
    console.warn("[getProducts] companyId ausente - sessão possivelmente expirada");
    throw new Error("Sessão inválida ou empresa não selecionada");
  }
  console.log("[PRODUCTS] Fetching all products...");
  try {
    // 1. Primeiro obtemos produtos sem receita associada
    const { data: productsWithoutRecipe, error } = await supabase
      .from('products')
      .select(`
        *,
        product_types!product_type_id(name)
      `)
      .eq('company_id', companyId)
      .eq('is_deleted', false)
      .is('recipe_id', null)
      .order('name');
    
    if (error) throw error;
    
    // 2. Depois obtemos produtos que estão associados a receitas não excluídas
    const { data: productsWithRecipe, error: recipeError } = await supabase
      .from('products')
      .select(`
        *,
        product_types!product_type_id(name),
        recipes!inner(*)
      `)
      .eq('company_id', companyId)
      .eq('is_deleted', false)
      .not('recipe_id', 'is', null)
      .eq('recipes.is_deleted', false)
      .order('name');
    
    if (recipeError) throw recipeError;

    // 3. Combinamos os dois conjuntos de resultados
    const allProductsData = [
      ...(productsWithoutRecipe || []),
      ...(productsWithRecipe?.map(p => {
        // Remove o campo aninhado recipes para não interferir com o tipo Product
        const { recipes, ...productData } = p;
        return productData;
      }) || [])
    ];
    
    console.log(`[PRODUCTS] Successfully fetched ${allProductsData.length} products`);
    
    // 4. Convertemos os dados para o tipo Product
    return allProductsData.map((item: any) => {
      // Garantir que todos os campos necessários estejam presentes
      const product: Product = {
        id: item.id,
        name: item.name,
        unit: item.unit || 'UN', // Valor padrão para unidade
        sku: item.sku || '',
        supplier: item.supplier || 'Produção Interna',
        cost: item.cost || 0,
        min_stock: item.min_stock || 0,
        current_stock: item.current_stock || 0,
        recipe_id: item.recipe_id || null,
        unit_price: item.unit_price || 0,
        unit_weight: item.unit_weight || null,
        kg_weight: item.kg_weight || null,
        group_id: item.group_id || null,
        subgroup_id: item.subgroup_id || null,
        product_type_id: item.product_type_id || null,
        code: item.code || null,
        all_days: item.all_days || false,
        monday: item.monday || false,
        tuesday: item.tuesday || false,
        wednesday: item.wednesday || false,
        thursday: item.thursday || false,
        friday: item.friday || false,
        saturday: item.saturday || false,
        sunday: item.sunday || false,
        ativo: item.ativo !== undefined ? item.ativo : true,
        company_id: item.company_id || companyId,
        // Adicionar informações de tipo
        product_types: item.product_types,
        product_type: item.product_types?.name || null,
        raw_type: item.raw_type || null
      } as any;
      
      // Garantir que subreceitas tenham a unidade correta
      if (product.product_type_id === 'subreceita' && product.unit.toLowerCase() !== 'kg') {
        console.warn(`Subreceita ${product.name} (${product.id}) não está com unidade 'kg'. Corrigindo...`);
        product.unit = 'kg';
      }
      
      return product;
    });
  } catch (error) {
    console.error("[PRODUCTS] Error fetching products:", error);
    toast.error("Erro ao carregar produtos");
    return [];
  }
}

/**
 * Busca produtos por tipo (materia_prima, subreceita, receita)
 * @param type Tipo do produto
 * @param companyId ID da empresa
 * @returns Lista de produtos do tipo especificado
 */
export async function getProductsByType(type: string, companyId: string): Promise<Product[]> {
  if (!companyId) {
    console.warn("[getProductsByType] companyId ausente - sessão possivelmente expirada");
    throw new Error("Sessão inválida ou empresa não selecionada");
  }
  
  console.log(`[PRODUCTS] Buscando produtos do tipo: ${type}`);
  
  try {
    // 1. Produtos sem receita associada, do tipo solicitado
    const { data: productsWithoutRecipe, error } = await supabase
      .from('products')
      .select('*')
      .eq('product_type_id', type)
      .eq('company_id', companyId)
      .eq('is_deleted', false)
      .is('recipe_id', null)
      .order('name');
    
    if (error) throw error;
    
    // 2. Produtos com receitas não excluídas, do tipo solicitado
    const { data: productsWithRecipe, error: recipeError } = await supabase
      .from('products')
      .select('*, recipes!inner(*)')
      .eq('product_type_id', type)
      .eq('company_id', companyId)
      .eq('is_deleted', false)
      .not('recipe_id', 'is', null)
      .eq('recipes.is_deleted', false)
      .order('name');
    
    if (recipeError) throw recipeError;

    // 3. Combinamos os dois conjuntos de resultados
    const allProductsData = [
      ...(productsWithoutRecipe || []),
      ...(productsWithRecipe?.map(p => {
        // Remove o campo aninhado recipes para não interferir com o tipo Product
        const { recipes, ...productData } = p;
        return productData;
      }) || [])
    ];
    
    console.log(`[PRODUCTS] Successfully fetched ${allProductsData.length} products of type ${type}`);
      
    // Converter dados do banco para o tipo Product
    return allProductsData.map((item: any) => {
      // Garantir que todos os campos necessários estejam presentes
      const product: Product = {
        id: item.id,
        name: item.name,
        unit: item.unit || (type === 'subreceita' ? 'kg' : 'UN'),
        sku: item.sku || '',
        supplier: item.supplier || 'Produção Interna',
        cost: item.cost || 0,
        min_stock: item.min_stock || 0,
        current_stock: item.current_stock || 0,
        recipe_id: item.recipe_id || null,
        unit_price: item.unit_price || 0,
        unit_weight: item.unit_weight || null,
        kg_weight: item.kg_weight || (type === 'subreceita' ? 1 : null),
        group_id: item.group_id || null,
        subgroup_id: item.subgroup_id || null,
        product_type_id: item.product_type_id || null,
        code: item.code || null,
        all_days: item.all_days || false,
        monday: item.monday || false,
        tuesday: item.tuesday || false,
        wednesday: item.wednesday || false,
        thursday: item.thursday || false,
        friday: item.friday || false,
        saturday: item.saturday || false,
        sunday: item.sunday || false,
        ativo: item.ativo !== undefined ? item.ativo : true,
        company_id: item.company_id || companyId
      };
      
      // Garantir que subreceitas tenham a unidade correta
      if (product.product_type_id === 'subreceita' && product.unit.toLowerCase() !== 'kg') {
        console.warn(`Subreceita ${product.name} (${product.id}) não está com unidade 'kg'. Corrigindo...`);
        product.unit = 'kg';
      }
      
      return product;
    });
  } catch (error) {
    console.error(`[PRODUCTS] Erro ao buscar produtos do tipo ${type}:`, error);
    toast.error(`Erro ao carregar produtos do tipo ${type}`);
    return [];
  }
}

/**
 * Busca um produto pelo ID
 * @param id ID do produto
 * @param companyId ID da empresa
 * @returns O produto encontrado ou null se não existir
 */
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
      .eq('company_id', companyId);

    if (error) {
      console.error('[getProduct] Error fetching product:', error);
      throw new Error(`Erro ao buscar produto: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data[0] as unknown as Product;
  } catch (error) {
    console.error('[getProduct] Error:', error);
    throw error;
  }
}

// Busca produto pelo nome e tipo (materia_prima, subreceita, receita)
export async function findProductByNameAndType(
  name: string,
  type: string,
  companyId: string
): Promise<Product | null> {
  if (!companyId) {
    console.warn("[findProductByNameAndType] companyId ausente - sessão possivelmente expirada");
    throw new Error("Sessão inválida ou empresa não selecionada");
  }
  console.log(`[PRODUCTS] Buscando produto por nome e tipo: ${name}, ${type}`);
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('name', name)
      .eq('product_type_id', type)
      .eq('company_id', companyId);
      
    if (error) throw error;
    
    if (!data) {
      console.log(`[PRODUCTS] Nenhum produto encontrado com o nome "${name}" e tipo "${type}"`);
      return null;
    }
    
    return mapProductFromDB(data, companyId);
  } catch (error) {
    console.error(`[PRODUCTS] Error finding product by name and type:`, error);
    return null;
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
  console.log("[PRODUCTS] Product data to create:", productData);
  
  try {
    // Se for uma subreceita, garantir que a unidade seja 'kg' e que o kg_weight esteja definido
    if (productData.product_type_id === 'subreceita') {
      console.log("[PRODUCTS] Criando subreceita, garantindo unidade 'kg' e kg_weight");
      productData.unit = 'kg';
      
      // Se não houver kg_weight definido, definir um valor padrão
      if (!productData.kg_weight || productData.kg_weight <= 0) {
        productData.kg_weight = 1; // Usar 1kg como padrão
        console.warn(`[PRODUCTS] kg_weight não definido para nova subreceita. Usando valor padrão: 1kg`);
      }
      
      // Garantir que unit_weight seja nulo para subreceitas
      productData.unit_weight = null;
    }
    
    const validationError = validateProduct(productData);
    if (validationError) {
      console.error("[PRODUCTS] Erro de validação ao criar produto:", validationError);
      toast.error(validationError);
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
      // Usar productData que já deve ter product_type_id
      ...productData,
      company_id: companyId,
      // Garantir valores padrão para campos NOT NULL ou com defaults no DB
      // se productData não os tiver ou forem undefined/null
      cost: productData.cost ?? 0, // Custo é NOT NULL
      min_stock: productData.min_stock ?? 0, // min_stock é NOT NULL
      current_stock: productData.current_stock ?? 0,
      unit_price: productData.unit_price ?? 0
      // product_type foi removido, agora usamos product_type_id que já vem em productData
    };

    console.log("[PRODUCTS] Product object to insert:", productToCreate);
    
    const { data, error } = await supabase
      .from('products')
      .insert([productToCreate])
      .select()
      .single();
    
    console.log("[PRODUCTS] Insert response:", { data, error });
    
    if (error) throw error;
    
    console.log(`[PRODUCTS] Successfully created product: ${data.name} with ID: ${data.id}`);
    
    const mappedProduct = mapProductFromDB(data, companyId);
    console.log("[PRODUCTS] Mapped product:", mappedProduct);
    
    toast.success("Produto criado com sucesso");
    return mappedProduct;
  } catch (error: any) {
    console.error("[PRODUCTS] Error creating product:", error);
    // Log do erro bruto vindo do Supabase
    console.error("[PRODUCTS] Raw Supabase Error:", JSON.stringify(error, null, 2));
    toast.error("Erro ao criar produto");
    return null;
  }
}

// Função auxiliar para verificar se um SKU já existe
async function checkProductSkuExists(sku: string, companyId: string, excludeId?: string): Promise<boolean> {
  if (!sku || !companyId) return false;
  
  try {
    let query = supabase
      .from('products')
      .select('id')
      .eq('sku', sku)
      .eq('company_id', companyId)
      .eq('is_deleted', false);
      
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[PRODUCTS] Erro ao verificar SKU existente:', error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (err) {
    console.error('[PRODUCTS] Erro ao verificar SKU existente:', err);
    return false;
  }
}

export async function updateProduct(productId: string, productData: Partial<Product & { is_deleted?: boolean }>, companyId: string): Promise<Product | null> {
  try {
    console.log('[PRODUCTS] Iniciando atualização de produto:', productId);
    console.log('[PRODUCTS] Dados para atualização:', productData);
    
    // Se o produto não for encontrado, isso é um erro
    // Temporariamente usando getProduct em vez de getProductById
    const existingProduct = await getProduct(productId, companyId);
    if (!existingProduct) {
      console.error('[PRODUCTS] Produto não encontrado para atualização:', productId);
      return null;
    }
    
    console.log('[PRODUCTS] Produto existente:', existingProduct.name, 'tipo atual:', existingProduct.product_type_id);
    
    // Se o product_type_id for fornecido, valide-o
    if (productData.product_type_id !== undefined && !productData.product_type_id) {
      console.error('[PRODUCTS] Tipo de produto inválido:', productData.product_type_id);
      throw new Error('Tipo de produto inválido');
    }
    
    if (productData.product_type_id) {
      console.log('[PRODUCTS] Novo tipo de produto:', productData.product_type_id);
    }

    const productToUpdate: { [key: string]: any } = {};
    
    // Atualizar apenas os campos que foram fornecidos
    Object.entries(productData).forEach(([key, value]) => {
      // Ignore id, company_id e recipe_id pois não devem ser atualizados dessa forma
      if (key !== 'id' && key !== 'company_id' && key !== 'recipe_id') {
        productToUpdate[key] = value;
      }
    });
    
    // Verifica se é uma subreceita pelo product_type_id ou pelo valor mapeado no frontend
    const isSubreceita = 
      ((productData as any).product_type === 'subreceita') || 
      ((existingProduct as any).product_type === 'subreceita') ||
      // Verificação pelo ID de tipo de produto para subreceita
      (existingProduct.product_type_id && existingProduct.product_type_id.toLowerCase().includes('sub'));
    
    if (isSubreceita) {
      console.log("[PRODUCTS] Atualizando subreceita, garantindo unidade 'kg' e kg_weight");
      productData.unit = 'kg';
      
      // Se não houver kg_weight definido, tentar usar o valor atual ou definir um padrão
      if (!productData.kg_weight) {
        productData.kg_weight = existingProduct.kg_weight || 1; // Usar 1kg como padrão se não houver valor
        console.warn(`[PRODUCTS] kg_weight não definido para subreceita ${productId}. Usando valor padrão: ${productData.kg_weight}kg`);
      }
      
      // Garantir que unit_weight seja nulo para subreceitas
      productData.unit_weight = null;
    }

    const updatedProduct = {
      ...existingProduct,
      ...productData
    };
    
    // Remover qualquer campo is_active residual ANTES de validar/enviar
    delete (updatedProduct as any).is_active;

    const validationError = validateProduct(updatedProduct);
    if (validationError) {
      toast.error(validationError);
      return null;
    }

    // Validação de nome duplicado removida conforme solicitado

    if (productData.sku && productData.sku !== existingProduct.sku) {
      const skuExists = await checkProductSkuExists(productData.sku, companyId, productId);
      if (skuExists) {
        toast.error(`Já existe um produto com o SKU "${productData.sku}". Escolha um SKU diferente.`);
        return null;
      }
    }

    console.log('[PRODUCTS] Dados que serão enviados para o banco:', productToUpdate);
    
    const { data, error } = await supabase
      .from('products')
      .update(productToUpdate)  // Usando productToUpdate em vez de productData diretamente
      .eq('id', productId)     // Correção: usando productId em vez de id
      .eq('company_id', companyId)
      .select()
      .single();
    
    console.log('[PRODUCTS] Resultado da atualização:', data, error);
    
    if (error) throw error;
    console.log(`[PRODUCTS] Successfully updated product: ${data.name}`);
    toast.success("Produto atualizado com sucesso");
    return data as unknown as Product;
  } catch (error) {
    console.error(`[PRODUCTS] Error updating product ${productId}:`, error);
    toast.error("Erro ao atualizar produto");
    return null;
  }
}

export async function deleteProduct(id: string, companyId: string): Promise<boolean> {
  if (!companyId) {
    console.warn("[deleteProduct] companyId ausente - sessão possivelmente expirada");
    throw new Error("Sessão inválida ou empresa não selecionada");
  }
  console.log(`[PRODUCTS] Marking product as deleted (soft delete) with ID: ${id}`);
  try {
    // Em vez de excluir fisicamente, apenas marca como excluído
    const { error } = await supabase
      .from('products')
      .update({ is_deleted: true })
      .eq('id', id)
      .eq('company_id', companyId);
    
    if (error) throw error;
    
    console.log(`[PRODUCTS] Successfully marked product as deleted with ID: ${id}`);
    toast.success("Produto excluído com sucesso");
    return true;
  } catch (error) {
    console.error(`[PRODUCTS] Error marking product as deleted ${id}:`, error);
    toast.error("Erro ao excluir produto");
    return false;
  }
}

// Busca produtos com nomes semelhantes (início, meio ou fim, case insensitive)
export async function findSimilarProductsByName(name: string, companyId: string): Promise<Product[]> {
  try {
    if (!name || !companyId) {
      return [];
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_deleted', false)
      .ilike('name', `%${name}%`);

    if (error) throw error;
    
    return data.map(item => mapProductFromDB(item, companyId));
  } catch (error) {
    console.error('Erro ao buscar produtos similares:', error);
    return [];
  }
}

// Busca produtos por termo de pesquisa para autocomplete
export async function searchProductsByTerm(
  companyId: string, 
  searchTerm: string, 
  productType?: string
): Promise<Product[]> {
  try {
    if (!companyId) {
      console.warn('[searchProductsByTerm] companyId ausente - sessão possivelmente expirada');
      return [];
    }

    // Criar a query base
    let query = supabase
      .from('products')
      .select(`
        *,
        product_types!product_type_id(name)
      `)
      .eq('company_id', companyId)
      .eq('is_deleted', false);

    // Se houver um termo de busca, adicionar filtro ilike
    if (searchTerm && searchTerm.trim() !== '') {
      query = query.ilike('name', `%${searchTerm}%`);
    }

    // Se houver um tipo de produto específico, filtrar por ele
    if (productType) {
      // Log para depuração
      console.log(`[searchProductsByTerm] Buscando produtos do tipo: ${productType}`);
      
      // Se estamos buscando por tipo de produto pelo nome (materia_prima, etc)
      const { data: typeData } = await supabase
        .from('product_types')
        .select('*')
        .ilike('name', `%${productType}%`) // Busca mais flexível (contendo o termo)
        .eq('company_id', companyId);
      
      console.log(`[searchProductsByTerm] Tipos encontrados:`, typeData);
      
      if (typeData && typeData.length > 0) {
        // Se encontrou o tipo, usar o primeiro
        query = query.eq('product_type_id', typeData[0].id);
        console.log(`[searchProductsByTerm] Usando tipo ID: ${typeData[0].id} (${typeData[0].name})`);
      } else {
        // Se não encontrou o tipo, tentar buscar produtos diretamente pelo campo raw_type
        console.log(`[searchProductsByTerm] Tipo não encontrado, tentando pelo campo raw_type`);
        query = query.ilike('raw_type', `%${productType}%`);
      }
    }

    // Limitar resultados para performance
    query = query.limit(10);

    const { data, error } = await query;

    console.log(`[searchProductsByTerm] Query executada - Dados retornados:`, data?.length || 0);
    console.log(`[searchProductsByTerm] Primeiros resultados:`, data?.slice(0, 3));

    if (error) {
      console.error('Erro ao buscar produtos:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log(`[searchProductsByTerm] Nenhum produto encontrado para termo: "${searchTerm}" e tipo: "${productType}"`);
      return [];
    }

    // Map the data to the expected format
    const products = data.map((item) => mapProductFromDB(item, companyId));
    console.log(`[searchProductsByTerm] Produtos mapeados:`, products.length);
    console.log(`[searchProductsByTerm] Primeiro produto mapeado:`, products[0]);
    return products;
  } catch (error) {
    console.error('Erro em searchProductsByTerm:', error);
    return [];
  }
}

// Função para verificar se um nome de produto já existe
export async function checkProductNameExists(name: string, companyId: string, excludeId?: string): Promise<boolean> {
  if (!name || !companyId) return false;
  
  try {
    let query = supabase
      .from('products')
      .select('id')
      .ilike('name', name)
      .eq('company_id', companyId)
      .eq('is_deleted', false); // Considerar apenas produtos ativos
      
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[PRODUCTS] Erro ao verificar nome existente:', error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (err) {
    console.error('[PRODUCTS] Erro ao verificar nome existente:', err);
    return false;
  }
}
