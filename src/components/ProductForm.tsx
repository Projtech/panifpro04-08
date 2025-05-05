import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Info, ArrowLeft, Save, Calculator, Trash, List, Plus, UploadCloud } from 'lucide-react'; // Added missing icons if needed by JSX
import { findSimilarProductsByName } from '@/services/productService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { parseDecimalBR } from '@/lib/numberUtils';
// Type Imports
import { Database } from '@/integrations/supabase/types';
import { Group, Subgroup } from '@/services/groupService'; // Assuming these types exist and are correct
import { Product as ProductTypeFromService, ProductType } from '@/services/productService'; // Renamed to avoid conflict
import { useNavigate, useParams } from "react-router-dom"; // Added useNavigate/useParams if used

// Define Product type from Supabase schema - Use this if aligned with DB
type ProductSchema = Database['public']['Tables']['products']['Row'];

// Define a interface para os dados do formulário, baseada na análise e correções
// Use string para IDs de grupo/subgrupo para compatibilidade com Select
export interface ProductFormData {
  id?: string; // ID can be string (UUID)
  name: string;
  sku: string | null;
  unit: string; // 'UN' ou 'Kg'
  supplier: string | null;
  cost: number | null;
  current_stock: number | null;
  min_stock: number | null; // Added based on DB schema/previous discussion
  group_id: string | null; // Store as string
  subgroup_id: string | null; // Store as string
  kg_weight: number | null;
  unit_price: number | null;
  unit_weight: number | null;
  recipe_id: string | null; // Assuming recipe ID is UUID (string)
  product_type: ProductType | null; // Use corrected type from productService
  ativo?: boolean;
  company_id: string | null; // Assuming company ID is UUID (string)
  // Campos de dias da semana (booleanos)
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  all_days: boolean;
  code?: string | null; // Added based on DB schema
};

// Interface para os dados que serão enviados via onSubmit (convertendo IDs)
export interface SubmissionData extends Omit<ProductFormData, 'group_id' | 'subgroup_id' | 'company_id' | 'recipe_id'> {
  group_id: string | null; // Keep as string if service expects string UUID
  subgroup_id: string | null; // Keep as string if service expects string UUID
  company_id: string; // Ensure it's not null for submission
  recipe_id: string | null;
};

export interface ProductFormProps {
  initialData?: Partial<ProductFormData> | null; // Allow partial for creation
  onSubmit: (data: SubmissionData) => Promise<void>; // Use SubmissionData type
  onCancel: () => void;
  isLoading: boolean;
  isEditMode: boolean;
  groups: Group[]; // Assume Group has { id: string; name: string; ... }
  subgroups: Subgroup[]; // Assume Subgroup has { id: string; name: string; group_id: string; ... }
  forceProductType?: ProductType; // NOVO: força o tipo de produto (string para aceitar 'raw_material')
}

// Helper to safely convert value to number or keep null/undefined
const toNumberOrNull = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null;
  let num: number;
  if (typeof value === 'string') {
    const cleanedValue = value.replace(/R\$\s?/, '').replace(/\./g, '').replace(',', '.');
    num = Number(cleanedValue);
  } else {
    num = Number(value);
  }
  return isNaN(num) ? null : num;
};

// Helper para converter string/number/boolean para boolean
const toBoolean = (value: any): boolean => {
    if (typeof value === 'boolean') return value;
    if (value === null || value === undefined) return false;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        return lowerValue === 'true' || lowerValue === '1';
    }
    return false; // Default to false for other types
};

const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  isEditMode,
  groups,
  subgroups,
  forceProductType
}) => {

  const { activeCompany } = useAuth();
  const navigate = useNavigate(); // Assuming navigation might be needed

  // Constantes definidas uma vez
  const weekdays = [
    { key: 'monday' as keyof ProductFormData, label: 'Seg' },
    { key: 'tuesday' as keyof ProductFormData, label: 'Ter' },
    { key: 'wednesday' as keyof ProductFormData, label: 'Qua' },
    { key: 'thursday' as keyof ProductFormData, label: 'Qui' },
    { key: 'friday' as keyof ProductFormData, label: 'Sex' },
    { key: 'saturday' as keyof ProductFormData, label: 'Sáb' },
    { key: 'sunday' as keyof ProductFormData, label: 'Dom' },
  ] as const;

  const disabledFieldStyle = {
    backgroundColor: '#f3f4f6',
    cursor: 'not-allowed',
    opacity: 0.6
  };

  const disabledFieldMessage = (
    <p className="text-xs text-gray-500 mt-1">
      Não editável (produto vinculado a receita)
    </p>
  );

  // Função para obter valores padrão do formulário - Definida uma vez
  const getDefaultFormData = (): ProductFormData => ({
    name: '',
    sku: null,
    unit: 'UN',
    supplier: null,
    cost: null,
    current_stock: null,
    min_stock: 0, // Default min_stock to 0
    group_id: null, // string | null
    subgroup_id: null, // string | null
    kg_weight: null,
    unit_price: null,
    unit_weight: null,
    recipe_id: null, // string | null
    product_type: forceProductType ?? null, // Se forçado, já define aqui
    ativo: true,
    company_id: activeCompany?.id || null, // string | null
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
    all_days: false,
    code: null,
  });

  // Estados do componente - Definidos uma vez
  const [formData, setFormData] = useState<ProductFormData>(getDefaultFormData());
  const [pesoComprado, setPesoComprado] = useState<string>('');
  const [valorPago, setValorPago] = useState<string>('');
  const [custoCalculado, setCustoCalculado] = useState<number>(0);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});
  const [filteredSubgroups, setFilteredSubgroups] = useState<Subgroup[]>(subgroups);
  const [similarNames, setSimilarNames] = useState<string[]>([]);
  const [showSimilarAlert, setShowSimilarAlert] = useState(false);
  const [hasExactName, setHasExactName] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<null | (() => void)>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Variável derivada para controlar se é produto de receita
  const isRecipeProduct = formData.recipe_id !== null;
  // NOVO: Se o tipo for forçado, nunca pode ser editado
  const isProductTypeForced = !!forceProductType;

  // Função auxiliar para verificar se um campo está bloqueado - Definida uma vez
  // Ajustada para desabilitar TUDO exceto os dias da semana E is_active
  const isFieldDisabled = (fieldName: keyof ProductFormData): boolean => {
    if (!isRecipeProduct || !isEditMode) { // Only disable in edit mode for recipe products
      return false;
    }
    // Allow editing only these fields for recipe products
    const editableFieldsForRecipe: Array<keyof ProductFormData> = [
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'all_days',
      'ativo' // Allow changing active status? Confirm requirement. Assuming yes for now.
    ];
    // Disable if the field name is NOT in the editable list
    return !editableFieldsForRecipe.includes(fieldName);
  };

  // Efeito para calcular custo de matéria prima - Definido uma vez
  useEffect(() => {
    if (formData.product_type === 'materia_prima') {
      // Só recalcula se o usuário digitou algo em Peso ou Valor
      if (pesoComprado.trim() !== '' || valorPago.trim() !== '') {
        const peso = parseDecimalBR(pesoComprado);
        const valor = parseDecimalBR(valorPago);
        if (!isNaN(peso) && peso > 0 && !isNaN(valor) && valor >= 0) {
          setCustoCalculado(valor / peso);
        } else {
          // Mantém o último custo válido
        }
      }
      // Se ambos estiverem vazios, não faz nada (mantém custo carregado na edição)
    } else {
      setCustoCalculado(0);
      setPesoComprado('');
      setValorPago('');
    }
  }, [pesoComprado, valorPago, formData.product_type]);

  // Efeito para inicializar o formulário - Definido uma vez
  useEffect(() => {
    const currentCompanyId = activeCompany?.id || null;

    if (initialData && isEditMode) {
      console.log("[ProductForm] Loading initialData:", initialData);
      const safeInitialData = initialData as any; // Mantenha o 'as any' por enquanto

      const initialFormState: ProductFormData = {
        ...getDefaultFormData(), // Start with defaults
        company_id: currentCompanyId, // Ensure current company
        id: safeInitialData.id,
        name: safeInitialData.name || '',
        sku: safeInitialData.sku || null,
        unit: safeInitialData.unit || 'UN',
        supplier: safeInitialData.supplier || null,
        cost: toNumberOrNull(safeInitialData.cost),
        current_stock: toNumberOrNull(safeInitialData.current_stock),
        min_stock: toNumberOrNull(safeInitialData.min_stock) ?? 0, // Use default 0 if null
        group_id: safeInitialData.group_id?.toString() ?? null,
        subgroup_id: safeInitialData.subgroup_id?.toString() ?? null,
        kg_weight: toNumberOrNull(safeInitialData.kg_weight),
        unit_price: toNumberOrNull(safeInitialData.unit_price),
        unit_weight: toNumberOrNull(safeInitialData.unit_weight),
        recipe_id: safeInitialData.recipe_id?.toString() ?? null,
        product_type: (safeInitialData.product_type as ProductType) || null, // Use corrected type
        ativo: toBoolean(safeInitialData.ativo ?? true), // Padronizado: só usa 'ativo', default true se ausente
        code: safeInitialData.code || null,
        // Weekdays
        monday: toBoolean(safeInitialData.monday),
        tuesday: toBoolean(safeInitialData.tuesday),
        wednesday: toBoolean(safeInitialData.wednesday),
        thursday: toBoolean(safeInitialData.thursday),
        friday: toBoolean(safeInitialData.friday),
        saturday: toBoolean(safeInitialData.saturday),
        sunday: toBoolean(safeInitialData.sunday),
        all_days: toBoolean(safeInitialData.all_days),
      };
      // FORÇA 'Kg' SE FOR MATÉRIA PRIMA EM MODO DE EDIÇÃO
      if (initialFormState.product_type === 'materia_prima') {
        console.log('[DEBUG useEffect] Forçando unit para Kg em modo de edição.');
        initialFormState.unit = 'Kg';
      }
      setFormData(initialFormState);

      // Se for matéria prima em modo de edição, inicializa custoCalculado com o custo carregado do banco
      if(initialFormState.product_type === 'materia_prima' && initialFormState.cost !== null) {
          setCustoCalculado(initialFormState.cost);
          setPesoComprado('');
          setValorPago('');
      }

      // Filter subgroups based on initial group_id (string)
      if (initialFormState.group_id) {
        setFilteredSubgroups(subgroups.filter(sg => String(sg.group_id) === initialFormState.group_id));
      } else {
        setFilteredSubgroups(subgroups);
      }
    } else {
      // Creation mode
      const defaultData = getDefaultFormData();
      defaultData.company_id = currentCompanyId;
      const isNovoViaTelaProdutos = !initialData && !isEditMode;
      if (isNovoViaTelaProdutos) {
         defaultData.product_type = 'materia_prima';
         defaultData.unit = 'Kg';
      }
      // FORÇA 'Kg' SE FOR MATÉRIA PRIMA EM MODO DE CRIAÇÃO
      if (defaultData.product_type === 'materia_prima') {
        console.log('[DEBUG useEffect] Forçando unit para Kg em modo de criação.');
        defaultData.unit = 'Kg';
      }
      setFormData(defaultData);
      setFilteredSubgroups(subgroups);
      setPesoComprado('');
      setValorPago('');
      setCustoCalculado(0);
    }
  }, [initialData, isEditMode, subgroups, activeCompany]); // Added activeCompany

  // Efeito para filtrar subgrupos quando o grupo muda - Definido uma vez
  useEffect(() => {
    if (formData.group_id) {
      const newFiltered = subgroups.filter(sg => String(sg.group_id) === formData.group_id);
      setFilteredSubgroups(newFiltered);
      if (formData.subgroup_id && !newFiltered.some(sg => String(sg.id) === formData.subgroup_id)) {
        setFormData(prev => ({ ...prev, subgroup_id: null }));
      }
    } else {
      setFilteredSubgroups(subgroups);
      if (formData.subgroup_id) {
        setFormData(prev => ({ ...prev, subgroup_id: null }));
      }
    }
  }, [formData.group_id, subgroups]); // Removed subgroup_id dependency

  // Handler genérico para inputs (text, number, etc.) - Definido uma vez
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const key = name as keyof ProductFormData;

    if (isFieldDisabled(key)) {
      console.warn(`Tentativa de alterar campo desabilitado: ${key}`);
      return;
    }

    let newValue: string | number | boolean | null;

    if (type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      newValue = toNumberOrNull(value);
    } else {
      // Treat empty strings as null for potentially numeric fields if desired, otherwise keep as string
      const potentiallyNumericFields = ['cost', 'current_stock', 'min_stock', 'kg_weight', 'unit_price', 'unit_weight'];
      if (potentiallyNumericFields.includes(key) && value === '') {
        newValue = null;
      } else {
        newValue = value;
      }
    }

    setFormData(prev => ({ ...prev, [key]: newValue }));

    if (errors[key]) {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors[key]; return newErrors; });
    }
  }, [errors, isFieldDisabled]); // Added isFieldDisabled

  // Handler para Selects - Definido uma vez
  const handleSelectChange = useCallback((name: keyof ProductFormData, value: string | null) => {
    const key = name as keyof ProductFormData;

    if (isFieldDisabled(key)) {
       console.warn(`Tentativa de alterar campo select desabilitado: ${key}`);
      return;
    }

    // Value from Select is already string or null (if empty value option selected)
    // *** AJUSTE AQUI: Tratar '' OU 'none' como null ***
    let processedValue: string | ProductType | null = (value === '' || value === 'none') ? null : value;

    // Handle product_type specifically if it's a select
     if (key === 'product_type') {
       // Ensure it's one of the allowed types or null
       if (processedValue !== 'materia_prima' && processedValue !== 'subreceita' && processedValue !== 'receita') {
         processedValue = null;
       }
     }


    setFormData(prev => {
      const updatedState = { ...prev, [key]: processedValue };

      if (key === 'product_type') {
        if (processedValue === 'materia_prima') {
          updatedState.unit = 'Kg';
          updatedState.cost = null; // Será calculado
          setPesoComprado('');
          setValorPago('');
          setCustoCalculado(0);
        } else {
          // Reset cost if changing *from* materia_prima
          if (prev.product_type === 'materia_prima') updatedState.cost = null;
          // If changing TO recipe/subrecipe, ensure unit is UN? (Handled by DB link usually)
          // No: ProductForm shouldn't create recipes, only link existing ones or materia prima
        }
      }

      if (key === 'group_id') {
        updatedState.subgroup_id = null;
      }

      // Clear unit_price if unit changes to Kg
      if (key === 'unit' && processedValue === 'Kg') {
          updatedState.unit_price = null;
      }
      // Clear kg_weight if unit changes to UN (assuming kg_weight is price/kg)
      // Or clear unit_weight if unit changes to Kg? Depends on meaning.
      // Let's assume kg_weight/unit_weight are set based on unit, clear the other one.
      if (key === 'unit') {
          if (processedValue === 'Kg') updatedState.unit_weight = null;
          if (processedValue === 'UN') updatedState.kg_weight = null;
      }


      return updatedState;
    });

    if (errors[key]) {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors[key]; return newErrors; });
    }
  }, [errors, isFieldDisabled]); // Added isFieldDisabled

  // Validação do Formulário - Definida uma vez
  const validateForm = (): boolean => {
  console.log('[DEBUG validateForm] Iniciando validação. Dados:', JSON.stringify(formData));
    console.log('[DEBUG] Validating formData:', formData);
    const newErrors: Partial<Record<keyof ProductFormData, string>> = {};

    if (!formData.name?.trim()) newErrors.name = 'Nome é obrigatório.';
    if (!formData.product_type) newErrors.product_type = 'Tipo de produto é obrigatório.';

    // Only validate fields that are NOT disabled
    const checkField = (field: keyof ProductFormData, validation: () => string | null) => {
        if (!isFieldDisabled(field)) {
            const error = validation();
            if (error) newErrors[field] = error;
        }
    }

    checkField('unit', () => !formData.unit ? 'Unidade é obrigatória.' : null);

    if (formData.product_type === 'materia_prima') {
    const pesoStr = pesoComprado;
    const valorStr = valorPago;
    const pesoNum = parseDecimalBR(pesoStr);
    const valorNum = parseDecimalBR(valorStr);
    // Só valida Peso/Valor se for CRIAÇÃO ou se os campos foram PREENCHIDOS na edição
    if (!isEditMode || (isEditMode && (pesoStr.trim() !== '' || valorStr.trim() !== ''))) {
        checkField('cost', () => (isNaN(pesoNum) || pesoNum <= 0) ? 'Para Matéria Prima, informe Peso Comprado válido (> 0).' : null);
        checkField('cost', () => {
            const err = (isNaN(valorNum) || valorNum < 0) ? 'Para Matéria Prima, informe Valor Pago válido (>= 0).' : null;
            if (err) newErrors.cost = (newErrors.cost ? newErrors.cost + ' ' : '') + err;
            return null; // Error added diretamente
        });
    }
    checkField('unit', () => formData.unit !== 'Kg' ? 'Matéria prima deve ter unidade Kg.' : null);
} else if (formData.product_type === 'receita' || formData.product_type === 'subreceita') {
        // Validation for recipe/sub-recipe PRODUCTS (not the recipe itself)
        // Cost should come from linked recipe, but check if null perhaps?
        checkField('cost', () => (formData.cost === null || formData.cost < 0) ? 'Custo deve ser um número não negativo.' : null);

        if (formData.unit === 'Kg') {
             checkField('kg_weight', () => (formData.kg_weight === null || formData.kg_weight <= 0) ? 'Para produtos em Kg, informe o Peso Total (Kg).' : null); // Assuming kg_weight is total yield
             checkField('unit_price', () => formData.unit_price !== null ? 'Preço unitário não aplicável para venda em Kg.' : null);
        } else if (formData.unit === 'UN') {
             checkField('unit_weight', () => (formData.unit_weight === null || formData.unit_weight <= 0) ? 'Para produtos em Unidade, informe o Peso por Unidade (Kg).' : null);
             checkField('unit_price', () => (formData.unit_price !== null && formData.unit_price < 0) ? 'Preço de Venda por Unidade não pode ser negativo.' : null);
             // unit_price itself is not required here, only that it's not negative if provided
        }
    }

    // Min stock validation
    checkField('min_stock', () => (formData.min_stock !== null && formData.min_stock < 0) ? 'Estoque mínimo não pode ser negativo.' : null);


    console.log('[DEBUG validateForm] Objeto newErrors calculado:', JSON.stringify(newErrors));
    setErrors(newErrors);
    const isValidResult = Object.keys(newErrors).length === 0;
    console.log('[DEBUG validateForm] newErrors final:', JSON.stringify(newErrors), 'Retornando isValid:', isValidResult);
    return isValidResult;
  };

  // Checagem de nomes semelhantes - Definida uma vez
  const checkSimilarNamesAndExact = useCallback(async (name: string) => {
    if (!name || name.trim().length < 3) return { similars: [], exact: false };
    if (!activeCompany?.id) {
      console.error("Empresa ativa não encontrada para checar nomes similares.");
      toast.error("Não foi possível verificar nomes similares: Empresa não identificada.");
      return { similars: [], exact: false };
    }
    try {
      const results = await findSimilarProductsByName(name.trim(), activeCompany.id);
      const lowerTyped = name.trim().toLowerCase();
      const currentProductId = formData?.id; // Use ID from state if available
      const filtered = isEditMode && currentProductId
        ? results.filter(prod => prod.id !== currentProductId)
        : results;
      const similars = filtered.filter(prod => prod.name.toLowerCase() !== lowerTyped).map(prod => prod.name);
      const exact = filtered.some(prod => prod.name.toLowerCase() === lowerTyped);
      return { similars, exact };
    } catch (error) {
        console.error("Erro ao buscar nomes similares:", error);
        toast.error("Erro ao verificar nomes similares.");
        return { similars: [], exact: false };
    }
  }, [activeCompany, isEditMode, formData?.id]); // Use formData.id dependency

  // Handler para blur do campo nome - Definido uma vez
  const handleNameBlur = useCallback(async () => {
    if (isFieldDisabled('name')) return; // Don't check if disabled

    const nameToCheck = formData.name;
    if (nameToCheck && nameToCheck.trim().length >= 3) {
      const { similars, exact } = await checkSimilarNamesAndExact(nameToCheck);
      if (formData.name === nameToCheck) { // Ensure name hasn't changed during async check
          setHasExactName(exact);
          setSimilarNames(similars);
          setShowSimilarAlert(similars.length > 0 && !exact);
          if (exact) setErrors(prev => ({...prev, name: 'Já existe um produto com este nome.'}));
          else if (errors.name === 'Já existe um produto com este nome.') setErrors(prev => { delete prev.name; return {...prev}; });
      }
    } else {
        setHasExactName(false);
        setSimilarNames([]);
        setShowSimilarAlert(false);
        if (errors.name === 'Já existe um produto com este nome.') setErrors(prev => { delete prev.name; return {...prev}; });
    }
  }, [formData.name, checkSimilarNamesAndExact, isFieldDisabled, errors.name]); // Added dependencies

  // Função separada para a lógica de envio real
  const executeSubmit = async (companyId: string) => {
        setShowSimilarAlert(false);
        setPendingSubmit(null);

        let finalCost = formData.cost;

        // Get cost from calculation if materia prima
        if (formData.product_type === 'materia_prima') {
             finalCost = custoCalculado;
        }

        // Prepare data for submission, converting back to numbers where needed by service/DB
        // Use SubmissionData type to guide payload structure
        const dataToSend: SubmissionData = {
            // Cast formData to ensure base types match SubmissionData where possible
             ...(formData as Omit<ProductFormData, 'company_id'>), // Exclude company_id temporarily
             company_id: companyId, // Ensure correct companyId (already string)
             // Ensure numbers are numbers, nulls are nulls
             cost: finalCost, // Already number or null
             current_stock: toNumberOrNull(formData.current_stock),
             min_stock: toNumberOrNull(formData.min_stock) ?? 0,
             kg_weight: toNumberOrNull(formData.kg_weight),
             unit_price: toNumberOrNull(formData.unit_price),
             unit_weight: toNumberOrNull(formData.unit_weight),
             // IDs are kept as string | null as defined in SubmissionData for now
             group_id: formData.group_id,
             subgroup_id: formData.subgroup_id,
             recipe_id: formData.recipe_id,
             // Booleans
             ativo: toBoolean(formData.ativo),
             monday: toBoolean(formData.monday),
             tuesday: toBoolean(formData.tuesday),
             wednesday: toBoolean(formData.wednesday),
             thursday: toBoolean(formData.thursday),
             friday: toBoolean(formData.friday),
             saturday: toBoolean(formData.saturday),
             sunday: toBoolean(formData.sunday),
             all_days: toBoolean(formData.all_days),
        };


        // Remove fields irrelevant based on type before sending
        if (dataToSend.product_type === 'materia_prima') {
            dataToSend.unit_price = null;
            dataToSend.unit_weight = null;
            dataToSend.kg_weight = null; // Or keep if it has meaning? Null for now.
            dataToSend.recipe_id = null; // Materia prima cannot have recipe_id
        } else if (dataToSend.unit === 'Kg') {
            dataToSend.unit_price = null;
            dataToSend.unit_weight = null;
        } else if (dataToSend.unit === 'UN') {
             dataToSend.kg_weight = null; // Assuming kg_weight irrelevant if sold by unit
        }

        console.log('[ProductForm] Dados finais enviados para onSubmit:', dataToSend);

        try {
            await onSubmit(dataToSend); // Call parent onSubmit
            setSuccessMsg(`Produto ${isEditMode ? 'atualizado' : 'cadastrado'} com sucesso!`);
            toast.success(`Produto ${isEditMode ? 'atualizado' : 'cadastrado'}!`);
             // Optional: Clear form on successful creation? Or let parent handle navigation/reset?
             // if (!isEditMode) { setFormData(getDefaultFormData()); setPesoComprado(''); setValorPago(''); }
             if (!isEditMode && navigate) { // Navigate back after successful create?
                 // navigate('/products'); // Example
             }
        } catch (err: any) {
            console.error('Erro ao salvar produto via onSubmit:', err);
            const backendError = err?.message || err?.error_description || 'Ocorreu um erro desconhecido.';
            setErrorMsg(`Erro ao salvar: ${backendError}`);
            toast.error(`Erro ao salvar: ${backendError}`);
        }
  };

  // Handler de Submissão - Definido uma vez
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setErrors({}); // Clear previous errors

    if (!activeCompany?.id) {
        toast.error('Empresa ativa não encontrada. Faça login novamente.');
        setErrorMsg('Empresa ativa não encontrada.');
        return;
    }

    const isValid = validateForm(); // Re-validates and sets errors state
    if (!isValid) {
      console.error('[ProductForm] Erros de validação encontrados:', errors);
      setErrorMsg('Verifique os erros no formulário.');
      toast.error('Existem erros no formulário.');
      return;
    }

    // Final name check only if name field is editable
    if (!isFieldDisabled('name')) {
        const { similars: finalSimilars, exact: finalExact } = await checkSimilarNamesAndExact(formData.name);
        if (finalExact) {
            setHasExactName(true);
            setErrorMsg('Já existe um produto cadastrado com este nome.');
            setErrors(prev => ({...prev, name: 'Já existe um produto com este nome.'}));
            toast.error('Nome de produto duplicado.');
            return;
        }
        if (finalSimilars.length > 0 && !pendingSubmit && !showSimilarAlert) { // Avoid re-prompting if alert already shown
             setSimilarNames(finalSimilars);
             setShowSimilarAlert(true);
             setErrorMsg('Existem produtos com nomes parecidos. Confirme o cadastro.');
             toast.warning('Produtos com nomes similares encontrados.');
             // Define the pending action
             setPendingSubmit(() => () => executeSubmit(activeCompany.id));
             return; // Wait for user confirmation
        }
    }

    // Execute submission if no similar name alert is active/pending
    if (!showSimilarAlert) {
         await executeSubmit(activeCompany.id);
    }

  }, [formData, errors, validateForm, checkSimilarNamesAndExact, activeCompany, pendingSubmit, showSimilarAlert, isFieldDisabled, pesoComprado, valorPago, custoCalculado]); // Updated dependencies

  // Confirmação/Cancelamento de nomes similares
  const handleConfirmSimilar = useCallback(async () => {
    if (pendingSubmit) {
      await pendingSubmit(); // Execute the pending submit action
    }
  }, [pendingSubmit]);

  const handleCancelSimilar = useCallback(() => {
    setShowSimilarAlert(false);
    setPendingSubmit(null);
    setErrorMsg(null);
  }, []);

  // Handlers para dias da semana
  const handleWeekdayChange = useCallback((dayKey: keyof ProductFormData, checked: boolean | string) => {
      if (isFieldDisabled(dayKey)) return; // Should not happen based on isFieldDisabled logic, but safe check
      const isChecked = toBoolean(checked);
      const newState = { ...formData, [dayKey]: isChecked };
      const allIndividualDaysChecked = weekdays.every(day => toBoolean(newState[day.key]));
      newState.all_days = allIndividualDaysChecked;
      setFormData(newState);
       if (errors.monday) { // Assuming 'monday' holds the generic day error
             setErrors(prev => { delete prev.monday; return {...prev}; });
       }
  }, [formData, errors, isFieldDisabled]); // Added isFieldDisabled dependency

  const handleAllDaysChange = useCallback((checked: boolean | string) => {
       if (isFieldDisabled('all_days')) return; // Safe check
       const isChecked = toBoolean(checked);
       setFormData(prev => ({
         ...prev,
         all_days: isChecked,
         monday: isChecked,
         tuesday: isChecked,
         wednesday: isChecked,
         thursday: isChecked,
         friday: isChecked,
         saturday: isChecked,
         sunday: isChecked,
       }));
        if (errors.monday) {
             setErrors(prev => { delete prev.monday; return {...prev}; });
        }
  }, [errors, isFieldDisabled]); // Added isFieldDisabled dependency

  const allWeekdaysChecked = weekdays.every(day => toBoolean(formData[day.key]));
  const isSubgroupDisabled = isFieldDisabled('subgroup_id') || !formData.group_id;

  // ----- JSX - Retornado uma vez -----
  // Note: The JSX needs significant updates based on the revised isFieldDisabled logic
  // and potentially removing fields if decided.
  // For now, assuming JSX structure remains similar but respecting `disabled` prop correctly.
  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? 'Editar Produto' : 'Adicionar Novo Produto'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Feedback Messages */}
          {errorMsg && <p className="text-red-600 text-sm p-3 bg-red-50 border border-red-200 rounded-md">{errorMsg}</p>}
          {successMsg && <p className="text-green-600 text-sm p-3 bg-green-50 border border-green-200 rounded-md">{successMsg}</p>}

          {/* Similar Name Alert */}
          {showSimilarAlert && similarNames.length > 0 && (
             <div className="p-4 bg-yellow-100 border border-yellow-300 rounded-md text-sm text-yellow-800">
               <p><strong>Atenção:</strong> Produtos com nomes parecidos encontrados:</p>
               <ul className="list-disc list-inside ml-4">
                 {similarNames.map((name, idx) => <li key={idx}>{name}</li>)}
               </ul>
               <p className="mt-2">Deseja cadastrar este produto mesmo assim?</p>
               <div className="mt-2 space-x-2">
                 <Button size="sm" variant="outline" onClick={handleConfirmSimilar} disabled={isLoading}>Sim, cadastrar</Button>
                 <Button size="sm" variant="destructive" onClick={handleCancelSimilar} disabled={isLoading}>Não, cancelar</Button>
               </div>
             </div>
           )}

          {/* --- Form Fields --- */}
          {/* Row 1: Name, Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coluna 1: Nome */}
            <div>
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name" name="name" value={formData.name} onChange={handleChange} onBlur={handleNameBlur}
                className={errors.name ? 'border-red-500' : ''}
                disabled={isFieldDisabled('name') || isLoading}
                style={isFieldDisabled('name') ? disabledFieldStyle : undefined}
                maxLength={100}
              />
              {isFieldDisabled('name') && disabledFieldMessage}
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Coluna 2: Tipo */}
            <div>
               <Label htmlFor="product_type">Tipo *</Label>
               {!isProductTypeForced ? (
                <Select
                  value={formData.product_type ?? ''}
                  onValueChange={(value) => handleSelectChange('product_type', value as ProductType | null)}
                  disabled={isFieldDisabled('product_type') || isEditMode || isLoading}
                >
                  <SelectTrigger
                    id="product_type"
                    className={errors.product_type ? 'border-red-500' : ''}
                    style={isFieldDisabled('product_type') ? disabledFieldStyle : undefined}
                    disabled={isFieldDisabled('product_type') || isEditMode || isLoading}
                  >
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="materia_prima">Matéria-prima</SelectItem>
                    <SelectItem value="subreceita">Sub-receita</SelectItem>
                    <SelectItem value="receita">Receita</SelectItem>
                  </SelectContent>
                </Select>
               ) : (
                 <>
                   <Input value={forceProductType === 'materia_prima' ? 'Matéria-prima' : forceProductType === 'subreceita' ? 'Sub-receita' : 'Receita'} disabled readOnly />
                   <p className="text-xs text-gray-500 mt-1">Tipo fixo neste fluxo</p>
                 </>
               )}
               {isFieldDisabled('product_type') && disabledFieldMessage}
               {isEditMode && !isFieldDisabled('product_type') && <p className="text-xs text-gray-500 mt-1">O tipo não pode ser alterado após cadastro.</p>}
               {errors.product_type && <p className="text-red-500 text-xs mt-1">{errors.product_type}</p>}
            </div>
          </div>
           {/* Fields specific for Matéria Prima */}
            {formData.product_type === 'materia_prima' && !isRecipeProduct && (
               <Card className="bg-gray-50 p-4 mt-4">
                  <CardHeader className="p-0 pb-2"><CardTitle className="text-base">Custo da Matéria Prima (por Kg)</CardTitle></CardHeader>
                  <CardContent className="p-0">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                              <Label htmlFor="pesoComprado">Peso Comprado (Kg) *</Label>
                              <Input id="pesoComprado" name="pesoComprado" type="text" inputMode='decimal' value={pesoComprado} onChange={(e) => setPesoComprado(e.target.value)} placeholder='Ex: 10,5' disabled={isLoading} className={errors.cost ? 'border-red-500' : ''} />
                          </div>
                          <div>
                              <Label htmlFor="valorPago">Valor Pago (R$) *</Label>
                              <Input id="valorPago" name="valorPago" type="text" inputMode='decimal' value={valorPago} onChange={(e) => setValorPago(e.target.value)} placeholder='Ex: 50,00' disabled={isLoading} className={errors.cost ? 'border-red-500' : ''} />
                          </div>
                          <div>
                              <Label>Custo Calculado (R$/Kg)</Label>
                              <Input value={custoCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} readOnly disabled className='bg-gray-200 font-semibold' />
                              {errors.cost && <p className="text-red-500 text-xs mt-1">{errors.cost}</p>}
                          </div>
                      </div>
                   </CardContent>
               </Card>
           )}

          {(formData.product_type !== 'materia_prima') && (
            <>
              {/* Row 2: Group, Subgroup */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="group_id">Grupo</Label>
                  <Select value={formData.group_id ?? ''} onValueChange={(value) => handleSelectChange('group_id', value)} disabled={isFieldDisabled('group_id') || isLoading}>
                    <SelectTrigger id="group_id" className={errors.group_id ? 'border-red-500' : ''} style={isFieldDisabled('group_id') ? disabledFieldStyle : undefined} disabled={isFieldDisabled('group_id') || isLoading}>
                      <SelectValue placeholder="Selecione o grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {groups?.map((group) => ( <SelectItem key={group.id} value={group.id.toString()}> {group.name} </SelectItem> ))}
                    </SelectContent>
                  </Select>
                  {isFieldDisabled('group_id') && disabledFieldMessage}
                  {errors.group_id && <p className="text-red-500 text-xs mt-1">{errors.group_id}</p>}
                </div>
                <div>
                  <Label htmlFor="subgroup_id">Subgrupo</Label>
                  <Select value={formData.subgroup_id ?? ''} onValueChange={(value) => handleSelectChange('subgroup_id', value)} disabled={isSubgroupDisabled || isLoading}>
                    <SelectTrigger id="subgroup_id" className={errors.subgroup_id ? 'border-red-500' : ''} style={isSubgroupDisabled ? disabledFieldStyle : undefined} disabled={isSubgroupDisabled || isLoading}>
                      <SelectValue placeholder={!formData.group_id ? "Selecione um grupo" : "Selecione o subgrupo"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {filteredSubgroups?.map((subgroup) => ( <SelectItem key={subgroup.id} value={subgroup.id.toString()}> {subgroup.name} </SelectItem> ))}
                    </SelectContent>
                  </Select>
                  {isFieldDisabled('subgroup_id') && disabledFieldMessage}
                  {errors.subgroup_id && <p className="text-red-500 text-xs mt-1">{errors.subgroup_id}</p>}
                </div>
              </div>

              {/* Row 3: Unit, Cost (if not MP), Price */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="unit">Unidade de Venda *</Label>
                  <Select name="unit" value={formData.unit ?? ''} onValueChange={(value) => handleSelectChange('unit', value as 'UN' | 'KG' | null)} disabled={isFieldDisabled('unit') || isLoading}>
                    <SelectTrigger id="unit" className={errors.unit ? 'border-red-500' : ''} style={isFieldDisabled('unit') ? disabledFieldStyle : undefined} disabled={isFieldDisabled('unit') || isLoading}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UN">Unidade (UN)</SelectItem>
                      <SelectItem value="Kg">Quilograma (Kg)</SelectItem>
                    </SelectContent>
                  </Select>
                  {isFieldDisabled('unit') && disabledFieldMessage}
                  {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit}</p>}
                </div>

                <div>
                  <Label htmlFor="cost">Custo *</Label>
                  <Input id="cost" name="cost" type="text" inputMode='decimal' value={formData.cost ?? ''} onChange={handleChange} placeholder='Ex: 2.50' className={errors.cost ? 'border-red-500' : ''} disabled={isFieldDisabled('cost') || isLoading} style={isFieldDisabled('cost') ? disabledFieldStyle : undefined} />
                  {isFieldDisabled('cost') && disabledFieldMessage}
                  {errors.cost && <p className="text-red-500 text-xs mt-1">{errors.cost}</p>}
                </div>

                <div>
                  <Label htmlFor="unit_price">Preço Venda ({formData.unit || 'UN'})</Label>
                  <Input id="unit_price" name="unit_price" type="text" inputMode='decimal' value={formData.unit_price ?? ''} onChange={handleChange} placeholder='Ex: 5.99' className={errors.unit_price ? 'border-red-500' : ''} disabled={isFieldDisabled('unit_price') || isLoading} style={isFieldDisabled('unit_price') ? disabledFieldStyle : undefined} />
                  {isFieldDisabled('unit_price') && disabledFieldMessage}
                  {errors.unit_price && <p className="text-red-500 text-xs mt-1">{errors.unit_price}</p>}
                </div>
              </div>

              {/* Row 4: Weights, SKU, Supplier */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="unit_weight">Peso por Unidade (Kg) *</Label>
                  <Input id="unit_weight" name="unit_weight" type="text" inputMode='decimal' value={formData.unit_weight ?? ''} onChange={handleChange} placeholder='Ex: 0.550' className={errors.unit_weight ? 'border-red-500' : ''} disabled={isFieldDisabled('unit_weight') || isLoading} style={isFieldDisabled('unit_weight') ? disabledFieldStyle : undefined} />
                  {isFieldDisabled('unit_weight') && disabledFieldMessage}
                  {errors.unit_weight && <p className="text-red-500 text-xs mt-1">{errors.unit_weight}</p>}
                </div>

                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input id="sku" name="sku" value={formData.sku ?? ''} onChange={handleChange} disabled={isFieldDisabled('sku') || isLoading} style={isFieldDisabled('sku') ? disabledFieldStyle : undefined} maxLength={50} />
                  {isFieldDisabled('sku') && disabledFieldMessage}
                </div>

                <div>
                  <Label htmlFor="supplier">Fornecedor</Label>
                  <Input id="supplier" name="supplier" value={formData.supplier ?? ''} onChange={handleChange} disabled={isFieldDisabled('supplier') || isLoading} style={isFieldDisabled('supplier') ? disabledFieldStyle : undefined} maxLength={100} />
                  {isFieldDisabled('supplier') && disabledFieldMessage}
                </div>
              </div>

              {/* Row 5: Stock Levels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="min_stock">Estoque Mínimo ({formData.unit || 'Unid.'})</Label>
                  <Input id="min_stock" name="min_stock" type="number" step="0.001" min="0" value={formData.min_stock ?? ''} onChange={handleChange} disabled={isFieldDisabled('min_stock') || isLoading} style={isFieldDisabled('min_stock') ? disabledFieldStyle : undefined} />
                  {isFieldDisabled('min_stock') && disabledFieldMessage}
                  {errors.min_stock && <p className="text-red-500 text-xs mt-1">{errors.min_stock}</p>}
                </div>

                <div>
                  <Label htmlFor="current_stock">Estoque Atual ({formData.unit || 'Unid.'})</Label>
                  <Input id="current_stock" name="current_stock" type="number" step="0.001" value={formData.current_stock ?? ''} onChange={handleChange} disabled={isFieldDisabled('current_stock') || isLoading} style={isFieldDisabled('current_stock') ? disabledFieldStyle : undefined} />
                  {isFieldDisabled('current_stock') && disabledFieldMessage}
                  {errors.current_stock && <p className="text-red-500 text-xs mt-1">{errors.current_stock}</p>}
                </div>

                <div>
                  <Label htmlFor="ativo">Produto Ativo?</Label>
                  <div className="flex items-center pt-2">
                    <Checkbox id="ativo" name="ativo" checked={formData.ativo} onCheckedChange={(checked) => handleSelectChange('ativo', checked ? 'true' : 'false')} disabled={isFieldDisabled('ativo') || isLoading} style={isFieldDisabled('ativo') ? disabledFieldStyle : undefined} />
                    <Label htmlFor="ativo" className="ml-2">Sim</Label>
                  </div>
                  {isFieldDisabled('ativo') && disabledFieldMessage}
                </div>
              </div>

              {/* Row 6: Production Days */}
              <div className="space-y-2 pt-4">
                <Label className={errors.monday ? 'text-red-500' : ''}>Dias de Produção</Label>
                <div className={`flex flex-wrap gap-x-6 gap-y-2 items-center p-3 border rounded-md ${errors.monday ? 'border-red-500' : ''}`}>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="all_days" checked={allWeekdaysChecked} onCheckedChange={handleAllDaysChange} disabled={isLoading} />
                    <Label htmlFor="all_days" className="font-medium">Todos os dias</Label>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {weekdays.map((day) => (
                      <div key={day.key} className="flex items-center space-x-2">
                        <Checkbox id={day.key} checked={toBoolean(formData[day.key])} onCheckedChange={(checked) => handleWeekdayChange(day.key, checked as boolean)} disabled={isLoading} />
                        <Label htmlFor={day.key}>{day.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                {errors.monday && <p className="text-red-500 text-xs mt-1">{errors.monday}</p>}
              </div>
            </>
          )}

          {/* Grupo e Subgrupo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="group_id">Grupo</Label>
              <Select value={formData.group_id ?? ''} onValueChange={(value) => handleSelectChange('group_id', value)} disabled={isFieldDisabled('group_id') || isLoading}>
                <SelectTrigger id="group_id" className={errors.group_id ? 'border-red-500' : ''} style={isFieldDisabled('group_id') ? disabledFieldStyle : undefined} disabled={isFieldDisabled('group_id') || isLoading}>
                  <SelectValue placeholder="Selecione o grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {groups?.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>{group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isFieldDisabled('group_id') && disabledFieldMessage}
              {errors.group_id && <p className="text-red-500 text-xs mt-1">{errors.group_id}</p>}
            </div>
            <div>
              <Label htmlFor="subgroup_id">Subgrupo</Label>
              <Select value={formData.subgroup_id ?? ''} onValueChange={(value) => handleSelectChange('subgroup_id', value)} disabled={isSubgroupDisabled || isLoading}>
                <SelectTrigger id="subgroup_id" className={errors.subgroup_id ? 'border-red-500' : ''} style={isSubgroupDisabled ? disabledFieldStyle : undefined} disabled={isSubgroupDisabled || isLoading}>
                  <SelectValue placeholder={!formData.group_id ? "Selecione um grupo" : "Selecione o subgrupo"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {filteredSubgroups?.map((subgroup) => (
                    <SelectItem key={subgroup.id} value={subgroup.id.toString()}>{subgroup.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isFieldDisabled('subgroup_id') && disabledFieldMessage}
              {errors.subgroup_id && <p className="text-red-500 text-xs mt-1">{errors.subgroup_id}</p>}
            </div>
          </div>

          {/* Produto Ativo */}
          <div className="flex items-center space-x-2 mt-4">
            <Checkbox id="ativo" name="ativo" checked={formData.ativo} onCheckedChange={(checked) => handleSelectChange('ativo', checked ? 'true' : 'false')} disabled={isFieldDisabled('ativo') || isLoading} style={isFieldDisabled('ativo') ? disabledFieldStyle : undefined} />
            <Label htmlFor="ativo">Produto Ativo?</Label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-6">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || showSimilarAlert}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEditMode ? 'Salvar Alterações' : 'Cadastrar Produto'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

export default ProductForm;