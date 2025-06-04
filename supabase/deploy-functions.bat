@echo off
echo Iniciando deploy das Edge Functions para o Supabase...

REM Verificar se o Supabase CLI está instalado
where supabase >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Supabase CLI não encontrado. Instalando...
    npm install -g supabase
)

echo Fazendo login no Supabase...
REM Você precisará fazer login manualmente na primeira vez
supabase login

echo Fazendo deploy da função calculate-materials...
cd %~dp0
supabase functions deploy calculate-materials --project-ref lrjbqhxmyqcjdkjwqwwj

echo Fazendo deploy da função calculate-preweighing...
supabase functions deploy calculate-preweighing --project-ref lrjbqhxmyqcjdkjwqwwj

echo Deploy concluído com sucesso!
pause
