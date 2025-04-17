import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
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
  Plus, 
  Trash,
  ArrowLeft,
  Save,
  List,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  getRecipes, 
  Recipe,
  getAllRecipeIngredients
} from "@/services/recipeService";
import {
  createProductionOrder,
  createProductionOrderFromCalendar,
  getProductionOrder,
  updateProductionOrderStatus,
  ProductionOrderItem
} from "@/services/productionOrderService";

interface OrderRecipe {
  id: string;
  recipeId: string | null;
  recipeName: string;
  quantity: number;
  unit: 'kg' | 'un';
  convertedQuantity: number;
  fromCalendar?: boolean;
}

interface MaterialItem {
  id: number;
  name: string;
  totalQuantity: number;
  unit: string;
}

interface LocationState {
  calendarItems?: Array<{
    recipe_id: string | null;
    recipe_name: string;
    planned_quantity_kg: number;
    planned_quantity_units: number | null;
    unit: string;
  }>;
  calendarDate?: string;
}

export default function ProductionOrderForm() {
  const { id } = useParams();
  const location = useLocation();
  const state = location.state as LocationState;
  
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  
  const [orderNumber, setOrderNumber] = useState(`P${String(new Date().getTime()).slice(-3)}`);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderStatus, setOrderStatus] = useState<'pending' | 'in_progress' | 'completed'>('pending');
  const [orderRecipes, setOrderRecipes] = useState<OrderRecipe[]>([]);
  const [showMaterialsList, setShowMaterialsList] = useState(false);
  const [isFromCalendar, setIsFromCalendar] = useState(false);
  
  const [newRecipeId, setNewRecipeId] = useState('');
  const [newRecipeQuantity, setNewRecipeQuantity] = useState('');
  const [newRecipeUnit, setNewRecipeUnit] = useState<'kg' | 'un'>('kg');
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    const loadRecipes = async () => {
      setLoading(true);
      const recipesData = await getRecipes();
      setRecipes(recipesData);
      setLoading(false);
    };
    
    loadRecipes();
  }, []);
  
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  
  const calculateMaterials = async () => {
    setLoadingMaterials(true);
    const materialsMap = new Map<string, MaterialItem>();
    let materialId = 1;
    
    try {
      for (const orderRecipe of orderRecipes) {
        const recipe = recipes.find(r => r.id === orderRecipe.recipeId);
        
        if (recipe) {
          console.log(`Calculando materiais para ${recipe.name} (${orderRecipe.quantity} ${orderRecipe.unit})`);
          
          let quantityInKg = orderRecipe.quantity;
          if (orderRecipe.unit === 'un' && recipe.yield_units && recipe.yield_units > 0) {
            quantityInKg = orderRecipe.quantity * (recipe.yield_kg / recipe.yield_units);
          }
          
          const ingredients = await getAllRecipeIngredients(recipe.id, quantityInKg);
          
          for (const ingredient of ingredients) {
            if (ingredient.product_id && ingredient.product) {
              const key = `${ingredient.product_id}-${ingredient.unit}`;
              
              if (materialsMap.has(key)) {
                const existingMaterial = materialsMap.get(key)!;
                existingMaterial.totalQuantity += ingredient.quantity;
              } else {
                materialsMap.set(key, {
                  id: materialId++,
                  name: ingredient.product.name,
                  totalQuantity: ingredient.quantity,
                  unit: ingredient.unit
                });
              }
            }
          }
        }
      }
      
      const materialsList = Array.from(materialsMap.values())
        .sort((a, b) => a.name.localeCompare(b.name));
      
      setMaterials(materialsList);
    } catch (error) {
      console.error("Erro ao calcular lista de materiais:", error);
      toast({
        title: "Erro",
        description: "Não foi possível calcular a lista de materiais.",
        variant: "destructive"
      });
    } finally {
      setLoadingMaterials(false);
    }
  };
  
  const handleAddRecipe = () => {
    if (!newRecipeId || !newRecipeQuantity) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione uma receita e informe a quantidade.",
        variant: "destructive"
      });
      return;
    }
    
    const recipe = recipes.find(r => r.id === newRecipeId);
    
    if (!recipe) {
      toast({
        title: "Receita não encontrada",
        description: "A receita selecionada não foi encontrada.",
        variant: "destructive"
      });
      return;
    }
    
    const quantity = parseFloat(newRecipeQuantity);
    
    const convertedQuantity = newRecipeUnit === 'kg' 
      ? (recipe.yield_units && recipe.yield_units > 0) 
        ? quantity * (recipe.yield_units / recipe.yield_kg) 
        : 0
      : quantity * (recipe.yield_kg / (recipe.yield_units || 1));
    
    const newOrderRecipe: OrderRecipe = {
      id: `recipe-${Date.now()}`,
      recipeId: recipe.id,
      recipeName: recipe.name,
      quantity,
      unit: newRecipeUnit,
      convertedQuantity,
      fromCalendar: false
    };
    
    setOrderRecipes([...orderRecipes, newOrderRecipe]);
    setNewRecipeId('');
    setNewRecipeQuantity('');
    setNewRecipeUnit('kg');
  };
  
  const removeRecipe = (id: string) => {
    setOrderRecipes(orderRecipes.filter(recipe => recipe.id !== id));
  };
  
  const openMaterialsList = async () => {
    if (orderRecipes.length === 0) {
      toast({
        title: "Sem receitas",
        description: "Adicione receitas ao pedido para visualizar a lista de materiais.",
        variant: "destructive"
      });
      return;
    }
    
    await calculateMaterials();
    setShowMaterialsList(true);
  };
  
  const isEditing = !!id;
  const isViewOnly = isEditing && orderStatus === 'completed';

  // Novo estado para rastrear origem do pedido
  const [orderOrigin, setOrderOrigin] = useState<'manual' | 'calendar'>('manual');

  useEffect(() => {
    // Detectar se a navegação veio do calendário
    if (state?.calendarItems && state.calendarItems.length > 0) {
      setOrderOrigin('calendar');
      
      if (state.calendarDate) {
        setOrderDate(state.calendarDate);
      }
      
      // Carregar produtos do calendário apenas se receitas já estiverem carregadas
      if (recipes.length > 0) {
        const calendarRecipes: OrderRecipe[] = state.calendarItems.map(item => {
          const recipe = recipes.find(r => r.id === item.recipe_id);
          let convertedQuantity = calculateConvertedQuantity(item, recipe);
          
          return {
            id: `cal-recipe-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            recipeId: item.recipe_id,
            recipeName: item.recipe_name,
            quantity: item.unit === 'kg' ? item.planned_quantity_kg : (item.planned_quantity_units || 0),
            unit: item.unit as 'kg' | 'un',
            convertedQuantity,
            fromCalendar: true
          };
        });
        
        setOrderRecipes(calendarRecipes);
      }
    }
  }, [state, recipes]);

  // Função auxiliar para cálculo de conversão de quantidade
  const calculateConvertedQuantity = (item: any, recipe?: Recipe) => {
    if (!recipe) return 0;

    return item.unit === 'kg' 
      ? (recipe.yield_units && recipe.yield_units > 0) 
        ? item.planned_quantity_kg * (recipe.yield_units / recipe.yield_kg) 
        : 0
      : item.planned_quantity_units 
        ? item.planned_quantity_units * (recipe.yield_kg / (recipe.yield_units || 1))
        : 0;
  };

  // Modificar handleSave para distinguir origem do pedido
  const handleSave = async () => {
    if (orderRecipes.length === 0) {
      toast({
        title: "Receitas obrigatórias",
        description: "Adicione pelo menos uma receita ao pedido.",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      let success;
      
      const items = orderRecipes.map(recipe => ({
        recipe_id: recipe.recipeId,
        recipe_name: recipe.recipeName,
        planned_quantity_kg: recipe.unit === 'kg' ? recipe.quantity : recipe.convertedQuantity,
        planned_quantity_units: recipe.unit === 'un' ? Math.round(recipe.quantity) : Math.round(recipe.convertedQuantity),
        actual_quantity_kg: null,
        actual_quantity_units: null,
        unit: recipe.unit
      }));
      
      success = await createProductionOrder(
        {
          order_number: orderNumber,
          date: orderDate,
          status: 'pending',
          adjust_materials: orderOrigin === 'calendar'  // Flag para identificar origem
        },
        items
      );
      
      if (success) {
        navigate('/production-orders');
      }
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o pedido de produção.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleStatusUpdate = async (newStatus: 'pending' | 'in_progress' | 'completed') => {
    if (!id) return;
    
    setLoading(true);
    
    const success = await updateProductionOrderStatus(id, newStatus);
    
    if (success) {
      setOrderStatus(newStatus);
      
      if (newStatus === 'completed') {
        navigate(`/production-confirmation/${id}`);
      }
    }
    
    setLoading(false);
  };

  const isEditing = !!id;
  const isViewOnly = isEditing && orderStatus === 'completed';

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
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-bakery-brown">
            {isEditing ? 'Detalhes do Pedido' : 'Novo Pedido de Produção'}
          </h1>
          <p className="text-gray-600">
            {isEditing 
              ? 'Visualize ou edite os detalhes do pedido' 
              : 'Crie um novo pedido para a produção'
            }
          </p>
        </div>
        
        {isFromCalendar && (
          <div className="flex items-center text-bakery-amber bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
            <Calendar className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">Pedido do Calendário</span>
          </div>
        )}
      </div>
      
      {loading && (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-bakery-amber" />
        </div>
      )}
      
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-bakery-brown mb-4">Informações do Pedido</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="orderNumber" className="form-label">Número do Pedido *</label>
                    <Input
                      id="orderNumber"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      required
                      className="form-input"
                      disabled={isViewOnly}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="orderDate" className="form-label">Data do Pedido *</label>
                    <DateInput
                      id="orderDate"
                      value={orderDate}
                      onChange={(value) => setOrderDate(value)}
                      required
                      className="form-input"
                      disabled={isViewOnly}
                    />
                  </div>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-bakery-brown">Receitas para Produzir</h2>
                  
                  <Button 
                    variant="outline" 
                    onClick={openMaterialsList}
                    className="flex items-center"
                  >
                    <List className="h-4 w-4 mr-2" />
                    Ver Lista de Materiais
                  </Button>
                </div>
                
                {!isViewOnly && (
                  <div className="mb-6 border-b pb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <label htmlFor="recipeId" className="form-label">Receita *</label>
                        <Select 
                          value={newRecipeId} 
                          onValueChange={setNewRecipeId}
                        >
                          <SelectTrigger className="form-input">
                            <SelectValue placeholder="Selecione uma receita" />
                          </SelectTrigger>
                          <SelectContent>
                            {recipes.map(recipe => (
                              <SelectItem key={recipe.id} value={recipe.id}>
                                {recipe.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="quantity" className="form-label">Quantidade *</label>
                        <Input
                          id="quantity"
                          type="number"
                          step="0.01"
                          min="0"
                          value={newRecipeQuantity}
                          onChange={(e) => setNewRecipeQuantity(e.target.value)}
                          className="form-input"
                          placeholder="0.00"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="unit" className="form-label">Unidade *</label>
                        <Select 
                          value={newRecipeUnit} 
                          onValueChange={(value) => setNewRecipeUnit(value as 'kg' | 'un')}
                        >
                          <SelectTrigger className="form-input">
                            <SelectValue placeholder="Unidade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="un">unidades</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleAddRecipe} 
                      className="mt-4 bg-bakery-amber hover:bg-bakery-brown text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Receita
                    </Button>
                  </div>
                )}
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receita</TableHead>
                        <TableHead>Quantidade (kg)</TableHead>
                        <TableHead>Quantidade (un)</TableHead>
                        {!isViewOnly && <TableHead className="w-16"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderRecipes.length > 0 ? (
                        orderRecipes.map((orderRecipe) => (
                          <TableRow 
                            key={orderRecipe.id}
                            className={orderRecipe.fromCalendar ? "bg-amber-50 border-l-4 border-amber-500" : ""}
                          >
                            <TableCell className="font-medium">
                              {orderRecipe.fromCalendar && (
                                <span className="inline-block bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded mr-2">
                                  Calendário
                                </span>
                              )}
                              {orderRecipe.recipeName}
                            </TableCell>
                            <TableCell>
                              {orderRecipe.unit === 'kg' 
                                ? <span className="font-semibold">{orderRecipe.quantity.toFixed(2)} kg</span>
                                : <span>{orderRecipe.convertedQuantity.toFixed(2)} kg</span>
                              }
                            </TableCell>
                            <TableCell>
                              {orderRecipe.unit === 'un' 
                                ? <span className="font-semibold">{orderRecipe.quantity.toFixed(0)} un</span>
                                : <span>{orderRecipe.convertedQuantity.toFixed(0)} un</span>
                              }
                            </TableCell>
                            {!isViewOnly && (
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red-500 hover:text-red-700" 
                                  onClick={() => removeRecipe(orderRecipe.id)}
                                >
                                  <Trash size={16} />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={isViewOnly ? 3 : 4} className="text-center py-4 text-gray-500">
                            Nenhuma receita adicionada.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </Card>
          </div>
          
          <div>
            <Card>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-bakery-brown mb-4">Ações</h2>
                
                <div className="space-y-4">
                  <Button 
                    onClick={openMaterialsList}
                    variant="outline" 
                    className="w-full"
                    disabled={orderRecipes.length === 0}
                  >
                    <List className="h-4 w-4 mr-2" />
                    Ver Lista de Materiais
                  </Button>
                  
                  {isEditing ? (
                    <>
                      {orderStatus === 'pending' && (
                        <Button 
                          onClick={() => handleStatusUpdate('in_progress')}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <ArrowLeft className="h-4 w-4 mr-2" />
                          )}
                          Iniciar Produção
                        </Button>
                      )}
                      
                      {orderStatus === 'in_progress' && (
                        <Button 
                          onClick={() => navigate(`/production-confirmation/${id}`)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirmar Produção
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button 
                      onClick={handleSave}
                      className="w-full bg-bakery-amber hover:bg-bakery-brown text-white"
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Salvar Pedido
                    </Button>
                  )}
                  
                  {!isViewOnly && (
                    <div className="p-4 border border-dashed border-yellow-300 bg-yellow-50 rounded-md">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-yellow-800 font-medium mb-1">
                            Lembrete
                          </p>
                          <p className="text-xs text-yellow-700">
                            Este pedido ficará com status "Pendente" até que seja iniciada a produção.
                            Após concluir a produção, registre na tela de "Confirmação de Produção".
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
      
      <Dialog open={showMaterialsList} onOpenChange={setShowMaterialsList}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Lista de Materiais Consolidada</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {loadingMaterials ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-bakery-amber" />
                <span className="ml-2">Calculando materiais...</span>
              </div>
            ) : materials.length === 0 ? (
              <div className="text-center p-4">
                <p>Nenhum material encontrado para as receitas selecionadas.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  Esta lista representa a quantidade total de ingredientes necessários para todas as receitas deste pedido.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingrediente</TableHead>
                      <TableHead>Quantidade Total</TableHead>
                      <TableHead>Unidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((material) => (
                      <TableRow key={material.id}>
                        <TableCell className="font-medium">{material.name}</TableCell>
                        <TableCell>{material.totalQuantity.toFixed(2)}</TableCell>
                        <TableCell>{material.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
            
          <div className="mt-4 flex justify-end">
            <Button 
              onClick={() => setShowMaterialsList(false)} 
              className="bg-bakery-amber hover:bg-bakery-amber/90 text-white"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
