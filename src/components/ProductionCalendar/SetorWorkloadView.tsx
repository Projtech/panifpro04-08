import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { ProductionListItemWithDetails } from '@/services/productionListService';
import { Setor } from '@/services/setorService';
import { getSetores } from '@/services/setorService';
import { Progress } from '@/components/ui/progress';

interface SetorWorkloadViewProps {
  items: ProductionListItemWithDetails[];
  companyId: string;
  date: Date;
  isLoading?: boolean;
}

interface SetorWorkload {
  setor: Setor;
  items: ProductionListItemWithDetails[];
  totalQuantity: number;
  percentOfTotal: number;
}

const SetorWorkloadView: React.FC<SetorWorkloadViewProps> = ({ 
  items, 
  companyId,
  date,
  isLoading = false 
}) => {
  const [setores, setSetores] = useState<Setor[]>([]);
  const [workloadBySetor, setWorkloadBySetor] = useState<SetorWorkload[]>([]);
  const [itemsWithoutSetor, setItemsWithoutSetor] = useState<ProductionListItemWithDetails[]>([]);
  const [loadingSetores, setLoadingSetores] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // Carregar setores
  useEffect(() => {
    const fetchSetores = async () => {
      if (!companyId) return;
      
      try {
        setLoadingSetores(true);
        const setoresData = await getSetores(companyId);
        setSetores(setoresData);
      } catch (error) {
        console.error('Erro ao carregar setores:', error);
      } finally {
        setLoadingSetores(false);
      }
    };
    
    fetchSetores();
  }, [companyId]);

  // Calcular carga de trabalho por setor
  useEffect(() => {
    if (loadingSetores || items.length === 0 || setores.length === 0) return;
    
    // Agrupar itens por setor
    const itemsBySetor = new Map<string, ProductionListItemWithDetails[]>();
    const withoutSetor: ProductionListItemWithDetails[] = [];
    
    // Inicializar map com todos os setores
    setores.forEach(setor => {
      itemsBySetor.set(setor.id, []);
    });
    
    // Distribuir itens pelos setores
    items.forEach(item => {
      const setorId = item.product?.setor_id;
      
      if (setorId && itemsBySetor.has(setorId)) {
        itemsBySetor.get(setorId)?.push(item);
      } else {
        withoutSetor.push(item);
      }
    });
    
    // Calcular quantidade total de todos os itens
    const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
    
    // Criar array de carga de trabalho por setor
    const workload: SetorWorkload[] = setores.map(setor => {
      const setorItems = itemsBySetor.get(setor.id) || [];
      const setorQuantity = setorItems.reduce((total, item) => total + item.quantity, 0);
      
      return {
        setor,
        items: setorItems,
        totalQuantity: setorQuantity,
        percentOfTotal: totalQuantity > 0 ? (setorQuantity / totalQuantity) * 100 : 0
      };
    });
    
    // Ordenar por quantidade (maior para menor)
    workload.sort((a, b) => b.totalQuantity - a.totalQuantity);
    
    setWorkloadBySetor(workload);
    setItemsWithoutSetor(withoutSetor);
  }, [items, setores, loadingSetores]);

  if (isLoading || loadingSetores) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-gray-500">Nenhum item na lista de produção para este dia.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Carga de Trabalho por Setor - {date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">Visão Geral</TabsTrigger>
            {workloadBySetor
              .filter(wl => wl.items.length > 0)
              .map(wl => (
                <TabsTrigger key={wl.setor.id} value={wl.setor.id} className="flex items-center gap-2">
                  {wl.setor.color && (
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: wl.setor.color }}
                    />
                  )}
                  {wl.setor.name}
                </TabsTrigger>
              ))}
            {itemsWithoutSetor.length > 0 && (
              <TabsTrigger value="none">Sem Setor</TabsTrigger>
            )}
          </TabsList>
          
          {/* Visão Geral */}
          <TabsContent value="all">
            <div className="space-y-4">
              {workloadBySetor
                .filter(wl => wl.items.length > 0)
                .map(wl => (
                  <div key={wl.setor.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {wl.setor.color && (
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: wl.setor.color }}
                          />
                        )}
                        <span className="font-medium">{wl.setor.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{wl.items.length} itens</Badge>
                        <Badge>{wl.totalQuantity.toFixed(2)} unidades</Badge>
                      </div>
                    </div>
                    <Progress value={wl.percentOfTotal} className="h-2" />
                    <div className="text-xs text-gray-500 text-right">
                      {wl.percentOfTotal.toFixed(1)}% da produção total
                    </div>
                  </div>
                ))}
              
              {itemsWithoutSetor.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-500">Sem Setor Atribuído</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{itemsWithoutSetor.length} itens</Badge>
                      <Badge variant="secondary">
                        {itemsWithoutSetor.reduce((total, item) => total + item.quantity, 0).toFixed(2)} unidades
                      </Badge>
                    </div>
                  </div>
                  <Progress 
                    value={items.length > 0 
                      ? (itemsWithoutSetor.reduce((total, item) => total + item.quantity, 0) / 
                         items.reduce((total, item) => total + item.quantity, 0)) * 100 
                      : 0
                    } 
                    className="h-2 bg-gray-200" 
                  />
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Conteúdo para cada setor */}
          {workloadBySetor.map(wl => (
            <TabsContent key={wl.setor.id} value={wl.setor.id}>
              {wl.items.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {wl.setor.color && (
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: wl.setor.color }}
                        />
                      )}
                      <span className="font-medium">{wl.setor.name}</span>
                    </div>
                    <Badge>{wl.totalQuantity.toFixed(2)} unidades totais</Badge>
                  </div>
                  
                  <div className="border rounded-md">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2">Produto</th>
                          <th className="text-right p-2 w-24">Quantidade</th>
                          <th className="text-right p-2 w-24">Unidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wl.items.map(item => (
                          <tr key={item.id} className="border-b last:border-b-0">
                            <td className="p-2">{item.product?.name || 'Produto não encontrado'}</td>
                            <td className="text-right p-2">{item.quantity.toFixed(2)}</td>
                            <td className="text-right p-2">{item.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">
                  Nenhum item atribuído a este setor para este dia.
                </p>
              )}
            </TabsContent>
          ))}
          
          {/* Conteúdo para itens sem setor */}
          {itemsWithoutSetor.length > 0 && (
            <TabsContent value="none">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-500">Produtos sem Setor Atribuído</span>
                  <Badge variant="secondary">
                    {itemsWithoutSetor.reduce((total, item) => total + item.quantity, 0).toFixed(2)} unidades
                  </Badge>
                </div>
                
                <div className="border rounded-md">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2">Produto</th>
                        <th className="text-right p-2 w-24">Quantidade</th>
                        <th className="text-right p-2 w-24">Unidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsWithoutSetor.map(item => (
                        <tr key={item.id} className="border-b last:border-b-0">
                          <td className="p-2">{item.product?.name || 'Produto não encontrado'}</td>
                          <td className="text-right p-2">{item.quantity.toFixed(2)}</td>
                          <td className="text-right p-2">{item.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SetorWorkloadView;
