-- 1. Adicionar campo is_deleted na tabela products (se ainda não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.products ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
  END IF;
END;
$$;

-- 2. Modificar a função de soft delete para também inativar produtos
CREATE OR REPLACE FUNCTION public.soft_delete_recipe(p_recipe_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_success BOOLEAN := TRUE;
BEGIN
  -- Marcar receita como excluída
  UPDATE public.recipes
  SET is_deleted = TRUE
  WHERE id = p_recipe_id;
  
  -- Marcar produtos associados a esta receita como excluídos
  UPDATE public.products
  SET is_deleted = TRUE
  WHERE recipe_id = p_recipe_id;
  
  RETURN v_success;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao marcar receita como excluída: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar uma view para produtos ativos
CREATE OR REPLACE VIEW public.active_products AS
SELECT * FROM public.products WHERE is_deleted = FALSE;

-- 4. Criar função que retorna apenas produtos ativos e sem vínculo com receitas excluídas
CREATE OR REPLACE FUNCTION public.get_active_products(p_company_id UUID)
RETURNS SETOF public.products AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM public.products p
  LEFT JOIN public.recipes r ON p.recipe_id = r.id
  WHERE p.company_id = p_company_id
    AND p.is_deleted = FALSE
    AND (p.recipe_id IS NULL OR (r.id IS NOT NULL AND r.is_deleted = FALSE));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
