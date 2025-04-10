
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/groups" element={<GroupsManagement />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/recipes/new" element={<RecipeForm />} />
            <Route path="/recipes/:id" element={<RecipeForm />} />
            <Route path="/recipes/:id/edit" element={<RecipeForm />} />
            <Route path="/production-calendar" element={<ProductionCalendar />} />
            <Route path="/production-orders" element={<ProductionOrders />} />
            <Route path="/production-orders/new" element={<ProductionOrderForm />} />
            <Route path="/production-orders/:id" element={<ProductionOrderForm />} />
            <Route path="/production-confirmation" element={<ProductionConfirmation />} />
            <Route path="/production-confirmation/:id" element={<ProductionConfirmation />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
