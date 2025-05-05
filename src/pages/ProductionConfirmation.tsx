import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Badge
} from "@/components/ui/badge";
import {
  ArrowLeft,
  CheckCircle,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  getPendingProductionOrders, 
  getProductionOrder,
  confirmProductionOrder,
  ProductionOrderWithItems,
  ProductionOrderItem
} from "@/services/productionOrderService";
import { 
  processProductionOrderInventoryTransactions,
  RecipeProductionItem
} from "@/services/inventoryService";

import { useAuth } from '@/contexts/AuthContext';

export default function ProductionConfirmation() {
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<ProductionOrderWithItems[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [currentOrder, setCurrentOrder] = useState<ProductionOrderWithItems | null>(null);
  const [confirmationDate, setConfirmationDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ProductionOrderItem[]>([]);
  const [adjustMaterials, setAdjustMaterials] = useState(true);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeCompany, loading: authLoading } = useAuth();
  
  useEffect(() => {
    const loadPendingOrders = async () => {
      // Espera o loading da autenticação terminar
      if (authLoading) {
        console.log('[ProductionConfirmation] Aguardando autenticação...');
        return;
      }
      if (!activeCompany?.id) {
        console.error('[ProductionConfirmation] Empresa ativa não encontrada.');
        toast({ title: 'Empresa ativa não carregada.', variant: 'destructive' });
        setPendingOrders([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const orders = await getPendingProductionOrders(activeCompany.id);
      setPendingOrders(orders);
      setLoading(false);
    };
    loadPendingOrders();
  }, [authLoading, activeCompany?.id]);
  
  useEffect(() => {
    const loadOrder = async () => {
      if (authLoading) {
        console.log('[ProductionConfirmation] Aguardando autenticação...');
        return;
      }
      if (!id) return;
      if (!activeCompany?.id) {
        console.error('[ProductionConfirmation] Empresa ativa não encontrada.');
        toast({ title: 'Empresa ativa não carregada.', variant: 'destructive' });
        setLoading(false);
        return;
      }
      setLoading(true);
      const order = await getProductionOrder(id, activeCompany.id);
      if (order) {
        setSelectedOrderId(order.id);
        setCurrentOrder(order);
        setItems(order.items);
      } else {
        navigate('/production-orders');
      }
      setLoading(false);
    };
    loadOrder();
  }, [id, navigate, authLoading, activeCompany?.id]);
  
  const handleOrderSelect = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setLoading(true);
    
    const order = await getProductionOrder(orderId);
    setCurrentOrder(order);
    
    if (order) {
      setItems(order.items);
    }
    
    setLoading(false);
  };
  
  const handleQuantityChange = (id: string, field: 'actual_quantity_kg' | 'actual_quantity_units', value: string) => {
    setItems(items.map(item => 
      item.id === id 
        ? { ...item, [field]: parseFloat(value) || 0 } 
        : item
    ));
  };
  
  const handleSubmit = async () => {
    if (!selectedOrderId || !confirmationDate) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione um pedido e informe a data de conclusão.",
        variant: "destructive"
      });
      return;
    }
    
    const hasZeroQuantities = items.some(item => 
      (item.actual_quantity_kg === 0 || item.actual_quantity_kg === null) && 
      (item.actual_quantity_units === 0 || item.actual_quantity_units === null)
    );
    
    if (hasZeroQuantities) {
      toast({
        title: "Quantidades obrigatórias",
        description: "Informe as quantidades produzidas para todos os itens.",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    if (!activeCompany?.id) {
  toast({
    title: "Empresa ativa não carregada.",
    description: "Não foi possível confirmar a produção sem empresa ativa.",
    variant: "destructive"
  });
  setLoading(false);
  return;
}
const success = await confirmProductionOrder(selectedOrderId, items, activeCompany.id, notes || null);
    
    if (success) {
      const productionItems: RecipeProductionItem[] = items.map(item => ({
        recipeId: item.recipe_id,
        recipeName: item.recipe_name,
        actualQuantityKg: item.actual_quantity_kg || 0,
        actualQuantityUnits: item.actual_quantity_units || 0
      }));
      
      if (activeCompany?.id) {
        await processProductionOrderInventoryTransactions(
          selectedOrderId,
          productionItems,
          adjustMaterials,
          activeCompany.id
        );
      }
      
      navigate('/production-orders');
    }
    
    setLoading(false);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">Em Produção</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Concluído</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/production-orders')} 
          className="mr-4"
          disabled={loading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <div>
          <h1 className="text-2xl font-bold text-bakery-brown">Confirmação de Produção</h1>
          <p className="text-gray-600">Registre o que foi efetivamente produzido</p>
        </div>
      </div>
      
      {loading && (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-bakery-amber" />
        </div>
      )}
      
      {!loading && (
        <>
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-bakery-brown mb-4">Selecionar Pedido</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="orderId" className="form-label">Pedido de Produção *</label>
                  <Select 
                    value={selectedOrderId} 
                    onValueChange={handleOrderSelect}
                    disabled={!!id}
                  >
                    <SelectTrigger className="form-input">
                      <SelectValue placeholder="Selecione um pedido pendente" />
                    </SelectTrigger>
                    <SelectContent>
                      {pendingOrders.map(order => (
                        <SelectItem key={order.id} value={order.id}>
                          #{order.order_number} - {new Date(order.date).toLocaleDateString()} 
                          {order.status === 'pending' 
                            ? ' (Pendente)' 
                            : ' (Em Produção)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="confirmationDate" className="form-label">Data da Conclusão *</label>
                  <DateInput
                    id="confirmationDate"
                    value={confirmationDate}
                    onChange={(value) => setConfirmationDate(value)}
                    required
                    className="form-input"
                  />
                </div>
              </div>
            </div>
          </Card>
          
          {currentOrder && (
            <>
              <Card className="mb-6">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-bakery-brown">Itens Produzidos</h2>
                    
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-2">Status:</span>
                      {getStatusBadge(currentOrder.status)}
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Receita</TableHead>
                          <TableHead>Planejado (kg)</TableHead>
                          <TableHead>Planejado (un)</TableHead>
                          <TableHead>Produzido (kg) *</TableHead>
                          <TableHead>Produzido (un) *</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.recipe_name}</TableCell>
                            <TableCell>{item.planned_quantity_kg.toFixed(2)}</TableCell>
                            <TableCell>{item.planned_quantity_units || '-'}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.actual_quantity_kg || ''}
                                onChange={(e) => handleQuantityChange(item.id, 'actual_quantity_kg', e.target.value)}
                                required
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                value={item.actual_quantity_units || ''}
                                onChange={(e) => handleQuantityChange(item.id, 'actual_quantity_units', e.target.value)}
                                required
                                className="w-24"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </Card>
              
              <Card className="mb-6">
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={adjustMaterials}
                          onChange={(e) => setAdjustMaterials(e.target.checked)}
                          className="form-checkbox"
                        />
                        <span>Dar baixa automática dos ingredientes no estoque</span>
                      </label>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="notes" className="form-label">Observações</label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="min-h-[100px]"
                        placeholder="Registre observações importantes sobre a produção, como perdas, problemas encontrados ou adaptações realizadas..."
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}
          
          <div className="flex justify-end mt-6">
            <Button 
              onClick={() => navigate('/production-orders')} 
              variant="outline"
              className="mr-4"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={loading || !currentOrder}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Confirmar Produção
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
