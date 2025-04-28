# Fluxos de Negócio Detalhados

Este documento descreve em detalhes todos os principais fluxos do sistema, com exemplos práticos, validações, integrações e observações de UX.

## Sumário
- [1. Cadastro e Edição de Produtos](#1-cadastro-e-edição-de-produtos)
- [2. Listas de Produção](#2-listas-de-produção)
- [3. Pedidos de Produção](#3-pedidos-de-produção)
- [4. Receitas](#4-receitas)
- [5. Grupos e Subgrupos](#5-grupos-e-subgrupos)
- [6. Inventário e Estoque](#6-inventário-e-estoque)

---

## 1. Cadastro e Edição de Produtos
- **Campos:** Nome (autocomplete inteligente), unidade, grupo, subgrupo, tipo, dias da semana (checkboxes), custo, estoque mínimo, fornecedor, SKU.
- **Validações:**
  - Nome obrigatório.
  - Unidade obrigatória (exceto matéria-prima).
  - Peso/Preço obrigatórios conforme tipo.
  - Custo não pode ser negativo.
- **Integração:**
  - Supabase para persistência.
  - Autocomplete busca nomes semelhantes e alerta de duplicidade.
- **Exemplo:**
  ```ts
  await createProduct({ name: "Baguete", unit: "UN", ... });
  ```

## 2. Listas de Produção
- **Tipos:** Diárias (automáticas) e personalizadas.
- **Estrutura:** ProductionList (lista), ProductionListItem (item).
- **Fluxos:**
  - Geração automática baseada nos dias marcados nos produtos.
  - CRUD completo via serviços.
  - Visualização hierárquica/tabular.
- **Exemplo:**
  ```ts
  await generateDailyLists("user_id");
  ```

## 3. Pedidos de Produção
- **Campos:** Número do pedido, data, status, itens (receitas, quantidades planejadas/realizadas).
- **Status:** pending, in_progress, completed.
- **Fluxos:**
  - Criação manual ou a partir do calendário.
  - Atualização de status, confirmação de produção, deleção.
- **Exemplo:**
  ```ts
  await confirmProductionOrder(orderId, itens, "Observação");
  ```

## 4. Receitas
- **Campos:** Nome, código, rendimento (kg/un), instruções, foto, custo, grupo/subgrupo, dias da semana.
- **Ingredientes:** Produtos ou sub-receitas, quantidade, unidade, custo.
- **Fluxos:**
  - CRUD completo, atualização de custos, busca por nome, obtenção de todos ingredientes (inclusive sub-receitas).
- **Exemplo:**
  ```ts
  const ingredientes = await getAllRecipeIngredients(recipeId, 2);
  ```

## 5. Grupos e Subgrupos
- **Visualização:** Hierárquica (árvore) e tabular.
- **CRUD:** Adicionar, editar, excluir, pesquisar grupos e subgrupos.
- **Integração:** Supabase para persistência, componente HierarchicalGroupView para UI.

## 6. Inventário e Estoque
- **Campos:** Estoque atual, estoque mínimo, movimentações.
- **Fluxos:**
  - Atualização automática após confirmação de produção.
  - Ajustes manuais via interface de inventário.
