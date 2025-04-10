
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addInventoryTransaction } from "./transactionService";
import { RecipeProductionItem, TransactionType } from "./inventoryTypes";

export async function processProductionOrderInventoryTransactions(
  productionOrderId: string,
  items: RecipeProductionItem[],
  adjustMaterials: boolean
): Promise<boolean> {
  try {
    console.log("[PRODUCTION INVENTORY] Processing production inventory for order:", productionOrderId);
    console.log("[PRODUCTION INVENTORY] Items to process:", JSON.stringify(items, null, 2));
    console.log("[PRODUCTION INVENTORY] Adjust materials flag:", adjustMaterials);
    
    // Process each recipe production item
    for (const item of items) {
      if (item.actualQuantityKg <= 0 && item.actualQuantityUnits <= 0) {
        console.log(`[PRODUCTION INVENTORY] Skipping item with no quantity: ${item.recipeName}`);
        continue;
      }
      
      console.log(`[PRODUCTION INVENTORY] Processing item: ${item.recipeName} (ID: ${item.recipeId})`);
      
      // Buscar produto vinculado à receita
      const { data: linkedProduct, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('recipe_id', item.recipeId)
        .maybeSingle();
      
      if (productError) {
        console.error(`[PRODUCTION INVENTORY] Error fetching linked product for recipe ${item.recipeId}:`, productError);
        continue;
      }
      
      console.log("[PRODUCTION INVENTORY] Linked product:", linkedProduct ? 
        `${linkedProduct.name} (ID: ${linkedProduct.id})` : "No linked product found");
      
      // Se encontrar um produto vinculado, registre a entrada em estoque
      if (linkedProduct) {
        // Calcular a quantidade produzida em unidades se disponível, senão em kg
        const quantity = item.actualQuantityUnits > 0 ? item.actualQuantityUnits : item.actualQuantityKg;
        
        console.log(`[PRODUCTION INVENTORY] Registering inventory transaction for product ${linkedProduct.name} (ID: ${linkedProduct.id}), quantity: ${quantity} ${linkedProduct.unit}`);
        
        // Registrar a transação de inventário (entrada de produto)
        await addInventoryTransaction({
          product_id: linkedProduct.id,
          quantity: quantity,
          date: new Date().toISOString().split('T')[0],
          cost: null,
          type: 'in' as TransactionType,
          invoice: null,
          notes: `Produção automática de ${item.recipeName}`,
          reason: 'production',
          production_order_id: productionOrderId
        });
        
        console.log(`[PRODUCTION INVENTORY] Inventory transaction registered successfully for product ${linkedProduct.name}`);
      } else {
        console.log(`[PRODUCTION INVENTORY] No linked product found for recipe ${item.recipeName} - skipping stock entry`);
      }
      
      // Se ajuste de materiais não for necessário, pule o resto do processamento
      if (!adjustMaterials) {
        console.log("[PRODUCTION INVENTORY] Skipping material adjustments as requested");
        continue;
      }

      // Processamento com consumo de matéria-prima
      // Get recipe with ingredients
      const { data: recipeWithIngredientsData, error: recipeError } = await supabase
        .from('recipes')
        .select(`
          id, name, yield_kg,
          recipe_ingredients:recipe_ingredients (
            id, product_id, sub_recipe_id, is_sub_recipe, quantity, unit, cost
          )
        `)
        .eq('id', item.recipeId)
        .single();
      
      if (recipeError) {
        console.error(`[PRODUCTION INVENTORY] Error fetching recipe ${item.recipeId}:`, recipeError);
        continue;
      }

      // Skip if no recipe or no ingredients
      if (!recipeWithIngredientsData || !recipeWithIngredientsData.recipe_ingredients) {
        console.log("[PRODUCTION INVENTORY] No recipe or ingredients found, continuing to next item");
        continue;
      }

      const recipe = recipeWithIngredientsData;
      const ingredients = recipe.recipe_ingredients;
      
      console.log(`[PRODUCTION INVENTORY] Processing ${ingredients.length} ingredients for recipe ${recipe.name}`);
      
      // Calculate proportion based on planned vs actual
      const proportion = item.actualQuantityKg / recipe.yield_kg;
      
      console.log(`[PRODUCTION INVENTORY] Production proportion: ${proportion.toFixed(4)} (${item.actualQuantityKg}kg actual / ${recipe.yield_kg}kg recipe yield)`);
      
      // Process each ingredient
      for (const ingredient of ingredients) {
        // Skip sub-recipes for now (would need recursive processing)
        if (ingredient.is_sub_recipe) {
          console.log(`[PRODUCTION INVENTORY] Skipping sub-recipe ingredient ${ingredient.id}`);
          continue;
        }
        
        // Skip if no product ID
        if (!ingredient.product_id) {
          console.log(`[PRODUCTION INVENTORY] Skipping ingredient without product_id: ${ingredient.id}`);
          continue;
        }
        
        // Calculate adjusted quantity
        const adjustedQuantity = ingredient.quantity * proportion;
        
        console.log(`[PRODUCTION INVENTORY] Consuming ingredient product_id ${ingredient.product_id}, quantity: ${adjustedQuantity.toFixed(3)} ${ingredient.unit}`);
        
        // Get product info for better logging
        const { data: productInfo } = await supabase
          .from('products')
          .select('name, current_stock')
          .eq('id', ingredient.product_id)
          .maybeSingle();
          
        if (productInfo) {
          console.log(`[PRODUCTION INVENTORY] Product info: ${productInfo.name}, current stock: ${productInfo.current_stock}`);
        }
        
        // Register inventory transaction (material consumption)
        await addInventoryTransaction({
          product_id: ingredient.product_id,
          quantity: adjustedQuantity,
          date: new Date().toISOString().split('T')[0],
          cost: null,
          type: 'out' as TransactionType,
          invoice: null,
          notes: `Consumo automático para produção de ${item.recipeName}`,
          reason: 'production',
          production_order_id: productionOrderId
        });
        
        console.log(`[PRODUCTION INVENTORY] Material consumption registered for product ${ingredient.product_id}`);
      }
    }
    
    console.log("[PRODUCTION INVENTORY] All production inventory transactions processed successfully");
    return true;
  } catch (error) {
    console.error("[PRODUCTION INVENTORY] Error processing production order inventory transactions:", error);
    toast.error("Erro ao processar ajustes de estoque");
    return false;
  }
}
