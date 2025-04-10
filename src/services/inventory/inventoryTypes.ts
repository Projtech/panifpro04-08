
// Common types for inventory management

export type TransactionType = 'in' | 'out';
export type DatabaseTransactionType = 'entrada' | 'saida';

export interface InventoryTransaction {
  id: string;
  product_id: string;
  quantity: number;
  date: string;
  cost: number | null;
  // The database stores 'entrada' or 'saida', but our app uses 'in'/'out' internally
  type: DatabaseTransactionType;
  invoice: string | null;
  notes: string | null;
  reason: string | null;
  production_order_id: string | null;
  created_at: string;
}

export interface InventoryTransactionWithProduct extends InventoryTransaction {
  product: Product | null;
}

export interface ProductInventory {
  product_id: string;
  product_name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  last_cost: number | null;
  unit_price: number | null;
  is_from_recipe: boolean;
  recipe_info: any | null;
}

export interface RecipeProductionItem {
  recipeId: string;
  recipeName: string;
  actualQuantityKg: number;
  actualQuantityUnits: number;
}

// Import this from productService to avoid circular dependencies
interface Product {
  id: string;
  name: string;
  unit: string;
  sku: string | null;
  supplier: string;
  cost: number | null;
  min_stock: number;
  current_stock: number | null;
}

// Helper functions for converting between transaction types
export function toDbTransactionType(type: TransactionType): DatabaseTransactionType {
  return type === 'in' ? 'entrada' : 'saida';
}

export function toAppTransactionType(type: DatabaseTransactionType): TransactionType {
  return type === 'entrada' ? 'in' : 'out';
}
