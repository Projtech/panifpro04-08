import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Interface para representar um produto no calendário semanal
interface ProductCalendarItem {
  id: string;
  code?: string;
  name: string;
  group: string;
  subgroup: string;
  productionDays: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  productionPattern: string; // Ex: "DIARIO", "SEG, QUA, SEX", etc.
}

/**
 * Busca todos os produtos e seus padrões de produção para o calendário semanal
 * @param companyId ID da empresa
 * @returns Lista de produtos com seus padrões de produção
 */
async function getProductsForWeeklyCalendar(companyId: string): Promise<ProductCalendarItem[]> {
  try {
    // 1. Buscar todos os produtos da empresa com seus dias de produção
    const { data: products, error: productsError } = await supabase
      .from('products' as any)
      .select('id, code, name, group_id, subgroup_id, all_days, monday, tuesday, wednesday, thursday, friday, saturday, sunday')
      .eq('company_id', companyId)
      .eq('ativo', true)
      .order('name') as { data: any[], error: any };
    
    if (productsError) throw productsError;
    if (!products || products.length === 0) {
      throw new Error('Nenhum produto encontrado');
    }
    
    // 2. Buscar grupos e subgrupos para mapear IDs para nomes
    const [groupsResult, subgroupsResult] = await Promise.all([
      supabase
        .from('groups' as any)
        .select('id, name')
        .eq('company_id', companyId),
        
      supabase
        .from('subgroups' as any)
        .select('id, name, group_id')
        .eq('company_id', companyId)
    ]);
    
    // Tratando os resultados como any para evitar erros de tipagem
    if ((groupsResult as any).error) throw (groupsResult as any).error;
    if ((subgroupsResult as any).error) throw (subgroupsResult as any).error;
    
    const groups = (groupsResult as any).data || [];
    const subgroups = (subgroupsResult as any).data || [];
    
    // Criar mapas para acesso rápido
    const groupMap = new Map();
    groups.forEach((group: any) => {
      groupMap.set(group.id, group.name);
    });
    
    const subgroupMap = new Map();
    subgroups.forEach((subgroup: any) => {
      subgroupMap.set(subgroup.id, {
        name: subgroup.name,
        group_id: subgroup.group_id
      });
    });
    
    // 3. Processar produtos para o formato do calendário
    const calendarItems: ProductCalendarItem[] = products.map((product: any) => {
      // Encontrar nomes de grupo e subgrupo
      let groupName = '';
      let subgroupName = '';
      
      if (product.group_id && groupMap.has(product.group_id)) {
        groupName = groupMap.get(product.group_id);
      }
      
      if (product.subgroup_id && subgroupMap.has(product.subgroup_id)) {
        const subgroupInfo = subgroupMap.get(product.subgroup_id);
        subgroupName = subgroupInfo.name;
      }
      
      // Obter os dias de produção diretamente do produto
      const days = {
        monday: product.monday || product.all_days,
        tuesday: product.tuesday || product.all_days,
        wednesday: product.wednesday || product.all_days,
        thursday: product.thursday || product.all_days,
        friday: product.friday || product.all_days,
        saturday: product.saturday || product.all_days,
        sunday: product.sunday || product.all_days
      };
      
      // Se all_days estiver marcado, definir todos os dias como true
      if (product.all_days) {
        days.monday = true;
        days.tuesday = true;
        days.wednesday = true;
        days.thursday = true;
        days.friday = true;
        days.saturday = true;
        days.sunday = true;
      }
      
      // Gerar padrão de texto com base nos dias selecionados
      const daysList = [];
      if (days.monday) daysList.push('SEG');
      if (days.tuesday) daysList.push('TER');
      if (days.wednesday) daysList.push('QUA');
      if (days.thursday) daysList.push('QUI');
      if (days.friday) daysList.push('SEX');
      if (days.saturday) daysList.push('SAB');
      if (days.sunday) daysList.push('DOM');
      
      // Definir o padrão de produção
      let pattern;
      if (product.all_days || daysList.length === 7) {
        pattern = 'DIARIO';
      } else if (daysList.length > 0) {
        pattern = daysList.join(', ');
      } else {
        pattern = 'NENHUM';
      }
      
      return {
        id: product.id,
        code: product.code || '',
        name: product.name,
        group: groupName,
        subgroup: subgroupName,
        productionDays: days,
        productionPattern: pattern
      };
    });
    
    return calendarItems;
  } catch (error) {
    console.error('Erro ao buscar produtos para calendário:', error);
    throw error;
  }
}

// Variável para controlar se uma exportação já está em andamento
let isExportingPDF = false;

/**
 * Exporta o calendário semanal de produção para PDF
 * @param companyId ID da empresa
 * @param companyName Nome da empresa para o título
 */
export async function exportWeeklyCalendarToPDF(companyId: string, companyName: string): Promise<void> {
  // Evitar múltiplas chamadas simultâneas
  if (isExportingPDF) {
    console.log('Exportação para PDF já está em andamento. Ignorando nova chamada.');
    return;
  }
  
  let loadingToast: any = null;
  
  try {
    // Marcar que uma exportação está em andamento
    isExportingPDF = true;
    
    // Feedback inicial
    loadingToast = toast.loading('Gerando calendário de produção em PDF...');
    
    // Buscar dados da view production_calendar_report
    type CalendarReportRow = {
      product_id: string;
      product_code: string;
      product_name: string;
      group_name: string;
      subgroup_name: string;
      monday: boolean;
      tuesday: boolean;
      wednesday: boolean;
      thursday: boolean;
      friday: boolean;
      saturday: boolean;
      sunday: boolean;
      production_schedule: string;
      company_id: string;
    };
    
    // Definindo tipagem explícita para a view personalizada
    const result = await supabase
      .from('production_calendar_report' as any)
      .select('*')
      .eq('company_id', companyId)
      .order('group_name', { ascending: true })
      .order('subgroup_name', { ascending: true })
      .order('product_name', { ascending: true });
      
    // Extraindo dados e erro com tipagem segura
    const reportRowsUntyped = (result as any).data;
    const reportError = (result as any).error;
    
    // Cast para o tipo correto e verificar se não é nulo
    const reportRows = reportRowsUntyped ? reportRowsUntyped as CalendarReportRow[] : [];

    if (reportError) {
      toast.error('Erro ao buscar dados do relatório: ' + reportError.message);
      if (loadingToast) toast.dismiss(loadingToast);
      return;
    }
    if (!reportRows || reportRows.length === 0) {
      toast.warning('Nenhum dado encontrado para o relatório!');
      if (loadingToast) toast.dismiss(loadingToast);
      return;
    }

    // Buscar nome da empresa
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();
    const companyNameFromDb = companyData?.name || companyName || '';

    // Obter nome do usuário autenticado
    let userName = 'Usuário';
    try {
      // Compatibilidade com diferentes versões do Supabase
      if (supabase.auth.getUser) {
        const userResult = await supabase.auth.getUser();
        userName = userResult.data.user?.user_metadata?.name || userResult.data.user?.email || 'Usuário';
      } else {
        // @ts-ignore - Ignora erro de tipagem para compatibilidade com versões antigas
        const user = supabase.auth.user?.();
        userName = user?.user_metadata?.name || user?.email || 'Usuário';
      }
    } catch (e) {
      console.log('Erro ao obter usuário:', e);
      userName = 'Usuário';
    }
    
    // Agrupar produtos por grupo e subgrupo
    const groupedProducts: Record<string, Record<string, CalendarReportRow[]>> = {};
    
    for (const row of reportRows) {
      if (!groupedProducts[row.group_name]) {
        groupedProducts[row.group_name] = {};
      }
      if (!groupedProducts[row.group_name][row.subgroup_name]) {
        groupedProducts[row.group_name][row.subgroup_name] = [];
      }
      groupedProducts[row.group_name][row.subgroup_name].push(row);
    }
    
    // Criar documento PDF
    const doc = new jsPDF('landscape');
    
    // Definir margens e posições iniciais
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    let yPosition = margin;
    
    // Reservar espaço para logotipo (canto superior esquerdo) - mais compacto
    doc.rect(margin, yPosition, 25, 15, 'S');
    doc.setFontSize(8);
    doc.text('LOGO', margin + 12.5, yPosition + 7.5, { align: 'center' });
    
    // Adicionar título principal - mais compacto
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CALENDÁRIO DE PRODUÇÃO', pageWidth / 2, yPosition + 6, { align: 'center' });
    
    // Adicionar nome da empresa
    yPosition += 10;
    doc.setFontSize(12);
    doc.text(companyNameFromDb.toUpperCase(), pageWidth / 2, yPosition + 6, { align: 'center' });
    
    // Adicionar data e responsável
    yPosition += 8;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const currentDate = new Date().toLocaleDateString('pt-BR');
    doc.text(`Data: ${currentDate} | Responsável: ${userName}`, pageWidth / 2, yPosition + 6, { align: 'center' });
    
    // Avançar posição para começar as tabelas
    yPosition += 10;
    
    // Para cada grupo, criar uma seção na tabela
    for (const groupName of Object.keys(groupedProducts).sort()) {
      const groupData = groupedProducts[groupName];
      
      // Verificar se precisa adicionar nova página
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = margin;
      }
      
      // Dados para a tabela
      const tableHeaders = [
        ['COD', groupName.toUpperCase(), 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM', 'CALENDÁRIO DE PRODUÇÃO']
      ];
      
      const tableRows = [];
      
      // Adicionar linha de "DIAS DE PRODUÇÃO"
      tableRows.push([{
        content: '',
        styles: { fillColor: [255, 255, 255] }
      }, {
        content: '',
        styles: { fillColor: [255, 255, 255] }
      }, {
        content: 'DIAS DE PRODUÇÃO',
        colSpan: 7,
        styles: {
          fillColor: [189, 215, 238],
          fontStyle: 'bold',
          halign: 'center'
        }
      }, {
        content: '',
        styles: { fillColor: [255, 255, 255] }
      }]);
      
      // Para cada subgrupo, adicionar produtos
      for (const subgroupName of Object.keys(groupData).sort()) {
        const subgroupProducts = groupData[subgroupName];
        
        // Ordenar produtos por nome
        const sortedProducts = [...subgroupProducts].sort((a, b) => 
          (a.product_name || '').localeCompare(b.product_name || '')
        );
        
        // Adicionar produtos do subgrupo
        for (const product of sortedProducts) {
          // Gerar código no mesmo formato da interface
          let displayCode = product.product_code || '';
          
          // Se não tiver código, gerar baseado no product_id
          if (!displayCode) {
            if (product.product_name.toLowerCase().startsWith('sr ')) {
              // Para subreceitas, gerar código no formato SUB-XXXXXX
              const randomNum = Math.floor(100000 + Math.random() * 900000);
              displayCode = `SUB-${randomNum}`;
            } else {
              // Para produtos normais, usar formato R-XXXXXXXX
              displayCode = `R-${product.product_id.substring(0, 8)}`;
            }
          }
          
          tableRows.push([
            displayCode,
            product.product_name || '',
            product.monday ? 'X' : '',
            product.tuesday ? 'X' : '',
            product.wednesday ? 'X' : '',
            product.thursday ? 'X' : '',
            product.friday ? 'X' : '',
            product.saturday ? 'X' : '',
            product.sunday ? 'X' : '',
            product.production_schedule || ''
          ]);
        }
      }
      
      // Adicionar tabela
      autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: yPosition,
        styles: {
          fontSize: 7,
          cellPadding: 1,
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 65 },
          2: { cellWidth: 8, halign: 'center' },
          3: { cellWidth: 8, halign: 'center' },
          4: { cellWidth: 8, halign: 'center' },
          5: { cellWidth: 8, halign: 'center' },
          6: { cellWidth: 8, halign: 'center' },
          7: { cellWidth: 8, halign: 'center' },
          8: { cellWidth: 8, halign: 'center' },
          9: { cellWidth: 22 }
        },
        headStyles: {
          fillColor: [200, 200, 200],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center'
        },
        didDrawPage: (data) => {
          // Atualizar posição Y para a próxima tabela
          yPosition = data.cursor.y + 10;
        }
      });
      
      // Adicionar espaço entre grupos
      yPosition += 10;
    }
    
    // Salvar PDF
    const pdfBlob = doc.output('blob');
    saveAs(pdfBlob, `Calendario_Producao_${companyNameFromDb.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    
    // Feedback de sucesso
    toast.success('Calendário de produção exportado com sucesso!');
  } catch (error) {
    console.error('Erro ao exportar calendário para PDF:', error);
    toast.error('Erro ao exportar calendário: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
  } finally {
    if (loadingToast) {
      toast.dismiss(loadingToast);
    }
    // Redefinir a variável de controle para permitir novas exportações
    isExportingPDF = false;
  }
}

/**
 * Exporta o calendário semanal de produção para Excel
 * @param companyId ID da empresa
 * @param companyName Nome da empresa para o título
 */
let isExportingExcel = false;

export async function exportWeeklyCalendarToExcel(companyId: string, companyName: string): Promise<void> {
  // Evitar múltiplas chamadas simultâneas
  if (isExportingExcel) {
    console.log('Exportação para Excel já está em andamento. Ignorando nova chamada.');
    return;
  }
  
  let loadingToast: any = null;
  
  try {
    // Marcar que uma exportação está em andamento
    isExportingExcel = true;
    
    // Feedback inicial
    loadingToast = toast.loading('Gerando calendário de produção em Excel...');

    // Buscar dados da view production_calendar_report
    type CalendarReportRow = {
      product_id: string;
      product_code: string;
      product_name: string;
      group_name: string;
      subgroup_name: string;
      monday: boolean;
      tuesday: boolean;
      wednesday: boolean;
      thursday: boolean;
      friday: boolean;
      saturday: boolean;
      sunday: boolean;
      production_schedule: string;
      company_id: string;
    };
    
    // Definindo tipagem explícita para a view personalizada
    const result = await supabase
      .from('production_calendar_report' as any)
      .select('*')
      .eq('company_id', companyId)
      .order('group_name', { ascending: true })
      .order('subgroup_name', { ascending: true })
      .order('product_name', { ascending: true });
      
    // Extraindo dados e erro com tipagem segura
    const reportRowsUntyped = (result as any).data;
    const reportError = (result as any).error;
    
    // Cast para o tipo correto e verificar se não é nulo
    const reportRows = reportRowsUntyped ? reportRowsUntyped as CalendarReportRow[] : [];

    if (reportError) {
      toast.error('Erro ao buscar dados do relatório: ' + reportError.message);
      if (loadingToast) toast.dismiss(loadingToast);
      return;
    }
    if (!reportRows || reportRows.length === 0) {
      toast.warning('Nenhum dado encontrado para o relatório!');
      if (loadingToast) toast.dismiss(loadingToast);
      return;
    }

    // Buscar nome da empresa
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();
    const companyNameFromDb = companyData?.name || companyName || '';

    // Obter nome do usuário autenticado
    let userName = 'Usuário';
    try {
      // Compatibilidade com diferentes versões do Supabase
      if (supabase.auth.getUser) {
        const userResult = await supabase.auth.getUser();
        userName = userResult.data.user?.user_metadata?.name || userResult.data.user?.email || 'Usuário';
      } else {
        // @ts-ignore - Ignora erro de tipagem para compatibilidade com versões antigas
        const user = supabase.auth.user?.();
        userName = user?.user_metadata?.name || user?.email || 'Usuário';
      }
    } catch (e) {
      console.log('Erro ao obter usuário:', e);
      userName = 'Usuário';
    }

    // Agrupar produtos por grupo e subgrupo
    const groupedProducts: Record<string, Record<string, CalendarReportRow[]>> = {};
    
    for (const row of reportRows) {
      if (!groupedProducts[row.group_name]) {
        groupedProducts[row.group_name] = {};
      }
      if (!groupedProducts[row.group_name][row.subgroup_name]) {
        groupedProducts[row.group_name][row.subgroup_name] = [];
      }
      groupedProducts[row.group_name][row.subgroup_name].push(row);
    }
    
    // Criar workbook e worksheet
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PanificaçãoPRO';
    workbook.lastModifiedBy = userName;
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet('Calendário de Produção', {
      pageSetup: {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true
      }
    });

    // Reservar espaço para logotipo (A1:B3)
    worksheet.mergeCells('A1:B3');
    const logoCell = worksheet.getCell('A1');
    logoCell.value = 'LOGO';
    logoCell.alignment = { horizontal: 'center', vertical: 'middle' };
    logoCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    
    // Adicionar cabeçalho detalhado
    worksheet.mergeCells('C1:J1');
    const titleCell = worksheet.getCell('C1');
    titleCell.value = `CALENDÁRIO DE PRODUÇÃO`;
    titleCell.font = {
      size: 16,
      bold: true
    };
    titleCell.alignment = { horizontal: 'center' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'D3D3D3' }
    };
    titleCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    
    // Adicionar nome da empresa
    worksheet.mergeCells('C2:J2');
    const companyCell = worksheet.getCell('C2');
    companyCell.value = companyNameFromDb.toUpperCase();
    companyCell.font = {
      size: 14,
      bold: true
    };
    companyCell.alignment = { horizontal: 'center' };
    companyCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Adicionar data e responsável
    worksheet.mergeCells('C3:J3');
    const dateAndResponsibleCell = worksheet.getCell('C3');
    const currentDate = new Date().toLocaleDateString('pt-BR');
    dateAndResponsibleCell.value = `Data: ${currentDate} | Responsável: ${userName}`;
    dateAndResponsibleCell.font = {
      size: 12
    };
    dateAndResponsibleCell.alignment = { horizontal: 'center' };
    dateAndResponsibleCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Definir colunas - otimizado para listas grandes
    worksheet.columns = [
      { header: 'COD', key: 'product_code', width: 15 },
      { header: 'PRODUTO', key: 'product_name', width: 35 },
      { header: 'SEG', key: 'monday', width: 4 },
      { header: 'TER', key: 'tuesday', width: 4 },
      { header: 'QUA', key: 'wednesday', width: 4 },
      { header: 'QUI', key: 'thursday', width: 4 },
      { header: 'SEX', key: 'friday', width: 4 },
      { header: 'SÁB', key: 'saturday', width: 4 },
      { header: 'DOM', key: 'sunday', width: 4 },
      { header: 'CALENDÁRIO DE PRODUÇÃO', key: 'production_schedule', width: 22 }
    ];

    // Estilo para o cabeçalho de colunas - mais profissional
    worksheet.getRow(3).font = {
      bold: true,
      size: 10
    };
    worksheet.getRow(3).alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };
    worksheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'D3D3D3' }
    };
    worksheet.getRow(3).height = 18;

    let rowIndex = 4; // Começar após o cabeçalho

    // Para cada grupo, adicionar uma seção
    for (const groupName of Object.keys(groupedProducts).sort()) {
      const groupData = groupedProducts[groupName];

      // Adicionar cabeçalho do grupo
      const groupRow = worksheet.addRow(['COD', groupName.toUpperCase(), 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM', 'CALENDÁRIO DE PRODUÇÃO']);
      rowIndex++;
      
      // Aplicar estilo ao cabeçalho do grupo - mais compacto e profissional
      groupRow.eachCell((cell) => {
        cell.font = { bold: true, size: 10 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'BFBFBF' }
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      groupRow.height = 16;
      
      // Cabeçalho de dias de produção - mais compacto
      const daysHeaderRow = worksheet.addRow(['', '', 'DIAS DE PRODUÇÃO', '', '', '', '', '', '', '']);
      worksheet.mergeCells(`C${rowIndex}:I${rowIndex}`);
      daysHeaderRow.height = 14;
      rowIndex++;
      
      // Aplicar estilo ao cabeçalho de dias
      daysHeaderRow.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        if (colNumber === 3) { // Coluna 'DIAS DE PRODUÇÃO'
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'BDD7EE' }
          };
          cell.font = { bold: true };
          cell.alignment = { horizontal: 'center' };
        }
      });

      // Para cada subgrupo, adicionar produtos
      for (const subgroupName of Object.keys(groupData).sort()) {
        const subgroupProducts = groupData[subgroupName];

        // Ordenar produtos por nome
        const sortedProducts = [...subgroupProducts].sort((a, b) =>
          (a.product_name || '').localeCompare(b.product_name || '')
        );

        // Adicionar produtos
        for (const product of sortedProducts) {
          // Gerar código no mesmo formato da interface
          let displayCode = product.product_code || '';
          
          // Se não tiver código, gerar baseado no product_id
          if (!displayCode) {
            if (product.product_name.toLowerCase().startsWith('sr ')) {
              // Para subreceitas, gerar código no formato SUB-XXXXXX
              // Usar os primeiros 6 caracteres do ID ou um número aleatório de 6 dígitos
              const randomNum = Math.floor(100000 + Math.random() * 900000);
              displayCode = `SUB-${randomNum}`;
            } else {
              // Para produtos normais, usar formato R-XXXXXXXX (primeiros 8 caracteres do ID)
              displayCode = `R-${product.product_id.substring(0, 8)}`;
            }
          }
          
          const productRow = worksheet.addRow([
            displayCode,
            product.product_name || '',
            product.monday ? 'X' : '',
            product.tuesday ? 'X' : '',
            product.wednesday ? 'X' : '',
            product.thursday ? 'X' : '',
            product.friday ? 'X' : '',
            product.saturday ? 'X' : '',
            product.sunday ? 'X' : '',
            product.production_schedule || ''
          ]);
          rowIndex++;

          // Aplicar estilo às células - otimizado para listas grandes
          productRow.eachCell((cell, colNumber) => {
            cell.font = { size: 9 };
            cell.border = {
              top: { style: 'hair' },
              left: { style: 'hair' },
              bottom: { style: 'hair' },
              right: { style: 'hair' }
            };
            if (colNumber >= 3 && colNumber <= 9) { // Colunas de dias
              cell.alignment = { horizontal: 'center' };
            }
          });
          productRow.height = 13;
        }
      }
      
      // Adicionar linha em branco entre grupos
      if (Object.keys(groupedProducts).length > 1) {
        worksheet.addRow([]);
        rowIndex++;
      }
    }
    
    // Adicionar linha de totais no final da tabela
    // Inicializar contadores para cada dia da semana
    const dayCounts = {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
      sunday: 0
    };

    // Contar produtos para cada dia da semana
    reportRows.forEach(product => {
      if (product.monday) dayCounts.monday++;
      if (product.tuesday) dayCounts.tuesday++;
      if (product.wednesday) dayCounts.wednesday++;
      if (product.thursday) dayCounts.thursday++;
      if (product.friday) dayCounts.friday++;
      if (product.saturday) dayCounts.saturday++;
      if (product.sunday) dayCounts.sunday++;
    });

    // Adicionar linha em branco antes dos totais
    worksheet.addRow([]);
    rowIndex++;

    // Adicionar linha de totais
    const totalsRow = worksheet.addRow([
      '',
      'TOTAL DE PRODUTOS POR DIA:',
      dayCounts.monday,
      dayCounts.tuesday,
      dayCounts.wednesday,
      dayCounts.thursday,
      dayCounts.friday,
      dayCounts.saturday,
      dayCounts.sunday,
      ''
    ]);
    rowIndex++;

    // Estilizar a linha de totais
    totalsRow.eachCell((cell, colNumber) => {
      if (colNumber === 2) { // Coluna do texto "TOTAL DE PRODUTOS POR DIA:"
        cell.font = { bold: true, size: 10 };
        cell.alignment = { horizontal: 'right' };
      } else if (colNumber >= 3 && colNumber <= 9) { // Colunas dos totais
        cell.font = { bold: true, size: 10 };
        cell.alignment = { horizontal: 'center' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'E2EFDA' } // Verde claro
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    });

    // Gerar arquivo Excel
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Calendario_Producao_${companyNameFromDb.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    if (loadingToast) {
      toast.dismiss(loadingToast);
    }
    toast.success('Calendário de produção exportado com sucesso!');
  } catch (error) {
    console.error('Erro ao exportar calendário para Excel:', error);
    if (loadingToast) {
      toast.dismiss(loadingToast);
    }
    toast.error(`Erro ao exportar calendário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  } finally {
    // Redefinir a variável de controle para permitir novas exportações
    isExportingExcel = false;
  }
}

// Exportar funções
export default {
  exportWeeklyCalendarToPDF,
  exportWeeklyCalendarToExcel
};
