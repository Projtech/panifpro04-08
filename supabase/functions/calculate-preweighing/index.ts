import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrderRecipe {
  recipeId: string;
  recipeName: string;
  quantity: number;
  unit: string;
}

interface PreWeighingItem {
  recipe_id: string;
  recipe_name: string;
  product_id: string;
  product_name: string;
  total_quantity: number;
  unit: string;
  batch_multiplier: number;
  parent_recipe_name: string;
  is_sub_recipe: boolean;
  pattern_count: number;
  product_unit?: string;
}

interface RecipeIngredient {
  quantity: number;
  unit: string;
  product_id: string | null;
  sub_recipe_id: string | null;
  is_sub_recipe: boolean;
  products?: { name: string };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { companyId, orderRecipes } = await req.json()

    if (!companyId || !orderRecipes || !Array.isArray(orderRecipes)) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const preWeighingItems: PreWeighingItem[] = [];
    const processedSubRecipes = new Map<string, number>(); // Mapa para rastrear sub-receitas já processadas e seus padrões

    // Função recursiva para processar receitas e sub-receitas
    async function processRecipe(recipeId: string, quantity: number, unit: string, parentRecipeName: string, depth = 0) {
      // Limite de profundidade para evitar loops infinitos
      if (depth > 5) {
        console.error('Máxima profundidade de recursão atingida, possível loop de sub-receitas')
        return
      }
      
      console.log(`Processando receita ID: ${recipeId}, quantidade: ${quantity}, unidade: ${unit}, profundidade: ${depth}`)
      
      // Buscar dados da receita
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .select('id, name, yield_kg, yield_units')
        .eq('id', recipeId)
        .eq('company_id', companyId)
        .single()

      if (recipeError || !recipe) {
        console.error('Receita não encontrada:', recipeId)
        return
      }
      
      // Calcular multiplicador de batch
      let batchMultiplier: number
      if (unit === 'kg') {
        batchMultiplier = quantity / (recipe.yield_kg || 1)
      } else {
        batchMultiplier = quantity / (recipe.yield_units || 1)
      }
      
      // Calcular número de padrões
      let patternCount = 0
      if (unit === 'un') {
        patternCount = Math.round(quantity)
      } else if (recipe.yield_units && recipe.yield_kg) {
        // Converter kg para unidades usando a proporção da receita
        patternCount = Math.round(quantity * (recipe.yield_units / recipe.yield_kg))
      } else {
        patternCount = Math.round(batchMultiplier)
      }
      
      console.log(`Multiplicador de batch para ${recipe.name}: ${batchMultiplier}, Padrões: ${patternCount}`)
      
      // Buscar todos os ingredientes (incluindo sub-receitas)
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .select(`
          quantity,
          unit,
          product_id,
          sub_recipe_id,
          is_sub_recipe,
          products(name)
        `)
        .eq('recipe_id', recipeId)
        .eq('company_id', companyId)

      if (ingredientsError || !ingredients) {
        console.error('Ingredientes não encontrados para receita:', recipeId)
        return
      }
      
      // Se for uma sub-receita (depth > 0), adicionar como um item na lista de pré-pesagem
      if (depth > 0) {
        // Verificar se já processamos esta sub-receita antes
        if (processedSubRecipes.has(recipeId)) {
          // Atualizar a quantidade de padrões
          processedSubRecipes.set(recipeId, processedSubRecipes.get(recipeId)! + patternCount)
        } else {
          // Adicionar a sub-receita como um item na lista de pré-pesagem
          preWeighingItems.push({
            recipe_id: recipeId,
            recipe_name: recipe.name,
            product_id: recipeId, // Usar o ID da sub-receita como product_id
            product_name: recipe.name,
            total_quantity: quantity,
            unit: unit,
            batch_multiplier: batchMultiplier,
            parent_recipe_name: parentRecipeName,
            is_sub_recipe: true,
            pattern_count: patternCount,
            product_unit: unit
          })
          
          processedSubRecipes.set(recipeId, patternCount)
        }
        
        // Não processamos os ingredientes da sub-receita, apenas a sub-receita em si
        return
      }
      
      // Processar cada ingrediente (apenas para receitas principais, depth = 0)
      for (const ingredient of ingredients as RecipeIngredient[]) {
        const adjustedQuantity = ingredient.quantity * batchMultiplier
        
        if (ingredient.is_sub_recipe && ingredient.sub_recipe_id) {
          // Se for sub-receita, processar recursivamente
          console.log(`Encontrada sub-receita ID: ${ingredient.sub_recipe_id}, quantidade: ${adjustedQuantity}`)
          
          // Processar a sub-receita recursivamente
          await processRecipe(ingredient.sub_recipe_id, adjustedQuantity, ingredient.unit, recipe.name, depth + 1)
        } else if (!ingredient.is_sub_recipe && ingredient.product_id) {
          // Se for ingrediente normal, adicionar à lista de pré-pesagem
          const productId = ingredient.product_id
          const productName = ingredient.products?.name || 'Produto sem nome'
          
          console.log(`Adicionando ingrediente: ${productName}, quantidade: ${adjustedQuantity} ${ingredient.unit}`)
          
          preWeighingItems.push({
            recipe_id: recipe.id,
            recipe_name: recipe.name,
            product_id: productId,
            product_name: productName,
            total_quantity: adjustedQuantity,
            unit: ingredient.unit,
            batch_multiplier: batchMultiplier,
            parent_recipe_name: parentRecipeName,
            is_sub_recipe: false,
            pattern_count: 0,
            product_unit: ingredient.unit
          })
        }
      }
    }

    // Processar cada receita do pedido
    for (const orderRecipe of orderRecipes as OrderRecipe[]) {
      if (!orderRecipe.recipeId) continue
      await processRecipe(orderRecipe.recipeId, orderRecipe.quantity, orderRecipe.unit, orderRecipe.recipeName || "Receita Principal")
    }

    // Atualizar as contagens de padrões para sub-receitas já processadas
    preWeighingItems.forEach(item => {
      if (item.is_sub_recipe && processedSubRecipes.has(item.recipe_id)) {
        item.pattern_count = processedSubRecipes.get(item.recipe_id)!
      }
    })

    // Ordenar por receita pai, depois sub-receitas primeiro, depois por nome
    const sortedItems = preWeighingItems.sort((a, b) => {
      // Primeiro ordenar por receita pai
      const parentCompare = a.parent_recipe_name.localeCompare(b.parent_recipe_name)
      if (parentCompare !== 0) return parentCompare
      
      // Depois, sub-receitas primeiro
      if (a.is_sub_recipe && !b.is_sub_recipe) return -1
      if (!a.is_sub_recipe && b.is_sub_recipe) return 1
      
      // Por fim, ordenar por nome
      return a.product_name.localeCompare(b.product_name)
    })

    return new Response(
      JSON.stringify(sortedItems),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error calculating pre-weighing list:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
