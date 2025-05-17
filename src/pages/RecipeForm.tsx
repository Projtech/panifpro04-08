import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  ProductType 
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

export default function RecipeForm() {
  const { activeCompany, user, loading: authLoading } = useAuth(); // Garantir que activeCompany é obtido do contexto
  // ... outros hooks e estados

  // Ref para controlar se o componente está montado
  const isMounted = useRef(true);
  
  // Novo: tipo do produto gerado por receita
  const [productTypeForForm, setProductTypeForForm] = useState<'receita' | 'subreceita'>('receita');
  
  // Estado para armazenar a origem da navegação (para retorno após cadastro de produto)
  const [returnToRecipe, setReturnToRecipe] = useState<boolean>(false);
  
  // Obter dados da localização (para verificar se estamos retornando do cadastro de produto)
  const location = useLocation();
  
  // Configurar e limpar o ref de montagem
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  function moveIngredientUp(idx: number) {
    setIngredients(prev => {
      if (idx <= 0) return prev;
      const newArr = [...prev];
      [newArr[idx - 1], newArr[idx]] = [newArr[idx], newArr[idx - 1]];
      return newArr;
    });
  }

  function moveIngredientDown(idx: number) {
    setIngredients(prev => {
      if (idx >= prev.length - 1) return prev;
      const newArr = [...prev];
      [newArr[idx], newArr[idx + 1]] = [newArr[idx + 1], newArr[idx]];
      return newArr;
    });
  }

  const { id } = useParams();
  const isEditing = !!id;
  
  const [activeTab, setActiveTab] = useState('ingredients');
  const [loading, setLoading] = useState(false);
  const [existingRecipes, setExistingRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [subRecipes, setSubRecipes] = useState<Recipe[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [filteredSubgroups, setFilteredSubgroups] = useState<Subgroup[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  
  // Estado para o modal de nova matéria-prima
  const [newProductDialogOpen, setNewProductDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    unit: 'KG',
    cost: '',
    supplier: '',
    min_stock: '',
    current_stock: ''
  });
  
  const [recipeForm, setRecipeForm] = useState({
    name: '',
    code: '',
    yieldKg: '', // Mantido como string
    yieldUnits: 0,
    instructions: '',
    photoUrl: '',
    gifUrl: '',
    isSubProduct: false,
    group_id: null as string | null,
    subgroup_id: null as string | null,
    finalUnit: 'UN' as 'UN' | 'KG', // Unidade final do produto gerado
  });
  
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [newIngredient, setNewIngredient] = useState<Partial<Omit<Ingredient, 'quantity'>> & { quantity: string }>({
    productId: null,
    subRecipeId: null,
    isSubRecipe: false,
    quantity: '', // Mantido como string
    etapa: null,
  });
  
  const navigate = useNavigate();
  
  // Verificar se estamos retornando do cadastro de produto
  useEffect(() => {
    // Verificar se há state na localização indicando retorno do cadastro de produto
    if (location.state && location.state.fromProductCreation) {
      // Recuperar dados da receita do localStorage
      const savedRecipeData = localStorage.getItem('temp_recipe_data');
      if (savedRecipeData) {
        try {
          const parsedData = JSON.parse(savedRecipeData);
          // Restaurar dados do formulário
          setRecipeForm(parsedData.recipeForm || recipeForm);
          setIngredients(parsedData.ingredients || ingredients);
          // Limpar dados temporários
          localStorage.removeItem('temp_recipe_data');
          // Exibir mensagem de sucesso
          if (location.state.newProductId && location.state.newProductName) {
            toast.success(`Matéria-prima "${location.state.newProductName}" cadastrada com sucesso!`);
            // Selecionar automaticamente o produto recém-criado
            if (location.state.newProductId) {
              handleProductSelect(location.state.newProductId);
            }
          }
        } catch (error) {
          console.error("Erro ao restaurar dados da receita:", error);
        }
      }
    }
  }, [location]);
  
  // Fetch products and sub-recipes on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (authLoading || !activeCompany?.id) {
          toast.error("Empresa ativa não carregada. Tente novamente mais tarde.");
          setLoading(false);
          return;
        }
        const productsData = await getProducts(activeCompany.id);
        const recipesData = await getRecipes(activeCompany.id);
        const groupsData = await getGroups(activeCompany.id);
        const subgroupsData = await getSubgroups(activeCompany.id);
        
        setProducts(productsData);
        setSubRecipes(recipesData.filter(recipe => recipe.code === 'SUB'));
        setExistingRecipes(recipesData);
        setGroups(groupsData);
        setSubgroups(subgroupsData);
        
        // If editing, load recipe data
        if (isEditing && id) {
          if (!activeCompany?.id) {
            toast.error("Empresa ativa não carregada. Tente novamente mais tarde.");
            setLoading(false);
            return;
          }
          const { recipe, ingredients: recipeIngredients } = await getRecipeWithIngredients(id, activeCompany.id);
          if (recipe) {
            // Definir tipo do produto gerado
            setProductTypeForForm(recipe.code === 'SUB' ? 'subreceita' : 'receita');
            // Load recipe details
            setRecipeForm({
              name: recipe.name,
              code: recipe.code || '',
              yieldKg: recipe.yield_kg?.toString().replace('.', ',') || '', // Converter número do backend para string com vírgula
              yieldUnits: recipe.yield_units || 0,
              instructions: recipe.instructions || '',
              photoUrl: recipe.photo_url || '',
              gifUrl: recipe.gif_url || '',
              isSubProduct: recipe.code === 'SUB',
              group_id: recipe.group_id,
              subgroup_id: recipe.subgroup_id,
              finalUnit: (recipe.yield_units && recipe.yield_units > 0) ? 'UN' : 'KG',
            });
            
            // Transform ingredients to match our front-end ingredient structure
            const formattedIngredients = recipeIngredients.map(ing => ({
              id: ing.id || `temp-${Date.now()}-${Math.random()}`,
              productId: ing.is_sub_recipe ? null : ing.product_id,
              productName: ing.is_sub_recipe 
                ? (ing.sub_recipe ? ing.sub_recipe.name : 'Sub-receita')
                : (ing.product ? ing.product.name : 'Produto'),
              isSubRecipe: ing.is_sub_recipe,
              subRecipeId: ing.is_sub_recipe ? ing.sub_recipe_id : null,
              quantity: ing.quantity,
              unit: ing.unit,
              cost: ing.cost,
              totalCost: ing.total_cost,
              etapa: ing.etapa,
            }));
            
            setIngredients(formattedIngredients);
          } else {
            toast.error("Receita não encontrada");
            navigate('/recipes');
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Erro ao carregar produtos e receitas");
      } finally {
        setLoading(false);
      }
    };

    // Definir tipo padrão ao criar nova receita
    if (!isEditing) {
      setProductTypeForForm('receita');
    }
    
    fetchData();
  }, [id, isEditing, navigate]);
  
  // Calculate total cost and costs per kg/unit
  const totalIngredientsCost = ingredients.reduce((sum, ing) => sum + ing.totalCost, 0);
  const yieldKgForDisplay = parseDecimalBR(recipeForm.yieldKg); // Parse string para display
  const costPerKg = (yieldKgForDisplay && yieldKgForDisplay > 0) ? totalIngredientsCost / yieldKgForDisplay : 0;
  const costPerUnit = recipeForm.yieldUnits > 0 ? totalIngredientsCost / recipeForm.yieldUnits : 0;
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  
  // Filtrar subgrupos com base no grupo selecionado
  useEffect(() => {
    if (recipeForm.group_id) {
      const filtered = subgroups.filter(subgroup => subgroup.group_id === recipeForm.group_id);
      setFilteredSubgroups(filtered);
      
      // Se o subgrupo atual não pertence ao grupo selecionado, resetar
      if (recipeForm.subgroup_id) {
        const belongsToGroup = filtered.some(sg => sg.id === recipeForm.subgroup_id);
        if (!belongsToGroup) {
          setRecipeForm(prev => ({ ...prev, subgroup_id: null }));
        }
      }
    } else {
      setFilteredSubgroups([]);
      setRecipeForm(prev => ({ ...prev, subgroup_id: null }));
    }
  }, [recipeForm.group_id, subgroups]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log(`handleInputChange - Name: ${name}, Value: ${value}`); // <-- LOG DE DEPURAÇÃO
    // Apenas atualiza o estado com o valor string do input
    // A conversão/validação será feita no handleSave
    setRecipeForm(prev => ({ 
      ...prev, 
      [name]: value
    }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setRecipeForm(prev => ({ 
      ...prev, 
      isSubProduct: checked,
      code: checked ? 'SUB' : ''
    }));
  };
  
  const handleIngredientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Apenas atualiza o estado com o valor string do input
    // A conversão/validação será feita no addIngredient
    setNewIngredient(prev => ({ 
      ...prev, 
      [name]: value
    }));
  };


  const handleProductTypeChange = (type: string) => {
    // Reset product and sub-recipe selections, mas mantém etapa!
    setNewIngredient(prev => ({
      ...prev,
      productId: null,
      subRecipeId: null,
      isSubRecipe: type === 'sub-product',
      // etapa: prev.etapa // mantém o valor já escolhido
    }));
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
      productName: newIngredient.productName!,
      isSubRecipe: newIngredient.isSubRecipe!,
      quantity: quantityNum, // Usar o número validado
      unit: newIngredient.unit!,
      cost: newIngredient.cost!,
      totalCost,
      etapa: newIngredient.etapa,
    };
    
    setIngredients([...ingredients, ingredientToAdd]);
    
    // Reset ingredient form but keep isSubRecipe state
    setNewIngredient({
      productId: null,
      subRecipeId: null,
      isSubRecipe: newIngredient.isSubRecipe,
      quantity: '' // Resetar para string vazia
    });
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
        code: recipeForm.isSubProduct ? 'SUB' : (recipeForm.code || null),
        yield_kg: yieldKgNum!, // Usar o número validado!
        yield_units: recipeForm.yieldUnits || null,
        instructions: recipeForm.instructions || null,
        photo_url: recipeForm.photoUrl || null,
        gif_url: recipeForm.gifUrl || null,
        cost_per_kg: costPerKg,
        cost_per_unit: costPerUnit,
        group_id: recipeForm.group_id,
        subgroup_id: recipeForm.subgroup_id,
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

  console.log("Renderizando RecipeForm com estado:", recipeForm); // <-- LOG DE DEPURAÇÃO
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
                    onCheckedChange={handleCheckboxChange}
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
                  <label htmlFor="group_id" className="form-label text-sm">Grupo</label>
                  <select
                    id="group_id"
                    name="group_id"
                    value={recipeForm.group_id || ''}
                    onChange={(e) => {
                      handleInputChange(e);
                    }}
                    className="w-full flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Selecione um grupo</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-4 space-y-1">
                  <label htmlFor="subgroup_id" className="form-label text-sm">Subgrupo</label>
                  <select
                    id="subgroup_id"
                    name="subgroup_id"
                    value={recipeForm.subgroup_id || ''}
                    onChange={handleInputChange}
                    disabled={!recipeForm.group_id}
                    className="w-full flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Selecione um subgrupo</option>
                    {filteredSubgroups.map((subgroup) => (
                      <option key={subgroup.id} value={subgroup.id}>
                        {subgroup.name}
                      </option>
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
                          {newIngredient.productName && !newIngredient.subRecipeId && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                              {(() => {
                                const filteredSubRecipes = subRecipes.filter(r => 
                                  r.name.toLowerCase().includes(newIngredient.productName?.toLowerCase() || '')
                                );
                                
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
                              setNewIngredient(prev => ({
                                ...prev,
                                productName: e.target.value,
                                productId: null // Limpar o ID quando o usuário está digitando
                              }));
                            }}
                          />
                          {newIngredient.productName && !newIngredient.productId && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                              {(() => {
                                const materiasPrimas = products.filter(p => 
                                  p.product_type === 'materia_prima' && 
                                  p.name.toLowerCase().includes(newIngredient.productName?.toLowerCase() || '')
                                );
                                
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
                                      Nenhuma matéria prima encontrada
                                    </div>
                                  );
                                }
                              })()}
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
                      <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 mb-2">
                        Arraste um GIF aqui ou clique para fazer upload
                      </p>
                      <p className="text-xs text-gray-500">(Formato: GIF - Máx: 10MB)</p>
                      <Input
                        id="gifUrl"
                        name="gifUrl"
                        type="file"
                        accept="image/gif"
                        className="hidden"
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4"
                        onClick={() => document.getElementById('gifUrl')?.click()}
                      >
                        Selecionar Arquivo
                      </Button>
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
