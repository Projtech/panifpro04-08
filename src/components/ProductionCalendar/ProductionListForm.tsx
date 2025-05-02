import { useState, useEffect } from "react";
import { Loader2, Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { getProducts, Product } from "@/services/productService";
import { ProductionList, ProductionListItem } from "@/services/productionListService";

interface FormItem extends Omit<ProductionListItem, 'id' | 'list_id' | 'created_at' | 'updated_at'> {
  productName: string;
}

interface ProductionListFormProps {
  initialData?: ProductionList;
  initialItems?: ProductionListItem[];
  onSave: (
    listData: Omit<ProductionList, 'id' | 'created_at' | 'updated_at' | 'user_id'>,
    itemsData: Omit<ProductionListItem, 'id' | 'list_id' | 'created_at' | 'updated_at'>[]
  ) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  companyId: string;
}

export default function ProductionListForm({
  initialData,
  initialItems = [],
  onSave,
  onCancel,
  isLoading = false,
  companyId,
}: ProductionListFormProps) {
  // Estados do formulário
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  
  // Estado para gerenciar a lista de itens
  const [items, setItems] = useState<FormItem[]>([]);
  
  // Estados para o novo item sendo adicionado
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedProductName, setSelectedProductName] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<"KG" | "UN">("KG");

  // Estado para a lista de produtos disponíveis
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Carregar produtos disponíveis
  useEffect(() => {
    const fetchProducts = async () => {
      if (!companyId) {
        console.error("ProductionListForm: companyId não fornecido via props.");
        setLoadingProducts(false);
        return;
      }
      setLoadingProducts(true);
      try {
        const productsData = await getProducts(companyId);
        // Filtrar apenas matérias-primas, receitas e subreceitas
        const filteredProducts = productsData.filter(
          p => p.product_type === 'materia_prima' || 
               p.product_type === 'subreceita' || 
               p.product_type === 'receita'
        );
        setProducts(filteredProducts);
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        toast.error("Não foi possível carregar a lista de produtos");
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [companyId]);

  // Carregar itens iniciais se estiver em modo de edição
  useEffect(() => {
    if (initialItems.length > 0) {
      const loadInitialItems = async () => {
        // Mapear os itens iniciais para FormItem
        const formattedItems = await Promise.all(
          initialItems.map(async (item) => {
            try {
              // Buscar informações do produto se necessário
              let productName = "";
              const product = products.find(p => p.id === item.product_id);
              
              if (product) {
                productName = product.name;
              }
              
              return {
                product_id: item.product_id,
                quantity: item.quantity,
                unit: item.unit,
                productName
              };
            } catch (error) {
              console.error("Erro ao carregar detalhes do item:", error);
              return {
                product_id: item.product_id,
                quantity: item.quantity,
                unit: item.unit,
                productName: "Produto não encontrado"
              };
            }
          })
        );
        
        setItems(formattedItems);
      };
      
      loadInitialItems();
    }
  }, [initialItems, products]);

  // Atualizar unidade ao selecionar produto
  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProductName(product.name);
      // Definir unidade com base no produto selecionado
      setUnit(product.unit?.toUpperCase() === "KG" ? "KG" : "UN");
    }
  };

  // Adicionar item à lista
  const handleAddItem = () => {
    if (!selectedProductId) {
      toast.error("Selecione um produto");
      return;
    }

    if (quantity <= 0) {
      toast.error("A quantidade deve ser maior que zero");
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) {
      toast.error("Produto não encontrado");
      return;
    }
    // Impedir adicionar matéria-prima
    if (product.product_type === 'materia_prima') {
      toast.error("Não é permitido adicionar matéria-prima em listas personalizadas. Apenas receitas e subreceitas.");
      return;
    }
    // Verificar se o produto já está na lista
    const existingItemIndex = items.findIndex(item => item.product_id === selectedProductId);
    
    if (existingItemIndex >= 0) {
      // Atualizar a quantidade se o produto já estiver na lista
      const updatedItems = [...items];
      updatedItems[existingItemIndex].quantity += quantity;
      setItems(updatedItems);
      toast.success("Quantidade atualizada");
    } else {
      // Adicionar novo item à lista
      setItems([
        ...items,
        {
          product_id: selectedProductId,
          productName: selectedProductName,
          quantity,
          unit
        }
      ]);
      toast.success("Item adicionado à lista");
    }

    // Limpar os campos de seleção
    setSelectedProductId("");
    setSelectedProductName("");
    setQuantity(1);
  };

  // Remover item da lista
  const handleRemoveItem = (index: number) => {
    setItems(prevItems => prevItems.filter((_, i) => i !== index));
    toast.success("Item removido da lista");
  };

  // Salvar a lista
  const handleSave = async () => {
    // Validação
    if (!name.trim()) {
      toast.error("O nome da lista é obrigatório");
      return;
    }

    if (items.length === 0) {
      toast.error("Adicione pelo menos um item à lista");
      return;
    }

    try {
      // Preparar dados da lista
      const listData = {
        name,
        description,
        type: 'custom' as const
      };

      // Preparar dados dos itens
      const itemsData = items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit: item.unit
      }));

      // Chamar função de salvamento
      await onSave(listData, itemsData);
    } catch (error) {
      console.error("Erro ao salvar lista:", error);
      toast.error("Não foi possível salvar a lista de produção");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome da Lista *</Label>
          <Input
            id="name"
            placeholder="Nome da lista de produção"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            placeholder="Descrição ou observações sobre esta lista"
            value={description || ""}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="border rounded-md p-4 space-y-4">
        <h3 className="text-lg font-medium">Adicionar Itens</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="product">Produto *</Label>
            <Select
              disabled={isLoading || loadingProducts}
              value={selectedProductId}
              onValueChange={handleProductChange}
            >
              <SelectTrigger id="product">
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                {loadingProducts ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>Carregando...</span>
                  </div>
                ) : (
                  products
                    .filter(product => product.product_type === 'receita' || product.product_type === 'subreceita')
                    .map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.unit})
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade *</Label>
            <Input
              id="quantity"
              type="number"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unidade</Label>
            <Select
              disabled={true} // Desabilitado porque é determinado pelo produto
              value={unit}
            >
              <SelectTrigger id="unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KG">KG</SelectItem>
                <SelectItem value="UN">UN</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleAddItem}
          disabled={isLoading || !selectedProductId}
          className="w-full md:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Item
        </Button>
      </div>

      {/* Lista de itens adicionados */}
      <div className="border rounded-md">
        <h3 className="p-4 border-b font-medium">Itens da Lista</h3>
        
        {items.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Nenhum item adicionado
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={`item-${index}-${item.product_id}`}>
                  <TableCell>{item.productName}</TableCell>
                  <TableCell>{item.quantity.toFixed(2)}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(index)}
                      disabled={isLoading}
                    >
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Botões de ação */}
      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={isLoading || !name.trim() || items.length === 0}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Lista"
          )}
        </Button>
      </div>
    </div>
  );
}
