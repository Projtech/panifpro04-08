import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { OrderRecipe } from "@/components/ProductionOrder/RecipeManager";
import { 
  createProductionOrder, 
  updateProductionOrderStatus, 
  getProductionOrder, 
  // updateProductionOrder, // REMOVER - Não existe no serviço
  ProductionOrderItem 
} from "@/services/productionOrderService";
import { getAllRecipeIngredients, getRecipes } from "@/services/recipeService";
import { useAuth } from '@/contexts/AuthContext';
import { MaterialItem } from "@/components/ProductionOrder/MaterialsCalculator";

export interface Recipe {
  id: string;
  name: string;
  code: string;
  yield_kg: number;
  yield_units: number;
  instructions: string;
  photo_url: string;
  gif_url: string;
  cost_per_kg: number;
  cost_per_unit: number;
  group_id: string;
  subgroup_id: string;
  all_days: boolean;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  subRecipes?: {
    id: string;
    name: string;
    yield: number;
    amount: number;
    unit: string;
  }[];
  ingredients?: {
    id: number;
    name: string;
    amount: number;
    unit: string;
    type: 'raw' | 'sub';
  }[];
}

interface UseProductionOrderProps {
  id?: string;
  calendarItems?: Array<{
    recipe_id: string | null;
    recipe_name: string;
    planned_quantity_kg: number;
    planned_quantity_units: number | null;
    unit: string;
  }>;
  calendarDate?: string;
}

export default function useProductionOrder({ id, calendarItems, calendarDate }: UseProductionOrderProps = {}) {
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
  const { toast } = useToast();
  
  useEffect(() => {
    const loadRecipes = async () => {
      if (authLoading || !activeCompany?.id) {
        toast({
          title: 'Empresa ativa não carregada',
          description: 'Tente novamente mais tarde.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
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
  }, [id]);
  
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
      console.error("Error loading production order:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o pedido de produção.",
        variant: "destructive"
      });
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
    setLoadingMaterials(true);
    const materialsMap = new Map<string, MaterialItem>();
    let materialId = 1;
    
    if (!activeCompany?.id) return; // Adiciona verificação

    try {
      for (const orderRecipe of orderRecipes) {
        const recipe = recipes.find(r => r.id === orderRecipe.recipeId);
        
        if (recipe) {
          console.log(`Calculando materiais para ${recipe.name} (${orderRecipe.quantity} ${orderRecipe.unit})`);
          
          let quantityInKg = orderRecipe.quantity;
          if (orderRecipe.unit === 'un' && recipe.yield_units && recipe.yield_units > 0) {
            quantityInKg = orderRecipe.quantity * (recipe.yield_kg / recipe.yield_units);
          }
          
          // Garantir que companyId (activeCompany.id) está sendo passado
          const ingredients = await getAllRecipeIngredients(recipe.id, activeCompany.id, quantityInKg);
          
          for (const ingredient of ingredients) {
            if (ingredient.product_id && ingredient.product) {
              const key = `${ingredient.product_id}-${ingredient.unit}`;
              
              if (materialsMap.has(key)) {
                const existingMaterial = materialsMap.get(key)!;
                existingMaterial.totalQuantity += ingredient.quantity;
              } else {
                materialsMap.set(key, {
                  id: materialId++,
                  name: ingredient.product.name,
                  totalQuantity: ingredient.quantity,
                  unit: ingredient.unit
                });
              }
            }
          }
        }
      }
      
      const materialsList = Array.from(materialsMap.values())
        .sort((a, b) => a.name.localeCompare(b.name));
      
      setMaterials(materialsList);
    } catch (error) {
      console.error("Erro ao calcular lista de materiais:", error);
      toast({
        title: "Erro",
        description: "Não foi possível calcular a lista de materiais.",
        variant: "destructive"
      });
    } finally {
      setLoadingMaterials(false);
    }
  };
  
  const openMaterialsList = async () => {
    if (orderRecipes.length === 0) {
      toast({
        title: "Sem receitas",
        description: "Adicione receitas ao pedido para visualizar a lista de materiais.",
        variant: "destructive"
      });
      return;
    }
    
    await calculateMaterials();
    setShowMaterialsList(true);
  };
  
  const handleSave = async () => {
    if (orderRecipes.length === 0) {
      toast({
        title: "Receitas obrigatórias",
        description: "Adicione pelo menos uma receita ao pedido.",
        variant: "destructive"
      });
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
        toast({
          title: "Edição não suportada",
          description: "Apenas a criação de novos pedidos e a atualização de status são suportadas no momento.",
          variant: "default" // Mudar para 'default' ou 'destructive'
        });
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
      toast({
        title: "Erro",
        description: "Não foi possível salvar o pedido de produção.",
        variant: "destructive"
      });
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
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do pedido de produção.",
        variant: "destructive"
      });
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
