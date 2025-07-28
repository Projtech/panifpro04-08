# Script PowerShell para resolver problema do Vite no Vercel
# As variáveis de ambiente do sistema não são lidas corretamente pelo Vite
# Este script cria um arquivo .env antes do build

Write-Host "🔧 Criando arquivo .env com variáveis de ambiente do sistema..." -ForegroundColor Yellow

# Criar arquivo .env
New-Item -Path ".env" -ItemType File -Force | Out-Null

# Adicionar variáveis do Supabase
Add-Content -Path ".env" -Value "VITE_SUPABASE_URL=$env:VITE_SUPABASE_URL"
Add-Content -Path ".env" -Value "VITE_SUPABASE_ANON_KEY=$env:VITE_SUPABASE_ANON_KEY"

# Debug: mostrar conteúdo do .env criado
Write-Host "📄 Conteúdo do arquivo .env criado:" -ForegroundColor Cyan
Get-Content ".env"

# Debug: mostrar variáveis de ambiente disponíveis
Write-Host "🔍 Variáveis de ambiente VITE_ disponíveis:" -ForegroundColor Cyan
Get-ChildItem Env: | Where-Object { $_.Name -like "VITE_*" } | Format-Table Name, Value

Write-Host "🚀 Iniciando build do Vite..." -ForegroundColor Green
npm run build

Write-Host "✅ Build concluído!" -ForegroundColor Green