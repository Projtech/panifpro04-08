import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getProduct, Product } from "./productService";
import { getRecipe } from "./recipeService";

// Função manual para gerar UUID v4
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Interfaces para tipagem
export interface ProductionList {
  id: string;
  name: string;
  user_id?: string; // Opcional
  created_at: string;
  updated_at: string;
  description: string | null;
  type: 'daily' | 'custom';
}

export interface ProductionListItem {
  id: string;
  list_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  unit: 'KG' | 'UN';
}

// Interface com detalhes simplificados do produto para evitar tipagem excessivamente profunda
export interface ProductItemDetails {
  id: string;
  name: string;
  unit: string;
  product_type?: string;
  group_id?: string;
  subgroup_id?: string;
}

export interface ProductionListItemWithDetails extends ProductionListItem {
  product?: ProductItemDetails;
}

// Tipo para os itens da lista automática
interface ListaAutomaticaItem {
  product_id: string;
  quantity: number;
  unit: string;
}

interface ProductionListInsert {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  description: string | null;
  type: 'daily' | 'custom';
}

interface ProductionListItemInsert {
  id: string;
  list_id: string;
  product_id: string;
  quantity: number;
  unit: string;
  created_at: string;
  updated_at: string;
}

// Função para verificar se uma lista já existe
// Retorna todos os IDs encontrados (array)
async function verificarListasExistentes(userId: string | null, nomeLista: string): Promise<string[]> {
  let query = supabase
    .from("production_lists")
    .select("id")
    .eq("name", nomeLista);
  if (userId === null) {
    query = query.is("user_id", null);
  } else {
    query = query.eq("user_id", userId);
  }
  const { data } = await query;
  if (!data) return [];
  return Array.isArray(data) ? data.map(d => d.id) : [data.id];
}

// Deleta uma lista e seus itens
async function deletarLista(listId: string) {
  await deletarItensLista(listId);
  await supabase.from("production_lists").delete().eq("id", listId);
}

// Função para deletar itens de uma lista existente
async function deletarItensLista(listId: string): Promise<void> {
  const { error } = await supabase
    .from("production_list_items")
    .delete()
    .eq("list_id", listId);
  
  if (error) throw error;
}

// Função para atualizar uma lista existente
async function atualizarLista(listId: string, updatedAt: string): Promise<void> {
  const { error } = await supabase
    .from("production_lists")
    .update({ updated_at: updatedAt })
    .eq("id", listId);
  
  if (error) throw error;
}

// Função para criar uma nova lista
async function criarNovaLista(listData: ProductionListInsert): Promise<void> {
  const { error } = await supabase
    .from("production_lists")
    .insert([listData]);
  
  if (error) throw error;
}

// Função para inserir itens em uma lista
async function inserirItensLista(items: ProductionListItemInsert[]): Promise<void> {
  const { error } = await supabase
    .from("production_list_items")
    .insert(items);
  
  if (error) throw error;
}

// Função principal para salvar pré-lista automática
export async function salvarPreListaAutomatica(
  listaAutomatica: ListaAutomaticaItem[], 
  userId: string, 
  nomeLista: string,
  type: 'daily' | 'custom' = 'custom'
) {
  const listaId = uuidv4();
  const now = new Date().toISOString();
  
  try {
    // Verificar se já existe uma lista com o mesmo nome para o mesmo usuário
    const existingListIds = await verificarListasExistentes(userId, nomeLista);

    // Sempre delete todas as listas existentes antes de criar nova
    for (const id of existingListIds) {
      await deletarLista(id);
    }
    
    // Preparar dados da nova lista
    const listData: ProductionListInsert = { 
      id: listaId, 
      name: nomeLista, 
      user_id: userId, 
      created_at: now, 
      updated_at: now, 
      description: "Gerada automaticamente pelo calendário de produção",
      type
    };
    
    // Criar nova lista
    await criarNovaLista(listData);
    
    // Preparar itens para inserção
    const itemsToInsert = listaAutomatica.map(item => ({
      id: uuidv4(),
      list_id: listaId,
      product_id: item.product_id,
      quantity: item.quantity,
      unit: item.unit,
      created_at: now,
      updated_at: now
    }));
    
    // Inserir novos itens
    await inserirItensLista(itemsToInsert);
    
    return { success: true, listId: listaId };

  } catch (error) {
    console.error("Erro ao salvar pré-lista automática:", error);
    toast.error("Erro ao salvar pré-lista automática");
    return { success: false, error };
  }
}

// Buscar todas as listas de produção
export async function getProductionLists(): Promise<ProductionList[]> {
  try {
    const { data, error } = await supabase
      .from("production_lists")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    // Garantir que os dados retornados correspondam à interface ProductionList
    return (data || []) as ProductionList[];
  } catch (error) {
    console.error("Erro ao buscar listas de produção:", error);
    toast.error("Erro ao buscar listas de produção");
    return [];
  }
}

// Buscar itens de uma lista específica
export async function getProductionListItems(listId: string): Promise<ProductionListItem[]> {
  try {
    const { data, error } = await supabase
      .from("production_list_items")
      .select("*")
      .eq("list_id", listId);
    
    if (error) throw error;
    // Garantir que os dados retornados correspondam à interface ProductionListItem
    return (data || []) as ProductionListItem[];
  } catch (error) {
    console.error(`Erro ao buscar itens da lista ${listId}:`, error);
    toast.error("Erro ao buscar itens da lista");
    return [];
  }
}

// Esta função foi movida para a versão exportada abaixo

// Buscar itens de uma lista com detalhes dos produtos
export async function getProductionListItemsWithDetails(listId: string): Promise<any[]> {
  try {
    // 1. Buscar todos os itens da lista
    const { data: items, error: itemsError } = await supabase
      .from('production_list_items')
      .select('*')
      .eq('list_id', listId);
    if (itemsError) throw itemsError;
    if (!items || items.length === 0) return [];

    // 2. Buscar todos os produtos necessários em lote
    const productIds = items.map((item: any) => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);
    if (productsError) throw productsError;

    // 3. Buscar todas as receitas necessárias em lote
    const recipeIds = products.map((product: any) => product.recipe_id).filter(Boolean);
    let recipes: any[] = [];
    if (recipeIds.length > 0) {
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('*')
        .in('id', recipeIds);
      if (recipesError) throw recipesError;
      recipes = recipesData || [];
    }

    // 4. Montar estrutura final
    return items.map((item: any) => {
      const product = products.find((p: any) => p.id === item.product_id);
      const recipe = product ? recipes.find((r: any) => r.id === product.recipe_id) : null;
      return {
        ...item,
        product,
        recipe,
      };
    });
  } catch (error) {
    console.error(`Erro ao buscar itens com detalhes da lista ${listId}:`, error);
    toast.error("Erro ao buscar detalhes dos produtos/receitas");
    return [];
  }
}

// Criar nova lista de produção
export async function createProductionList(
  listData: Omit<ProductionList, 'id' | 'created_at' | 'updated_at'>,
  itemsData: Omit<ProductionListItem, 'id' | 'list_id' | 'created_at' | 'updated_at'>[]
): Promise<{ success: boolean, listId?: string, error?: any }> {
  try {
    const listId = uuidv4();
    const now = new Date().toISOString();
    
    // Preparar dados da lista
    const listInsertData: ProductionListInsert = {
      id: listId,
      name: listData.name,
      user_id: (listData.user_id && listData.user_id !== '' ? listData.user_id : null), // Permite null, nunca string vazia
      created_at: now,
      updated_at: now,
      description: listData.description,
      type: listData.type
    };
    
    // Inserir lista
    const { error: listError } = await supabase
      .from("production_lists")
      .insert([listInsertData]);
    
    if (listError) throw listError;
    
    // Inserir itens
    if (itemsData && itemsData.length > 0) {
      const formattedItems = itemsData.map(item => ({
        id: uuidv4(),
        list_id: listId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit: item.unit,
        created_at: now,
        updated_at: now
      }));
      
      const { error: itemsError } = await supabase
        .from("production_list_items")
        .insert(formattedItems);
      
      if (itemsError) throw itemsError;
    }
    
    toast.success("Lista de produção criada com sucesso");
    return { success: true, listId };
  } catch (error) {
    console.error("Erro ao criar lista de produção:", error);
    toast.error("Erro ao criar lista de produção");
    return { success: false, error };
  }
}

// Atualizar lista existente
export async function updateProductionList(
  listId: string,
  listData: Partial<Omit<ProductionList, 'id' | 'created_at' | 'user_id'>>,
  itemsData?: Omit<ProductionListItem, 'id' | 'list_id' | 'created_at' | 'updated_at'>[]
): Promise<{ success: boolean, error?: any }> {
  try {
    const now = new Date().toISOString();
    
    // Verificar se a lista existe
    const { data: existingList } = await supabase
      .from("production_lists")
      .select("*")
      .eq("id", listId)
      .single();
    
    if (!existingList) {
      throw new Error(`Lista com ID ${listId} não encontrada`);
    }
    
    // Converter para o tipo ProductionList para acessar a propriedade type
    const typedList = existingList as unknown as ProductionList;
    
    // Não permitir alteração de listas diárias (exceto pelo processo apropriado)
    if (typedList.type === 'daily' && !listData.type) {
      throw new Error("Não é possível atualizar listas diárias diretamente");
    }
    
    // Atualizar dados da lista
    const { error: listError } = await supabase
      .from("production_lists")
      .update({ ...listData, updated_at: now })
      .eq("id", listId);
    
    if (listError) throw listError;
    
    // Se fornecidos novos itens, atualizar
    if (itemsData) {
      // Remover itens existentes usando a função auxiliar
      await deletarItensLista(listId);
      
      // Inserir novos itens
      if (itemsData.length > 0) {
        const formattedItems = itemsData.map(item => ({
          id: uuidv4(),
          list_id: listId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit: item.unit,
          created_at: now,
          updated_at: now
        }));
        
        const { error: insertError } = await supabase
          .from("production_list_items")
          .insert(formattedItems);
        
        if (insertError) throw insertError;
      }
    }
    
    toast.success("Lista de produção atualizada com sucesso");
    return { success: true };
  } catch (error) {
    console.error(`Erro ao atualizar lista ${listId}:`, error);
    toast.error("Erro ao atualizar lista de produção");
    return { success: false, error };
  }
}

// Excluir lista e seus itens
export async function deleteProductionList(listId: string): Promise<{ success: boolean, error?: any }> {
  try {
    // Verificar se a lista existe
    const { data } = await supabase
      .from("production_lists")
      .select("*")
      .eq("id", listId)
      .single();
    
    if (!data) {
      throw new Error(`Lista com ID ${listId} não encontrada`);
    }
    
    // Converter para o tipo ProductionList para acessar a propriedade type
    const typedList = data as unknown as ProductionList;
    
    // Não permitir exclusão de listas diárias (precaução, pode ser removida se necessário)
    if (typedList.type === 'daily') {
      throw new Error("Não é recomendado excluir listas diárias manualmente");
    }
    
    // Primeiro, excluir os itens da lista (usando função auxiliar já criada)
    await deletarItensLista(listId);
    
    // Em seguida, excluir a própria lista
    const { error } = await supabase
      .from("production_lists")
      .delete()
      .eq("id", listId);
    
    if (error) throw error;
    
    toast.success("Lista excluída com sucesso");
    return { success: true };
  } catch (error) {
    console.error(`Erro ao excluir lista ${listId}:`, error);
    toast.error("Erro ao excluir lista");
    return { success: false, error };
  }
}

// Calcular quantidade baseada no rendimento da receita
export async function calculateProductQuantity(productId: string): Promise<{quantity: number, unit: string}> {
  try {
    // Buscar o produto com detalhes
    const product = await getProduct(productId);
    if (!product) throw new Error(`Produto não encontrado: ${productId}`);
    
    // Definir a unidade baseada no produto
    const unit = product.unit || 'KG';
    
    // Se for receita ou subreceita, buscar os dados da receita para obter rendimento
    if ((product.product_type === 'receita' || product.product_type === 'subreceita') && product.recipe_id) {
      const recipe = await getRecipe(product.recipe_id);
      if (recipe) {
        // Usar o rendimento apropriado baseado na unidade
        if (unit === 'KG' && recipe.yield_kg) {
          return { quantity: recipe.yield_kg, unit };
        } else if (unit === 'UN' && recipe.yield_units) {
          return { quantity: recipe.yield_units, unit };
        }
      }
    }
    
    // Fallback: se não conseguir determinar a quantidade ideal
    return { quantity: 1, unit };
  } catch (error) {
    console.error(`Erro ao calcular quantidade para produto ${productId}:`, error);
    return { quantity: 1, unit: 'KG' };
  }
}

// Gerar/atualizar as 7 listas diárias
export async function generateDailyLists(userId?: string): Promise<{ success: boolean, lists?: string[], error?: any }> {
  try {
    // Se não houver userId, apenas gere listas globais (ou para teste)
    // if (!userId) throw new Error("Usuário não autenticado");
    
    // Buscar todos os produtos
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*");
    
    if (productsError) throw productsError;
    if (!products || products.length === 0) {
      toast.info("Nenhum produto encontrado para gerar listas diárias");
      return { success: false, error: "Nenhum produto encontrado" };
    }
    
    // Lista para armazenar os IDs das listas criadas
    const createdLists: string[] = [];
    
    // Para cada dia da semana
    const days = [
      { key: 'monday', name: 'Segunda-feira' },
      { key: 'tuesday', name: 'Terça-feira' },
      { key: 'wednesday', name: 'Quarta-feira' },
      { key: 'thursday', name: 'Quinta-feira' },
      { key: 'friday', name: 'Sexta-feira' },
      { key: 'saturday', name: 'Sábado' },
      { key: 'sunday', name: 'Domingo' }
    ];
    
    for (const day of days) {
      // Filtrar produtos para este dia
      // Um produto é selecionado se o campo específico do dia (ex: monday) ou all_days for true
      const dayProducts = products.filter(p => {
        const typedProduct = p as unknown as Product;
        return typedProduct[day.key] === true || typedProduct.all_days === true;
      });
      
      if (dayProducts.length === 0) continue;
      
      // Para cada produto, calcular a quantidade baseada no rendimento
      const items: Array<{ product_id: string; quantity: number; unit: string }> = [];
      
      for (const product of dayProducts) {
        // Calcular quantidade baseada no rendimento
        const { quantity, unit } = await calculateProductQuantity(product.id);
        
        items.push({
          product_id: product.id,
          quantity,
          unit
        });
      }
      
      // Criar nome para a lista diária
      const nomeLista = `Produção de ${day.name}`;
      
      // Salvar a lista no banco de dados com tipo 'daily'
      const result = await salvarPreListaAutomatica(items, userId ?? null, nomeLista, 'daily');
      
      if (result.success && result.listId) {
        createdLists.push(result.listId);
      }
    }
    
    toast.success("Listas diárias geradas com sucesso");
    return { 
      success: true, 
      lists: createdLists 
    };
  } catch (error) {
    console.error("Erro ao gerar listas diárias:", error);
    toast.error("Erro ao gerar listas diárias");
    return { 
      success: false, 
      error 
    };
  }
}
