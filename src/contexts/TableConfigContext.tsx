import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Definição dos tipos
export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

export interface TableConfig {
  tableId: string;
  columns: ColumnConfig[];
}

interface TableConfigContextType {
  getTableConfig: (tableId: string) => TableConfig | null;
  saveTableConfig: (config: TableConfig) => Promise<void>;
  isLoading: boolean;
}

const TableConfigContext = createContext<TableConfigContextType | undefined>(undefined);

export const useTableConfig = () => {
  const context = useContext(TableConfigContext);
  if (!context) {
    throw new Error('useTableConfig must be used within a TableConfigProvider');
  }
  return context;
};

export const TableConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tableConfigs, setTableConfigs] = useState<Record<string, TableConfig>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Carregar as configurações de tabela do usuário
  useEffect(() => {
    if (user) {
      loadUserTableConfigs();
    } else {
      setTableConfigs({});
      setIsLoading(false);
    }
  }, [user]);

  const loadUserTableConfigs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_table_configs')
        .select('*')
        .eq('user_id', user?.id);

      if (error) {
        console.error('Erro ao carregar configurações de tabela:', error);
        setIsLoading(false);
        return;
      }

      const configs: Record<string, TableConfig> = {};
      data?.forEach(item => {
        configs[item.table_id] = {
          tableId: item.table_id,
          columns: item.config
        };
      });

      setTableConfigs(configs);
    } catch (error) {
      console.error('Erro ao processar configurações de tabela:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTableConfig = (tableId: string): TableConfig | null => {
    return tableConfigs[tableId] || null;
  };

  const saveTableConfig = async (config: TableConfig): Promise<void> => {
    if (!user) return;

    try {
      // Verificar se já existe uma configuração para esta tabela
      const { data, error } = await supabase
        .from('user_table_configs')
        .select('id')
        .eq('user_id', user.id)
        .eq('table_id', config.tableId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Erro ao verificar configuração existente:', error);
        return;
      }

      if (data?.id) {
        // Atualizar configuração existente
        const { error: updateError } = await supabase
          .from('user_table_configs')
          .update({
            config: config.columns,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id);

        if (updateError) {
          console.error('Erro ao atualizar configuração:', updateError);
          return;
        }
      } else {
        // Criar nova configuração
        const { error: insertError } = await supabase
          .from('user_table_configs')
          .insert({
            user_id: user.id,
            table_id: config.tableId,
            config: config.columns,
            company_id: user.user_metadata?.company_id || ''
          });

        if (insertError) {
          console.error('Erro ao criar configuração:', insertError);
          return;
        }
      }

      // Atualizar o estado local
      setTableConfigs(prev => ({
        ...prev,
        [config.tableId]: config
      }));
    } catch (error) {
      console.error('Erro ao salvar configuração de tabela:', error);
    }
  };

  return (
    <TableConfigContext.Provider value={{ getTableConfig, saveTableConfig, isLoading }}>
      {children}
    </TableConfigContext.Provider>
  );
};
