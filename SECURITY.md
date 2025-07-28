# Guia de Segurança

## ⚠️ Correções de Segurança Implementadas

Este projeto teve **3 alertas de segurança** do GitHub que foram corrigidos:

### 1. **Supabase Service Role JWT** 
- **Problema**: Chave JWT do service role exposta no código
- **Correção**: Movida para variáveis de ambiente
- **Arquivos afetados**: `src/integrations/supabase/client.ts`, `execute_sql.cjs`

### 2. **PostgreSQL URI**
- **Problema**: String de conexão com credenciais do banco expostas
- **Correção**: Removida do código e movida para configuração privada
- **Arquivos afetados**: `.trae/mcp.json`

### 3. **Generic High Entropy Secret**
- **Problema**: Tokens e chaves de API expostos no código
- **Correção**: Substituídos por variáveis de ambiente
- **Arquivos afetados**: Múltiplos arquivos

## 🔒 Configuração Segura

### Variáveis de Ambiente Necessárias

Crie um arquivo `.env` na raiz do projeto com:

```env
# Configurações do Supabase
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
SUPABASE_ACCESS_TOKEN=seu_token_de_acesso
```

### Arquivos Protegidos

Os seguintes arquivos foram removidos do controle de versão:
- `.env` (todas as variações)
- `.trae/mcp.json`
- `execute_sql.cjs`
- `execute_sql.js`
- `supabase/functions/generate-pdf/.env`

## 🛡️ Práticas de Segurança

1. **Nunca commite credenciais** no código fonte
2. **Use variáveis de ambiente** para informações sensíveis
3. **Mantenha o .gitignore atualizado** para excluir arquivos sensíveis
4. **Revise regularmente** os alertas de segurança do GitHub
5. **Use o arquivo .env.example** como referência

## 🚨 Em Caso de Exposição Acidental

1. **Revogue imediatamente** as chaves expostas
2. **Gere novas credenciais** no painel do Supabase
3. **Atualize as variáveis de ambiente** localmente
4. **Faça um commit** removendo as credenciais antigas

## 📞 Contato

Em caso de problemas de segurança, entre em contato com a equipe de desenvolvimento.