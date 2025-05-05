import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addInventoryTransaction } from "./transactionService";
import { RecipeProductionItem, TransactionType } from "./inventoryTypes";

// Calcula recursivamente a lista achatada de matérias-primas base necessárias para produzir uma quantidade de uma receita (incluindo sub-receitas)
export async function getFlatIngredientRequirements(
  recipeId: string,
  requiredQuantityKg: number,
  companyId: string
): Promise<Array<{ productId: string; quantity: number; unit: string }>> {
  try {
    console.log(`[getFlatIngredientRequirements] Calculando ingredientes para recipeId: ${recipeId}, quantidade: ${requiredQuantityKg}kg`);

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
      .eq('company_id', companyId)
      .maybeSingle();

    // 2. Verificar se a receita foi encontrada e tem ingredientes
    if (!recipeData) {
      console.warn(`[getFlatIngredientRequirements] Receita não encontrada: ${recipeId}`);
      return [];
    }

    if (!recipeData.recipe_ingredients) {
      console.warn(`[getFlatIngredientRequirements] Receita ${recipeId} não tem ingredientes`);
      return [];
    }

    // 3. Verificar e calcular proporção
    const yieldKg = recipeData.yield_kg;
    if (!yieldKg || yieldKg <= 0) {
      console.error(`[getFlatIngredientRequirements] Rendimento inválido (${yieldKg}) para receita ${recipeId}`);
      return [];
    }

    const proportion = requiredQuantityKg / yieldKg;
    console.log(`[getFlatIngredientRequirements] Proporção calculada: ${proportion.toFixed(4)} (${requiredQuantityKg}kg / ${yieldKg}kg)`);

    // 4. Inicializar array de resultados
    const flatRequirements: Array<{ productId: string; quantity: number; unit: string }> = [];

    // 5. Processar ingredientes
    for (const ingredient of recipeData.recipe_ingredients) {
      console.log(`[getFlatIngredientRequirements] Processando ingrediente: ${ingredient.product_id || ingredient.sub_recipe_id}`);

      if (!ingredient.is_sub_recipe && ingredient.product_id) {
        // Caso base: matéria-prima
        const requiredIngredientQuantity = ingredient.quantity * proportion;
        console.log(`[getFlatIngredientRequirements] Adicionando matéria-prima: ${ingredient.product_id}, quantidade: ${requiredIngredientQuantity.toFixed(3)} ${ingredient.unit}`);
        flatRequirements.push({
          productId: ingredient.product_id,
          quantity: requiredIngredientQuantity,
          unit: ingredient.unit
        });
      } else if (ingredient.is_sub_recipe && ingredient.sub_recipe_id) {
        // Caso recursivo: sub-receita
        const requiredSubRecipeKg = ingredient.quantity * proportion;
        console.log(`[getFlatIngredientRequirements] Processando sub-receita: ${ingredient.sub_recipe_id}, quantidade: ${requiredSubRecipeKg.toFixed(3)}kg`);
        
        const subIngredients = await getFlatIngredientRequirements(
          ingredient.sub_recipe_id,
          requiredSubRecipeKg,
          companyId
        );
        flatRequirements.push(...subIngredients);
      }
    }

    // 6. Agregar resultados por productId
    const aggregatedRequirements = new Map<string, { quantity: number; unit: string }>();
    
    for (const requirement of flatRequirements) {
      if (aggregatedRequirements.has(requirement.productId)) {
        const existing = aggregatedRequirements.get(requirement.productId)!;
        aggregatedRequirements.set(requirement.productId, {
          quantity: existing.quantity + requirement.quantity,
          unit: requirement.unit // Assumindo unidades consistentes
        });
      } else {
        aggregatedRequirements.set(requirement.productId, {
          quantity: requirement.quantity,
          unit: requirement.unit
        });
      }
    }

    // 7. Converter Map para array final
    const result = Array.from(aggregatedRequirements.entries()).map(([productId, { quantity, unit }]) => ({
      productId,
      quantity,
      unit
    }));

    console.log(`[getFlatIngredientRequirements] Resultado final para receita ${recipeId}:`, result);
    return result;
  } catch (error) {
    console.error('[getFlatIngredientRequirements] Erro ao calcular ingredientes achatados:', error);
    return [];
  }
}
