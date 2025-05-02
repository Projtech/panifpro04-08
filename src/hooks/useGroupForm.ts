
import { useState } from 'react';
import { Group, createGroup, updateGroup } from '@/services/groupService';
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';

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

  const { activeCompany, loading } = useAuth();

  const handleSaveGroup = async (): Promise<boolean> => {
    if (!groupForm.name.trim()) {
      toast.error("O nome do grupo é obrigatório");
      return false;
    }
    if (loading || !activeCompany?.id) {
      toast.error("Empresa ativa não carregada. Tente novamente mais tarde.");
      return false;
    }
    try {
      if (groupForm.id) {
        await updateGroup(groupForm.id, {
          name: groupForm.name,
          description: groupForm.description || null
        }, activeCompany.id);
      } else {
        await createGroup({
          name: groupForm.name,
          description: groupForm.description || null
        }, activeCompany.id);
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
