
import React from "react";
import { Card } from "@/components/ui/card";
import { QuickActionButton } from "./QuickActionButton";
import { 
  ShoppingBasket, 
  ArrowUpCircle, 
  CakeSlice, 
  Clipboard 
} from "lucide-react";

export function QuickActions() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-bakery-brown mb-4">Ações Rápidas</h2>
      <div className="grid grid-cols-2 gap-4">
        <QuickActionButton 
          title="Novo Produto" 
          href="/products/new" 
          icon={ShoppingBasket} 
        />
        <QuickActionButton 
          title="Entrada de Estoque" 
          href="/inventory" 
          icon={ArrowUpCircle} 
        />
        <QuickActionButton 
          title="Nova Receita" 
          href="/recipes/new" 
          icon={CakeSlice} 
        />
        <QuickActionButton 
          title="Novo Pedido" 
          href="/production-orders/new" 
          icon={Clipboard} 
        />
      </div>
    </Card>
  );
}
