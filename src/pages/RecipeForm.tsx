import { useState, useEffect, useMemo } from "react";
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
import { getProducts, Product } from "@/services/productService";
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
  const { activeCompany, loading: authLoading } = useAuth();
  // ... outros hooks e estados

  // Novo: tipo do produto gerado por receita
  const [productTypeForForm, setProductTypeForForm] = useState<'receita' | 'subreceita'>('receita');

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

  const handleSave = async () => {
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
    
    setLoading(true);

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
        const { ingredients: currentIngredients } = await getRecipeWithIngredients(id);
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
      setLoading(false);
    }
  };

  console.log("Renderizando RecipeForm com estado:", recipeForm); // <-- LOG DE DEPURAÇÃO
  return (
    <div className="animate-fade-in">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/recipes')} 
          className="mr-4"
          disabled={loading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <div>
          <h1 className="text-2xl font-bold mb-6 flex items-center gap-3">
        {isEditing ? (
          <><List className="w-6 h-6" /> Editar Receita</>
        ) : (
          <><Plus className="w-6 h-6" /> Nova Receita</>
        )}
      </h1>
      {/* Dropdown de unidade do produto gerado (visível apenas se não for subreceita) */}
      {!recipeForm.isSubProduct && (
        <div className="mb-4">
          <label htmlFor="finalUnit" className="block text-sm font-medium text-gray-700 mb-1">Unidade do Produto Gerado</label>
          <Select
            value={recipeForm.finalUnit}
            onValueChange={(value: 'UN' | 'KG') => setRecipeForm(prev => ({ ...prev, finalUnit: value }))}
          >
            <SelectTrigger id="finalUnit">
              <SelectValue placeholder="Selecione a unidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UN">Unidade (UN)</SelectItem>
              <SelectItem value="KG">Quilograma (KG)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
          <p className="text-gray-600">
            {isEditing ? 'Atualize os detalhes da receita' : 'Cadastre uma nova receita ou fórmula'}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-bakery-brown mb-4">Informações Gerais</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="name" className="form-label">Nome da Receita <span className="text-red-500">*</span></label>
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
                  <Autocomplete
                    id="name"
                    name="name"
                    value={recipeForm.name}
                    onChange={handleInputChange}
                    required
                    className={`form-input ${fieldErrors.name ? 'border-red-500 ring-red-500' : ''}`}
                    suggestions={existingRecipes.map(recipe => recipe.name)}
                    //onSelect={(value) => {
                    //  // Only update if the value is different from current
                    //  if (value !== recipeForm.name) {
                    //    setRecipeForm(prev => ({
                    //      ...prev,
                    //      name: value
                    //    }));
                    //  }
                    //}}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="code" className="form-label">Código/Identificador</label>
                  <Input
                    id="code"
                    name="code"
                    value={recipeForm.isSubProduct ? 'SUB' : recipeForm.code}
                    onChange={handleInputChange}
                    className="form-input"
                    disabled={recipeForm.isSubProduct}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="yieldKg" className="form-label">Rendimento (kg) <span className="text-red-500">*</span></label>
                  <Input
                    id="yieldKg"
                    name="yieldKg"
                    type="text" // Permitir qualquer caractere
                    value={recipeForm.yieldKg} // Usar diretamente a string do estado
                    onChange={handleInputChange}
                    required
                    placeholder="Ex: 2,5"
                    className={`form-input ${fieldErrors.yieldKg ? 'border-red-500 ring-red-500' : ''}`}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="yieldUnits" className="form-label">Rendimento (unidades)</label>
                  <Input
                    id="yieldUnits"
                    name="yieldUnits"
                    type="number"
                    step="1"
                    min="0"
                    value={recipeForm.yieldUnits || ''}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="group_id" className="form-label">Grupo</label>
                  <select
                    id="group_id"
                    name="group_id"
                    value={recipeForm.group_id || ''}
                    onChange={(e) => {
                      handleInputChange(e);
                    }}
                    className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Selecione um grupo</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="subgroup_id" className="form-label">Subgrupo</label>
                  <select
                    id="subgroup_id"
                    name="subgroup_id"
                    value={recipeForm.subgroup_id || ''}
                    onChange={handleInputChange}
                    disabled={!recipeForm.group_id}
                    className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
          
          <Card>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b px-6 py-3">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                  <TabsTrigger value="ingredients">Ingredientes</TabsTrigger>
                  <TabsTrigger value="instructions">Modo de Preparo</TabsTrigger>
                  <TabsTrigger value="media">Mídia</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="ingredients" className="p-6 mt-0">
                <div className="mb-6 border-b pb-6">
                  <h3 className="text-lg font-medium text-bakery-brown mb-4">Adicionar Ingrediente</h3>
                  
                  <div className="flex flex-col md:flex-row gap-3 mb-4 items-end">
                    {/* Etapa */}
                    <div className="flex-1 min-w-[110px] max-w-[140px]">
                      <label htmlFor="etapa" className="form-label">Etapa</label>
                      <Select
                        name="etapa"
                        value={newIngredient.etapa ?? ''}
                        onValueChange={value => setNewIngredient(prev => ({ ...prev, etapa: value }))}
                      >
                        <SelectTrigger className="form-input">
                          <SelectValue placeholder="Selecione a etapa (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="massa">Massa</SelectItem>
                          <SelectItem value="recheio">Recheio</SelectItem>
                          <SelectItem value="cobertura">Cobertura</SelectItem>
                          <SelectItem value="finalizacao">Finalização</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Tipo */}
                    <div className="flex-1 min-w-[110px] max-w-[140px]">
                      <label htmlFor="ingredientType" className="form-label">Tipo *</label>
                      <Select 
                        value={newIngredient.isSubRecipe ? 'sub-product' : 'raw-material'} 
                        onValueChange={handleProductTypeChange}
                      >
                        <SelectTrigger className="form-input">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="raw-material">Matéria Prima</SelectItem>
                          <SelectItem value="sub-product">SubReceita</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Ingrediente */}
                    <div className="flex-[2_2_0%] min-w-[200px] max-w-[420px]">
                      <label htmlFor="productId" className="form-label">{newIngredient.isSubRecipe ? 'SubReceita *' : 'Ingrediente *'}</label>
                      {newIngredient.isSubRecipe ? (
                        <Select 
                          value={newIngredient.subRecipeId || ''} 
                          onValueChange={handleSubRecipeSelect}
                        >
                          <SelectTrigger className="form-input">
                            <SelectValue placeholder="Selecione uma SubReceita" />
                          </SelectTrigger>
                          <SelectContent>
                            {subRecipes.length > 0 ? (
                              subRecipes.map(recipe => (
                                <SelectItem key={recipe.id} value={recipe.id}>
                                  {recipe.name} (R$ {recipe.cost_per_kg?.toFixed(2)}/kg)
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>Nenhuma SubReceita disponível</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select 
                          value={newIngredient.productId || ''} 
                          onValueChange={handleProductSelect}
                        >
                          <SelectTrigger className="form-input">
                            <SelectValue placeholder="Selecione uma matéria prima" />
                          </SelectTrigger>
                          <SelectContent>
                            {(() => {
                              const materiasPrimas = products.filter(p => p.product_type === 'materia_prima');
                              if (materiasPrimas.length > 0) {
                                return materiasPrimas.map(product => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name} ({product.unit}) {product.cost ? `- ${product.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}
                                  </SelectItem>
                                ));
                              } else {
                                return <SelectItem value="none" disabled>Nenhuma matéria prima disponível</SelectItem>;
                              }
                            })()}
                          </SelectContent>
                        </Select>
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
                        className={`form-input ${fieldErrors.quantity ? 'border-red-500 ring-red-500' : ''}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault(); // evita submit do form
                            addIngredient();
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      onClick={addIngredient} 
                      className="bg-bakery-amber hover:bg-bakery-brown text-white"
                      disabled={(!newIngredient.productId && !newIngredient.subRecipeId) || !newIngredient.quantity}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead style={{ width: '15ch', minWidth: '10ch' }}>Etapa</TableHead>
                        <TableHead style={{ width: '15ch', minWidth: '10ch' }}>Tipo</TableHead>
                        <TableHead style={{ minWidth: '180px' }}>Ingrediente</TableHead>
                        <TableHead style={{ width: '10ch', minWidth: '8ch' }}>Qtd.</TableHead>
                        <TableHead style={{ width: '8ch' }}>Un.</TableHead>
                        <TableHead style={{ width: '10ch' }}>Custo Unit.</TableHead>
                        <TableHead style={{ width: '12ch' }}>Custo Total</TableHead>
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
                            <TableCell>R$ {ing.cost.toFixed(2)}</TableCell>
                            <TableCell>R$ {ing.totalCost.toFixed(2)}</TableCell>
                            <TableCell className="flex flex-col gap-1 items-center">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-gray-500 hover:text-bakery-brown p-1"
                                onClick={() => moveIngredientUp(idx)}
                                disabled={idx === 0}
                                title="Mover para cima"
                              >
                                <span style={{fontSize: '1.2em', lineHeight: 1}}>&uarr;</span>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-gray-500 hover:text-bakery-brown p-1"
                                onClick={() => moveIngredientDown(idx)}
                                disabled={idx === ingredients.length - 1}
                                title="Mover para baixo"
                              >
                                <span style={{fontSize: '1.2em', lineHeight: 1}}>&darr;</span>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-500 hover:text-red-700 mt-1" 
                                onClick={() => removeIngredient(ing.id)}
                                title="Remover"
                              >
                                <Trash size={16} />
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
            </Tabs>
          </Card>
        </div>
        
        <div>
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-bakery-brown mb-4">Análise de Custo</h2>
              
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-sm text-gray-600 mb-1">Custo Total dos Ingredientes</h3>
                  <p className="text-2xl font-bold text-bakery-brown">
                    {totalIngredientsCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                
                <div className="border-b pb-4">
                  <h3 className="text-sm text-gray-600 mb-1">Custo por kg</h3>
                  <p className="text-2xl font-bold text-bakery-brown">
                    {costPerKg.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                
                <div className="pb-4">
                  <h3 className="text-sm text-gray-600 mb-1">Custo por Unidade</h3>
                  <p className="text-2xl font-bold text-bakery-brown">
                    {recipeForm.yieldUnits > 0 
                      ? `${costPerUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` 
                      : 'N/A'}
                  </p>
                </div>
                
                <Button 
                  onClick={handleCalculate}
                  variant="outline" 
                  className="w-full mb-3"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Recalcular Custos
                </Button>
                
                <Button 
                  onClick={handleSave}
                  className="w-full bg-bakery-amber hover:bg-bakery-brown text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isEditing ? 'Atualizando...' : 'Salvando...'}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isEditing ? 'Atualizar Receita' : 'Salvar Receita'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
