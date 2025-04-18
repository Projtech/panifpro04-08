
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface MaterialItem {
  id: number;
  name: string;
  totalQuantity: number;
  unit: string;
}

interface MaterialsCalculatorProps {
  showMaterialsList: boolean;
  setShowMaterialsList: (show: boolean) => void;
  materials: MaterialItem[];
  loadingMaterials: boolean;
}

export default function MaterialsCalculator({
  showMaterialsList,
  setShowMaterialsList,
  materials,
  loadingMaterials
}: MaterialsCalculatorProps) {
  return (
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
  );
}
