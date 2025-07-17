
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HierarchicalGroupView from "@/components/HierarchicalGroupView";
import { Group, Subgroup, getGroups, getSubgroups } from "@/services/groupService";
import { Setor, getSetores, deleteSetor } from "@/services/setorService";
import { useAuth } from '@/contexts/AuthContext';
import { useGroupManagement } from "@/hooks/useGroupManagement";
import { useSetorForm } from "@/hooks/useSetorForm";
import GroupDialog from "@/components/Group/GroupDialog";
import SubgroupDialog from "@/components/Group/SubgroupDialog";
import SetorDialog from "@/components/Group/SetorDialog";
import SetorTableView from "@/components/Group/SetorTableView";
import DeleteDialog from "@/components/Group/DeleteDialog";
import { toast } from "sonner";

const GroupsManagement = () => {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  
  // Estado para controlar qual aba está ativa
  const [activeTab, setActiveTab] = useState<string>("grupos");
  
  // Estado para diálogo de setor
  const [showSetorDialog, setShowSetorDialog] = useState(false);
  const [setorToDelete, setSetorToDelete] = useState<string | null>(null);

  const { activeCompany, loading: authLoading } = useAuth();
  
  const navigate = useNavigate();
  
  const loadData = async () => {
    if (authLoading || !activeCompany?.id) return;
    setLoading(true);
    try {
      const groupsData = await getGroups(activeCompany.id);
      setGroups(groupsData);
      
      const subgroupsData = await getSubgroups(activeCompany.id);
      setSubgroups(subgroupsData);
      
      const setoresData = await getSetores(activeCompany.id);
      setSetores(setoresData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, activeCompany?.id]);
  
  // Hook para gerenciar o formulário de setores
  const {
    setorForm,
    setSetorForm,
    resetForm: resetSetorForm,
    fillForm: fillSetorForm,
    handleSaveSetor
  } = useSetorForm(loadData);
  
  const {
    showGroupDialog,
    showSubgroupDialog,
    showDeleteDialog,
    deleteType,
    groupForm,
    subgroupForm,
    handleAddGroup,
    handleEditGroup,
    handleDeleteGroup,
    handleSaveGroup,
    handleEditSubgroup,
    handleDeleteSubgroup,
    handleSaveSubgroup,
    handleConfirmDelete,
    openGroupDialog,
    closeGroupDialog,
    openSubgroupDialog,
    closeSubgroupDialog,
    setShowDeleteDialog,
    setGroupForm,
    setSubgroupForm,
    handleAddSubgroup,
    openDeleteDialog,
    closeDeleteDialog
  } = useGroupManagement(groups, subgroups, loadData);
  
  // Adaptador para compatibilidade de tipos
  const handleSaveGroupWrapper = async (): Promise<void> => {
    await handleSaveGroup();
  };
  
  const handleSaveSubgroupWrapper = async (): Promise<void> => {
    await handleSaveSubgroup();
  };
  
  // Funções para gerenciar setores
  const handleAddSetor = () => {
    resetSetorForm();
    setShowSetorDialog(true);
  };
  
  const handleEditSetor = (setorId: string) => {
    const setor = setores.find(s => s.id === setorId);
    if (setor) {
      fillSetorForm(setor);
      setShowSetorDialog(true);
    }
  };
  
  const handleDeleteSetor = (id: string) => {
    setSetorToDelete(id);
    // Usar a mesma lógica do useDialogControl para definir o tipo
    openDeleteDialog('setor', id);
  };
  
  const handleConfirmDeleteSetor = async (): Promise<void> => {
    if (!setorToDelete || loading || !activeCompany?.id) return;
    
    try {
      const success = await deleteSetor(setorToDelete, activeCompany.id);
      if (success) {
        // Remove visualmente o setor da lista para feedback imediato
        setSetores(prevSetores => prevSetores.filter(s => s.id !== setorToDelete));
        closeDeleteDialog(); // Fechamos o diálogo usando a função correta
        setSetorToDelete(null); // Limpamos o ID do setor a ser excluído
      }
    } catch (error) {
      console.error("Erro ao excluir setor:", error);
      toast.error("Erro ao excluir setor. Tente novamente.");
    }
  };
  
  // Sobrescrever a função handleConfirmDelete
  const originalHandleConfirmDelete = handleConfirmDelete;
  
  // Redefinir a função handleConfirmDelete para incluir setores
  const handleConfirmDeleteWithSetores = async (): Promise<void> => {
    if (setorToDelete && deleteType === 'setor') {
      await handleConfirmDeleteSetor();
    } else {
      await originalHandleConfirmDelete();
    }
  };
  
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-bakery-brown">Gerenciamento de Grupos, Subgrupos e Setores</h1>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="grupos">Grupos e Subgrupos</TabsTrigger>
          <TabsTrigger value="setores">Setores</TabsTrigger>
          <TabsTrigger value="visualizacao">Visualização Hierárquica</TabsTrigger>
        </TabsList>
        
        {/* Aba de Grupos e Subgrupos */}
        <TabsContent value="grupos" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Button 
              onClick={handleAddGroup}
              className="bg-bakery-amber hover:bg-bakery-amber/90 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Grupo
            </Button>
          </div>
          
          <HierarchicalGroupView 
            groups={groups}
            subgroups={subgroups}
            onEditGroup={handleEditGroup}
            onDeleteGroup={handleDeleteGroup}
            onEditSubgroup={handleEditSubgroup}
            onDeleteSubgroup={handleDeleteSubgroup}
            onAddSubgroup={handleAddSubgroup}
          />
        </TabsContent>
        
        {/* Aba de Setores */}
        <TabsContent value="setores" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Button 
              onClick={handleAddSetor}
              className="bg-bakery-amber hover:bg-bakery-amber/90 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Setor
            </Button>
          </div>
          
          <SetorTableView 
            setores={setores}
            onEditSetor={handleEditSetor}
            onDeleteSetor={handleDeleteSetor}
          />
        </TabsContent>
        
        {/* Aba de Visualização Hierárquica */}
        <TabsContent value="visualizacao" className="space-y-4">
          <HierarchicalGroupView 
            groups={groups}
            subgroups={subgroups}
            onEditGroup={handleEditGroup}
            onDeleteGroup={handleDeleteGroup}
            onEditSubgroup={handleEditSubgroup}
            onDeleteSubgroup={handleDeleteSubgroup}
            onAddSubgroup={handleAddSubgroup}
          />
        </TabsContent>
      </Tabs>
      
      <GroupDialog
        open={showGroupDialog}
        onOpenChange={(open) => open ? openGroupDialog() : closeGroupDialog()}
        groupForm={groupForm}
        setGroupForm={setGroupForm}
        onSave={handleSaveGroupWrapper}
        loading={loading}
      />
      
      <SubgroupDialog
        open={showSubgroupDialog}
        onOpenChange={(open) => open ? openSubgroupDialog() : closeSubgroupDialog()}
        subgroupForm={subgroupForm}
        setSubgroupForm={setSubgroupForm}
        onSave={handleSaveSubgroupWrapper}
        groups={groups}
        loading={loading}
      />
      
      <SetorDialog
        open={showSetorDialog}
        onOpenChange={setShowSetorDialog}
        setorForm={setorForm}
        setSetorForm={setSetorForm}
        onSave={handleSaveSetor}
        loading={loading}
      />
      
      <DeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleConfirmDeleteWithSetores}
        type={deleteType as 'group' | 'subgroup' | 'setor'}
        loading={loading}
      />
    </div>
  );
};

export default GroupsManagement;
