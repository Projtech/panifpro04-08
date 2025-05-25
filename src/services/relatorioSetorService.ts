import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Product } from './productService';
import { Setor } from './setorService';
import { formatCurrency, formatDecimal } from '@/lib/formatters';
import autoTable from 'jspdf-autotable';

// Adicionar o tipo para o jsPDF
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

/**
 * Gera um relatório PDF de produtos por setor
 * @param setores Lista de setores
 * @param produtos Lista de produtos
 * @param nomeEmpresa Nome da empresa
 * @returns Blob do PDF gerado
 */
export function gerarRelatorioProdutosPorSetor(
  setores: Setor[],
  produtos: Product[],
  nomeEmpresa: string
): Blob {
  // Criar o documento PDF
  const doc = new jsPDF();
  
  // Adicionar título
  doc.setFontSize(18);
  doc.text('Relatório de Produtos por Setor', 14, 22);
  
  // Adicionar informações da empresa e data
  doc.setFontSize(10);
  doc.text(`Empresa: ${nomeEmpresa}`, 14, 30);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 35);
  
  // Agrupar produtos por setor
  const produtosPorSetor = new Map<string, Product[]>();
  
  // Inicializar com "Sem Setor"
  produtosPorSetor.set('none', []);
  
  // Inicializar com todos os setores
  setores.forEach(setor => {
    produtosPorSetor.set(setor.id, []);
  });
  
  // Distribuir produtos pelos setores
  produtos.forEach(product => {
    if (product.setor_id && produtosPorSetor.has(product.setor_id)) {
      produtosPorSetor.get(product.setor_id)?.push(product);
    } else {
      produtosPorSetor.get('none')?.push(product);
    }
  });
  
  // Posição Y atual no documento
  let yPos = 45;
  
  // Para cada setor, adicionar uma tabela de produtos
  setores.forEach(setor => {
    const setorProdutos = produtosPorSetor.get(setor.id) || [];
    if (setorProdutos.length === 0) return;
    
    // Verificar se precisa adicionar uma nova página
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    // Adicionar título do setor
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    if (setor.color) {
      // Converter cor hex para RGB
      const hex = setor.color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      doc.setTextColor(r, g, b);
    }
    doc.text(`Setor: ${setor.name}`, 14, yPos);
    doc.setTextColor(0, 0, 0);
    
    // Adicionar tabela de produtos
    doc.autoTable({
      startY: yPos + 5,
      head: [['Nome', 'SKU', 'Unidade', 'Peso (kg)', 'Custo']],
      body: setorProdutos.map(produto => [
        produto.name,
        produto.sku || '-',
        produto.unit,
        produto.unit_weight !== null ? formatDecimal(produto.unit_weight, 3) : '-',
        produto.cost !== null ? formatCurrency(produto.cost) : '-'
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: setor.color || [66, 139, 202],
        textColor: [255, 255, 255]
      }
    });
    
    // Atualizar a posição Y
    yPos = (doc as any).lastAutoTable.finalY + 15;
  });
  
  // Adicionar produtos sem setor, se houver
  const produtosSemSetor = produtosPorSetor.get('none') || [];
  if (produtosSemSetor.length > 0) {
    // Verificar se precisa adicionar uma nova página
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    // Adicionar título
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text('Produtos sem Setor', 14, yPos);
    doc.setTextColor(0, 0, 0);
    
    // Adicionar tabela de produtos
    doc.autoTable({
      startY: yPos + 5,
      head: [['Nome', 'SKU', 'Unidade', 'Peso (kg)', 'Custo']],
      body: produtosSemSetor.map(produto => [
        produto.name,
        produto.sku || '-',
        produto.unit,
        produto.unit_weight !== null ? formatDecimal(produto.unit_weight, 3) : '-',
        produto.cost !== null ? formatCurrency(produto.cost) : '-'
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [150, 150, 150],
        textColor: [255, 255, 255]
      }
    });
  }
  
  // Adicionar rodapé com número de página
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Página ${i} de ${totalPages}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 10);
  }
  
  // Retornar o PDF como Blob
  return doc.output('blob');
}
