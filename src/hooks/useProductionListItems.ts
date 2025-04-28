import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { 
  getProductionListItems, 
  ProductionListItem 
} from "@/services/productionListService";

interface UseProductionListItemsProps {
  listId?: string | null;
  autoLoad?: boolean;
}

/**
 * Hook para gerenciar o estado e as operações relacionadas aos itens de uma lista de produção
 * @param props.listId - ID da lista de produção (opcional)
 * @param props.autoLoad - Se deve carregar os itens automaticamente quando o listId é fornecido
 * @returns Estado e funções para gerenciar itens de uma lista de produção
 */
export default function useProductionListItems({ 
  listId = null, 
  autoLoad = true 
}: UseProductionListItemsProps = {}) {
  // Estado para armazenar os itens da lista
  const [items, setItems] = useState<ProductionListItem[]>([]);
  
  // Estados para loading e error
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Função para buscar os itens de uma lista de produção
   * @param id - ID da lista de produção
   */
  const fetchItems = useCallback(async (id?: string | null) => {
    // Não faz nada se o ID não for fornecido
    if (!id) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const data = await getProductionListItems(id);
      setItems(data);
    } catch (err) {
      console.error("Erro ao buscar itens da lista de produção:", err);
      setError(err instanceof Error ? err : new Error("Erro desconhecido ao buscar itens da lista"));
      toast.error("Não foi possível carregar os itens da lista de produção");
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar os itens quando o listId mudar (se autoLoad for true)
  useEffect(() => {
    if (autoLoad && listId) {
      fetchItems(listId);
    }
  }, [listId, fetchItems, autoLoad]);

  // Limpar os itens quando o listId for removido
  useEffect(() => {
    if (!listId) {
      setItems([]);
    }
  }, [listId]);

  // Retornar estados e funções
  return {
    items,
    loading,
    error,
    fetchItems,
    // Fornecemos um alias 'reloadItems' para melhor clareza em alguns contextos de UI
    reloadItems: (id?: string | null) => fetchItems(id || listId)
  };
}
