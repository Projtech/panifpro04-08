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
import { LogoutManager } from './services/LogoutManager';
import { sessionMonitor } from './utils/sessionMonitor';

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
  
  useEffect(() => {
    // Configurar logs para debug
    console.log('🚀 App iniciado - MODO DEBUG ATIVO');
    
    // Inicializar monitor de sessão
    console.log('🔍 Inicializando SessionMonitor...');
    sessionMonitor.startMonitoring();
    
    // Limpar localStorage em caso de dados corrompidos
    const cleanupCorruptedData = () => {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('sb-') && key.includes('auth-token')) {
            const value = localStorage.getItem(key);
            if (value && value.includes('undefined') || value === 'undefined') {
              console.warn('🧹 Removendo token corrompido:', key);
              localStorage.removeItem(key);
            }
          }
        });
      } catch (error) {
        console.error('❌ Erro ao limpar dados corrompidos:', error);
      }
    };
    
    cleanupCorruptedData();
    
    // Cleanup ao desmontar
    return () => {
      sessionMonitor.stopMonitoring();
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

  // CÓDIGO PARA LOGOUT AO FECHAR A APLICAÇÃO - TEMPORARIAMENTE REMOVIDO PARA DEPURAÇÃO
  // TODO: Reativar quando necessário
  // FIM DO CÓDIGO PARA LOGOUT AO FECHAR A APLICAÇÃO - TEMPORARIAMENTE REMOVIDO

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HelmetProvider>
          <AuthProvider>
              <TableConfigProvider>
                <BrowserRouter
                  future={{
                    v7_startTransition: true,
                    v7_relativeSplatPath: true,
                  }}
                >
                  {/* TEMPORARIAMENTE COMENTADO PARA DEPURAÇÃO */}
                  {/* <AuthErrorHandler /> */}
                  {/* <VisibilityHandler /> DESABILITADO TEMPORARIAMENTE PARA DEBUG */}
                  {/* <AutoLogout inactivityTimeout={30 * 60 * 1000} /> */}
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
