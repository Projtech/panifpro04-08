import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useLocation } from "react-router-dom";
import { parseDecimalBR } from "@/lib/numberUtils";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus, 
  Trash,
  Calculator,
  Save,
  ArrowLeft,
  UploadCloud,
  Loader2,
  List
} from "lucide-react";
import { toast } from "sonner";
import { 
  getProducts, 
  Product, 
  createProduct, 
  ProductType,
  searchProductsByTerm
} from "@/services/productService";
import { 
  getRecipes, 
  getRecipeWithIngredients, 
  createRecipe, 
  updateRecipe, 
  Recipe, 
  RecipeIngredient, 
  checkRecipeNameExists // Adicionar importação
} from "@/services/recipeService";
import { getSystemProductTypeId, determineRecipeProductType } from "@/services/recipeTypeHelper";
import { getGroups, getSubgroups, Group, Subgroup } from "@/services/groupService";
import { useAuth } from '@/contexts/AuthContext';

interface Ingredient {
  id: string;
  productId: string | null;
  productName: string;
  isSubRecipe: boolean;
  subRecipeId: string | null;
  quantity: number;
  unit: string;
  cost: number;
  totalCost: number;
  etapa: string | null;
}

// Interface para o estado do formulário
interface RecipeFormState {
  name: string;
  description: string;
  instructions: string;
  yieldKg: string;
  yieldUnits: number;
  photoUrl: string;
  gifUrl: string;
  isActive: boolean;
  groupId: string;
  subgroupId: string;
  sellingPrice: number;
  costPerKg: number;
  costPerUnit: number;
  profitMargin: number;
  profitValue: number;
  totalCost: number;
  isSubProduct?: boolean;
  code?: string;
  finalUnit?: string;
  group_id?: string;
  subgroup_id?: string;
}

export default function RecipeForm() {
  const { activeCompany, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditing = !!id;
  
  // Estados de carregamento
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearchResults, setProductSearchResults] = useState<Product[]>([]);
  const [subRecipes, setSubRecipes] = useState<Recipe[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [existingRecipes, setExistingRecipes] = useState<Recipe[]>([]);
  
  // Estado do formulário
  const [recipeForm, setRecipeForm] = useState<RecipeFormState>({
    name: '',
    description: '',
    instructions: '',
    yieldKg: '',
    yieldUnits: 0,
    photoUrl: '',
    gifUrl: '',
    isActive: true,
    groupId: '',
    subgroupId: '',
    sellingPrice: 0,
    costPerKg: 0,
    costPerUnit: 0,
    profitMargin: 0,
    profitValue: 0,
    totalCost: 0,
    isSubProduct: false,
    code: '',
    finalUnit: 'KG',
    group_id: '',
    subgroup_id: ''
  });

  // Refs para controle do componente
  const isMounted = useRef(true);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Efeito para limpar recursos ao desmontar
  useEffect(() => {
    return () => {
      isMounted.current = false;
      // Limpar URLs de mídia
      if (recipeForm.photoUrl && recipeForm.photoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(recipeForm.photoUrl);
      }
      if (recipeForm.gifUrl && recipeForm.gifUrl.startsWith('blob:')) {
        URL.revokeObjectURL(recipeForm.gifUrl);
      }
    };
  }, [recipeForm.photoUrl, recipeForm.gifUrl]);
  
  // Carregar dados da receita quando estiver editando
  useEffect(() => {
    const loadRecipeData = async () => {
      if (isEditing && id && activeCompany?.id) {
        setLoading(true);
        try {
          const { recipe, ingredients: recipeIngredients } = await getRecipeWithIngredients(id, activeCompany.id);
          
          if (isMounted.current && recipe) {
            // Mapear dados da receita para o estado do formulário
            setRecipeForm({
              name: recipe.name || '',
              description: recipe.description || '',
              instructions: recipe.instructions || '',
              yieldKg: recipe.yield_kg ? recipe.yield_kg.toString().replace('.', ',') : '',
              yieldUnits: recipe.yield_units || 0,
              photoUrl: recipe.photo_url || '',
              gifUrl: recipe.gif_url || '',
              isActive: recipe.is_active !== false, // default true
              groupId: recipe.group_id || '',
              subgroupId: recipe.subgroup_id || '',
              sellingPrice: recipe.selling_price || 0,
              costPerKg: recipe.cost_per_kg || 0,
              costPerUnit: recipe.cost_per_unit || 0,
              profitMargin: recipe.profit_margin || 0,
              profitValue: recipe.profit_value || 0,
              totalCost: recipe.total_cost || 0,
              isSubProduct: recipe.is_sub_recipe || false,
              code: recipe.code || '',
              finalUnit: recipe.final_unit || 'KG',
              group_id: recipe.group_id || '',
              subgroup_id: recipe.subgroup_id || ''
            });
            
            setYieldKgForDisplay(recipe.yield_kg || null);
            setSellingPrice(recipe.selling_price || 0);
            
            // Mapear ingredientes
            if (recipeIngredients && recipeIngredients.length > 0) {
              const mappedIngredients: Ingredient[] = recipeIngredients.map(ing => ({
                id: ing.id || `ing-${Date.now()}-${Math.random()}`,
                productId: ing.is_sub_recipe ? null : ing.product_id,
                productName: ing.is_sub_recipe 
                  ? (ing.sub_recipe?.name || 'SubReceita sem nome')
                  : (ing.product?.name || 'Produto sem nome'),
                isSubRecipe: ing.is_sub_recipe || false,
                subRecipeId: ing.is_sub_recipe ? ing.sub_recipe_id : null,
                quantity: ing.quantity || 0,
                unit: ing.unit || 'kg',
                cost: ing.cost || 0,
                totalCost: ing.total_cost || 0,
                etapa: ing.etapa || null
              }));
              
              setIngredients(mappedIngredients);
              
              // Calcular custo total
              const total = mappedIngredients.reduce((sum, ing) => sum + (ing.totalCost || 0), 0);
              setTotalIngredientsCost(total);
              
              // Calcular custo por kg e por unidade
              if (recipe.yield_kg && recipe.yield_kg > 0) {
                setCostPerKg(total / recipe.yield_kg);
                
                if (recipe.yield_units && recipe.yield_units > 0) {
                  setCostPerUnit(total / recipe.yield_units);
                }
              }
            }
          }
        } catch (error) {
          console.error("Erro ao carregar dados da receita:", error);
          toast.error("Erro ao carregar dados da receita. Por favor, tente novamente.");
        } finally {
          if (isMounted.current) {
            setLoading(false);
          }
        }
      }
    };
    
    loadRecipeData();
  }, [id, activeCompany?.id, isEditing]);
  
  // Novo: tipo do produto gerado por receita
  const [productTypeForForm, setProductTypeForForm] = useState<'receita' | 'subreceita'>('receita');
  
  // Estado para armazenar a origem da navegação (para retorno após cadastro de produto)
  const [returnToRecipe, setReturnToRecipe] = useState<boolean>(false);
  
  // Obter dados da localização (para verificar se estamos retornando do cadastro de produto)
  const location = useLocation();
  
  // Recuperar dados da receita do localStorage quando retornar da página de novo produto
  useEffect(() => {
    // Verificar se estamos retornando da página de cadastro de produto
    // O NovoProduto.tsx usa 'fromProductCreation' como state
    const isReturningFromProduct = location.state?.fromProductCreation || location.state?.returnToRecipe;
    console.log('[RecipeForm] Verificando retorno da página de produto:', { 
      locationState: location.state, 
      isReturningFromProduct, 
      hasTempData: !!localStorage.getItem('temp_recipe_data') 
    });
    
    if (isReturningFromProduct && localStorage.getItem('temp_recipe_data')) {
      try {
        const savedData = JSON.parse(localStorage.getItem('temp_recipe_data') || '');
        
        if (savedData) {
          console.log('[RecipeForm] Restaurando dados salvos da receita');
          // Restaurar os dados do formulário e ingredientes
          setRecipeForm(savedData.recipeForm);
          setIngredients(savedData.ingredients);
          
          // Recalcular o custo total dos ingredientes
          const total = savedData.ingredients.reduce((sum, ing) => sum + (ing.totalCost || 0), 0);
          setTotalIngredientsCost(total);
          
          // Recalcular custo por kg e por unidade
          if (savedData.recipeForm.yieldKg) {
            const yieldKgNum = parseDecimalBR(savedData.recipeForm.yieldKg);
            if (yieldKgNum && yieldKgNum > 0) {
              setCostPerKg(total / yieldKgNum);
              
              if (savedData.recipeForm.yieldUnits && savedData.recipeForm.yieldUnits > 0) {
                setCostPerUnit(total / savedData.recipeForm.yieldUnits);
              }
            }
          }
          
          // Se temos um novo produto criado, apenas notificar o usuário
          const newProductId = location.state?.newProductId;
          const newProductName = location.state?.newProductName;
          
          if (newProductId && newProductName) {
            console.log('[RecipeForm] Novo produto detectado:', { newProductId, newProductName });
            
            // Apenas notificar o usuário que o produto foi criado e está disponível
            toast.success(`Produto "${newProductName}" criado com sucesso! Disponível para seleção.`);
            
            // Recarregar a lista de produtos para incluir o novo produto
            if (activeCompany?.id) {
              getProducts(activeCompany.id).then(productsData => {
                if (isMounted.current) {
                  setProducts(productsData);
                }
              }).catch(error => {
                console.error("Erro ao recarregar produtos:", error);
              });
            }
          } else {
            toast.success("Dados da receita restaurados com sucesso!");
          }
        }
      } catch (error) {
        console.error("Erro ao restaurar dados da receita:", error);
        toast.error("Erro ao restaurar dados da receita.");
      } finally {
        // Limpar os dados temporários
        localStorage.removeItem('temp_recipe_data');
      }
    }
  }, [location]);
  
  // Configurar e limpar o ref de montagem
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      // Limpar a URL do objeto quando o componente for desmontado
      if (recipeForm.photoUrl && recipeForm.photoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(recipeForm.photoUrl);
      }
    };
  }, [recipeForm.photoUrl]);
  
  // Carregar dados iniciais (produtos, grupos, subgrupos e receitas)
  useEffect(() => {
    if (!isMounted.current || !activeCompany?.id) return;
    
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Verificar os IDs dos tipos de sistema para receitas e subreceitas
        const receitaTypeId = await getSystemProductTypeId('receita', activeCompany.id);
        const subreceitaTypeId = await getSystemProductTypeId('subreceita', activeCompany.id);
        console.log("IDs dos tipos de sistema obtidos:", { receitaTypeId, subreceitaTypeId });
        
        // Carregar produtos
        const productsList = await getProducts(activeCompany.id);
        setProducts(productsList);
        
        // Carregar sub-receitas (receitas marcadas como sub-produtos)
        const recipesList = await getRecipes(activeCompany.id);
        setExistingRecipes(recipesList);
        
        const subRecipesList = recipesList.filter(r => r.code && r.code.startsWith('SUB'));
        setSubRecipes(subRecipesList);
        
        // Carregar grupos e subgrupos
        const groupsList = await getGroups(activeCompany.id);
        setGroups(groupsList);
        
        const subgroupsList = await getSubgroups(activeCompany.id);
        setSubgroups(subgroupsList);
        
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
        toast.error("Erro ao carregar dados necessários. Por favor, recarregue a página.");
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };
    
    loadInitialData();
  }, [activeCompany?.id]);
  
  // Estado para os arquivos de mídia
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedGif, setSelectedGif] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  
  // Outros estados necessários
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [totalIngredientsCost, setTotalIngredientsCost] = useState(0);
  const [costPerKg, setCostPerKg] = useState(0);
  const [costPerUnit, setCostPerUnit] = useState(0);
  const [yieldKgForDisplay, setYieldKgForDisplay] = useState<number | null>(null);
  

  
  // Estado para o novo ingrediente
  const [newIngredient, setNewIngredient] = useState({
    productId: null as string | null,
    productName: '',
    isSubRecipe: false,
    subRecipeId: null as string | null,
    quantity: '',
    unit: 'kg',
    cost: 0,
    totalCost: 0,
    etapa: null as string | null
  });
  
  // Estado para a aba ativa
  const [activeTab, setActiveTab] = useState('ingredients');
  
  // Estado para o preço de venda
  const [sellingPrice, setSellingPrice] = useState(0);
  
  // Filtrar subgrupos com base no grupo selecionado
  const filteredSubgroups = useMemo(() => {
    return subgroups.filter(subgroup => subgroup.group_id === recipeForm.groupId);
  }, [subgroups, recipeForm.groupId]);
  
  // Mover ingrediente para cima
  const moveIngredientUp = (index: number) => {
    if (index <= 0 || index >= ingredients.length) return;
    
    const newIngredients = [...ingredients];
    [newIngredients[index - 1], newIngredients[index]] = [newIngredients[index], newIngredients[index - 1]];
    setIngredients(newIngredients);
  };
  
  // Mover ingrediente para baixo
  const moveIngredientDown = (index: number) => {
    if (index < 0 || index >= ingredients.length - 1) return;
    
    const newIngredients = [...ingredients];
    [newIngredients[index], newIngredients[index + 1]] = [newIngredients[index + 1], newIngredients[index]];
    setIngredients(newIngredients);
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verifica se é uma imagem
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem válido (JPG, PNG, etc.)');
      return;
    }

    // Verifica o tamanho do arquivo (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('O arquivo é muito grande. O tamanho máximo permitido é 5MB.');
      return;
    }

    // Limpa a URL anterior se existir
    if (recipeForm.photoUrl && recipeForm.photoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(recipeForm.photoUrl);
    }

    // Cria uma URL para visualização
    const imageUrl = URL.createObjectURL(file);
    
    // Atualiza o estado com o arquivo e a URL
    setSelectedFile(file);
    setRecipeForm(prev => ({
      ...prev,
      photoUrl: imageUrl
    }));
  };
  
  const handleGifUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verifica se é um GIF
    if (!file.type.includes('gif')) {
      toast.error('Por favor, selecione um arquivo GIF.');
      return;
    }

    // Verifica o tamanho do arquivo (10MB máximo)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('O arquivo é muito grande. O tamanho máximo permitido é 10MB.');
      return;
    }

    // Limpa a URL anterior se existir
    if (recipeForm.gifUrl && recipeForm.gifUrl.startsWith('blob:')) {
      URL.revokeObjectURL(recipeForm.gifUrl);
    }

    // Cria uma URL para visualização
    const gifUrl = URL.createObjectURL(file);
    
    // Atualiza o estado com o arquivo e a URL
    setSelectedGif(file);
    setRecipeForm(prev => ({
      ...prev,
      gifUrl: gifUrl
    }));
  };
  
  const handleRemoveImage = (type: 'image' | 'gif' = 'image') => {
    if (type === 'image') {
      // Limpa a URL do objeto
      if (recipeForm.photoUrl && recipeForm.photoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(recipeForm.photoUrl);
      }
      
      // Limpa o estado
      setSelectedFile(null);
      setRecipeForm(prev => ({
        ...prev,
        photoUrl: ''
      }));
    } else {
      // Limpa a URL do GIF
      if (recipeForm.gifUrl && recipeForm.gifUrl.startsWith('blob:')) {
        URL.revokeObjectURL(recipeForm.gifUrl);
      }
      
      // Limpa o estado do GIF
      setSelectedGif(null);
      setRecipeForm(prev => ({
        ...prev,
        gifUrl: ''
      }));
    }
  };
  

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setRecipeForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (checked: boolean | string, checkboxId?: string) => {
    const isChecked = typeof checked === 'boolean' ? checked : checked === 'true';
    
    // Verificar qual checkbox foi clicado com base no ID ou contexto
    if (checkboxId === 'isSubProduct' || !checkboxId) {
      // Atualizar isSubProduct quando o checkbox "É uma SubReceita" é clicado
      console.log('[handleCheckboxChange] Atualizando isSubProduct para:', isChecked);
      
      setRecipeForm(prev => {
        // Gerar um código único para subreceitas
        let newCode = '';
        if (isChecked) {
          // Gerar um código único com prefixo SUB e um timestamp
          const timestamp = Date.now().toString().slice(-6); // Últimos 6 dígitos do timestamp
          newCode = `SUB-${timestamp}`;
        } else {
          // Se estiver desmarcando, limpar o código apenas se começar com 'SUB'
          newCode = prev.code?.startsWith('SUB') ? '' : prev.code;
        }
        
        return {
          ...prev,
          isSubProduct: isChecked,
          // Usar o código único gerado
          code: newCode
        };
      });
    } else {
      // Para outros checkboxes (como isActive)
      setRecipeForm(prev => ({
        ...prev,
        isActive: isChecked
      }));
    }
  };
  
  const handleIngredientChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Para campos numéricos, garantir que são números válidos
    if (name === 'quantity' || name === 'cost' || name === 'totalCost') {
      // Se for string vazia, permite para que o usuário possa apagar o valor
      if (value === '') {
        setNewIngredient(prev => ({
          ...prev,
          [name]: value
        }));
        return;
      }
      
      // Caso especial: se começar com vírgula, adiciona um zero na frente
      let valueToProcess = value;
      if (value.startsWith(',')) {
        valueToProcess = '0' + value;
      }
      
      // Converte para número e verifica se é um número válido
      const numValue = parseFloat(valueToProcess.replace(',', '.'));
      if (isNaN(numValue)) {
        return; // Não atualiza se não for um número válido
      }
      
      setNewIngredient(prev => ({
        ...prev,
        [name]: name === 'quantity' ? value : numValue // Mantém como string para quantidade para permitir formatação
      }));
    } else {
      setNewIngredient(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };


  const handleProductTypeChange = (type: string) => {
    // Reset product and sub-recipe selections, mas mantém etapa e o texto de busca!
    setNewIngredient(prev => ({
      ...prev,
      productId: null,
      subRecipeId: null,
      isSubRecipe: type === 'sub-product',
      // Mantém o nome do produto para permitir a busca imediata
      // etapa: prev.etapa // mantém o valor já escolhido
    }));
    
    // Adiciona um pequeno atraso para garantir que o dropdown de resultados seja exibido
    setTimeout(() => {
      const inputElement = document.querySelector('input[placeholder="Digite para buscar uma SubReceita"], input[placeholder="Digite para buscar uma matéria prima"]');
      if (inputElement instanceof HTMLInputElement) {
        // Simula um evento de mudança para acionar a busca
        const event = new Event('input', { bubbles: true });
        inputElement.dispatchEvent(event);
        // Foca no campo de busca
        inputElement.focus();
      }
    }, 100);
  };
  
  const handleProductSelect = (value: string) => {
    const productId = value;
    
    const product = products.find(p => p.id === productId);
    
    if (product) {
      setNewIngredient(prev => ({
        ...prev,
        productId,
        isSubRecipe: false,
        subRecipeId: null,
        productName: product.name,
        unit: product.unit,
        cost: product.cost || 0,
        // etapa: prev.etapa // mantém o valor já escolhido
        quantity: '' // Resetar para string vazia ao selecionar produto
      }));
    }
  };
  
  const handleSubRecipeSelect = (value: string) => {
    const subRecipeId = value;
    
    const subRecipe = subRecipes.find(r => r.id === subRecipeId);
    
    if (subRecipe) {
      setNewIngredient(prev => ({
        ...prev,
        subRecipeId,
        isSubRecipe: true,
        productId: null,
        productName: subRecipe.name,
        unit: 'kg',
        cost: subRecipe.cost_per_kg || 0,
        // etapa: prev.etapa // mantém o valor já escolhido
        quantity: '' // Resetar para string vazia ao selecionar subreceita
      }));
    }
  };
  
  const addIngredient = () => {
    // Validar seleção de produto/subreceita
    if (!newIngredient.productId && !newIngredient.subRecipeId) {
      toast.error("Selecione um produto ou sub-receita.");
      return;
    }
    
    // Validar e converter quantidade
    const quantityStr = newIngredient.quantity; // Já é string
    const quantityNum = parseDecimalBR(quantityStr);

    if (quantityNum === null || isNaN(quantityNum) || quantityNum <= 0) {
      console.error(`Quantidade inválida digitada: '${quantityStr}'. Não foi possível converter para número ou é menor/igual a zero. Use formato brasileiro (ex: 0,75).`);
      toast.error("Quantidade inválida. Use vírgula como separador (ex: 0,75) e deve ser maior que zero.");
      // Poderíamos adicionar um highlight no campo aqui se necessário
      return;
    }
    
    // Se chegou aqui, a quantidade é válida (quantityNum)
    
    const totalCost = (newIngredient.cost || 0) * quantityNum; // Usar o número validado
    
    const ingredientToAdd: Ingredient = {
      id: `ing-${Date.now()}`,
      productId: newIngredient.productId || null,
      subRecipeId: newIngredient.subRecipeId || null,
      productName: newIngredient.productName,
      isSubRecipe: newIngredient.isSubRecipe,
      quantity: quantityNum, // Usar o número validado
      unit: newIngredient.unit,
      cost: newIngredient.cost,
      totalCost,
      etapa: newIngredient.etapa,
    };
    
    setIngredients([...ingredients, ingredientToAdd]);
    
    // Reset ingredient form but keep isSubRecipe state
    const resetNewIngredient = () => {
      setNewIngredient({
        id: uuidv4(),
        etapa: '',
        isSubRecipe: newIngredient.isSubRecipe,
        productId: null,
        subRecipeId: null,
        productName: '',
        quantity: '',
        unit: ''
      });
      // Limpar resultados de busca anteriores
      setProductSearchResults([]);
    };
    resetNewIngredient();
  };
  
  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
  };
  
  const handleCalculate = () => {
    toast.success(`Custos calculados: Total R$ ${totalIngredientsCost.toFixed(2)} - Por kg: R$ ${costPerKg.toFixed(2)}`);
  };
  
  // Função para navegar para a página de cadastro de produtos
  const handleNavigateToNewProduct = () => {
    // Salvar os dados atuais da receita no localStorage
    const tempRecipeData = {
      recipeForm,
      ingredients
    };
    
    // Armazenar os dados temporariamente
    localStorage.setItem('temp_recipe_data', JSON.stringify(tempRecipeData));
    
    // Navegar para a página de cadastro de produtos com state para indicar retorno
    navigate('/produtos/novo', { state: { returnToRecipe: true, recipeId: id } });
  };
  
  // Helper function to convert our front-end ingredient structure to the backend structure
  const mapIngredientsForBackend = (ingredients: Ingredient[]): Omit<RecipeIngredient, 'id' | 'recipe_id'>[] => {
    return ingredients.map(ing => ({
      product_id: ing.isSubRecipe ? null : ing.productId,
      sub_recipe_id: ing.isSubRecipe ? ing.subRecipeId : null,
      is_sub_recipe: ing.isSubRecipe,
      quantity: ing.quantity,
      unit: ing.unit,
      cost: ing.cost,
      total_cost: ing.totalCost,
      etapa: ing.etapa,
    }));
  };

  const handleSave = useCallback(async () => {
    // Verificar se o componente ainda está montado
    if (!isMounted.current) return;
    
    // Reset error highlighting
    setFieldErrors({});
    
    // Check required fields
    const newFieldErrors: Record<string, boolean> = {};
    let hasError = false;
    
    // Required fields validation
    if (!recipeForm.name) {
      newFieldErrors.name = true;
      hasError = true;
    }
    // Validar e converter Rendimento (kg)
    const yieldKgStr = recipeForm.yieldKg; // Já é string
    const yieldKgNum = parseDecimalBR(yieldKgStr);

    if (yieldKgNum === null || isNaN(yieldKgNum) || yieldKgNum <= 0) {
      newFieldErrors.yieldKg = true;
      hasError = true;
      console.error(`Rendimento (kg) inválido digitado: '${yieldKgStr}'. Não foi possível converter para número ou é menor/igual a zero. Use formato brasileiro (ex: 2,5).`);
    }
    
    if (hasError) {
      setFieldErrors(newFieldErrors);
      toast.error("Verifique os campos obrigatórios ou inválidos. Use vírgula para decimais (ex: 2,5).");
      return;
    }
    
    if (ingredients.length === 0) {
      toast.error("Adicione pelo menos um ingrediente à receita.");
      return;
    }
    
    // Verificar se o componente ainda está montado antes de atualizar o estado
    if (!isMounted.current) return;
    setLoading(true);

    if (!activeCompany) {
      if (isMounted.current) {
        toast.error("Nenhuma empresa ativa selecionada. Por favor, selecione uma empresa para continuar.");
        setLoading(false);
      }
      return;
    }

    // <<< INÍCIO DA LÓGICA DE VERIFICAÇÃO DE NOME DUPLICADO >>>
    const nameToCheck = recipeForm.name.trim();
    if (!nameToCheck) {
      toast.error("O nome da receita não pode estar vazio.");
      setLoading(false);
      return;
    }

    try {
      if (authLoading || !activeCompany?.id) {
        toast.error("Empresa ativa não carregada. Tente novamente mais tarde.");
        setLoading(false);
        return;
      }
      const nameExists = await checkRecipeNameExists(nameToCheck, activeCompany.id, id);
      if (nameExists) {
        toast.error(`Já existe uma receita com o nome "${nameToCheck}". Escolha outro nome.`);
        setLoading(false);
        return; // Interrompe o salvamento
      }
    } catch (error) {
      console.error("Erro ao verificar nome da receita:", error);
      toast.error("Erro ao verificar a disponibilidade do nome da receita. Tente novamente.");
      setLoading(false);
      return;
    }
    // <<< FIM DA LÓGICA DE VERIFICAÇÃO DE NOME DUPLICADO >>>

    try {
      // Format recipe data
      const recipeData: Omit<Recipe, 'id' | 'created_at' | 'created_by'> = {
        name: recipeForm.name,
        code: recipeForm.code || null, // Usar o código já definido (que pode ser SUB-XXXXXX para subreceitas)
        yield_kg: yieldKgNum!, // Usar o número validado!
        yield_units: recipeForm.yieldUnits || null,
        instructions: recipeForm.instructions || null,
        photo_url: recipeForm.photoUrl || null,
        gif_url: recipeForm.gifUrl || null,
        cost_per_kg: costPerKg,
        cost_per_unit: costPerUnit,
        group_id: recipeForm.groupId || null,
        subgroup_id: recipeForm.subgroupId || null,
        // Incluir os campos de dias da semana com valores nulos por enquanto
        all_days: null,
        monday: null,
        tuesday: null,
        wednesday: null,
        thursday: null,
        friday: null,
        saturday: null,
        sunday: null
      };
      
      let result;
      
      if (isEditing && id) {
        // For update, we separate ingredients that are new vs existing vs deleted
        const existingIngredientIds = new Set<string>();
        
        // Get current ingredients in the database
        // Corrigido: Adicionado activeCompany.id como segundo argumento
        const { ingredients: currentIngredients } = await getRecipeWithIngredients(id, activeCompany.id);
        currentIngredients.forEach(ing => {
          if (ing.id) existingIngredientIds.add(ing.id);
        });
        
        // Separate ingredients to add, update, or delete
        const ingredientsToAdd: Omit<RecipeIngredient, 'id' | 'recipe_id'>[] = [];
        const ingredientsToUpdate: RecipeIngredient[] = [];
        
        // Track which IDs we're keeping so we know what to delete
        const keepingIds = new Set<string>();
        
        // Process each ingredient in our current state
        ingredients.forEach(ing => {
          const ingredientData = {
            product_id: ing.isSubRecipe ? null : ing.productId,
            sub_recipe_id: ing.isSubRecipe ? ing.subRecipeId : null,
            is_sub_recipe: ing.isSubRecipe,
            quantity: ing.quantity,
            unit: ing.unit,
            cost: ing.cost,
            total_cost: ing.totalCost,
            etapa: ing.etapa,
          };
          
          // Check if this is an existing ingredient (has a valid ID that exists in DB)
          if (ing.id && ing.id.startsWith('ing-')) {
            // This is a new ingredient added during this session
            ingredientsToAdd.push(ingredientData);
          } else if (ing.id && existingIngredientIds.has(ing.id)) {
            // This is an existing ingredient we're updating
            ingredientsToUpdate.push({
              id: ing.id,
              recipe_id: id,
              ...ingredientData
            });
            keepingIds.add(ing.id);
          } else {
            // This is a new ingredient
            ingredientsToAdd.push(ingredientData);
          }
        });
        
        // Figure out which ingredients to delete (ones in DB that aren't in our current list)
        const ingredientsToDelete: string[] = Array.from(existingIngredientIds)
          .filter(id => !keepingIds.has(id));
        
        // Update recipe with all ingredient changes
        result = await updateRecipe(
          id,
          recipeData,
          ingredientsToAdd,
          ingredientsToUpdate,
          ingredientsToDelete,
          activeCompany.id
        );
      } else {
        // Create new recipe with all ingredients
        const formattedIngredients = mapIngredientsForBackend(ingredients);
        result = await createRecipe(recipeData, formattedIngredients, activeCompany.id);
      }
      
      if (result) {
        toast.success("Receita salva com sucesso!");
        navigate('/recipes');
      }
    } catch (error) {
      console.error("Error saving recipe:", error);
      toast.error(`Erro ao ${isEditing ? 'atualizar' : 'salvar'} receita`);
    } finally {
      // Verificar se o componente ainda está montado antes de atualizar o estado
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [recipeForm, ingredients, activeCompany, id, isEditing, costPerKg, costPerUnit, navigate]);

  // Remover log de depuração para produção
  return (
    <div className="animate-fade-in">
      <div className="border-b border-gray-200 pb-5 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/recipes')} 
              className="mr-4"
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            
            <h1 className="text-2xl font-bold flex items-center gap-3">
              {isEditing ? (
                <><List className="w-6 h-6 text-bakery-brown" /> Editar Receita</>
              ) : (
                <><Plus className="w-6 h-6 text-bakery-brown" /> Nova Receita</>
              )}
            </h1>
          </div>
          
          <Button 
            onClick={handleSave}
            className="bg-bakery-amber hover:bg-bakery-brown text-white"
            disabled={loading}
          >
            {/* Renderização simplificada para evitar problemas com o componente Save */}
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {!loading && <span className="h-4 w-4 mr-2 flex items-center justify-center"><Save className="h-4 w-4" /></span>}
            <span>
              {loading ? (isEditing ? 'Atualizando...' : 'Salvando...') : (isEditing ? 'Atualizar Receita' : 'Salvar Receita')}
            </span>
          </Button>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <p className="text-gray-600">
            {isEditing ? 'Atualize os detalhes da receita' : 'Cadastre uma nova receita ou fórmula'}
          </p>
          
          {/* Unidade do produto gerado com checkboxes (visível apenas se não for subreceita) */}
          {!recipeForm.isSubProduct && (
            <div className="flex items-center space-x-6">
              <label className="text-sm font-medium text-gray-700">Unidade do Produto Gerado:</label>
              <div className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="unit-kg" 
                    checked={recipeForm.finalUnit === 'KG'}
                    onCheckedChange={() => setRecipeForm(prev => ({ ...prev, finalUnit: 'KG' }))}
                  />
                  <label htmlFor="unit-kg" className="text-sm cursor-pointer">Quilograma (KG)</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="unit-un" 
                    checked={recipeForm.finalUnit === 'UN'}
                    onCheckedChange={() => setRecipeForm(prev => ({ ...prev, finalUnit: 'UN' }))}
                  />
                  <label htmlFor="unit-un" className="text-sm cursor-pointer">Unidade (UN)</label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6 px-1">
        <div className="w-full">
          <Card className="mb-6">
            <div className="p-4">
              <h2 className="text-lg font-semibold text-bakery-brown mb-3">Informações Gerais</h2>
              
              <div className="flex items-center justify-end mb-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isSubProduct" 
                    checked={recipeForm.isSubProduct}
                    onCheckedChange={(checked) => handleCheckboxChange(checked, 'isSubProduct')}
                  />
                  <label 
                    htmlFor="isSubProduct" 
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    É um SubReceita
                  </label>
                </div>
              </div>
              
              {/* Primeira linha: Nome, Rendimento kg e Rendimento unidades */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
                <div className="md:col-span-6 space-y-1">
                  <label htmlFor="name" className="form-label text-sm">Nome da Receita <span className="text-red-500">*</span></label>
                  <Autocomplete
                    id="name"
                    name="name"
                    value={recipeForm.name}
                    onChange={handleInputChange}
                    required
                    className={`form-input h-9 ${fieldErrors.name ? 'border-red-500 ring-red-500' : ''}`}
                    suggestions={existingRecipes.map(recipe => recipe.name)}
                    onSelect={(value) => {
                      if (recipeForm.name !== value) {
                        setRecipeForm(prev => ({ ...prev, name: value }));
                        setFieldErrors(prev => ({ ...prev, name: false }));
                      }
                    }}
                  />
                </div>
                
                <div className="md:col-span-3 space-y-1">
                  <label htmlFor="yieldKg" className="form-label text-sm">Rendimento (kg) <span className="text-red-500">*</span></label>
                  <Input
                    id="yieldKg"
                    name="yieldKg"
                    type="text"
                    value={recipeForm.yieldKg}
                    onChange={handleInputChange}
                    required
                    placeholder="Ex: 2,5"
                    className={`form-input h-9 ${fieldErrors.yieldKg ? 'border-red-500 ring-red-500' : ''}`}
                  />
                </div>
                
                <div className="md:col-span-3 space-y-1">
                  <label htmlFor="yieldUnits" className="form-label text-sm">Rendimento (un.)</label>
                  <Input
                    id="yieldUnits"
                    name="yieldUnits"
                    type="number"
                    step="1"
                    min="0"
                    value={recipeForm.yieldUnits || ''}
                    onChange={handleInputChange}
                    className="form-input h-9"
                  />
                </div>
              </div>
              
              {/* Segunda linha: Código, Grupo e Subgrupo */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-4 space-y-1">
                  <label htmlFor="code" className="form-label text-sm">Código/Identificador</label>
                  <Input
                    id="code"
                    name="code"
                    value={recipeForm.isSubProduct ? 'SUB' : recipeForm.code}
                    onChange={handleInputChange}
                    className="form-input h-9"
                    disabled={recipeForm.isSubProduct}
                  />
                </div>
                
                <div className="md:col-span-4 space-y-1">
                  <label htmlFor="groupId" className="form-label text-sm">Grupo</label>
                  <select
                    id="groupId"
                    name="groupId"
                    value={recipeForm.groupId}
                    onChange={(e) => {
                      handleInputChange(e);
                      // Limpar subgrupo quando o grupo mudar
                      setRecipeForm(prev => ({ ...prev, subgroupId: '' }));
                    }}
                    className="w-full flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Selecione um grupo</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-4 space-y-1">
                  <label htmlFor="subgroupId" className="form-label text-sm">Subgrupo</label>
                  <select
                    id="subgroupId"
                    name="subgroupId"
                    value={recipeForm.subgroupId}
                    onChange={handleInputChange}
                    className="w-full flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!recipeForm.groupId}
                  >
                    <option value="">Selecione um subgrupo</option>
                    {filteredSubgroups.map(subgroup => (
                      <option key={subgroup.id} value={subgroup.id}>{subgroup.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b px-4 py-3 bg-gray-50">
                <TabsList className="grid w-full grid-cols-4 gap-1">
                  <TabsTrigger value="ingredients" className="px-2 py-2 text-sm font-medium">Ingredientes</TabsTrigger>
                  <TabsTrigger value="instructions" className="px-2 py-2 text-sm font-medium">Modo de Preparo</TabsTrigger>
                  <TabsTrigger value="media" className="px-2 py-2 text-sm font-medium">Mídia</TabsTrigger>
                  <TabsTrigger value="costs" className="px-2 py-2 text-sm font-medium">Precificação</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="ingredients" className="p-6 mt-0 relative">
                <div className="absolute right-6 top-6 z-10">
                  <Button 
                    variant="outline" 
                    className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                    onClick={handleNavigateToNewProduct}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar Nova Matéria Prima
                  </Button>
                </div>
                <div className="mb-6 border-b pb-6 mt-12">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-bakery-brown">Adicionar Ingrediente</h3>
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-3 mb-4 items-end">
                    {/* Etapa */}
                    <div className="flex-1 min-w-[110px] max-w-[140px]">
                      <label htmlFor="etapa" className="form-label">Etapa</label>
                      {/* Substituir o Select por um elemento select nativo para evitar problemas de DOM */}
                      <select
                        id="etapa"
                        name="etapa"
                        value={newIngredient.etapa ?? ''}
                        onChange={(e) => setNewIngredient(prev => ({ ...prev, etapa: e.target.value }))}
                        className="w-full flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Selecione a etapa (opcional)</option>
                        <option value="massa">Massa</option>
                        <option value="recheio">Recheio</option>
                        <option value="cobertura">Cobertura</option>
                        <option value="finalizacao">Finalização</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                    {/* Tipo */}
                    <div className="flex-1 min-w-[110px] max-w-[140px]">
                      <label htmlFor="ingredientType" className="form-label">Tipo *</label>
                      {/* Substituir o Select por um elemento select nativo para evitar problemas de DOM */}
                      <select
                        id="ingredientType"
                        name="ingredientType"
                        value={newIngredient.isSubRecipe ? 'sub-product' : 'raw-material'}
                        onChange={(e) => handleProductTypeChange(e.target.value)}
                        className="w-full flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="raw-material">Matéria Prima</option>
                        <option value="sub-product">SubReceita</option>
                      </select>
                    </div>
                    {/* Ingrediente */}
                    <div className="flex-[2_2_0%] min-w-[200px] max-w-[420px]">
                      <label htmlFor="productId" className="form-label">{newIngredient.isSubRecipe ? 'SubReceita *' : 'Ingrediente *'}</label>
                      {newIngredient.isSubRecipe ? (
                        <div className="relative">
                          <Input
                            type="text"
                            className="form-input h-9"
                            placeholder="Digite para buscar uma SubReceita"
                            value={newIngredient.productName || ''}
                            onChange={(e) => {
                              setNewIngredient(prev => ({
                                ...prev,
                                productName: e.target.value,
                                subRecipeId: null // Limpar o ID quando o usuário está digitando
                              }));
                            }}
                          />
                          {/* Mostrar o dropdown apenas quando o usuário digitar algo */}
                          {newIngredient.isSubRecipe && newIngredient.productName && !newIngredient.subRecipeId && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                              {(() => {
                                console.log('[RecipeForm] Filtrando subreceitas:', {
                                  subRecipesCount: subRecipes.length,
                                  searchTerm: newIngredient.productName,
                                  allSubRecipes: subRecipes.map(r => ({ id: r.id, name: r.name }))
                                });
                                const filteredSubRecipes = subRecipes.filter(r => {
                                  if (!newIngredient.productName || newIngredient.productName.trim() === '') {
                                    return true;
                                  }
                                  return r.name && r.name.toLowerCase().includes(newIngredient.productName.toLowerCase());
                                });
                                console.log('[RecipeForm] Subreceitas filtradas:', filteredSubRecipes.length);
                                if (filteredSubRecipes.length > 0) {
                                  return filteredSubRecipes.map(recipe => (
                                    <div
                                      key={recipe.id}
                                      className="px-4 py-2 cursor-pointer hover:bg-gray-100 flex justify-between items-center"
                                      onClick={() => {
                                        handleSubRecipeSelect(recipe.id);
                                        setNewIngredient(prev => ({
                                          ...prev,
                                          productName: recipe.name,
                                          subRecipeId: recipe.id
                                        }));
                                      }}
                                    >
                                      <span>{recipe.name}</span>
                                      <span className="text-gray-500">
                                        {recipe.cost_per_kg ? recipe.cost_per_kg.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + '/kg' : ''}
                                      </span>
                                    </div>
                                  ));
                                } else {
                                  return (
                                    <div className="px-4 py-2 text-gray-500">
                                      Nenhuma SubReceita encontrada
                                    </div>
                                  );
                                }
                              })()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative">
                          <Input
                            type="text"
                            className="form-input h-9"
                            placeholder="Digite para buscar uma matéria prima"
                            value={newIngredient.productName || ''}
                            onChange={(e) => {
                              const searchTerm = e.target.value;
                              setNewIngredient(prev => ({
                                ...prev,
                                productName: searchTerm,
                                productId: null // Limpar o ID quando o usuário está digitando
                              }));
                              
                              // Buscar produtos diretamente do banco de dados enquanto digita
                              if (searchTerm.trim() !== '' && activeCompany?.id) {
                                setLoading(true); // Mostrar indicador de carregamento
                                // Usar um timeout para implementar debounce
                                if (searchDebounceRef.current) {
                                  clearTimeout(searchDebounceRef.current);
                                }
                                
                                // Implementar debounce (300ms)
                                searchDebounceRef.current = setTimeout(() => {
                                  console.log('[RecipeForm] Buscando matérias-primas com termo:', searchTerm);
                                  
                                  // Tentar buscar com diferentes variações do termo para garantir resultados
                                  searchProductsByTerm(activeCompany.id, searchTerm, 'materia')
                                    .then(results => {
                                      console.log('[RecipeForm] Resultados da busca:', results.length);
                                      if (isMounted.current) {
                                        // Atualizar a lista local com os resultados da busca
                                        setProductSearchResults(results);
                                      }
                                    })
                                    .catch(error => {
                                      console.error('Erro ao buscar produtos:', error);
                                    })
                                    .finally(() => {
                                      if (isMounted.current) {
                                        setLoading(false);
                                      }
                                    });
                                }, 300); // Aguardar 300ms antes de fazer a busca
                              } else {
                                // Limpar resultados se o campo estiver vazio
                                setProductSearchResults([]);
                              }
                            }}
                          />
                          {/* Mostrar o dropdown quando o usuário digitar algo */}
                          {!newIngredient.isSubRecipe && newIngredient.productName && !newIngredient.productId && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                              {loading ? (
                                <div className="px-4 py-2 text-center text-gray-500">Buscando produtos...</div>
                              ) : (
                                (() => {
                                  console.log('[RecipeForm] Resultados da busca:', productSearchResults);
                                  console.log('[RecipeForm] Produtos disponíveis:', products.length);
                                  console.log('[RecipeForm] Estrutura dos produtos:');
                                  products.forEach((p, index) => {
                                    console.log(`Produto ${index + 1}:`, {
                                      id: p.id,
                                      name: p.name,
                                      product_type: p.product_type,
                                      raw_type: p.raw_type,
                                      product_type_id: p.product_type_id,
                                      product_types: p.product_types
                                    });
                                  });
                                  
                                  // Usar os resultados da busca do banco de dados ou filtrar a lista local
                                  // Primeiro verificar resultados da API, depois fazer filtragem local
                                  let materiasPrimas = [];
                                  
                                  if (productSearchResults.length > 0) {
                                    // Usar resultados da busca no banco
                                    materiasPrimas = productSearchResults;
                                    console.log('[RecipeForm] Usando resultados da API:', materiasPrimas.length);
                                  } else {
                                    // Filtrar localmente todos os produtos do tipo materia_prima
                                    materiasPrimas = products.filter(p => {
                                      // Verificar tanto pelo campo product_type quanto pelo raw_type
                                      const isMateriaPrima = 
                                        (p.product_type === 'materia_prima' || 
                                         p.raw_type?.includes('materia') || 
                                         (p.product_types?.name && p.product_types.name.includes('materia')));
                                        
                                      if (!isMateriaPrima) {
                                        return false;
                                      }
                                      
                                      // Só filtrar pelo nome se o usuário digitou algo
                                      return !newIngredient.productName || 
                                        (p.name && p.name.toLowerCase().includes(newIngredient.productName.toLowerCase()));
                                    });
                                    console.log('[RecipeForm] Usando filtragem local:', materiasPrimas.length);
                                  }
                                  
                                  console.log('[RecipeForm] Matérias primas encontradas:', materiasPrimas.length);
                                  
                                  if (materiasPrimas.length > 0) {
                                    return materiasPrimas.map(product => (
                                      <div
                                        key={product.id}
                                        className="px-4 py-2 cursor-pointer hover:bg-gray-100 flex justify-between items-center"
                                        onClick={() => {
                                          handleProductSelect(product.id);
                                          setNewIngredient(prev => ({
                                            ...prev,
                                            productName: product.name,
                                            productId: product.id
                                          }));
                                        }}
                                      >
                                        <span>{product.name} ({product.unit})</span>
                                        <span className="text-gray-500">
                                          {product.cost ? product.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}
                                        </span>
                                      </div>
                                    ));
                                  } else {
                                    return (
                                      <div className="px-4 py-2 text-gray-500">
                                        Nenhuma matéria-prima encontrada
                                      </div>
                                    );
                                  }
                                })()
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Quantidade */}
                    <div className="flex-1 min-w-[110px] max-w-[160px]">
                      <label htmlFor="quantity" className="form-label">Quantidade *</label>
                      <Input
                        id="quantity"
                        name="quantity"
                        type="text"
                        value={newIngredient.quantity || ''}
                        onChange={handleIngredientChange}
                        placeholder="Ex: 0,750"
                        className={`form-input h-9 ${fieldErrors.quantity ? 'border-red-500 ring-red-500' : ''}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault(); // evita submit do form
                            addIngredient();
                          }
                        }}
                      />
                    </div>
                    {/* Botão Adicionar */}
                    <div className="flex-0 mt-6">
                      <Button 
                        onClick={addIngredient} 
                        className="bg-bakery-amber hover:bg-bakery-brown text-white h-9"
                        disabled={(!newIngredient.productId && !newIngredient.subRecipeId) || !newIngredient.quantity}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-bakery-brown">Lista de Ingredientes</h3>
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center">
                    <List className="h-4 w-4 mr-2" />
                    <span className="font-semibold">{ingredients.length} ingredientes</span>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <Table className="[&_tr]:h-auto [&_td]:py-1 [&_th]:py-1 text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead style={{ width: '15ch', minWidth: '10ch' }}>Etapa</TableHead>
                        <TableHead style={{ width: '15ch', minWidth: '10ch' }}>Tipo</TableHead>
                        <TableHead style={{ minWidth: '180px' }}>Ingrediente</TableHead>
                        <TableHead style={{ width: '10ch', minWidth: '8ch' }}>Qtd.</TableHead>
                        <TableHead style={{ width: '8ch' }}>Un.</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ingredients.length > 0 ? (
                        ingredients.map((ing, idx) => (
                          <TableRow key={ing.id}>
                            <TableCell className="truncate" title={ing.etapa || ''}>{ing.etapa ? ing.etapa.charAt(0).toUpperCase() + ing.etapa.slice(1) : '-'}</TableCell>
                            <TableCell className="truncate">{ing.isSubRecipe ? 'SubReceita' : 'Matéria Prima'}</TableCell>
                            <TableCell className="font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-xs" style={{ maxWidth: 260 }}>{ing.productName}</TableCell>
                            <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{ing.quantity.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</TableCell>
                            <TableCell>{ing.unit}</TableCell>
                            <TableCell className="flex flex-row gap-1 items-center justify-center">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-gray-500 hover:text-bakery-brown p-1 h-6 w-6"
                                onClick={() => moveIngredientUp(idx)}
                                disabled={idx === 0}
                                title="Mover para cima"
                              >
                                <span style={{fontSize: '1em', lineHeight: 1}}>&uarr;</span>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-gray-500 hover:text-bakery-brown p-1 h-6 w-6"
                                onClick={() => moveIngredientDown(idx)}
                                disabled={idx === ingredients.length - 1}
                                title="Mover para baixo"
                              >
                                <span style={{fontSize: '1em', lineHeight: 1}}>&darr;</span>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-500 hover:text-red-700 h-6 w-6" 
                                onClick={() => removeIngredient(ing.id)}
                                title="Remover"
                              >
                                <Trash size={14} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                            Nenhum ingrediente adicionado.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Exibir a soma total dos pesos dos ingredientes */}
                {ingredients.length > 0 && (
                  <div className="mt-4 pt-4 border-t text-right">
                    <p className="text-lg font-semibold text-gray-700">
                      Peso Total dos Ingredientes: 
                      <span className="text-bakery-brown ml-2">
                        {ingredients.reduce((sum, ing) => sum + ing.quantity, 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg
                      </span>
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="instructions" className="p-6 mt-0">
                <div className="space-y-4">
                  <label htmlFor="instructions" className="form-label">Modo de Preparo</label>
                  <Textarea
                    id="instructions"
                    name="instructions"
                    value={recipeForm.instructions}
                    onChange={handleInputChange}
                    className="min-h-[300px]"
                    placeholder="Descreva detalhadamente o modo de preparo da receita..."
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="media" className="p-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="form-label">Foto do Produto Final</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                      <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 mb-2">
                        Arraste uma imagem aqui ou clique para fazer upload
                      </p>
                      <p className="text-xs text-gray-500">(Formatos: JPG, PNG - Máx: 5MB)</p>
                      <Input
                        id="photoUrl"
                        name="photoUrl"
                        type="file"
                        accept="image/*"
                        className="hidden"
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4"
                        onClick={() => document.getElementById('photoUrl')?.click()}
                      >
                        Selecionar Arquivo
                      </Button>
                    </div>
                  </div>
                                    <div className="space-y-4">
                      <label className="form-label">GIF do Processo</label>
                      <p className="text-xs text-gray-500 mb-1">
                        (O GIF será usado para visualização na tela de receitas em tablet)
                      </p>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                        {recipeForm.gifUrl ? (
                          <div className="relative w-full">
                            <img 
                              src={recipeForm.gifUrl} 
                              alt="GIF Preview" 
                              className="max-h-48 mx-auto mb-4 rounded-md"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => handleRemoveImage('gif')}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600 mb-2">
                              Arraste um GIF aqui ou clique para fazer upload
                            </p>
                            <p className="text-xs text-gray-500 mb-2">(Formato: GIF - Máx: 10MB)</p>
                            <Input
                              id="gifUrl"
                              name="gifUrl"
                              type="file"
                              accept="image/gif"
                              className="hidden"
                              onChange={handleGifUpload}
                            />
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-2"
                              onClick={() => document.getElementById('gifUrl')?.click()}
                            >
                              Selecionar GIF
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                </div>
              </TabsContent>
              
              <TabsContent value="costs" className="p-6 mt-0">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-bakery-brown">Análise de Custo</h2>
                  <div>
                    <Button 
                      onClick={handleCalculate}
                      variant="outline" 
                      className="flex items-center"
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      Recalcular Precificação
                    </Button>
                  </div>
                </div>
                
                {/* Seção 2: Resumo Financeiro e de Rendimento da Receita */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
                  <div className="p-3 border-r border-gray-200">
                    <h3 className="text-sm text-gray-600 mb-1">Peso Total dos Ingredientes</h3>
                    <p className="text-xl font-bold text-bakery-brown">
                      {ingredients.reduce((sum, ing) => sum + ing.quantity, 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg
                    </p>
                  </div>
                  
                  <div className="p-3 border-r border-gray-200">
                    <h3 className="text-sm text-gray-600 mb-1">Custo Total da Receita</h3>
                    <p className="text-xl font-bold text-bakery-brown">
                      {totalIngredientsCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  
                  <div className="p-3">
                    <h3 className="text-sm text-gray-600 mb-1">Rendimento</h3>
                    <p className="text-xl font-bold text-bakery-brown">
                      {(yieldKgForDisplay !== null && !isNaN(yieldKgForDisplay)) ? yieldKgForDisplay.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '0,000'} kg
                      {recipeForm.yieldUnits > 0 && ` / ${recipeForm.yieldUnits} un.`}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-md">
                    <h3 className="text-sm text-gray-600 mb-1">Custo por kg</h3>
                    <p className="text-2xl font-bold text-bakery-brown">
                      {costPerKg.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-md">
                    <h3 className="text-sm text-gray-600 mb-1">Custo por Unidade</h3>
                    <p className="text-2xl font-bold text-bakery-brown">
                      {recipeForm.yieldUnits > 0 
                        ? costPerUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : "N/A"}
                    </p>
                  </div>
                </div>
                
                {/* Seção 1: Detalhamento de Custos por Ingrediente */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-bakery-brown mb-4">Detalhamento de Precificação por Ingrediente</h3>
                  
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ingrediente</TableHead>
                          <TableHead className="text-right">Quantidade</TableHead>
                          <TableHead>Unidade</TableHead>
                          <TableHead className="text-right">Custo Unitário</TableHead>
                          <TableHead className="text-right">Custo Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ingredients.length > 0 ? (
                          ingredients.map((ing) => (
                            <TableRow key={ing.id}>
                              <TableCell className="font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-xs" style={{ maxWidth: 260 }}>{ing.productName}</TableCell>
                              <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{ing.quantity.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</TableCell>
                              <TableCell>{ing.unit}</TableCell>
                              <TableCell className="text-right">{ing.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                              <TableCell className="text-right font-medium">{ing.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                              Nenhum ingrediente adicionado.
                            </TableCell>
                          </TableRow>
                        )}
                        {ingredients.length > 0 && (
                          <TableRow className="bg-gray-50">
                            <TableCell colSpan={4} className="font-bold text-right">Total:</TableCell>
                            <TableCell className="text-right font-bold">{totalIngredientsCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                
                {/* Análise Financeira */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-bakery-brown mb-4">Análise Financeira</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="sellingPrice" className="form-label">Preço de Venda (R$)</label>
                      <Input
                        id="sellingPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={sellingPrice || ''}
                        onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                        className="max-w-xs"
                      />
                    </div>
                    
                    {sellingPrice > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="p-4 bg-green-50 rounded-md">
                          <h4 className="text-sm text-gray-600 mb-1">Margem de Lucro</h4>
                          <p className="text-xl font-bold text-green-600">
                            {((sellingPrice - costPerUnit) / sellingPrice * 100).toFixed(2)}%
                          </p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-md">
                          <h4 className="text-sm text-gray-600 mb-1">Lucro por Unidade</h4>
                          <p className="text-xl font-bold text-green-600">
                            {(sellingPrice - costPerUnit).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  )
}
