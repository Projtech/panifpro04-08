import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { 
    ProductionList, 
    ProductionListItem, 
    ProductionListItemWithDetails, 
    getProductionListItemsWithDetails // Importante para buscar dados
} from './productionListService'; 
import { getGroups, getSubgroups, Group, Subgroup } from './groupService';
import { toast } from 'sonner'; // Para feedback

/**
 * Interface para representar um item agrupado para a exportação
 */
interface GroupedItem {
  groupId: string;
  groupName: string;
  subgroupId: string;
  subgroupName: string;
  productName: string;
  quantity: number;
  unit: string;
}

/**
 * Função auxiliar para buscar e processar os dados da lista de produção
 * @param listId ID da lista de produção
 * @returns Um array de itens agrupados e ordenados
 */
async function getProcessedListItems(listId: string, companyId: string): Promise<GroupedItem[]> {
  // 1. Buscar os itens da lista com detalhes
  const items = await getProductionListItemsWithDetails(listId, companyId);
  
  if (!items || items.length === 0) {
    throw new Error('Nenhum item encontrado na lista');
  }
  
  // 2. Buscar grupos e subgrupos para mapear IDs para nomes
  const groups = await getGroups(companyId);
  const subgroups = await getSubgroups(companyId);
  
  // 3. Mapear IDs para nomes e preparar dados agrupados
  const groupedItems: GroupedItem[] = items.map(item => {
    // Encontrar grupo e subgrupo para o produto
    const group = groups.find(g => g.id === item.product?.group_id) || { id: 'unknown', name: 'Sem Grupo' };
    const subgroup = subgroups.find(s => s.id === item.product?.subgroup_id) || { id: 'unknown', name: 'Sem Subgrupo', group_id: group.id };
    
    return {
      groupId: group.id,
      groupName: group.name,
      subgroupId: subgroup.id,
      subgroupName: subgroup.name,
      productName: item.product?.name || 'Produto não encontrado',
      quantity: item.quantity,
      unit: item.unit,
    };
  });
  
  // 4. Ordenar os itens por grupo e subgrupo
  groupedItems.sort((a, b) => {
    // Primeiro por grupo
    if (a.groupName < b.groupName) return -1;
    if (a.groupName > b.groupName) return 1;
    
    // Depois por subgrupo
    if (a.subgroupName < b.subgroupName) return -1;
    if (a.subgroupName > b.subgroupName) return 1;
    
    // Por fim pelo nome do produto
    return a.productName.localeCompare(b.productName);
  });
  
  return groupedItems;
}

/**
 * Função auxiliar para gerar o cabeçalho da tabela
 * @param listName Nome da lista de produção
 * @returns O cabeçalho da tabela
 */
function getTableHeader(listName: string) {
  return [
    { content: `Lista de Produção: ${listName}`, colSpan: 4, styles: { fillColor: [220, 220, 220], fontStyle: 'bold', halign: 'left' } },
    [{ content: '', colSpan: 4, styles: { fillColor: [255, 255, 255] } }],
    [{ content: 'Produto', colSpan: 1, styles: { fillColor: [60, 100, 120], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
     { content: 'Quantidade', colSpan: 1, styles: { fillColor: [60, 100, 120], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
     { content: 'Unidade', colSpan: 1, styles: { fillColor: [60, 100, 120], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
     { content: '', colSpan: 1, styles: { fillColor: [255, 255, 255] } }]
  ];
}

/**
 * Função auxiliar para gerar o corpo da tabela
 * @param groupedItems Itens agrupados
 * @returns O corpo da tabela
 */
function getTableBody(groupedItems: GroupedItem[]) {
  const tableRows: any[] = [];
  
  groupedItems.forEach(item => {
    // Adicionar cabeçalho de grupo se mudou
    if (tableRows.length === 0 || tableRows[tableRows.length - 1][0].content !== `Grupo: ${item.groupName}`) {
      tableRows.push([{ content: `Grupo: ${item.groupName}`, colSpan: 4, styles: { fillColor: [220, 220, 220], fontStyle: 'bold', halign: 'left' } }]);
    }
    
    // Adicionar cabeçalho de subgrupo se mudou
    if (tableRows.length === 0 || tableRows[tableRows.length - 1][0].content !== `Subgrupo: ${item.subgroupName}`) {
      tableRows.push([{ content: `Subgrupo: ${item.subgroupName}`, colSpan: 4, styles: { fillColor: [240, 240, 240], fontStyle: 'bold', halign: 'left' } }]);
    }
    
    // Adicionar item
    tableRows.push([
      '', // Espaço para indentação
      item.productName,
      item.quantity.toString(),
      item.unit
    ]);
  });
  
  return tableRows;
}

/**
 * Exporta uma lista de produção para o formato PDF
 * @param listId ID da lista de produção a ser exportada
 * @param listName Nome da lista de produção para ser usado no título e nome do arquivo
 * @param companyId ID da empresa para filtrar os dados
 */
export async function exportToPDF(listId: string, listName: string, companyId: string): Promise<void> {
  if (!companyId || typeof companyId !== "string") {
    throw new Error('[exportToPDF] companyId é obrigatório');
  }
  
  let loadingToast: any = null;
  
  try {
    // Feedback inicial
    loadingToast = toast.loading('Gerando PDF...');
    
    // Buscar e processar os dados da lista - PASSANDO O companyId
    const groupedItems = await getProcessedListItems(listId, companyId);
    
    // 5. Gerar PDF
    const doc = new jsPDF();
    
    // Configurar fonte para suportar caracteres especiais
    doc.setFont('helvetica');
    
    // Adicionar título
    doc.setFontSize(16);
    doc.text(`Lista de Produção: ${listName}`, 14, 15);
    
    // Adicionar data
    doc.setFontSize(10);
    const dateStr = new Date().toLocaleDateString('pt-BR');
    doc.text(`Data: ${dateStr}`, 14, 22);
    
    // Preparar dados para a tabela
    let currentGroup = '';
    let currentSubgroup = '';
    const tableRows: any[] = [];
    
    groupedItems.forEach(item => {
      // Adicionar cabeçalho de grupo se mudou
      if (currentGroup !== item.groupName) {
        currentGroup = item.groupName;
        tableRows.push([{ content: `Grupo: ${currentGroup}`, colSpan: 4, styles: { fillColor: [220, 220, 220], fontStyle: 'bold', halign: 'left' } }]);
        currentSubgroup = ''; // Resetar subgrupo ao mudar de grupo
      }
      
      // Adicionar cabeçalho de subgrupo se mudou
      if (currentSubgroup !== item.subgroupName) {
        currentSubgroup = item.subgroupName;
        tableRows.push([{ content: `Subgrupo: ${currentSubgroup}`, colSpan: 4, styles: { fillColor: [240, 240, 240], fontStyle: 'bold', halign: 'left' } }]);
      }
      
      // Adicionar item
      tableRows.push([
        '', // Espaço para indentação
        item.productName,
        item.quantity.toString(),
        item.unit
      ]);
    });
    
    // Configurar e gerar tabela
    autoTable(doc, {
      startY: 25,
      head: [['', 'Produto', 'Quantidade', 'Unidade']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [60, 100, 120],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 20, halign: 'center' }
      },
      didParseCell: function(data) {
        // Adicionar estilos específicos para células
        const rowIndex = data.row.index;
        const cell = data.cell;
        
        // Ajustar estilo de títulos de grupo/subgrupo (que possuem colSpan)
        if (cell.colSpan > 1) {
          cell.styles.fontSize = 11;
        }
      }
    });
    
    // Iniciar download
    doc.save(`${listName}.pdf`);
    
    // Feedback de sucesso
    toast.success('PDF gerado com sucesso!');
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    toast.error(`Erro ao gerar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  } finally {
    // Limpar toast de loading se existir
    if (loadingToast) {
      toast.dismiss(loadingToast);
    }
  }
}

/**
 * Exporta uma lista de produção para o formato Excel
 * @param listId ID da lista de produção a ser exportada
 * @param listName Nome da lista de produção para ser usado no título e nome do arquivo
 * @param companyId ID da empresa para filtrar os dados
 */
export async function exportToExcel(listId: string, listName: string, companyId: string): Promise<void> {
  if (!companyId || typeof companyId !== "string") {
    throw new Error('[exportToExcel] companyId é obrigatório');
  }
  
  let loadingToast: any = null;
  
  try {
    // Feedback inicial
    loadingToast = toast.loading('Gerando Excel...');
    
    // Buscar e processar os dados da lista - PASSANDO O companyId
    const groupedItems = await getProcessedListItems(listId, companyId);
    
    // Criar um novo workbook do Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(listName);
    
    // Configurar colunas
    worksheet.columns = [
      { header: 'Grupo/Subgrupo', key: 'group', width: 25 },
      { header: 'Produto', key: 'product', width: 40 },
      { header: 'Quantidade', key: 'quantity', width: 15 },
      { header: 'Unidade', key: 'unit', width: 10 }
    ];
    
    // Estilizar o cabeçalho
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF305078' } // Cor azul similar ao PDF
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Adicionar título acima da tabela (opcional)
    worksheet.insertRow(1, []);
    worksheet.insertRow(1, [`Lista de Produção: ${listName}`]);
    worksheet.insertRow(2, [`Data: ${new Date().toLocaleDateString('pt-BR')}`]);
    worksheet.mergeCells('A1:D1');
    worksheet.mergeCells('A2:D2');
    
    // Estilizar o título
    const titleCell = worksheet.getCell('A1');
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'left' };
    
    // Estilizar a data
    const dateCell = worksheet.getCell('A2');
    dateCell.font = { size: 10 };
    dateCell.alignment = { horizontal: 'left' };
    
    // Ajustar o índice da linha após inserir linhas adicionais
    let rowIndex = 4; // Começar após o título, data e cabeçalho
    
    // Variáveis para controlar o agrupamento
    let currentGroup = '';
    let currentSubgroup = '';
    
    // Adicionar dados agrupados
    groupedItems.forEach(item => {
      // Adicionar cabeçalho de grupo se mudou
      if (currentGroup !== item.groupName) {
        currentGroup = item.groupName;
        
        // Inserir linha de grupo
        const groupRow = worksheet.addRow([`Grupo: ${currentGroup}`, '', '', '']);
        worksheet.mergeCells(`A${rowIndex}:D${rowIndex}`);
        
        // Estilizar célula de grupo
        const groupCell = worksheet.getCell(`A${rowIndex}`);
        groupCell.font = { bold: true };
        groupCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDCDCDC' } // Cinza claro
        };
        
        rowIndex++;
        currentSubgroup = ''; // Resetar subgrupo ao mudar de grupo
      }
      
      // Adicionar cabeçalho de subgrupo se mudou
      if (currentSubgroup !== item.subgroupName) {
        currentSubgroup = item.subgroupName;
        
        // Inserir linha de subgrupo
        const subgroupRow = worksheet.addRow([`Subgrupo: ${currentSubgroup}`, '', '', '']);
        worksheet.mergeCells(`A${rowIndex}:D${rowIndex}`);
        
        // Estilizar célula de subgrupo
        const subgroupCell = worksheet.getCell(`A${rowIndex}`);
        subgroupCell.font = { bold: true };
        subgroupCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F0F0' } // Cinza muito claro
        };
        
        rowIndex++;
      }
      
      // Adicionar linha de item
      const itemRow = worksheet.addRow(['', item.productName, item.quantity, item.unit]);
      
      // Alinhar quantidade à direita
      const quantityCell = worksheet.getCell(`C${rowIndex}`);
      quantityCell.alignment = { horizontal: 'right' };
      
      // Alinhar unidade ao centro
      const unitCell = worksheet.getCell(`D${rowIndex}`);
      unitCell.alignment = { horizontal: 'center' };
      
      rowIndex++;
    });
    
    // Aplicar bordas a todas as células da tabela
    for (let i = 4; i < rowIndex; i++) {
      worksheet.getRow(i).eachCell({ includeEmpty: true }, (cell) => {
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
    saveAs(blob, `${listName}.xlsx`);
    
    // Feedback de sucesso
    toast.success('Planilha Excel gerada com sucesso!');
  } catch (error) {
    console.error('Erro ao gerar planilha Excel:', error);
    toast.error(`Erro ao gerar planilha Excel: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  } finally {
    // Limpar toast de loading se existir
    if (loadingToast) {
      toast.dismiss(loadingToast);
    }
  }
}
