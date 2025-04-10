import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  ArrowLeft,
  Plus,
  Loader2,
  RefreshCw,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getProductionOrders } from "@/services/productionOrderService";
import { getRecipes, Recipe } from "@/services/recipeService";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProductionEvent {
  id: string;
  orderNumber: string;
  date: string;
  status: string;
  recipes: {
    name: string;
    quantity: number;
    unit: string;
  }[];
}

const ProductionCalendar = () => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ProductionEvent[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Função para obter os dias da semana atual
  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentWeek, { weekStartsOn: 0 }),
    end: endOfWeek(currentWeek, { weekStartsOn: 0 })
  });
  
  // Função para carregar os dados
  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar pedidos de produção
      const orders = await getProductionOrders();
      
      // Carregar receitas
      const recipesData = await getRecipes();
      setRecipes(recipesData);
      
      // Transformar pedidos em eventos para o calendário
      const productionEvents = orders.map(order => {
        const orderRecipes = order.items.map(item => {
          const recipe = recipesData.find(r => r.id === item.recipe_id);
          return {
            name: recipe?.name || "Receita desconhecida",
            quantity: item.quantity,
            unit: item.unit
          };
        });
        
        return {
          id: order.id,
          orderNumber: order.order_number,
          date: order.date,
          status: order.status,
          recipes: orderRecipes
        };
      });
      
      setEvents(productionEvents);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Erro ao carregar dados do calendário:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o calendário de produção.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Carregar dados ao iniciar
  useEffect(() => {
    loadData();
    
    // Configurar atualização automática a cada 5 minutos
    const interval = setInterval(() => {
      loadData();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Função para navegar para a semana anterior
  const previousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };
  
  // Função para navegar para a próxima semana
  const nextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };
  
  // Função para obter eventos de um dia específico
  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return isSameDay(eventDate, day);
    });
  };
  
  // Função para navegar para o formulário de novo pedido
  const handleNewOrder = () => {
    navigate("/production-orders/new");
  };
  
  // Função para visualizar um pedido
  const handleViewOrder = (id: string) => {
    navigate(`/production-orders/${id}`);
  };
  
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-bakery-brown">Calendário de Produção</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-500 flex items-center mr-2">
            <Clock className="h-4 w-4 mr-1" />
            Atualizado: {format(lastUpdated, "HH:mm")}
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadData}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          
          <Button 
            onClick={handleNewOrder}
            className="bg-bakery-amber hover:bg-bakery-amber/90 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Pedido
          </Button>
        </div>
      </div>
      
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" onClick={previousWeek}>
              Semana Anterior
            </Button>
            
            <h2 className="text-xl font-semibold text-bakery-brown">
              {format(startOfWeek(currentWeek, { weekStartsOn: 0 }), "dd/MM/yyyy", { locale: ptBR })} - 
              {format(endOfWeek(currentWeek, { weekStartsOn: 0 }), " dd/MM/yyyy", { locale: ptBR })}
            </h2>
            
            <Button variant="outline" onClick={nextWeek}>
              Próxima Semana
            </Button>
          </div>
          
          <div className="grid grid-cols-7 gap-4">
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="border rounded-md p-2">
                <div className="text-center mb-2 pb-2 border-b">
                  <div className="font-semibold">{format(day, "EEEE", { locale: ptBR })}</div>
                  <div className="text-lg">{format(day, "dd/MM")}</div>
                </div>
                
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {getEventsForDay(day).length > 0 ? (
                    getEventsForDay(day).map((event) => (
                      <div 
                        key={event.id} 
                        className={`p-2 rounded-md cursor-pointer text-sm
                          ${event.status === 'pending' ? 'bg-yellow-100 border-yellow-300 border' : ''}
                          ${event.status === 'in_progress' ? 'bg-blue-100 border-blue-300 border' : ''}
                          ${event.status === 'completed' ? 'bg-green-100 border-green-300 border' : ''}
                        `}
                        onClick={() => handleViewOrder(event.id)}
                      >
                        <div className="font-medium">{event.orderNumber}</div>
                        <div className="text-xs text-gray-600">
                          {event.recipes.slice(0, 2).map((recipe, index) => (
                            <div key={index}>
                              {recipe.name} ({recipe.quantity} {recipe.unit})
                            </div>
                          ))}
                          {event.recipes.length > 2 && (
                            <div>+ {event.recipes.length - 2} mais...</div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 text-sm py-2">
                      Sem pedidos
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
      
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-bakery-brown mb-4">Pedidos de Produção Recentes</h2>
          
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-bakery-amber" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center p-8">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Sem pedidos de produção</h3>
              <p className="text-gray-500 mb-4">Nenhum pedido de produção foi encontrado.</p>
              <Button 
                onClick={handleNewOrder}
                className="bg-bakery-amber hover:bg-bakery-amber/90 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Pedido
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Receitas</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.slice(0, 5).map((event) => (
                    <TableRow key={event.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewOrder(event.id)}>
                      <TableCell className="font-medium">{event.orderNumber}</TableCell>
                      <TableCell>{format(new Date(event.date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        <div className={`
                          inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold
                          ${event.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${event.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : ''}
                          ${event.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                        `}>
                          {event.status === 'pending' && 'Pendente'}
                          {event.status === 'in_progress' && 'Em Produção'}
                          {event.status === 'completed' && 'Concluído'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {event.recipes.slice(0, 2).map((recipe, index) => (
                          <div key={index} className="text-sm">
                            {recipe.name} ({recipe.quantity} {recipe.unit})
                          </div>
                        ))}
                        {event.recipes.length > 2 && (
                          <div className="text-xs text-gray-500">
                            + {event.recipes.length - 2} mais...
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewOrder(event.id);
                          }}
                        >
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {events.length > 5 && (
                <div className="p-4 text-center">
                  <Button 
                    variant="link" 
                    onClick={() => navigate("/production-orders")}
                  >
                    Ver todos os pedidos ({events.length})
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ProductionCalendar;
