import { toast } from 'sonner';
import { exportToPDF } from './exportService';
import { supabase } from '@/integrations/supabase/client';
import { getStoredPdf, storePdfLocally } from '@/utils/pdfStorageUtils';

export interface ScheduledPdf {
  id: string;
  listId: string;
  listName: string;
  companyId: string;
  schedule: {
    hour: number;
    minute: number;
    days: number[]; // 0-6, onde 0 é domingo e 6 é sábado
  };
  lastGenerated?: Date;
}

// Armazenamento local para as programações
const SCHEDULED_PDFS_KEY = 'scheduled_pdfs';

/**
 * Salva uma programação de geração de PDF
 * @param scheduledPdf Configuração da programação
 */
export async function saveScheduledPdf(scheduledPdf: ScheduledPdf): Promise<void> {
  try {
    // Buscar programações existentes
    const existingSchedules = getScheduledPdfs();
    
    // Verificar se já existe uma programação com o mesmo ID
    const index = existingSchedules.findIndex(s => s.id === scheduledPdf.id);
    
    if (index >= 0) {
      // Atualizar programação existente
      existingSchedules[index] = scheduledPdf;
    } else {
      // Adicionar nova programação
      existingSchedules.push(scheduledPdf);
    }
    
    // Salvar no localStorage
    localStorage.setItem(SCHEDULED_PDFS_KEY, JSON.stringify(existingSchedules));
    
    toast.success('Programação de PDF salva com sucesso!');
  } catch (error) {
    console.error('Erro ao salvar programação de PDF:', error);
    toast.error('Erro ao salvar programação de PDF');
  }
}

/**
 * Remove uma programação de geração de PDF
 * @param id ID da programação
 */
export function removeScheduledPdf(id: string): void {
  try {
    // Buscar programações existentes
    const existingSchedules = getScheduledPdfs();
    
    // Filtrar a programação a ser removida
    const updatedSchedules = existingSchedules.filter(s => s.id !== id);
    
    // Salvar no localStorage
    localStorage.setItem(SCHEDULED_PDFS_KEY, JSON.stringify(updatedSchedules));
    
    toast.success('Programação de PDF removida com sucesso!');
  } catch (error) {
    console.error('Erro ao remover programação de PDF:', error);
    toast.error('Erro ao remover programação de PDF');
  }
}

/**
 * Busca todas as programações de geração de PDF
 */
export function getScheduledPdfs(): ScheduledPdf[] {
  try {
    const schedulesJson = localStorage.getItem(SCHEDULED_PDFS_KEY);
    return schedulesJson ? JSON.parse(schedulesJson) : [];
  } catch (error) {
    console.error('Erro ao buscar programações de PDF:', error);
    return [];
  }
}

/**
 * Gera um PDF programado imediatamente
 * @param scheduledPdf Configuração da programação
 */
export async function generateScheduledPdfNow(scheduledPdf: ScheduledPdf): Promise<void> {
  try {
    toast.loading(`Gerando PDF programado: ${scheduledPdf.listName}...`);
    
    // Gerar o PDF
    await exportToPDF(scheduledPdf.listId, scheduledPdf.listName, scheduledPdf.companyId);
    
    // Atualizar a data da última geração
    const updatedSchedule = {
      ...scheduledPdf,
      lastGenerated: new Date()
    };
    
    // Salvar a programação atualizada
    await saveScheduledPdf(updatedSchedule);
    
    toast.success(`PDF programado gerado com sucesso: ${scheduledPdf.listName}`);
  } catch (error) {
    console.error('Erro ao gerar PDF programado:', error);
    toast.error(`Erro ao gerar PDF programado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Verifica e executa as programações de geração de PDF
 * Esta função deve ser chamada periodicamente, por exemplo, a cada minuto
 */
export async function checkAndExecuteScheduledPdfs(): Promise<void> {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0-6, onde 0 é domingo
    
    // Buscar todas as programações
    const scheduledPdfs = getScheduledPdfs();
    
    // Verificar quais programações devem ser executadas agora
    for (const scheduledPdf of scheduledPdfs) {
      const { hour, minute, days } = scheduledPdf.schedule;
      
      // Verificar se o horário e o dia da semana correspondem
      if (hour === currentHour && minute === currentMinute && days.includes(currentDay)) {
        // Executar a geração do PDF
        await generateScheduledPdfNow(scheduledPdf);
      }
    }
  } catch (error) {
    console.error('Erro ao verificar programações de PDF:', error);
  }
}

/**
 * Inicia o verificador de programações
 * Esta função configura um intervalo para verificar as programações a cada minuto
 */
export function startScheduledPdfChecker(): number {
  // Executar a cada minuto (60000 ms)
  const intervalId = window.setInterval(checkAndExecuteScheduledPdfs, 60000);
  return intervalId;
}

/**
 * Para o verificador de programações
 * @param intervalId ID do intervalo retornado por startScheduledPdfChecker
 */
export function stopScheduledPdfChecker(intervalId: number): void {
  window.clearInterval(intervalId);
}

/**
 * Verifica se existe um PDF programado para uma lista específica
 * @param listId ID da lista
 * @param companyId ID da empresa
 */
export function hasScheduledPdf(listId: string, companyId: string): boolean {
  const scheduledPdfs = getScheduledPdfs();
  return scheduledPdfs.some(s => s.listId === listId && s.companyId === companyId);
}

/**
 * Abre um PDF programado se existir, ou gera um novo se necessário
 * @param listId ID da lista
 * @param listName Nome da lista
 * @param companyId ID da empresa
 */
export async function openScheduledPdf(listId: string, listName: string, companyId: string): Promise<void> {
  try {
    // Verificar se há um PDF armazenado localmente
    const storedPdf = getStoredPdf(`${listId}_${companyId}`);
    
    if (storedPdf) {
      // Usar PDF armazenado localmente
      const url = URL.createObjectURL(storedPdf);
      window.open(url, '_blank');
      toast.success('PDF carregado do cache local!');
    } else {
      // Gerar um novo PDF
      toast.loading('Gerando PDF...');
      await exportToPDF(listId, listName, companyId);
      toast.success('PDF gerado com sucesso!');
    }
  } catch (error) {
    console.error('Erro ao abrir PDF programado:', error);
    toast.error(`Erro ao abrir PDF programado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}
