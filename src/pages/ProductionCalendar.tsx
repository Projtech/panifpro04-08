import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Plus,
  Loader2,
  RefreshCw,
  Clock,
  FileEdit,
  Trash2,
  FileText,
  Download
} from "lucide-react";
import { toast } from "sonner";
import {
  ProductionList,
  ProductionListItem,
  ProductionListItemWithDetails,
  ProductItemDetails,
  createProductionList,
  updateProductionList,
  deleteProductionList,
  getProductionListItems,
  getProductionListItemsWithDetails,
  getLastUpdateDate
} from "@/services/productionListService";
import { exportToPDF, exportToExcel } from "@/services/exportService";
import { exportWeeklyCalendarToPDF, exportWeeklyCalendarToExcel } from "@/services/weeklyCalendarExport";
import { exportToProductionControlExcel } from "@/services/productionControlExport";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Importar componentes UI
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";

// Importar o hook e os componentes criados
import useProductionLists from "@/hooks/useProductionLists";
import ProductionListTable from "@/components/ProductionCalendar/ProductionListTable";
import ProductionListForm from "@/components/ProductionCalendar/ProductionListForm";
import SetorWorkloadView from "@/components/ProductionCalendar/SetorWorkloadView";

// Interface para representar as listas de produção com seus itens
interface ProductionListWithItems extends ProductionList {
  items?: ProductionListItemWithDetails[];
}

// Interface estendida para incluir propriedades adicionais necessárias
interface ExtendedProductItemDetails extends ProductItemDetails {
  recipe_id?: string | null;
}

// Interface estendida para incluir recipe
interface ExtendedProductionListItemWithDetails extends Omit<ProductionListItemWithDetails, 'product'> {
  product?: ExtendedProductItemDetails;
  recipe?: {
    name?: string;
    unit?: string;
  };
}

const ProductionCalendar = () => {
  
  // Estado para manter a hora da última atualização
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Estado para loading do botão de atualizar
  const [isUpdatingDaily, setIsUpdatingDaily] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  
  // Hook de navegação
  const navigate = useNavigate();
  
  // Hook para obter empresa ativa
  type AuthContextType = { activeCompany?: { id?: string, name?: string }, loading?: boolean };
  const { activeCompany, loading: authLoading } = useAuth() as AuthContextType;
  const companyId = activeCompany?.id;
  const companyName = activeCompany?.name || 'Padaria';

  // Hook para gerenciar listas de produção
  const { lists, loading: listsLoading, error: listsError, reloadLists } = useProductionLists(companyId);
  
  // Efeito para buscar a data da última atualização ao carregar a página
  useEffect(() => {
    const fetchLastUpdateDate = async () => {
      if (!companyId) return;
      
      try {
        const lastDate = await getLastUpdateDate(companyId);
        if (lastDate) {
          setLastUpdated(lastDate);
          setIsInitialLoad(false);
        }
      } catch (error) {
        console.error("Erro ao buscar data da última atualização:", error);
      }
    };
    
    fetchLastUpdateDate();
  }, [companyId]);

  // Estado para o modal de formulário
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingList, setEditingList] = useState<ProductionListWithItems | null>(null);
  const [editingListItems, setEditingListItems] = useState<ProductionListItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState<boolean>(false);
  const [isSavingList, setIsSavingList] = useState<boolean>(false);
  
  // Estado para visualização de carga de trabalho por setor
  const [selectedList, setSelectedList] = useState<ProductionListWithItems | null>(null);
  const [selectedListItems, setSelectedListItems] = useState<ProductionListItemWithDetails[]>([]);
  const [loadingSelectedListItems, setLoadingSelectedListItems] = useState<boolean>(false);
  const [showWorkloadView, setShowWorkloadView] = useState<boolean>(false);
  
  // Handler do botão de atualizar listas diárias
  const handleUpdateDailyLists = async () => {
    if (!companyId) {
      toast.warning("Nenhuma empresa ativa selecionada.");
      return;
    }
    
    setIsUpdatingDaily(true);
    try {
      const { generateDailyLists } = await import("@/services/productionListService");
      // Passar companyId para generateDailyLists
      const result = await generateDailyLists(companyId);
      if (result.success) {
        toast.success("Listas diárias atualizadas com sucesso!");
        await reloadLists();
        
        // Buscar a data mais recente do banco de dados após a atualização
        const lastDate = await getLastUpdateDate(companyId);
        if (lastDate) {
          setLastUpdated(lastDate);
        } else {
          // Fallback se não conseguir buscar do banco
          setLastUpdated(new Date());
        }
      } else {
        console.error("Falha ao gerar listas diárias:", result.error);
        // A função generateDailyLists já mostra um toast de erro no serviço
      }
    } catch (error) {
      console.error("Erro capturado ao atualizar listas:", error);
      toast.error("Erro ao atualizar listas diárias");
    } finally {
      setIsUpdatingDaily(false);
      setIsInitialLoad(false);
    }
  };

  // Função para lidar com a criação de um novo pedido
  const handleNewOrder = () => {
    navigate("/production-orders/new");
  };
  
  // Função para abrir o modal de nova lista personalizada
  const handleOpenNewListForm = () => {
    if (!companyId) {
      toast.warning("Selecione uma empresa para criar uma lista.");
      return;
    }
    setEditingList(null);
    setEditingListItems([]);
    setIsFormModalOpen(true);
  };
  
  // Função para fechar o modal de formulário
  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingList(null);
    setEditingListItems([]);
  };
  
  // Função para salvar uma lista (criar ou atualizar)
  const handleSaveList = async (
    listData: Omit<ProductionList, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'company_id'>,
    itemsData: Omit<ProductionListItem, 'id' | 'list_id' | 'created_at' | 'updated_at' | 'company_id'>[]
  ) => {
    if (!companyId) {
      toast.error("Nenhuma empresa selecionada para salvar a lista.");
      return;
    }
    setIsSavingList(true);
    
    try {
      if (editingList) {
        // Modo de edição
        await updateProductionList(editingList.id, listData, companyId, itemsData);
        toast.success("Lista de produção atualizada com sucesso");
      } else {
        // Modo de criação
        await createProductionList(
          { ...listData, type: 'custom', companyId: companyId },
          itemsData
        );
        toast.success("Lista de produção criada com sucesso");
      }
      
      // Recarregar listas e fechar o modal
      reloadLists();
      handleCloseFormModal();
    } catch (error) {
      console.error("Erro ao salvar lista de produção:", error);
      toast.error("Ocorreu um erro ao salvar a lista de produção");
    } finally {
      setIsSavingList(false);
    }
  };
  
  // Função para editar uma lista existente
  const handleEditList = async (list: ProductionListWithItems) => {
    if (!companyId) {
      toast.error("Nenhuma empresa selecionada para editar a lista.");
      return;
    }
    setIsLoadingItems(true);
    setEditingList(list);
    setEditingListItems([]);
    
    try {
      const items = await getProductionListItems(list.id, companyId);
      setEditingListItems(items);
      setIsFormModalOpen(true);
    } catch (error) {
      console.error("Erro ao carregar itens da lista:", error);
      toast.error("Não foi possível carregar os itens da lista");
      setEditingList(null);
    } finally {
      setIsLoadingItems(false);
    }
  };
  
  // Função para excluir uma lista
  const handleDeleteList = async (list: ProductionList) => {
    if (!companyId) {
      toast.error("Nenhuma empresa selecionada para excluir a lista.");
      return;
    }
    try {
      await deleteProductionList(list.id, companyId);
      await reloadLists(); // Aguarde o reload antes de seguir
      toast.success("Lista excluída com sucesso");
    } catch (error) {
      console.error("Erro ao excluir lista:", error);
      toast.error("Ocorreu um erro ao excluir a lista");
    }
  };
  
  // Função para visualizar carga de trabalho por setor
  const handleViewWorkload = async (list: ProductionListWithItems) => {
    if (!companyId) {
      toast.error("Nenhuma empresa selecionada para visualizar a carga de trabalho.");
      return;
    }
    
    setSelectedList(list);
    setLoadingSelectedListItems(true);
    setShowWorkloadView(true);
    
    try {
      // Buscar itens com detalhes (incluindo setor_id)
      const items = await getProductionListItemsWithDetails(list.id, companyId);
      setSelectedListItems(items);
    } catch (error) {
      console.error("Erro ao carregar itens da lista:", error);
      toast.error("Não foi possível carregar os itens da lista");
      setShowWorkloadView(false);
    } finally {
      setLoadingSelectedListItems(false);
    }
  };
  
  // Função para fechar a visualização de carga de trabalho
  const handleCloseWorkloadView = () => {
    setShowWorkloadView(false);
    setSelectedList(null);
    setSelectedListItems([]);
  };
  
  // Função para gerar pedido de produção a partir de uma lista
  const handleGenerateOrder = async (list: ProductionListWithItems) => {
  if (!companyId) return;
    if (!companyId) {
      toast.error("Nenhuma empresa selecionada para gerar o pedido.");
      return;
    }
    try {
      // Buscar itens atualizados do banco
      const items = await getProductionListItemsWithDetails(list.id, companyId);
      if (!items || items.length === 0) {
        toast.warning("Esta lista não possui itens para gerar um pedido.");
        return;
      }
      
      // Log para diagnóstico
      console.log("Itens da lista com detalhes:", items);
      
      // Mapear os itens da lista para o formato esperado pelo ProductionOrderForm
      const produtosParaPedido = items.map((item, index) => {
        // Cast para o tipo estendido para acessar as propriedades adicionais
        const extendedItem = item as unknown as ExtendedProductionListItemWithDetails;
        return {
          id: `prelist-item-${index}-${item.product_id}`,
          recipeId: extendedItem.product?.recipe_id || null, // Usar recipe_id do produto
          recipeName: extendedItem.recipe?.name || extendedItem.product?.name || 'Produto Desconhecido', // Priorizar nome da receita
          quantity: parseFloat(String(item.quantity)) || 0, // Converter para string antes de usar parseFloat
          unit: (extendedItem.recipe?.unit || extendedItem.product?.unit || 'un').toLowerCase(),
          convertedQuantity: 0,
          fromCalendar: true // Identificar que vem do calendário
        };
      });
      
      // Navegar para a tela de criação de pedido
      navigate('/production-orders/new', {
        state: {
          produtos: produtosParaPedido,
          fromPreList: true,
          preListId: list.id,
          preListName: list.name
        }
      });
      
      toast.info(`Redirecionando para criar pedido a partir da lista: ${list.name}`);
    } catch (error) {
      console.error("Erro ao gerar pedido de produção:", error);
      toast.error("Ocorreu um erro ao gerar o pedido de produção");
    }
  };
  
  // Função para exportar lista para PDF
  const handleExportPDF = async (list: ProductionListWithItems) => {
  if (!companyId) return;
    if (!companyId) { return; }
    try {
      await exportToPDF(list.id, list.name, companyId);
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      // O toast de erro já está sendo tratado na função exportToPDF
    }
  };

  // Função para exportar o calendário semanal completo em PDF
  const handleExportWeeklyCalendarPDF = async () => {
    if (!companyId || isExportingPDF) return;
    
    try {
      setIsExportingPDF(true);
      // Usar uma referência local para evitar problemas de estado
      const localCompanyId = companyId;
      const localCompanyName = companyName;
      
      // Adicionar um pequeno atraso para garantir que o estado seja atualizado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await exportWeeklyCalendarToPDF(localCompanyId, localCompanyName);
    } catch (error) {
      console.error("Erro ao exportar calendário em PDF:", error);
      toast.error(`Erro ao exportar calendário em PDF: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      // Garantir que o estado de carregamento seja desativado mesmo em caso de erro
      setIsExportingPDF(false);
    }
  };
  
  // Função para exportar o calendário semanal completo em Excel
  const handleExportWeeklyCalendarExcel = async () => {
    if (!companyId || isExportingExcel) return;
    
    try {
      setIsExportingExcel(true);
      // Usar uma referência local para evitar problemas de estado
      const localCompanyId = companyId;
      const localCompanyName = companyName;
      
      // Adicionar um pequeno atraso para garantir que o estado seja atualizado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await exportWeeklyCalendarToExcel(localCompanyId, localCompanyName);
    } catch (error) {
      console.error("Erro ao exportar calendário em Excel:", error);
      toast.error(`Erro ao exportar calendário em Excel: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      // Garantir que o estado de carregamento seja desativado mesmo em caso de erro
      setIsExportingExcel(false);
    }
  };

  // Removida a função handleExportProductionControlReport

  // Função para exportar lista para Excel
  const handleExportExcel = async (list: ProductionListWithItems) => {
  if (!companyId) return;
    if (!companyId) { return; }
    try {
      await exportToExcel(list.id, list.name, companyId);
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      // O toast de erro já está sendo tratado na função exportToExcel
    }
  };

  // Remover atualização automática de lastUpdated
// O contador será atualizado apenas no sucesso do botão de atualizar listas diárias.

  // Renderização condicional para loading, sem empresa ou erro
if (authLoading || listsLoading) {
  return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <span className="ml-2 text-muted-foreground">Carregando dados...</span>
    </div>
  );
}
if (!companyId) {
  return (
    <div className="p-4 text-center text-red-600 border border-red-200 bg-red-50 rounded-md">
      Nenhuma empresa ativa selecionada. Por favor, selecione uma empresa no menu superior ou através da gestão de acesso.
    </div>
  );
}
if (listsError) {
  return (
    <div className="p-4 text-center text-red-600 border border-red-200 bg-red-50 rounded-md">
      Erro ao carregar listas de produção: {listsError.message}
      <Button onClick={reloadLists} variant="outline" size="sm" className="ml-4">Tentar Novamente</Button>
    </div>
  );
}

return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">Calendário de Produção</h1>
        <div className="flex-1" />
        <Button variant="outline" size="icon" onClick={handleUpdateDailyLists} disabled={isUpdatingDaily}>
          {isUpdatingDaily ? <Loader2 className="animate-spin h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
        
        {/* Botão para exportar calendário em PDF */}
        <Button 
          variant="outline" 
          className="flex items-center gap-2" 
          onClick={handleExportWeeklyCalendarPDF} 
          disabled={isExportingPDF || !companyId}
        >
          {isExportingPDF ? <Loader2 className="animate-spin h-4 w-4" /> : <FileText className="h-4 w-4" />}
          Exportar Calendário PDF
        </Button>
        
        {/* Botão para exportar calendário em Excel */}
        <Button 
          variant="outline" 
          className="flex items-center gap-2" 
          onClick={handleExportWeeklyCalendarExcel} 
          disabled={isExportingExcel || !companyId}
        >
          {isExportingExcel ? <Loader2 className="animate-spin h-4 w-4" /> : <Download className="h-4 w-4" />}
          Exportar Calendário Excel
        </Button>
        <div className="flex items-center text-xs text-muted-foreground ml-2 bg-muted/50 px-2 py-1 rounded-md border">
          <Clock className="h-3 w-3 mr-1" />
          <span>Última atualização: </span>
          <span className="font-medium ml-1">
            {lastUpdated 
              ? format(lastUpdated, "dd/MM/yyyy 'às' HH'h'mm", { locale: ptBR })
              : isInitialLoad ? "Nunca" : "-"}
          </span>
        </div>
        <Button variant="default" onClick={handleOpenNewListForm} className="ml-4">
          <Plus className="h-4 w-4 mr-2" /> Nova lista personalizada
        </Button>
      </div>

      {/* Separação visual das listas diárias e personalizadas */}
      {/* Visualização de carga de trabalho por setor */}
      {showWorkloadView && selectedList && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold">Carga de Trabalho por Setor</h2>
            <Button variant="ghost" size="sm" onClick={handleCloseWorkloadView}>
              Voltar para Calendário
            </Button>
          </div>
          <SetorWorkloadView 
            items={selectedListItems} 
            companyId={companyId || ''}
            date={new Date(selectedList.created_at)}
            isLoading={loadingSelectedListItems}
          />
        </div>
      )}
      
      {/* Listas de produção (ocultas quando a visualização de carga de trabalho está ativa) */}
      {!showWorkloadView && (
        <div className="space-y-4">
          <h2 className="font-semibold">Listas Diárias</h2>
          <ProductionListTable
            lists={lists.filter(l => l.type === 'daily').sort((a, b) => {
              const order = ['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'];
              const getDayIndex = (name: string) => order.findIndex(d => name.includes(d));
              return getDayIndex(a.name) - getDayIndex(b.name);
            })}
            isLoading={listsLoading || isUpdatingDaily}
            error={listsError}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            onGenerateOrder={handleGenerateOrder}
            onViewWorkload={handleViewWorkload}
          />

          <h2 className="font-semibold">Listas Personalizadas</h2>
          <ProductionListTable
            lists={lists.filter(l => l.type === 'custom')}
            isLoading={listsLoading}
            error={listsError}
            onEditList={handleEditList}
            onDeleteList={handleDeleteList}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            onGenerateOrder={handleGenerateOrder}
            onViewWorkload={handleViewWorkload}
          />
        </div>
      )}

      {/* Modal de formulário para criar/editar lista personalizada */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingList ? "Editar Lista" : "Nova Lista Personalizada"}</DialogTitle>
            <DialogDescription>
              Preencha os dados da lista de produção personalizada.
            </DialogDescription>
          </DialogHeader>
          <ProductionListForm
            initialData={editingList ?? undefined}
            initialItems={editingListItems}
            onSave={handleSaveList}
            onCancel={handleCloseFormModal}
            isLoading={isSavingList}
            companyId={companyId}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductionCalendar;
