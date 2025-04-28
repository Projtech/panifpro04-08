import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Info } from 'lucide-react';
import { findSimilarProductsByName } from '@/services/productService';
import { toast } from 'sonner';
import { parseDecimalBR } from '@/lib/numberUtils';
// Corrected Type Imports
import { Database } from '@/integrations/supabase/types'; // Import the Database type
import { Group, Subgroup } from '@/services/groupService'; // Subgroup type already correct

// Define Product type from Supabase schema
type Product = Database['public']['Tables']['products']['Row'];
// Define the shape of the form data. For a general form, using Omit<Product, 'id'> is reasonable
// Note: Supabase Insert/Update types might be more precise if needed separately
// Ajustar os campos group_id e subgroup_id para string | null
// (Supabase aceita UUID como string)
type ProductFormData = Omit<Product, 'id' | 'type_enum_old' | 'type'> & {
  group_id: string | null;
  subgroup_id: string | null;
  unit: string;
  product_type: 'materia_prima' | 'subreceita' | 'receita' | null;
};

interface ProductFormProps {
  initialData?: Product | null; // Use the correct Product type
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  isEditMode: boolean;
  groups: Group[];
  subgroups: Subgroup[];
}

// Helper to safely convert value to number or keep null/undefined
const toNumberOrNull = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
};

const ProductForm: React.FC<ProductFormProps> = ({ 
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  isEditMode,
  groups,
  subgroups 
}) => {

  // Default form state based on the correct schema
  const getDefaultFormData = (): ProductFormData => ({
    name: '',
    sku: '',
    unit: 'UN',
    supplier: null,
    cost: 0,
    current_stock: null,
    min_stock: 0,
    group_id: null, // string | null
    subgroup_id: null, // string | null
    code: null,
    kg_weight: null,
    unit_price: null,
    unit_weight: null,
    recipe_id: null,
    product_type: null,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
    all_days: false,
  });

  const [formData, setFormData] = useState<ProductFormData>(getDefaultFormData());

  // --- Etapa 1.1: Estados locais para Matéria Prima ---
  const [pesoComprado, setPesoComprado] = useState<string>('');
  const [valorPago, setValorPago] = useState<string>('');
  const [custoCalculado, setCustoCalculado] = useState<number>(0);

  // Atualiza custo automaticamente ao mudar peso/valor
  useEffect(() => {
    if (formData.product_type === 'materia_prima') {
      const peso = parseDecimalBR(pesoComprado);
      const valor = parseDecimalBR(valorPago);
      if (!isNaN(peso) && peso > 0 && !isNaN(valor) && valor >= 0) {
        setCustoCalculado(valor / peso);
      } else {
        setCustoCalculado(0);
      }
    }
  }, [pesoComprado, valorPago, formData.product_type]);

  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({}); // Initialize errors
  const [filteredSubgroups, setFilteredSubgroups] = useState<Subgroup[]>(subgroups);
  const [similarNames, setSimilarNames] = useState<string[]>([]);
  const [showSimilarAlert, setShowSimilarAlert] = useState(false);
  const [hasExactName, setHasExactName] = useState(false); // NOVO: controla se existe nome igual
  const [pendingSubmit, setPendingSubmit] = useState<null | (() => void)>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Variável para controlar se estamos editando um produto que é receita/subreceita
  const isRecipeProductEdit = isEditMode && (formData.product_type === 'receita' || formData.product_type === 'subreceita');
  // O campo tipo nunca pode ser alterado manualmente, apenas exibido


  // Populate form with initial data if provided (for editing)
  useEffect(() => {
    if (initialData && isEditMode) {
      console.log("[ProductForm] Loading initialData:", initialData);
      // Create form state from initialData, ensuring all keys exist
      const { 
        // Example: remove fields not in ProductFormData if needed
        // price_details, 
        // production_details,
        ...safeInitialData 
      } = initialData as any; // Use 'as any' carefully or type initialData better upstream
      const initialFormState = { ...getDefaultFormData(), ...safeInitialData };
      setFormData(initialFormState);

      // Filter subgroups based on initial group_id
      if (initialData.group_id) {
        setFilteredSubgroups(subgroups.filter(sg => sg.group_id === initialData.group_id));
      } else {
        setFilteredSubgroups(subgroups); // Show all if no group initially
      }
    } else {
      // Reset form for creation mode or if initialData is null
      // Detectar origem: novo produto via tela de produtos (sem initialData)
      const isNovoViaTelaProdutos = !initialData && !isEditMode;
      if (isNovoViaTelaProdutos) {
        setFormData({
          ...getDefaultFormData(),
          product_type: 'materia_prima',
        });
      } else {
        setFormData(getDefaultFormData());
      }
      setFilteredSubgroups(subgroups); // Show all subgroups initially in create mode
    }
  }, [initialData, isEditMode, subgroups]);

  // Update filtered subgroups when group changes
  useEffect(() => {
    if (formData.group_id) {
      const newFiltered = subgroups.filter(sg => String(sg.group_id) === String(formData.group_id));
      setFilteredSubgroups(newFiltered);
      // Reset subgroup selection if o subgrupo atual não pertence ao grupo selecionado
      if (formData.subgroup_id && !newFiltered.some(sg => String(sg.id) === String(formData.subgroup_id))) {
        setFormData(prev => ({ ...prev, subgroup_id: null }));
      }
    } else {
      setFilteredSubgroups(subgroups);
      if (formData.subgroup_id) {
        setFormData(prev => ({ ...prev, subgroup_id: null }));
      }
    }
  }, [formData.group_id, formData.subgroup_id, subgroups]);

  // Generic change handler for simple inputs
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const key = name as keyof ProductFormData;

    // Use 'checked' for checkboxes, 'value' otherwise
    let newValue: string | number | boolean | null = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    // Convert to number if the input type is number, preserving null/emptiness
    if (type === 'number') {
      newValue = toNumberOrNull(value);
    } 

    // Handle specific boolean/null fields if needed, though checkbox handling covers booleans
    // Example: if (key === 'some_nullable_boolean') newValue = value === 'true' ? true : value === 'false' ? false : null;

    // Update state
    setFormData(prev => ({
      ...prev,
      [key]: newValue,
    }));

    // Clear error for the field being changed
    if (errors[key]) {
      setErrors(prev => { 
        const newErrors = { ...prev };
        delete newErrors[key]; // Remove the specific error
        return newErrors;
      });
    }
  }, [errors]);

  // Change handler para Selects: agora aceita apenas string ou null (sem conversão para número)
  // E ajusta 'unit' se o tipo for 'materia_prima'
  const handleSelectChange = useCallback((name: keyof ProductFormData, value: string | null) => {
    console.log(`[Debug] handleSelectChange: Campo='${name}', Valor Novo='${value}'`); // Log 1

    const newValue = value === '' ? null : value;

    setFormData(prev => {
      const updatedState = {
        ...prev,
        [name]: newValue,
      };

      // Se o campo alterado for 'product_type' e o valor for 'materia_prima',
      // atualiza 'unit' para 'Kg' na mesma chamada setFormData.
      if (name === 'product_type' && newValue === 'materia_prima') {
        updatedState.unit = 'Kg';
        // Limpar campos de peso/valor se mudar para matéria prima
        setPesoComprado('');
        setValorPago('');
        setCustoCalculado(0); // Resetar custo calculado
      } else if (name === 'product_type' && newValue !== 'materia_prima') {
        // Se mudar de matéria prima para outro tipo, resetar custo
        // e talvez a unidade, se necessário (ex: voltar para 'UN' como padrão?)
        // Por enquanto, só resetamos o custo. A unidade será obrigatória na validação.
        updatedState.cost = 0; // Resetar o custo se não for mais matéria prima
      }

      if (name === 'group_id') {
        updatedState.subgroup_id = null; // Reset subgroup when group changes
        console.log('[Debug] handleSelectChange: Resetando subgroup_id para null'); // Log 2
      }

      console.log('[Debug] handleSelectChange: Estado atualizado ->', updatedState); // Log 3
      return updatedState;
    });

    // Limpa erro do campo alterado
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  // Validation logic (example)
  const validateForm = (): boolean => {
    // DEBUG: Verificar o valor do formData no momento da validação
    console.log('[DEBUG] formData:', formData);

    const newErrors: Partial<Record<keyof ProductFormData, string>> = {};
    if (!formData.name?.trim()) {
      newErrors.name = 'Nome é obrigatório.';
    }

    if (formData.product_type !== 'materia_prima' && !formData.unit) {
      newErrors.unit = 'Unidade é obrigatória.';
    }
    if (formData.product_type !== 'materia_prima' && (formData.cost === null || formData.cost < 0)) {
      newErrors.cost = 'Custo deve ser um número não negativo.';
    }

    // Só valida unit_weight e kg_weight se NÃO for matéria prima
    if (formData.product_type !== 'materia_prima') {
      if (formData.unit && formData.unit.toLowerCase() === 'kg') {
        if (!formData.kg_weight || formData.kg_weight <= 0) {
          newErrors.kg_weight = 'Para produtos em kg, informe o preço por kg (R$)';
        }
      } else if (formData.unit && formData.unit.toLowerCase() === 'un') {
        if (!formData.unit_weight || formData.unit_weight <= 0) {
          newErrors.unit_weight = 'Para produtos em unidades, informe o peso por unidade (kg)';
        }
      }
    }
    if (formData.unit_price !== null && formData.unit_price < 0) {
      newErrors.unit_price = 'Preço unitário não pode ser negativo.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Checagem de nomes semelhantes e iguais
  const checkSimilarNamesAndExact = async (name: string) => {
    if (!name || name.trim().length < 3) return { similars: [], exact: false };
    const results = await findSimilarProductsByName(name.trim());
    const lowerTyped = name.trim().toLowerCase();
    // Se estiver editando, ignore o produto atual pelo id
    const filtered = isEditMode && initialData?.id
      ? results.filter(prod => prod.id !== initialData.id)
      : results;
    const similars = filtered.filter(prod => prod.name.toLowerCase() !== lowerTyped).map(prod => prod.name);
    const exact = filtered.some(prod => prod.name.toLowerCase() === lowerTyped);
    return { similars, exact };
  };

  // Handler para blur do campo nome
  const handleNameBlur = async () => {
    const name = formData.name;
    const { similars, exact } = await checkSimilarNamesAndExact(name);
    setHasExactName(exact);
    setSimilarNames(similars);
    setShowSimilarAlert(similars.length > 0);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!validateForm()) {
      console.log('[ProductForm] Erros de validação:', errors);
      setErrorMsg('Preencha todos os campos obrigatórios corretamente.');
      return;
    }
    // BLOQUEIO: Nome igual já existe
    if (hasExactName) {
      setErrorMsg('Já existe um produto cadastrado com este nome. Escolha um nome diferente.');
      return;
    }
    // BLOQUEIO: Nome parecido, só prossegue se já confirmou
    if (showSimilarAlert && similarNames.length > 0 && !pendingSubmit) {
      setErrorMsg('Existem produtos com nomes parecidos. Confirme se deseja cadastrar assim mesmo.');
      return;
    }
    setLoading(true);
    let finalCost = formData.cost;
    let finalUnit = formData.unit;
    // Lógica específica para matéria prima
    if (formData.product_type === 'materia_prima') {
      const pesoNum = parseDecimalBR(pesoComprado);
      const valorNum = parseDecimalBR(valorPago);
      if (isNaN(pesoNum) || pesoNum <= 0 || isNaN(valorNum) || valorNum < 0) {
        setErrorMsg('Peso comprado e Valor pago devem ser números válidos e positivos para Matéria Prima.');
        setLoading(false);
        return;
      }
      finalCost = custoCalculado;
      finalUnit = 'Kg';
    }
    try {
      // Checar nomes semelhantes antes de submeter
      const { similars, exact } = await checkSimilarNamesAndExact(formData.name);
      if (exact) {
        setHasExactName(true);
        setErrorMsg('Já existe um produto cadastrado com este nome. Escolha um nome diferente.');
        setLoading(false);
        return;
      }
      if (similars.length > 0) {
        setSimilarNames(similars);
        setShowSimilarAlert(true);
        setPendingSubmit(() => async () => {
          setLoading(true);
          try {
            // Preparar dados para envio, ajustando decimais e limpando campos
            let formDataAjustado: Partial<ProductFormData> = {
              // Incluir todos os campos por padrão
              ...formData,
              // Sobrescrever numéricos com valores parseados
              cost: Number(parseDecimalBR(finalCost?.toString() ?? '')),
              unit: finalUnit,
              unit_price: Number(parseDecimalBR(formData.unit_price?.toString() ?? '')),
              unit_weight: Number(parseDecimalBR(formData.unit_weight?.toString() ?? '')),
              kg_weight: Number(parseDecimalBR(formData.kg_weight?.toString() ?? '')),
              product_type: formData.product_type,
            };

            // Omitir campos irrelevantes para matéria prima
            if (formDataAjustado.product_type === 'materia_prima') {
              delete formDataAjustado.unit_price;
              delete formDataAjustado.unit_weight;
              delete formDataAjustado.kg_weight;
              // Forçar unit para Kg se ainda não estiver (segurança extra)
              formDataAjustado.unit = 'Kg';
              // Garantir que cost seja o calculado
              formDataAjustado.cost = custoCalculado;
            }

            console.log('[ProductForm] Dados enviados para cadastro:', formDataAjustado);
            // Se não houver nomes semelhantes, submeter normalmente
            await onSubmit(formDataAjustado as ProductFormData); // Cast para garantir tipo
            setSuccessMsg('Produto cadastrado com sucesso!');
          } catch (err: any) {
            console.error('Erro ao salvar produto:', err);
            console.error("Raw error received from onSubmit:", JSON.stringify(err, null, 2));
            // Tenta mostrar mensagem mais detalhada do backend, se existir
            setErrorMsg(err?.message || err?.error_description || 'Erro ao cadastrar produto.');
          } finally {
            setLoading(false);
          }
        });
        setLoading(false);
        return;
      }
      // Preparar dados para envio, ajustando decimais e limpando campos
      let formDataAjustado: Partial<ProductFormData> = {
        // Incluir todos os campos por padrão
        ...formData,
        // Sobrescrever numéricos com valores parseados
        cost: Number(parseDecimalBR(finalCost?.toString() ?? '')),
        unit: finalUnit,
        unit_price: Number(parseDecimalBR(formData.unit_price?.toString() ?? '')),
        unit_weight: Number(parseDecimalBR(formData.unit_weight?.toString() ?? '')),
        kg_weight: Number(parseDecimalBR(formData.kg_weight?.toString() ?? '')),
        product_type: formData.product_type,
      };

      // Omitir campos irrelevantes para matéria prima
      if (formDataAjustado.product_type === 'materia_prima') {
        delete formDataAjustado.unit_price;
        delete formDataAjustado.unit_weight;
        delete formDataAjustado.kg_weight;
        // Forçar unit para Kg se ainda não estiver (segurança extra)
        formDataAjustado.unit = 'Kg';
        // Garantir que cost seja o calculado
        formDataAjustado.cost = custoCalculado;
      }

      console.log('[ProductForm] Dados enviados para cadastro:', formDataAjustado);
      // Se não houver nomes semelhantes, submeter normalmente
      await onSubmit(formDataAjustado as ProductFormData); // Cast para garantir tipo
      setSuccessMsg('Produto cadastrado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar produto:', err);
      console.error("Raw error received from onSubmit:", JSON.stringify(err, null, 2));
      // Tenta mostrar mensagem mais detalhada do backend, se existir
      setErrorMsg(err?.message || err?.error_description || 'Erro ao cadastrar produto.');
    } finally {
      setLoading(false);
    }
  };

  // Confirmação do usuário para continuar mesmo com nomes semelhantes
  const handleConfirmSimilar = async () => {
    setShowSimilarAlert(false);
    if (pendingSubmit) {
      await pendingSubmit();
      setPendingSubmit(null);
    }
  };

  const handleCancelSimilar = () => {
    setShowSimilarAlert(false);
    setPendingSubmit(null);
  };

  // Define weekdays based on the schema field names
  const weekdays = [
    { key: 'monday', label: 'Seg' },
    { key: 'tuesday', label: 'Ter' },
    { key: 'wednesday', label: 'Qua' },
    { key: 'thursday', label: 'Qui' },
    { key: 'friday', label: 'Sex' },
    { key: 'saturday', label: 'Sáb' },
    { key: 'sunday', label: 'Dom' },
  ] as const;

  type WeekdayKey = typeof weekdays[number]['key'];

  const handleWeekdayChange = useCallback((day: WeekdayKey, checked: boolean) => {    
    const newState = { ...formData, [day]: checked };
    const allIndividualDaysChecked = weekdays.every(weekday => newState[weekday.key]);
    newState.all_days = allIndividualDaysChecked;
    setFormData(newState);
  }, [formData]);

  const handleAllDaysChange = useCallback((checked: boolean) => {
    const updatedDays: Partial<ProductFormData> = { all_days: checked };
    weekdays.forEach(day => {
      updatedDays[day.key] = checked;
    });
    setFormData(prev => ({ ...prev, ...updatedDays }));
  }, []);

  const allWeekdaysChecked = weekdays.every(day => formData[day.key]);

  const isSubgroupDisabled = isRecipeProductEdit || !formData.group_id;
  console.log(`[Debug] Render: isRecipeProductEdit=${isRecipeProductEdit}, formData.group_id='${formData.group_id}', Calculado Subgrupo Disabled=${isSubgroupDisabled}`); // Log 4

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? 'Editar Produto' : 'Adicionar Novo Produto'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mensagens de Erro/Sucesso */} 
          {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
          {successMsg && <p className="text-green-500 text-sm">{successMsg}</p>} 

          {/* Alerta de Nomes Semelhantes */} 
          {showSimilarAlert && similarNames.length > 0 && (
            <div className="p-4 bg-yellow-100 border border-yellow-300 rounded-md text-sm text-yellow-800">
              <p><strong>Atenção:</strong> Produtos com nomes parecidos encontrados:</p>
              <ul className="list-disc list-inside ml-4">
                {similarNames.map((name, idx) => <li key={idx}>{name}</li>)}
              </ul>
              <p className="mt-2">Deseja cadastrar este produto mesmo assim?</p>
              <div className="mt-2 space-x-2">
                <Button size="sm" variant="outline" onClick={handleConfirmSimilar}>Sim, cadastrar</Button>
                <Button size="sm" variant="destructive" onClick={handleCancelSimilar}>Não, cancelar</Button>
              </div>
            </div>
          )}

          {/* Linha 1: Nome e Tipo */} 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} onBlur={handleNameBlur} className={errors.name ? 'border-red-500' : ''} disabled={isRecipeProductEdit} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              {hasExactName && <p className="text-red-500 text-xs mt-1">Já existe um produto com este nome.</p>} 
            </div>
            <div>
              <Label htmlFor="product_type">Tipo *</Label>
              {/* Lógica para exibir o campo tipo conforme o fluxo */}
              {isEditMode || isRecipeProductEdit ? (
                <Input
                  id="product_type"
                  name="product_type"
                  value={
                    formData.product_type === 'materia_prima' ? 'Matéria Prima' :
                    formData.product_type === 'receita' ? 'Receita' :
                    formData.product_type === 'subreceita' ? 'SubReceita' : ''
                  }
                  disabled
                  className="bg-gray-100"
                />
              ) : (
                // Novo produto via tela de produtos: campo oculto e valor fixo
                <Input
                  id="product_type"
                  name="product_type"
                  value="Matéria Prima"
                  disabled
                  className="bg-gray-100"
                />
              )}
              <p className="text-xs text-gray-500 mt-1">O tipo do produto não pode ser alterado após o cadastro.</p>
            </div>
          </div>

          {/* Campos específicos para Matéria Prima */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md bg-gray-50">
            <div>
              <Label htmlFor="pesoComprado">Peso Comprado (Kg)</Label>
              <Input id="pesoComprado" name="pesoComprado" type="text" inputMode='decimal' value={pesoComprado} onChange={(e) => setPesoComprado(e.target.value)} placeholder='Ex: 10,5' disabled={isRecipeProductEdit} />
            </div>
            <div>
              <Label htmlFor="valorPago">Valor Pago (R$)</Label>
              <Input id="valorPago" name="valorPago" type="text" inputMode='decimal' value={valorPago} onChange={(e) => setValorPago(e.target.value)} placeholder='Ex: 50,00' disabled={isRecipeProductEdit} />
            </div>
            <div>
              <Label>Custo Calculado (R$/Kg)</Label>
              <Input value={custoCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} readOnly disabled className='bg-gray-100' />
            </div>
          </div>

          {/* Grupo and Subgrupo */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Grupo */}
            <div className="space-y-2">
              <Label htmlFor="group">Grupo</Label>
              <Select
                value={formData.group_id ?? ''}
                onValueChange={(value) => handleSelectChange('group_id', value)}
                disabled={isRecipeProductEdit}
              >
                <SelectTrigger
                  id="group"
                  className={errors.group_id ? 'border-red-500' : ''}
                  disabled={isRecipeProductEdit}
                >
                  <SelectValue placeholder="Selecione o grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groups?.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.group_id && <p className="text-sm text-red-500">{errors.group_id}</p>}
            </div>

            {/* Subgrupo */}
            <div className="space-y-2">
              <Label htmlFor="subgroup">Subgrupo</Label>
              <Select
                value={formData.subgroup_id ?? ''}
                onValueChange={(value) => handleSelectChange('subgroup_id', value)}
                disabled={isSubgroupDisabled}
              >
                <SelectTrigger
                  id="subgroup"
                  className={errors.subgroup_id ? 'border-red-500' : ''}
                  disabled={isSubgroupDisabled}
                >
                  <SelectValue placeholder="Selecione o subgrupo" />
                </SelectTrigger>
                <SelectContent>
                  {/* Filter subgroups based on selected group */}
                  {filteredSubgroups
                    ?.map((subgroup) => (
                      <SelectItem key={subgroup.id} value={subgroup.id}>
                        {subgroup.name}
                      </SelectItem>
                    ))} 
                </SelectContent>
              </Select>
              {errors.subgroup_id && <p className="text-sm text-red-500">{errors.subgroup_id}</p>}
            </div>
          </div>


          {/* Linha 3: Unidade, Peso Unidade/Kg, Preço */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="unit">Unidade de Venda *</Label>
              <Select name="unit" value={formData.unit ?? ''} onValueChange={(value) => handleSelectChange('unit', value)} disabled={isRecipeProductEdit}>
                <SelectTrigger id="unit" className={errors.unit ? 'border-red-500' : ''} disabled={isRecipeProductEdit}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UN">Unidade (UN)</SelectItem>
                  <SelectItem value="Kg">Quilograma (Kg)</SelectItem>
                  {/* Adicionar outras unidades se necessário */}
                </SelectContent>
              </Select>
              {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit}</p>} 
            </div>
            <div>
              {formData.unit === 'Kg' ? (
                <>
                  <Label htmlFor="kg_weight">Preço por Kg (R$) *</Label>
                  <Input id="kg_weight" name="kg_weight" type="text" inputMode='decimal' value={formData.kg_weight ?? ''} onChange={handleChange} placeholder='Ex: 25,50' className={errors.kg_weight ? 'border-red-500' : ''} disabled={isRecipeProductEdit} />
                  {errors.kg_weight && <p className="text-red-500 text-xs mt-1">{errors.kg_weight}</p>} 
                </>
              ) : (
                <>
                  <Label htmlFor="unit_weight">Peso por Unidade (Kg) *</Label>
                  <Input id="unit_weight" name="unit_weight" type="text" inputMode='decimal' value={formData.unit_weight ?? ''} onChange={handleChange} placeholder='Ex: 0,550' className={errors.unit_weight ? 'border-red-500' : ''} disabled={isRecipeProductEdit} />
                  {errors.unit_weight && <p className="text-red-500 text-xs mt-1">{errors.unit_weight}</p>} 
                </>
              )}
            </div>
            <div>
              <Label htmlFor="unit_price">Preço de Venda (Un)</Label>
              <Input id="unit_price" name="unit_price" type="text" inputMode='decimal' value={formData.unit_price ?? ''} onChange={handleChange} placeholder='Ex: 5,99' className={errors.unit_price ? 'border-red-500' : ''} disabled={formData.unit === 'Kg' || isRecipeProductEdit} />
              {errors.unit_price && <p className="text-red-500 text-xs mt-1">{errors.unit_price}</p>}
            </div>
          </div>

          {/* Linha 4: Dias da Semana */} 
          <div className="space-y-2">
            <Label>Dias de Produção</Label>
            <div className="flex flex-wrap gap-4 items-center p-3 border rounded-md">
              <div className="flex items-center space-x-2">
                <Checkbox id="all_days" checked={allWeekdaysChecked} onCheckedChange={handleAllDaysChange} />
                <Label htmlFor="all_days" className="font-medium">Todos os dias</Label>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {weekdays.map((day) => (
                  <div key={day.key} className="flex items-center space-x-2">
                    <Checkbox 
                      id={day.key} 
                      checked={formData[day.key]} 
                      onCheckedChange={(checked) => handleWeekdayChange(day.key, !!checked)} 
                    />
                    <Label htmlFor={day.key}>{day.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Botões de Ação */} 
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancelar</Button>
            <Button type="submit" disabled={isLoading || showSimilarAlert || hasExactName}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEditMode ? 'Salvar Alterações' : 'Cadastrar Produto'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

// Add the default export
export default ProductForm;
