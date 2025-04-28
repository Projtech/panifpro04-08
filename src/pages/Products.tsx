import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { formatCurrency, formatDecimal } from "@/lib/formatters";
import { parseDecimalBR, formatInputDecimalBR } from "@/lib/numberUtils";
import { EnhancedAutocomplete } from "@/components/ui/enhanced-autocomplete";
import ProductForm from '@/components/ProductForm';

function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [filteredSubgroups, setFilteredSubgroups] = useState<Subgroup[]>([]);
  const navigate = useNavigate();

  const fetchGroups = async () => {
    try {
      const groupsData = await getGroups();
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
    try {
      const subgroupsData = await getSubgroups();
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

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const productsData = await getProducts();
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
    fetchProducts();
    fetchGroups();
    fetchSubgroups();

    refreshTimerRef.current = setInterval(() => {
      console.log("Atualizando produtos automaticamente...");
      fetchProducts();
    }, 5 * 60 * 1000);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      const filtered = subgroups.filter(subgroup => subgroup.group_id === selectedProduct.group_id);
      setFilteredSubgroups(filtered);
    } else {
      setFilteredSubgroups([]);
    }
  }, [selectedProduct, subgroups]);

  const filteredProducts = products
    .filter(product =>
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(search.toLowerCase())) ||
      product.supplier.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleEditOpen = (product: Product) => {
    setSelectedProduct(product);
    setEditOpen(true);
  };

  const handleEditSubmit = async (formData: Omit<Product, 'id'>) => {
    if (!selectedProduct) return;

    setLoading(true);
    try {
      await updateProduct(selectedProduct.id, formData);
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

  return (
    <>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-bakery-brown">Produtos</h1>
          <Input
            type="search"
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>
        <Card>
          <div className="flex items-center justify-between p-6 pb-0">
            <div>
              <h2 className="text-xl font-semibold text-bakery-brown">Lista de Produtos</h2>
              <p className="text-sm text-gray-500">
                Última atualização: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="mr-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Atualizar</span>
            </Button>
            <Button disabled={loading} onClick={() => navigate("/produtos/novo")}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Produto
            </Button>
          </div>

          <div className="overflow-x-auto max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Grupo/Subgrupo</TableHead>
                  <TableHead>Peso da Unidade</TableHead>
                  <TableHead>Peso do Kg</TableHead>
                  <TableHead>Custo (Kg)</TableHead>
                  <TableHead>Preço (Un)</TableHead>
                  <TableHead>Calendário</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id} className={product.recipe_id ? "bg-amber-50" : ""}>
                      <TableCell className="font-medium">
                        {product.name}
                        {product.recipe_id && (
                          <Badge variant="outline" className="flex items-center gap-1 border-amber-400 text-amber-700">
                            <ChefHat size={12} />
                            Receita
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{product.unit}</TableCell>
                      <TableCell>{product.sku || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <Badge variant="outline" className="mb-1 w-fit flex items-center gap-1">
                            <FolderTree size={12} />
                            {(() => {
                              const group = groups.find(g => g?.id === product.group_id);
                              return group?.name ?? '-';
                            })()}
                          </Badge>
                          {product.subgroup_id && (
                            <Badge variant="outline" className="w-fit flex items-center gap-1 ml-2">
                              <Tag size={12} />
                              {(() => {
                                const subgroup = subgroups.find(sg => sg?.id === product.subgroup_id);
                                return subgroup?.name ?? '-';
                              })()}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.unit_weight !== null && product.unit_weight !== undefined
                          ? formatDecimal(product.unit_weight, 3)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {product.kg_weight !== null && product.kg_weight !== undefined
                          ? formatDecimal(product.kg_weight, 3)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {product.cost !== null && product.cost !== undefined
                          ? formatCurrency(product.cost)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {product.unit_price !== null && product.unit_price !== undefined
                          ? formatCurrency(product.unit_price)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {product.all_days ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Todos os dias
                          </Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {product.monday && <Badge variant="secondary">Seg</Badge>}
                            {product.tuesday && <Badge variant="secondary">Ter</Badge>}
                            {product.wednesday && <Badge variant="secondary">Qua</Badge>}
                            {product.thursday && <Badge variant="secondary">Qui</Badge>}
                            {product.friday && <Badge variant="secondary">Sex</Badge>}
                            {product.saturday && <Badge variant="secondary">Sáb</Badge>}
                            {product.sunday && <Badge variant="secondary">Dom</Badge>}
                            {!product.monday && !product.tuesday && !product.wednesday &&
                              !product.thursday && !product.friday && !product.saturday &&
                              !product.sunday && (
                                <span className="text-gray-400 text-xs italic">Nenhum</span>
                              )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditOpen(product)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {product.recipe_id && (
                              <DropdownMenuItem onClick={() => navigate(`/recipes/edit/${product.recipe_id}`)}>
                                <ChefHat className="h-4 w-4 mr-2" />
                                Ver Receita
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-500"
                              disabled={!!product.recipe_id}
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4">
                      Nenhum produto encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[600px]">
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
          </DialogHeader>
          {selectedProduct && (
            <ProductForm
              key={selectedProduct.id}
              initialData={selectedProduct}
              onSubmit={handleEditSubmit}
              onCancel={() => {
                setEditOpen(false);
                setSelectedProduct(null);
              }}
              isLoading={loading}
              groups={groups}
              subgroups={subgroups}
              isEditMode={true}
            />
          )}
          {/* Ao criar novo produto, a navegação já leva para /produtos/novo, que agora garante product_type correto no ProductForm */}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Products;
