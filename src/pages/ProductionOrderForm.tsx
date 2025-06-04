import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "@/components/ui/use-toast";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import useProductionOrder, { Recipe } from "@/hooks/useProductionOrder";
import { getRecipeWithIngredients } from "@/services/recipeService";
import { useAuth } from '@/contexts/AuthContext';

// Interface para os itens retornados pela Edge Function de pré-pesagem
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
  product_unit?: string; // Para compatibilidade com o código existente
}

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
      console.log("Mapped orderRecipes:", mapped);
      setOrderRecipes(mapped);
      console.log("setOrderRecipes called with:", mapped);
      
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
  
  console.log("ProductionOrderForm - Current orderRecipes state:", orderRecipes);
  console.log("ProductionOrderForm - orderRecipes length:", orderRecipes?.length);
  
  if (orderRecipes && orderRecipes.length > 0) {
    console.log("ProductionOrderForm - First orderRecipe detailed:", JSON.stringify(orderRecipes[0], null, 2));
  }

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
    console.log('calculatePreWeighing called with orderRecipes:', orderRecipes);
    console.log('orderRecipes length:', orderRecipes?.length);
    
    if (!orderRecipes || orderRecipes.length === 0) {
      console.log('No orderRecipes found, returning early');
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Sem receitas"
      });
      return;
    }
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
      console.log('calculatePreWeighing - Starting processing');
      console.log('activeCompany.id:', activeCompany?.id);
      
      // Converter orderRecipes para o formato esperado pela Edge Function
      const orderRecipesFormatted = orderRecipes.map(orderRecipe => {
        // Usar convertedQuantity quando quantity for 0 ou não estiver definido
        const effectiveQuantity = orderRecipe.quantity > 0 ? orderRecipe.quantity : orderRecipe.convertedQuantity;
        
        console.log(`Receita ${orderRecipe.recipeName}: usando quantidade ${effectiveQuantity} (original: ${orderRecipe.quantity}, convertida: ${orderRecipe.convertedQuantity})`);
        
        return {
          recipeId: orderRecipe.recipeId,
          recipeName: orderRecipe.recipeName,
          quantity: effectiveQuantity, // Usar a quantidade efetiva
          unit: orderRecipe.unit
        };
      });

      console.log('Calling calculatePreWeighingList with formatted data:', orderRecipesFormatted);
      
      // Chamar a Edge Function via serviço
      // Importar a função do serviço
      const { calculatePreWeighingList } = await import('@/services/productionOrderService');
      const preWeighingItems = await calculatePreWeighingList(activeCompany.id, orderRecipesFormatted);
      
      console.log('calculatePreWeighingList returned:', preWeighingItems);
      
      // Processar os dados retornados pela Edge Function
      const subRecipes = [];
      const rawMaterials = [];
      
      // Processar os itens retornados
      for (const item of preWeighingItems) {
        // Adicionar à lista de matérias-primas ou sub-receitas
        rawMaterials.push({
          id: item.product_id,
          name: item.product_name,
          parentRecipe: item.parent_recipe_name || "Receita Principal",
          totalAmount: item.total_quantity,
          unit: item.unit,
          is_sub_recipe: item.is_sub_recipe || false,
          pattern_count: item.pattern_count || 0
        });
        
        // Se for uma sub-receita, também adicionar à lista de sub-receitas para compatibilidade
        if (item.is_sub_recipe) {
          subRecipes.push({
            id: item.recipe_id,
            name: item.product_name,
            standardYield: 1, // Valor padrão
            neededAmount: item.total_quantity,
            recipeCount: item.pattern_count || 1,
            unit: item.unit
          });
        }
      }

      // Ordenar por receita pai, depois sub-receitas primeiro, depois por nome
      rawMaterials.sort((a, b) => {
        // Primeiro ordenar por receita pai
        const parentCompare = (a.parentRecipe || '').localeCompare(b.parentRecipe || '');
        if (parentCompare !== 0) return parentCompare;
        
        // Depois, sub-receitas primeiro
        if (a.is_sub_recipe && !b.is_sub_recipe) return -1;
        if (!a.is_sub_recipe && b.is_sub_recipe) return 1;
        
        // Por fim, ordenar por nome
        return a.name.localeCompare(b.name);
      });

      setPreWeighingData({ subRecipes, rawMaterials });
      setShowPreWeighingList(true);
      
      console.log('Pre-weighing data calculated successfully:', { subRecipes, rawMaterials });
    } catch (error) {
      console.error('Error calculating pre-weighing:', error);
      toast({
        variant: "destructive",
        title: "Erro ao calcular lista de pré-pesagem"
      });
    } finally {
      setLoadingPreWeighing(false);
    }
  }, [orderRecipes, activeCompany?.id]);
  
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
