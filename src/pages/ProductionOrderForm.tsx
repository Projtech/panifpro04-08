import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "@/components/ui/use-toast";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import useProductionOrder, { Recipe } from "@/hooks/useProductionOrder";
import { getRecipeWithIngredients } from "@/services/recipeService";
import { useAuth } from '@/contexts/AuthContext';

// Components
import OrderHeader from "@/components/ProductionOrder/OrderHeader";
import OrderInfoForm from "@/components/ProductionOrder/OrderInfoForm";
import RecipeManager from "@/components/ProductionOrder/RecipeManager";
import StatusManager from "@/components/ProductionOrder/StatusManager";
import MaterialsCalculator from "@/components/ProductionOrder/MaterialsCalculator";
import PreWeighingCalculator from "@/components/ProductionOrder/PreWeighingCalculator";

interface ProductionOrderFormProps {
  showMaterialsList?: boolean;
  showPreWeighingList?: boolean;
}



interface LocationState {
  produtos?: Array<any>; // Produtos vindos do calendário ou pré-lista
  dia?: string; // Dia da semana
  calendarItems?: Array<{
    recipe_id: string | null;
    recipe_name: string;
    planned_quantity_kg: number;
    planned_quantity_units: number | null;
    unit: string;
  }>;
  calendarDate?: string;
  fromPreList?: boolean; // Indica se os produtos vieram de uma pré-lista
  preListId?: string; // ID da pré-lista
  preListName?: string; // Nome da pré-lista
}

export default function ProductionOrderForm({ showMaterialsList: initialShowMaterialsList, showPreWeighingList: initialShowPreWeighingList }: ProductionOrderFormProps = {}) {
  const { id } = useParams();
  const location = useLocation();
  const state = location.state as LocationState;
  const navigate = useNavigate();

  useEffect(() => {
    if (state?.produtos && state.produtos.length > 0 && setOrderRecipes) {
      console.log("Produtos recebidos na tela de pedido:", state.produtos);
      
      const mapped = state.produtos.map((prod: any, idx: number) => {
        // Detectar corretamente a origem - calendário ou pré-lista
        const isFromCalendar = 'fromCalendar' in prod && prod.fromCalendar === true;
        
        // Se vier do calendário, usar a estrutura nova com recipe_id
        if (isFromCalendar) {
          // Use recipeId if available, otherwise use index as fallback for stability
          const stableId = prod.recipeId ? `calendar-recipe-${prod.recipeId}` : `calendar-index-${idx}`;
          return {
            id: stableId, // Stable ID
            recipeId: prod.recipeId,
            recipeName: prod.recipeName || "Produto sem nome",
            quantity: typeof prod.quantity === 'number' ? prod.quantity : parseFloat(prod.quantity) || 0,
            unit: (prod.unit || "un").toLowerCase(),
            convertedQuantity: 0,
            fromCalendar: true
          };
        } else {
          // Manter o comportamento original para outros tipos de dados (ex: pré-lista)
          const isFromPreList = 'product_id' in prod;
          // Use product_id or recipe_id/id if available, otherwise use index
          const idSource = isFromPreList ? prod.product_id : (prod.recipe_id || prod.id);
          const stableId = idSource ? `prelist-item-${idSource}` : `prelist-index-${idx}`;
          return {
            id: stableId, // Stable ID
            recipeId: isFromPreList ? prod.product_id : (prod.recipe_id || null),
            recipeName: isFromPreList ? (prod.product_name || "Produto sem nome") : prod.name,
            quantity: isFromPreList ? prod.quantity : (prod.unit === 'kg' ? (prod.kg_weight || 1) : (prod.unit_weight || 1)),
            unit: isFromPreList ? prod.unit.toLowerCase() : (prod.unit || "kg").toLowerCase(),
            convertedQuantity: 0,
            fromPreList: isFromPreList,
            fromCalendar: !isFromPreList // Assuming if not prelist, it's like calendar
          };
        }
      });
      setOrderRecipes(mapped);
      
      // Definir um número para o pedido baseado na origem dos dados
      if (state.fromPreList && setOrderNumber) {
        setOrderNumber(`P${state.preListName ? state.preListName.substring(0, 5) : ''}-${String(new Date().getTime()).slice(-4)}`);
      }
    }
    // Se desejar, pode também ajustar a data do pedido para o próximo dia do calendário
    // if (state?.dia && setOrderDate) { ... }
  }, [state?.produtos]);

  // const { state } = useLocation() as { state: LocationState | null }; // 'state' is already defined from location.state on line 37
  const { activeCompany } = useAuth();
  const {
    loading,
    recipes, // Keep recipes from the hook for other potential uses, though calculatePreWeighing fetches details directly
    orderNumber,
    setOrderNumber,
    orderDate,
    setOrderDate,
    orderStatus, // setOrderStatus removed as it was causing lint error and might not be provided directly by the hook
    orderRecipes,
    setOrderRecipes,
    showMaterialsList,
    setShowMaterialsList,
    orderOrigin,
    materials,
    loadingMaterials,
    openMaterialsList,
    handleSave,
    handleStatusUpdate,
    isEditing,
    isViewOnly
  } = useProductionOrder({
    id,
    calendarItems: state?.calendarItems,
    calendarDate: state?.calendarDate
  });
  
  // Se initialShowMaterialsList for true, definimos showMaterialsList como true
  useEffect(() => {
    if (initialShowMaterialsList && id) {
      setShowMaterialsList(true);
    }
  }, [initialShowMaterialsList, id, setShowMaterialsList]);

  const [showPreWeighingList, setShowPreWeighingList] = useState(initialShowPreWeighingList || false);
  const [preWeighingData, setPreWeighingData] = useState<{ subRecipes: any[], rawMaterials: any[] }>({ subRecipes: [], rawMaterials: [] });
  const [loadingPreWeighing, setLoadingPreWeighing] = useState(false);

  const calculatePreWeighing = useCallback(async () => {
    if (!orderRecipes || orderRecipes.length === 0) return;
    if (!activeCompany?.id) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Empresa ativa não encontrada para calcular pré-pesagem."
      });
      return;
    }
    
    setLoadingPreWeighing(true);
    try {
      // Aqui vamos implementar a lógica de cálculo das sub-receitas e matérias-primas
      const subRecipes = [];
      const rawMaterials = [];
      
      // Processando cada receita do pedido
      for (const orderRecipe of orderRecipes) {
        if (!orderRecipe.recipeId) continue;

        const { recipe: detailedRecipeData, ingredients: recipeComponents } = 
          await getRecipeWithIngredients(orderRecipe.recipeId, activeCompany.id);

        if (!detailedRecipeData) {
          console.warn(`Detalhes não encontrados para a receita ${orderRecipe.recipeName} (ID: ${orderRecipe.recipeId})`);
          continue;
        }

        // CALCULAR O NÚMERO DE BATCHES DA RECEITA PAI (MULTIPLICADOR PARA OS COMPONENTES)
        let parentRecipeBatchMultiplier = 0;
        if (orderRecipe.unit === 'un' && detailedRecipeData.yield_units && detailedRecipeData.yield_units > 0) {
          parentRecipeBatchMultiplier = (orderRecipe.quantity || 0) / detailedRecipeData.yield_units;
        } else if (orderRecipe.unit === 'kg' && detailedRecipeData.yield_kg && detailedRecipeData.yield_kg > 0) {
          parentRecipeBatchMultiplier = (orderRecipe.quantity || 0) / detailedRecipeData.yield_kg;
        } else {
          // Se não for possível calcular por batch (ex: pedido em KG mas receita só tem rendimento em UN, ou vice-versa, ou sem rendimento)
          // Neste caso, precisamos decidir a estratégia. Por ora, vamos logar um aviso e usar 1 para não quebrar,
          // mas isso implica que a quantidade do componente é para a quantidade total do pedido.
          // O ideal é que os cadastros permitam sempre o cálculo de batch.
          parentRecipeBatchMultiplier = (orderRecipe.quantity || 0); // Ou 1 se os componentes já são para a quantidade total?
          console.warn(`Não foi possível determinar o multiplicador de batch adequado para ${detailedRecipeData.name} (pedido: ${orderRecipe.quantity} ${orderRecipe.unit}, rendimento receita: ${detailedRecipeData.yield_kg} kg / ${detailedRecipeData.yield_units} un). Multiplicador usado: ${parentRecipeBatchMultiplier}. Verifique o cadastro da receita e a lógica de fallback.`);
        }
        
        if (parentRecipeBatchMultiplier === 0 && (orderRecipe.quantity || 0) > 0) {
            console.warn(`Multiplicador de batch resultou em 0 para ${detailedRecipeData.name} com quantidade de pedido > 0. Isso pode levar a cálculos zerados. Quantidade Pedido: ${orderRecipe.quantity}, Unidade Pedido: ${orderRecipe.unit}, Rendimento Receita KG: ${detailedRecipeData.yield_kg}, Rendimento Receita UN: ${detailedRecipeData.yield_units}`);
            // Decide se quer usar 1 como fallback para evitar que tudo seja zero, ou manter 0 se isso for um erro que precisa ser evidente.
            // Se os componentes são para 1 batch, e o batch multiplier é 0, então neededAmount será 0.
            // Se orderRecipe.quantity é > 0, isso indica um problema no cálculo do multiplicador ou nos dados de rendimento.
        }

        // Transformar recipeComponents para o formato esperado
        const currentRecipeSubRecipes = [];
        const currentRecipeRawIngredients = [];

        for (const component of recipeComponents) {
          if (component.is_sub_recipe && component.sub_recipe) {
            currentRecipeSubRecipes.push({
              id: component.sub_recipe_id || component.sub_recipe.id, // ID da sub-receita em si
              name: component.sub_recipe.name,
              // 'yield' é o rendimento DA SUB-RECEITA (quanto 1 unidade/batch dela produz)
              // Usaremos yield_kg por padrão, mas isso pode precisar de ajuste se a unidade da sub-receita for 'un'
              yield: component.sub_recipe.yield_kg, 
              amount: component.quantity, // Quantidade DESTA sub-receita USADA na receita PAI
              unit: component.unit
            });
          } else if (!component.is_sub_recipe && component.product) {
            currentRecipeRawIngredients.push({
              id: component.product_id || component.product.id, // ID do produto (matéria-prima)
              name: component.product.name,
              amount: component.quantity, // Quantidade DESTA matéria-prima USADA na receita PAI
              unit: component.unit,
              type: 'raw'
            });
          }
        }


        // Processando sub-receitas da receita atual do pedido
        if (currentRecipeSubRecipes.length > 0) {
          for (const subRecipe of currentRecipeSubRecipes) {
            const neededAmount = subRecipe.amount * parentRecipeBatchMultiplier;
            subRecipes.push({
              id: `${detailedRecipeData.id}-${subRecipe.id}`,
              name: subRecipe.name,
              standardYield: subRecipe.yield,
              neededAmount,
              recipeCount: neededAmount / subRecipe.yield,
              unit: subRecipe.unit
            });
          }
        }

        // Processando matérias-primas diretas da receita atual do pedido
        if (currentRecipeRawIngredients.length > 0) {
          for (const ingredient of currentRecipeRawIngredients) {
            if (ingredient.type === 'raw') {
              const amount = ingredient.amount * parentRecipeBatchMultiplier;
              const existingMaterial = rawMaterials.find(m => m.id === ingredient.id);
              
              if (existingMaterial) {
                existingMaterial.totalAmount += amount;
              } else {
                rawMaterials.push({
                  id: ingredient.id,
                  name: ingredient.name,
                  totalAmount: amount,
                  unit: ingredient.unit
                });
              }
            }
          }
        }
      }

      setPreWeighingData({ subRecipes, rawMaterials });
      setShowPreWeighingList(true);
    } catch (error) {
      console.error('Error calculating pre-weighing:', error);
      toast({
        variant: "destructive",
        title: "Erro ao calcular lista de pré-pesagem"
      });
    } finally {
      setLoadingPreWeighing(false);
    }
  }, [orderRecipes, recipes]);
  
  // Efeito para abrir automaticamente as listas quando solicitado via props
  // Usando uma ref para controlar se já executamos este efeito
  const initialRenderRef = useRef({
    materialsList: false,
    preWeighingList: false
  });
  
  useEffect(() => {
    // Só executa na primeira renderização para evitar loops infinitos
    if (initialShowMaterialsList && id && !initialRenderRef.current.materialsList) {
      initialRenderRef.current.materialsList = true;
      openMaterialsList();
    }
    
    if (initialShowPreWeighingList && id && !initialRenderRef.current.preWeighingList) {
      initialRenderRef.current.preWeighingList = true;
      calculatePreWeighing();
    }
  }, [initialShowMaterialsList, initialShowPreWeighingList, id]);

  return (
    <div className="animate-fade-in">
      <OrderHeader 
        isEditing={isEditing}
        orderOrigin={orderOrigin}
        loading={loading}
        title={isEditing ? 'Detalhes do Pedido' : 'Novo Pedido de Produção'}
        subtitle={isEditing 
          ? 'Visualize ou edite os detalhes do pedido' 
          : 'Crie um novo pedido para a produção'
        }
      />
      
      {loading && (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-bakery-amber" />
        </div>
      )}
      
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <OrderInfoForm 
              orderNumber={orderNumber}
              orderDate={orderDate}
              setOrderNumber={setOrderNumber}
              setOrderDate={setOrderDate}
              isViewOnly={isViewOnly}
            />
            
            <RecipeManager 
              recipes={recipes}
              orderRecipes={orderRecipes}
              setOrderRecipes={setOrderRecipes}
              isViewOnly={isViewOnly}
              onOpenMaterialsList={openMaterialsList}
              onOpenPreWeighingList={calculatePreWeighing}
            />
          </div>
          
          <div>
            <StatusManager 
              isEditing={isEditing}
              orderStatus={orderStatus}
              isViewOnly={isViewOnly}
              loading={loading}
              orderRecipes={orderRecipes}
              onOpenMaterialsList={openMaterialsList}
              onOpenPreWeighingList={calculatePreWeighing}
              onSave={handleSave}
              onStatusUpdate={handleStatusUpdate}
              navigateToConfirmation={() => navigate(`/production-confirmation/${id}`)}
            />
          </div>
        </div>
      )}
      
      {/* Lista de Materiais */}
      <MaterialsCalculator 
        showMaterialsList={showMaterialsList}
        setShowMaterialsList={setShowMaterialsList}
        materials={materials}
        loadingMaterials={loadingMaterials}
      />
      
      {/* Lista de Pré-Pesagem */}
      <PreWeighingCalculator 
        showPreWeighingList={showPreWeighingList}
        setShowPreWeighingList={setShowPreWeighingList}
        subRecipes={preWeighingData.subRecipes}
        rawMaterials={preWeighingData.rawMaterials}
        loadingPreWeighing={loadingPreWeighing}
      />
    </div>
  );
}
