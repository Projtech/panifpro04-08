
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProductInventory } from "./inventoryTypes";

export async function getProductInventory(companyId: string): Promise<ProductInventory[]> {
  if (!companyId) throw new Error('[getProductInventory] companyId é obrigatório');
  console.log("[INVENTORY] Fetching product inventory...");
  try {
    // This gets products with their current_stock values and recipe information
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        recipe:recipes(name, code, yield_kg, yield_units, cost_per_kg, cost_per_unit)
      `)
      .eq('company_id', companyId)
      .order('name');
    
    if (error) throw error;
    
    console.log(`[INVENTORY] Successfully fetched inventory for ${products?.length || 0} products`);
    
    // Transform to ProductInventory interface
    const inventory = (products || []).map(product => ({
      product_id: product.id,
      product_name: product.name,
      unit: product.unit,
      current_stock: product.current_stock || 0,
      min_stock: product.min_stock,
      last_cost: product.cost,
      unit_price: product.unit_price,
      is_from_recipe: !!product.recipe_id,
      recipe_info: product.recipe
    }));
    
    // Log some statistics about the inventory
    const belowMinStock = inventory.filter(item => item.current_stock < item.min_stock);
    console.log(`[INVENTORY] ${belowMinStock.length} products are below minimum stock level`);
    
    const productsFromRecipes = inventory.filter(item => item.is_from_recipe);
    console.log(`[INVENTORY] ${productsFromRecipes.length} products are linked to recipes`);
    
    return inventory;
  } catch (error) {
    console.error("[INVENTORY] Error fetching product inventory:", error);
    toast.error("Erro ao carregar estoque de produtos");
    return [];
  }
}
