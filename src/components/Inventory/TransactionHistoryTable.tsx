
import React from "react";
import { Loader2, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  InventoryTransactionWithProduct, 
  toAppTransactionType 
} from "@/services/inventory/inventoryTypes";
import { formatDate } from "@/lib/formatters";

// Constants for dropdown options
const TRANSACTION_REASONS = [
  { value: "production", label: "Produção" },
  { value: "damage", label: "Avaria/Perda" },
  { value: "adjustment", label: "Ajuste de Inventário" },
  { value: "return", label: "Devolução" },
  { value: "other", label: "Outro" }
];

interface TransactionHistoryTableProps {
  transactions: InventoryTransactionWithProduct[];
  loading: boolean;
  searchQuery: string;
}

export default function TransactionHistoryTable({ 
  transactions, 
  loading, 
  searchQuery 
}: TransactionHistoryTableProps) {
  console.log("Rendering TransactionHistoryTable with", transactions.length, "transactions");
  
  const filteredTransactions = transactions.filter(transaction => 
    transaction.product?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  console.log("Filtered to", filteredTransactions.length, "transactions after search:", searchQuery);
  
  return (
    <>
      <h2 className="text-xl font-bold mb-4">Histórico de Movimentações</h2>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin h-8 w-8 text-bakery-amber" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Custo Unit.</TableHead>
                <TableHead>Nota Fiscal</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => {
                  // Convert database transaction type to app transaction type
                  const appType = toAppTransactionType(transaction.type);
                  
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell>{formatDate(transaction.date)}</TableCell>
                      <TableCell>
                        {appType === 'in' ? (
                          <div className="flex items-center text-green-600">
                            <ArrowUpCircle className="mr-1 h-4 w-4" />
                            Entrada
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600">
                            <ArrowDownCircle className="mr-1 h-4 w-4" />
                            Saída
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{transaction.product?.name || "Produto não encontrado"}</TableCell>
                      <TableCell>{transaction.quantity} {transaction.product?.unit}</TableCell>
                      <TableCell>
                        {transaction.cost ? `R$ ${transaction.cost.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>{transaction.invoice || '-'}</TableCell>
                      <TableCell>
                        {transaction.reason ? 
                          TRANSACTION_REASONS.find(r => r.value === transaction.reason)?.label || transaction.reason 
                          : '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{transaction.notes || '-'}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    {searchQuery ? "Nenhuma movimentação encontrada para esta busca." : "Nenhuma movimentação registrada."}
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
