# Planejamento RLS - Sistema Multi-Empresa com Consultores

## 📋 Análise do Sistema Atual

### Estrutura Atual
O sistema atual está configurado com:

**Tabela `company_users`:**
- `user_id` (UUID) - Referência ao usuário
- `company_id` (UUID) - Referência à empresa
- `role` (string) - Papel do usuário
- `status` (string) - Status do acesso

**Roles Identificados no Código:**
- `admin` - Administrador da empresa
- `owner` - Proprietário da empresa
- `user` - Usuário comum

**Status Identificados:**
- `active` - Acesso ativo
- `inactive` - Acesso inativo
- `pending` - Acesso pendente

### Políticas RLS Atuais (Fase 1)
1. **`users_own_records`** - Usuários veem seus próprios registros
2. **`admins_manage_company`** - Admins gerenciam usuários da sua empresa
3. **`users_update_own`** - Usuários atualizam seus próprios dados
4. **`superadmins_full_access`** - Superadmins têm acesso total

## 🚨 Problemas Identificados

### 1. Limitação para Consultores
**Problema:** O sistema atual não suporta usuários que precisam acessar múltiplas empresas.

**Cenário Atual:**
- Um usuário só pode ter acesso a UMA empresa por vez
- A função `get_active_company_for_user` retorna apenas uma empresa
- As políticas RLS são baseadas em `company_id` único

**Necessidade:**
- Consultores precisam acessar dados de MÚLTIPLAS empresas
- Deve ser possível alternar entre empresas
- Manter segurança por empresa

### 2. Ausência do Role "Consultant"
**Problema:** Não existe um role específico para consultores.

**Impacto:**
- Consultores são tratados como `user` ou `admin`
- Não há diferenciação de permissões
- Não há controle específico para acesso multi-empresa

### 3. Interface de Seleção de Empresa
**Problema:** O frontend assume uma empresa por usuário.

**Evidências no Código:**
- `AuthContext` armazena apenas `activeCompany`
- `SelectCompany.tsx` não considera múltiplas empresas ativas
- Não há interface para consultores alternarem entre empresas

## ✅ Solução Proposta

### Fase 1: Simplificação RLS (✅ Concluída)
- [x] Remover políticas recursivas problemáticas
- [x] Criar políticas simplificadas e diretas
- [x] Manter função `get_active_company_for_user` funcional
- [x] Adicionar índices para otimização

### Fase 2: Suporte a Consultores (📋 Planejada)

#### 2.1 Expansão da Estrutura de Dados
```sql
-- Adicionar constraint para incluir role 'consultant'
ALTER TABLE company_users 
ADD CONSTRAINT company_users_role_check 
CHECK (role IN ('admin', 'owner', 'user', 'consultant'));
```

#### 2.2 Novas Políticas RLS
```sql
-- Consultores podem ver dados de todas as empresas onde têm acesso
CREATE POLICY "consultants_multi_company_access" ON company_users
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM company_users consultant_check
        WHERE consultant_check.user_id = auth.uid()
        AND consultant_check.role = 'consultant'
        AND consultant_check.status = 'active'
        AND consultant_check.company_id = company_users.company_id
    )
);
```

#### 2.3 Funções de Gerenciamento
- `add_consultant_to_company(user_id, company_id)` - Adicionar consultor
- `remove_consultant_from_company(user_id, company_id)` - Remover consultor
- `get_consultant_companies(user_id)` - Listar empresas do consultor
- `get_active_company_for_user_with_consultants()` - Versão expandida

#### 2.4 Segurança e Controles
- Consultores só podem ver/editar dados das empresas onde têm acesso
- Consultores não podem alterar admins/owners
- Apenas admins/owners podem adicionar/remover consultores
- Superadmins mantêm acesso total

### Fase 3: Atualização do Frontend (🔄 Necessária)

#### 3.1 AuthContext
```typescript
interface ActiveCompanyData {
  id: string;
  name: string;
  role: string;
  user_id: string;
  // NOVO: Para consultores
  availableCompanies?: CompanyAccess[];
}

interface CompanyAccess {
  id: string;
  name: string;
  role: string;
  status: string;
}
```

#### 3.2 Seleção de Empresa para Consultores
- Modificar `SelectCompany.tsx` para mostrar múltiplas empresas
- Adicionar componente de alternância de empresa
- Implementar lógica de troca de contexto

#### 3.3 Interface de Gerenciamento
- Tela para admins gerenciarem consultores
- Interface para adicionar/remover acesso de consultores
- Visualização de empresas por consultor

## 🔄 Fluxo de Implementação

### Etapa 1: Executar Fase 1 (RLS Simplificado)
```bash
# Via SQL Editor do Supabase
# Executar: sql/01_fase1_simplificacao_rls.sql
```

### Etapa 2: Executar Fase 2 (Suporte a Consultores)
```bash
# Via SQL Editor do Supabase
# Executar: sql/02_fase2_consultores_multi_empresa.sql
```

### Etapa 3: Testar Funcionalidades
```sql
-- Teste 1: Adicionar consultor
SELECT add_consultant_to_company('user-uuid', 'company-uuid');

-- Teste 2: Listar empresas do consultor
SELECT * FROM get_consultant_companies('user-uuid');

-- Teste 3: Verificar acesso multi-empresa
SELECT * FROM get_active_company_for_user_with_consultants('user-uuid');
```

### Etapa 4: Atualizar Frontend
1. Modificar `AuthContext` para suportar múltiplas empresas
2. Atualizar `SelectCompany` para consultores
3. Implementar alternância de empresa
4. Criar interface de gerenciamento de consultores

## 📊 Comparação: Antes vs Depois

| Aspecto | Antes (Atual) | Depois (Proposto) |
|---------|---------------|-------------------|
| **Acesso por Usuário** | 1 empresa | 1+ empresas (consultores) |
| **Roles Disponíveis** | admin, owner, user | admin, owner, user, consultant |
| **Políticas RLS** | 4 políticas básicas | 6 políticas + multi-empresa |
| **Funções de Gestão** | Limitadas | Completas para consultores |
| **Interface** | Empresa única | Seleção/alternância |
| **Segurança** | Por empresa | Por empresa + multi-acesso |

## 🎯 Benefícios da Solução

### Para o Negócio
- ✅ Consultores podem atender múltiplas empresas
- ✅ Flexibilidade para diferentes modelos de negócio
- ✅ Escalabilidade para crescimento
- ✅ Manutenção da segurança por empresa

### Para Desenvolvedores
- ✅ Código mais organizado e modular
- ✅ Políticas RLS claras e não recursivas
- ✅ Funções específicas para cada necessidade
- ✅ Testes automatizados incluídos

### Para Usuários
- ✅ Interface intuitiva para seleção de empresa
- ✅ Acesso rápido entre empresas (consultores)
- ✅ Permissões claras e transparentes
- ✅ Experiência consistente

## ⚠️ Considerações Importantes

### Migração de Dados
- Usuários existentes não serão afetados
- Novos consultores precisarão ser configurados manualmente
- Dados existentes permanecem seguros

### Performance
- Índices otimizados para consultas multi-empresa
- Políticas RLS eficientes
- Cache de empresas no frontend

### Segurança
- Princípio do menor privilégio mantido
- Auditoria de acessos possível
- Isolamento entre empresas preservado

## 🚀 Próximos Passos

1. **Imediato:** Executar Fase 1 para resolver problemas de RLS
2. **Curto Prazo:** Implementar Fase 2 para suporte a consultores
3. **Médio Prazo:** Atualizar frontend para nova funcionalidade
4. **Longo Prazo:** Monitorar e otimizar baseado no uso

---

**Status:** 📋 Planejamento Completo - Pronto para Implementação
**Prioridade:** 🔥 Alta - Resolve problema de tela branca e expande funcionalidades
**Impacto:** 📈 Alto - Melhora significativa na flexibilidade do sistema