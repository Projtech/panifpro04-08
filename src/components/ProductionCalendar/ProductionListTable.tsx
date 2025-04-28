import { Loader2, FileEdit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ProductionList } from "@/services/productionListService";
import ProductionListActions from "./ProductionListActions";

// Interface para representar as listas de produção com seus itens
interface ProductionListWithItems extends ProductionList {
  items?: any[];
}

interface ProductionListTableProps {
  lists: ProductionList[];
  isLoading: boolean;
  error: Error | null;
  onRowClick?: (list: ProductionList) => void;
  onEditList?: (list: ProductionListWithItems) => void;
  onDeleteList?: (list: ProductionList) => void;
  onGenerateOrder?: (list: ProductionListWithItems) => void;
  onExportPDF?: (list: ProductionListWithItems) => void;
  onExportExcel?: (list: ProductionListWithItems) => void;
}

/**
 * Componente para exibir uma tabela com listas de produção
 */
export default function ProductionListTable({
  lists,
  isLoading,
  error,
  onRowClick,
  onEditList,
  onDeleteList,
  onGenerateOrder,
  onExportPDF,
  onExportExcel
}: ProductionListTableProps) {
  // Função para formatar a data
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch (error) {
      return dateString;
    }
  };

  // Função para obter o texto do tipo de lista
  const getListTypeText = (type: 'daily' | 'custom') => {
    return type === 'daily' ? 'Diária' : 'Personalizada';
  };

  // Função para obter a classe CSS com base no tipo da lista
  const getListTypeClass = (type: 'daily' | 'custom') => {
    return type === 'daily' 
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' 
      : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300';
  };

  // Se estiver carregando, mostrar indicador de carregamento
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando listas...</span>
      </div>
    );
  }

  // Se houver erro, mostrar mensagem de erro
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 my-4">
        <p className="text-red-800 font-medium">Erro ao carregar listas</p>
        <p className="text-red-600">{error.message}</p>
      </div>
    );
  }

  // Se não houver listas, mostrar mensagem
  if (lists.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhuma lista de produção encontrada.</p>
      </div>
    );
  }

  // Renderizar a tabela com as listas
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Criada em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lists.map((list) => (
            <TableRow 
              key={list.id}
              onClick={() => onRowClick && onRowClick(list)}
              className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
            >
              <TableCell className="font-medium">{list.name}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getListTypeClass(list.type)}`}>
                  {getListTypeText(list.type)}
                </span>
              </TableCell>
              <TableCell>{formatDate(list.created_at)}</TableCell>
              <TableCell className="text-right">
                {/* Importar e usar o componente ProductionListActions */}
                <ProductionListActions 
                  list={list as any}
                  onEdit={onEditList}
                  onDelete={onDeleteList}
                  onExportPDF={onExportPDF}
                  onExportExcel={onExportExcel}
                  onGenerateOrder={onGenerateOrder}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
