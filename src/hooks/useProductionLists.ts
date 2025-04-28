import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  getProductionLists, 
  ProductionList 
} from "@/services/productionListService";

/**
 * Hook para gerenciar o estado e as operações relacionadas às listas de produção
 * @returns Estado e funções para gerenciar listas de produção
 */
export default function useProductionLists() {
  // Estado para armazenar a lista de ProductionList
  const [lists, setLists] = useState<ProductionList[]>([]);
  
  // Estados para loading e error
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Função para buscar as listas de produção
   */
  const fetchLists = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getProductionLists();
      setLists(data);
    } catch (err) {
      console.error("Erro ao buscar listas de produção:", err);
      setError(err instanceof Error ? err : new Error("Erro desconhecido ao buscar listas"));
      toast.error("Não foi possível carregar as listas de produção");
    } finally {
      setLoading(false);
    }
  };

  // Carregar as listas quando o hook for montado
  useEffect(() => {
    fetchLists();
  }, []);

  // Retornar estados e funções
  return {
    lists,
    loading,
    error,
    fetchLists,
    // Fornecemos um alias 'reloadLists' para melhor clareza em alguns contextos de UI
    reloadLists: fetchLists
  };
}
