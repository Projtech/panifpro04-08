# 🚀 Configuração do Vercel - Variáveis de Ambiente

## ❌ Problema Atual

O erro que você está enfrentando:
```
index-f67b2456.js:104 Uncaught Error: Missing Supabase environment variables. Please check your .env file.
```

Este erro ocorre porque as **variáveis de ambiente do Supabase não estão configuradas no Vercel** ou não foram aplicadas ao deployment atual.

⚠️ **IMPORTANTE**: Mudanças nas variáveis de ambiente só são aplicadas em **novos deployments**!

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

### Método 1: Redeploy via Dashboard (Mais Rápido)
1. **No dashboard do Vercel**:
   - Vá para a aba **"Deployments"**
   - Encontre o deployment mais recente
   - Clique nos **3 pontos (⋯)** ao lado do deployment
   - Selecione **"Redeploy"**
   - Confirme clicando em **"Redeploy"** novamente

### Método 2: Novo Push para GitHub
1. **Faça qualquer mudança no código** (ex: adicione um comentário)
2. **Commit e push**:
   ```bash
   git add .
   git commit -m "Force redeploy for env vars"
   git push origin main
   ```

### ✅ Verificação
- Acesse sua aplicação no Vercel
- A tela de login deve aparecer normalmente
- O erro "Missing Supabase environment variables" deve desaparecer

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

## 🔧 Troubleshooting

### Problema: Variáveis ainda não funcionam após redeploy

1. **Verifique se as variáveis estão corretas**:
   - No Vercel Dashboard → Settings → Environment Variables
   - Confirme que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão listadas
   - Verifique se estão marcadas para **Production**

2. **Verifique o Build Logs**:
   - Vá para Deployments → Clique no deployment → Build Logs
   - Procure por erros relacionados às variáveis de ambiente

3. **Verifique o Runtime Logs**:
   - Vá para Deployments → Clique no deployment → Runtime Logs
   - Procure por erros de "Missing Supabase environment variables"

## 🔍 Como Analisar Logs do Vercel Detalhadamente

### 📋 Acessando os Logs

1. **Acesse o Dashboard do Vercel**:
   - Vá para [vercel.com](https://vercel.com)
   - Selecione seu projeto `panifpro04-08`

2. **Navegue para Deployments**:
   - Clique na aba **"Deployments"**
   - Encontre o deployment mais recente (geralmente o primeiro da lista)
   - Clique no deployment para abrir os detalhes

### 🔨 Build Logs - Analisando Erros de Compilação

**Como acessar**:
- Na página do deployment → Clique em **"Build Logs"** ou expanda a seção **"Building"**

**O que procurar**:
```bash
# ✅ Sucesso - Variáveis carregadas corretamente
✓ Environment variables loaded
✓ VITE_SUPABASE_URL is set
✓ VITE_SUPABASE_ANON_KEY is set

# ❌ Erro - Variáveis ausentes
✗ Missing environment variables:
✗ VITE_SUPABASE_URL is undefined
✗ VITE_SUPABASE_ANON_KEY is undefined

# ⚠️ Aviso - Variáveis não encontradas durante o build
Warning: Environment variable VITE_SUPABASE_URL is not defined
```

**Comandos úteis para debug no build**:
- Adicione temporariamente ao seu `package.json` scripts:
```json
{
  "scripts": {
    "build:debug": "echo $VITE_SUPABASE_URL && echo $VITE_SUPABASE_ANON_KEY && npm run build"
  }
}
```

### 🚀 Runtime Logs - Analisando Erros de Execução

**Como acessar**:
- Na página do deployment → Clique em **"Runtime Logs"**
- Ou acesse Functions → Clique em uma função → View Logs

**O que procurar**:
```javascript
// ❌ Erro típico de variáveis ausentes
Error: Missing Supabase environment variables. Please check your .env file.
    at createClient (index-f67b2456.js:104)

// ❌ Variáveis undefined
VITE_SUPABASE_URL: undefined
VITE_SUPABASE_ANON_KEY: undefined

// ✅ Variáveis carregadas corretamente
VITE_SUPABASE_URL: https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY: eyJ... (chave válida)
```

### 🔍 Debugging Avançado

**1. Adicione logs temporários no seu código**:
```typescript
// Em src/integrations/supabase/client.ts
console.log('🔍 Debug - Environment Variables:');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY);

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables!');
  console.log('Available env vars:', Object.keys(import.meta.env));
}
```

**2. Verifique variáveis disponíveis**:
```typescript
// Adicione temporariamente para ver todas as variáveis
console.log('All environment variables:', import.meta.env);
```

**3. Use o Vercel CLI para debug local**:
```bash
# Baixe as variáveis do Vercel para local
vercel env pull

# Verifique se o arquivo .env foi criado
cat .env

# Teste localmente com as variáveis do Vercel
vercel dev
```

### 📊 Interpretando os Status dos Logs

**Build Status**:
- ✅ **Ready**: Build concluído com sucesso
- ❌ **Error**: Falha no build (verifique Build Logs)
- 🔄 **Building**: Em processo de build
- ⏸️ **Canceled**: Build cancelado

**Runtime Status**:
- ✅ **200**: Requisição bem-sucedida
- ❌ **500**: Erro interno do servidor (geralmente variáveis ausentes)
- ❌ **404**: Rota não encontrada
- ⚠️ **Warning**: Avisos (não impedem funcionamento)

### 🎯 Checklist de Diagnóstico

**Antes de analisar os logs**:
- [ ] Variáveis estão configuradas no Vercel Dashboard?
- [ ] Variáveis têm o prefixo `VITE_` correto?
- [ ] Variáveis estão marcadas para o ambiente correto (Production)?
- [ ] Foi feito um novo deployment após adicionar as variáveis?

**Durante a análise dos logs**:
- [ ] Build Logs mostram as variáveis sendo carregadas?
- [ ] Runtime Logs mostram erro de "Missing Supabase environment variables"?
- [ ] Há outros erros não relacionados às variáveis?
- [ ] O deployment foi bem-sucedido mas a aplicação não funciona?

**Após identificar o problema**:
- [ ] Corrija as variáveis no Dashboard
- [ ] Force um novo deployment
- [ ] Verifique os novos logs
- [ ] Teste a aplicação

### Problema: Integração do Supabase não funciona

1. **Remova e reinstale a integração**:
   - Vercel Dashboard → Settings → Integrations
   - Remova a integração do Supabase
   - Reinstale via [Vercel Marketplace](https://vercel.com/marketplace/supabase)

2. **Configure manualmente**:
   - Se a integração não funcionar, configure as variáveis manualmente
   - Use os valores do seu painel do Supabase

## 🔗 Links Úteis

- [Documentação do Vercel - Environment Variables](https://vercel.com/docs/environment-variables) <mcreference link="https://vercel.com/docs/environment-variables" index="1">1</mcreference>
- [Supabase + Vercel Integration](https://vercel.com/marketplace/supabase) <mcreference link="https://supabase.com/partners/integrations/vercel" index="4">4</mcreference>
- [Vercel Redeploy Documentation](https://vercel.com/docs/deployments/redeploy)

---

**Após seguir estes passos, sua aplicação no Vercel deve funcionar corretamente!** 🎉