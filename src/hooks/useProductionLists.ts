import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { 
  getProductionLists, 
  ProductionList 
} from "@/services/productionListService";

/**
 * Hook para gerenciar o estado e as operações relacionadas às listas de produção
 * @param companyId O ID da empresa ativa (ou null/undefined se não disponível)
 * @returns Estado e funções para gerenciar listas de produção
 */
export default function useProductionLists(companyId?: string | null) {
  // Estado para armazenar a lista de ProductionList
  const [lists, setLists] = useState<ProductionList[]>([]);
  
  // Estados para loading e error
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Função para buscar as listas de produção para a companyId fornecida
   */
  const fetchLists = useCallback(async () => {
    if (!companyId || typeof companyId !== 'string') {
      setLists([]);
      setLoading(false);
      setError(null);
      console.log("useProductionLists: companyId inválido ou ausente, busca não realizada.");
      return;
    }

    console.log(`useProductionLists: Iniciando busca de listas para companyId: ${companyId}`);
    setError(null);
    setLoading(true);

    try {
      const data = await getProductionLists(companyId);
      setLists(data);
    } catch (err) {
      console.error("Erro ao buscar listas de produção no hook:", err);
      const fetchError = err instanceof Error ? err : new Error("Erro desconhecido ao buscar listas");
      setError(fetchError);
      toast.error(`Erro ao carregar listas: ${fetchError.message}`);
      setLists([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // Carregar as listas quando o hook for montado
  useEffect(() => {
    console.log("useProductionLists useEffect triggered. companyId:", companyId);
    fetchLists();
  }, [fetchLists]);

  // Retornar estados e funções
  return {
    lists,
    loading,
    error,
    // Fornecemos um alias 'reloadLists' para melhor clareza em alguns contextos de UI
    reloadLists: fetchLists
  };
}
