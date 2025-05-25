import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SetorForm } from '@/services/setorService';
import { Loader2, RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SetorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setorForm: SetorForm;
  setSetorForm: React.Dispatch<React.SetStateAction<SetorForm>>;
  onSave: () => Promise<void>;
  loading: boolean;
}

// Lista de cores predefinidas com nomes amigáveis
const PRESET_COLORS = [
  { name: 'Azul', value: '#2563eb' },
  { name: 'Verde', value: '#16a34a' },
  { name: 'Vermelho', value: '#dc2626' },
  { name: 'Amarelo', value: '#ca8a04' },
  { name: 'Roxo', value: '#9333ea' },
  { name: 'Rosa', value: '#db2777' },
  { name: 'Laranja', value: '#ea580c' },
  { name: 'Ciano', value: '#0891b2' },
  { name: 'Cinza', value: '#4b5563' },
  { name: 'Marrom', value: '#7c2d12' },
];

// Função para gerar uma cor aleatória que não esteja na lista de cores predefinidas
const generateRandomColor = (): string => {
  const existingColors = new Set(PRESET_COLORS.map(c => c.value));
  let newColor;
  
  do {
    // Gerar uma cor aleatória
    const r = Math.floor(Math.random() * 200) + 20; // Evitar cores muito escuras
    const g = Math.floor(Math.random() * 200) + 20;
    const b = Math.floor(Math.random() * 200) + 20;
    newColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  } while (existingColors.has(newColor));
  
  return newColor;
};

const SetorDialog: React.FC<SetorDialogProps> = ({
  open,
  onOpenChange,
  setorForm,
  setSetorForm,
  onSave,
  loading
}) => {
  const [selectedColorOption, setSelectedColorOption] = useState<string>(setorForm.color ? 'custom' : 'default');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave();
  };
  
  const handleColorChange = (value: string) => {
    if (value === 'random') {
      // Gerar uma cor aleatória
      const randomColor = generateRandomColor();
      setSetorForm({ ...setorForm, color: randomColor });
      setSelectedColorOption('custom');
    } else if (value === 'custom') {
      // Manter a cor atual se já existir, ou definir uma cor padrão
      if (!setorForm.color) {
        setSetorForm({ ...setorForm, color: '#2563eb' });
      }
      setSelectedColorOption('custom');
    } else {
      // Usar uma das cores predefinidas
      setSetorForm({ ...setorForm, color: value });
      setSelectedColorOption(value);
    }
  };
  
  const isEditMode = !!setorForm.id;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Editar Setor' : 'Novo Setor'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={setorForm.name}
              onChange={(e) => setSetorForm({ ...setorForm, name: e.target.value })}
              placeholder="Nome do setor"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={setorForm.description || ''}
              onChange={(e) => setSetorForm({ ...setorForm, description: e.target.value || null })}
              placeholder="Descrição do setor (opcional)"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="color">Cor do Setor</Label>
            <div className="flex flex-col gap-3">
              <Select
                value={selectedColorOption}
                onValueChange={handleColorChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma cor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Selecione uma cor</SelectItem>
                  {PRESET_COLORS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: color.value }}
                        />
                        <span>{color.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="random">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      <span>Gerar cor aleatória</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <span>Personalizar cor</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {selectedColorOption === 'custom' && (
                <div className="flex gap-2 items-center">
                  <Input
                    id="color"
                    value={setorForm.color || ''}
                    onChange={(e) => setSetorForm({ ...setorForm, color: e.target.value || null })}
                    placeholder="#RRGGBB"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleColorChange('random')}
                    title="Gerar nova cor aleatória"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {setorForm.color && (
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded border border-gray-300" 
                    style={{ backgroundColor: setorForm.color }}
                  />
                  <span className="text-sm">{setorForm.color}</span>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SetorDialog;
