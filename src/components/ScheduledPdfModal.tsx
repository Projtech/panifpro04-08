import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { 
  saveScheduledPdf, 
  getScheduledPdfs, 
  removeScheduledPdf, 
  generateScheduledPdfNow,
  ScheduledPdf
} from '@/services/scheduledPdfService';

interface ScheduledPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  listName: string;
  companyId: string;
}

const DAYS_OF_WEEK = [
  { id: 0, name: 'Domingo' },
  { id: 1, name: 'Segunda' },
  { id: 2, name: 'Terça' },
  { id: 3, name: 'Quarta' },
  { id: 4, name: 'Quinta' },
  { id: 5, name: 'Sexta' },
  { id: 6, name: 'Sábado' }
];

export function ScheduledPdfModal({ isOpen, onClose, listId, listName, companyId }: ScheduledPdfModalProps) {
  const [hour, setHour] = useState<number>(8);
  const [minute, setMinute] = useState<number>(0);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Segunda a sexta por padrão
  const [existingSchedules, setExistingSchedules] = useState<ScheduledPdf[]>([]);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  // Carregar programações existentes ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      loadSchedules();
    }
  }, [isOpen, listId, companyId]);

  const loadSchedules = () => {
    const schedules = getScheduledPdfs().filter(
      s => s.listId === listId && s.companyId === companyId
    );
    setExistingSchedules(schedules);
    
    // Se houver uma programação existente, carregar seus dados para edição
    if (schedules.length > 0) {
      const schedule = schedules[0];
      setHour(schedule.schedule.hour);
      setMinute(schedule.schedule.minute);
      setSelectedDays(schedule.schedule.days);
      setEditingScheduleId(schedule.id);
    } else {
      // Resetar para valores padrão
      setHour(8);
      setMinute(0);
      setSelectedDays([1, 2, 3, 4, 5]);
      setEditingScheduleId(null);
    }
  };

  const handleSaveSchedule = async () => {
    try {
      // Validar dados
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        toast.error('Horário inválido');
        return;
      }
      
      if (selectedDays.length === 0) {
        toast.error('Selecione pelo menos um dia da semana');
        return;
      }
      
      // Criar objeto de programação
      const scheduledPdf: ScheduledPdf = {
        id: editingScheduleId || uuidv4(),
        listId,
        listName,
        companyId,
        schedule: {
          hour,
          minute,
          days: selectedDays
        }
      };
      
      // Salvar programação
      await saveScheduledPdf(scheduledPdf);
      
      // Recarregar programações
      loadSchedules();
      
      toast.success('Programação de PDF salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar programação:', error);
      toast.error('Erro ao salvar programação');
    }
  };

  const handleRemoveSchedule = async (id: string) => {
    try {
      removeScheduledPdf(id);
      loadSchedules();
      toast.success('Programação removida com sucesso!');
    } catch (error) {
      console.error('Erro ao remover programação:', error);
      toast.error('Erro ao remover programação');
    }
  };

  const handleGenerateNow = async (schedule: ScheduledPdf) => {
    try {
      await generateScheduledPdfNow(schedule);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const toggleDay = (dayId: number) => {
    setSelectedDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(d => d !== dayId) 
        : [...prev, dayId].sort()
    );
  };

  const formatTime = (h: number, m: number) => {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const formatDays = (days: number[]) => {
    if (days.length === 7) return 'Todos os dias';
    if (days.length === 5 && [1, 2, 3, 4, 5].every(d => days.includes(d))) return 'Segunda a Sexta';
    if (days.length === 2 && [0, 6].every(d => days.includes(d))) return 'Fins de semana';
    
    return days.map(d => DAYS_OF_WEEK.find(day => day.id === d)?.name.substring(0, 3))
      .join(', ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Programar Geração de PDF</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="listName">Lista de Produção</Label>
            <Input id="listName" value={listName} disabled />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hour">Hora</Label>
              <Input 
                id="hour" 
                type="number" 
                min={0} 
                max={23} 
                value={hour} 
                onChange={e => setHour(parseInt(e.target.value))} 
              />
            </div>
            <div>
              <Label htmlFor="minute">Minuto</Label>
              <Input 
                id="minute" 
                type="number" 
                min={0} 
                max={59} 
                value={minute} 
                onChange={e => setMinute(parseInt(e.target.value))} 
              />
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label>Dias da Semana</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map(day => (
                <div key={day.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`day-${day.id}`} 
                    checked={selectedDays.includes(day.id)} 
                    onCheckedChange={() => toggleDay(day.id)} 
                  />
                  <Label htmlFor={`day-${day.id}`}>{day.name}</Label>
                </div>
              ))}
            </div>
          </div>
          
          {existingSchedules.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Programações Existentes</h3>
              <div className="space-y-2">
                {existingSchedules.map(schedule => (
                  <div key={schedule.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">{formatTime(schedule.schedule.hour, schedule.schedule.minute)}</p>
                      <p className="text-sm text-gray-500">{formatDays(schedule.schedule.days)}</p>
                      {schedule.lastGenerated && (
                        <p className="text-xs text-gray-400">
                          Última geração: {new Date(schedule.lastGenerated).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleGenerateNow(schedule)}
                      >
                        Gerar Agora
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleRemoveSchedule(schedule.id)}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSaveSchedule}>
            {editingScheduleId ? 'Atualizar Programação' : 'Salvar Programação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
