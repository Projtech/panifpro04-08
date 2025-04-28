
import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import useProductionOrder from "@/hooks/useProductionOrder";

// Components
import OrderHeader from "@/components/ProductionOrder/OrderHeader";
import OrderInfoForm from "@/components/ProductionOrder/OrderInfoForm";
import RecipeManager from "@/components/ProductionOrder/RecipeManager";
import StatusManager from "@/components/ProductionOrder/StatusManager";
import MaterialsCalculator from "@/components/ProductionOrder/MaterialsCalculator";

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

export default function ProductionOrderForm() {
  const { id } = useParams();
  const location = useLocation();
  const state = location.state as LocationState;
  const navigate = useNavigate();

  // Pré-montar receitas se vieram produtos da pré-lista ou do calendário
  useEffect(() => {
    if (state?.produtos && state.produtos.length > 0 && setOrderRecipes) {
      console.log("Produtos recebidos na tela de pedido:", state.produtos);
      
      const mapped = state.produtos.map((prod: any, idx: number) => {
        // Detectar corretamente a origem - calendário ou pré-lista
        const isFromCalendar = 'fromCalendar' in prod && prod.fromCalendar === true;
        
        // Se vier do calendário, usar a estrutura nova com recipe_id
        if (isFromCalendar) {
          return {
            id: `calendar-item-${idx}-${prod.recipeId || Math.random()}`,
            recipeId: prod.recipeId,
            recipeName: prod.recipeName || "Produto sem nome",
            quantity: typeof prod.quantity === 'number' ? prod.quantity : parseFloat(prod.quantity) || 0,
            unit: (prod.unit || "un").toLowerCase(),
            convertedQuantity: 0,
            fromCalendar: true
          };
        } else {
          // Manter o comportamento original para outros tipos de dados
          const isFromPreList = 'product_id' in prod;
          return {
            id: `prelist-item-${idx}-${isFromPreList ? prod.product_id : (prod.recipe_id || prod.id || Math.random())}`,
            recipeId: isFromPreList ? prod.product_id : (prod.recipe_id || null),
            recipeName: isFromPreList ? (prod.product_name || "Produto sem nome") : prod.name,
            quantity: isFromPreList ? prod.quantity : (prod.unit === 'kg' ? (prod.kg_weight || 1) : (prod.unit_weight || 1)),
            unit: isFromPreList ? prod.unit.toLowerCase() : (prod.unit || "kg").toLowerCase(),
            convertedQuantity: 0,
            fromPreList: isFromPreList,
            fromCalendar: !isFromPreList
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

  const {
    loading,
    recipes,
    orderNumber,
    setOrderNumber,
    orderDate,
    setOrderDate,
    orderStatus,
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
              onSave={handleSave}
              onStatusUpdate={handleStatusUpdate}
              navigateToConfirmation={() => navigate(`/production-confirmation/${id}`)}
            />
          </div>
        </div>
      )}
      
      <MaterialsCalculator 
        showMaterialsList={showMaterialsList}
        setShowMaterialsList={setShowMaterialsList}
        materials={materials}
        loadingMaterials={loadingMaterials}
      />
    </div>
  );
}
