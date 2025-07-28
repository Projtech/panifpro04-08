#!/bin/bash

# Script para resolver problema do Vite no Vercel
# As variáveis de ambiente do sistema não são lidas corretamente pelo Vite
# Este script cria um arquivo .env antes do build

echo "🔧 Criando arquivo .env com variáveis de ambiente do sistema..."

# Criar arquivo .env
touch .env

# Adicionar variáveis do Supabase
echo "VITE_SUPABASE_URL=$VITE_SUPABASE_URL" >> .env
echo "VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY" >> .env

# Debug: mostrar conteúdo do .env criado
echo "📄 Conteúdo do arquivo .env criado:"
cat .env

# Debug: mostrar variáveis de ambiente disponíveis
echo "🔍 Variáveis de ambiente VITE_ disponíveis:"
env | grep VITE_

echo "🚀 Iniciando build do Vite..."
npm run build

echo "✅ Build concluído!"