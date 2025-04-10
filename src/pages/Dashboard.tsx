
import { Loader2, Package, AlertTriangle, BookOpen, Clock, CheckSquare } from "lucide-react";
import { StatCard } from "@/components/Dashboard/StatCard";
import { RecentActivity } from "@/components/Dashboard/RecentActivity";
import { QuickActions } from "@/components/Dashboard/QuickActions";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function Dashboard() {
  const { loading, dashboardStats, recentActivity } = useDashboardData();

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-bakery-brown mb-6">Bem-vindo à Bread Byte Bakehouse</h1>
      
      {loading ? (
        <div className="flex justify-center items-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-bakery-amber" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <StatCard 
              title="Produtos" 
              value={dashboardStats.totalProducts} 
              icon={<Package className="h-8 w-8 text-bakery-amber" />}
              description="Total cadastrados"
            />
            <StatCard 
              title="Estoque Baixo" 
              value={dashboardStats.lowStockItems} 
              icon={<AlertTriangle className="h-8 w-8 text-bakery-alert" />}
              description="Produtos a repor"
            />
            <StatCard 
              title="Receitas" 
              value={dashboardStats.recipes} 
              icon={<BookOpen className="h-8 w-8 text-bakery-amber" />}
              description="Total cadastradas"
            />
            <StatCard 
              title="Pedidos Pendentes" 
              value={dashboardStats.pendingOrders} 
              icon={<Clock className="h-8 w-8 text-bakery-amber" />}
              description="Em produção"
            />
            <StatCard 
              title="Pedidos Concluídos" 
              value={dashboardStats.completedOrders} 
              icon={<CheckSquare className="h-8 w-8 text-green-600" />}
              description="Nos últimos 7 dias"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentActivity activities={recentActivity} />
            <QuickActions />
          </div>
        </>
      )}
    </div>
  );
}
