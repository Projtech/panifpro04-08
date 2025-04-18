
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
  calendarItems?: Array<{
    recipe_id: string | null;
    recipe_name: string;
    planned_quantity_kg: number;
    planned_quantity_units: number | null;
    unit: string;
  }>;
  calendarDate?: string;
}

export default function ProductionOrderForm() {
  const { id } = useParams();
  const location = useLocation();
  const state = location.state as LocationState;
  const navigate = useNavigate();
  
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
