import React, { useEffect, useState } from 'react';
import { startScheduledPdfChecker, stopScheduledPdfChecker } from './services/scheduledPdfService';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { TableConfigProvider } from './contexts/TableConfigContext';

// Auth Components
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import { ForgotPassword } from "./pages/Auth/ForgotPassword";
import { ResetPassword } from "./pages/Auth/ResetPassword";
import { ChangePassword } from "./pages/Auth/ChangePassword";
import { Login } from "./pages/Auth/Login";
import { Signup } from "./pages/Auth/Signup";
import { SelectCompany } from "./pages/Company/SelectCompany";
import AutoLogout from "./components/AutoLogout";
import { PasswordChangeGuard } from "./components/PasswordChangeGuard";

import { AuthErrorHandler } from './components/AuthErrorHandler';
import { supabase } from './integrations/supabase/client';

// Application Components
import AppLayout from "./components/Layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import Recipes from './pages/Recipes';
import RecipeForm from './pages/RecipeForm';
import TiposDeProduto from './pages/TiposDeProduto';
import ProductionCalendar from "./pages/ProductionCalendar";
import ProductionOrders from "./pages/ProductionOrders";
import ProductionOrderForm from "./pages/ProductionOrderForm";
import ProductionConfirmation from "./pages/ProductionConfirmation";
import GroupsManagement from "./pages/GroupsManagement";
import ProductsBySetorPage from "./pages/ProductsBySetorPage";
import NotFound from "./pages/NotFound";
import NovoProduto from "./pages/NovoProduto";

const queryClient = new QueryClient();

const App = () => {
  // Estado para armazenar o ID do intervalo de verificação de programações de PDF
  const [scheduledPdfCheckerId, setScheduledPdfCheckerId] = useState<number | null>(null);
  
  // Iniciar o verificador de programações de PDF quando o componente for montado
  useEffect(() => {
    // Iniciar o verificador e armazenar o ID do intervalo
    const intervalId = startScheduledPdfChecker();
    setScheduledPdfCheckerId(intervalId);
    
    // Limpar o intervalo quando o componente for desmontado
    return () => {
      if (scheduledPdfCheckerId) {
        stopScheduledPdfChecker(scheduledPdfCheckerId);
      }
    };
  }, []);
  
  // INÍCIO DO CÓDIGO ADICIONADO - Redirecionamento convite/reset
  useEffect(() => {
    const currentPath = window.location.pathname;
    const hash = window.location.hash;
    // Verifica se a URL contém os parâmetros do link de convite/reset do Supabase
    // E também verifica se *não* já estamos na página de reset para evitar loops desnecessários.
    if (currentPath !== '/reset-password' && hash.includes('access_token') && hash.includes('type=recovery')) {
      console.log('Detectado hash de recuperação/convite, redirecionando para /reset-password...'); // Log para depuração
      // Redireciona imediatamente para a página de reset, mantendo o hash original na URL.
      // window.location.replace é usado para não adicionar a URL atual (que seria quebrada) ao histórico do navegador.
      window.location.replace('/reset-password' + hash);
    }
  }, []);
  // FIM DO CÓDIGO ADICIONADO

  // INÍCIO DO CÓDIGO PARA LOGOUT AO FECHAR A APLICAÇÃO
  useEffect(() => {
    // Variável para controlar se é uma atualização de página ou fechamento
    let isRefreshing = false;
    // Variável para controlar se a página está apenas oculta (minimizada/em segundo plano)
    let isHidden = false;
    // Variável para armazenar o ID do timeout
    let hiddenTimeoutId: number | null = null;

    // Função para marcar que é uma atualização
    const markRefreshing = () => {
      isRefreshing = true;
      // Definimos um timeout curto para resetar a flag caso seja uma navegação normal
      setTimeout(() => {
        isRefreshing = false;
      }, 300); // Aumentado para 300ms para acomodar conexões mais lentas
    };

    // Adicionamos listener para eventos que indicam atualização de página
    window.addEventListener('beforeunload', markRefreshing);
    
    // Função para lidar com o evento visibilitychange
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // A página ficou oculta (minimizada, aba em segundo plano, etc.)
        isHidden = true;
        
        // Configuramos um timeout longo (5 segundos) para distinguir entre
        // minimizar/alternar janelas e fechar o navegador
        hiddenTimeoutId = window.setTimeout(async () => {
          // Se ainda estiver oculto após 5 segundos e não for uma atualização,
          // assumimos que o navegador foi fechado
          if (isHidden && !isRefreshing && !(window as any).isChangingPassword) {
            console.log('Aplicação provavelmente foi fechada, realizando logout...');
            await supabase.auth.signOut();
            localStorage.removeItem('activeCompany');
          }
          hiddenTimeoutId = null;
        }, 5000) as unknown as number;
      } else {
        // A página ficou visível novamente (maximizada, aba em primeiro plano)
        isHidden = false;
        
        // Cancelamos o timeout se a página voltar a ficar visível antes do tempo
        if (hiddenTimeoutId !== null) {
          clearTimeout(hiddenTimeoutId);
          hiddenTimeoutId = null;
        }
      }
    };

    // Adiciona o event listener para visibilitychange
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Remove os event listeners quando o componente for desmontado
    return () => {
      window.removeEventListener('beforeunload', markRefreshing);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Limpa o timeout se existir
      if (hiddenTimeoutId !== null) {
        clearTimeout(hiddenTimeoutId);
      }
    };
  }, []);
  // FIM DO CÓDIGO PARA LOGOUT AO FECHAR A APLICAÇÃO

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HelmetProvider>
          <AuthProvider>
            <TableConfigProvider>
              <BrowserRouter>
                <AuthErrorHandler />
                <AutoLogout inactivityTimeout={30 * 60 * 1000} /> {/* 30 minutos de inatividade */}
                <PasswordChangeGuard>
                  <Routes>
                  {/* Rotas públicas */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/change-password" element={<ChangePassword />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/select-company" element={
                    <ProtectedRoute>
                      <SelectCompany />
                    </ProtectedRoute>
                  } />

                  {/* Rotas protegidas (requerem autenticação e empresa ativa) */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Dashboard />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Dashboard />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/products" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Products />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/products-by-setor" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ProductsBySetorPage />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/inventory" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Inventory />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/groups" element={
                    <ProtectedRoute adminOnly>
                      <AppLayout>
                        <GroupsManagement />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/tipos-de-produto" element={
                    <ProtectedRoute adminOnly>
                      <AppLayout>
                        <TiposDeProduto />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  
                  <Route path="/recipes" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Recipes />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/recipes/new" element={
                    <ProtectedRoute adminOnly>
                      <AppLayout>
                        <ErrorBoundary>
                          <RecipeForm />
                        </ErrorBoundary>
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/recipes/:id" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ErrorBoundary>
                          <RecipeForm />
                        </ErrorBoundary>
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/recipes/:id/edit" element={
                    <ProtectedRoute adminOnly>
                      <AppLayout>
                        <ErrorBoundary>
                          <RecipeForm />
                        </ErrorBoundary>
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/recipes/edit/:id" element={
                    <ProtectedRoute adminOnly>
                      <AppLayout>
                        <ErrorBoundary>
                          <RecipeForm />
                        </ErrorBoundary>
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/production-calendar" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ProductionCalendar />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/production-orders" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ProductionOrders />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/production-orders/new" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ProductionOrderForm />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/production-orders/:id" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ProductionOrderForm />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/production-orders/:id/materials-list" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ProductionOrderForm showMaterialsList={true} />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/production-orders/:id/pre-weighing-list" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ProductionOrderForm showPreWeighingList={true} />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/production-confirmation" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ProductionConfirmation />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/production-confirmation/:id" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ProductionConfirmation />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/produtos/novo" element={
                    <ProtectedRoute adminOnly>
                      <AppLayout>
                        <NovoProduto />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="*" element={<NotFound />} />
                  </Routes>
                </PasswordChangeGuard>
              </BrowserRouter>
            </TableConfigProvider>
          </AuthProvider>
        </HelmetProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
