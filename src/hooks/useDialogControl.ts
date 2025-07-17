
import { useState } from 'react';

export const useDialogControl = () => {
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showSubgroupDialog, setShowSubgroupDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteType, setDeleteType] = useState<'group' | 'subgroup' | 'setor'>('group');
  const [deleteId, setDeleteId] = useState<string>('');

  const openGroupDialog = () => setShowGroupDialog(true);
  const closeGroupDialog = () => setShowGroupDialog(false);
  
  const openSubgroupDialog = () => setShowSubgroupDialog(true);
  const closeSubgroupDialog = () => setShowSubgroupDialog(false);
  
  const openDeleteDialog = (type: 'group' | 'subgroup' | 'setor', id: string) => {
    setDeleteType(type);
    setDeleteId(id);
    setShowDeleteDialog(true);
  };
  const closeDeleteDialog = () => setShowDeleteDialog(false);

  return {
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
  };
};
