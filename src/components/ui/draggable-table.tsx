import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Settings2, RotateCcw, GripVertical } from 'lucide-react';
import { Checkbox } from './checkbox';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
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
  minWidth?: string;
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
  const { toast: showToast } = useToast();

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
        const { data, error: fetchConfigError } = await supabase
          .from('user_table_configs')
          .select('config')
          .eq('user_id', user?.id)
          .eq('table_id', tableId)
          .maybeSingle();

        if (fetchConfigError) {
          console.error('Erro ao carregar configuração do DB (draggable-table.tsx):', {
            message: fetchConfigError.message,
            details: fetchConfigError.details,
            hint: fetchConfigError.hint,
            code: fetchConfigError.code,
            fullError: fetchConfigError 
          });
          // Se houve erro no DB, tentar localStorage como fallback secundário
          const localConfig = loadFromLocalStorage();
          if (localConfig) {
            applyConfig(localConfig);
          } else {
            setColumns([...initialColumns]); // Fallback para colunas iniciais se o localStorage também falhar
          }
          return; // Importante sair aqui após tratar o erro do DB
        }

        // Se data for null (nenhuma config encontrada no DB) ou se data.config for null/undefined
        if (data && data.config) {
          // O tipo correto agora é Database['public']['Tables']['user_table_configs']['Row']
          const savedConfig = data.config as unknown as ColumnConfig[];
          applyConfig(savedConfig);
        } else {
          // Nenhuma config no DB, tentar localStorage como fallback secundário
          const localConfig = loadFromLocalStorage();
          if (localConfig) {
            applyConfig(localConfig);
          } else {
            // Nenhuma config no DB nem no localStorage, usar initialColumns
            setColumns([...initialColumns]);
          }
        }
      } catch (outerError) { // Erro no bloco try/catch externo de loadTableConfig
        console.error('Erro geral ao carregar configuração (draggable-table.tsx):', outerError);
        setColumns([...initialColumns]); // Fallback final para colunas padrão
      }
    } finally {
      setIsConfigLoading(false);
    }
  };

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
    } finally {
      setIsConfigLoading(false);
    }
  };

  // Função para gerenciar mudanças na configuração
  const handleConfigChange = () => {
    // NÃO salvamos automaticamente, apenas quando o usuário clicar em Salvar
  };

  const handleToggleColumn = (columnId: string) => {
    setColumns(prev => 
      prev.map(col => 
        col.id === columnId 
          ? { ...col, hidden: !col.hidden } 
          : col
      )
    );
    handleConfigChange();
  };

  // Função para lidar com a reordenação das colunas
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
      handleConfigChange();
    }
  };

  const resetToDefault = () => {
    setColumns([...initialColumns]);
    showToast({
      title: "Configuração restaurada",
      description: "A tabela foi restaurada para a configuração padrão.",
    });
    handleConfigChange();
  };

  // Componente para cada item ordenável na lista de colunas
  const SortableItem = ({ id, hidden, label, onToggle }: { id: string, hidden: boolean, label: string, onToggle: () => void }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id });
    
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
    
    return (
      <div 
        ref={setNodeRef}
        style={style}
        className={`flex items-center justify-between p-2 rounded-md border ${hidden ? 'bg-muted/50' : 'bg-background'}`}
      >
        <div className="flex items-center gap-2">
          <button 
            {...attributes} 
            {...listeners}
            className="cursor-grab touch-none"
            aria-label="Reordenar coluna"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className={hidden ? 'text-muted-foreground' : 'font-medium'}>
            {label}
          </span>
        </div>
        <Checkbox
          checked={!hidden}
          onCheckedChange={onToggle}
          aria-label={`Mostrar coluna ${label}`}
        />
      </div>
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
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-muted-foreground">
                  Selecione as colunas que deseja exibir
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetToDefault}
                  className="h-8"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Restaurar
                </Button>
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                <DndContext 
                  sensors={useSensors(
                    useSensor(PointerSensor),
                    useSensor(KeyboardSensor, {
                      coordinateGetter: sortableKeyboardCoordinates,
                    })
                  )}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext 
                    items={columns.map(col => col.id)} 
                    strategy={verticalListSortingStrategy}
                  >
                    {columns.map((col) => (
                      <SortableItem 
                        key={col.id} 
                        id={col.id}
                        hidden={!!col.hidden}
                        label={typeof col.header === 'string' ? col.header : col.id}
                        onToggle={() => handleToggleColumn(col.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
              <Button 
                onClick={saveTableConfig} 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white mt-3"
                disabled={isConfigLoading}
              >
                {isConfigLoading ? "Salvando..." : "Salvar Configuração"}
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="w-full overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column.id}
                  className={`p-2 text-left bg-muted ${column.className || ''}`}
                  style={{ minWidth: column.minWidth || 'auto' }}
                >
                  {column.header}
                </th>
              ))}
              {renderRowActions && <th className="w-[100px]"></th>}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
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
                  className={`border-b hover:bg-muted/50 ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {visibleColumns.map((column) => (
                    <td
                      key={`${rowIndex}-${column.id}`}
                      className="p-2"
                    >
                      {column.cell
                        ? column.cell(row)
                        : column.accessorFn
                        ? column.accessorFn(row)
                        : row[column.id]}
                    </td>
                  ))}
                  {renderRowActions && (
                    <td className="p-2 text-right">{renderRowActions(row)}</td>
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
