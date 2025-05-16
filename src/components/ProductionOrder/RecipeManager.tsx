
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { List, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RecipeList from "./RecipeList";
import QuantityInput from "./QuantityInput";
import { Recipe } from "@/services/recipeService";
import { useToast } from "@/hooks/use-toast";

export interface OrderRecipe {
  id: string;
  recipeId: string | null;
  recipeName: string;
  quantity: number;
  unit: 'kg' | 'un';
  convertedQuantity: number;
  fromCalendar?: boolean;
}

interface RecipeManagerProps {
  recipes: Recipe[];
  orderRecipes: OrderRecipe[];
  setOrderRecipes: React.Dispatch<React.SetStateAction<OrderRecipe[]>>;
  isViewOnly: boolean;
  onOpenMaterialsList: () => void;
  onOpenPreWeighingList: () => void;
}

export default function RecipeManager({
  recipes,
  orderRecipes,
  setOrderRecipes,
  isViewOnly,
  onOpenMaterialsList
}: RecipeManagerProps) {
  const [newRecipeId, setNewRecipeId] = useState('');
  const [newRecipeQuantity, setNewRecipeQuantity] = useState('');
  const [newRecipeUnit, setNewRecipeUnit] = useState<'kg' | 'un'>('kg');
  
  const { toast } = useToast();

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

  return (
    <Card>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-bakery-brown">Receitas para Produzir</h2>
          
          <Button 
            variant="outline" 
            onClick={onOpenMaterialsList}
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
              
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="quantity" className="form-label">Quantidade *</label>
                <QuantityInput
                  quantity={newRecipeQuantity}
                  unit={newRecipeUnit}
                  onQuantityChange={setNewRecipeQuantity}
                  onUnitChange={setNewRecipeUnit}
                />
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
        
        <RecipeList 
          orderRecipes={orderRecipes} 
          onRemoveRecipe={removeRecipe} 
          isViewOnly={isViewOnly} 
          onQuantityChange={(id, value, field) => {
            setOrderRecipes(orderRecipes => orderRecipes.map(r =>
              r.id === id
                ? { ...r, quantity: field === 'kg' || field === 'un' ? value : r.quantity }
                : r
            ));
          }}
        />
      </div>
    </Card>
  );
}
