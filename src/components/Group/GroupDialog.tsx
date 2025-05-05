
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface GroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupForm: {
    id: string;
    name: string;
    description: string;
  };
  setGroupForm: (form: { id: string; name: string; description: string; }) => void;
  onSave: () => Promise<void>;
  loading?: boolean;
}

const GroupDialog: React.FC<GroupDialogProps> = ({
  open,
  onOpenChange,
  groupForm,
  setGroupForm,
  onSave,
  loading = false
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {groupForm.id ? 'Editar Grupo' : 'Novo Grupo'}
          </DialogTitle>
          <DialogDescription id="group-dialog-description">
            Preencha os dados do grupo abaixo. Os campos marcados com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <label htmlFor="group-name" className="text-sm font-medium">
              Nome <span className="text-red-500">*</span>
            </label>
            <Input
              id="group-name"
              value={groupForm.name}
              onChange={(e) => setGroupForm({...groupForm, name: e.target.value})}
              placeholder="Nome do grupo"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="group-description" className="text-sm font-medium">
              Descrição
            </label>
            <Textarea
              id="group-description"
              value={groupForm.description}
              onChange={(e) => setGroupForm({...groupForm, description: e.target.value})}
              placeholder="Descrição do grupo"
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onSave();
              // Resetar o formulário após salvar
              setGroupForm({
                id: '',
                name: '',
                description: ''
              });
            }}
            disabled={loading}
            className="bg-bakery-amber hover:bg-bakery-amber/90 text-white"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Salvar e Novo
          </Button>
          <Button
            onClick={() => {
              onSave();
              onOpenChange(false);
            }}
            disabled={loading}
            className="bg-bakery-amber hover:bg-bakery-amber/90 text-white"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Salvar e Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GroupDialog;
