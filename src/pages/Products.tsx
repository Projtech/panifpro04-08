import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DraggableTable } from "@/components/ui/draggable-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Edit,
  Trash,
  FileText,
  Loader2,
  MoreVertical,
  ChefHat,
  Tag,
  FolderTree,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { getProducts, createProduct, updateProduct, deleteProduct, Product, checkProductNameExists, checkProductSkuExists } from "@/services/productService";
import { getGroups, getSubgroups, Group, Subgroup } from "@/services/groupService";
import { getSetores, Setor } from "@/services/setorService";
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDecimal } from "@/lib/formatters";
import { parseDecimalBR, formatInputDecimalBR } from "@/lib/numberUtils";
import { EnhancedAutocomplete } from "@/components/ui/enhanced-autocomplete";
import ProductForm from '@/components/ProductForm';
import ErrorBoundary from '@/components/ErrorBoundary';

function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [filteredSubgroups, setFilteredSubgroups] = useState<Subgroup[]>([]);
  
  // Filtros de tipo de produto
  const [typeFilters, setTypeFilters] = useState({
    materiaPrima: true,
    subReceita: true,
    receita: true
  });

  // Filtro de status (ativo/inativo)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Filtro de setor
  const [setorFilter, setSetorFilter] = useState<string>('all');
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Verificar se estamos vindo da tela de receitas
  const [returnToRecipe, setReturnToRecipe] = useState<boolean>(false);
  const [recipeId, setRecipeId] = useState<string | undefined>();
  
  // Verificar se há estado de retorno para a tela de receitas
  useEffect(() => {
    if (location.state && location.state.returnToRecipe) {
      setReturnToRecipe(true);
      if (location.state.recipeId) {
        setRecipeId(location.state.recipeId);
      }
    }
  }, [location]);

  const { activeCompany, loading: authLoading } = useAuth();

  const fetchGroups = async () => {
    if (authLoading || !activeCompany?.id) {
      toast.error("Empresa ativa não carregada. Tente novamente mais tarde.");
      return;
    }
    try {
      const groupsData = await getGroups(activeCompany.id);
      setGroups((groupsData ?? []).filter(Boolean));
    } catch (error) {
      if (error instanceof Error) {
        console.error("[fetchGroups] Erro ao carregar grupos:", error.message, error.stack);
      } else {
        console.error("[fetchGroups] Erro ao carregar grupos (objeto desconhecido):", JSON.stringify(error));
      }
      toast.error("Erro ao carregar grupos");
    }
  };

  const fetchSubgroups = async () => {
    if (authLoading || !activeCompany?.id) {
      toast.error("Empresa ativa não carregada. Tente novamente mais tarde.");
      return;
    }
    try {
      const subgroupsData = await getSubgroups(activeCompany.id);
      setSubgroups((subgroupsData ?? []).filter(Boolean));
    } catch (error) {
      if (error instanceof Error) {
        console.error("[fetchSubgroups] Erro ao carregar subgrupos:", error.message, error.stack);
      } else {
        console.error("[fetchSubgroups] Erro ao carregar subgrupos (objeto desconhecido):", JSON.stringify(error));
      }
      toast.error("Erro ao carregar subgrupos");
    }
  };
  
  const fetchSetores = async () => {
    if (authLoading || !activeCompany?.id) {
      toast.error("Empresa ativa não carregada. Tente novamente mais tarde.");
      return;
    }
    try {
      const setoresData = await getSetores(activeCompany.id);
      setSetores(setoresData);
    } catch (error) {
      if (error instanceof Error) {
        console.error("[fetchSetores] Erro ao carregar setores:", error.message, error.stack);
      } else {
        console.error("[fetchSetores] Erro ao carregar setores (objeto desconhecido):", JSON.stringify(error));
      }
      toast.error("Erro ao carregar setores");
    }
  };

  const fetchProducts = async () => {
    if (authLoading || !activeCompany?.id) {
      toast.error("Empresa ativa não carregada. Tente novamente mais tarde.");
      return;
    }
    setLoading(true);
    try {
      const productsData = await getProducts(activeCompany.id);
      setProducts(productsData);
      setLastUpdated(new Date());
    } catch (error) {
      if (error instanceof Error) {
        console.error("[fetchProducts] Erro ao carregar produtos:", error.message, error.stack);
      } else {
        console.error("[fetchProducts] Erro ao carregar produtos (objeto desconhecido):", JSON.stringify(error));
      }
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    toast.info("Atualizando lista de produtos...");
    fetchProducts();
  };

  useEffect(() => {
    if (!authLoading && activeCompany?.id) {
      fetchProducts();
      fetchGroups();
      fetchSubgroups();
      fetchSetores();

      // Configurar intervalo de atualização automática
      refreshTimerRef.current = setInterval(() => {
        console.log("Atualizando produtos automaticamente...");
        // Não atualizar se o diálogo de edição estiver aberto para evitar conflitos
        if (!editOpen) {
          fetchProducts();
        } else {
          console.log("Atualizacao automática pulada - diálogo de edição aberto");
        }
      }, 5 * 60 * 1000);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [editOpen, activeCompany?.id, authLoading]);

  useEffect(() => {
    if (selectedProduct) {
      const filtered = subgroups.filter(subgroup => subgroup.group_id === selectedProduct.group_id);
      setFilteredSubgroups(filtered);
    } else {
      setFilteredSubgroups([]);
    }
  }, [selectedProduct, subgroups]);

  const filteredProducts = products
    .filter(product => {
      // Filtrar por termo de busca
      if (search && !product.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      
      // Filtrar por tipo de produto
      if (product.product_type === 'materia_prima' && !typeFilters.materiaPrima) {
        return false;
      }
      if (product.product_type === 'subreceita' && !typeFilters.subReceita) {
        return false;
      }
      if (product.product_type === 'receita' && !typeFilters.receita) {
        return false;
      }
      
      // Filtrar por status (ativo/inativo)
      if (statusFilter === 'active' && product.ativo === false) {
        return false;
      }
      if (statusFilter === 'inactive' && product.ativo !== false) {
        return false;
      }
      
      // Filtrar por setor
      if (setorFilter !== 'all' && product.setor_id !== setorFilter) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => a.name ? (b.name ? a.name.localeCompare(b.name) : -1) : 1);

  const handleEditOpen = (product: Product) => {
    setSelectedProduct(product);
    setEditOpen(true);
  };

  const handleEditSubmit = async (formData: Omit<Product, 'id'>) => {
    if (!selectedProduct) return;
    if (authLoading || !activeCompany?.id) {
      toast.error("Empresa ativa não carregada. Tente novamente mais tarde.");
      return;
    }
    setLoading(true);
    try {
      await updateProduct(selectedProduct.id, formData, activeCompany.id);
      toast.success("Produto atualizado com sucesso!");

      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProduct.id ? { ...p, ...formData, id: selectedProduct.id } : p
        )
      );
      setEditOpen(false);
    } catch (error) {
      console.error('[handleEditSubmit] Erro ao atualizar produto:', error);
      toast.error("Erro ao atualizar produto. Verifique os dados ou o console.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete || !activeCompany?.id) return;
    setLoading(true);
    try {
      const success = await deleteProduct(productToDelete.id, activeCompany.id);
      if (success) {
        setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
        toast.success("Produto excluído com sucesso!");
      }
    } catch (error) {
      toast.error("Erro ao excluir produto. Verifique o console.");
      console.error('[Products] Erro ao excluir produto:', error);
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  return (
    <>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-bakery-brown">Produtos</h1>
        </div>
        <Card>
          <div className="p-6 pb-3">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold text-bakery-brown">Lista de Produtos</h2>
              
              <div className="flex flex-1 flex-wrap items-center gap-4">
                {/* Filtros de tipo */}
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Filtro de Status */}
              <div className="flex items-center space-x-2">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as 'all' | 'active' | 'inactive')}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Filtro de Setor */}
              <div className="flex items-center space-x-2">
                <Select
                  value={setorFilter}
                  onValueChange={(value) => setSetorFilter(value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Setores</SelectItem>
                    {setores.map((setor) => (
                      <SelectItem key={setor.id} value={setor.id}>
                        {setor.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="none">Sem Setor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                  
                  {/* Filtro por tipo */}
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="filter-materia-prima" 
                      checked={typeFilters.materiaPrima}
                      onCheckedChange={(checked) => 
                        setTypeFilters(prev => ({ ...prev, materiaPrima: checked === true }))
                      }
                    />
                    <label 
                      htmlFor="filter-materia-prima" 
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      Matéria Prima
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="filter-subreceita" 
                      checked={typeFilters.subReceita}
                      onCheckedChange={(checked) => 
                        setTypeFilters(prev => ({ ...prev, subReceita: checked === true }))
                      }
                    />
                    <label 
                      htmlFor="filter-subreceita" 
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      SubReceita
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="filter-receita" 
                      checked={typeFilters.receita}
                      onCheckedChange={(checked) => 
                        setTypeFilters(prev => ({ ...prev, receita: checked === true }))
                      }
                    />
                    <label 
                      htmlFor="filter-receita" 
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      Receita
                    </label>
                  </div>
                </div>
                
                {/* Campo de busca */}
                <div className="flex-1 min-w-[200px]">
                  <Input
                    type="search"
                    placeholder="Buscar produto..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                {/* Botão de atualização */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-2">Atualizar</span>
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-gray-500">
                Última atualização: {lastUpdated.toLocaleTimeString()}
              </p>
              
              <div className="flex items-center gap-2">
                {returnToRecipe && (
                  <Button 
                    variant="outline" 
                    className="bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
                    onClick={() => {
                      // Navegar de volta para a tela de receitas
                      if (recipeId) {
                        navigate(`/recipes/${recipeId}/edit`, { 
                          state: { fromProductCreation: true } 
                        });
                      } else {
                        navigate(`/recipes/new`, { 
                          state: { fromProductCreation: true } 
                        });
                      }
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar para Receita
                  </Button>
                )}
                <Button disabled={loading} onClick={() => navigate("/produtos/novo")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Produto
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-md border">
            <DraggableTable
              tableId="products-table"
              isLoading={loading}
              data={filteredProducts}
              emptyMessage="Nenhum produto encontrado"
              columns={[
                {
                  id: 'name',
                  header: 'Nome',
                  cell: (row) => (
                    <div className="flex flex-col">
                      <span className="font-medium">{row.name}</span>
                      {row.recipe_id && (
                        <Badge variant="outline" className="flex items-center gap-1 border-amber-400 text-amber-700 w-fit">
                          <ChefHat size={12} />
                          Receita
                        </Badge>
                      )}
                    </div>
                  )
                },
                {
                  id: 'unit',
                  header: 'Unidade',
                  accessorFn: (row) => row.unit
                },
                {
                  id: 'sku',
                  header: 'SKU',
                  accessorFn: (row) => row.sku || '-'
                },
                {
                  id: 'group',
                  header: 'Grupo/Subgrupo',
                  cell: (row) => (
                    <div className="flex flex-col">
                      <Badge variant="outline" className="mb-1 w-fit flex items-center gap-1">
                        <FolderTree size={12} />
                        {(() => {
                          const group = groups.find(g => g?.id === row.group_id);
                          return group?.name ?? '-';
                        })()}
                      </Badge>
                      {row.subgroup_id && (
                        <Badge variant="outline" className="w-fit flex items-center gap-1 ml-2">
                          <Tag size={12} />
                          {(() => {
                            const subgroup = subgroups.find(sg => sg?.id === row.subgroup_id);
                            return subgroup?.name ?? '-';
                          })()}
                        </Badge>
                      )}
                    </div>
                  )
                },
                {
                  id: 'unit_weight',
                  header: 'Peso da Unidade',
                  cell: (row) => (
                    row.unit_weight !== null && row.unit_weight !== undefined
                      ? formatDecimal(row.unit_weight, 3)
                      : '-'
                  )
                },
                {
                  id: 'kg_weight',
                  header: 'Peso do Kg',
                  cell: (row) => (
                    row.kg_weight !== null && row.kg_weight !== undefined
                      ? formatDecimal(row.kg_weight, 3)
                      : '-'
                  )
                },
                {
                  id: 'cost',
                  header: 'Custo (Kg)',
                  cell: (row) => (
                    row.cost !== null && row.cost !== undefined
                      ? formatCurrency(row.cost)
                      : '-'
                  )
                },
                {
                  id: 'unit_price',
                  header: 'Preço (Un)',
                  cell: (row) => (
                    row.unit_price !== null && row.unit_price !== undefined
                      ? formatCurrency(row.unit_price)
                      : '-'
                  )
                },
                {
                  id: 'calendar',
                  header: 'Calendário',
                  cell: (row) => (
                    <>
                      {row.all_days ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Todos os dias
                        </Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {row.monday && <Badge variant="secondary" translate="no">Seg</Badge>}
                          {row.tuesday && <Badge variant="secondary" translate="no">Ter</Badge>}
                          {row.wednesday && <Badge variant="secondary" translate="no">Qua</Badge>}
                          {row.thursday && <Badge variant="secondary" translate="no">Qui</Badge>}
                          {row.friday && <Badge variant="secondary" translate="no">Sex</Badge>}
                          {row.saturday && <Badge variant="secondary" translate="no">Sáb</Badge>}
                          {row.sunday && <Badge variant="secondary" translate="no">Dom</Badge>}
                        </div>
                      )}
                    </>
                  )
                },
                {
                  id: 'setor',
                  header: 'Setor',
                  cell: (row) => (
                    <div className="flex items-center gap-2">
                      {row.setor_id && (
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: setores.find(s => s.id === row.setor_id)?.color || '#ccc' }}
                        />
                      )}
                      <span>{setores.find(s => s.id === row.setor_id)?.name || '-'}</span>
                    </div>
                  )
                }
              ]}
              renderRowActions={(row) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Abrir menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => handleEditOpen(row)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    {row.recipe_id && (
                      <DropdownMenuItem onClick={() => navigate(`/recipes/edit/${row.recipe_id}`)}>
                        <ChefHat className="h-4 w-4 mr-2" />
                        Ver Receita
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-500"
                      disabled={!!row.recipe_id}
                      onClick={() => handleDeleteProduct(row)}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            />
          </div>
        </Card>
      </div>

      {/* Diálogo de confirmação de exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o produto <b>{productToDelete?.name}</b>? Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteProduct} disabled={loading}>
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={editOpen} 
        onOpenChange={(open) => {
          if (!open) {
            // Primeiro feche o diálogo
            setEditOpen(false);
            // Depois de um tempo seguro, limpe o produto selecionado
            const timeoutId = window.setTimeout(() => {
              setSelectedProduct(null);
              console.log('[Products] Limpando selectedProduct após fechar diálogo');
            }, 300);
            // Armazene o ID do timeout para limpeza se necessário
            return () => window.clearTimeout(timeoutId);
          } else {
            setEditOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Editar Produto
              {selectedProduct?.recipe_id && (
                <Badge variant="outline" className="flex items-center gap-1 border-amber-400 text-amber-700">
                  <ChefHat size={12} />
                  Produto de Receita
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct?.recipe_id 
                ? "Edite as propriedades do produto vinculado à receita" 
                : "Edite as propriedades do produto"}
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && editOpen && (
            <ErrorBoundary 
              fallback={<div className="p-4 text-red-500">Erro ao renderizar o formulário de produto</div>}
              onError={(error) => console.error("[ErrorBoundary] Erro capturado no ProductForm:", error)}
            >
              <div className="product-form-container">
                <ErrorBoundary fallback={<div>Erro ao carregar formulário</div>}>
                  <ProductForm
                    initialData={selectedProduct}
                    onSubmit={handleEditSubmit}
                    onCancel={() => setEditOpen(false)}
                    isLoading={loading}
                    isEditMode={true}
                    groups={groups}
                    subgroups={subgroups}
                    setores={setores}
                  />
                </ErrorBoundary>
              </div>
            </ErrorBoundary>
          )}
          {/* Ao criar novo produto, a navegação já leva para /produtos/novo, que agora garante product_type correto no ProductForm */}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Products;
