# Arquitetura do Sistema

Este documento detalha a arquitetura, camadas, fluxos de dados, integrações e decisões técnicas do sistema.

## Sumário
- [1. Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
- [2. Camadas Principais](#2-camadas-principais)
- [3. Fluxos de Dados](#3-fluxos-de-dados)
- [4. Integrações Externas](#4-integrações-externas)
- [5. Decisões Técnicas](#5-decisões-técnicas)

---

## 1. Visão Geral da Arquitetura

A arquitetura é baseada em separação de responsabilidades, compondo as seguintes camadas:
- **Apresentação (UI):** Componentes React, hooks customizados, páginas.
- **Serviços:** Lógica de negócio, acesso a dados, integração com Supabase.
- **Banco de Dados:** Supabase/PostgreSQL, com políticas RLS e triggers.

## 2. Camadas Principais
- **UI/Componentes:** Responsáveis pela interação com o usuário, validação inicial e exibição de dados.
- **Hooks:** Gerenciam estado, side-effects e comunicação entre UI e serviços.
- **Serviços:** Realizam operações CRUD, validações de negócio, composição de dados e integração com APIs externas.
- **Banco de Dados:** Estrutura relacional, triggers, políticas de segurança (RLS).

## 3. Fluxos de Dados
- Usuário interage com componentes React.
- Componentes disparam hooks customizados para manipulação de estado e side effects.
- Hooks chamam funções dos serviços para operações CRUD.
- Serviços comunicam-se com Supabase (REST ou client SDK), que executa queries SQL e retorna dados.
- Dados trafegam de volta para a UI, onde são exibidos e manipulados.

## 4. Integrações Externas
- **Supabase:** Autenticação, banco de dados relacional, storage.
- **PDFMake:** Geração de relatórios/exportação em PDF.
- **Toast notifications:** Feedback para o usuário.

## 5. Decisões Técnicas
- Uso de TypeScript para segurança de tipos em toda a aplicação.
- Componentização e reutilização máxima de UI.
- Hooks para isolamento de lógica de estado.
- Tailwind CSS para estilização rápida e responsiva.
- Políticas RLS para segurança de dados multiusuário.
