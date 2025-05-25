import { Play, FileText, Download, Pencil, Trash, FileSpreadsheet, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  ProductionList, 
  ProductionListItemWithDetails 
} from "@/services/productionListService";
import { exportToProductionControlExcel } from "@/services/productionControlExport";

// Interface estendida para incluir os itens
interface ProductionListWithItems extends ProductionList {
  items?: ProductionListItemWithDetails[];
  company_id: string; // Adicionar propriedade company_id
}

interface ProductionListActionsProps {
  list: ProductionListWithItems;
  onGenerateOrder?: (list: ProductionListWithItems) => void;
  onExportPDF?: (list: ProductionListWithItems) => void;
  onExportExcel?: (list: ProductionListWithItems) => void;
  onExportProductionControl?: (list: ProductionListWithItems) => void;
  onEdit?: (list: ProductionListWithItems) => void;
  onDelete?: (list: ProductionListWithItems) => void;
  onViewWorkload?: (list: ProductionListWithItems) => void;
}

export default function ProductionListActions({
  list,
  onGenerateOrder,
  onExportPDF,
  onExportExcel,
  onExportProductionControl,
  onEdit,
  onDelete,
  onViewWorkload,
}: ProductionListActionsProps) {
  // Verificar se a lista tem itens
  const hasItems = list.items && list.items.length > 0;
  
  // Verificar se é uma lista personalizada
  const isCustomList = list.type === 'custom';

  return (
    <div className="flex items-center space-x-1 justify-end">
      {/* Botão para visualizar carga de trabalho por setor */}
      {onViewWorkload && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onViewWorkload(list)}
          title="Visualizar Carga de Trabalho por Setor"
        >
          <BarChart className="h-4 w-4" />
        </Button>
      )}
      
      {/* Botão para gerar pedido de produção */}
      {onGenerateOrder && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onGenerateOrder(list)}
          title="Gerar Pedido de Produção"
        >
          <Play className="h-4 w-4 text-green-600" />
        </Button>
      )}

      {/* Botão para exportar PDF */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onExportPDF?.(list)}
        title="Exportar para PDF"
      >
        <FileText className="h-4 w-4 text-blue-600" />
      </Button>
      
      {/* Botão de programação de PDF removido */}

      {/* Botão para exportar Excel */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onExportExcel?.(list)}
        title="Exportar para Excel"
      >
        <Download className="h-4 w-4 text-green-700" />
      </Button>

      {/* Botão para exportar Controle de Produção */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          if (onExportProductionControl) {
            onExportProductionControl(list);
          } else {
            // Exportar diretamente se não houver handler
            exportToProductionControlExcel(list.id, list.name, list.company_id);
          }
        }}
        title="Exportar Controle de Produção"
      >
        <FileSpreadsheet className="h-4 w-4 text-purple-600" />
      </Button>

      {/* Botões de edição e exclusão só para listas personalizadas */}
      {isCustomList && (
        <>
          {/* Botão para editar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit?.(list)}
            title="Editar Lista"
          >
            <Pencil className="h-4 w-4 text-amber-600" />
          </Button>

          {/* Botão para excluir com confirmação */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                title="Excluir Lista"
              >
                <Trash className="h-4 w-4 text-red-600" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir a lista "{list.name}"?
                  Esta ação não pode ser desfeita e todos os itens associados serão removidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete?.(list)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
      
      {/* Modal de programação de PDF removido */}
    </div>
  );
}
