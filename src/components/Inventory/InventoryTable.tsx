
import React from "react";
import { Loader2 } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Box } from "lucide-react";
import { ProductInventory } from "@/services/inventory/inventoryTypes";
import { formatQuantity } from "@/lib/formatters";

interface InventoryTableProps {
  inventory: ProductInventory[];
  loading: boolean;
  searchQuery: string;
}

export default function InventoryTable({ inventory, loading, searchQuery }: InventoryTableProps) {
  const filteredInventory = inventory.filter(item => 
    item.product_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <h2 className="text-xl font-bold mb-4">Estoque Atual</h2>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin h-8 w-8 text-bakery-amber" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Quantidade em Estoque</TableHead>
                <TableHead>Estoque Mínimo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length > 0 ? (
                filteredInventory.map((item) => (
                  <TableRow key={item.product_id}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{formatQuantity(item.current_stock)}</TableCell>
                    <TableCell>{item.min_stock}</TableCell>
                    <TableCell>
                      {item.current_stock < item.min_stock ? (
                        <span className="text-red-600 font-medium flex items-center">
                          <Box className="mr-1 h-4 w-4" />
                          Abaixo do mínimo
                        </span>
                      ) : (
                        <span className="text-green-600 font-medium">Adequado</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    {searchQuery ? "Nenhum produto encontrado para esta busca." : "Nenhum produto em estoque."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
