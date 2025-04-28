# API Interna e Serviços

Este documento detalha todas as funções de serviço, endpoints, tipos, exemplos de uso e integrações com Supabase.

## Sumário
- [1. Serviços de Produto](#1-serviços-de-produto)
- [2. Serviços de Lista de Produção](#2-serviços-de-lista-de-produção)
- [3. Serviços de Pedido de Produção](#3-serviços-de-pedido-de-produção)
- [4. Serviços de Receita](#4-serviços-de-receita)
- [5. Outros Serviços e Utilitários](#5-outros-serviços-e-utilitários)

---

## 1. Serviços de Produto
- **Principais funções:**
  - `getProducts()`: retorna todos produtos.
  - `findSimilarProductsByName(name)`: busca nomes parecidos.
  - `createProduct(productData)`: cria produto com validação.
  - `updateProduct(id, productData)`: atualiza produto.
  - `deleteProduct(id)`: remove produto.
- **Exemplo:**
  ```ts
  await createProduct({ name: "Pão Francês", unit: "UN", ... });
  ```

## 2. Serviços de Lista de Produção
- **Principais funções:**
  - `generateDailyLists(userId)`: gera listas automáticas.
  - `createProductionList(listData, itemsData)`: cria lista.
  - `updateProductionList(listId, listData, itemsData)`: atualiza lista.
  - `deleteProductionList(listId)`: remove lista e itens.
- **Exemplo:**
  ```ts
  await generateDailyLists("user_id");
  ```

## 3. Serviços de Pedido de Produção
- **Principais funções:**
  - `getProductionOrders()`: retorna pedidos com itens.
  - `createProductionOrder(order, items)`: cria novo pedido.
  - `updateProductionOrderStatus(id, status)`: muda status.
  - `confirmProductionOrder(id, items, notes)`: confirma produção.
- **Exemplo:**
  ```ts
  await confirmProductionOrder(orderId, itens, "Tudo produzido");
  ```

## 4. Serviços de Receita
- **Principais funções:**
  - `getRecipes()`, `getRecipe(id)`: busca receitas.
  - `getRecipeWithIngredients(id)`: receita e ingredientes.
  - `getAllRecipeIngredients(recipeId, quantity)`: ingredientes recursivos.
  - `createRecipe(recipe, ingredients)`: cria receita.
  - `updateRecipeCost(recipeId)`: recalcula custo.
- **Exemplo:**
  ```ts
  const ingredientes = await getAllRecipeIngredients(recipeId, 2);
  ```

## 5. Outros Serviços e Utilitários
- **formatters.ts:** Funções de formatação.
- **numberUtils.ts:** Conversão e validação de números.
- **utils.ts:** Helpers diversos.
