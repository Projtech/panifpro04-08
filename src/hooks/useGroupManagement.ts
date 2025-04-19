import { useState } from 'react';
import { Group, Subgroup, deleteGroup, deleteSubgroup } from '@/services/groupService';
import { toast } from "sonner";
import { useGroupForm } from './useGroupForm';
import { useSubgroupForm } from './useSubgroupForm';
import { useDialogControl } from './useDialogControl';
import { useGroupSelection } from './useGroupSelection';

export const useGroupManagement = (
  groups: Group[], 
  subgroups: Subgroup[],
  onUpdate: () => void
) => {
  const { selectedGroup, setSelectedGroup } = useGroupSelection();
  
  const {
    groupForm,
    setGroupForm,
    resetForm: resetGroupForm,
    fillForm: fillGroupForm,
    handleSaveGroup
  } = useGroupForm(onUpdate);

  const {
    subgroupForm,
    setSubgroupForm,
    resetForm: resetSubgroupForm,
    fillForm: fillSubgroupForm,
    handleSaveSubgroup
  } = useSubgroupForm(onUpdate);

  const {
    showGroupDialog,
    showSubgroupDialog,
    showDeleteDialog,
    deleteType,
    deleteId,
    openGroupDialog,
    closeGroupDialog,
    openSubgroupDialog,
    closeSubgroupDialog,
    openDeleteDialog,
    closeDeleteDialog
  } = useDialogControl();

  const handleAddGroup = () => {
    resetGroupForm();
    openGroupDialog();
  };

  const handleEditGroup = (group: Group) => {
    fillGroupForm(group);
    openGroupDialog();
  };

  const handleDeleteGroup = (id: string) => {
    openDeleteDialog('group', id);
  };

  const handleAddSubgroup = (groupId?: string) => {
    if (!selectedGroup && !groupId) {
      toast.error("Selecione um grupo antes de adicionar um subgrupo");
      return;
    }
    
    resetSubgroupForm();
    setSubgroupForm(prev => ({
      ...prev,
      group_id: groupId || selectedGroup?.id || ''
    }));
    openSubgroupDialog();
  };

  const handleEditSubgroup = (subgroup: Subgroup) => {
    fillSubgroupForm(subgroup);
    openSubgroupDialog();
  };

  const handleDeleteSubgroup = (id: string) => {
    openDeleteDialog('subgroup', id);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    try {
      let success = false;
      
      if (deleteType === 'group') {
        success = await deleteGroup(deleteId);
      } else {
        success = await deleteSubgroup(deleteId);
      }
      
      if (success) {
        onUpdate();
        closeDeleteDialog();
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
    setSelectedGroup,
    setShowGroupDialog: closeGroupDialog,
    setShowSubgroupDialog: closeSubgroupDialog,
    setShowDeleteDialog: closeDeleteDialog,
    setGroupForm,
    setSubgroupForm
  };
};
