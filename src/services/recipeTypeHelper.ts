import { ensureSystemProductTypes } from "./productTypesService";
import { getProductTypeIdByName } from "./productTypesService";
import { toast } from "sonner";

/**
 * Função auxiliar para garantir que os tipos de sistema existam e obter o ID do tipo correto
 * Esta função será usada pelos serviços de receita para garantir a integração correta
 */
export async function getSystemProductTypeId(typeName: 'materia_prima' | 'receita' | 'subreceita', companyId: string): Promise<string | null> {
  if (!companyId) {
    console.error('ID da empresa é obrigatório para obter o tipo de produto');
    return null;
  }

  try {
    // Primeiro, garantir que os tipos de sistema existam no banco
    await ensureSystemProductTypes(companyId);
    console.log(`Tipos de sistema verificados/criados com sucesso para obter '${typeName}'`);
    
    // Agora buscar o ID do tipo específico
    const typeId = await getProductTypeIdByName(typeName, companyId);
    
    if (!typeId) {
      console.error(`Tipo de produto '${typeName}' não encontrado mesmo após garantir sua existência.`);
      toast.error(`Erro ao associar tipo '${typeName}' ao produto. Entre em contato com o suporte.`);
      return null;
    }
    
    console.log(`ID do tipo '${typeName}' encontrado: ${typeId}`);
    return typeId;
  } catch (error) {
    console.error(`Erro ao processar o tipo de produto '${typeName}':`, error);
    toast.error(`Erro ao processar tipo de produto. Verifique o console para detalhes.`);
    return null;
  }
}

/**
 * Função para determinar o tipo de produto baseado no checkbox "É um SubReceita"
 */
export function determineRecipeProductType(isSubRecipe: boolean): 'receita' | 'subreceita' {
  return isSubRecipe ? 'subreceita' : 'receita';
}
