# Teste de Sincronização Receita-Produto

## Problema Identificado e Corrigido

### 🔍 **Problema Principal:**
A criação automática de produtos ao criar receitas não funcionava corretamente porque as consultas SQL não filtravam produtos por `is_deleted = false`.

### 📋 **Cenário Problemático:**
1. Usuário cria receita "Pão Francês"
2. Produto "Pão Francês" é criado automaticamente
3. Usuário exclui a receita (soft delete)
4. Usuário tenta criar nova receita "Pão Francês" novamente
5. **❌ ERRO:** Sistema encontrava produto inativo e tentava atualizar ele
6. **❌ RESULTADO:** Produto permanecia inativo, sem sincronização

### ✅ **Soluções Aplicadas:**

#### 1. **Função `createRecipe` (linha 363)**
```typescript
// ANTES - Buscava todos os produtos (ativos e inativos)
.eq('name', processedRecipe.name)
.eq('company_id', companyId)

// DEPOIS - Busca apenas produtos ativos
.eq('name', processedRecipe.name)
.eq('company_id', companyId)
.eq('is_deleted', false) // ✅ Filtro adicionado
```

#### 2. **Função `updateRecipe` (linha 526)**
```typescript
// ANTES - Buscava produto vinculado sem filtrar por status
.eq('recipe_id', recipeData.id)
.eq('company_id', companyId)

// DEPOIS - Busca apenas produtos ativos vinculados
.eq('recipe_id', recipeData.id)
.eq('company_id', companyId)
.eq('is_deleted', false) // ✅ Filtro adicionado
```

#### 3. **Função `updateRecipeCost` (linha 805)**
```typescript
// ANTES - Buscava produto vinculado sem filtrar por status
.eq('recipe_id', recipe.id)
.eq('company_id', companyId)

// DEPOIS - Busca apenas produtos ativos vinculados
.eq('recipe_id', recipe.id)
.eq('company_id', companyId)
.eq('is_deleted', false) // ✅ Filtro adicionado
```

### 🧪 **Teste Manual Recomendado:**

1. **Criar receita nova:**
   - Criar receita "Teste Sincronização" 
   - Verificar se produto "Teste Sincronização" foi criado automaticamente
   - Confirmar que produto tem `is_deleted = false`

2. **Excluir receita:**
   - Excluir receita "Teste Sincronização"
   - Verificar se produto vinculado foi marcado como `is_deleted = true`

3. **Recriar receita:**
   - Criar nova receita "Teste Sincronização"
   - Verificar se NOVO produto foi criado (não deve reutilizar o inativo)
   - Confirmar que novo produto tem `is_deleted = false`

### 📊 **Resultados Esperados:**

✅ **Criação:** Produto é criado automaticamente quando receita é criada
✅ **Exclusão:** Produto é inativado quando receita é excluída  
✅ **Recriação:** Novo produto é criado mesmo se existir produto inativo com mesmo nome
✅ **Sincronização:** Custos são sincronizados corretamente entre receita e produto
✅ **Consistência:** Apenas produtos ativos são considerados em todas as operações

### 🔄 **Próximos Passos:**

1. Verificar se função RPC `soft_delete_recipe` também inativa produto vinculado
2. Testar cenários complexos com subreceitas
3. Validar logs de erro em caso de falha na criação de produtos
4. Testar cenários com nomes duplicados entre receitas ativas e inativas

### 🐛 **Nota sobre Erros TypeScript:**
Os erros "Type instantiation is excessively deep" são relacionados aos tipos do Supabase e não afetam a funcionalidade. Eles podem ser ignorados no momento pois são específicos do sistema de tipos, não da lógica de negócio.
