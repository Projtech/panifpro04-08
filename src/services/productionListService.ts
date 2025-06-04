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
  setor_id?: string;
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
  user_id: string | null; // Mudando para string | null
  created_at: string;
  updated_at: string;
  description: string | null;
  type: 'daily' | 'custom';
  company_id: string;
}

interface ProductionListItemInsert {
  id: string;
  list_id: string;
  product_id: string;
  quantity: number;
  unit: 'KG' | 'UN'; // Limitando as unidades possíveis
  created_at: string; // Alterando para string
  updated_at: string; // Alterando para string
  company_id: string; // Adicionando company_id como obrigatório
}

// Função para verificar se uma lista já existe
// Retorna todos os IDs encontrados (array)
async function verificarListasExistentes(userId: string | null, nomeLista: string, companyId: string): Promise<string[]> {
  let query = supabase
    .from("production_lists")
    .select("id")
    .eq("name", nomeLista)
    .eq("company_id", companyId);
  
  if (userId === null) {
    query = query.is("user_id", null);
  } else {
    query = query.eq("user_id", userId);
  }

  const { data } = await query;
  if (!data) return [];
  
  // Verifica se data é um array
  if (!Array.isArray(data)) return [data.id];
  
  return data.map(d => d.id);
}

// Deleta uma lista e seus itens
async function deletarLista(listId: string, companyId: string) {
  await deletarItensLista(listId, companyId);
  await supabase.from("production_lists").delete().eq("id", listId).eq("company_id", companyId);
}

// Função para deletar itens de uma lista existente
async function deletarItensLista(listId: string, companyId: string): Promise<void> {
  const { error } = await supabase
    .from("production_list_items")
    .delete()
    .eq("list_id", listId)
    .eq("company_id", companyId);
  
  if (error) throw error;
}

// Função para atualizar uma lista existente
async function atualizarLista(listId: string, updatedAt: string, companyId: string): Promise<void> {
  const { error } = await supabase
    .from("production_lists")
    .update({ updated_at: updatedAt })
    .eq("id", listId)
    .eq("company_id", companyId);
  
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
async function inserirItensLista(items: (ProductionListItemInsert & { company_id: string })[]): Promise<void> {
  const { error } = await supabase
    .from("production_list_items")
    .insert(items);
  
  if (error) throw error;
}

// Função utilitária para sobrescrever ou criar lista diária (upsert)
async function upsertDailyProductionList(
  listaAutomatica: ListaAutomaticaItem[],
  nomeLista: string,
  companyId: string
): Promise<{ success: boolean, listId: string }> {
  const now = new Date().toISOString();
  console.log(`[upsertDailyProductionList] Iniciando processamento para nomeLista: ${nomeLista}, companyId: ${companyId}`);
  console.log(`[upsertDailyProductionList] Itens a processar:`, listaAutomatica);

  // Buscar lista existente (type='daily', nome, companyId)
  const { data: existingLists, error } = await supabase
    .from("production_lists")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", nomeLista)
    .eq("type", "daily");

  if (error) {
    console.error(`[upsertDailyProductionList] Erro ao buscar lista existente:`, error);
    throw error;
  }

  let listId: string;
  if (existingLists && existingLists.length > 0) {
    // Pegar o primeiro item se houver múltiplos (não deveria acontecer, mas por segurança)
    const existingList = existingLists[0];
    console.log(`[upsertDailyProductionList] Lista existente encontrada com ID: ${existingList.id}`);
    // Se existir, sobrescreve
    listId = existingList.id;
    
    // Log antes da exclusão
    console.log(`[upsertDailyProductionList] Tentando deletar itens para listId: ${listId}`);

    // Estratégia 'Excluir e Incluir' para listas diárias
    // Exclui todos os itens antigos da lista diária antes de inserir os novos
    const { data: deleteData, error: deleteError } = await supabase
      .from('production_list_items')
      .delete()
      .eq('list_id', listId)
      .eq('company_id', companyId);

    if (deleteError) {
      console.error(`[upsertDailyProductionList] ERRO ao deletar itens para listId ${listId}:`, deleteError);
      throw deleteError;
    } else {
      console.log(`[upsertDailyProductionList] Sucesso ao deletar itens para listId ${listId}`);
    }
    const itemsToInsert = listaAutomatica.map(item => ({
      id: uuidv4(),
      list_id: listId,
      product_id: item.product_id,
      quantity: item.quantity,
      unit: item.unit.toUpperCase() as 'KG' | 'UN',
      created_at: now,
      updated_at: now,
      company_id: companyId
    }));

    console.log(`[upsertDailyProductionList] Itens a serem inseridos (total: ${itemsToInsert.length}):`, itemsToInsert);

    await inserirItensLista(itemsToInsert);
    await atualizarLista(listId, now, companyId);
    console.log(`[upsertDailyProductionList] Lista atualizada com sucesso. ID: ${listId}`);
    return { success: true, listId };
  } else {
    console.log(`[upsertDailyProductionList] Criando nova lista com nome: ${nomeLista}`);
    // Se não existir, cria nova
    listId = uuidv4();
    const listData: ProductionListInsert & { company_id: string } = {
      id: listId,
      name: nomeLista,
      user_id: null,
      created_at: now,
      updated_at: now,
      description: "Gerada automaticamente pelo calendário de produção",
      type: 'daily',
      company_id: companyId
    };
    await criarNovaLista(listData);
    const itemsToInsert = listaAutomatica.map(item => ({
      id: uuidv4(),
      list_id: listId,
      product_id: item.product_id,
      quantity: item.quantity,
      unit: item.unit.toUpperCase() as 'KG' | 'UN',
      created_at: now,
      updated_at: now,
      company_id: companyId
    }));
    await inserirItensLista(itemsToInsert);
    return { success: true, listId };
  }
}

// Função principal para salvar pré-lista automática
export async function salvarPreListaAutomatica(
  listaAutomatica: ListaAutomaticaItem[], 
  userId: string, 
  nomeLista: string,
  companyId: string,
  type: 'daily' | 'custom' = 'custom'
) {
  const listaId = uuidv4();
  const now = new Date().toISOString();
  
  try {
    // Verificar se já existe uma lista com o mesmo nome para o mesmo usuário
    const existingListIds = await verificarListasExistentes(userId, nomeLista, companyId);

    // Sempre delete todas as listas existentes antes de criar nova
    for (const id of existingListIds) {
      await deletarLista(id, companyId);
    }
    
    // Preparar dados da nova lista
    const listData: ProductionListInsert & { company_id: string } = { 
      id: listaId, 
      name: nomeLista, 
      user_id: userId, 
      created_at: now, 
      updated_at: now, 
      description: "Gerada automaticamente pelo calendário de produção",
      type,
      company_id: companyId
    };
    
    // Criar nova lista
    await criarNovaLista(listData);
    
    // Preparar itens para inserção
    const itemsToInsert = listaAutomatica.map(item => ({
      id: uuidv4(),
      list_id: listaId,
      product_id: item.product_id,
      quantity: item.quantity,
      // Garante que a unidade seja sempre KG ou UN maiúsculo
      unit: item.unit.toUpperCase() as 'KG' | 'UN',
      created_at: now,
      updated_at: now,
      company_id: companyId
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
export async function getProductionLists(companyId: string | null | undefined): Promise<ProductionList[]> {
  // Validação do companyId recebido
  if (!companyId || typeof companyId !== 'string') { // Verifica se é nulo, indefinido ou não é string
    console.warn("[getProductionLists] Tentativa de buscar listas sem companyId válido. companyId recebido:", companyId);
    // Retorna array vazio para evitar erro na consulta ao Supabase
    return [];
  }
  try {
    const { data, error } = await supabase
      .from("production_lists")
      .select("*")
      .eq("company_id", companyId)
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
export async function getProductionListItems(listId: string, companyId: string): Promise<ProductionListItem[]> {
  try {
    const { data, error } = await supabase
      .from("production_list_items")
      .select("*")
      .eq("list_id", listId)
      .eq("company_id", companyId);
    
    if (error) throw error;
    // Garantir que os dados retornados correspondam à interface ProductionListItem
    return (data || []) as ProductionListItem[];
  } catch (error) {
    console.error(`Erro ao buscar itens da lista ${listId}:`, error);
    toast.error("Erro ao buscar itens da lista");
    return [];
  }
}

// Buscar itens de uma lista com detalhes dos produtos
export async function getProductionListItemsWithDetails(listId: string, companyId: string): Promise<ProductionListItemWithDetails[]> {
  try {
    if (!companyId || typeof companyId !== "string") return [];
    
    // 1. Buscar todos os itens da lista
    const { data: items, error: itemsError } = await supabase
      .from('production_list_items')
      .select('*')
      .eq('list_id', listId)
      .eq('company_id', companyId);
    
    if (itemsError) throw itemsError;
    if (!items || items.length === 0) return [];

    // 2. Buscar todos os produtos necessários em lote
    const productIds = items.map((item: any) => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, unit, recipe_id')
      .in('id', productIds)
      .eq('company_id', companyId);
    
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
  listData: Omit<ProductionList, 'id' | 'created_at' | 'updated_at'> & { companyId: string },
  itemsData: (Omit<ProductionListItem, 'id' | 'list_id' | 'created_at' | 'updated_at'> & { companyId?: string })[]
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
      type: listData.type,
      company_id: listData.companyId
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
        updated_at: now,
        company_id: listData.companyId
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
  companyId: string,
  itemsData?: (Omit<ProductionListItem, 'id' | 'list_id' | 'created_at' | 'updated_at'> & { companyId?: string })[]
): Promise<{ success: boolean, error?: any }> {
  try {
    const now = new Date().toISOString();
    
    // Verificar se a lista existe
    const { data: existingList } = await supabase
      .from("production_lists")
      .select("*")
      .eq("id", listId)
      .eq("company_id", companyId)
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
      .eq("id", listId)
      .eq("company_id", companyId);
    
    if (listError) throw listError;
    
    // Se fornecidos novos itens, atualizar
    if (itemsData) {
      // Remover itens existentes usando a função auxiliar
      await deletarItensLista(listId, companyId);
      
      // Inserir novos itens
      if (itemsData.length > 0) {
        const formattedItems = itemsData.map(item => ({
          id: uuidv4(),
          list_id: listId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit: item.unit,
          created_at: now,
          updated_at: now,
          company_id: companyId
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
export async function deleteProductionList(listId: string, companyId: string): Promise<{ success: boolean, error?: any }> {
  try {
    // Verificar se a lista existe
    const { data } = await supabase
      .from("production_lists")
      .select("*")
      .eq("id", listId)
      .eq("company_id", companyId)
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
    await deletarItensLista(listId, companyId);
    
    // Em seguida, excluir a própria lista
    const { error } = await supabase
      .from("production_lists")
      .delete()
      .eq("id", listId)
      .eq("company_id", companyId);
    
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
export async function calculateProductQuantity(productId: string, companyId: string): Promise<{quantity: number, unit: string}> {
  if (!companyId) throw new Error('[calculateProductQuantity] companyId é obrigatório');
  try {
    // Buscar o produto com detalhes
    const product = await getProduct(productId, companyId);
    if (!product) throw new Error(`Produto não encontrado: ${productId}`);
    
    // Definir a unidade baseada no produto
    const unit = product.unit || 'KG';
    
    // Se for receita ou subreceita, buscar os dados da receita para obter rendimento
    if ((product.product_type === 'receita' || product.product_type === 'subreceita') && product.recipe_id) {
      const recipe = await getRecipe(product.recipe_id, companyId);
      if (recipe) {
        if (unit === 'KG' && recipe.yield_kg) return { quantity: recipe.yield_kg, unit };
        else if (unit === 'UN' && recipe.yield_units) return { quantity: recipe.yield_units, unit };
      }
    }
    // Fallback
    return { quantity: 1, unit };
  } catch (error) {
    console.error(`Erro ao calcular quantidade para produto ${productId}:`, error);
    throw error;
  }
}

// Buscar a última data de atualização das listas diárias
export async function getLastUpdateDate(companyId: string): Promise<Date | null> {
  if (!companyId) return null;
  
  try {
    // Buscar a lista diária mais recente
    const { data, error } = await supabase
      .from("production_lists")
      .select("updated_at")
      .eq("company_id", companyId)
      .eq("type", "daily")
      .order("updated_at", { ascending: false })
      .limit(1);
    
    if (error) throw error;
    if (!data || data.length === 0) return null;
    
    // Retornar a data de atualização mais recente
    return new Date(data[0].updated_at);
  } catch (error) {
    console.error("Erro ao buscar data da última atualização:", error);
    return null;
  }
}

// Gerar/atualizar as 7 listas diárias
export async function generateDailyLists(companyId: string, userId?: string): Promise<{ success: boolean, lists?: string[], error?: any }> {
  if (!companyId) throw new Error('[generateDailyLists] companyId é obrigatório');
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
        const { quantity, unit } = await calculateProductQuantity(product.id, companyId);
        
        items.push({
          product_id: product.id,
          quantity,
          unit
        });
      }
      
      // Criar nome para a lista diária
      const nomeLista = `Produção de ${day.name}`;
      
      // Salvar/atualizar a lista no banco de dados com tipo 'daily' (upsert)
      const result = await upsertDailyProductionList(items, nomeLista, companyId);
      
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
