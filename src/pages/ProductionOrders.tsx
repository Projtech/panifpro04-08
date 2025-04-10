
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Badge
} from "@/components/ui/badge";
import {
  Plus, 
  Search, 
  Eye, 
  MoreHorizontal,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  getProductionOrders, 
  ProductionOrderWithItems,
  OrderStatus
} from "@/services/productionOrderService";
import { toast } from "sonner";

export default function ProductionOrders() {
  const [orders, setOrders] = useState<ProductionOrderWithItems[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  
  // Fetch production orders from the database
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const ordersData = await getProductionOrders();
        setOrders(ordersData);
      } catch (error) {
        console.error("Error fetching production orders:", error);
        toast.error("Erro ao carregar pedidos de produção");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.some(item => item.recipe_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter ? order.status === statusFilter : true;
    
    return matchesSearch && matchesStatus;
  });
  
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pendente</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">Em Produção</Badge>;
      case 'completed':
        return <Badge className="bg-green-600">Concluído</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };
  
  const handleFilterStatus = (status: OrderStatus | null) => {
    setStatusFilter(status);
  };
  
  const handleViewOrder = (orderId: string) => {
    navigate(`/production-orders/${orderId}`);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-bakery-brown">Pedidos de Produção</h1>
          <p className="text-gray-600">Gerencie todos os pedidos para a produção</p>
        </div>
        
        <Button 
          onClick={() => navigate('/production-orders/new')} 
          className="bg-bakery-amber hover:bg-bakery-brown text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Pedido
        </Button>
      </div>
      
      <Card className="mb-8">
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Buscar pedido por número ou receita..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant={statusFilter === null ? "secondary" : "outline"} 
                onClick={() => handleFilterStatus(null)}
                size="sm"
              >
                Todos
              </Button>
              <Button 
                variant={statusFilter === 'pending' ? "secondary" : "outline"} 
                onClick={() => handleFilterStatus('pending')}
                size="sm"
              >
                Pendentes
              </Button>
              <Button 
                variant={statusFilter === 'in_progress' ? "secondary" : "outline"} 
                onClick={() => handleFilterStatus('in_progress')}
                size="sm"
              >
                Em Produção
              </Button>
              <Button 
                variant={statusFilter === 'completed' ? "secondary" : "outline"} 
                onClick={() => handleFilterStatus('completed')}
                size="sm"
              >
                Concluídos
              </Button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin h-8 w-8 text-bakery-amber" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº do Pedido</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Receitas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.order_number}</TableCell>
                        <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                        <TableCell>{order.items.length} receitas</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {order.items.map(item => item.recipe_name).join(', ')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="mr-2"
                              onClick={() => handleViewOrder(order.id)}
                            >
                              <Eye size={16} />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal size={16} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewOrder(order.id)}>
                                  Ver detalhes
                                </DropdownMenuItem>
                                {order.status === 'pending' && (
                                  <DropdownMenuItem onClick={() => navigate(`/production-orders/${order.id}`)}>
                                    Iniciar produção
                                  </DropdownMenuItem>
                                )}
                                {(order.status === 'pending' || order.status === 'in_progress') && (
                                  <DropdownMenuItem 
                                    onClick={() => navigate(`/production-confirmation/${order.id}`)}
                                  >
                                    Confirmar produção
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {order.status !== 'completed' && (
                                  <DropdownMenuItem className="text-red-500">
                                    Cancelar pedido
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nenhum pedido encontrado. Crie um novo pedido para começar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
