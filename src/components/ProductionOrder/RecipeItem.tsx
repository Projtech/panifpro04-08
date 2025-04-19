
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { OrderRecipe } from "./RecipeManager";

interface RecipeItemProps {
  orderRecipe: OrderRecipe;
  onRemove: (id: string) => void;
  isViewOnly: boolean;
}

export default function RecipeItem({ 
  orderRecipe, 
  onRemove, 
  isViewOnly 
}: RecipeItemProps) {
  return (
    <tr className={orderRecipe.fromCalendar ? "bg-amber-50 border-l-4 border-amber-500" : ""}>
      <td className="p-4 font-medium">
        {orderRecipe.fromCalendar && (
          <span className="inline-block bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded mr-2">
            Calendário
          </span>
        )}
        {orderRecipe.recipeName}
      </td>
      <td className="p-4">
        {orderRecipe.unit === 'kg' 
          ? <span className="font-semibold">{orderRecipe.quantity.toFixed(2)} kg</span>
          : <span>{orderRecipe.convertedQuantity.toFixed(2)} kg</span>
        }
      </td>
      <td className="p-4">
        {orderRecipe.unit === 'un' 
          ? <span className="font-semibold">{orderRecipe.quantity.toFixed(0)} un</span>
          : <span>{orderRecipe.convertedQuantity.toFixed(0)} un</span>
        }
      </td>
      {!isViewOnly && (
        <td className="p-4 w-16">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-500 hover:text-red-700" 
            onClick={() => onRemove(orderRecipe.id)}
          >
            <Trash size={16} />
          </Button>
        </td>
      )}
    </tr>
  );
}
