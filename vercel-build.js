#!/usr/bin/env node

// Script Node.js para resolver problema do Vite no Vercel
// As variáveis de ambiente do sistema não são lidas corretamente pelo Vite
// Este script cria um arquivo .env antes do build

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 Criando arquivo .env com variáveis de ambiente do sistema...');

// Obter variáveis de ambiente
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Criar conteúdo do .env
const envContent = `VITE_SUPABASE_URL=${supabaseUrl || ''}
VITE_SUPABASE_ANON_KEY=${supabaseAnonKey || ''}
`;

// Escrever arquivo .env
fs.writeFileSync('.env', envContent);

// Debug: mostrar conteúdo do .env criado
console.log('📄 Conteúdo do arquivo .env criado:');
console.log(fs.readFileSync('.env', 'utf8'));

// Debug: mostrar variáveis de ambiente disponíveis
console.log('🔍 Variáveis de ambiente VITE_ disponíveis:');
Object.keys(process.env)
  .filter(key => key.startsWith('VITE_'))
  .forEach(key => {
    console.log(`${key}: ${process.env[key] ? '✅ Definida' : '❌ Undefined'}`);
  });

console.log('🚀 Iniciando build do Vite...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build concluído!');
} catch (error) {
  console.error('❌ Erro no build:', error.message);
  process.exit(1);
}