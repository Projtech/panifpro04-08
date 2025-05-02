-- Desabilita temporariamente o RLS
ALTER TABLE recipes DISABLE ROW LEVEL SECURITY;

-- Remove políticas existentes
DROP POLICY IF EXISTS "Public recipes Select" ON recipes;
DROP POLICY IF EXISTS "Users can insert recipes" ON recipes;
DROP POLICY IF EXISTS "Users can update recipes" ON recipes;
DROP POLICY IF EXISTS "Users can delete recipes" ON recipes;

-- Cria novas políticas
-- Política para SELECT
CREATE POLICY "Public recipes Select" ON recipes
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Política para INSERT
CREATE POLICY "Users can insert recipes" ON recipes
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Política para UPDATE
CREATE POLICY "Users can update recipes" ON recipes
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Política para DELETE
CREATE POLICY "Users can delete recipes" ON recipes
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- Verifica se as políticas foram criadas
SELECT policyname, policycmd, policyqual, policywithcheck
FROM pg_policies
WHERE tablename = 'recipes';

-- Reabilita o RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
