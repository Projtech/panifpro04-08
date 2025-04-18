
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import HierarchicalGroupView from "@/components/HierarchicalGroupView";
import { Group, Subgroup, getGroups, getSubgroups } from "@/services/groupService";
import { useGroupManagement } from "@/hooks/useGroupManagement";
import GroupDialog from "@/components/Group/GroupDialog";
import SubgroupDialog from "@/components/Group/SubgroupDialog";
import DeleteDialog from "@/components/Group/DeleteDialog";

const GroupsManagement = () => {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  
  const navigate = useNavigate();
  
  const loadData = async () => {
    setLoading(true);
    try {
      const groupsData = await getGroups();
      setGroups(groupsData);
      
      const subgroupsData = await getSubgroups();
      setSubgroups(subgroupsData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadData();
  }, []);
  
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
    setShowGroupDialog,
    setShowSubgroupDialog,
    setShowDeleteDialog,
    setGroupForm,
    setSubgroupForm,
    handleAddSubgroup
  } = useGroupManagement(groups, subgroups, loadData);
  
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
          <h1 className="text-2xl font-bold text-bakery-brown">Gerenciamento de Grupos e Subgrupos</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            onClick={handleAddGroup}
            className="bg-bakery-amber hover:bg-bakery-amber/90 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Grupo
          </Button>
        </div>
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
      
      <GroupDialog
        open={showGroupDialog}
        onOpenChange={setShowGroupDialog}
        groupForm={groupForm}
        setGroupForm={setGroupForm}
        onSave={handleSaveGroup}
        loading={loading}
      />
      
      <SubgroupDialog
        open={showSubgroupDialog}
        onOpenChange={setShowSubgroupDialog}
        subgroupForm={subgroupForm}
        setSubgroupForm={setSubgroupForm}
        onSave={handleSaveSubgroup}
        groups={groups}
        loading={loading}
      />
      
      <DeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleConfirmDelete}
        type={deleteType}
        loading={loading}
      />
    </div>
  );
};

export default GroupsManagement;
