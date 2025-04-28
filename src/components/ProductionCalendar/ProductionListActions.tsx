import { useState } from "react";
import { Play, FileText, Download, Pencil, Trash } from "lucide-react";
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

// Interface estendida para incluir os itens
interface ProductionListWithItems extends ProductionList {
  items?: ProductionListItemWithDetails[];
}

interface ProductionListActionsProps {
  list: ProductionListWithItems;
  onGenerateOrder?: (list: ProductionListWithItems) => void;
  onExportPDF?: (list: ProductionListWithItems) => void;
  onExportExcel?: (list: ProductionListWithItems) => void;
  onEdit?: (list: ProductionListWithItems) => void;
  onDelete?: (list: ProductionListWithItems) => void;
}

export default function ProductionListActions({
  list,
  onGenerateOrder,
  onExportPDF,
  onExportExcel,
  onEdit,
  onDelete,
}: ProductionListActionsProps) {
  // Verificar se a lista tem itens
  const hasItems = list.items && list.items.length > 0;
  
  // Verificar se é uma lista personalizada
  const isCustomList = list.type === 'custom';

  return (
    <div className="flex items-center space-x-1 justify-end">
      {/* Botão para gerar pedido de produção */}
      <Button
        variant="ghost"
        size="icon"
        disabled={false}
        onClick={() => onGenerateOrder?.(list)}
        title="Gerar Pedido de Produção"
      >
        <Play className="h-4 w-4 text-green-600" />
      </Button>

      {/* Botão para exportar PDF */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onExportPDF?.(list)}
        title="Exportar para PDF"
      >
        <FileText className="h-4 w-4 text-blue-600" />
      </Button>

      {/* Botão para exportar Excel */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onExportExcel?.(list)}
        title="Exportar para Excel"
      >
        <Download className="h-4 w-4 text-green-700" />
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
    </div>
  );
}
