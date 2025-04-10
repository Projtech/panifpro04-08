
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  DatabaseTransactionType, 
  InventoryTransaction, 
  InventoryTransactionWithProduct, 
  TransactionType, 
  toAppTransactionType,
  toDbTransactionType
} from "./inventoryTypes";

export async function getInventoryTransactions(): Promise<InventoryTransactionWithProduct[]> {
  console.log("Fetching all inventory transactions...");
  try {
    const { data, error } = await supabase
      .from('inventory_transactions')
      .select('*, product:products(*)')
      .order('date', { ascending: false }) // Sort by date descending (newest first)
      .order('created_at', { ascending: false }); // Secondary sorting by creation timestamp
    
    if (error) throw error;
    
    console.log(`Successfully fetched ${data?.length || 0} inventory transactions`);
    // Cast the types to match our interface
    return (data || []) as unknown as InventoryTransactionWithProduct[];
  } catch (error) {
    console.error("Error fetching inventory transactions:", error);
    toast.error("Erro ao carregar movimentações de estoque");
    return [];
  }
}

// Updated function signature to be clear about what type parameters we accept
export async function addInventoryTransaction(
  transaction: {
    product_id: string;
    quantity: number;
    date: string;
    cost: number | null;
    type: TransactionType; // Accept only app's TransactionType
    invoice: string | null;
    notes: string | null;
    reason: string | null;
    production_order_id: string | null;
  }
): Promise<InventoryTransaction | null> {
  try {
    console.log("[INVENTORY] Adding transaction:", JSON.stringify({
      product_id: transaction.product_id,
      quantity: transaction.quantity,
      type: transaction.type,
      reason: transaction.reason,
      production_order_id: transaction.production_order_id
    }, null, 2));
    
    // Always convert to database format ('entrada'/'saida')
    const dbTransaction = {
      ...transaction,
      type: toDbTransactionType(transaction.type) // Always convert to DB type
    };
    
    // Insert transaction
    const { data, error } = await supabase
      .from('inventory_transactions')
      .insert([dbTransaction])
      .select();
    
    if (error) {
      console.error("[INVENTORY] Error inserting transaction:", error);
      throw error;
    }
    
    console.log("[INVENTORY] Transaction inserted successfully:", data?.[0]?.id);
    
    // Get current product to update stock
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, current_stock, cost, unit')
      .eq('id', transaction.product_id)
      .single();
    
    if (productError) {
      console.error("[INVENTORY] Error fetching product:", productError);
      throw productError;
    }
    
    console.log(`[INVENTORY] Current product data: ${product?.name} (ID: ${product?.id}), current stock: ${product?.current_stock} ${product?.unit}`);
    
    // No conversion needed since we're using the TransactionType directly
    const appTransactionType = transaction.type;

    // Calculate new stock level
    const currentStock = product?.current_stock || 0;
    const newStock = appTransactionType === 'in' 
      ? currentStock + transaction.quantity
      : currentStock - transaction.quantity;
    
    console.log(`[INVENTORY] Updating ${product?.name} stock from ${currentStock} to ${newStock} ${product?.unit}`);
    
    // For incoming transactions, update the product cost if provided
    const updates: {current_stock: number, cost?: number | null} = {
      current_stock: newStock
    };
    
    // Update cost only for incoming transactions with cost
    if (appTransactionType === 'in' && transaction.cost !== null) {
      updates.cost = transaction.cost;
      console.log(`[INVENTORY] Updating product cost to ${transaction.cost}`);
    }
    
    // Update product stock and maybe cost
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update(updates)
      .eq('id', transaction.product_id)
      .select();
    
    if (updateError) {
      console.error("[INVENTORY] Error updating product stock:", updateError);
      throw updateError;
    }
    
    console.log(`[INVENTORY] Updated product: ${product?.name} to stock level ${updatedProduct?.[0]?.current_stock}`);
    
    const displayType = appTransactionType === 'in' ? 'Entrada' : 'Saída';
    toast.success(`${displayType} de estoque registrada com sucesso`);
    return data?.[0] as unknown as InventoryTransaction;
  } catch (error) {
    console.error("[INVENTORY] Error adding inventory transaction:", error);
    
    // Safely determine display type using the app's TransactionType
    const displayType = transaction.type === 'in' ? 'entrada' : 'saída';
    
    toast.error(`Erro ao registrar ${displayType} de estoque`);
    return null;
  }
}
