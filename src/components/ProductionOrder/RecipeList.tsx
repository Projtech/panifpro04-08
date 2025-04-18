
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { OrderRecipe } from "./RecipeManager";

interface RecipeListProps {
  orderRecipes: OrderRecipe[];
  onRemoveRecipe: (id: string) => void;
  isViewOnly: boolean;
}

export default function RecipeList({ 
  orderRecipes, 
  onRemoveRecipe, 
  isViewOnly 
}: RecipeListProps) {
  return (
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
                      onClick={() => onRemoveRecipe(orderRecipe.id)}
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
  );
}
