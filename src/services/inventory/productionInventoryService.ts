// src/services/inventory/productionInventoryService.ts
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addInventoryTransaction } from "./transactionService"; // Assumindo que está no mesmo nível ou exportado corretamente
import { RecipeProductionItem, TransactionType } from "./inventoryTypes"; // Assumindo tipos definidos aqui ou exportados

// Interface auxiliar para o resultado agregado
interface FlatRequirement {
  productId: string;
  quantity: number;
  unit: string;
}

/**
 * Calcula recursivamente a lista achatada e agregada de matérias-primas base
 * necessárias para produzir uma quantidade específica de uma receita (incluindo sub-receitas).
 */
export async function getFlatIngredientRequirements(
  recipeId: string,
  requiredQuantityKg: number, // Quantidade necessária da receita/sub-receita PAI em KG
  companyId: string
): Promise<FlatRequirement[]> {
  console.log(`[getFlatIngredientRequirements] Calculando para Recipe ID: ${recipeId}, Qtd: ${requiredQuantityKg}kg, Empresa: ${companyId}`);
  const flatRequirementsMap = new Map<string, FlatRequirement>(); // Usar Map para agregação fácil

  try {
    // 1. Buscar a receita e seus ingredientes
    const { data: recipeData, error: recipeError } = await supabase
      .from('recipes')
      .select(`
        id, name, yield_kg,
        recipe_ingredients!recipe_id (
          product_id, sub_recipe_id, is_sub_recipe, quantity, unit
        )
      `)
      .eq('id', recipeId)
      .eq('company_id', companyId) // <-- FILTRO COMPANY_ID ADICIONADO
      .maybeSingle();

    // 2. Verificar se a receita foi encontrada e tem ingredientes
    if (recipeError) {
      console.error(`[getFlatIngredientRequirements] Erro ao buscar receita ${recipeId}:`, recipeError);
      throw recipeError; // Lança o erro para ser pego pelo catch externo
    }
    if (!recipeData) {
      console.warn(`[getFlatIngredientRequirements] Receita não encontrada ou sem acesso: ${recipeId} para empresa ${companyId}`);
      return []; // Retorna vazio se a receita não existe
    }
    // Verifica se recipe_ingredients existe e é um array
    if (!recipeData.recipe_ingredients || !Array.isArray(recipeData.recipe_ingredients)) {
        console.warn(`[getFlatIngredientRequirements] Receita ${recipeId} não possui ingredientes definidos.`);
        return [];
    }

    const recipe = recipeData;
    const ingredients = recipe.recipe_ingredients;

    // 3. Calcular a proporção
    if (!recipe.yield_kg || recipe.yield_kg <= 0) {
      console.error(`[getFlatIngredientRequirements] Rendimento (yield_kg) inválido ou zero para receita ${recipeId}: ${recipe.yield_kg}`);
      toast.error(`Rendimento inválido para a receita ${recipe.name}. Não é possível calcular ingredientes.`);
      return []; // Retorna vazio se o rendimento for inválido
    }
    const proportion = requiredQuantityKg / recipe.yield_kg;
    console.log(`[getFlatIngredientRequirements] Receita: ${recipe.name}, Proporção: ${proportion.toFixed(4)} (Req: ${requiredQuantityKg}kg / Yield: ${recipe.yield_kg}kg)`);

    // 4. Iterar sobre os ingredientes
    for (const ingredient of ingredients) {
      // 5a. Caso Base (Matéria-Prima)
      if (!ingredient.is_sub_recipe && ingredient.product_id) {
        const requiredIngredientQuantity = ingredient.quantity * proportion;
        const productId = ingredient.product_id;
        const unit = ingredient.unit || 'un'; // Garante uma unidade padrão

        console.log(`[getFlatIngredientRequirements] Matéria Prima: ${productId}, Qtd Calc: ${requiredIngredientQuantity.toFixed(3)} ${unit}`);

        // Agrega no Map
        const existing = flatRequirementsMap.get(productId);
        if (existing) {
          // TODO: Adicionar conversão de unidade se necessário antes de somar
          if (existing.unit !== unit) {
             console.warn(`[getFlatIngredientRequirements] Unidades diferentes para ${productId}: ${existing.unit} e ${unit}. Somando diretamente.`);
          }
          existing.quantity += requiredIngredientQuantity;
        } else {
          flatRequirementsMap.set(productId, { productId, quantity: requiredIngredientQuantity, unit });
        }
      }
      // 5b. Caso Recursivo (Sub-Receita)
      else if (ingredient.is_sub_recipe && ingredient.sub_recipe_id) {
        // Calcula a quantidade necessária desta sub-receita em KG
        // ** Suposição: ingredient.quantity para sub-receita está em KG **
        //    Se não estiver, uma conversão baseada na unidade do ingrediente seria necessária aqui.
        const requiredSubRecipeKg = ingredient.quantity * proportion;
        console.log(`[getFlatIngredientRequirements] Sub-receita encontrada: ${ingredient.sub_recipe_id}, Qtd Req: ${requiredSubRecipeKg.toFixed(3)}kg. Chamando recursivamente...`);

        const subIngredients = await getFlatIngredientRequirements(
          ingredient.sub_recipe_id,
          requiredSubRecipeKg,
          companyId
        );

        // Agrega os resultados da sub-receita no Map principal
        for (const subIng of subIngredients) {
           const existing = flatRequirementsMap.get(subIng.productId);
           if (existing) {
             if (existing.unit !== subIng.unit) {
                console.warn(`[getFlatIngredientRequirements] Unidades diferentes para ${subIng.productId} (sub): ${existing.unit} e ${subIng.unit}. Somando diretamente.`);
             }
             existing.quantity += subIng.quantity;
           } else {
             flatRequirementsMap.set(subIng.productId, { ...subIng });
           }
        }
      } else {
         console.warn(`[getFlatIngredientRequirements] Ingrediente inválido ou sem ID de produto/sub-receita:`, ingredient);
      }
    }

    // 6. Retornar o array agregado a partir do Map
    const finalRequirements = Array.from(flatRequirementsMap.values());
    console.log(`[getFlatIngredientRequirements] Requisitos finais agregados para ${recipeId}:`, finalRequirements);
    return finalRequirements;

  } catch (error) {
    console.error(`[getFlatIngredientRequirements] Erro ao calcular ingredientes achatados para ${recipeId}:`, error);
    // Não mostrar toast aqui para não poluir em caso de falha em sub-receita profunda
    return []; // Retorna vazio em caso de erro
  }
}


/**
 * Processa as transações de inventário (entrada de produto acabado e saída de matérias-primas)
 * para um pedido de produção confirmado, lidando com sub-receitas.
 */
export async function processProductionOrderInventoryTransactions(
  productionOrderId: string,
  items: RecipeProductionItem[], // Itens produzidos no pedido
  adjustMaterials: boolean,    // Flag indicando se deve deduzir materiais
  companyId: string           // ID da empresa ativa OBRIGATÓRIO
): Promise<boolean> {
  // Validação inicial do companyId
  if (!companyId) {
    console.error("[PRODUCTION INVENTORY] companyId é obrigatório para processar transações.");
    toast.error("Erro interno: ID da empresa não fornecido para ajuste de estoque.");
    return false;
  }

  console.log("[PRODUCTION INVENTORY] Iniciando processamento de inventário para pedido:", productionOrderId, `Empresa: ${companyId}`);
  console.log("[PRODUCTION INVENTORY] Itens a processar:", JSON.stringify(items, null, 2));
  console.log("[PRODUCTION INVENTORY] Ajustar materiais:", adjustMaterials);

  try {
    // Processa cada item (receita) produzido no pedido
    for (const item of items) {
      // Pula itens sem quantidade produzida
      if (item.actualQuantityKg <= 0 && item.actualQuantityUnits <= 0) {
        console.log(`[PRODUCTION INVENTORY] Pulando item sem quantidade produzida: ${item.recipeName}`);
        continue;
      }

      console.log(`[PRODUCTION INVENTORY] Processando item produzido: ${item.recipeName} (Receita ID: ${item.recipeId})`);

      // --- 1. Entrada do Produto Acabado ---
      try {
        const { data: linkedProduct, error: productError } = await supabase
          .from('products')
          .select('id, name, unit') // Busca ID, nome e unidade do produto acabado
          .eq('recipe_id', item.recipeId) // Encontra produto vinculado à receita
          .eq('company_id', companyId)    // Garante que é da empresa correta
          .maybeSingle();

        if (productError) {
          throw new Error(`Erro ao buscar produto vinculado para receita ${item.recipeId}: ${productError.message}`);
        }

        if (linkedProduct) {
          // Determina a quantidade e unidade corretas para a entrada
          const quantityIn = item.actualQuantityUnits > 0 ? item.actualQuantityUnits : item.actualQuantityKg;
          const unitIn = item.actualQuantityUnits > 0 ? 'un' : 'kg'; // Assume unidade baseada na quantidade > 0

          if (quantityIn > 0) {
              console.log(`[PRODUCTION INVENTORY] Registrando ENTRADA para ${linkedProduct.name} (ID: ${linkedProduct.id}), Qtd: ${quantityIn} ${unitIn}`);
              await addInventoryTransaction({
                companyId: companyId,
                product_id: linkedProduct.id,
                quantity: quantityIn,
                date: new Date().toISOString().split('T')[0],
                cost: null, // Custo pode ser calculado posteriormente se necessário
                type: 'in',
                invoice: null,
                notes: `Produção automática de ${item.recipeName} (Pedido: ${productionOrderId})`,
                reason: 'production',
                production_order_id: productionOrderId
              });
              console.log(`[PRODUCTION INVENTORY] Entrada registrada para ${linkedProduct.name}`);
          } else {
              console.log(`[PRODUCTION INVENTORY] Quantidade de entrada zerada para ${linkedProduct.name}, pulando registro.`);
          }

        } else {
          console.log(`[PRODUCTION INVENTORY] Nenhum produto vinculado encontrado para receita ${item.recipeName}, pulando entrada em estoque.`);
        }
      } catch (entryError) {
         console.error(`[PRODUCTION INVENTORY] Falha ao registrar entrada para ${item.recipeName}:`, entryError);
         toast.error(`Erro ao registrar entrada em estoque para ${item.recipeName}.`);
         // Decide se continua processando outros itens ou retorna false
         // Por segurança, vamos continuar para tentar deduzir materiais se aplicável
      }

      // --- 2. Saída das Matérias-Primas (se adjustMaterials for true) ---
      if (adjustMaterials) {
        console.log(`[PRODUCTION INVENTORY] Iniciando cálculo de consumo de materiais para ${item.recipeName}...`);

        // Determina a quantidade produzida em KG para cálculo dos ingredientes
        let producedKg = item.actualQuantityKg;
        if (item.actualQuantityUnits > 0 && item.actualQuantityKg <= 0) {
            // Se só temos unidades, precisamos buscar o yield da receita para converter
            // Isso adiciona uma chamada extra, mas é necessário para precisão
            const { data: recipeYieldData, error: yieldError } = await supabase
                .from('recipes')
                .select('yield_kg, yield_units')
                .eq('id', item.recipeId)
                .eq('company_id', companyId)
                .single();

            if (yieldError || !recipeYieldData || !recipeYieldData.yield_units || recipeYieldData.yield_units <= 0) {
                console.error(`[PRODUCTION INVENTORY] Falha ao obter rendimento para converter unidades em KG para receita ${item.recipeId}. Pulando dedução de materiais.`, yieldError);
                toast.error(`Falha ao obter rendimento para ${item.recipeName}. Dedução de materiais não realizada.`);
                continue; // Pula para o próximo item do pedido
            }
            producedKg = item.actualQuantityUnits * (recipeYieldData.yield_kg / recipeYieldData.yield_units);
            console.log(`[PRODUCTION INVENTORY] Quantidade convertida para cálculo: ${producedKg.toFixed(3)}kg (Baseado em ${item.actualQuantityUnits}un)`);
        }

        if (producedKg <= 0) {
            console.log(`[PRODUCTION INVENTORY] Quantidade produzida em KG é zero ou inválida para ${item.recipeName}. Pulando dedução de materiais.`);
            continue;
        }

        // Chama a função recursiva para obter a lista achatada de matérias-primas
        const requiredMaterials = await getFlatIngredientRequirements(
          item.recipeId,
          producedKg, // Usa a quantidade produzida em KG
          companyId
        );

        if (requiredMaterials.length === 0) {
          console.log(`[PRODUCTION INVENTORY] Nenhum material base calculado para ${item.recipeName}.`);
          // Não necessariamente um erro, pode ser uma receita sem ingredientes base
        }

        console.log(`[PRODUCTION INVENTORY] Materiais base calculados para ${item.recipeName}:`, requiredMaterials);

        // Itera sobre a lista achatada e registra a saída de cada matéria-prima
        for (const material of requiredMaterials) {
          if (material.quantity > 0) {
            try {
              console.log(`[PRODUCTION INVENTORY] Registrando SAÍDA para ${material.productId}, Qtd: ${material.quantity.toFixed(3)} ${material.unit}`);
              await addInventoryTransaction({
                companyId: companyId,
                product_id: material.productId,
                quantity: material.quantity, // Quantidade já calculada pela função recursiva
                date: new Date().toISOString().split('T')[0],
                cost: null, // Custo da saída geralmente não é relevante aqui
                type: 'out',
                invoice: null,
                notes: `Consumo automático para produção de ${item.recipeName} (Pedido: ${productionOrderId})`,
                reason: 'production_consumption', // Razão mais específica
                production_order_id: productionOrderId
              });
               console.log(`[PRODUCTION INVENTORY] Saída registrada para ${material.productId}`);
            } catch (consumptionError) {
              console.error(`[PRODUCTION INVENTORY] Falha ao registrar consumo para ${material.productId}:`, consumptionError);
              toast.error(`Erro ao registrar consumo de material (${material.productId}).`);
              // Decide se continua com outros materiais ou falha tudo?
              // Vamos continuar para tentar registrar o máximo possível.
            }
          } else {
            console.log(`[PRODUCTION INVENTORY] Quantidade calculada zerada para ${material.productId}, pulando registro de saída.`);
          }
        }
      } else {
        console.log("[PRODUCTION INVENTORY] Ajuste de materiais desabilitado para este pedido.");
      }
    } // Fim do loop for (const item of items)

    console.log("[PRODUCTION INVENTORY] Processamento de inventário concluído com sucesso para pedido:", productionOrderId);
    return true; // Retorna true se chegou ao fim (mesmo que alguns registros individuais tenham falhado)

  } catch (error) {
    // Erro geral no processamento
    console.error("[PRODUCTION INVENTORY] Erro GERAL ao processar ajustes de estoque:", error);
    toast.error("Erro geral ao processar ajustes de estoque.");
    return false; // Retorna false indicando falha geral
  }
}
