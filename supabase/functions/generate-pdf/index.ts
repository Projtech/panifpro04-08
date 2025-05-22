import { serve } from 'http/server'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'
import jsPDFAutoTable from 'jspdf-autotable'

// Interface para os itens agrupados
interface GroupedItem {
  groupId: string;
  groupName: string;
  subgroupId: string;
  subgroupName: string;
  productName: string;
  quantity: number;
  unit: string;
}

// Interface para os itens da lista
interface ListItem {
  id: string;
  product_id: string;
  quantity: number | string;
  unit: string;
}

// Interface para os produtos
interface ProductItem {
  id: string;
  name: string;
  group_id?: string;
  subgroup_id?: string;
  unit: string;
}

// Interface para os grupos
interface GroupItem {
  id: string;
  name: string;
}

// Interface para os subgrupos
interface SubgroupItem {
  id: string;
  name: string;
  group_id: string;
}

serve(async (req) => {
  // Verificar se é uma solicitação OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }
  
  try {
    // Extrair parâmetros da requisição
    const { listId, companyId, listName } = await req.json()
    
    if (!listId || !companyId) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros obrigatórios não fornecidos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Criar cliente Supabase usando variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://zysejmuapexkkuhwkuql.supabase.co'
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5c2VqbXVhcGV4a2t1aHdrdXFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTkwMDEsImV4cCI6MjA2MDkzNTAwMX0.hanYHMksGntl0PCYdRZcvl21gKaMJsV11ut-fRPUKwE'
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Buscar dados usando a lógica otimizada
    const groupedItems = await getProcessedListItemsOptimized(supabase, listId, companyId)
    
    // Gerar o PDF no servidor
    const pdfBase64 = await generatePDF(groupedItems, listName)
    
    // Retornar o PDF como resposta
    return new Response(pdfBase64, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${listName}.pdf"`
      },
    })
  } catch (error) {
    console.error('Erro na Edge Function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Versão otimizada para buscar itens da lista para exportação
 * Usa consultas otimizadas para reduzir chamadas ao servidor
 */
async function getProcessedListItemsOptimized(
  supabase: any,
  listId: string, 
  companyId: string
): Promise<GroupedItem[]> {
  if (!companyId) throw new Error('companyId é obrigatório')
  
  try {
    // 1. Buscar todos os itens da lista
    const { data: listItems, error: itemsError } = await supabase
      .from('production_list_items')
      .select('id, product_id, quantity, unit')
      .eq('list_id', listId)
      .eq('company_id', companyId)
    
    if (itemsError) throw itemsError
    if (!listItems || !Array.isArray(listItems) || listItems.length === 0) {
      throw new Error('Nenhum item encontrado na lista')
    }
    
    // Filtrar itens válidos
    const items = listItems.filter((item): item is ListItem => 
      item !== null && 
      typeof item === 'object' && 
      'product_id' in item && 
      item.product_id !== null && 
      item.product_id !== undefined
    )
    
    if (items.length === 0) {
      throw new Error('Nenhum produto válido encontrado na lista')
    }
    
    // 2. Buscar todos os produtos necessários em lote
    const productIds = items.map(item => item.product_id)
    
    const { data: productList, error: productsError } = await supabase
      .from('products')
      .select('id, name, group_id, subgroup_id, unit')
      .in('id', productIds)
      .eq('company_id', companyId)
      
    if (productsError) throw productsError
    if (!productList || !Array.isArray(productList)) {
      throw new Error('Erro ao buscar produtos')
    }
    
    // Filtrar produtos válidos
    const products = productList.filter((product): product is ProductItem => 
      product !== null && 
      typeof product === 'object' && 
      'id' in product && 
      product.id !== null
    )
    
    // 3. Extrair IDs únicos de grupos e subgrupos
    const groupIds = [...new Set(products
      .filter(product => product.group_id)
      .map(product => product.group_id as string))]
      
    const subgroupIds = [...new Set(products
      .filter(product => product.subgroup_id)
      .map(product => product.subgroup_id as string))]
    
    // 4. Buscar grupos e subgrupos em consultas paralelas
    const [groupsResult, subgroupsResult] = await Promise.all([
      // Buscar apenas os grupos necessários
      supabase
        .from('groups')
        .select('id, name')
        .eq('company_id', companyId)
        .in('id', groupIds.length > 0 ? groupIds : ['no-groups']),
        
      // Buscar apenas os subgrupos necessários
      supabase
        .from('subgroups')
        .select('id, name, group_id')
        .eq('company_id', companyId)
        .in('id', subgroupIds.length > 0 ? subgroupIds : ['no-subgroups'])
    ])
    
    if (groupsResult.error) throw groupsResult.error
    if (subgroupsResult.error) throw subgroupsResult.error
    
    // 5. Criar mapas para acesso rápido
    const groupsMap = new Map<string, GroupItem>()
    if (groupsResult.data && Array.isArray(groupsResult.data)) {
      groupsResult.data
        .filter((group): group is GroupItem => 
          group !== null && 
          typeof group === 'object' && 
          'id' in group && 
          group.id !== null
        )
        .forEach(group => {
          groupsMap.set(group.id, group)
        })
    }
    
    const subgroupsMap = new Map<string, SubgroupItem>()
    if (subgroupsResult.data && Array.isArray(subgroupsResult.data)) {
      subgroupsResult.data
        .filter((subgroup): subgroup is SubgroupItem => 
          subgroup !== null && 
          typeof subgroup === 'object' && 
          'id' in subgroup && 
          subgroup.id !== null
        )
        .forEach(subgroup => {
          subgroupsMap.set(subgroup.id, subgroup)
        })
    }
    
    const productsMap = new Map<string, ProductItem>()
    products.forEach(product => {
      productsMap.set(product.id, product)
    })
    
    // 6. Mapear itens para o formato necessário
    const groupedItems: GroupedItem[] = []
    
    // Processar itens
    for (const item of items) {
      const product = productsMap.get(item.product_id)
      if (!product) {
        groupedItems.push({
          groupId: 'unknown',
          groupName: 'Sem Grupo',
          subgroupId: 'unknown',
          subgroupName: 'Sem Subgrupo',
          productName: 'Produto não encontrado',
          quantity: Number(item.quantity) || 0,
          unit: item.unit || 'UN',
        })
        continue
      }
      
      const groupId = product.group_id
      const subgroupId = product.subgroup_id
      
      const group = groupId ? groupsMap.get(groupId) : null
      const subgroup = subgroupId ? subgroupsMap.get(subgroupId) : null
      
      groupedItems.push({
        groupId: group?.id || 'unknown',
        groupName: group?.name || 'Sem Grupo',
        subgroupId: subgroup?.id || 'unknown',
        subgroupName: subgroup?.name || 'Sem Subgrupo',
        productName: product.name || 'Produto não encontrado',
        quantity: Number(item.quantity) || 0,
        unit: item.unit || product.unit || 'UN',
      })
    }
    
    // 7. Ordenar os itens
    groupedItems.sort((a, b) => {
      // Primeiro por grupo
      if (a.groupName < b.groupName) return -1
      if (a.groupName > b.groupName) return 1
      
      // Depois por subgrupo
      if (a.subgroupName < b.subgroupName) return -1
      if (a.subgroupName > b.subgroupName) return 1
      
      // Por fim pelo nome do produto
      return a.productName.localeCompare(b.productName)
    })
    
    return groupedItems
  } catch (error) {
    console.error("Erro ao buscar itens da lista:", error)
    throw error
  }
}

/**
 * Gera o PDF a partir dos dados agrupados
 */
async function generatePDF(groupedItems: GroupedItem[], listName: string): Promise<ArrayBuffer> {
  // Criar documento PDF
  const doc = new jsPDF()
  
  // Configurar fonte para suportar caracteres especiais
  doc.setFont('helvetica')
  
  // Adicionar título
  doc.setFontSize(16)
  doc.text(`Lista de Produção: ${listName}`, 14, 15)
  
  // Adicionar data
  doc.setFontSize(10)
  const dateStr = new Date().toLocaleDateString('pt-BR')
  doc.text(`Data: ${dateStr}`, 14, 22)
  
  // Preparar dados para a tabela
  let currentGroup = ''
  let currentSubgroup = ''
  const tableRows: any[] = []
  
  groupedItems.forEach(item => {
    // Adicionar cabeçalho de grupo se mudou
    if (currentGroup !== item.groupName) {
      currentGroup = item.groupName
      tableRows.push([{ 
        content: `Grupo: ${currentGroup}`, 
        colSpan: 4, 
        styles: { 
          fillColor: [220, 220, 220], 
          fontStyle: 'bold', 
          halign: 'left' 
        } 
      }])
      currentSubgroup = '' // Resetar subgrupo ao mudar de grupo
    }
    
    // Adicionar cabeçalho de subgrupo se mudou
    if (currentSubgroup !== item.subgroupName) {
      currentSubgroup = item.subgroupName
      tableRows.push([{ 
        content: `Subgrupo: ${currentSubgroup}`, 
        colSpan: 4, 
        styles: { 
          fillColor: [240, 240, 240], 
          fontStyle: 'bold', 
          halign: 'left' 
        } 
      }])
    }
    
    // Adicionar item
    tableRows.push([
      '', // Espaço para indentação
      item.productName,
      item.quantity.toString(),
      item.unit
    ])
  })
  
  // Configurar e gerar tabela
  jsPDFAutoTable(doc, {
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
      const cell = data.cell
      
      // Ajustar estilo de títulos de grupo/subgrupo (que possuem colSpan)
      if (cell.colSpan > 1) {
        cell.styles.fontSize = 11
      }
    }
  })
  
  // Retornar o PDF como array de bytes
  return doc.output('arraybuffer')
}
