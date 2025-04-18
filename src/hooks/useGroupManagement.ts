
import { useState } from 'react';
import { Group, Subgroup, GroupData, SubgroupData, createGroup, updateGroup, deleteGroup, createSubgroup, updateSubgroup, deleteSubgroup } from '@/services/groupService';
import { toast } from "sonner";

export const useGroupManagement = (
  groups: Group[], 
  subgroups: Subgroup[],
  onUpdate: () => void
) => {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showSubgroupDialog, setShowSubgroupDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteType, setDeleteType] = useState<'group' | 'subgroup'>('group');
  const [deleteId, setDeleteId] = useState<string>('');
  
  const [groupForm, setGroupForm] = useState({
    id: '',
    name: '',
    description: ''
  });
  
  const [subgroupForm, setSubgroupForm] = useState({
    id: '',
    name: '',
    description: '',
    group_id: ''
  });

  const handleAddGroup = () => {
    setGroupForm({
      id: '',
      name: '',
      description: ''
    });
    setShowGroupDialog(true);
  };

  const handleEditGroup = (group: Group) => {
    setGroupForm({
      id: group.id,
      name: group.name,
      description: group.description || ''
    });
    setShowGroupDialog(true);
  };

  const handleDeleteGroup = (id: string) => {
    setDeleteType('group');
    setDeleteId(id);
    setShowDeleteDialog(true);
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) {
      toast({
        title: "Erro",
        description: "O nome do grupo é obrigatório",
        variant: "destructive"
      });
      return;
    }

    try {
      if (groupForm.id) {
        await updateGroup(groupForm.id, {
          name: groupForm.name,
          description: groupForm.description || null
        });
      } else {
        await createGroup({
          name: groupForm.name,
          description: groupForm.description || null
        });
      }
      
      onUpdate();
      setShowGroupDialog(false);
    } catch (error) {
      console.error("Erro ao salvar grupo:", error);
    }
  };

  const handleAddSubgroup = (groupId?: string) => {
    if (!selectedGroup && !groupId) {
      toast({
        title: "Erro",
        description: "Selecione um grupo antes de adicionar um subgrupo",
        variant: "destructive"
      });
      return;
    }
    
    setSubgroupForm({
      id: '',
      name: '',
      description: '',
      group_id: groupId || selectedGroup?.id || ''
    });
    setShowSubgroupDialog(true);
  };

  const handleEditSubgroup = (subgroup: Subgroup) => {
    setSubgroupForm({
      id: subgroup.id,
      name: subgroup.name,
      description: subgroup.description || '',
      group_id: subgroup.group_id
    });
    setShowSubgroupDialog(true);
  };

  const handleDeleteSubgroup = (id: string) => {
    setDeleteType('subgroup');
    setDeleteId(id);
    setShowDeleteDialog(true);
  };

  const handleSaveSubgroup = async () => {
    if (!subgroupForm.name.trim()) {
      toast({
        title: "Erro",
        description: "O nome do subgrupo é obrigatório",
        variant: "destructive"
      });
      return;
    }
    
    if (!subgroupForm.group_id) {
      toast({
        title: "Erro",
        description: "Selecione um grupo para o subgrupo",
        variant: "destructive"
      });
      return;
    }

    try {
      if (subgroupForm.id) {
        await updateSubgroup(subgroupForm.id, {
          name: subgroupForm.name,
          description: subgroupForm.description || null,
          group_id: subgroupForm.group_id
        });
      } else {
        await createSubgroup({
          name: subgroupForm.name,
          description: subgroupForm.description || null,
          group_id: subgroupForm.group_id
        });
      }
      
      onUpdate();
      setShowSubgroupDialog(false);
    } catch (error) {
      console.error("Erro ao salvar subgrupo:", error);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      let success = false;
      
      if (deleteType === 'group') {
        success = await deleteGroup(deleteId);
      } else {
        success = await deleteSubgroup(deleteId);
      }
      
      if (success) {
        onUpdate();
        setShowDeleteDialog(false);
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  return {
    selectedGroup,
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
    handleAddSubgroup,
    handleEditSubgroup,
    handleDeleteSubgroup,
    handleSaveSubgroup,
    handleConfirmDelete,
    setShowGroupDialog,
    setShowSubgroupDialog,
    setShowDeleteDialog,
    setGroupForm,
    setSubgroupForm
  };
};
