import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Product } from '@/services/productService';
import { Setor } from '@/services/setorService';
import { formatCurrency, formatDecimal } from '@/lib/formatters';

interface ProductsBySetorProps {
  products: Product[];
  setores: Setor[];
}

const ProductsBySetor: React.FC<ProductsBySetorProps> = ({ products, setores }) => {
  const [activeTab, setActiveTab] = useState<string>('all');

  // Agrupar produtos por setor
  const productsBySetor = new Map<string, Product[]>();
  
  // Inicializar com "Sem Setor"
  productsBySetor.set('none', []);
  
  // Inicializar com todos os setores
  setores.forEach(setor => {
    productsBySetor.set(setor.id, []);
  });
  
  // Distribuir produtos pelos setores
  products.forEach(product => {
    if (product.setor_id && productsBySetor.has(product.setor_id)) {
      productsBySetor.get(product.setor_id)?.push(product);
    } else {
      productsBySetor.get('none')?.push(product);
    }
  });
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">Todos os Setores</TabsTrigger>
          {setores.map(setor => (
            <TabsTrigger 
              key={setor.id} 
              value={setor.id}
              className="flex items-center gap-2"
            >
              {setor.color && (
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: setor.color }}
                />
              )}
              {setor.name}
            </TabsTrigger>
          ))}
          <TabsTrigger value="none">Sem Setor</TabsTrigger>
        </TabsList>
        
        {/* Conteúdo para "Todos os Setores" */}
        <TabsContent value="all" className="space-y-6">
          {setores.map(setor => {
            const setorProducts = productsBySetor.get(setor.id) || [];
            if (setorProducts.length === 0) return null;
            
            return (
              <Card key={setor.id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="flex items-center gap-2">
                    {setor.color && (
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: setor.color }}
                      />
                    )}
                    {setor.name}
                  </CardTitle>
                  <Badge variant="outline">{setorProducts.length} produtos</Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {setorProducts.map(product => (
                      <ProductCard key={product.id} product={product} setor={setor} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {/* Produtos sem setor */}
          {(productsBySetor.get('none')?.length || 0) > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle>Sem Setor</CardTitle>
                <Badge variant="outline">{productsBySetor.get('none')?.length || 0} produtos</Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {productsBySetor.get('none')?.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Conteúdo para cada setor */}
        {setores.map(setor => {
          const setorProducts = productsBySetor.get(setor.id) || [];
          
          return (
            <TabsContent key={setor.id} value={setor.id}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="flex items-center gap-2">
                    {setor.color && (
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: setor.color }}
                      />
                    )}
                    {setor.name}
                  </CardTitle>
                  <Badge variant="outline">{setorProducts.length} produtos</Badge>
                </CardHeader>
                <CardContent>
                  {setorProducts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {setorProducts.map(product => (
                        <ProductCard key={product.id} product={product} setor={setor} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Nenhum produto atribuído a este setor
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
        
        {/* Conteúdo para "Sem Setor" */}
        <TabsContent value="none">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle>Sem Setor</CardTitle>
              <Badge variant="outline">{productsBySetor.get('none')?.length || 0} produtos</Badge>
            </CardHeader>
            <CardContent>
              {(productsBySetor.get('none')?.length || 0) > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {productsBySetor.get('none')?.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Todos os produtos estão atribuídos a setores
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Função para clarear uma cor hex para usar como background
const lightenColor = (color: string | null, amount: number = 0.85): string => {
  if (!color) return '#f9fafb'; // Cor padrão light gray se não houver cor
  
  // Remover o # se existir
  const hex = color.replace('#', '');
  
  // Converter para RGB
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  
  // Clarear a cor (misturar com branco)
  r = Math.round(r + (255 - r) * amount);
  g = Math.round(g + (255 - g) * amount);
  b = Math.round(b + (255 - b) * amount);
  
  // Converter de volta para hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// Componente para exibir um card de produto
const ProductCard: React.FC<{ product: Product, setor?: Setor }> = ({ product, setor }) => {
  // Definir a cor de fundo baseada na cor do setor
  const backgroundColor = setor?.color ? lightenColor(setor.color) : undefined;
  
  return (
    <div 
      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
      style={{ backgroundColor }}
    >
      <div className="font-medium mb-1">{product.name}</div>
      <div className="text-sm text-gray-500 mb-2">
        {product.unit} • {product.sku || 'Sem SKU'}
      </div>
      <div className="flex justify-between text-sm">
        <span>Custo: {product.cost !== null ? formatCurrency(product.cost) : '-'}</span>
        <span>Peso: {product.unit_weight !== null ? `${formatDecimal(product.unit_weight, 3)} kg` : '-'}</span>
      </div>
    </div>
  );
};

export default ProductsBySetor;
