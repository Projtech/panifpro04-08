
import { useState, useEffect } from "react";
import { getProductInventory } from "@/services/inventoryService";
import { getRecipes } from "@/services/recipeService";
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getProductionOrders } from "@/services/productionOrderService";

interface DashboardStats {
  totalProducts: number;
  lowStockItems: number;
  recipes: number;
  pendingOrders: number;
  completedOrders: number;
}

interface ActivityItem {
  id: string | number;
  type: string;
  description: string;
  time: string;
}

export function useDashboardData() {
  const { activeCompany, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStockItems: 0,
    recipes: 0,
    pendingOrders: 0,
    completedOrders: 0
  });

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([
    { id: 1, type: 'estoque', description: 'Carregando atividades recentes...', time: '-' }
  ]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (authLoading || !activeCompany?.id) {
        toast.error('Empresa ativa não carregada. Tente novamente mais tarde.');
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Get inventory data
        const inventory = await getProductInventory(activeCompany.id);
        
        // Count low stock items
        const lowStockItems = inventory.filter(item => item.current_stock < item.min_stock);
        
        // Get recipes
        const recipes = await getRecipes(activeCompany.id);
        
        // Get production orders
        const productionOrders = await getProductionOrders(activeCompany.id);
        
        // Count pending and completed orders
        const pendingOrders = productionOrders.filter(order => order.status === 'pending');
        const completedOrders = productionOrders.filter(order => 
          order.status === 'completed' && 
          new Date(order.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        );
        
        // Set dashboard statistics
        setDashboardStats({
          totalProducts: inventory.length,
          lowStockItems: lowStockItems.length,
          recipes: recipes.length,
          pendingOrders: pendingOrders.length,
          completedOrders: completedOrders.length
        });
        
        // Fetch recent activities
        const activities: ActivityItem[] = [];
        
        // Add recent low stock items
        lowStockItems.slice(0, 2).forEach((item, index) => {
          activities.push({
            id: `stock-${index}`,
            type: 'estoque',
            description: `Estoque baixo: ${item.product_name} (${item.current_stock} ${item.unit})`,
            time: 'Agora'
          });
        });
        
        // Add recent orders
        pendingOrders.slice(0, 2).forEach((order, index) => {
          activities.push({
            id: `order-${index}`,
            type: 'produção',
            description: `Pedido #${order.order_number} pendente`,
            time: new Date(order.date).toLocaleDateString('pt-BR')
          });
        });
        
        // Add recent recipes if any were created recently
        recipes.slice(0, 2).forEach((recipe, index) => {
          activities.push({
            id: `recipe-${index}`,
            type: 'receita',
            description: `Receita: ${recipe.name}`,
            time: 'Recente'
          });
        });
        
        // Sort by more "recent" first
        if (activities.length > 0) {
          setRecentActivity(activities);
        }
        
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [activeCompany?.id, authLoading]);

  return { loading, dashboardStats, recentActivity };
}
