
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Group } from '@/services/groupService';

interface SubgroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subgroupForm: {
    id: string;
    name: string;
    description: string;
    group_id: string;
  };
  setSubgroupForm: (form: { id: string; name: string; description: string; group_id: string; }) => void;
  onSave: () => Promise<void>;
  groups: Group[];
  loading?: boolean;
}

const SubgroupDialog: React.FC<SubgroupDialogProps> = ({
  open,
  onOpenChange,
  subgroupForm,
  setSubgroupForm,
  onSave,
  groups,
  loading = false
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {subgroupForm.id ? 'Editar Subgrupo' : 'Novo Subgrupo'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <label htmlFor="subgroup-group" className="text-sm font-medium">
              Grupo <span className="text-red-500">*</span>
            </label>
            <Select
              value={subgroupForm.group_id}
              onValueChange={(value) => setSubgroupForm({...subgroupForm, group_id: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um grupo" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="subgroup-name" className="text-sm font-medium">
              Nome <span className="text-red-500">*</span>
            </label>
            <Input
              id="subgroup-name"
              value={subgroupForm.name}
              onChange={(e) => setSubgroupForm({...subgroupForm, name: e.target.value})}
              placeholder="Nome do subgrupo"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="subgroup-description" className="text-sm font-medium">
              Descrição
            </label>
            <Textarea
              id="subgroup-description"
              value={subgroupForm.description}
              onChange={(e) => setSubgroupForm({...subgroupForm, description: e.target.value})}
              placeholder="Descrição do subgrupo"
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
              setSubgroupForm({
                id: '',
                name: '',
                description: '',
                group_id: ''
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

export default SubgroupDialog;
