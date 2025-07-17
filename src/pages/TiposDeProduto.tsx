import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getProductTypes, addProductType, updateProductType, deleteProductType, ProductType, SYSTEM_PRODUCT_TYPES } from '@/services/productTypesService';
import { PlusCircle, Edit, Trash2, ShieldCheck, Shield } from 'lucide-react';

const TiposDeProduto: React.FC = () => {
  const [types, setTypes] = useState<ProductType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentType, setCurrentType] = useState<ProductType | null>(null);
  const [typeName, setTypeName] = useState('');
  const { activeCompany } = useAuth();

  const fetchTypes = useCallback(async () => {
    if (!activeCompany) return;
    try {
      setIsLoading(true);
      const data = await getProductTypes(activeCompany.id);
      setTypes(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido';
      setError(errorMessage);
      toast.error('Falha ao carregar os tipos de produto.', { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [activeCompany]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const handleOpenDialog = (type: ProductType | null = null) => {
    // Verificar se é um tipo do sistema (não deve ser editado)
    if (type && SYSTEM_PRODUCT_TYPES.includes(type.name)) {
      toast.warning('Tipos de produto do sistema não podem ser editados.');
      return;
    }
    setCurrentType(type);
    setTypeName(type ? type.name : '');
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCurrentType(null);
    setTypeName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !typeName.trim()) {
      toast.warning('O nome do tipo é obrigatório.');
      return;
    }

    try {
      if (currentType) {
        await updateProductType(currentType.id, typeName.trim());
        toast.success('Tipo de produto atualizado com sucesso!');
      } else {
        await addProductType(typeName.trim(), activeCompany.id);
        toast.success('Tipo de produto adicionado com sucesso!');
      }
      fetchTypes();
      handleCloseDialog();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido';
      toast.error(`Falha ao salvar o tipo de produto.`, { description: errorMessage });
    }
  };

  const handleDelete = async (id: string) => {
    // Verificar se é um tipo do sistema (não deve ser excluído)
    const typeToDelete = types.find(type => type.id === id);
    if (typeToDelete && SYSTEM_PRODUCT_TYPES.includes(typeToDelete.name)) {
      toast.error('Tipos de produto do sistema não podem ser excluídos.');
      return;
    }
    
    if (!window.confirm('Tem certeza que deseja excluir este tipo de produto?')) return;

    try {
      await deleteProductType(id);
      toast.success('Tipo de produto excluído com sucesso!');
      fetchTypes();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido';
      toast.error('Falha ao excluir o tipo de produto.', { description: errorMessage });
    }
  };
  
  // Separar os tipos do sistema dos personalizados
  const systemTypes = types.filter(type => SYSTEM_PRODUCT_TYPES.includes(type.name));
  const customTypes = types.filter(type => !SYSTEM_PRODUCT_TYPES.includes(type.name));

  return (
    <div className="space-y-8">
      {/* Cartão para os tipos fixos do sistema */}
      <Card className="border-2 border-amber-500">
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center text-amber-700">
              <ShieldCheck className="mr-2 h-5 w-5 text-amber-600" />
              Tipos de Produto do Sistema (Fixos)
            </CardTitle>
            <div className="text-sm text-muted-foreground mt-1">
              Estes tipos são fundamentais para o funcionamento do sistema e não podem ser modificados.
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {systemTypes.map((type) => (
                  <TableRow key={type.id} className="bg-amber-50">
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>
                      {type.name === 'materia_prima' && 'Ingredientes básicos usados na produção'}
                      {type.name === 'receita' && 'Produtos finais prontos para venda'}
                      {type.name === 'subreceita' && 'Preparações intermediárias usadas em outras receitas'}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-amber-100 text-amber-800 text-xs font-medium">
                        <Shield className="h-3 w-3 mr-1" /> Protegido
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cartão para os tipos personalizados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tipos de Produto Personalizados</CardTitle>
            <div className="text-sm text-muted-foreground mt-1">
              Estes tipos podem ser criados, editados e excluídos conforme necessário.
            </div>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Novo Tipo
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : customTypes.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-md">
              <p>Nenhum tipo personalizado encontrado.</p>
              <p className="text-sm mt-2 text-muted-foreground">
                Clique em "Adicionar Novo Tipo" para criar um tipo personalizado.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>{type.name}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(type)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(type.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentType ? 'Editar Tipo de Produto' : 'Adicionar Novo Tipo de Produto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nome
                </Label>
                <Input
                  id="name"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TiposDeProduto;
