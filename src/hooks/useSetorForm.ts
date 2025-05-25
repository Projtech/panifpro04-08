import { useState } from 'react';
import { Setor, SetorForm, createSetor, updateSetor } from '@/services/setorService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useSetorForm = (onUpdate: () => void) => {
  const [setorForm, setSetorForm] = useState<SetorForm>({
    name: '',
    description: null,
    color: null,
    company_id: '',
  });
  
  const { activeCompany, loading } = useAuth();
  
  const resetForm = () => {
    setSetorForm({
      name: '',
      description: null,
      color: null,
      company_id: activeCompany?.id || '',
    });
  };
  
  const fillForm = (setor: Setor) => {
    setSetorForm({
      id: setor.id,
      name: setor.name,
      description: setor.description,
      color: setor.color,
      company_id: setor.company_id,
    });
  };
  
  const handleSaveSetor = async (): Promise<void> => {
    if (loading || !activeCompany?.id) {
      toast.error("Empresa ativa não carregada. Tente novamente mais tarde.");
      return;
    }
    
    if (!setorForm.name.trim()) {
      toast.error("Nome do setor é obrigatório");
      return;
    }
    
    try {
      let success = false;
      
      if (setorForm.id) {
        // Atualizar setor existente
        const updated = await updateSetor(
          setorForm.id,
          {
            name: setorForm.name,
            description: setorForm.description,
            color: setorForm.color,
            company_id: activeCompany.id,
          },
          activeCompany.id
        );
        success = !!updated;
      } else {
        // Criar novo setor
        const created = await createSetor(
          {
            name: setorForm.name,
            description: setorForm.description,
            color: setorForm.color,
            company_id: activeCompany.id,
          },
          activeCompany.id
        );
        success = !!created;
      }
      
      if (success) {
        onUpdate();
        resetForm();
      }
    } catch (error) {
      console.error("Erro ao salvar setor:", error);
      toast.error("Erro ao salvar setor. Tente novamente.");
    }
  };
  
  return {
    setorForm,
    setSetorForm,
    resetForm,
    fillForm,
    handleSaveSetor
  };
};
