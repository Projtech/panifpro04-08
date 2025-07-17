
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
// Removido import do Select do Radix UI para evitar problemas de manipulação do DOM
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
import { getProductTypes, ProductType, ensureSystemProductTypes, SYSTEM_PRODUCT_TYPES } from '@/services/productTypesService'; // Import system product types
import { Product as ProductTypeFromService } from '@/services/productService';
import type { ProductType as OldProductTypeEnum } from '@/services/productService';
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
  setor_id: string | null; // Store as string (OPCIONAL)
  kg_weight: number | null;
  unit_price: number | null;
  unit_weight: number | null;
  recipe_id: string | null; // Assuming recipe ID is UUID (string)
  product_type_id: string | null;
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
export interface SubmissionData extends Omit<ProductFormData, 'group_id' | 'subgroup_id' | 'setor_id' | 'company_id' | 'recipe_id'> {
  group_id: string | null; // Keep as string if service expects string UUID
  subgroup_id: string | null; // Keep as string if service expects string UUID
  setor_id: string | null; // Keep as string if service expects string UUID
  company_id: string; // Ensure it's not null for submission
  recipe_id: string | null;
  product_type?: string | null; // Incluído novamente para compatibilidade com a API
};

export interface ProductFormProps {
  initialData?: Partial<ProductFormData> | null; // Allow partial for creation
  onSubmit: (data: SubmissionData) => Promise<void>; // Use SubmissionData type
  onCancel: () => void;
  isLoading: boolean;
  isEditMode: boolean;
  groups: Group[]; // Assume Group has { id: string; name: string; ... }
  subgroups: Subgroup[]; // Assume Subgroup has { id: string; name: string; group_id: string; ... }
  setores?: { id: string; name: string; color?: string | null }[]; // Lista de setores disponíveis
  forceProductTypeId?: string; // NOVO: força o tipo de produto pelo ID
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

// Componentes auxiliares removidos para simplificar a implementação

const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  isEditMode,
  groups,
  subgroups,
  setores = [],
  forceProductTypeId
}): React.ReactNode => {
  // Ref para controlar se o componente está montado
  const isMounted = useRef(true);
  
  // Refs para controlar timeouts e cancelar operações pendentes
  const pendingTimeoutsRef = useRef<number[]>([]);
  
  // Efeito para gerenciar o ciclo de vida do componente
  useEffect(() => {
    console.log('[ProductForm] Componente montado, isMounted=true');
    
    // Garantir que o componente está marcado como montado no início
    isMounted.current = true;
    
    // Cancelar qualquer animação de frame pendente
    let rafId: number | null = null;
    
    // Função para cancelar todas as animações de frame pendentes
    const cancelPendingAnimations = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
    
    return () => {
      // Cancelar animações pendentes
      cancelPendingAnimations();
      
      // Limpar todos os timeouts pendentes
      pendingTimeoutsRef.current.forEach(timeoutId => {
        window.clearTimeout(timeoutId);
      });
      pendingTimeoutsRef.current = [];
      
      // Marcar componente como desmontado
      isMounted.current = false;
      console.log('[ProductForm] Componente desmontado, isMounted=false, timeouts e animações limpos');
    };
  }, []);

  const { activeCompany } = useAuth();
  const navigate = useNavigate();
  
  // A busca de tipos de produto já deve existir em outro lugar no arquivo

  useEffect(() => {
    if (activeCompany?.id) {
      // Primeiro garantir que os tipos de sistema existam
      ensureSystemProductTypes(activeCompany.id)
        .then(() => {
          console.log('Tipos de sistema verificados com sucesso');
          // Depois carregar todos os tipos
          return getProductTypes(activeCompany.id);
        })
        .then(types => {
          console.log(`Carregados ${types.length} tipos de produto`);
          setProductTypes(types);
        })
        .catch(err => {
          console.error("Falha ao carregar os tipos de produto:", err);
          toast.error('Falha ao carregar os tipos de produto.');
        });
    }
  }, [activeCompany]); // Recarga quando a empresa ativa mudar

  // Constantes definidas uma vez
  // Define os dias da semana com tipos corretos e literais
  type WeekdayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  
  const weekdays = [
    { key: 'monday' as WeekdayKey, label: 'Seg' },
    { key: 'tuesday' as WeekdayKey, label: 'Ter' },
    { key: 'wednesday' as WeekdayKey, label: 'Qua' },
    { key: 'thursday' as WeekdayKey, label: 'Qui' },
    { key: 'friday' as WeekdayKey, label: 'Sex' },
    { key: 'saturday' as WeekdayKey, label: 'Sáb' },
    { key: 'sunday' as WeekdayKey, label: 'Dom' },
  ] as const;
  
  // Funções para manipulação dos dias da semana
  
  // Garantir que os labels sejam sempre os abreviados, mesmo se houver override em algum lugar

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
  // Removidas para evitar duplicações - movidas para depois da declaração de formData

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
    setor_id: null, // string | null (OPCIONAL)
    kg_weight: null,
    unit_price: null,
    unit_weight: null,
    recipe_id: null, // string | null
    product_type_id: forceProductTypeId ?? null, // Se forçado, já define aqui
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
  
  // Declaração única das variáveis e funções para dias da semana
  // Definido como variável para ser recalculado a cada render
  const allWeekdaysChecked = weekdays.every(day => toBoolean(formData[day.key]));
  
  const handleAllDaysChange = useCallback((checked: boolean) => {
    setFormData(prev => {
      const newData = { ...prev };
      weekdays.forEach(day => {
        // Usando uma abordagem tipada corretamente
        newData[day.key] = checked;
      });
      return newData;
    });
  }, []);

  const handleWeekdayChange = useCallback((key: WeekdayKey, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [key]: checked
    }));
  }, []);



  const [pesoComprado, setPesoComprado] = useState<string>('');
  const [valorPago, setValorPago] = useState<string>('');
  const [custoCalculado, setCustoCalculado] = useState<number>(0);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});
  const [filteredSubgroups, setFilteredSubgroups] = useState<Subgroup[]>(subgroups);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  // Estados relacionados a nomes duplicados removidos
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Funções para manipulação dos dias da semana foram movidas para escopo global do componente

  // Variável derivada para controlar se é produto de receita
  const isRecipeProduct = formData.recipe_id !== null;
  // NOVO: Se o tipo for forçado, nunca pode ser editado
  const isProductTypeForced = !!forceProductTypeId;
  
  // Verificar se o produto usa um tipo de sistema (protegido)
  const isSystemProductType = useCallback((typeId: string | null): boolean => {
    if (!typeId) return false;
    
    // Encontra o tipo pelo ID
    const productType = productTypes.find(pt => pt.id === typeId);
    if (!productType) return false;
    
    // Verifica se é um dos tipos do sistema
    return SYSTEM_PRODUCT_TYPES.includes(productType.name.toLowerCase());
  }, [productTypes]);
  
  // Verificar se o produto atual usa um tipo do sistema
  const hasSystemProductType = isSystemProductType(formData.product_type_id);

  // Função auxiliar para verificar se um campo está bloqueado
  // Atualmente configurada para não bloquear nenhum campo
  const isFieldDisabled = (fieldName: keyof ProductFormData): boolean => {
    return false;
  };
  
  // Função simples para atualizar campos de input
  const handleInputChange = (fieldName: keyof ProductFormData, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    // Limpa erro se existir
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Efeito simplificado para calcular custo de matéria prima
  useEffect(() => {
    // Log para debug dos tipos de produto disponíveis
    console.log('[ProductForm] Tipos de produto:', productTypes);
    console.log('[ProductForm] Tipo selecionado ID:', formData.product_type_id);
    
    // Encontra o tipo de produto pelo ID
    const selectedProductType = productTypes.find(pt => pt.id === formData.product_type_id);
    console.log('[ProductForm] Tipo selecionado:', selectedProductType);
    
    // Verifica se é matéria prima de forma mais flexível, considerando variações de escrita
    const tipoBaixo = selectedProductType?.name?.toLowerCase() || '';
    const isMateriaPrima = tipoBaixo.includes('materia') || tipoBaixo.includes('matéria');
    
    console.log('[ProductForm] É matéria prima?', isMateriaPrima);
    console.log('[ProductForm] Valor atual dos campos - Peso:', pesoComprado, 'Valor:', valorPago);
    
    if (isMateriaPrima) {
      // Só tenta calcular se tiver valores nos campos
      if (pesoComprado || valorPago) {
        try {
          // Converte valores para números, substituindo vírgula por ponto
          const pesoNumerico = pesoComprado ? Number(pesoComprado.replace(',', '.')) : 0;
          const valorNumerico = valorPago ? Number(valorPago.replace(',', '.')) : 0;
          
          console.log('[ProductForm] Valores numéricos - Peso:', pesoNumerico, 'Valor:', valorNumerico);
          
          // Calcula o custo somente se peso for maior que zero
          if (pesoNumerico > 0) {
            const custoValor = valorNumerico / pesoNumerico;
            setCustoCalculado(custoValor);
            
            // Atualiza o campo cost do formData com o valor calculado
            setFormData(prev => ({
              ...prev,
              cost: custoValor
            }));
            
            console.log('[ProductForm] Custo calculado:', custoValor, '- Atualizado no formData');
          }
        } catch (error) {
          console.error('[ProductForm] Erro ao calcular custo:', error);
        }
      }
    } else {
      // Se não é materia prima, limpa os campos
      setCustoCalculado(0);
      setPesoComprado('');
      setValorPago('');
    }
  }, [pesoComprado, valorPago, formData.product_type_id, productTypes]);

  // Função segura para atualização de estado - implementação síncrona
  const safeSetState = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: React.SetStateAction<T>) => {
    // Verificação síncrona para evitar problemas de timing
    if (isMounted.current) {
      // Atualização direta do estado sem requestAnimationFrame
      try {
        setter(value);
      } catch (error) {
        console.error('[ProductForm] Erro ao atualizar estado:', error);
      }
    } else {
      console.log('[ProductForm] Tentativa de atualizar estado em componente desmontado evitada');
    }
  };
  
  // Função segura para criar timeouts que serão limpos na desmontagem
  const safeTimeout = (callback: () => void, delay: number) => {
    if (!isMounted.current) return;
    
    const timeoutId = window.setTimeout(() => {
      // Remove o ID da lista quando executado
      pendingTimeoutsRef.current = pendingTimeoutsRef.current.filter(id => id !== timeoutId);
      
      // Só executa o callback se o componente ainda estiver montado
      if (isMounted.current) {
        callback();
      }
    }, delay);
    
    // Adiciona o ID à lista de timeouts pendentes
    pendingTimeoutsRef.current.push(timeoutId);
    
    return timeoutId;
  };

  // Efeito para inicializar o formulário - Definido uma vez
  useEffect(() => {
    // Verificar se o componente ainda está montado
    if (!isMounted.current) return;
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
        product_type_id: forceProductTypeId || initialData?.product_type_id || null,
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
      safeSetState(setFormData, initialFormState);

      // Se for matéria prima em modo de edição, inicializa custoCalculado com o custo carregado do banco
      // Verificar se o tipo selecionado é matéria prima baseado no ID
      const isMateriaPrima = initialFormState.product_type_id && productTypes.some(
        pt => pt.id === initialFormState.product_type_id && pt.name.toLowerCase() === 'materia_prima'
      );
      
      if(isMateriaPrima && initialFormState.cost !== null) {
          safeSetState(setCustoCalculado, initialFormState.cost);
          safeSetState(setPesoComprado, '');
          safeSetState(setValorPago, '');
      }

      // Filter subgroups based on initial group_id (string)
      if (initialFormState.group_id) {
        safeSetState(setFilteredSubgroups, subgroups.filter(sg => String(sg.group_id) === initialFormState.group_id));
      } else {
        safeSetState(setFilteredSubgroups, subgroups);
      }
    } else {
      // Creation mode
      const defaultData = getDefaultFormData();
      defaultData.company_id = currentCompanyId;
      // Removida restrição que forçava tipo de produto para 'materia_prima' e unidade para 'Kg'
      // Removida restrição que forçava 'Kg' para matéria prima em modo de criação
      safeSetState(setFormData, defaultData);
      safeSetState(setFilteredSubgroups, subgroups);
      safeSetState(setPesoComprado, '');
      safeSetState(setValorPago, '');
      safeSetState(setCustoCalculado, 0);
    }
  }, [initialData, isEditMode, subgroups, activeCompany]); // Added activeCompany

  // Efeito para filtrar subgrupos quando o grupo muda - Definido uma vez
  useEffect(() => {
    // Verificar se o componente ainda está montado
    if (!isMounted.current) return;
    if (formData.group_id) {
      const newFiltered = subgroups.filter(sg => String(sg.group_id) === formData.group_id);
      safeSetState(setFilteredSubgroups, newFiltered);
      if (formData.subgroup_id && !newFiltered.some(sg => String(sg.id) === formData.subgroup_id)) {
        safeSetState(setFormData, prev => ({ ...prev, subgroup_id: null }));
      }
    } else {
      safeSetState(setFilteredSubgroups, subgroups);
      if (formData.subgroup_id) {
        safeSetState(setFormData, prev => ({ ...prev, subgroup_id: null }));
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

    // Atualização síncrona do estado
    if (isMounted.current) {
      setFormData(prev => ({ ...prev, [key]: newValue }));
      
      if (errors[key]) {
        setErrors(prev => { 
          const newErrors = { ...prev }; 
          delete newErrors[key]; 
          return newErrors; 
        });
      }
    } else {
      console.log('[ProductForm] Tentativa de atualizar estado em componente desmontado evitada');
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
    let processedValue: string | null = (value === '' || value === 'none') ? null : value;

    // Para product_type_id não precisamos verificar valores específicos
    // pois agora é um ID dinâmico da tabela product_types
    if (key === 'product_type_id' && processedValue !== null) {
      // Verificamos apenas se é um ID válido na lista de tipos
      const isValidId = productTypes.some(pt => pt.id === processedValue);
      if (!isValidId) {
        processedValue = null;
      }
    }

    // Atualização síncrona do estado
    if (isMounted.current) {
      setFormData(prev => {
        const updatedState = { ...prev, [key]: processedValue };

        if (key === 'product_type_id') {
          // Busca o tipo pelo ID para verificar se é matéria-prima
          const selectedType = productTypes.find(pt => pt.id === processedValue);
          if (selectedType && selectedType.name.toLowerCase() === 'materia_prima') {
            // Removida restrição que forçava unidade para 'Kg'
            updatedState.cost = null; // Será calculado
            
            // Atualizar estados relacionados de forma síncrona
            setPesoComprado('');
            setValorPago('');
            setCustoCalculado(0);
          } else {
            // Reset cost if changing *from* materia_prima
            const prevType = productTypes.find(pt => pt.id === prev.product_type_id);
            if (prevType && prevType.name.toLowerCase() === 'materia_prima') updatedState.cost = null;
          }
        }

        if (key === 'group_id') {
          updatedState.subgroup_id = null;
        }

        // Clear unit_price if unit changes to Kg
        if (key === 'unit' && processedValue === 'Kg') {
            updatedState.unit_price = null;
        }
        
        // Clear kg_weight/unit_weight based on unit selection
        if (key === 'unit') {
            if (processedValue === 'Kg') updatedState.unit_weight = null;
            if (processedValue === 'UN') updatedState.kg_weight = null;
        }

        return updatedState;
      });

      if (errors[key]) {
        setErrors(prev => { 
          const newErrors = { ...prev }; 
          delete newErrors[key]; 
          return newErrors; 
        });
      }
    } else {
      console.log('[ProductForm] Tentativa de atualizar estado em componente desmontado evitada');
    }
  }, [errors, isFieldDisabled]); // Added isFieldDisabled

  // Validação do Formulário - Definida uma vez
  const validateForm = (): boolean => {
  console.log('[DEBUG validateForm] Iniciando validação. Dados:', JSON.stringify(formData));
    console.log('[DEBUG] Validating formData:', formData);
    const newErrors: Partial<Record<keyof ProductFormData, string>> = {};

    if (!formData.name?.trim()) newErrors.name = 'Nome é obrigatório.';
    if (!formData.product_type_id) newErrors.product_type_id = 'Tipo de produto é obrigatório.';

    // Only validate fields that are NOT disabled
    const checkField = (field: keyof ProductFormData, validation: () => string | null) => {
        if (!isFieldDisabled(field)) {
            const error = validation();
            if (error) newErrors[field] = error;
        }
    }

    checkField('unit', () => !formData.unit ? 'Unidade é obrigatória.' : null);

    // Verificar se o tipo de produto é matéria-prima pelo id
    const isMateriaPrima = formData.product_type_id && productTypes.some(pt => 
        pt.id === formData.product_type_id && pt.name.toLowerCase() === 'materia_prima'
    );
    
    if (isMateriaPrima) {
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
    }
    // Removida validação que forçava unidade 'Kg' para matéria prima
    
    // Verificar se o tipo é receita ou subreceita
    const isReceitaOrSubreceita = formData.product_type_id && productTypes.some(pt => 
        pt.id === formData.product_type_id && 
        (pt.name.toLowerCase() === 'receita' || pt.name.toLowerCase() === 'subreceita')
    );
    
    if (isReceitaOrSubreceita) {
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
    safeSetState(setErrors, newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Função de verificação de nomes similares removida - permitindo nomes duplicados

  // Handler para blur do campo nome - Simplificado (remoção da verificação de duplicidade)
  const handleNameBlur = useCallback(() => {
    // Função vazia - verificação de nomes similares removida
    return;
  }, []);
  
  // Função para executar a submissão do formulário
  const executeSubmit = async (companyId: string) => {
    try {
      // Mapear o product_type_id para o formato esperado pela API (product_type string)
      // A API pode estar esperando 'materia_prima', 'receita' ou 'subreceita'
      let productTypeValue: string | null = null;
      
      if (formData.product_type_id) {
        // Encontrar o tipo pelo ID
        const selectedType = productTypes.find(pt => pt.id === formData.product_type_id);
        
        if (selectedType) {
          // Converter o nome para o formato esperado pela API
          const typeName = selectedType.name.toLowerCase();
          if (typeName.includes('mat')) {
            productTypeValue = 'materia_prima';
          } else if (typeName.includes('receita') && !typeName.includes('sub')) {
            productTypeValue = 'receita';
          } else if (typeName.includes('sub')) {
            productTypeValue = 'subreceita';
          }
          
          console.log(`[ProductForm] Convertendo tipo de produto: ${selectedType.name} -> ${productTypeValue}`);
        }
      }

      // Preparar os dados para submissão conforme a interface SubmissionData
      const submissionData: SubmissionData = {
        ...formData,
        company_id: companyId,
        // Incluir TANTO product_type_id quanto product_type para compatibilidade
        product_type: productTypeValue 
      };
      
      console.log('[ProductForm] Dados de submissão:', submissionData);
      
      await onSubmit(submissionData);
      safeSetState(setSuccessMsg, 'Produto salvo com sucesso!');
      toast.success('Produto salvo com sucesso!');
    } catch (error) {
      console.error('[ProductForm] Erro ao salvar produto:', error);
      safeSetState(setErrorMsg, 'Erro ao salvar produto. Tente novamente.');
      toast.error('Erro ao salvar produto.');
    }
  };

  // Handler para submit do formulário
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    safeSetState(setErrorMsg, null);
    safeSetState(setSuccessMsg, null);
    safeSetState(setErrors, {}); // Clear previous errors

    if (!activeCompany?.id) {
        toast.error('Empresa ativa não encontrada. Faça login novamente.');
        safeSetState(setErrorMsg, 'Empresa ativa não encontrada.');
        return;
    }

    const isValid = validateForm(); // Re-validates and sets errors state
    if (!isValid) {
      console.error('[ProductForm] Erros de validação encontrados:', errors);
      safeSetState(setErrorMsg, 'Verifique os erros no formulário.');
      toast.error('Existem erros no formulário.');
      return;
    }

    // Verificação de nomes duplicados removida para permitir cadastro mais flexível

    // Executa a submissão diretamente sem verificar nomes similares
    await executeSubmit(activeCompany.id);
  }, [formData, errors, validateForm, activeCompany, isFieldDisabled, pesoComprado, valorPago, custoCalculado]);

// ----- JSX do componente -----
  return (
    <div className="relative">
      <form onSubmit={handleSubmit}>
        <Card className="w-full max-w-4xl mx-auto mb-20"> {/* Margem inferior para espaço dos botões fixos */}
        
          {/* Conteúdo com altura limitada e scroll */}
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-6 pt-4">
            {/* Feedback Messages */}
            {errorMsg && <p className="text-red-600 text-sm p-3 mb-3 bg-red-50 border border-red-200 rounded-md">{errorMsg}</p>}
            {successMsg && <p className="text-green-600 text-sm p-3 mb-3 bg-green-50 border border-green-200 rounded-md">{successMsg}</p>}

            {/* Campos básicos do produto - Nome, SKU e Tipo na mesma linha */}
            <div className="flex flex-wrap items-end gap-3 mb-4">
              {/* Nome do Produto - ocupa a maior parte do espaço disponível */}
              <div className="grow">
                <Label htmlFor="name">Nome do Produto *</Label>
                <Input
                  id="name"
                  placeholder="Nome do produto"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={isLoading}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* SKU (Código do Produto) - largura fixa para 6 dígitos */}
              <div className="w-[100px] shrink-0">
                <Label htmlFor="sku" className={errors.sku ? 'text-red-500' : ''}>SKU</Label>
                <Input
                  id="sku"
                  placeholder="Código"
                  value={formData.sku || ''}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  className={errors.sku ? 'border-red-500' : ''}
                  disabled={isLoading || isFieldDisabled('sku')}
                  style={isFieldDisabled('sku') ? disabledFieldStyle : undefined}
                />
                {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku}</p>}
              </div>

              {/* Tipo de Produto - largura fixa baseada no nome "Material de limpeza" */}
              <div className="w-[180px] shrink-0">
                <Label htmlFor="product_type_id">Tipo de Produto *</Label>
                <select
                  id="product_type_id"
                  name="product_type_id"
                  value={formData.product_type_id || ''}
                  onChange={(e) => handleSelectChange('product_type_id', e.target.value)}
                  disabled={isFieldDisabled('product_type_id') || isLoading || isProductTypeForced || hasSystemProductType}
                  className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.product_type_id ? 'border-red-500' : 'border-input'}`}
                  style={isFieldDisabled('product_type_id') || isProductTypeForced || hasSystemProductType ? disabledFieldStyle : undefined}
                >
                  <option value="">Selecione o tipo</option>
                  {productTypes.map((type) => {
                    const isSystemType = SYSTEM_PRODUCT_TYPES.includes(type.name.toLowerCase());
                    // Adicionar aviso visual para tipos do sistema
                    return (
                      <option 
                    key={type.id} 
                    value={type.id}
                    className={isSystemType ? 'font-semibold' : ''}
                  >
                    {isSystemType ? `${type.name} (Sistema)` : type.name}
                  </option>
                );
              })}
            </select>
            {(isFieldDisabled('product_type_id') || isProductTypeForced || hasSystemProductType) && 
              <p className="text-xs text-gray-500 mt-1">
                {hasSystemProductType ? 'Tipo do sistema (protegido)' : 
                 isProductTypeForced ? 'Tipo fixo para esta operação' : 'Não editável'}
              </p>
            }
            {errors.product_type_id && <p className="text-red-500 text-xs mt-1">{errors.product_type_id}</p>}
          </div>
          </div>
            {/* CAMPOS DE MATÉRIA PRIMA - SEMPRE VISÍVEIS */}
              <>
                {/* Custo da Matéria Prima */}
                {!isRecipeProduct && (
                  <Card className="bg-gray-50 p-3 mt-3">
                    <div className="mb-2">
                      <h4 className="text-sm font-medium text-gray-700">Custo da Matéria Prima (por Kg)</h4>
                    </div>
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div>
                          <Label htmlFor="pesoComprado" className="mb-2 block">Peso Comprado (Kg) *</Label>
                          <input 
                            id="pesoComprado" 
                            name="pesoComprado" 
                            type="text" 
                            defaultValue={pesoComprado} 
                            onInput={(e) => {
                              const newValue = e.currentTarget.value;
                              console.log('[PesoComprado] Valor digitado:', newValue);
                              setPesoComprado(newValue);
                            }}
                            placeholder='Ex: 10,5' 
                            disabled={isLoading} 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                          />
                        </div>
                        <div>
                          <Label htmlFor="valorPago" className="mb-2 block">Valor Pago (R$) *</Label>
                          <input 
                            id="valorPago" 
                            name="valorPago" 
                            type="text" 
                            defaultValue={valorPago} 
                            onInput={(e) => {
                              const newValue = e.currentTarget.value;
                              console.log('[ValorPago] Valor digitado:', newValue);
                              setValorPago(newValue);
                            }}
                            placeholder='Ex: 50,00' 
                            disabled={isLoading} 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                          />
                        </div>
                        <div>
                          <Label className="mb-2 block">Custo Calculado (R$/Kg)</Label>
                          <div className="flex h-10 w-full rounded-md border border-input bg-gray-200 px-3 py-2 text-sm font-semibold items-center">
                            R$ {custoCalculado > 0 ? custoCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('.', ',') : '0,00'}
                          </div>
                          {errors.cost && <p className="text-red-500 text-xs mt-1">{errors.cost}</p>}
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Grupo e Subgrupo para Matéria Prima */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="group_id">Grupo</Label>
                    <select
                      id="group_id"
                      className={`w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background ${errors.group_id ? 'border-red-500' : ''}`}
                      style={isFieldDisabled('group_id') ? disabledFieldStyle : undefined}
                      value={formData.group_id ?? ''}
                      onChange={(e) => handleSelectChange('group_id', e.target.value)}
                      disabled={isFieldDisabled('group_id') || isLoading}
                    >
                      <option value="">Selecione o grupo</option>
                      <option value="none">Nenhum</option>
                      {groups?.map((group) => (
                        <option key={group.id} value={group.id.toString()}>{group.name}</option>
                      ))}
                    </select>
                    {isFieldDisabled('group_id') && disabledFieldMessage}
                    {errors.group_id && <p className="text-red-500 text-xs mt-1">{errors.group_id}</p>}
                  </div>
                  <div>
                    <Label htmlFor="subgroup_id">Subgrupo</Label>
                    <select
                      id="subgroup_id"
                      className={`w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background ${errors.subgroup_id ? 'border-red-500' : ''}`}
                      style={isFieldDisabled('subgroup_id') ? disabledFieldStyle : undefined}
                      value={formData.subgroup_id ?? ''}
                      onChange={(e) => handleSelectChange('subgroup_id', e.target.value)}
                      disabled={isFieldDisabled('subgroup_id') || isLoading}
                    >
                      <option value="">{!formData.group_id ? "Selecione um grupo" : "Selecione o subgrupo"}</option>
                      <option value="none">Nenhum</option>
                      {filteredSubgroups?.map((subgroup) => (
                        <option key={subgroup.id} value={subgroup.id.toString()}>{subgroup.name}</option>
                      ))}
                    </select>
                    {isFieldDisabled('subgroup_id') && disabledFieldMessage}
                    {errors.subgroup_id && <p className="text-red-500 text-xs mt-1">{errors.subgroup_id}</p>}
                  </div>
                </div>

                {/* Checkbox de Produto Ativo movido para a seção geral do formulário */}
              </>
            {/* CAMPOS DE RECEITA E SUB-RECEITA - SEMPRE VISÍVEIS */}
              <div className="space-y-4">
                {/* Dias de Produção */}
                <div className="space-y-2 pt-4">
                  <Label className={errors.monday ? 'text-red-500' : ''}>Dias de Produção</Label>
                  <div className={`flex flex-wrap gap-x-6 gap-y-2 items-center p-3 border rounded-md ${errors.monday ? 'border-red-500' : ''}`}>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="all_days" 
                        checked={allWeekdaysChecked} 
                        onCheckedChange={handleAllDaysChange} 
                        disabled={isLoading}
                        className={allWeekdaysChecked ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600 hover:text-white' : 'bg-white text-gray-500 border-gray-300'}
                      />
                      <Label 
                        htmlFor="all_days" 
                        className={allWeekdaysChecked ? 'text-amber-700 font-medium' : 'text-gray-500'}
                      >
                        Todos os dias
                      </Label>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {weekdays.map((day) => {
                        const isChecked = toBoolean(formData[day.key]);
                        return (
                          <div key={day.key} className="flex items-center space-x-2">
                            <Checkbox 
                              id={day.key} 
                              checked={isChecked} 
                              onCheckedChange={(checked) => handleWeekdayChange(day.key as WeekdayKey, checked as boolean)} 
                              disabled={isLoading}
                              className={isChecked ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600 hover:text-white' : 'bg-white text-gray-500 border-gray-300'}
                            />
                            <Label 
                              htmlFor={day.key} 
                              className={isChecked ? 'text-amber-700 font-medium' : 'text-gray-500'}
                            >
                              <span translate="no">{day.label}</span>
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {errors.monday && <p className="text-red-500 text-xs mt-1">{errors.monday}</p>}
                </div>

                {/* Campo de Setor (opcional) */}
                <div className="col-span-6 sm:col-span-3">
                  <label htmlFor="setor_id" className="block text-sm font-medium text-gray-700">
                    Setor (opcional)
                  </label>
                  <select
                    id="setor_id"
                    name="setor_id"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                    value={formData.setor_id || ''}
                    onChange={(e) => setFormData({ ...formData, setor_id: e.target.value || null })}
                  >
                    <option value="">Selecione um setor</option>
                    {setores.map((setor) => (
                      <option key={setor.id} value={setor.id}>
                        {setor.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Selecione o setor responsável pela produção deste item
                  </p>
                </div>

                {/* Produto Ativo */}
                <div className="flex items-center space-x-2 mt-4">
                  <Checkbox 
                    id="ativo" 
                    name="ativo" 
                    checked={formData.ativo} 
                    onCheckedChange={(checked) => handleSelectChange('ativo', checked ? 'true' : 'false')} 
                    disabled={isFieldDisabled('ativo') || isLoading} 
                    style={isFieldDisabled('ativo') ? disabledFieldStyle : undefined}
                    className={formData.ativo ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600 hover:text-white' : 'bg-white text-gray-500 border-gray-300'}
                  />
                  <Label htmlFor="ativo" className={formData.ativo ? 'text-amber-700 font-medium' : 'text-gray-500'}>Produto Ativo?</Label>
                </div>
              </div>
            {/* Fim do conteúdo principal */}
          </div>
        </Card>
        
        {/* Botões de ação fixos na parte inferior */}
        <div className="fixed bottom-0 left-0 right-0 py-4 px-6 bg-white border-t border-gray-200 dark:bg-gray-950 dark:border-gray-800 shadow-md flex justify-end space-x-2 z-50">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel} 
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            className={`${isLoading ? 'bg-gray-500 cursor-not-allowed' : ''}`}
          >
            {isEditMode ? 'Salvar Alterações' : 'Cadastrar Produto'}
            {isLoading ? ' ...' : ''}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;