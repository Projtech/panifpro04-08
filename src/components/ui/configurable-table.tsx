import * as React from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Settings2, GripVertical, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Checkbox } from "./checkbox";
import { useTableConfig, ColumnConfig, TableConfig } from "@/contexts/TableConfigContext";
import { toast } from "./use-toast";

// Tipos para as colunas configuráveis
export interface ConfigurableColumn {
  id: string;
  header: React.ReactNode;
  accessorKey?: string;
  cell?: (props: any) => React.ReactNode;
  className?: string;
}

interface ConfigurableTableProps {
  tableId: string;
  columns: ConfigurableColumn[];
  data: any[];
  isLoading?: boolean;
  emptyMessage?: string;
  renderRowActions?: (row: any) => React.ReactNode;
  onRowClick?: (row: any) => void;
  className?: string;
}

export const ConfigurableTable: React.FC<ConfigurableTableProps> = ({
  tableId,
  columns,
  data,
  isLoading = false,
  emptyMessage = "Nenhum dado encontrado",
  renderRowActions,
  onRowClick,
  className,
}) => {
  const { getTableConfig, saveTableConfig } = useTableConfig();
  const [columnConfig, setColumnConfig] = React.useState<ColumnConfig[]>([]);
  const [showConfigMenu, setShowConfigMenu] = React.useState(false);

  // Inicializar configuração de colunas
  React.useEffect(() => {
    const savedConfig = getTableConfig(tableId);
    if (savedConfig) {
      // Usar configuração salva
      setColumnConfig(savedConfig.columns);
    } else {
      // Criar configuração padrão
      const defaultConfig = columns.map((col, index) => ({
        id: col.id,
        label: typeof col.header === 'string' ? col.header : col.id,
        visible: true,
        order: index
      }));
      setColumnConfig(defaultConfig);
    }
  }, [tableId, columns, getTableConfig]);

  // Salvar configuração quando alterada
  const handleSaveConfig = async () => {
    try {
      await saveTableConfig({
        tableId,
        columns: columnConfig
      });
      toast({
        title: "Configuração salva",
        description: "Suas preferências de tabela foram salvas com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao salvar configuração:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar suas preferências.",
        variant: "destructive",
      });
    }
  };

  // Manipular reordenação de colunas
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(columnConfig);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Atualizar ordem
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));
    
    setColumnConfig(updatedItems);
  };

  // Alternar visibilidade da coluna
  const toggleColumnVisibility = (columnId: string) => {
    setColumnConfig(prev => 
      prev.map(col => 
        col.id === columnId 
          ? { ...col, visible: !col.visible } 
          : col
      )
    );
  };

  // Ordenar colunas pela ordem configurada
  const sortedColumns = React.useMemo(() => {
    if (!columnConfig.length) return columns;
    
    return [...columnConfig]
      .sort((a, b) => a.order - b.order)
      .filter(col => col.visible)
      .map(config => {
        return columns.find(col => col.id === config.id);
      })
      .filter(Boolean) as ConfigurableColumn[];
  }, [columns, columnConfig]);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <DropdownMenu open={showConfigMenu} onOpenChange={setShowConfigMenu}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="h-4 w-4 mr-1" />
              Configurar Tabela
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[300px]">
            <div className="p-2">
              <h3 className="font-medium mb-2">Personalizar Colunas</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Arraste para reordenar ou oculte colunas indesejadas
              </p>
              
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="columns">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-1"
                    >
                      {[...columnConfig]
                        .sort((a, b) => a.order - b.order)
                        .map((col, index) => (
                          <Draggable key={col.id} draggableId={col.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="flex items-center justify-between p-2 rounded-md border bg-background"
                              >
                                <div className="flex items-center">
                                  <div {...provided.dragHandleProps} className="mr-2 cursor-grab">
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <span className="text-sm">{col.label}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleColumnVisibility(col.id)}
                                  title={col.visible ? "Ocultar coluna" : "Mostrar coluna"}
                                >
                                  {col.visible ? (
                                    <Eye className="h-4 w-4" />
                                  ) : (
                                    <EyeOff className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button onClick={handleSaveConfig} className="w-full">
                Salvar Configuração
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className={cn("relative w-full overflow-auto", className)}>
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr>
              {sortedColumns.map((column) => (
                <th
                  key={column.id}
                  className={cn(
                    "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
              {renderRowActions && <th className="w-16"></th>}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {isLoading ? (
              <tr>
                <td
                  colSpan={sortedColumns.length + (renderRowActions ? 1 : 0)}
                  className="p-4 text-center"
                >
                  <div className="flex justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={sortedColumns.length + (renderRowActions ? 1 : 0)}
                  className="p-4 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={cn(
                    "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {sortedColumns.map((column) => (
                    <td
                      key={`${rowIndex}-${column.id}`}
                      className="p-4 align-middle [&:has([role=checkbox])]:pr-0"
                    >
                      {column.cell
                        ? column.cell(row)
                        : column.accessorKey
                        ? row[column.accessorKey]
                        : null}
                    </td>
                  ))}
                  {renderRowActions && (
                    <td className="p-4 text-right">{renderRowActions(row)}</td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
