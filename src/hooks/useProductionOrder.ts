import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from "react-router-dom";
import { 
  getProductionOrders, 
  createProductionOrder, 
  updateProductionOrderStatus,
  getProductionOrder,
  ProductionOrderItem 
} from "@/services/productionOrderService";
import { getAllRecipeIngredients, getRecipes, getRecipeWithIngredients, Recipe as ServiceRecipe } from "@/services/recipeService";
import { useAuth } from '@/contexts/AuthContext';
import { calculateMaterialsList, calculatePreWeighingList, type OrderRecipe as ServiceOrderRecipe, type MaterialItem as ServiceMaterialItem } from '@/services/productionOrderService';

export interface Recipe extends ServiceRecipe {
  // Usar a interface do serviço como base
}

export interface OrderRecipe {
  id: string;
  recipeId: string;
  recipeName: string;
  quantity: number;
  unit: 'kg' | 'un';
  convertedQuantity: number;
}

export interface MaterialItem {
  id: number;
  name: string;
  totalQuantity: number;
  unit: string;
}

export default function useProductionOrder({ id, calendarItems, calendarDate }: { id?: string; calendarItems?: Array<{ recipe_id: string | null; recipe_name: string; planned_quantity_kg: number; planned_quantity_units: number | null; unit: string }>; calendarDate?: string } = {}) {
  const { activeCompany, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  
  const [orderNumber, setOrderNumber] = useState(`P${String(new Date().getTime()).slice(-3)}`);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderStatus, setOrderStatus] = useState<'pending' | 'in_progress' | 'completed'>('pending');
  const [orderRecipes, setOrderRecipes] = useState<OrderRecipe[]>([]);
  const [showMaterialsList, setShowMaterialsList] = useState(false);
  const [orderOrigin, setOrderOrigin] = useState<'manual' | 'calendar'>('manual');
  
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  
  const navigate = useNavigate();
  
  useEffect(() => {
    const loadRecipes = async () => {
      if (authLoading || !activeCompany?.id) {
        return; // Aguarda empresa ativa carregar
      }

      setLoading(true);
      const recipesData = await getRecipes(activeCompany.id);
      setRecipes(recipesData);

      // If we have an ID, load the production order
      if (id) {
        await loadProductionOrder(id);
      }

      setLoading(false);
    };

    loadRecipes();
  }, [id, activeCompany?.id, authLoading]);
  
  useEffect(() => {
    // Detect if navigation came from calendar
    if (calendarItems && calendarItems.length > 0) {
      setOrderOrigin('calendar');
      
      if (calendarDate) {
        setOrderDate(calendarDate);
      }
      
      // Load products from calendar only if recipes are already loaded
      if (recipes.length > 0) {
        const calendarRecipes: OrderRecipe[] = calendarItems.map(item => {
          const recipe = recipes.find(r => r.id === item.recipe_id);
          let convertedQuantity = calculateConvertedQuantity(item, recipe);
          
          return {
            id: `cal-recipe-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            recipeId: item.recipe_id,
            recipeName: item.recipe_name,
            quantity: item.unit === 'kg' ? item.planned_quantity_kg : (item.planned_quantity_units || 0),
            unit: item.unit as 'kg' | 'un',
            convertedQuantity,
            fromCalendar: true
          };
        });
        
        setOrderRecipes(calendarRecipes);
      }
    }
  }, [calendarItems, calendarDate, recipes]);
  
  const loadProductionOrder = async (orderId: string) => {
    if (!activeCompany?.id) return; // Adiciona verificação
    try {
      // Passar companyId como segundo argumento
      const order = await getProductionOrder(orderId, activeCompany.id); 
      
      if (order) {
        setOrderNumber(order.order_number);
        setOrderDate(order.date);
        setOrderStatus(order.status);
        setOrderOrigin(order.adjust_materials ? 'calendar' : 'manual');
        
        const orderItems: OrderRecipe[] = order.items.map(item => {
          const recipe = recipes.find(r => r.id === item.recipe_id);
          const isKg = item.unit === 'kg';
          
          return {
            id: item.id,
            recipeId: item.recipe_id,
            recipeName: item.recipe_name,
            quantity: isKg ? item.planned_quantity_kg : (item.planned_quantity_units || 0),
            unit: item.unit as 'kg' | 'un',
            convertedQuantity: isKg 
              ? (item.planned_quantity_units || 0) 
              : item.planned_quantity_kg,
            fromCalendar: order.adjust_materials
          };
        });
        
        setOrderRecipes(orderItems);
      }
    } catch (error) {
      console.error("Erro ao carregar pedido de produção:", error);
      toast.error("Erro ao carregar pedido de produção");
    }
  };
  
  // Helper function to calculate converted quantity
  const calculateConvertedQuantity = (item: any, recipe?: Recipe) => {
    if (!recipe) return 0;

    return item.unit === 'kg' 
      ? (recipe.yield_units && recipe.yield_units > 0) 
        ? item.planned_quantity_kg * (recipe.yield_units / recipe.yield_kg) 
        : 0
      : item.planned_quantity_units 
        ? item.planned_quantity_units * (recipe.yield_kg / (recipe.yield_units || 1))
        : 0;
  };
  
  const calculateMaterials = async () => {
    console.log('calculateMaterials started');
    setLoadingMaterials(true);
    
    if (!activeCompany?.id) {
      console.log('No activeCompany.id found, returning early');
      setLoadingMaterials(false);
      return;
    }

    console.log('activeCompany.id:', activeCompany.id);
    console.log('orderRecipes to process:', orderRecipes);

    try {
      // Converter orderRecipes para o formato esperado pela função do Supabase
      const orderRecipesFormatted: ServiceOrderRecipe[] = orderRecipes.map(orderRecipe => {
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

      console.log('Calling calculateMaterialsList with formatted data:', orderRecipesFormatted);

      // Chamar a função do Supabase
      const materialsData = await calculateMaterialsList(activeCompany.id, orderRecipesFormatted);
      
      console.log('calculateMaterialsList returned:', materialsData);

      // Converter para o formato esperado pelo componente
      const materialsMap = new Map<string, MaterialItem>();
      let materialId = 1;

      materialsData.forEach((material) => {
        const key = material.product_id;
        materialsMap.set(key, {
          id: materialId++,
          name: material.product_name,
          totalQuantity: material.total_quantity,
          unit: material.product_unit, // Usando product_unit em vez de unit
        });
      });

      setMaterials(Array.from(materialsMap.values()));
      console.log('Materials calculated successfully:', Array.from(materialsMap.values()));
    } catch (error) {
      console.error('Error in calculateMaterials:', error);
      setMaterials([]);
    } finally {
      setLoadingMaterials(false);
    }
  };
  
  const openMaterialsList = async () => {
    console.log('openMaterialsList called with orderRecipes:', orderRecipes);
    console.log('orderRecipes length:', orderRecipes.length);
    
    if (orderRecipes.length === 0) {
      console.log('No orderRecipes found, showing toast');
      toast.error("Sem receitas");
      return;
    }
    
    await calculateMaterials();
    setShowMaterialsList(true);
  };
  
  const handleSave = async () => {
    if (orderRecipes.length === 0) {
      toast.error("Receitas obrigatórias");
      return;
    }
    
    setLoading(true);
    
    try {
      let success;
      
      const items = orderRecipes.map(recipe => ({
        recipe_id: recipe.recipeId,
        recipe_name: recipe.recipeName,
        planned_quantity_kg: recipe.unit === 'kg' ? recipe.quantity : recipe.convertedQuantity,
        planned_quantity_units: recipe.unit === 'un' ? Math.round(recipe.quantity) : Math.round(recipe.convertedQuantity),
        actual_quantity_kg: null,
        actual_quantity_units: null,
        unit: recipe.unit
      }));
      
      if (id) {
        // ATENÇÃO: Não há função de serviço para atualizar detalhes gerais do pedido.
        // Apenas o status pode ser atualizado via handleStatusUpdate.
        // Se precisar editar detalhes, uma nova função 'updateProductionOrder' seria necessária no serviço.
        // Por agora, a edição de detalhes não será salva.
        toast.error("Edição não suportada");
        success = false; // Define success como false para não redirecionar
      } else {
        // Criação (objeto precisa de companyId)
        success = await createProductionOrder(
          {
            order_number: orderNumber,
            date: orderDate,
            status: 'pending', // Status inicial na criação
            adjust_materials: orderOrigin === 'calendar',
            companyId: activeCompany.id, // Adicionar companyId aqui
          },
          items
        );
      }
      
      if (success) {
        navigate('/production-orders');
      }
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
      toast.error("Erro ao salvar pedido de produção");
    } finally {
      setLoading(false);
    }
  };
  
  const handleStatusUpdate = async (newStatus: 'pending' | 'in_progress' | 'completed') => {
    if (!id || !activeCompany?.id) return; // Adiciona verificação
    
    setLoading(true);
    try {
      // Passar companyId como terceiro argumento
      const success = await updateProductionOrderStatus(id, newStatus, activeCompany.id);
      if (success) {
        setOrderStatus(newStatus);
        
        if (newStatus === 'completed') {
          navigate(`/production-confirmation/${id}`);
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status do pedido de produção");
    } finally {
      setLoading(false);
    }
  };

  return {
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
    isEditing: !!id,
    isViewOnly: !!id ? orderStatus === 'completed' : false
  };
}
