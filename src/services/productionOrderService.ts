import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

export type OrderStatus = 'pending' | 'in_progress' | 'completed';

export interface ProductionOrder {
  id: string;
  order_number: string;
  date: string;
  status: OrderStatus;
  created_at: string;
  adjust_materials?: boolean;
}

export interface ProductionOrderItem {
  id: string;
  order_id: string;
  recipe_id: string | null;
  recipe_name: string;
  planned_quantity_kg: number;
  planned_quantity_units: number | null;
  actual_quantity_kg: number | null;
  actual_quantity_units: number | null;
  unit: string;
}

export interface ProductionOrderWithItems extends ProductionOrder {
  items: ProductionOrderItem[];
}

export async function getProductionOrders(companyId: string): Promise<ProductionOrderWithItems[]> {
  try {
    const { data, error } = await supabase
      .from('production_orders')
      .select(`
        *,
        items:production_order_items(*)
      `)
      .eq('company_id', companyId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    // Cast the results to ensure proper typing
    const typedData = data?.map(order => ({
      ...order,
      status: order.status as OrderStatus,
    })) || [];
    
    return typedData as ProductionOrderWithItems[];
  } catch (error) {
    console.error("Error fetching production orders:", error);
    toast.error("Erro ao carregar pedidos de produção");
    return [];
  }
}

export async function getProductionOrder(id: string, companyId: string): Promise<ProductionOrderWithItems | null> {
  try {
    const { data, error } = await supabase
      .from('production_orders')
      .select(`
        *,
        items:production_order_items(*)
      `)
      .eq('id', id)
      .eq('company_id', companyId)
      .single();
    
    if (error) throw error;
    
    // Cast the result to ensure proper typing
    return data ? {
      ...data,
      status: data.status as OrderStatus
    } as ProductionOrderWithItems : null;
  } catch (error) {
    console.error("Error fetching production order:", error);
    toast.error("Erro ao carregar pedido de produção");
    return null;
  }
}

export async function getPendingProductionOrders(companyId: string): Promise<ProductionOrderWithItems[]> {
  try {
    const { data, error } = await supabase
      .from('production_orders')
      .select(`
        *,
        items:production_order_items(*)
      `)
      .eq('company_id', companyId)
      .in('status', ['pending', 'in_progress'])
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    // Cast the results to ensure proper typing
    const typedData = data?.map(order => ({
      ...order,
      status: order.status as OrderStatus
    })) || [];
    
    return typedData as ProductionOrderWithItems[];
  } catch (error) {
    console.error("Error fetching pending production orders:", error);
    toast.error("Erro ao carregar pedidos pendentes");
    return [];
  }
}

export async function createProductionOrder(
  order: Omit<ProductionOrder, 'id' | 'created_at'> & { companyId: string },
  items: (Omit<ProductionOrderItem, 'id' | 'order_id'> & { companyId?: string })[]
): Promise<ProductionOrderWithItems | null> {
  try {
    // Create production order
    const { companyId, ...orderRest } = order;
    const { data: orderData, error: orderError } = await supabase
      .from('production_orders')
      .insert([{ ...orderRest, company_id: companyId }])
      .select()
      .single();
    
    if (orderError) throw orderError;
    
    if (orderData && items.length > 0) {
      // Add items
      const itemsWithOrderId = items.map(item => ({
        ...item,
        order_id: orderData.id,
        company_id: companyId
      }));
      
      const { error: itemsError } = await supabase
        .from('production_order_items')
        .insert(itemsWithOrderId);
      
      if (itemsError) throw itemsError;
    }
    
    // Get full order with items
    const { data: fullOrder, error: fullOrderError } = await supabase
      .from('production_orders')
      .select(`
        *,
        items:production_order_items(*)
      `)
      .eq('id', orderData?.id)
      .eq('company_id', companyId)
      .single();
    
    if (fullOrderError) throw fullOrderError;
    
    toast.success("Pedido de produção criado com sucesso");
    
    // Cast the result to ensure proper typing
    return fullOrder ? {
      ...fullOrder,
      status: fullOrder.status as OrderStatus
    } as ProductionOrderWithItems : null;
  } catch (error) {
    console.error("Error creating production order:", error);
    toast.error("Erro ao criar pedido de produção");
    return null;
  }
}

export async function createProductionOrderFromCalendar(
  date: string,
  items: Array<{
    recipe_id: string | null;
    recipe_name: string;
    planned_quantity_kg: number;
    planned_quantity_units: number | null;
    unit: string;
  }>,
  companyId: string
): Promise<ProductionOrderWithItems | null> {
  try {
    // Gera número do pedido usando a data
    const orderNumber = `P${date.replace(/[^0-9]/g, '')}-${String(new Date().getTime()).slice(-3)}`;
    
    // Cria o pedido base
    const { data: orderData, error: orderError } = await supabase
      .from('production_orders')
      .insert([{
        order_number: orderNumber,
        date: date,
        status: 'pending' as OrderStatus,
        adjust_materials: true,
        company_id: companyId // multi-empresa
      }])
      .select()
      .single();
    
    if (orderError) throw orderError;
    
    if (orderData && items.length > 0) {
      // Prepara os itens do pedido
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        recipe_id: item.recipe_id,
        recipe_name: item.recipe_name,
        planned_quantity_kg: item.unit === 'kg' ? item.planned_quantity_kg : 0,
        planned_quantity_units: item.unit === 'un' ? item.planned_quantity_units : null,
        actual_quantity_kg: null,
        actual_quantity_units: null,
        unit: item.unit,
        company_id: companyId // multi-empresa
      }));
      
      // Insere os itens
      const { error: itemsError } = await supabase
        .from('production_order_items')
        .insert(orderItems);
      
      if (itemsError) throw itemsError;
    }
    
    // Busca o pedido completo com os itens
    const { data: fullOrder, error: fullOrderError } = await supabase
      .from('production_orders')
      .select(`
        *,
        items:production_order_items(*)
      `)
      .eq('id', orderData.id)
      .eq('company_id', companyId)
      .single();
    
    if (fullOrderError) throw fullOrderError;
    
    toast.success("Pedido de produção criado com sucesso a partir do calendário");
    
    return fullOrder ? {
      ...fullOrder,
      status: fullOrder.status as OrderStatus,
      items: fullOrder.items || []
    } as ProductionOrderWithItems : null;
  } catch (error) {
    console.error("Erro ao criar pedido a partir do calendário:", error);
    toast.error("Erro ao criar pedido de produção");
    return null;
  }
}

export async function updateProductionOrderStatus(id: string, status: OrderStatus, companyId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('production_orders')
      .update({ status })
      .eq('id', id)
      .eq('company_id', companyId);
    
    if (error) throw error;
    
    toast.success(`Status do pedido atualizado para: ${
      status === 'pending' ? 'Pendente' : 
      status === 'in_progress' ? 'Em Produção' : 
      'Concluído'
    }`);
    return true;
  } catch (error) {
    console.error("Error updating production order status:", error);
    toast.error("Erro ao atualizar status do pedido");
    return false;
  }
}

export async function confirmProductionOrder(
  id: string,
  items: ProductionOrderItem[],
  companyId: string,
  notes: string | null = null
): Promise<boolean> {
  try {
    // Update order status
    const { error: statusError } = await supabase
      .from('production_orders')
      .update({ status: 'completed' as OrderStatus })
      .eq('id', id)
      .eq('company_id', companyId);
    
    if (statusError) throw statusError;
    
    // Update items with actual quantities
    for (const item of items) {
      const { error: itemError } = await supabase
        .from('production_order_items')
        .update({
          actual_quantity_kg: item.actual_quantity_kg,
          actual_quantity_units: item.actual_quantity_units
        })
        .eq('id', item.id)
        .eq('company_id', companyId);
      
      if (itemError) throw itemError;
    }
    
    toast.success("Produção confirmada com sucesso");
    return true;
  } catch (error) {
    console.error("Error confirming production order:", error);
    toast.error("Erro ao confirmar produção");
    return false;
  }
}

export async function deleteProductionOrder(id: string, companyId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('production_orders')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);
    
    if (error) throw error;
    
    toast.success("Pedido de produção excluído com sucesso");
    return true;
  } catch (error) {
    console.error("Error deleting production order:", error);
    toast.error("Erro ao excluir pedido de produção");
    return false;
  }
}

// Interfaces para os resultados das funções do Supabase
export interface OrderRecipe {
  recipeId: string;
  recipeName: string;
  quantity: number;
  unit: string;
  total_quantity: number;
  unit_cost: number;
  total_cost: number;
  supplier?: string;
  current_stock?: number;
  min_stock?: number;
}

export interface PreWeighingItem {
  recipe_id: string;
  recipe_name: string;
  product_id: string;
  product_name: string;
  product_unit: string;
  total_quantity: number;
  unit_cost?: number;
  total_cost?: number;
  supplier?: string;
  current_stock?: number;
  min_stock?: number;
  unit: string;
  batch_multiplier: number;
  parent_recipe_name: string;
  is_sub_recipe: boolean;
  pattern_count: number;
}

export interface MaterialItem {
  product_id: string;
  product_name: string;
  product_unit: string;
  total_quantity: number;
  unit_cost?: number;
  total_cost?: number;
  supplier?: string;
  current_stock?: number;
  min_stock?: number;
}

/**
 * Calcula a lista de materiais usando Edge Function
 */
export async function calculateMaterialsList(
  companyId: string,
  orderRecipes: OrderRecipe[]
): Promise<MaterialItem[]> {
  try {
    console.log('calculateMaterialsList - Calling Edge Function with:', {
      companyId,
      orderRecipes
    });

    // Call the Edge Function instead of RPC
    const { data, error } = await supabase.functions.invoke('calculate-materials', {
      body: {
        companyId,
        orderRecipes
      }
    });

    if (error) {
      console.error('Error calling calculate-materials Edge Function:', error);
      throw error;
    }

    console.log('calculateMaterialsList - Edge Function returned:', data);
    return data || [];
  } catch (error) {
    console.error("Error calculating materials list:", error);
    toast.error("Erro ao calcular lista de materiais");
    return [];
  }
}

/**
 * Calcula a lista de pré-pesagem usando Edge Function
 */
export async function calculatePreWeighingList(
  companyId: string,
  orderRecipes: OrderRecipe[]
): Promise<PreWeighingItem[]> {
  try {
    console.log('calculatePreWeighingList - Calling Edge Function with:', {
      companyId,
      orderRecipes
    });

    // Call the Edge Function instead of RPC
    const { data, error } = await supabase.functions.invoke('calculate-preweighing', {
      body: {
        companyId,
        orderRecipes
      }
    });

    if (error) {
      console.error('Error calling calculate-preweighing Edge Function:', error);
      throw error;
    }

    console.log('calculatePreWeighingList - Edge Function returned:', data);
    return data || [];
  } catch (error) {
    console.error("Error calculating pre-weighing list:", error);
    toast.error("Erro ao calcular lista de pré-pesagem");
    return [];
  }
}
