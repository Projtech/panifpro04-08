import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import ProductForm, { ProductFormData, SubmissionData } from '@/components/ProductForm';
import { createProduct } from '@/services/productService';
import { getGroups, getSubgroups, Group, Subgroup } from "@/services/groupService";
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import { Loader2 } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';

// Define types locally based on the Database schema
type Product = Database['public']['Tables']['products']['Row'];

function NovoProduto() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [initialLoading, setInitialLoading] = useState(true); // Loading state for initial data fetch
  
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

  // Fetch groups and subgroups on component mount
  useEffect(() => {
    // Use AbortController for cleanup
    const abortController = new AbortController();
    const signal = abortController.signal;

    const loadDropdownData = async () => {
      if (authLoading || !activeCompany?.id) return;
      try {
        // Pass signal to fetch functions if they support it.
        // Assuming getGroups/getSubgroups might not support it directly,
        // we check the signal before setting state.
        const [fetchedGroups, fetchedSubgroups] = await Promise.all([
          getGroups(activeCompany.id), // If getGroups supported signal: getGroups(activeCompany.id, { signal })
          getSubgroups(activeCompany.id) // If getSubgroups supported signal: getSubgroups(activeCompany.id, { signal })
        ]);

        // Only update state if the component is still mounted
        if (!signal.aborted) {
          setGroups(fetchedGroups);
          setSubgroups(fetchedSubgroups);
        }
      } catch (error: any) {
        // Don't update state or show toast if aborted
        if (!signal.aborted) {
          console.error("Erro ao buscar dados para formulário:", error);
          toast.error("Falha ao carregar opções de grupo/subgrupo.");
          // Optionally navigate back or show an error state
        }
      } finally {
        // Only update loading state if the component is still mounted
        if (!signal.aborted) {
          setInitialLoading(false);
        }
      }
    };

    loadDropdownData();

    // Cleanup function
    return () => {
      abortController.abort(); // Abort fetch requests on unmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, activeCompany?.id]);

  // Handle form submission (creation)
  const handleCreateSubmit = async (formData: SubmissionData) => {
    if (authLoading || !activeCompany?.id) {
      toast.error("Empresa ativa não carregada. Tente novamente mais tarde.");
      return;
    }
    setLoading(true);
    try {
      console.log('[handleCreateSubmit] Payload recebido do ProductForm:', formData);
      const newProduct = await createProduct(formData, activeCompany.id);
      if (!newProduct) {
        throw new Error("Falha ao criar produto. Resposta inesperada do servidor.");
      }
      toast.success(`Produto "${newProduct.name}" criado com sucesso!`);
      
      // Se estamos retornando para a tela de receitas, navegar de volta com o ID do produto criado
      if (returnToRecipe) {
        if (recipeId) {
          navigate(`/recipes/${recipeId}/edit`, { 
            state: { 
              fromProductCreation: true,
              newProductId: newProduct.id,
              newProductName: newProduct.name
            } 
          });
        } else {
          navigate(`/recipes/new`, { 
            state: { 
              fromProductCreation: true,
              newProductId: newProduct.id,
              newProductName: newProduct.name
            } 
          });
        }
      } else {
        // Caso contrário, navegar de volta para a lista de produtos
        navigate('/products');
      }
    } catch (error: any) {
      console.error('[handleCreateSubmit] Erro ao criar produto:', error);
      toast.error(`Falha ao criar produto: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Define initial data with correct type
  const newProductInitialData: Partial<ProductFormData> = {
    name: '',
    sku: '',
    unit: 'UN',
    supplier: null,
    cost: 0,
    current_stock: null,
    min_stock: 0,
    group_id: null,
    subgroup_id: null,
    code: null,
    kg_weight: null,
    unit_price: null,
    unit_weight: null,
    recipe_id: null,
    product_type: 'materia_prima',
    ativo: true,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
    all_days: false
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-bakery-brown" />
        <p className="ml-2 text-gray-500">Carregando dados do formulário...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 animate-fade-in">
      {/* <h1 className="text-2xl font-bold mb-6">Novo Produto</h1> REMOVED - ProductForm has title */}
      {/* Replace the placeholder with the actual form */}
      <ErrorBoundary fallback={<div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <h3 className="text-lg font-medium text-red-800">Erro ao carregar o formulário</h3>
        <p className="text-red-600">Ocorreu um erro ao renderizar o formulário de produto. Por favor, tente novamente ou contate o suporte.</p>
        <button 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          onClick={() => navigate(-1)}
        >
          Voltar
        </button>
      </div>}>
        <ProductForm
          initialData={newProductInitialData}
          onSubmit={handleCreateSubmit}
          onCancel={() => navigate(-1)} // Navigate back on cancel
          isLoading={loading}
          groups={groups}
          subgroups={subgroups}
          isEditMode={false}
        />
      </ErrorBoundary>
      {/* Remove the cancel button here as ProductForm has its own */}
      {/* <button className="mt-4 btn" onClick={() => navigate(-1)}>Cancelar</button> */}
    </div>
  );
}

export default NovoProduto;
