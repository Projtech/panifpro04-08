import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Auth Components
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import { ForgotPassword } from "./pages/Auth/ForgotPassword";
import { ResetPassword } from "./pages/Auth/ResetPassword";
import { Login } from "./pages/Auth/Login";
import { Signup } from "./pages/Auth/Signup";
import { SelectCompany } from "./pages/Company/SelectCompany";

import { AuthErrorHandler } from './components/AuthErrorHandler';

// Application Components
import AppLayout from "./components/Layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import Recipes from "./pages/Recipes";
import RecipeForm from "./pages/RecipeForm";
import ProductionCalendar from "./pages/ProductionCalendar";
import ProductionOrders from "./pages/ProductionOrders";
import ProductionOrderForm from "./pages/ProductionOrderForm";
import ProductionConfirmation from "./pages/ProductionConfirmation";
import GroupsManagement from "./pages/GroupsManagement";
import NotFound from "./pages/NotFound";
import NovoProduto from "./pages/NovoProduto";

const queryClient = new QueryClient();

const App = () => {
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

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <AuthErrorHandler />
            <Routes>
              {/* Rotas públicas */}
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
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
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
