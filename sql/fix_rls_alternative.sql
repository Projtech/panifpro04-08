-- Desabilita temporariamente o RLS
ALTER TABLE recipes DISABLE ROW LEVEL SECURITY;

-- Remove políticas existentes
DROP POLICY IF EXISTS "Public recipes Select" ON recipes;
DROP POLICY IF EXISTS "Users can insert recipes" ON recipes;
DROP POLICY IF EXISTS "Users can update recipes" ON recipes;
DROP POLICY IF EXISTS "Users can delete recipes" ON recipes;

-- Cria novas políticas permissivas
-- Política para SELECT
CREATE POLICY "Public recipes Select" ON recipes
    FOR SELECT
    USING (true);

-- Política para INSERT
CREATE POLICY "Users can insert recipes" ON recipes
    FOR INSERT
    WITH CHECK (true);

-- Política para UPDATE
CREATE POLICY "Users can update recipes" ON recipes
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Política para DELETE
CREATE POLICY "Users can delete recipes" ON recipes
    FOR DELETE
    USING (true);

-- Verifica se as políticas foram criadas
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'recipes';

-- Reabilita o RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
