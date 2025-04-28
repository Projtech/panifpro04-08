# Integrações Externas e Banco de Dados

Este documento detalha todas as integrações externas, estrutura das tabelas Supabase, políticas RLS, exemplos de queries e scripts de migração.

## Sumário
- [1. Supabase: Estrutura de Tabelas](#1-supabase-estrutura-de-tabelas)
- [2. Políticas RLS](#2-políticas-rls)
- [3. Scripts e Migrações](#3-scripts-e-migrações)
- [4. Integrações Adicionais](#4-integrações-adicionais)

---

## 1. Supabase: Estrutura de Tabelas
### Exemplo (products):
- `id`, `name`, `unit`, `cost`, `min_stock`, `current_stock`, `group_id`, `subgroup_id`, dias da semana, etc.

### Outras tabelas:
- `production_lists`, `production_list_items`, `production_orders`, `production_order_items`, `recipes`, `recipe_ingredients`

## 2. Políticas RLS
- CRUD permitido apenas para usuários autenticados.
- Usuários não autenticados podem apenas visualizar.
- Scripts SQL de ajuste disponíveis em `supabase/migrations/`.

## 3. Scripts e Migrações
- Scripts para criação/alteração de tabelas e políticas em `supabase/migrations/`.
- Exemplos de comandos SQL utilizados.

## 4. Integrações Adicionais
- **PDFMake:** Geração de relatórios/exportação em PDF.
- **Toast notifications:** Feedback para o usuário.
- **Simuladores Dart:** Testes de lógica de negócio sem interface gráfica.
