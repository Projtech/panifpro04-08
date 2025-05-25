# Script para remover dados sensíveis do histórico do Git
# ATENÇÃO: Este script vai reescrever o histórico do Git!

# 1. Primeiro, vamos criar um arquivo .env seguro (com chaves substituídas por placeholders)
$secureEnvContent = @"
SUPABASE_URL=https://zysejmuapexkkuhwkuql.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
"@

# 2. Salvar o arquivo .env seguro
Set-Content -Path ".env" -Value $secureEnvContent

# 3. Adicionar o arquivo .gitignore atualizado e o .env.example
git add .gitignore .env.example

# 4. Fazer commit das alterações de segurança
git commit -m "chore: adicionar .env.example e atualizar .gitignore para proteger dados sensíveis"

# 5. Usar o git filter-branch para remover o arquivo .env de todos os commits anteriores
Write-Host "Removendo arquivo .env do histórico do Git..."
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch .env" --prune-empty --tag-name-filter cat -- --all

# 6. Forçar o push para o repositório remoto (isso vai sobrescrever o histórico)
Write-Host "Enviando alterações para o repositório remoto..."
git push origin --force

Write-Host "Concluído! O arquivo .env foi removido do histórico do Git e as chaves sensíveis não estão mais expostas."
Write-Host "IMPORTANTE: Todos os colaboradores devem clonar o repositório novamente ou executar 'git pull --rebase' para sincronizar."
