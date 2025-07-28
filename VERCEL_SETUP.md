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