
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderRecipe } from "./RecipeManager";
import RecipeItem from "./RecipeItem";

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
              <RecipeItem 
                key={orderRecipe.id}
                orderRecipe={orderRecipe}
                onRemove={onRemoveRecipe}
                isViewOnly={isViewOnly}
              />
            ))
          ) : (
            <TableRow>
              <td colSpan={isViewOnly ? 3 : 4} className="text-center py-4 text-gray-500">
                Nenhuma receita adicionada.
              </td>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
