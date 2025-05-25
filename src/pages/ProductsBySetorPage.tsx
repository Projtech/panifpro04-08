import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ProductsBySetor from '@/components/ProductsBySetor';
import { getProducts, Product } from '@/services/productService';
import { getSetores, Setor } from '@/services/setorService';
import { gerarRelatorioProdutosPorSetor } from '@/services/relatorioSetorService';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/AuthContext';

const ProductsBySetorPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { activeCompany } = useAuth();

  // Função para exportar o relatório em PDF
  const handleExportPDF = () => {
    if (!activeCompany) return;
    
    try {
      // Gerar o PDF
      const pdfBlob = gerarRelatorioProdutosPorSetor(
        setores,
        products,
        activeCompany.name || 'Empresa'
      );
      
      // Criar URL para o blob
      const url = URL.createObjectURL(pdfBlob);
      
      // Criar um link para download
      const link = document.createElement('a');
      link.href = url;
      link.download = `produtos-por-setor-${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Simular clique no link para iniciar o download
      document.body.appendChild(link);
      link.click();
      
      // Limpar
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Relatório gerado com sucesso',
        description: 'O download do relatório foi iniciado',
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: 'Erro ao gerar relatório',
        description: 'Não foi possível gerar o relatório. Por favor, tente novamente.',
        variant: 'destructive',
      });
    }
  };
  
  useEffect(() => {
    if (!activeCompany?.id) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsData, setoresData] = await Promise.all([
          getProducts(activeCompany.id),
          getSetores(activeCompany.id)
        ]);
        
        // Filtrar apenas produtos ativos
        const activeProducts = productsData.filter(p => p.ativo !== false);
        
        setProducts(activeProducts);
        setSetores(setoresData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os dados. Por favor, tente novamente.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  return (
    <>
      <Helmet>
        <title>Produtos por Setor | PanifPRO</title>
        <meta name="description" content="Visualização de produtos organizados por setor" />
      </Helmet>
      
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Produtos por Setor</h1>
          
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => handleExportPDF()}
            disabled={loading || products.length === 0}
          >
            <FileDown className="h-4 w-4" />
            Exportar Relatório
          </Button>
        </div>
        
        {loading ? (
          <Card>
            <CardContent className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </CardContent>
          </Card>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-gray-500">Nenhum produto encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          <ProductsBySetor products={products} setores={setores} />
        )}
      </div>
    </>
  );
};

export default ProductsBySetorPage;
