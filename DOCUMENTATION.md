# Documentação Técnica — Visão Geral

Este arquivo apresenta uma visão geral do sistema, contexto, tecnologias, estrutura de diretórios e glossário. Cada seção detalhada estará em arquivos próprios para facilitar a consulta e manutenção.

## Sumário
- [1. Contexto e Objetivo](#1-contexto-e-objetivo)
- [2. Tecnologias Utilizadas](#2-tecnologias-utilizadas)
- [3. Estrutura de Diretórios](#3-estrutura-de-diretórios)
- [4. Glossário](#4-glossário)
- [5. Referências](#5-referências)

---

## 1. Contexto e Objetivo

Sistema completo para gestão de produção, estoque, receitas e organização de listas em padarias. Permite planejamento, automação, controle e análise do processo produtivo, com integração a Supabase para backend e autenticação.

## 2. Tecnologias Utilizadas
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn-ui
- **Backend:** Supabase (PostgreSQL, autenticação, storage)
- **Build:** Vite
- **Outros:** PDFMake, Toast notifications, Context API

## 3. Estrutura de Diretórios

```
src/
  components/         # Componentes reutilizáveis e páginas compostas
  hooks/              # Custom React hooks
  integrations/       # Integrações externas (ex: Supabase)
  lib/                # Funções utilitárias
  pages/              # Páginas principais da aplicação
  services/           # Serviços para acesso a dados e lógica de negócio
  types/              # Tipagens globais
supabase/             # Configurações e migrações do banco de dados
public/               # Assets públicos
```

## 4. Glossário
- **Produto:** Item produzido, matéria-prima, embalagem, sub-receita ou decoração.
- **Receita:** Conjunto de ingredientes e instruções para produção.
- **Lista de produção:** Agrupamento de produtos a serem produzidos em determinado dia.
- **Pedido de produção:** Ordem formal de produção, com receitas, quantidades e status.

## 5. Referências
- [Supabase](https://supabase.com/docs)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [PDFMake](https://pdfmake.github.io/docs/)
- [shadcn-ui](https://ui.shadcn.com/)
