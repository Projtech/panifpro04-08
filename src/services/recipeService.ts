
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Product, createProduct, getProduct, updateProduct } from "./productService";

export interface Recipe {
  id: string;
  name: string;
  code: string | null;
  yield_kg: number;
  yield_units: number | null;
  instructions: string | null;
  photo_url: string | null;
  gif_url: string | null;
  cost_per_kg: number | null;
  cost_per_unit: number | null;
  group_id: string | null;
  subgroup_id: string | null;
  all_days: boolean | null;
  monday: boolean | null;
  tuesday: boolean | null;
  wednesday: boolean | null;
  thursday: boolean | null;
  friday: boolean | null;
  saturday: boolean | null;
  sunday: boolean | null;
}

// Interface para os dados brutos retornados pelo Supabase
interface SupabaseRecipeData {
  id: string;
  name: string;
  code: string | null;
  yield_kg: number;
  yield_units: number | null;
  instructions: string | null;
  photo_url: string | null;
  gif_url: string | null;
  cost_per_kg: number | null;
  cost_per_unit: number | null;
  group_id?: string | null;
  subgroup_id?: string | null;
  all_days?: boolean | null;
  monday?: boolean | null;
  tuesday?: boolean | null;
  wednesday?: boolean | null;
  thursday?: boolean | null;
  friday?: boolean | null;
  saturday?: boolean | null;
  sunday?: boolean | null;
  [key: string]: any; // Para permitir acesso a propriedades dinâmicas
}

export interface RecipeIngredient {
  id?: string;
  recipe_id?: string;
  product_id: string | null;
  sub_recipe_id: string | null;
  is_sub_recipe: boolean;
  quantity: number;
  unit: string;
  cost: number;
  total_cost: number;
}

export interface RecipeIngredientWithDetails extends RecipeIngredient {
  product?: Product;
  sub_recipe?: Recipe | null;
}

export async function getRecipes(): Promise<Recipe[]> {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('name');
    
    if (error) throw error;
    // Garantir que todos os campos opcionais estejam definidos mesmo que sejam nulos
    const recipes = (data || []).map(recipe => {
      // Usando a interface SupabaseRecipeData para tipagem correta
      const typedRecipe = recipe as SupabaseRecipeData;
      return {
        ...typedRecipe,
        group_id: typedRecipe.group_id || null,
        subgroup_id: typedRecipe.subgroup_id || null,
        all_days: typedRecipe.all_days || null,
        monday: typedRecipe.monday || null,
        tuesday: typedRecipe.tuesday || null,
        wednesday: typedRecipe.wednesday || null,
        thursday: typedRecipe.thursday || null,
        friday: typedRecipe.friday || null,
        saturday: typedRecipe.saturday || null,
        sunday: typedRecipe.sunday || null
      } as Recipe;
    });
    return recipes;
  } catch (error) {
    console.error("Error fetching recipes:", error);
    toast.error("Erro ao carregar receitas");
    return [];
  }
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) return null;
    
    // Garantir que todos os campos opcionais estejam definidos mesmo que sejam nulos
    const supabaseData = data as SupabaseRecipeData;
    const recipe: Recipe = {
      ...supabaseData,
      group_id: supabaseData.group_id || null,
      subgroup_id: supabaseData.subgroup_id || null,
      all_days: supabaseData.all_days || null,
      monday: supabaseData.monday || null,
      tuesday: supabaseData.tuesday || null,
      wednesday: supabaseData.wednesday || null,
      thursday: supabaseData.thursday || null,
      friday: supabaseData.friday || null,
      saturday: supabaseData.saturday || null,
      sunday: supabaseData.sunday || null
    };
    
    return recipe;
  } catch (error) {
    console.error("Error fetching recipe:", error);
    toast.error("Erro ao carregar receita");
    return null;
  }
}

export async function getRecipeWithIngredients(id: string): Promise<{recipe: Recipe | null, ingredients: RecipeIngredientWithDetails[]}> {
  try {
    const { data: recipeData, error: recipeError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (recipeError) throw recipeError;
    
    // Processar a receita para garantir todos os campos
    const recipe = recipeData ? {
      ...(recipeData as SupabaseRecipeData),
      group_id: (recipeData as SupabaseRecipeData).group_id || null,
      subgroup_id: (recipeData as SupabaseRecipeData).subgroup_id || null,
      all_days: (recipeData as SupabaseRecipeData).all_days || null,
      monday: (recipeData as SupabaseRecipeData).monday || null,
      tuesday: (recipeData as SupabaseRecipeData).tuesday || null,
      wednesday: (recipeData as SupabaseRecipeData).wednesday || null,
      thursday: (recipeData as SupabaseRecipeData).thursday || null,
      friday: (recipeData as SupabaseRecipeData).friday || null,
      saturday: (recipeData as SupabaseRecipeData).saturday || null,
      sunday: (recipeData as SupabaseRecipeData).sunday || null
    } as Recipe : null;
    
    const { data: ingredientsData, error: ingredientsError } = await supabase
      .from('recipe_ingredients')
      .select(`
        *,
        product:products(*),
        sub_recipe:recipes!recipe_ingredients_sub_recipe_id_fkey(*)
      `) 
      .eq('recipe_id', id);
    
    if (ingredientsError) throw ingredientsError;
    
    const ingredients = (ingredientsData || []).map(ingredient => {
      // Processar sub-receita para garantir todos os campos
      let processedSubRecipe = null;
      if (ingredient.sub_recipe && typeof ingredient.sub_recipe === 'object') {
        const subRecipeData = ingredient.sub_recipe as SupabaseRecipeData;
        processedSubRecipe = {
          ...subRecipeData,
          group_id: subRecipeData.group_id || null,
          subgroup_id: subRecipeData.subgroup_id || null,
          all_days: subRecipeData.all_days || null,
          monday: subRecipeData.monday || null,
          tuesday: subRecipeData.tuesday || null,
          wednesday: subRecipeData.wednesday || null,
          thursday: subRecipeData.thursday || null,
          friday: subRecipeData.friday || null,
          saturday: subRecipeData.saturday || null,
          sunday: subRecipeData.sunday || null
        } as Recipe;
      }
      
      return {
        ...ingredient,
        product: ingredient.product,
        sub_recipe: processedSubRecipe
      } as RecipeIngredientWithDetails;
    });
    
    return { recipe, ingredients };
  } catch (error) {
    console.error("Error fetching recipe with ingredients:", error);
    toast.error("Erro ao carregar receita com ingredientes");
    return { recipe: null, ingredients: [] };
  }
}

// Função para obter todos os ingredientes de uma receita, incluindo os ingredientes das sub-receitas
export async function getAllRecipeIngredients(recipeId: string, quantity: number = 1): Promise<RecipeIngredientWithDetails[]> {
  try {
    console.log(`Buscando ingredientes para a receita ${recipeId} com quantidade ${quantity}`);
    const { recipe, ingredients } = await getRecipeWithIngredients(recipeId);
    
    if (!recipe) {
      console.error(`Receita ${recipeId} não encontrada`);
      return [];
    }
    
    let allIngredients: RecipeIngredientWithDetails[] = [];
    
    // Para cada ingrediente da receita
    for (const ingredient of ingredients) {
      // Se for uma sub-receita, busca recursivamente os ingredientes dela
      if (ingredient.is_sub_recipe && ingredient.sub_recipe_id) {
        console.log(`Processando sub-receita: ${ingredient.sub_recipe?.name || ingredient.sub_recipe_id}`);
        // Calcula a quantidade proporcional para a sub-receita
        const subQuantity = (ingredient.quantity / recipe.yield_kg) * quantity;
        
        // Busca recursivamente os ingredientes da sub-receita
        const subIngredients = await getAllRecipeIngredients(ingredient.sub_recipe_id, subQuantity);
        
        // Adiciona os ingredientes da sub-receita à lista
        allIngredients = [...allIngredients, ...subIngredients];
      } else if (ingredient.product_id && ingredient.product) {
        // Se for um ingrediente normal, adiciona à lista com a quantidade ajustada
        console.log(`Processando ingrediente: ${ingredient.product.name}`);
        const adjustedQuantity = (ingredient.quantity / recipe.yield_kg) * quantity;
        
        allIngredients.push({
          ...ingredient,
          quantity: adjustedQuantity,
          total_cost: ingredient.cost * adjustedQuantity
        });
      }
    }
    
    return allIngredients;
  } catch (error) {
    console.error("Erro ao buscar todos os ingredientes da receita:", error);
    toast.error("Erro ao calcular ingredientes da receita");
    return [];
  }
}

export async function createRecipe(recipe: Omit<Recipe, 'id'>, ingredients: Omit<RecipeIngredient, 'id' | 'recipe_id'>[]): Promise<Recipe | null> {
  try {
    console.log("Criando nova receita:", recipe);
    const { data: recipeData, error: recipeError } = await supabase
      .from('recipes')
      .insert([recipe])
      .select()
      .single();
    
    if (recipeError) {
      console.error("Erro ao criar receita no Supabase:", recipeError);
      throw recipeError;
    }
    
    // Garantir que todos os campos opcionais estejam definidos mesmo que sejam nulos
    const processedRecipe = recipeData ? {
      ...(recipeData as SupabaseRecipeData),
      group_id: (recipeData as SupabaseRecipeData).group_id || null,
      subgroup_id: (recipeData as SupabaseRecipeData).subgroup_id || null,
      all_days: (recipeData as SupabaseRecipeData).all_days || null,
      monday: (recipeData as SupabaseRecipeData).monday || null,
      tuesday: (recipeData as SupabaseRecipeData).tuesday || null,
      wednesday: (recipeData as SupabaseRecipeData).wednesday || null,
      thursday: (recipeData as SupabaseRecipeData).thursday || null,
      friday: (recipeData as SupabaseRecipeData).friday || null,
      saturday: (recipeData as SupabaseRecipeData).saturday || null,
      sunday: (recipeData as SupabaseRecipeData).sunday || null
    } as Recipe : null;
    
    console.log("Receita criada com sucesso:", processedRecipe);
    
    if (recipeData) {
      // Check for existing product with the same name
      console.log("Verificando se já existe um produto com o mesmo nome:", processedRecipe.name);
      const { data: existingProduct, error: productQueryError } = await supabase
        .from('products')
        .select('*')
        .eq('name', processedRecipe.name)
        .maybeSingle();
      
      if (productQueryError) {
        console.error("Erro ao verificar produto existente:", productQueryError);
      }
      
      console.log("Produto existente:", existingProduct);
      
      // Create or update linked product
      if (!existingProduct) {
        // Create new product linked to recipe
        const newProduct: Omit<Product, 'id'> = {
          name: processedRecipe.name,
          unit: processedRecipe.yield_units && processedRecipe.yield_units > 0 ? 'Un' : 'Kg',
          sku: processedRecipe.code || 'R-' + processedRecipe.id.substring(0, 8), // Garantir que sempre tenha um SKU
          supplier: 'Produção Interna',
          cost: processedRecipe.cost_per_kg || 0,
          unit_price: processedRecipe.cost_per_unit || 0,
          min_stock: 0,
          current_stock: 0,
          recipe_id: processedRecipe.id, // Link to the recipe
          unit_weight: 0,
          kg_weight: 0
        };
        
        console.log("Criando produto a partir da receita:", newProduct);
        try {
          const createdProduct = await createProduct(newProduct);
          console.log("Produto criado com sucesso:", createdProduct);
        } catch (productError) {
          console.error("Erro ao criar produto a partir da receita:", productError);
        }
      } else {
        // Update existing product with recipe link and updated costs
        await updateProduct(existingProduct.id, {
          cost: processedRecipe.cost_per_kg || 0,
          unit_price: processedRecipe.cost_per_unit || 0,
          recipe_id: processedRecipe.id,
          supplier: 'Produção Interna'
        });
      }
      
      if (ingredients.length > 0) {
        const ingredientsWithRecipeId = ingredients.map(ingredient => ({
          ...ingredient,
          recipe_id: processedRecipe.id
        }));
        
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientsWithRecipeId);
        
        if (ingredientsError) throw ingredientsError;
      }
      
      toast.success("Receita criada com sucesso");
      return processedRecipe;
    }
    
    return null;
  } catch (error) {
    console.error("Error creating recipe:", error);
    toast.error("Erro ao criar receita");
    return null;
  }
}

export async function updateRecipe(
  id: string, 
  recipe: Partial<Recipe>, 
  ingredientsToAdd: Omit<RecipeIngredient, 'id' | 'recipe_id'>[],
  ingredientsToUpdate: RecipeIngredient[],
  ingredientsToDelete: string[]
): Promise<Recipe | null> {
  try {
    const { data: recipeDataRaw, error: recipeError } = await supabase
      .from('recipes')
      .update(recipe)
      .eq('id', id)
      .select()
      .single();
    
    if (recipeError) throw recipeError;
    
    // Garantir que todos os campos opcionais estejam definidos mesmo que sejam nulos
    const recipeData = recipeDataRaw ? {
      ...(recipeDataRaw as SupabaseRecipeData),
      group_id: (recipeDataRaw as SupabaseRecipeData).group_id || null,
      subgroup_id: (recipeDataRaw as SupabaseRecipeData).subgroup_id || null,
      all_days: (recipeDataRaw as SupabaseRecipeData).all_days || null,
      monday: (recipeDataRaw as SupabaseRecipeData).monday || null,
      tuesday: (recipeDataRaw as SupabaseRecipeData).tuesday || null,
      wednesday: (recipeDataRaw as SupabaseRecipeData).wednesday || null,
      thursday: (recipeDataRaw as SupabaseRecipeData).thursday || null,
      friday: (recipeDataRaw as SupabaseRecipeData).friday || null,
      saturday: (recipeDataRaw as SupabaseRecipeData).saturday || null,
      sunday: (recipeDataRaw as SupabaseRecipeData).sunday || null
    } as Recipe : null;
    
    // Find and update the linked product
    if (recipeData) {
      console.log("Buscando produto vinculado à receita:", id);
      const { data: linkedProduct, error: productQueryError } = await supabase
        .from('products')
        .select('*')
        .eq('recipe_id', id)
        .maybeSingle();
      
      if (productQueryError) {
        console.error("Erro ao buscar produto vinculado:", productQueryError);
      }
      
      console.log("Produto vinculado encontrado:", linkedProduct);
      
      if (linkedProduct) {
        // Update the linked product with recipe data
        console.log("Atualizando produto vinculado:", linkedProduct.id);
        try {
          await updateProduct(linkedProduct.id, {
            name: recipeData.name,
            sku: recipeData.code || linkedProduct.sku || 'R-' + id.substring(0, 8),
            unit: recipeData.yield_units && recipeData.yield_units > 0 ? 'Un' : 'Kg',
            cost: recipeData.cost_per_kg || 0,
            unit_price: recipeData.cost_per_unit || 0,
            supplier: 'Produção Interna'
          });
          console.log("Produto atualizado com sucesso:", linkedProduct.id);
        } catch (updateError) {
          console.error("Erro ao atualizar produto vinculado:", updateError);
        }
      } else {
        // If no linked product exists, create one
        console.log("Nenhum produto vinculado encontrado. Criando novo produto.");
        const newProduct: Omit<Product, 'id'> = {
          name: recipeData.name,
          unit: recipeData.yield_units && recipeData.yield_units > 0 ? 'Un' : 'Kg',
          sku: recipeData.code || 'R-' + id.substring(0, 8), // Garantir que sempre tenha um SKU
          supplier: 'Produção Interna',
          cost: recipeData.cost_per_kg || 0,
          unit_price: recipeData.cost_per_unit || 0,
          min_stock: 0,
          current_stock: 0,
          recipe_id: recipeData.id,
          unit_weight: 0,
          kg_weight: 0
        };
        
        console.log("Criando produto a partir da receita atualizada:", newProduct);
        try {
          const createdProduct = await createProduct(newProduct);
          console.log("Produto criado com sucesso na atualização:", createdProduct);
        } catch (createError) {
          console.error("Erro ao criar produto na atualização da receita:", createError);
        }
      }
    }
    
    if (ingredientsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .in('id', ingredientsToDelete);
      
      if (deleteError) throw deleteError;
    }
    
    if (ingredientsToAdd.length > 0) {
      const ingredientsWithRecipeId = ingredientsToAdd.map(ingredient => ({
        ...ingredient,
        recipe_id: id
      }));
      
      const { error: addError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientsWithRecipeId);
      
      if (addError) throw addError;
    }
    
    for (const ingredient of ingredientsToUpdate) {
      const { error: updateError } = await supabase
        .from('recipe_ingredients')
        .update({
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          cost: ingredient.cost,
          total_cost: ingredient.total_cost,
          is_sub_recipe: ingredient.is_sub_recipe,
          product_id: ingredient.product_id,
          sub_recipe_id: ingredient.sub_recipe_id
        })
        .eq('id', ingredient.id);
      
      if (updateError) throw updateError;
    }
    
    toast.success("Receita atualizada com sucesso");
    return recipeData;
  } catch (error) {
    console.error("Error updating recipe:", error);
    toast.error("Erro ao atualizar receita");
    return null;
  }
}

export async function deleteRecipe(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    toast.success("Receita excluída com sucesso");
    return true;
  } catch (error) {
    console.error("Error deleting recipe:", error);
    toast.error("Erro ao excluir receita");
    return false;
  }
}

export async function updateAllRecipesCosts(): Promise<boolean> {
  try {
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('*')
      .order('code');
    
    if (recipesError) throw recipesError;
    
    if (!recipes || recipes.length === 0) {
      return true;
    }
    
    const regularRecipes = recipes.filter(r => r.code !== 'SUB');
    const subProductRecipes = recipes.filter(r => r.code === 'SUB');
    
    for (const recipe of regularRecipes) {
      await updateRecipeCost(recipe.id);
    }
    
    for (const recipe of subProductRecipes) {
      await updateRecipeCost(recipe.id);
    }
    
    toast.success("Custos de todas as receitas atualizados com sucesso");
    return true;
  } catch (error) {
    console.error("Error updating all recipes costs:", error);
    toast.error("Erro ao atualizar custos das receitas");
    return false;
  }
}

async function updateRecipeCost(recipeId: string): Promise<boolean> {
  try {
    const { recipe, ingredients } = await getRecipeWithIngredients(recipeId);
    
    if (!recipe) return false;
    
    let totalCost = 0;
    
    for (const ingredient of ingredients) {
      if (ingredient.is_sub_recipe && ingredient.sub_recipe_id) {
        const { data: subRecipe } = await supabase
          .from('recipes')
          .select('cost_per_kg')
          .eq('id', ingredient.sub_recipe_id)
          .single();
        
        if (subRecipe) {
          const costPerKg = subRecipe.cost_per_kg || 0;
          const totalIngredientCost = costPerKg * ingredient.quantity;
          totalCost += totalIngredientCost;
          
          await supabase
            .from('recipe_ingredients')
            .update({
              cost: costPerKg,
              total_cost: totalIngredientCost
            })
            .eq('id', ingredient.id);
        }
      } else if (ingredient.product_id) {
        const { data: product } = await supabase
          .from('products')
          .select('cost')
          .eq('id', ingredient.product_id)
          .single();
        
        if (product) {
          const cost = product.cost || 0;
          const totalIngredientCost = cost * ingredient.quantity;
          totalCost += totalIngredientCost;
          
          await supabase
            .from('recipe_ingredients')
            .update({
              cost: cost,
              total_cost: totalIngredientCost
            })
            .eq('id', ingredient.id);
        }
      }
    }
    
    const costPerKg = recipe.yield_kg > 0 ? totalCost / recipe.yield_kg : 0;
    const costPerUnit = recipe.yield_units && recipe.yield_units > 0 ? totalCost / recipe.yield_units : null;
    
    await supabase
      .from('recipes')
      .update({
        cost_per_kg: costPerKg,
        cost_per_unit: costPerUnit
      })
      .eq('id', recipe.id);
    
    // Update the linked product if this is a recipe
    const { data: linkedProduct } = await supabase
      .from('products')
      .select('id')
      .eq('recipe_id', recipe.id)
      .maybeSingle();
    
    if (linkedProduct) {
      await supabase
        .from('products')
        .update({ 
          cost: costPerKg,
          unit_price: costPerUnit || 0
        })
        .eq('id', linkedProduct.id);
    }
    
    return true;
  } catch (error) {
    console.error(`Error updating recipe cost for ${recipeId}:`, error);
    return false;
  }
}
