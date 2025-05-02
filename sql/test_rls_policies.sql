-- Verifica as políticas RLS atuais
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'recipes';

-- Testa a inserção de uma nova receita
-- Substitua 'your_company_id' pelo ID real da sua empresa
INSERT INTO recipes (
    name,
    yield_kg,
    yield_units,
    company_id
) VALUES (
    'Teste RLS',
    1.0,
    1,
    'your_company_id'
);

-- Verifica se a receita foi inserida
SELECT id, name, company_id
FROM recipes
WHERE name = 'Teste RLS';

-- Testa a atualização da receita
UPDATE recipes
SET yield_kg = 2.0
WHERE name = 'Teste RLS';

-- Verifica a atualização
SELECT id, name, yield_kg, company_id
FROM recipes
WHERE name = 'Teste RLS';

-- Testa a deleção da receita
DELETE FROM recipes
WHERE name = 'Teste RLS';

-- Verifica se a receita foi deletada
SELECT id, name, company_id
FROM recipes
WHERE name = 'Teste RLS';
