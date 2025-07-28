# 🚀 Configuração do Vercel - Variáveis de Ambiente

## ❌ Problema Atual

O erro que você está enfrentando:
```
index-f67b2456.js:104 Uncaught Error: Missing Supabase environment variables. Please check your .env file.
```

Este erro ocorre porque as **variáveis de ambiente do Supabase não estão configuradas no Vercel**.

## ✅ Solução: Configurar Variáveis de Ambiente no Vercel

### Método 1: Via Dashboard do Vercel (Recomendado)

1. **Acesse seu projeto no Vercel**:
   - Vá para [vercel.com](https://vercel.com)
   - Entre na sua conta
   - Selecione o projeto `panifpro04-08`

2. **Navegue para as configurações**:
   - Clique na aba **"Settings"**
   - No menu lateral, clique em **"Environment Variables"**

3. **Adicione as variáveis necessárias**:
   
   **Variável 1:**
   - **Name**: `VITE_SUPABASE_URL`
   - **Value**: `[SUA_URL_DO_SUPABASE]` (encontre no painel do Supabase)
   - **Environments**: Marque `Production`, `Preview`, e `Development`
   
   **Variável 2:**
   - **Name**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: `[SUA_CHAVE_ANON_DO_SUPABASE]` (encontre no painel do Supabase)
   - **Environments**: Marque `Production`, `Preview`, e `Development`

4. **Clique em "Save"** para cada variável

### Método 2: Via Vercel CLI

```bash
# Instalar Vercel CLI (se não tiver)
npm i -g vercel

# Fazer login
vercel login

# Navegar para o diretório do projeto
cd "c:\Projetos app\26-07\panifpro04-08"

# Adicionar variáveis de ambiente
vercel env add VITE_SUPABASE_URL
# Cole sua URL do Supabase (encontre no painel do Supabase)

vercel env add VITE_SUPABASE_ANON_KEY
# Cole sua chave anon do Supabase (encontre no painel do Supabase)
```

## 🔄 Após Configurar as Variáveis

1. **Faça um novo deploy**:
   - As variáveis só são aplicadas em **novos deployments**
   - Faça um push para o GitHub ou clique em "Redeploy" no Vercel

2. **Verifique se funcionou**:
   - Acesse sua aplicação no Vercel
   - O erro deve desaparecer

## 🔍 Verificação das Variáveis

Para verificar se as variáveis estão configuradas:

```bash
# Via CLI
vercel env ls

# Ou verifique no Dashboard do Vercel
# Settings > Environment Variables
```

## ⚠️ Importante

- **Prefixo VITE_**: As variáveis devem ter o prefixo `VITE_` para serem acessíveis no frontend
- **Ambientes**: Configure para `Production`, `Preview` e `Development`
- **Redeploy**: Sempre faça um novo deploy após adicionar variáveis

## 🔗 Links Úteis

- [Documentação do Vercel - Environment Variables](https://vercel.com/docs/environment-variables)
- [Supabase + Vercel Integration](https://vercel.com/marketplace/supabase)

---

**Após seguir estes passos, sua aplicação no Vercel deve funcionar corretamente!** 🎉