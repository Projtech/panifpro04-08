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
  DialogTrigger,
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
  RefreshCw
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

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [isDuplicateName, setIsDuplicateName] = useState(false);
  const [isDuplicateSku, setIsDuplicateSku] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [filteredSubgroups, setFilteredSubgroups] = useState<Subgroup[]>([]);
  
  const [productForm, setProductForm] = useState<Omit<Product, 'id'>>({
    name: '',
    unit: 'Kg',
    sku: '',
    supplier: '',
    cost: 0,
    min_stock: 0,
    current_stock: null,
    unit_price: null,
    unit_weight: null,
    kg_weight: null,
    group_id: null,
    subgroup_id: null,
    all_days: false,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false
  });
  
  const navigate = useNavigate();
  
  const fetchGroups = async () => {
    try {
      const groupsData = await getGroups();
      setGroups(groupsData);
    } catch (error) {
      console.error("Erro ao carregar grupos:", error);
      toast.error("Erro ao carregar grupos");
    }
  };
  
  const fetchSubgroups = async () => {
    try {
      const subgroupsData = await getSubgroups();
      setSubgroups(subgroupsData);
    } catch (error) {
      console.error("Erro ao carregar subgrupos:", error);
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
      console.error("Erro ao carregar produtos:", error);
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
    if (productForm.group_id) {
      const filtered = subgroups.filter(subgroup => subgroup.group_id === productForm.group_id);
      setFilteredSubgroups(filtered);
      
      if (productForm.subgroup_id) {
        const belongsToGroup = filtered.some(sg => sg.id === productForm.subgroup_id);
        if (!belongsToGroup) {
          setProductForm(prev => ({ ...prev, subgroup_id: null }));
        }
      }
    } else {
      setFilteredSubgroups([]);
      setProductForm(prev => ({ ...prev, subgroup_id: null }));
    }
  }, [productForm.group_id, subgroups]);
  
  const filteredProducts = products
    .filter(product =>
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(search.toLowerCase())) ||
      product.supplier.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (['cost', 'unit_price', 'unit_weight', 'kg_weight'].includes(name) && value) {
      const numericValue = parseDecimalBR(value);
      setProductForm(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setProductForm(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleCheckboxChange = (day: string, checked: boolean) => {
    if (day === 'all_days') {
      setProductForm(prev => ({
        ...prev,
        all_days: checked,
        monday: checked,
        tuesday: checked,
        wednesday: checked,
        thursday: checked,
        friday: checked,
        saturday: checked,
        sunday: checked
      }));
    } else {
      setProductForm(prev => ({ 
        ...prev, 
        [day]: checked,
        ...(checked === false ? { all_days: false } : {})
      }));
      
      const updatedForm = {
        ...productForm,
        [day]: checked
      };
      
      if (
        updatedForm.monday &&
        updatedForm.tuesday &&
        updatedForm.wednesday &&
        updatedForm.thursday &&
        updatedForm.friday &&
        updatedForm.saturday &&
        updatedForm.sunday
      ) {
        setProductForm(prev => ({ ...prev, all_days: true }));
      }
    }
  };
  
  const handleSelectChange = (name: string, value: string | null) => {
    setProductForm(prev => ({ ...prev, [name]: value }));
  };
  
  const checkDuplicateName = async (name: string) => {
    if (!name) return;
    const nameExists = await checkProductNameExists(name);
    setIsDuplicateName(nameExists);
    return nameExists;
  };

  const checkDuplicateSku = async (sku: string) => {
    if (!sku) return;
    const skuExists = await checkProductSkuExists(sku);
    setIsDuplicateSku(skuExists);
    return skuExists;
  };

  const handleCreate = async () => {
    setFieldErrors({});
    
    const newFieldErrors: Record<string, boolean> = {};
    let hasError = false;
    
    if (!productForm.name) {
      newFieldErrors.name = true;
      hasError = true;
    }
    if (!productForm.unit) {
      newFieldErrors.unit = true;
      hasError = true;
    }
    if (!productForm.sku || productForm.sku.trim() === '') {
      newFieldErrors.sku = true;
      hasError = true;
      toast.error("O campo SKU é obrigatório.");
    }
    
    const nameExists = await checkDuplicateName(productForm.name);
    const skuExists = productForm.sku ? await checkDuplicateSku(productForm.sku) : false;
    
    if (nameExists || skuExists) {
      hasError = true;
      if (nameExists) {
        toast.error(`Já existe um produto com o nome "${productForm.name}". Escolha um nome diferente.`);
      }
      if (skuExists) {
        toast.error(`Já existe um produto com o SKU "${productForm.sku}". Escolha um SKU diferente.`);
      }
      return;
    }
    
    if (hasError) {
      setFieldErrors(newFieldErrors);
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    
    setLoading(true);
    
    const newProduct = await createProduct({
      ...productForm,
      cost: productForm.cost ? Number(productForm.cost) : null,
      min_stock: Number(productForm.min_stock),
      current_stock: productForm.current_stock ? Number(productForm.current_stock) : null,
      unit_price: productForm.unit_price ? Number(productForm.unit_price) : null,
      unit_weight: productForm.unit_weight ? Number(productForm.unit_weight) : null,
      kg_weight: productForm.kg_weight ? Number(productForm.kg_weight) : null
    });
    
    if (newProduct) {
      setProducts([...products, newProduct]);
      setOpen(false);
      setProductForm({
        name: '',
        unit: 'Kg',
        sku: '',
        supplier: '',
        cost: 0,
        min_stock: 0,
        current_stock: null,
        unit_price: null,
        unit_weight: null,
        kg_weight: null,
        group_id: null,
        subgroup_id: null,
        all_days: false,
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      });
    }
    
    setLoading(false);
  };
  
  const handleEdit = async () => {
    setFieldErrors({});
    
    const newFieldErrors: Record<string, boolean> = {};
    let hasError = false;
    
    if (!productForm.name) {
      newFieldErrors.name = true;
      hasError = true;
    }
    if (!productForm.unit) {
      newFieldErrors.unit = true;
      hasError = true;
    }
    if (!productForm.sku || productForm.sku.trim() === '') {
      newFieldErrors.sku = true;
      hasError = true;
      toast.error("O campo SKU é obrigatório.");
    }
    
    if (selectedProduct) {
      const nameExists = await checkProductNameExists(productForm.name, selectedProduct.id);
      const skuExists = productForm.sku ? await checkProductSkuExists(productForm.sku, selectedProduct.id) : false;
      
      if (nameExists || skuExists) {
        hasError = true;
        if (nameExists) {
          toast.error(`Já existe um produto com o nome "${productForm.name}". Escolha um nome diferente.`);
        }
        if (skuExists) {
          toast.error(`Já existe um produto com o SKU "${productForm.sku}". Escolha um SKU diferente.`);
        }
        return;
      }
    }
    
    if (hasError) {
      setFieldErrors(newFieldErrors);
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    
    if (!selectedProduct) return;
    
    setLoading(true);
    
    const updatedProduct = await updateProduct(selectedProduct.id, {
      ...productForm,
      cost: productForm.cost ? Number(productForm.cost) : null,
      min_stock: Number(productForm.min_stock),
      current_stock: productForm.current_stock ? Number(productForm.current_stock) : null,
      unit_price: productForm.unit_price ? Number(productForm.unit_price) : null,
      unit_weight: productForm.unit_weight ? Number(productForm.unit_weight) : null,
      kg_weight: productForm.kg_weight ? Number(productForm.kg_weight) : null
    });
    
    if (updatedProduct) {
      setProducts(products.map(product => product.id === updatedProduct.id ? updatedProduct : product));
      setEditOpen(false);
      setSelectedProduct(null);
      setProductForm({
        name: '',
        unit: 'Kg',
        sku: '',
        supplier: '',
        cost: 0,
        min_stock: 0,
        current_stock: null,
        unit_price: null,
        unit_weight: null,
        kg_weight: null,
        group_id: null,
        subgroup_id: null,
        all_days: false,
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      });
    }
    
    setLoading(false);
  };
  
  const handleDelete = async (id: string) => {
    setLoading(true);
    
    const success = await deleteProduct(id);
    
    if (success) {
      setProducts(products.filter(product => product.id !== id));
    }
    
    setLoading(false);
  };
  
  const handleEditOpen = (product: Product) => {
    setSelectedProduct(product);
    setIsDuplicateName(false);
    setIsDuplicateSku(false);
    setProductForm({
      name: product.name,
      unit: product.unit,
      sku: product.sku,
      supplier: product.supplier,
      cost: product.cost,
      min_stock: product.min_stock,
      current_stock: product.current_stock,
      unit_price: product.unit_price || null,
      recipe_id: product.recipe_id,
      unit_weight: product.unit_weight || null,
      kg_weight: product.kg_weight || null,
      group_id: product.group_id || null,
      subgroup_id: product.subgroup_id || null,
      all_days: product.all_days || false,
      monday: product.monday || false,
      tuesday: product.tuesday || false,
      wednesday: product.wednesday || false,
      thursday: product.thursday || false,
      friday: product.friday || false,
      saturday: product.saturday || false,
      sunday: product.sunday || false
    });
    setEditOpen(true);
  };

  return (
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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Novo Produto</DialogTitle>
                <DialogDescription>
                  Adicione um novo produto ao seu estoque.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="name" className="text-right font-medium">
                    Nome
                  </label>
                  <EnhancedAutocomplete
                    id="name"
                    name="name"
                    value={productForm.name}
                    onChange={(e) => {
                      handleInputChange(e);
                      checkDuplicateName(e.target.value);
                    }}
                    onSelect={(value) => {
                      setProductForm(prev => ({ ...prev, name: value }));
                      checkDuplicateName(value);
                    }}
                    suggestions={products.map(product => product.name)}
                    className="col-span-3 w-full"
                    isDuplicate={isDuplicateName}
                    error={fieldErrors.name}
                    size="lg"
                    placeholder="Digite o nome do produto"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="type" className="text-right font-medium">
                    Tipo
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={productForm.type || 'materia_prima'}
                    onChange={handleInputChange}
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="materia_prima">Matéria Prima</option>
                    <option value="embalagem">Embalagem</option>
                    <option value="subproduto">Subproduto</option>
                    <option value="decoracao">Decoração</option>
                  </select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="unit" className="text-right font-medium">
                    Unidade
                  </label>
                  <div className="col-span-3">
                    <select
                      id="unit"
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      value={productForm.unit}
                      onChange={(e) => setProductForm(prev => ({ ...prev, unit: e.target.value }))}
                    >
                      <option value="Kg">Kg</option>
                      <option value="Lt">Lt</option>
                      <option value="Un">Un</option>
                      <option value="Gr">Gr</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="sku" className="text-right font-medium text-gray-500">
                    SKU
                  </label>
                  <EnhancedAutocomplete
                    id="sku"
                    name="sku"
                    value={productForm.sku || ''}
                    onChange={(e) => {
                      handleInputChange(e);
                      checkDuplicateSku(e.target.value);
                    }}
                    onSelect={(value) => {
                      setProductForm(prev => ({ ...prev, sku: value }));
                      checkDuplicateSku(value);
                    }}
                    suggestions={products.map(product => product.sku || '').filter(Boolean)}
                    className="col-span-3 w-full"
                    isDuplicate={isDuplicateSku}
                    error={fieldErrors.sku}
                    size="default"
                    placeholder="Digite o código/SKU do produto"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="supplier" className="text-right font-medium text-gray-500">
                    Fornecedor
                  </label>
                  <Input
                    id="supplier"
                    name="supplier"
                    value={productForm.supplier || ''}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="Nome do fornecedor"
                  />
                </div>

                {productForm.unit === 'Un' ? (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="unit_weight" className="text-right font-medium">
                      Peso da Unidade
                    </label>
                    <Input
                      id="unit_weight"
                      name="unit_weight"
                      type="text"
                      inputMode="decimal"
                      value={productForm.unit_weight !== null ? formatInputDecimalBR(productForm.unit_weight, 3) : ''}
                      onChange={handleInputChange}
                      className="col-span-3"
                      placeholder="0,000"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="kg_weight" className="text-right font-medium">
                      Peso do Kg
                    </label>
                    <Input
                      id="kg_weight"
                      name="kg_weight"
                      type="text"
                      inputMode="decimal"
                      value={productForm.kg_weight !== null ? formatInputDecimalBR(productForm.kg_weight, 3) : ''}
                      onChange={handleInputChange}
                      className="col-span-3"
                      placeholder="0,000"
                    />
                  </div>
                )}

                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="cost" className="text-right font-medium">
                    Custo por {productForm.unit}
                  </label>
                  <Input
                    id="cost"
                    name="cost"
                    type="text"
                    inputMode="decimal"
                    value={productForm.cost !== null ? formatInputDecimalBR(productForm.cost, 2) : ''}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="0,00"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="unit_price" className="text-right font-medium">
                    Preço por Un
                  </label>
                  <Input
                    id="unit_price"
                    name="unit_price"
                    type="text"
                    inputMode="decimal"
                    value={productForm.unit_price !== null ? formatInputDecimalBR(productForm.unit_price, 2) : ''}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="0,00"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="group_id" className="text-right font-medium">
                    Grupo
                  </label>
                  <div className="col-span-3">
                    <select
                      id="group_id"
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={productForm.group_id || ''}
                      onChange={(e) => handleSelectChange('group_id', e.target.value || null)}
                    >
                      <option value="">Nenhum</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="subgroup_id" className="text-right font-medium">
                    Subgrupo
                  </label>
                  <div className="col-span-3">
                    <select
                      id="subgroup_id"
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={productForm.subgroup_id || ''}
                      onChange={(e) => handleSelectChange('subgroup_id', e.target.value || null)}
                      disabled={!productForm.group_id}
                    >
                      <option value="">Nenhum</option>
                      {filteredSubgroups.map((subgroup) => (
                        <option key={subgroup.id} value={subgroup.id}>
                          {subgroup.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-start gap-4 pt-2">
                  <label className="text-right font-medium">
                    Dias de Produção
                  </label>
                  <div className="col-span-3 grid gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="all_days" 
                        checked={productForm.all_days || false}
                        onCheckedChange={(checked) => handleCheckboxChange('all_days', checked === true)}
                      />
                      <label
                        htmlFor="all_days"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Todos os dias
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="monday" 
                          checked={productForm.monday || false}
                          onCheckedChange={(checked) => handleCheckboxChange('monday', checked === true)}
                        />
                        <label
                          htmlFor="monday"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Segunda
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="tuesday" 
                          checked={productForm.tuesday || false}
                          onCheckedChange={(checked) => handleCheckboxChange('tuesday', checked === true)}
                        />
                        <label
                          htmlFor="tuesday"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Terça
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="wednesday" 
                          checked={productForm.wednesday || false}
                          onCheckedChange={(checked) => handleCheckboxChange('wednesday', checked === true)}
                        />
                        <label
                          htmlFor="wednesday"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Quarta
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="thursday" 
                          checked={productForm.thursday || false}
                          onCheckedChange={(checked) => handleCheckboxChange('thursday', checked === true)}
                        />
                        <label
                          htmlFor="thursday"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Quinta
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="friday" 
                          checked={productForm.friday || false}
                          onCheckedChange={(checked) => handleCheckboxChange('friday', checked === true)}
                        />
                        <label
                          htmlFor="friday"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Sexta
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="saturday" 
                          checked={productForm.saturday || false}
                          onCheckedChange={(checked) => handleCheckboxChange('saturday', checked === true)}
                        />
                        <label
                          htmlFor="saturday"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Sábado
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="sunday" 
                          checked={productForm.sunday || false}
                          onCheckedChange={(checked) => handleCheckboxChange('sunday', checked === true)}
                        />
                        <label
                          htmlFor="sunday"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Domingo
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" onClick={handleCreate} className="ml-2" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Criar Produto
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="overflow-x-auto max-h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
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
                      <div className="flex items-center gap-2">
                        {product.name}
                        {product.recipe_id && (
                          <Badge variant="outline" className="flex items-center gap-1 border-amber-400 text-amber-700">
                            <ChefHat size={12} />
                            Receita
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell>{product.sku || '-'}</TableCell>
                    <TableCell>
                      {product.group_id && (
                        <div className="flex flex-col">
                          <Badge variant="outline" className="mb-1 w-fit flex items-center gap-1">
                            <FolderTree size={12} />
                            {groups.find(g => g.id === product.group_id)?.name || 'Grupo'}
                          </Badge>
                          {product.subgroup_id && (
                            <Badge variant="outline" className="w-fit flex items-center gap-1 ml-2">
                              <Tag size={12} />
                              {subgroups.find(sg => sg.id === product.subgroup_id)?.name || 'Subgrupo'}
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{product.unit_weight ? formatDecimal(product.unit_weight, 3) : '-'}</TableCell>
                    <TableCell>{product.kg_weight ? formatDecimal(product.kg_weight, 3) : '-'}</TableCell>
                    <TableCell>{formatCurrency(product.cost)}</TableCell>
                    <TableCell>{formatCurrency(product.unit_price)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {product.all_days && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Todos os dias
                          </Badge>
                        )}
                        {!product.all_days && (
                          <>
                            {product.monday && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Seg
                              </Badge>
                            )}
                            {product.tuesday && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Ter
                              </Badge>
                            )}
                            {product.wednesday && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Qua
                              </Badge>
                            )}
                            {product.thursday && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Qui
                              </Badge>
                            )}
                            {product.friday && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Sex
                              </Badge>
                            )}
                            {product.saturday && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Sáb
                              </Badge>
                            )}
                            {product.sunday && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Dom
                              </Badge>
                            )}
                            {!product.monday && !product.tuesday && !product.wednesday && 
                             !product.thursday && !product.friday && !product.saturday && 
                             !product.sunday && (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </>
                        )}
                      </div>
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
                            onClick={() => handleDelete(product.id)} 
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
      
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                Editar Produto
                {selectedProduct?.recipe_id && (
                  <Badge variant="outline" className="flex items-center gap-1 border-amber-400 text-amber-700">
                    <ChefHat size={12} />
                    Produto de Receita
                  </Badge>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
        
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right font-medium">
                Nome
              </label>
              <EnhancedAutocomplete
                id="name"
                name="name"
                value={productForm.name}
                onChange={(e) => {
                  handleInputChange(e);
                  if (selectedProduct) {
                    checkProductNameExists(e.target.value, selectedProduct.id)
                      .then(exists => setIsDuplicateName(exists));
                  }
                }}
                onSelect={(value) => {
                  setProductForm(prev => ({ ...prev, name: value }));
                  if (selectedProduct) {
                    checkProductNameExists(value, selectedProduct.id)
                      .then(exists => setIsDuplicateName(exists));
                  }
                }}
                suggestions={products.map(product => product.name)}
                className="col-span-3 w-full"
                isDuplicate={isDuplicateName}
                error={fieldErrors.name}
                disabled={!!selectedProduct?.recipe_id}
                size="lg"
                placeholder="Digite o nome do produto"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="type" className="text-right font-medium">
                Tipo
              </label>
              <select
                id="type"
                name="type"
                value={productForm.type || 'materia_prima'}
                onChange={handleInputChange}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="materia_prima">Matéria Prima</option>
                <option value="embalagem">Embalagem</option>
                <option value="subproduto">Subproduto</option>
                <option value="decoracao">Decoração</option>
              </select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="unit" className="text-right font-medium">
                Unidade
              </label>
              <div className="col-span-3">
                <select
                  id="unit"
                  name="unit"
                  value={productForm.unit}
                  onChange={handleInputChange}
                  className={`col-span-3 flex h-10 w-full rounded-md border ${fieldErrors.unit ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                  disabled={!!selectedProduct?.recipe_id}
                >
                  <option value="">Selecione a unidade</option>
                  <option value="Kg">Kg</option>
                  <option value="Lt">Lt</option>
                  <option value="Un">Un</option>
                  <option value="Gr">Gr</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="group" className="text-right font-medium">
                Grupo
              </label>
              <select
                id="group_id"
                name="group_id"
                value={productForm.group_id || ''}
                onChange={(e) => {
                  handleInputChange(e);
                  if (e.target.value !== productForm.group_id) {
                    setProductForm(prev => ({ ...prev, subgroup_id: null }));
                  }
                }}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!!selectedProduct?.recipe_id}
              >
                <option value="">Selecione um grupo</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="subgroup" className="text-right font-medium">
                Subgrupo
              </label>
              <select
                id="subgroup_id"
                name="subgroup_id"
                value={productForm.subgroup_id || ''}
                onChange={handleInputChange}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!productForm.group_id || !!selectedProduct?.recipe_id}
              >
                <option value="">Selecione um subgrupo</option>
                {subgroups
                  .filter((subgroup) => subgroup.group_id === productForm.group_id)
                  .map((subgroup) => (
                    <option key={subgroup.id} value={subgroup.id}>
                      {subgroup.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="sku" className="text-right font-medium">
                SKU
              </label>
              <EnhancedAutocomplete
                id="sku"
                name="sku"
                value={productForm.sku || ''}
                onChange={(e) => {
                  handleInputChange(e);
                  if (selectedProduct) {
                    checkProductSkuExists(e.target.value, selectedProduct.id)
                      .then(exists => setIsDuplicateSku(exists));
                  }
                }}
                onSelect={(value) => {
                  setProductForm(prev => ({ ...prev, sku: value }));
                  if (selectedProduct) {
                    checkProductSkuExists(value, selectedProduct.id)
                      .then(exists => setIsDuplicateSku(exists));
                  }
                }}
                suggestions={products.map(product => product.sku || '').filter(Boolean)}
                className="col-span-3 w-full"
                isDuplicate={isDuplicateSku}
                disabled={!!selectedProduct?.recipe_id}
                size="default"
                placeholder="Digite o código/SKU do produto"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="supplier" className="text-right font-medium">
                Fornecedor
              </label>
              <Input
                id="supplier"
                name="supplier"
                value={productForm.supplier}
                onChange={handleInputChange}
                className="col-span-3"
                disabled={!!selectedProduct?.recipe_id}
              />
            </div>

            {productForm.unit === 'Un' ? (
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="unit_weight" className="text-right font-medium">
                  Peso da Unidade
                </label>
                <Input
                  id="unit_weight"
                  name="unit_weight"
                  type="text"
                  inputMode="decimal"
                  value={productForm.unit_weight !== null ? formatInputDecimalBR(productForm.unit_weight, 3) : ''}
                  onChange={handleInputChange}
                  className="col-span-3"
                  disabled={!!selectedProduct?.recipe_id}
                />
              </div>
            ) : (
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="kg_weight" className="text-right font-medium">
                  Peso do Kg
                </label>
                <Input
                  id="kg_weight"
                  name="kg_weight"
                  type="text"
                  inputMode="decimal"
                  value={productForm.kg_weight !== null ? formatInputDecimalBR(productForm.kg_weight, 3) : ''}
                  onChange={handleInputChange}
                  className="col-span-3"
                  disabled={!!selectedProduct?.recipe_id}
                />
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="cost" className="text-right font-medium">
                Custo por {productForm.unit}
              </label>
              <Input
                id="cost"
                name="cost"
                type="text"
                inputMode="decimal"
                value={productForm.cost || ''}
                onChange={handleInputChange}
                className="col-span-3"
                disabled={!!selectedProduct?.recipe_id}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="unit_price" className="text-right font-medium">
                Preço por Un
              </label>
              <Input
                id="unit_price"
                name="unit_price"
                type="text"
                inputMode="decimal"
                value={productForm.unit_price || ''}
                onChange={handleInputChange}
                className="col-span-3"
                disabled={!!selectedProduct?.recipe_id}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="min_stock" className="text-right font-medium">
                Estoque Mínimo
              </label>
              <Input
                id="min_stock"
                name="min_stock"
                type="number"
                step="1"
                value={productForm.min_stock || ''}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="current_stock" className="text-right font-medium">
                Estoque Atual
              </label>
              <Input
                id="current_stock"
                name="current_stock"
                type="number"
                step="0.01"
                value={productForm.current_stock || ''}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4 align-top">
              <label className="text-right font-medium pt-1">
                Dias de Produção
              </label>
              <div className="col-span-3 grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="all_days" 
                      checked={productForm.all_days || false}
                      onCheckedChange={(checked) => handleCheckboxChange('all_days', checked === true)}
                    />
                    <label
                      htmlFor="all_days"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Todos os dias
                    </label>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="monday" 
                    checked={productForm.monday || false}
                    onCheckedChange={(checked) => handleCheckboxChange('monday', checked === true)}
                  />
                  <label
                    htmlFor="monday"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Segunda
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="tuesday" 
                    checked={productForm.tuesday || false}
                    onCheckedChange={(checked) => handleCheckboxChange('tuesday', checked === true)}
                  />
                  <label
                    htmlFor="tuesday"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Terça
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="wednesday" 
                    checked={productForm.wednesday || false}
                    onCheckedChange={(checked) => handleCheckboxChange('wednesday', checked === true)}
                  />
                  <label
                    htmlFor="wednesday"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Quarta
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="thursday" 
                    checked={productForm.thursday || false}
                    onCheckedChange={(checked) => handleCheckboxChange('thursday', checked === true)}
                  />
                  <label
                    htmlFor="thursday"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Quinta
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="friday" 
                    checked={productForm.friday || false}
                    onCheckedChange={(checked) => handleCheckboxChange('friday', checked === true)}
                  />
                  <label
                    htmlFor="friday"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Sexta
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="saturday" 
                    checked={productForm.saturday || false}
                    onCheckedChange={(checked) => handleCheckboxChange('saturday', checked === true)}
                  />
                  <label
                    htmlFor="saturday"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Sábado
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="sunday" 
                    checked={productForm.sunday || false}
                    onCheckedChange={(checked) => handleCheckboxChange('sunday', checked === true)}
                  />
                  <label
                    htmlFor="sunday"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Domingo
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" onClick={handleEdit} className="ml-2" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Edit className="h-4 w-4 mr-2" />
              )}
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
