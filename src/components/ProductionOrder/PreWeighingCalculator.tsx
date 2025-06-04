import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Printer } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getProductionOrder } from "@/services/productionOrderService";
import { useAuth } from "@/contexts/AuthContext";

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
  parentRecipe?: string; // Nome da receita pai
  is_sub_recipe?: boolean; // Indica se é uma sub-receita
  pattern_count?: number; // Número de padrões para sub-receitas
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
  const { id } = useParams<{ id: string }>();
  const { activeCompany } = useAuth();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  
  // Buscar detalhes do pedido quando o modal for aberto
  useEffect(() => {
    if (showPreWeighingList && id && activeCompany?.id) {
      const fetchOrderDetails = async () => {
        setLoadingOrderDetails(true);
        try {
          const order = await getProductionOrder(id, activeCompany.id);
          setOrderDetails(order);
        } catch (error) {
          console.error("Erro ao buscar detalhes do pedido:", error);
        } finally {
          setLoadingOrderDetails(false);
        }
      };
      
      fetchOrderDetails();
    }
  }, [showPreWeighingList, id, activeCompany?.id]);
  
  // Função para formatar o número de receitas (ex: 2.4 receitas)
  const formatRecipeCount = (count: number) => {
    return count.toFixed(2);
  };
  
  // Função para gerar o PDF
  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Configuração do cabeçalho
    doc.setFontSize(18);
    doc.text("Lista de Pré-Pesagem", 105, 15, { align: "center" });
    
    // Adicionar informações do pedido
    doc.setFontSize(12);
    if (orderDetails) {
      doc.text(`Pedido: #${orderDetails.order_number || 'N/A'}`, 14, 30);
      doc.text(`Data: ${new Date(orderDetails.date).toLocaleDateString() || 'N/A'}`, 14, 38);
      doc.text(`Status: ${orderDetails.status || 'N/A'}`, 14, 46);
      
      // Adicionar tabela de produtos solicitados
      doc.setFontSize(14);
      doc.text("Produtos Solicitados", 14, 54);
      
      if (orderDetails.items && orderDetails.items.length > 0) {
        autoTable(doc, {
          startY: 58,
          head: [['Produto', 'Quantidade', 'Unidade']],
          body: orderDetails.items.map((item: any) => [
            item.recipe_name,
            item.unit === 'kg' ? item.planned_quantity_kg.toFixed(2) : item.planned_quantity_units,
            item.unit
          ]),
          theme: 'striped',
          headStyles: { fillColor: [217, 119, 6] } // Cor bakery-amber
        });
      }
    }
    
    // Adicionar sub-receitas
    if (subRecipes.length > 0) {
      const productsTableFinalY = orderDetails?.items?.length > 0 ? (doc as any).lastAutoTable.finalY + 10 : 60;
      doc.setFontSize(14);
      doc.text("Sub-receitas", 14, productsTableFinalY);
      
      autoTable(doc, {
        startY: orderDetails?.items?.length > 0 ? (doc as any).lastAutoTable.finalY + 15 : 65,
        head: [['Sub-receita', 'Quantidade', 'Unidade']],
        body: subRecipes.map(recipe => [
          recipe.name,
          formatRecipeCount(recipe.recipeCount),
          'receitas'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [217, 119, 6] } // Cor bakery-amber
      });
    }
    
    // Adicionar matérias-primas
    if (rawMaterials.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 65;
      doc.setFontSize(14);
      doc.text("Matérias-primas", 14, finalY + 15);
      
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Ingrediente', 'Quantidade Total', 'Unidade']],
        body: rawMaterials.map(material => [
          material.name,
          material.totalAmount.toFixed(2),
          material.unit
        ]),
        theme: 'striped',
        headStyles: { fillColor: [217, 119, 6] } // Cor bakery-amber
      });
    }
    
    // Adicionar rodapé
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(
        `Página ${i} de ${pageCount} - Gerado em ${new Date().toLocaleString()}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
    }
    
    // Salvar o PDF
    doc.save(`pre-pesagem-pedido-${orderDetails?.order_number || id}.pdf`);
  };

  return (
    <Dialog open={showPreWeighingList} onOpenChange={setShowPreWeighingList}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Lista de Pré-Pesagem</DialogTitle>
          <DialogDescription>
            Lista de materiais para pré-pesagem dos ingredientes da receita.
          </DialogDescription>
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
                  <div className="max-h-[200px] overflow-y-auto pr-2">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
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
                </div>
              )}

              {/* Seção de Matérias-primas */}
              {rawMaterials.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-bakery-brown mb-4">Lista de Pré-Pesagem</h3>
                  <div className="max-h-[300px] overflow-y-auto pr-2">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead>Receita</TableHead>
                          <TableHead className="text-right">Quantidade</TableHead>
                          <TableHead>Unidade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Agrupar por receita pai */}
                        {rawMaterials
                          .sort((a, b) => {
                            // Primeiro ordenar por receita pai
                            const parentCompare = (a.parentRecipe || '').localeCompare(b.parentRecipe || '');
                            if (parentCompare !== 0) return parentCompare;
                            
                            // Depois, sub-receitas primeiro
                            if (a.is_sub_recipe && !b.is_sub_recipe) return -1;
                            if (!a.is_sub_recipe && b.is_sub_recipe) return 1;
                            
                            // Por fim, ordenar por nome
                            return a.name.localeCompare(b.name);
                          })
                          .map((material) => (
                            <TableRow key={material.id}>
                              <TableCell className="font-medium">{material.name}</TableCell>
                              <TableCell className="text-right">
                                {material.is_sub_recipe && material.pattern_count 
                                  ? `${material.pattern_count} padrões` 
                                  : material.totalAmount.toFixed(2)}
                              </TableCell>
                              <TableCell>{material.is_sub_recipe ? '' : material.unit}</TableCell>
                            </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
          
        <div className="mt-4 flex justify-end space-x-2">
          <Button 
            onClick={generatePDF} 
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={loadingPreWeighing || loadingOrderDetails}
          >
            <Printer className="mr-2 h-4 w-4" />
            Imprimir PDF
          </Button>
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
