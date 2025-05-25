import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Settings2, GripVertical, Eye, EyeOff } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from './dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from "./use-toast";
import { useToast } from "./use-toast";

// Tipos
export interface ColumnDef {
  id: string;
  header: React.ReactNode;
  accessorFn?: (row: any) => any;
  cell?: (row: any) => React.ReactNode;
  className?: string;
  hidden?: boolean;
}

interface ColumnConfig {
  id: string;
  order: number;
  hidden: boolean;
}

interface TableConfig {
  columns: ColumnConfig[];
}

interface DraggableTableProps {
  tableId: string;
  columns: ColumnDef[];
  data: any[];
  isLoading?: boolean;
  emptyMessage?: string;
  renderRowActions?: (row: any) => React.ReactNode;
  onRowClick?: (row: any) => void;
  className?: string;
}

export const DraggableTable: React.FC<DraggableTableProps> = ({
  tableId,
  columns: initialColumns,
  data,
  isLoading = false,
  emptyMessage = "Nenhum dado encontrado",
  renderRowActions,
  onRowClick,
  className,
}) => {
  const { user } = useAuth();
  const [columns, setColumns] = useState<ColumnDef[]>([...initialColumns]);
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(false);

  // Carregar configuração salva
  useEffect(() => {
    if (user) {
      loadTableConfig();
    }
  }, [user, tableId]);

  // Função para salvar configuração no localStorage
  const saveToLocalStorage = (config: ColumnConfig[]) => {
    try {
      localStorage.setItem(`table_config_${user?.id}_${tableId}`, JSON.stringify(config));
    } catch (error) {
      console.error('Erro ao salvar no localStorage:', error);
    }
  };

  // Função para carregar configuração do localStorage
  const loadFromLocalStorage = (): ColumnConfig[] | null => {
    try {
      const savedConfig = localStorage.getItem(`table_config_${user?.id}_${tableId}`);
      if (savedConfig) {
        return JSON.parse(savedConfig);
      }
    } catch (error) {
      console.error('Erro ao carregar do localStorage:', error);
    }
    return null;
  };

  // Aplicar configuração às colunas
  const applyConfig = (savedConfig: ColumnConfig[]) => {
    // Aplicar configuração salva
    const newColumns = [...initialColumns];
    
    // Aplicar ordem e visibilidade
    const orderedColumns = savedConfig
      .map(config => {
        const column = newColumns.find(col => col.id === config.id);
        if (column) {
          return {
            ...column,
            hidden: config.hidden
          };
        }
        return null;
      })
      .filter(Boolean) as ColumnDef[];
    
    // Adicionar colunas que não estavam na configuração salva
    const savedColumnIds = savedConfig.map(c => c.id);
    const newColumnsNotInConfig = newColumns.filter(col => !savedColumnIds.includes(col.id));
    
    setColumns([...orderedColumns, ...newColumnsNotInConfig]);
  };

  const loadTableConfig = async () => {
    try {
      setIsConfigLoading(true);
      
      // Tentar carregar do banco de dados primeiro
      try {
        // @ts-ignore - Ignorar erro de tipo, pois a tabela pode não existir ainda
        const { data, error } = await supabase
          .from('user_table_configs')
          .select('config')
          .eq('user_id', user?.id)
          .eq('table_id', tableId)
          .single();

        // Se encontrou configuração no banco de dados, usar ela
        if (!error && data && 'config' in data) {
          const savedConfig = data.config as ColumnConfig[];
          applyConfig(savedConfig);
          return;
        }
        
        // Se o erro for que a tabela não existe, usar localStorage
        if (error && error.code === '42P01') { // Tabela não existe
          // Tentar carregar do localStorage
          const localConfig = loadFromLocalStorage();
          if (localConfig) {
            applyConfig(localConfig);
            return;
          }
        } else if (error && error.code !== 'PGRST116') { // PGRST116 = not found
          console.error('Erro ao carregar configuração:', error);
        }
      } catch (dbError) {
        console.error('Erro ao acessar banco de dados:', dbError);
        
        // Tentar carregar do localStorage como fallback
        const localConfig = loadFromLocalStorage();
        if (localConfig) {
          applyConfig(localConfig);
          return;
        }
      }
    } catch (error) {
      console.error('Erro ao processar configuração:', error);
    } finally {
      setIsConfigLoading(false);
    }
  };

  const { toast: showToast } = useToast();

  const saveTableConfig = async () => {
    if (!user) return;

    try {
      setIsConfigLoading(true);
      
      const config: ColumnConfig[] = columns.map((col, index) => ({
        id: col.id,
        order: index,
        hidden: !!col.hidden
      }));

      // Salvar no localStorage como fallback
      saveToLocalStorage(config);

      // Tentar salvar no banco de dados
      try {
        // Verificar se já existe uma configuração
        // @ts-ignore - Ignorar erro de tipo, pois a tabela pode não existir ainda
        const { data, error } = await supabase
          .from('user_table_configs')
          .select('id')
          .eq('user_id', user.id)
          .eq('table_id', tableId)
          .single();

        // Se a tabela não existir, apenas usar o localStorage
        if (error && error.code === '42P01') {
          showToast({
            title: "Configuração salva localmente",
            description: "Suas preferências foram salvas no navegador.",
          });
          return;
        }

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao verificar configuração existente:', error);
          showToast({
            title: "Configuração salva localmente",
            description: "Suas preferências foram salvas apenas no navegador devido a um erro no servidor.",
          });
          return;
        }

        if (data?.id) {
          // Atualizar configuração existente
          // @ts-ignore - Ignorar erro de tipo, pois a tabela pode não existir ainda
          const { error: updateError } = await supabase
            .from('user_table_configs')
            .update({
              config,
              updated_at: new Date().toISOString()
            })
            .eq('id', data.id);

          if (updateError) {
            console.error('Erro ao atualizar configuração:', updateError);
            showToast({
              title: "Configuração salva localmente",
              description: "Suas preferências foram salvas apenas no navegador devido a um erro no servidor.",
              variant: "destructive",
            });
            return;
          }
        } else {
          // Criar nova configuração
          // @ts-ignore - Ignorar erro de tipo, pois a tabela pode não existir ainda
          const { error: insertError } = await supabase
            .from('user_table_configs')
            .insert({
              user_id: user.id,
              table_id: tableId,
              config,
              company_id: user.user_metadata?.company_id || ''
            });

          if (insertError) {
            console.error('Erro ao criar configuração:', insertError);
            showToast({
              title: "Configuração salva localmente",
              description: "Suas preferências foram salvas apenas no navegador devido a um erro no servidor.",
              variant: "destructive",
            });
            return;
          }
        }

        showToast({
          title: "Configuração salva",
          description: "Suas preferências de tabela foram salvas com sucesso.",
        });
      } catch (dbError) {
        console.error('Erro ao salvar no banco de dados:', dbError);
        showToast({
          title: "Configuração salva localmente",
          description: "Suas preferências foram salvas apenas no navegador devido a um erro no servidor.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: "Erro ao salvar configuração",
        description: "Ocorreu um erro ao salvar suas preferências.",
        variant: "destructive",
      });
    } finally {
      setIsConfigLoading(false);
      setShowConfigMenu(false);
    }
  };

  // Manipular reordenação de colunas
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(columns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setColumns(items);
  };

  // Alternar visibilidade da coluna
  const toggleColumnVisibility = (columnId: string) => {
    setColumns(prev => 
      prev.map(col => 
        col.id === columnId 
          ? { ...col, hidden: !col.hidden } 
          : col
      )
    );
  };

  // Filtrar colunas visíveis
  const visibleColumns = columns.filter(col => !col.hidden);

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
                      {columns.map((col, index) => (
                        <Draggable key={`col-${col.id}`} draggableId={`col-${col.id}`} index={index}>
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
                                <span className="text-sm">
                                  {typeof col.header === 'string' ? col.header : col.id}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleColumnVisibility(col.id)}
                                title={col.hidden ? "Mostrar coluna" : "Ocultar coluna"}
                              >
                                {col.hidden ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
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
              <Button 
                onClick={saveTableConfig} 
                className="w-full"
                disabled={isConfigLoading}
              >
                {isConfigLoading ? "Salvando..." : "Salvar Configuração"}
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className={`relative w-full overflow-auto ${className || ''}`}>
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column.id}
                  className={`h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 ${column.className || ''}`}
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
                  colSpan={visibleColumns.length + (renderRowActions ? 1 : 0)}
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
                  colSpan={visibleColumns.length + (renderRowActions ? 1 : 0)}
                  className="p-4 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {visibleColumns.map((column) => (
                    <td
                      key={`${rowIndex}-${column.id}`}
                      className="p-4 align-middle [&:has([role=checkbox])]:pr-0"
                    >
                      {column.cell
                        ? column.cell(row)
                        : column.accessorFn
                        ? column.accessorFn(row)
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
