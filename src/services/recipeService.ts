import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Product, createProduct, getProduct, updateProduct } from "./productService";
import { getProductTypeIdByName, ensureSystemProductTypes } from "./productTypesService";
import { getSystemProductTypeId, determineRecipeProductType } from './recipeTypeHelper';

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
  etapa?: string | null;
}

export interface RecipeIngredientWithDetails extends RecipeIngredient {
  product?: Product;
  sub_recipe?: Recipe | null;
}

export async function getRecipes(companyId: string): Promise<Recipe[]> {
  if (!companyId) throw new Error('[getRecipes] companyId é obrigatório');

  try {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        id,
        name,
        code,
        yield_kg,
        yield_units,
        instructions,
        photo_url,
        gif_url,
        cost_per_kg,
        cost_per_unit,
        group_id,
        subgroup_id,
        all_days,
        monday,
        tuesday,
        wednesday,
        thursday,
        friday,
        saturday,
        sunday
      `)
      .eq('company_id', companyId)
      .eq('is_deleted', false) // Filtrar apenas receitas não excluídas
      .order('name');

    if (error) {
      throw error;
    }

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

export async function getRecipe(id: string, companyId: string): Promise<Recipe | null> {
  if (!companyId) throw new Error('[getRecipe] companyId é obrigatório');
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId);
    
    if (error) throw error;
    if (!data || data.length === 0) return null;
    
    // Pegar o primeiro item do array
    const recipeData = data[0];
    
    // Garantir que todos os campos opcionais estejam definidos mesmo que sejam nulos
    const supabaseData = recipeData as SupabaseRecipeData;
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

export async function getRecipeWithIngredients(id: string, companyId: string): Promise<{recipe: Recipe | null, ingredients: RecipeIngredientWithDetails[]}> {
  if (!companyId) throw new Error('[getRecipeWithIngredients] companyId é obrigatório');
  try {
    const { data: recipeDataArray, error: recipeError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId);
    
    if (recipeError) throw recipeError;
    
    // Verificar se encontrou a receita
    if (!recipeDataArray || recipeDataArray.length === 0) {
      return { recipe: null, ingredients: [] };
    }
    
    // Pegar o primeiro item do array
    const recipeData = recipeDataArray[0];
    
    // Processar a receita para garantir todos os campos
    const recipe = {
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
    } as Recipe;
    
    const { data: ingredientsData, error: ingredientsError } = await supabase
      .from('recipe_ingredients')
      .select(`
        *,
        product:products(*),
        sub_recipe:recipes!recipe_ingredients_sub_recipe_id_fkey(*)
      `) 
      .eq('recipe_id', id)
      .eq('company_id', companyId);
    
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
export async function getAllRecipeIngredients(recipeId: string, companyId: string, quantity: number = 1): Promise<RecipeIngredientWithDetails[]> {
  if (!companyId) throw new Error('[getAllRecipeIngredients] companyId é obrigatório');
  try {
    console.log(`Buscando ingredientes para a receita ${recipeId} com quantidade ${quantity}`);
    const { recipe, ingredients } = await getRecipeWithIngredients(recipeId, companyId);
    
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
        const subIngredients = await getAllRecipeIngredients(ingredient.sub_recipe_id, companyId, subQuantity);
        
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

export async function checkRecipeNameExists(name: string, companyId: string, excludeId?: string): Promise<boolean> {
  if (!companyId) throw new Error('[checkRecipeNameExists] companyId é obrigatório');
  try {
    const query = supabase
      .from('recipes')
      .select('id, name')
      .ilike('name', name)
      .eq('company_id', companyId)
      .eq('is_deleted', false); // Considerar apenas receitas ativas
    if (excludeId) {
      query.neq('id', excludeId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    console.error('[RECIPES] Error checking recipe name:', error);
    return false;
  }
}

export async function createRecipe(recipe: Omit<Recipe, 'id'>, ingredients: Omit<RecipeIngredient, 'id' | 'recipe_id'>[], companyId: string): Promise<Recipe | null> {
  if (!companyId) throw new Error('[createRecipe] companyId é obrigatório');
  try {
    console.log("Criando nova receita:", recipe);
    const { data: recipeData, error: recipeError } = await supabase
      .from('recipes')
      .insert([{ ...recipe, company_id: companyId }])
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
      // Check for existing product with the same name (only active products)
      console.log("Verificando se já existe um produto ativo com o mesmo nome:", processedRecipe.name);
      const { data: existingProduct, error: productQueryError } = await supabase
        .from('products')
        .select('*')
        .eq('name', processedRecipe.name)
        .eq('company_id', companyId)
        .eq('is_deleted', false) // Considerar apenas produtos ativos
        .maybeSingle();
      
      if (productQueryError) {
        console.error("Erro ao verificar produto existente:", productQueryError);
      }
      
      console.log("Produto existente:", existingProduct);
      
      // Create or update linked product
      if (!existingProduct) {
        // Create new product linked to recipe
        const isSubRecipe = processedRecipe.code?.startsWith('SUB');
        // Determina a unidade final do PRODUTO
        const finalUnit = isSubRecipe ? 'Kg' : (processedRecipe.yield_units && processedRecipe.yield_units > 0 ? 'UN' : 'Kg');
        // Garante que yield_kg tenha um valor válido para subreceitas
        if (isSubRecipe && (!processedRecipe.yield_kg || processedRecipe.yield_kg <= 0)) {
          console.warn("Peso da subreceita não definido. Usando 1kg como padrão.");
          processedRecipe.yield_kg = 1;
          
          // Atualiza o yield_kg na receita no banco de dados
          await supabase
            .from('recipes')
            .update({ yield_kg: 1 })
            .eq('id', processedRecipe.id)
            .eq('company_id', companyId);
        }
        
        // Calcula pesos
        const calculatedUnitWeight = (finalUnit === 'UN' && processedRecipe.yield_units && processedRecipe.yield_units > 0 && processedRecipe.yield_kg)
                                    ? (processedRecipe.yield_kg / processedRecipe.yield_units)
                                    : null;
        const calculatedKgWeight = (finalUnit === 'Kg') ? processedRecipe.yield_kg : null;
        // Determina o custo correto baseado na unidade final
        const finalCost = finalUnit === 'UN' ? processedRecipe.cost_per_unit : processedRecipe.cost_per_kg;

        // Determina o tipo de produto e busca seu ID no banco usando o helper
        const productTypeName = isSubRecipe ? 'subreceita' : 'receita';
        let productTypeId = null;
        
        try {
          // Esta função garante que o tipo existe antes de retornar o ID
          productTypeId = await getSystemProductTypeId(productTypeName, companyId);
          console.log(`ID do tipo de produto '${productTypeName}' obtido: ${productTypeId}`);
        } catch (typeError) {
          console.error(`Erro ao buscar o ID do tipo de produto '${productTypeName}':`, typeError);
          toast.error(`Erro ao buscar o tipo de produto: ${(typeError as Error).message}`);
        }

        const newProduct: Omit<Product, 'id'> = {
          name: processedRecipe.name,
          product_type_id: productTypeId, // Usar o ID do tipo de produto
          unit: finalUnit,
          cost: finalCost ?? 0,
          unit_weight: isSubRecipe ? null : calculatedUnitWeight, // Subreceitas não usam unit_weight
          kg_weight: isSubRecipe ? processedRecipe.yield_kg : calculatedKgWeight, // Garantir que kg_weight seja definido para subreceitas
          recipe_id: processedRecipe.id,
          group_id: processedRecipe.group_id || null,
          subgroup_id: processedRecipe.subgroup_id || null,
          code: processedRecipe.code || null,
          sku: processedRecipe.code || 'R-' + processedRecipe.id.substring(0, 8),
          supplier: 'Produção Interna',
          min_stock: 0,
          current_stock: 0,
          unit_price: isSubRecipe ? null : 0, // Subreceitas não usam unit_price
          ativo: true
        };

        
        console.log("Criando produto a partir da receita:", newProduct);
        try {
          if (!productTypeId) {
            throw new Error(`Não foi possível criar o produto porque o tipo '${productTypeName}' não foi encontrado.`);
          }
          const createdProduct = await createProduct(newProduct, companyId);
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
        }, companyId);
      }
      
      if (ingredients.length > 0) {
        const ingredientsWithRecipeId = ingredients.map(ingredient => ({
          ...ingredient,
          recipe_id: processedRecipe.id,
          company_id: companyId
        }));
        
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientsWithRecipeId);
        
        if (ingredientsError) throw ingredientsError;
      }
      
      // Recalcular custos após inserir ingredientes
      console.log("Recalculando custos da receita recém-criada...");
      await updateRecipeCost(processedRecipe.id, companyId);
      
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
  ingredientsToDelete: string[],
  companyId: string
): Promise<Recipe | null> {
  if (!companyId) throw new Error('[updateRecipe] companyId é obrigatório');
  try {
    const { data: recipeDataRaw, error: recipeError } = await supabase
      .from('recipes')
      .update(recipe)
      .eq('id', id)
      .eq('company_id', companyId)
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
      console.log("Buscando produto ativo vinculado à receita:", recipeData.id);
      const { data: linkedProduct, error: productQueryError } = await supabase
        .from('products')
        .select('*')
        .eq('recipe_id', recipeData.id)
        .eq('company_id', companyId)
        .eq('is_deleted', false) // Considerar apenas produtos ativos
        .maybeSingle();
      
      if (productQueryError) {
        console.error("Erro ao buscar produto vinculado:", productQueryError);
        toast.error("Erro ao buscar produto vinculado para atualização.");
      } else {
        const isSubRecipe = recipeData.code && recipeData.code.startsWith('SUB');
        const finalUnit = isSubRecipe ? 'Kg' : (recipeData.yield_units && recipeData.yield_units > 0 ? 'UN' : 'Kg');
        const calculatedUnitWeight = (finalUnit === 'UN' && recipeData.yield_units && recipeData.yield_units > 0 && recipeData.yield_kg)
                                   ? (recipeData.yield_kg / recipeData.yield_units)
                                   : null;
        const calculatedKgWeight = (finalUnit === 'Kg') ? recipeData.yield_kg : null;
        const finalCost = finalUnit === 'UN' ? recipeData.cost_per_unit : recipeData.cost_per_kg;

        // Determina o tipo de produto e busca seu ID no banco usando o helper
        const productTypeName = isSubRecipe ? 'subreceita' : 'receita';
        let productTypeId = null;
        
        try {
          // Esta função garante que o tipo existe antes de retornar o ID
          productTypeId = await getSystemProductTypeId(productTypeName, companyId);
          console.log(`ID do tipo de produto '${productTypeName}' obtido: ${productTypeId}`);
        } catch (typeError) {
          console.error(`Erro ao buscar o ID do tipo de produto '${productTypeName}':`, typeError);
          toast.error(`Erro ao buscar o tipo de produto: ${(typeError as Error).message}`);
        }
        
        const productPayload: Partial<Product> = {
          name: recipeData.name,
          product_type_id: productTypeId, // Usar o ID do tipo de produto
          unit: finalUnit,
          cost: finalCost ?? 0,
          unit_weight: calculatedUnitWeight,
          kg_weight: calculatedKgWeight,
          group_id: recipeData.group_id || null,
          subgroup_id: recipeData.subgroup_id || null,
          code: recipeData.code || null,
          sku: recipeData.code || linkedProduct?.sku || 'R-' + recipeData.id.substring(0, 8),
          supplier: 'Produção Interna',
          recipe_id: recipeData.id
        };

        if (linkedProduct) {
          // Atualiza o produto existente
          console.log("Atualizando produto vinculado:", linkedProduct.id);
          try {
            // Garante que os campos de peso estejam corretamente definidos para subreceitas
            if (isSubRecipe) {
              // Para subreceitas, garantimos que o kg_weight esteja definido
              productPayload.kg_weight = recipeData.yield_kg || 1; // Usa 1 como padrão se não definido
              productPayload.unit = 'Kg'; // Subreceitas sempre usam Kg
              productPayload.unit_weight = null; // Limpa o peso unitário
              
              // Se não houver yield_kg definido, usamos 1 como padrão para evitar erros
              if (!productPayload.kg_weight || productPayload.kg_weight <= 0) {
                productPayload.kg_weight = 1;
                console.warn("Peso da subreceita não definido. Usando 1kg como padrão.");
                
                // Garante que yield_kg esteja definido na receita também
                if (recipeData.yield_kg <= 0) {
                  // Atualiza o yield_kg na receita no banco de dados
                  await supabase
                    .from('recipes')
                    .update({ yield_kg: 1 })
                    .eq('id', recipeData.id)
                    .eq('company_id', companyId);
                  
                  // Atualiza também no objeto local
                  recipeData.yield_kg = 1;
                }
              }
            }
            
            await updateProduct(linkedProduct.id, productPayload, companyId);
            console.log("Produto vinculado atualizado com sucesso:", linkedProduct.id);
          } catch (updateError) {
            console.error("Erro ao atualizar produto vinculado:", updateError);
            // Mostra o erro específico ao usuário
            const errorMessage = updateError instanceof Error ? updateError.message : 'Erro desconhecido';
            toast.error(`Erro ao atualizar produto associado: ${errorMessage}`);
          }
        } else {
          // Cria um novo produto se não existia vínculo
          console.log("Nenhum produto vinculado encontrado. Criando novo produto.");
          
          // Verificar se temos o ID do tipo de produto antes de criar
          if (!productTypeId) {
            console.error(`Não foi possível criar o produto porque o tipo '${productTypeName}' não foi encontrado.`);
            toast.error(`Receita atualizada, mas não foi possível criar o produto porque o tipo '${productTypeName}' não existe.`);
          } else {
            const productToCreate: Omit<Product, 'id'> = {
              ...(productPayload as Omit<Product, 'id'>),
              min_stock: 0,
              current_stock: 0,
              unit_price: 0,
              ativo: true
            };
            try {
              const createdProduct = await createProduct(productToCreate, companyId);
              console.log("Produto criado com sucesso na atualização da receita:", createdProduct);
            } catch (createError) {
              console.error("Erro ao criar produto na atualização da receita:", createError);
              toast.error("Receita atualizada, mas falha ao criar produto associado.");
            }
          }
        }
      }
    }
    
    if (ingredientsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .in('id', ingredientsToDelete)
        .eq('company_id', companyId);
      
      if (deleteError) throw deleteError;
    }
    
    if (ingredientsToAdd.length > 0) {
      const ingredientsWithRecipeId = ingredientsToAdd.map(ingredient => ({
        ...ingredient,
        recipe_id: id,
        company_id: companyId
      }));
      
      const { error: addError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientsWithRecipeId);
      
      if (addError) throw addError;
    }
    
    for (const ingredient of ingredientsToUpdate) {
      const { error: updateError } = await supabase
        .from('recipe_ingredients')
        .update(ingredient)
        .eq('id', ingredient.id!)
        .eq('company_id', companyId);
      
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

export async function deleteRecipe(id: string, companyId: string): Promise<boolean> {
  if (!companyId) throw new Error('[deleteRecipe] companyId é obrigatório');
  try {
    // Primeiro, buscar e excluir o produto vinculado à receita
    console.log(`[RECIPES] Buscando produto vinculado à receita ${id} para exclusão`);
    const { data: linkedProduct, error: productQueryError } = await supabase
      .from('products')
      .select('id')
      .eq('recipe_id', id)
      .eq('company_id', companyId)
      .eq('is_deleted', false) // Apenas produtos ativos
      .maybeSingle();
    
    if (productQueryError) {
      console.error("[RECIPES] Erro ao buscar produto vinculado:", productQueryError);
    } else if (linkedProduct) {
      console.log(`[RECIPES] Produto vinculado encontrado: ${linkedProduct.id}. Excluindo...`);
      const { error: deleteProductError } = await supabase
        .from('products')
        .update({ is_deleted: true })
        .eq('id', linkedProduct.id)
        .eq('company_id', companyId);
      
      if (deleteProductError) {
        console.error("[RECIPES] Erro ao excluir produto vinculado:", deleteProductError);
      } else {
        console.log(`[RECIPES] Produto vinculado ${linkedProduct.id} excluído com sucesso`);
      }
    } else {
      console.log(`[RECIPES] Nenhum produto ativo vinculado encontrado para a receita ${id}`);
    }
    
    // Depois, usar a função RPC de soft_delete_recipe para excluir a receita
    const { data, error } = await supabase
      .rpc('soft_delete_recipe', { p_recipe_id: id });

    if (error) throw error;
    
    toast.success("Receita e produto vinculado excluídos com sucesso");
    return data;
  } catch (error) {
    console.error("Error deleting recipe:", error);
    toast.error("Erro ao excluir receita");
    return false;
  }
}

export async function updateAllRecipesCosts(companyId: string): Promise<boolean> {
  if (!companyId) throw new Error('[updateAllRecipesCosts] companyId é obrigatório');
  try {
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('*')
      .eq('company_id', companyId)
      .order('code');
    
    if (recipesError) throw recipesError;
    
    if (!recipes || recipes.length === 0) {
      return true;
    }
    
    const regularRecipes = recipes.filter(r => r.code !== 'SUB');
    const subProductRecipes = recipes.filter(r => r.code === 'SUB');
    
    for (const recipe of regularRecipes) {
      await updateRecipeCost(recipe.id, companyId);
    }
    
    for (const recipe of subProductRecipes) {
      await updateRecipeCost(recipe.id, companyId);
    }
    
    toast.success("Precificação de todas as receitas atualizada com sucesso");
    return true;
  } catch (error) {
    console.error("Error updating all recipes costs:", error);
    toast.error("Erro ao atualizar custos das receitas");
    return false;
  }
}

async function updateRecipeCost(recipeId: string, companyId: string): Promise<boolean> {
  try {
    const { recipe, ingredients } = await getRecipeWithIngredients(recipeId, companyId);
    
    if (!recipe) return false;
    
    let totalCost = 0;
    
    for (const ingredient of ingredients) {
      if (ingredient.is_sub_recipe && ingredient.sub_recipe_id) {
        const { data: subRecipe } = await supabase
          .from('recipes')
          .select('cost_per_kg')
          .eq('id', ingredient.sub_recipe_id)
          .eq('company_id', companyId)
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
            .eq('id', ingredient.id)
            .eq('company_id', companyId);
        }
      } else if (ingredient.product_id) {
        const { data: product } = await supabase
          .from('products')
          .select('cost')
          .eq('id', ingredient.product_id)
          .eq('company_id', companyId)
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
            .eq('id', ingredient.id)
            .eq('company_id', companyId);
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
      .eq('id', recipe.id)
      .eq('company_id', companyId);
    
    // Update the linked product if this is a recipe
    const { data: linkedProduct } = await supabase
      .from('products')
      .select('id')
      .eq('recipe_id', recipe.id)
      .eq('company_id', companyId)
      .eq('is_deleted', false) // Considerar apenas produtos ativos
      .maybeSingle();
    
    if (linkedProduct) {
      await supabase
        .from('products')
        .update({ 
          cost: costPerKg,
          unit_price: costPerUnit || 0
        })
        .eq('id', linkedProduct.id)
        .eq('company_id', companyId);
    }
    
    return true;
  } catch (error) {
    console.error(`Error updating recipe cost for ${recipeId}:`, error);
    return false;
  }
}
