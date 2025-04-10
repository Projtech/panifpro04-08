import React, { useState } from "react";
import { Loader2, Calendar, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { toast } from "sonner";
import { addInventoryTransaction } from "@/services/inventory/transactionService";
import { TransactionType } from "@/services/inventory/inventoryTypes";
import { Product } from "@/services/productService";

// Constants for dropdown options
const TRANSACTION_REASONS = [
  { value: "production", label: "Produção" },
  { value: "damage", label: "Avaria/Perda" },
  { value: "adjustment", label: "Ajuste de Inventário" },
  { value: "return", label: "Devolução" },
  { value: "other", label: "Outro" }
];

interface TransactionFormProps {
  products: Product[];
  onTransactionComplete: () => void;
  onCancel: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export default function TransactionForm({
  products,
  onTransactionComplete,
  onCancel,
  loading,
  setLoading
}: TransactionFormProps) {
  const [transactionType, setTransactionType] = useState<TransactionType>('in');
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [cost, setCost] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [supplier, setSupplier] = useState<string>("");
  const [invoice, setInvoice] = useState<string>("");
  const [reason, setReason] = useState<string>(TRANSACTION_REASONS[0].value);
  const [notes, setNotes] = useState<string>("");

  const resetForm = () => {
    setSelectedProduct("");
    setQuantity("");
    setCost("");
    setDate(new Date().toISOString().substring(0, 10));
    setSupplier("");
    setInvoice("");
    setReason(TRANSACTION_REASONS[0].value);
    setNotes("");
  };

  const handleTransactionSubmit = async () => {
    if (!selectedProduct) {
      toast.error("Selecione um produto");
      return;
    }
    
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error("Informe uma quantidade válida");
      return;
    }
    
    if (!date) {
      toast.error("Informe uma data válida");
      return;
    }

    if (transactionType === 'in' && !cost) {
      toast.error("Informe o custo para entradas de estoque");
      return;
    }

    setLoading(true);

    try {
      console.log("Creating transaction with data:", {
        product_id: selectedProduct,
        quantity: parseFloat(quantity),
        date,
        cost: transactionType === 'in' ? parseFloat(cost) : null,
        type: transactionType
      });
      
      const transactionData = {
        product_id: selectedProduct,
        quantity: parseFloat(quantity),
        date,
        cost: transactionType === 'in' ? parseFloat(cost) : null,
        type: transactionType,
        invoice: transactionType === 'in' ? invoice || null : null,
        notes: notes || null,
        reason: transactionType === 'out' ? reason : null,
        production_order_id: null
      };

      if (transactionType === 'in' && supplier) {
        transactionData.notes = `Fornecedor: ${supplier}${notes ? ` - ${notes}` : ''}`;
      }

      const result = await addInventoryTransaction(transactionData);
      
      if (result) {
        console.log("Transaction added successfully:", result);
        toast.success(`${transactionType === 'in' ? 'Entrada' : 'Saída'} de estoque registrada com sucesso`);
        resetForm();
        onTransactionComplete();
      } else {
        console.error("Failed to add transaction, no result returned");
        toast.error(`Erro ao registrar ${transactionType === 'in' ? 'entrada' : 'saída'} de estoque`);
      }
    } catch (error) {
      console.error("Error adding inventory transaction:", error);
      toast.error(`Erro ao registrar ${transactionType === 'in' ? 'entrada' : 'saída'} de estoque`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tabs 
      defaultValue="in" 
      value={transactionType}
      onValueChange={(value) => setTransactionType(value as 'in' | 'out')}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="in" className="flex gap-2">
          <ArrowUpCircle className="h-4 w-4" /> Entrada
        </TabsTrigger>
        <TabsTrigger value="out" className="flex gap-2">
          <ArrowDownCircle className="h-4 w-4" /> Saída
        </TabsTrigger>
      </TabsList>

      <div className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Produto *</label>
            <Select
              value={selectedProduct}
              onValueChange={setSelectedProduct}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} ({product.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Data *</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Quantidade *</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {transactionType === 'in' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Custo Unitário (R$) *</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo *</label>
              <Select
                value={reason}
                onValueChange={setReason}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_REASONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {transactionType === 'in' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fornecedor</label>
                <Input
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Nome do fornecedor"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nota Fiscal</label>
                <Input
                  value={invoice}
                  onChange={(e) => setInvoice(e.target.value)}
                  placeholder="Número da NF"
                />
              </div>
            </>
          )}

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Observações</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações adicionais"
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleTransactionSubmit}
          className="bg-bakery-amber hover:bg-bakery-brown text-white"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <PlusCircle className="h-4 w-4 mr-2" />
          )}
          Confirmar
        </Button>
      </DialogFooter>
    </Tabs>
  );
}
