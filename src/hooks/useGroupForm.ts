
import { useState } from 'react';
import { Group, createGroup, updateGroup } from '@/services/groupService';
import { toast } from "sonner";

interface GroupForm {
  id: string;
  name: string;
  description: string;
}

export const useGroupForm = (onUpdate: () => void) => {
  const [groupForm, setGroupForm] = useState<GroupForm>({
    id: '',
    name: '',
    description: ''
  });
  
  const resetForm = () => {
    setGroupForm({
      id: '',
      name: '',
      description: ''
    });
  };

  const fillForm = (group: Group) => {
    setGroupForm({
      id: group.id,
      name: group.name,
      description: group.description || ''
    });
  };

  const handleSaveGroup = async (): Promise<boolean> => {
    if (!groupForm.name.trim()) {
      toast.error("O nome do grupo é obrigatório");
      return false;
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
      return true;
    } catch (error) {
      console.error("Erro ao salvar grupo:", error);
      toast.error("Erro ao salvar grupo");
      return false;
    }
  };

  return {
    groupForm,
    setGroupForm,
    resetForm,
    fillForm,
    handleSaveGroup
  };
};
