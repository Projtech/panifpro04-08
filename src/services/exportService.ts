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
import { MemoryCache } from '@/utils/cacheUtils';
import { storePdfLocally, getStoredPdf } from '@/utils/pdfStorageUtils';
import { supabase } from '@/integrations/supabase/client';

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

// Interfaces para tipagem das tabelas do Supabase
interface DbProductionListItem {
  id: string;
  list_id: string;
  product_id: string;
  quantity: number;
  unit: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  ativo?: boolean;
}

interface DbProduct {
  id: string;
  name: string;
  group_id?: string;
  subgroup_id?: string;
  unit: string;
  company_id: string;
}

interface DbGroup {
  id: string;
  name: string;
  company_id: string;
}

interface DbSubgroup {
  id: string;
  name: string;
  group_id: string;
  company_id: string;
}

// Interfaces para tipagem dos dados do banco
interface ListItem {
  id: string;
  product_id: string;
  quantity: number | string;
  unit: string;
}

interface ProductItem {
  id: string;
  name: string;
  group_id?: string;
  subgroup_id?: string;
  unit: string;
}

interface GroupItem {
  id: string;
  name: string;
}

interface SubgroupItem {
  id: string;
  name: string;
  group_id: string;
}

/**
 * Versão otimizada para buscar itens da lista para exportação
 * Usa consultas otimizadas para reduzir chamadas ao servidor
 */
async function getProcessedListItemsOptimized(
  supabaseClient: any,
  listId: string, 
  companyId: string
): Promise<GroupedItem[]> {
  if (!companyId) throw new Error('[getProcessedListItemsOptimized] companyId é obrigatório');
  
  try {
    // 1. Buscar todos os itens da lista
    const { data: listItems, error: itemsError } = await supabaseClient
      .from('production_list_items')
      .select('id, product_id, quantity, unit')
      .eq('list_id', listId)
      .eq('company_id', companyId);
    
    if (itemsError) throw itemsError;
    if (!listItems || !Array.isArray(listItems) || listItems.length === 0) {
      throw new Error('Nenhum item encontrado na lista');
    }
    
    // Filtrar itens válidos
    const items = listItems.filter((item): item is ListItem => 
      item !== null && 
      typeof item === 'object' && 
      'product_id' in item && 
      item.product_id !== null && 
      item.product_id !== undefined
    );
    
    if (items.length === 0) {
      throw new Error('Nenhum produto válido encontrado na lista');
    }
    
    // 2. Buscar todos os produtos necessários em lote
    const productIds = items.map(item => item.product_id);
    
    const { data: productList, error: productsError } = await supabaseClient
      .from('products')
      .select('id, name, group_id, subgroup_id, unit')
      .in('id', productIds)
      .eq('company_id', companyId);
      
    if (productsError) throw productsError;
    if (!productList || !Array.isArray(productList)) {
      throw new Error('Erro ao buscar produtos');
    }
    
    // Filtrar produtos válidos
    const products = productList.filter((product): product is ProductItem => 
      product !== null && 
      typeof product === 'object' && 
      'id' in product && 
      product.id !== null
    );
    
    // 3. Extrair IDs únicos de grupos e subgrupos
    const groupIds = [...new Set(products
      .filter(product => product.group_id)
      .map(product => product.group_id as string))];
      
    const subgroupIds = [...new Set(products
      .filter(product => product.subgroup_id)
      .map(product => product.subgroup_id as string))];
    
    // 4. Buscar grupos e subgrupos em consultas paralelas
    const [groupsResult, subgroupsResult] = await Promise.all([
      // Buscar apenas os grupos necessários
      supabaseClient
        .from('groups')
        .select('id, name')
        .eq('company_id', companyId)
        .in('id', groupIds.length > 0 ? groupIds : ['no-groups']),
        
      // Buscar apenas os subgrupos necessários
      supabaseClient
        .from('subgroups')
        .select('id, name, group_id')
        .eq('company_id', companyId)
        .in('id', subgroupIds.length > 0 ? subgroupIds : ['no-subgroups'])
    ]);
    
    if (groupsResult.error) throw groupsResult.error;
    if (subgroupsResult.error) throw subgroupsResult.error;
    
    // 5. Criar mapas para acesso rápido
    const groupsMap = new Map<string, GroupItem>();
    if (groupsResult.data && Array.isArray(groupsResult.data)) {
      groupsResult.data
        .filter((group): group is GroupItem => 
          group !== null && 
          typeof group === 'object' && 
          'id' in group && 
          group.id !== null
        )
        .forEach(group => {
          groupsMap.set(group.id, group);
        });
    }
    
    const subgroupsMap = new Map<string, SubgroupItem>();
    if (subgroupsResult.data && Array.isArray(subgroupsResult.data)) {
      subgroupsResult.data
        .filter((subgroup): subgroup is SubgroupItem => 
          subgroup !== null && 
          typeof subgroup === 'object' && 
          'id' in subgroup && 
          subgroup.id !== null
        )
        .forEach(subgroup => {
          subgroupsMap.set(subgroup.id, subgroup);
        });
    }
    
    const productsMap = new Map<string, ProductItem>();
    products.forEach(product => {
      productsMap.set(product.id, product);
    });
    
    // 6. Mapear itens para o formato necessário
    const groupedItems: GroupedItem[] = [];
    
    // Processar itens
    for (const item of items) {
      const product = productsMap.get(item.product_id);
      if (!product) {
        groupedItems.push({
          groupId: 'unknown',
          groupName: 'Sem Grupo',
          subgroupId: 'unknown',
          subgroupName: 'Sem Subgrupo',
          productName: 'Produto não encontrado',
          quantity: Number(item.quantity) || 0,
          unit: item.unit || 'UN',
        });
        continue;
      }
      
      const groupId = product.group_id;
      const subgroupId = product.subgroup_id;
      
      const group = groupId ? groupsMap.get(groupId) : null;
      const subgroup = subgroupId ? subgroupsMap.get(subgroupId) : null;
      
      groupedItems.push({
        groupId: group?.id || 'unknown',
        groupName: group?.name || 'Sem Grupo',
        subgroupId: subgroup?.id || 'unknown',
        subgroupName: subgroup?.name || 'Sem Subgrupo',
        productName: product.name || 'Produto não encontrado',
        quantity: Number(item.quantity) || 0,
        unit: item.unit || product.unit || 'UN',
      });
    }
    
    // 7. Ordenar os itens
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
  } catch (error) {
    console.error("Erro ao buscar itens da lista:", error);
    throw error;
  }
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
 * Versão otimizada usando Edge Function do Supabase para geração no servidor
 * @param listId ID da lista de produção a ser exportada
 * @param listName Nome da lista de produção para ser usado no título e nome do arquivo
 * @param companyId ID da empresa para filtrar os dados
 */
/**
 * Gera um PDF localmente usando jsPDF e autoTable
 * @param groupedItems Itens agrupados para incluir no PDF
 * @param listName Nome da lista para o título do PDF
 * @returns Documento PDF gerado
 */
async function generatePDFLocally(groupedItems: GroupedItem[], listName: string): Promise<any> {
  // Importar jsPDF e autoTable dinamicamente para evitar problemas no SSR
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  
  // Criar documento PDF
  const doc = new jsPDF();
  
  // Adicionar título
  doc.setFontSize(18);
  doc.text(`Lista de Produção: ${listName}`, 14, 15);
  
  // Preparar dados para a tabela
  const tableRows = groupedItems.map((item, index) => [
    (index + 1).toString(),
    `${item.productName} (${item.groupName} > ${item.subgroupName})`,
    item.quantity.toString(),
    item.unit
  ]);
  
  // Configurar e gerar tabela
  autoTable(doc, {
    startY: 25,
    head: [['', 'Produto', 'Quantidade', 'Unidade']],
    body: tableRows,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 20, halign: 'center' }
    }
  });
  
  // Adicionar rodapé
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Gerado em ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()} | Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  return doc;
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
    
    // 1. Verificar se há uma versão armazenada localmente
    const storedPdf = getStoredPdf(`${listId}_${companyId}`);
    if (storedPdf) {
      // Usar PDF armazenado localmente
      saveAs(storedPdf, `${listName}.pdf`);
      toast.success('PDF carregado do cache local!');
      return;
    }
    
    // 2. Como estamos enfrentando problemas com a Edge Function, vamos gerar o PDF localmente
    console.log('Gerando PDF localmente devido a problemas com a Edge Function...');
    
    // 2.1 Buscar os dados necessários
    // Importar o cliente Supabase da aplicação
    const { supabase } = await import('../integrations/supabase/client');
    
    // Verificar se os parâmetros são strings válidas
    if (typeof listId !== 'string' || !listId) {
      throw new Error('ID da lista inválido');
    }
    
    const groupedItems = await getProcessedListItemsOptimized(supabase, listId, companyId);
    
    // 2.2 Gerar o PDF localmente
    const pdfDoc = await generatePDFLocally(groupedItems, listName);
    
    // 2.3 Converter para blob
    const pdfBlob = new Blob([pdfDoc.output('arraybuffer')], { type: 'application/pdf' });
    
    // 2.4 Armazenar localmente para uso futuro
    await storePdfLocally(`${listId}_${companyId}`, pdfBlob);
    
    // 2.5 Iniciar download
    saveAs(pdfBlob, `${listName}.pdf`);
    
    console.log('PDF gerado e baixado com sucesso localmente!');
    
    // 6. Feedback de sucesso
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
