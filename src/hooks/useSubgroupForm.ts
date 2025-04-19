
import { useState } from 'react';
import { Subgroup, createSubgroup, updateSubgroup } from '@/services/groupService';
import { toast } from "sonner";

interface SubgroupForm {
  id: string;
  name: string;
  description: string;
  group_id: string;
}

export const useSubgroupForm = (onUpdate: () => void) => {
  const [subgroupForm, setSubgroupForm] = useState<SubgroupForm>({
    id: '',
    name: '',
    description: '',
    group_id: ''
  });
  
  const resetForm = () => {
    setSubgroupForm({
      id: '',
      name: '',
      description: '',
      group_id: ''
    });
  };

  const fillForm = (subgroup: Subgroup) => {
    setSubgroupForm({
      id: subgroup.id,
      name: subgroup.name,
      description: subgroup.description || '',
      group_id: subgroup.group_id
    });
  };

  const handleSaveSubgroup = async () => {
    if (!subgroupForm.name.trim()) {
      toast.error("O nome do subgrupo é obrigatório");
      return;
    }
    
    if (!subgroupForm.group_id) {
      toast.error("Selecione um grupo para o subgrupo");
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
      return true;
    } catch (error) {
      console.error("Erro ao salvar subgrupo:", error);
      toast.error("Erro ao salvar subgrupo");
      return false;
    }
  };

  return {
    subgroupForm,
    setSubgroupForm,
    resetForm,
    fillForm,
    handleSaveSubgroup
  };
};
