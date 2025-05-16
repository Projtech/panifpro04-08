import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface PreWeighingSubRecipe {
  id: string;
  name: string;
  standardYield: number;
  neededAmount: number;
  recipeCount: number;
  unit: string;
}

export interface PreWeighingRawMaterial {
  id: number;
  name: string;
  totalAmount: number;
  unit: string;
}

interface PreWeighingCalculatorProps {
  showPreWeighingList: boolean;
  setShowPreWeighingList: (show: boolean) => void;
  subRecipes: PreWeighingSubRecipe[];
  rawMaterials: PreWeighingRawMaterial[];
  loadingPreWeighing: boolean;
}

export default function PreWeighingCalculator({
  showPreWeighingList,
  setShowPreWeighingList,
  subRecipes,
  rawMaterials,
  loadingPreWeighing
}: PreWeighingCalculatorProps) {
  // Função para formatar o número de receitas (ex: 2.4 receitas)
  const formatRecipeCount = (count: number) => {
    return count.toFixed(2);
  };

  return (
    <Dialog open={showPreWeighingList} onOpenChange={setShowPreWeighingList}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Lista de Pré-Pesagem</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          {loadingPreWeighing ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-bakery-amber" />
              <span className="ml-2">Calculando pré-pesagem...</span>
            </div>
          ) : (subRecipes.length === 0 && rawMaterials.length === 0) ? (
            <div className="text-center p-4">
              <p>Nenhum item encontrado para as receitas selecionadas.</p>
            </div>
          ) : (
            <>
              {/* Seção de Sub-receitas */}
              {subRecipes.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-bakery-brown mb-4">Sub-receitas</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sub-receita</TableHead>
                        <TableHead className="text-right">Quantidade</TableHead>
                        <TableHead>Unidade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subRecipes.map((subRecipe) => (
                        <TableRow key={subRecipe.id}>
                          <TableCell className="font-medium">{subRecipe.name}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatRecipeCount(subRecipe.recipeCount)}
                          </TableCell>
                          <TableCell>receitas</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Seção de Matérias-primas */}
              {rawMaterials.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-bakery-brown mb-4">Matérias-primas</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ingrediente</TableHead>
                        <TableHead className="text-right">Quantidade Total</TableHead>
                        <TableHead>Unidade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rawMaterials.map((material) => (
                        <TableRow key={material.id}>
                          <TableCell className="font-medium">{material.name}</TableCell>
                          <TableCell className="text-right">{material.totalAmount.toFixed(2)}</TableCell>
                          <TableCell>{material.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </div>
          
        <div className="mt-4 flex justify-end">
          <Button 
            onClick={() => setShowPreWeighingList(false)} 
            className="bg-bakery-amber hover:bg-bakery-amber/90 text-white"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
