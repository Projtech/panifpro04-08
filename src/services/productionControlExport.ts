import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Interface para os dados retornados pela função RPC
interface ProductionControlItem {
  list_id: string;
  list_name: string;
  list_created_at: string;
  list_type: string;
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit: string;
  group_id: string;
  group_name: string;
  subgroup_id: string;
  subgroup_name: string;
  responsible_initials: string;
}

/**
 * Exporta um relatório de controle de produção no formato Excel conforme o padrão da padaria
 * @param listId ID da lista de produção a ser exportada
 * @param listName Nome da lista de produção 
 * @param companyId ID da empresa para filtrar os dados
 * @param userName Nome do usuário logado para ser usado como responsável
 */
export async function exportToProductionControlExcel(listId: string, listName: string, companyId: string, userName?: string): Promise<void> {
  if (!companyId || typeof companyId !== "string") {
    throw new Error('[exportToProductionControlExcel] companyId é obrigatório');
  }
  
  let loadingToast: any = null;
  
  try {
    // Feedback inicial
    loadingToast = toast.loading('Gerando relatório de controle de produção...');
    
    // Buscar dados para o relatório de controle de produção usando a função RPC
    const { data: reportItems, error } = await supabase
      .rpc('get_production_control_data', {
        p_list_id: listId,
        p_company_id: companyId
      }) as unknown as { data: ProductionControlItem[] | null, error: any };
    
    if (error) throw error;
    if (!reportItems || reportItems.length === 0) {
      throw new Error('Nenhum item encontrado para esta lista');
    }
    
    // Obter a data atual e dia da semana
    const today = new Date();
    const dayOfWeek = format(today, 'EEEE', { locale: ptBR });
    const formattedDate = format(today, 'dd/MM/yyyy');
    const dayOfWeekCapitalized = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1).toUpperCase();
    
    // Criar um novo workbook do Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Controle de Produção');
    
    // Configurar página para impressão em A4
    worksheet.pageSetup.paperSize = 9; // A4
    worksheet.pageSetup.orientation = 'portrait';
    worksheet.pageSetup.fitToPage = true;
    worksheet.pageSetup.fitToWidth = 1;
    worksheet.pageSetup.fitToHeight = 0;
    worksheet.pageSetup.margins = {
      left: 0.25,
      right: 0.25,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3
    };
    
    // Definir larguras das colunas
    worksheet.columns = [
      { header: 'COD', key: 'code', width: 8 },
      { header: 'PRODUTOS', key: 'product', width: 40 },
      { header: 'QTDE', key: 'quantity', width: 8 },
      { header: 'UNID MEDIDA', key: 'unit', width: 12 },
      { header: 'RESPONSÁVEL', key: 'responsible', width: 12 },
      { header: 'PRODUÇÃO REALIZADA', key: 'production', width: 12 },
      { header: 'FALTA', key: 'missing', width: 8 },
      { header: 'SOBRA', key: 'leftover', width: 8 },
      { header: 'CONTROLE QUALIDADE', key: 'quality', width: 12 }
    ];
    
    // Adicionar cabeçalho principal
    const headerRow = worksheet.addRow(['CONTROLE DE PRODUÇÃO']);
    worksheet.mergeCells(`A${headerRow.number}:I${headerRow.number}`);
    headerRow.height = 25;
    headerRow.getCell(1).font = { bold: true, size: 16 };
    headerRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'D9D9D9' } // Cinza claro
    };
    
    // Adicionar instruções
    const instructionRow1 = worksheet.addRow(['FALTA : ANTES DAS 19H MARCAR COM X SE O PRODUTO ACABOU NO DECORRER DO DIA']);
    worksheet.mergeCells(`A${instructionRow1.number}:I${instructionRow1.number}`);
    instructionRow1.getCell(1).font = { bold: true, size: 10 };
    
    const instructionRow2 = worksheet.addRow(['SOBRA: 1H ANTES DE FECHAR A PADARIA MARCAR A QUANTIDADE QUE SOBROU DE CADA PRODUTO']);
    worksheet.mergeCells(`A${instructionRow2.number}:I${instructionRow2.number}`);
    instructionRow2.getCell(1).font = { bold: true, size: 10 };
    
    const instructionRow3 = worksheet.addRow(['CONTROLE DE PERDAS: LANÇAMENTO DIRETO DO SISTEMA DIARIAMENTE']);
    worksheet.mergeCells(`A${instructionRow3.number}:I${instructionRow3.number}`);
    instructionRow3.getCell(1).font = { bold: true, size: 10 };
    
    // Adicionar título da seção
    const titleRow = worksheet.addRow(['PEDIDO DE PRODUÇÃO - PADARIA', '', '', '', `DATA:___/___/_____`, dayOfWeekCapitalized]);
    worksheet.mergeCells(`A${titleRow.number}:D${titleRow.number}`);
    worksheet.mergeCells(`E${titleRow.number}:F${titleRow.number}`);
    worksheet.mergeCells(`G${titleRow.number}:I${titleRow.number}`);
    titleRow.getCell(1).font = { bold: true, size: 12 };
    titleRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'C6E0B4' } // Verde claro
    };
    titleRow.getCell(5).font = { bold: true, size: 10 };
    titleRow.getCell(7).font = { bold: true, size: 10 };
    titleRow.getCell(7).alignment = { horizontal: 'center' };
    
    // Adicionar cabeçalho da tabela
    const headerRow2 = worksheet.addRow([
      'COD',
      'PRODUTOS',
      'QTDE',
      'UNID MEDIDA',
      'RESPONSÁVEL',
      'PRODUÇÃO REALIZ',
      'FALTA',
      'SOBRA',
      'CONTROLE QUALIDADE'
    ]);
    
    // Estilizar cabeçalho das colunas
    headerRow2.eachCell((cell) => {
      cell.font = { bold: true, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'A6A6A6' } // Cinza médio
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Agrupar itens por grupo e subgrupo
    const groupedItems: Record<string, Record<string, ProductionControlItem[]>> = {};
    reportItems.forEach(item => {
      const groupName = item.group_name || 'Sem Grupo';
      const subgroupName = item.subgroup_name || 'Sem Subgrupo';
      
      if (!groupedItems[groupName]) {
        groupedItems[groupName] = {};
      }
      
      if (!groupedItems[groupName][subgroupName]) {
        groupedItems[groupName][subgroupName] = [];
      }
      
      groupedItems[groupName][subgroupName].push(item);
    });
    
    // Ordenar os grupos e subgrupos alfabeticamente
    const sortedGroupNames = Object.keys(groupedItems).sort();
    
    // Variável para controlar a altura da linha
    const rowHeight = 20;
    
    // Adicionar dados agrupados
    let currentRowIndex = headerRow2.number + 1;
    let isFirstGroup = true;
    
    // Usar os grupos ordenados
    for (const groupName of sortedGroupNames) {
      // Se não for o primeiro grupo, adicionar um novo cabeçalho de colunas para melhorar a impressão
      if (!isFirstGroup) {
        // Adicionar espaço antes do novo grupo
        const spacerRow = worksheet.addRow(['']);
        worksheet.mergeCells(`A${spacerRow.number}:I${spacerRow.number}`);
        currentRowIndex++;
        
        // Repetir o cabeçalho das colunas
        const newColumnHeaderRow = worksheet.addRow([
          'COD', 'PRODUTOS', 'QTDE', 'UNID MEDIDA', 'RESPONSÁVEL', 'PRODUÇÃO REALIZADA', 'FALTA', 'SOBRA', 'CONTROLE QUALIDADE'
        ]);
        
        // Estilizar o novo cabeçalho
        newColumnHeaderRow.eachCell((cell) => {
          cell.font = { bold: true, size: 10 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'A6A6A6' } // Cinza médio
          };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
        
        currentRowIndex++;
      }
      
      isFirstGroup = false;
      
      // Adicionar cabeçalho do grupo
      const groupHeaderRow = worksheet.addRow([
        'COD',
        groupName.toUpperCase(),
        'QTDE',
        'UNID MEDIDA',
        'RESPONSÁVEL',
        'PRODUÇÃO REALIZ',
        'FALTA',
        'SOBRA',
        'CONTROLE QUALIDADE'
      ]);
      
      // Estilizar o cabeçalho do grupo
      groupHeaderRow.eachCell((cell) => {
        cell.font = { bold: true, size: 10 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'BFBFBF' } // Cinza médio
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      currentRowIndex++;
      
      // Ordenar os subgrupos alfabeticamente
      const sortedSubgroupNames = Object.keys(groupedItems[groupName]).sort();
      
      for (const subgroupName of sortedSubgroupNames) {
        const items = groupedItems[groupName][subgroupName];
        
        // Adicionar cabeçalho do subgrupo se não for "Sem Subgrupo"
        if (subgroupName !== 'Sem Subgrupo') {
          const subgroupHeaderRow = worksheet.addRow([
            '',
            `- ${subgroupName.toUpperCase()}`,
            '',
            '',
            '',
            '',
            '',
            '',
            ''
          ]);
          
          // Estilizar o cabeçalho do subgrupo
          subgroupHeaderRow.eachCell((cell) => {
            cell.font = { bold: true, italic: true, size: 10 };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });
          currentRowIndex++;
        }
        
        // Ordenar os itens pelo nome do produto
        const sortedItems = [...items].sort((a, b) => 
          (a.product_name || '').localeCompare(b.product_name || '')
        );
        
        // Adicionar os itens do subgrupo
        sortedItems.forEach(item => {
          // Garantir que o código do produto seja exibido
          let productCode = item.product_code || '';
          
          // Se não tiver código, gerar um baseado no ID do produto
          if (!productCode && item.product_id) {
            // Usar os primeiros 6 caracteres do ID
            productCode = `P-${item.product_id.substring(0, 6)}`;
          }
          
          const dataRow = worksheet.addRow([
            productCode,
            item.product_name || '',
            String(item.quantity) || '',
            item.unit || '',
            item.responsible_initials || 'JR',
            '', // Produção realizada (vazio para preenchimento manual)
            '', // Falta (vazio para preenchimento manual)
            '', // Sobra (vazio para preenchimento manual)
            ''  // Controle qualidade (vazio para preenchimento manual)
          ]);
          
          // Estilizar a linha de dados
          dataRow.height = rowHeight;
          dataRow.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
            
            // Alinhar quantidade à direita
            if (cell.col === 3) {
              cell.alignment = { horizontal: 'right' };
            }
            
            // Alinhar unidade e responsável ao centro
            if (cell.col === 4 || cell.col === 5) {
              cell.alignment = { horizontal: 'center' };
            }
          });
          
          currentRowIndex++;
        });
      }
    }
    
    // Aplicar bordas a todas as células
    for (let i = 1; i <= currentRowIndex; i++) {
      const row = worksheet.getRow(i);
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    }
    
    // Gerar o arquivo Excel e iniciar o download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Controle_Producao_${format(today, 'dd-MM-yyyy')}.xlsx`);
    
    // Feedback de sucesso
    toast.success('Relatório de controle de produção gerado com sucesso!');
  } catch (error) {
    console.error('Erro ao gerar relatório de controle de produção:', error);
    toast.error(`Erro ao gerar relatório: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  } finally {
    // Limpar toast de loading se existir
    if (loadingToast) {
      toast.dismiss(loadingToast);
    }
  }
}
