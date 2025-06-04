import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrderRecipe {
  recipeId: string;
  quantity: number;
  unit: string;
}

interface MaterialItem {
  product_id: string;
  product_name: string;
  total_quantity: number;
  unit: string;
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

    const materialsMap = new Map<string, MaterialItem>()
    
    // Função recursiva para processar receitas e sub-receitas
    async function processRecipe(recipeId: string, quantity: number, unit: string, depth = 0) {
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
      
      console.log(`Multiplicador de batch para ${recipe.name}: ${batchMultiplier}`)
      
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
      
      // Processar cada ingrediente
      for (const ingredient of ingredients as RecipeIngredient[]) {
        const adjustedQuantity = ingredient.quantity * batchMultiplier
        
        if (ingredient.is_sub_recipe && ingredient.sub_recipe_id) {
          // Se for sub-receita, processar recursivamente
          console.log(`Encontrada sub-receita ID: ${ingredient.sub_recipe_id}, quantidade: ${adjustedQuantity}`)
          await processRecipe(ingredient.sub_recipe_id, adjustedQuantity, ingredient.unit, depth + 1)
        } else if (!ingredient.is_sub_recipe && ingredient.product_id) {
          // Se for ingrediente normal, adicionar ao mapa
          const productId = ingredient.product_id
          const productName = ingredient.products?.name || 'Produto sem nome'
          
          console.log(`Adicionando ingrediente: ${productName}, quantidade: ${adjustedQuantity} ${ingredient.unit}`)
          
          if (materialsMap.has(productId)) {
            const existing = materialsMap.get(productId)!
            existing.total_quantity += adjustedQuantity
          } else {
            materialsMap.set(productId, {
              product_id: productId,
              product_name: productName,
              total_quantity: adjustedQuantity,
              unit: ingredient.unit
            })
          }
        }
      }
    }

    // Processar cada receita do pedido
    for (const orderRecipe of orderRecipes as OrderRecipe[]) {
      if (!orderRecipe.recipeId) continue
      await processRecipe(orderRecipe.recipeId, orderRecipe.quantity, orderRecipe.unit)
    }

    // Converter mapa para array e ordenar por nome
    const materials = Array.from(materialsMap.values())
      .sort((a, b) => a.product_name.localeCompare(b.product_name))

    return new Response(
      JSON.stringify(materials),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error calculating materials:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
