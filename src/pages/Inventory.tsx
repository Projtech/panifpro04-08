
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlusCircle, Search, Loader2 } from "lucide-react";
import { getInventoryTransactions } from "@/services/inventory/transactionService";
import { getProductInventory } from "@/services/inventory/productInventoryService";
import { InventoryTransactionWithProduct, ProductInventory } from "@/services/inventory/inventoryTypes";
import { getProducts, Product } from "@/services/productService";

// Import the extracted components
import InventoryTable from "@/components/Inventory/InventoryTable";
import TransactionHistoryTable from "@/components/Inventory/TransactionHistoryTable";
import TransactionForm from "@/components/Inventory/TransactionForm";

export default function Inventory() {
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<ProductInventory[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransactionWithProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  
  // Load inventory data
  const fetchData = async () => {
    setLoading(true);
    try {
      console.log("Fetching inventory data...");
      
      // Get current inventory
      const inventoryData = await getProductInventory();
      console.log("Inventory data:", inventoryData);
      setInventory(inventoryData);
      
      // Get transaction history
      const transactionsData = await getInventoryTransactions();
      console.log("Transaction data:", transactionsData);
      setTransactions(transactionsData);
      
      // Get products for dropdowns
      const productsData = await getProducts();
      console.log("Products data:", productsData);
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching inventory data:", error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);

  const handleTransactionComplete = async () => {
    setIsTransactionDialogOpen(false);
    await fetchData();
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-bakery-brown">Controle de Estoque</h1>
          <p className="text-gray-600">Gerencie o estoque e as movimentações de matérias-primas</p>
        </div>
        
        <Button 
          onClick={() => setIsTransactionDialogOpen(true)} 
          className="bg-bakery-amber hover:bg-bakery-brown text-white"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Registrar Movimentação
        </Button>
      </div>

      <Card className="mb-6">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input 
              placeholder="Buscar por nome do produto..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Current Inventory Status */}
      <Card className="mb-6">
        <div className="p-6">
          <InventoryTable 
            inventory={inventory}
            loading={loading}
            searchQuery={searchQuery}
          />
        </div>
      </Card>

      {/* Transaction History */}
      <Card>
        <div className="p-6">
          <TransactionHistoryTable
            transactions={transactions}
            loading={loading}
            searchQuery={searchQuery}
          />
        </div>
      </Card>

      {/* Transaction Modal */}
      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Registrar Movimentação de Estoque</DialogTitle>
          </DialogHeader>

          <TransactionForm 
            products={products}
            onTransactionComplete={handleTransactionComplete}
            onCancel={() => setIsTransactionDialogOpen(false)}
            loading={loading}
            setLoading={setLoading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
