import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type OrderStatus = 'pending' | 'in_progress' | 'completed';

export interface ProductionOrder {
  id: string;
  order_number: string;
  date: string;
  status: OrderStatus;
  created_at: string;
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

export async function getProductionOrders(): Promise<ProductionOrderWithItems[]> {
  try {
    const { data, error } = await supabase
      .from('production_orders')
      .select(`
        *,
        items:production_order_items(*)
      `)
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

export async function getProductionOrder(id: string): Promise<ProductionOrderWithItems | null> {
  try {
    const { data, error } = await supabase
      .from('production_orders')
      .select(`
        *,
        items:production_order_items(*)
      `)
      .eq('id', id)
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

export async function getPendingProductionOrders(): Promise<ProductionOrderWithItems[]> {
  try {
    const { data, error } = await supabase
      .from('production_orders')
      .select(`
        *,
        items:production_order_items(*)
      `)
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
  order: Omit<ProductionOrder, 'id' | 'created_at'>,
  items: Omit<ProductionOrderItem, 'id' | 'order_id'>[]
): Promise<ProductionOrderWithItems | null> {
  try {
    // Create production order
    const { data: orderData, error: orderError } = await supabase
      .from('production_orders')
      .insert([order])
      .select()
      .single();
    
    if (orderError) throw orderError;
    
    if (orderData && items.length > 0) {
      // Add items
      const itemsWithOrderId = items.map(item => ({
        ...item,
        order_id: orderData.id
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
  }>
): Promise<ProductionOrderWithItems | null> {
  try {
    // Gera número do pedido usando a data
    const orderNumber = `P${date.replace(/[^0-9]/g, '')}-${String(new Date().getTime()).slice(-3)}`;
    
    // Cria o pedido usando a função existente
    const order = await createProductionOrder(
      {
        order_number: orderNumber,
        date: date,
        status: 'pending'
      },
      items.map(item => ({
        recipe_id: item.recipe_id,
        recipe_name: item.recipe_name,
        planned_quantity_kg: item.planned_quantity_kg,
        planned_quantity_units: item.planned_quantity_units,
        actual_quantity_kg: null,
        actual_quantity_units: null,
        unit: item.unit
      }))
    );
    
    if (!order) throw new Error('Erro ao criar pedido de produção');
    
    toast.success("Pedido de produção criado com sucesso a partir do calendário");
    return order;
  } catch (error) {
    console.error("Erro ao criar pedido a partir do calendário:", error);
    toast.error("Erro ao criar pedido de produção");
    return null;
  }
}

export async function updateProductionOrderStatus(id: string, status: OrderStatus): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('production_orders')
      .update({ status })
      .eq('id', id);
    
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
  notes: string | null = null
): Promise<boolean> {
  try {
    // Update order status
    const { error: statusError } = await supabase
      .from('production_orders')
      .update({ status: 'completed' as OrderStatus })
      .eq('id', id);
    
    if (statusError) throw statusError;
    
    // Update items with actual quantities
    for (const item of items) {
      const { error: itemError } = await supabase
        .from('production_order_items')
        .update({
          actual_quantity_kg: item.actual_quantity_kg,
          actual_quantity_units: item.actual_quantity_units
        })
        .eq('id', item.id);
      
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

export async function deleteProductionOrder(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('production_orders')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    toast.success("Pedido de produção excluído com sucesso");
    return true;
  } catch (error) {
    console.error("Error deleting production order:", error);
    toast.error("Erro ao excluir pedido de produção");
    return false;
  }
}
