
import { useState } from 'react';
import { Subgroup, createSubgroup, updateSubgroup } from '@/services/groupService';
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';

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

  const { activeCompany, loading } = useAuth();

  const handleSaveSubgroup = async (): Promise<boolean> => {
    if (!subgroupForm.name.trim()) {
      toast.error("O nome do subgrupo é obrigatório");
      return false;
    }
    
    if (!subgroupForm.group_id) {
      toast.error("Selecione um grupo para o subgrupo");
      return false;
    }
    if (loading || !activeCompany?.id) {
      toast.error("Empresa ativa não carregada. Tente novamente mais tarde.");
      return false;
    }
    try {
      if (subgroupForm.id) {
        await updateSubgroup(subgroupForm.id, {
          name: subgroupForm.name,
          description: subgroupForm.description || null,
          group_id: subgroupForm.group_id
        }, activeCompany.id);
      } else {
        await createSubgroup({
          name: subgroupForm.name,
          description: subgroupForm.description || null,
          group_id: subgroupForm.group_id
        }, activeCompany.id);
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
