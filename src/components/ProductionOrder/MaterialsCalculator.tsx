
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Printer } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getProductionOrder } from "@/services/productionOrderService";
import { useAuth } from "@/contexts/AuthContext";

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
  const { id } = useParams<{ id: string }>();
  const { activeCompany } = useAuth();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  
  // Buscar detalhes do pedido quando o modal for aberto
  useEffect(() => {
    if (showMaterialsList && id && activeCompany?.id) {
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
  }, [showMaterialsList, id, activeCompany?.id]);
  
  // Função para gerar o PDF
  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Configuração do cabeçalho
    doc.setFontSize(18);
    doc.text("Lista de Materiais Consolidada", 105, 15, { align: "center" });
    
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
    
    // Adicionar lista de materiais
    const materialsStartY = orderDetails?.items?.length > 0 ? (doc as any).lastAutoTable.finalY + 15 : 65;
    doc.setFontSize(14);
    doc.text("Lista de Materiais", 14, materialsStartY - 5);
    
    if (materials.length > 0) {
      autoTable(doc, {
        startY: materialsStartY,
        head: [['Ingrediente', 'Quantidade Total', 'Unidade']],
        body: materials.map(material => [
          material.name,
          material.totalQuantity.toFixed(2),
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
    doc.save(`materiais-pedido-${orderDetails?.order_number || id}.pdf`);
  };
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
              <div className="max-h-[400px] overflow-y-auto pr-2">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
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
              </div>
            </>
          )}
        </div>
          
        <div className="mt-4 flex justify-end space-x-2">
          <Button 
            onClick={generatePDF} 
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={loadingMaterials || loadingOrderDetails}
          >
            <Printer className="mr-2 h-4 w-4" />
            Imprimir PDF
          </Button>
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
