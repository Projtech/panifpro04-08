
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  BookOpen, 
  Package, 
  Clipboard, 
  ShoppingCart, 
  CheckSquare, 
  ChevronLeft,
  ChevronRight,
  Home,
  Calendar,
  FolderTree,
  Users,
  PackageCheck,
  Layers,
  Tag
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "Dashboard",
    icon: Home,
    path: "/",
  },
  {
    title: "Produtos",
    icon: Package,
    path: "/products",
  },
  {
    title: "Produtos por Setor",
    icon: Layers,
    path: "/products-by-setor",
  },
  {
    title: "Estoque",
    icon: ShoppingCart,
    path: "/inventory",
  },
  {
    title: "Grupos, Subgrupos e Setores",
    icon: FolderTree,
    path: "/groups",
  },
  {
    title: "Tipos de Produto",
    icon: Tag,
    path: "/tipos-de-produto",
  },
  {
    title: "Receitas",
    icon: BookOpen,
    path: "/recipes",
  },
  {
    title: "Calendário de Produção",
    icon: Calendar,
    path: "/production-calendar",
  },
  {
    title: "Pedidos de Produção",
    icon: Clipboard,
    path: "/production-orders",
  },
  {
    title: "Confirmação de Produção",
    icon: CheckSquare,
    path: "/production-confirmation",
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { isAdmin } = useAuth();

  return (
    <div
      className={cn(
        "h-screen bg-sidebar fixed left-0 top-0 z-40 flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <h1 className="text-xl font-bold text-bakery-amber">
            BreadByte
          </h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md bg-sidebar-accent hover:bg-sidebar-accent/90 text-sidebar-accent-foreground"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-2 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                location.pathname === item.path
                  ? "bg-bakery-amber text-white"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
              )}
            >
              <item.icon
                className={cn("flex-shrink-0", collapsed ? "mx-auto" : "mr-3")}
                size={20}
              />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          ))}
          

        </nav>
      </div>
    </div>
  );
}
