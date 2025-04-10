
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell, User } from "lucide-react";

export default function Header() {
  const location = useLocation();
  const [notifications] = useState(3);
  
  // Map routes to page titles
  const pageTitles: Record<string, string> = {
    "/": "Dashboard",
    "/products": "Cadastro de Produtos",
    "/inventory": "Gestão de Estoque",
    "/recipes": "Cadastro de Receitas",
    "/production-orders": "Pedidos de Produção",
    "/production-confirmation": "Confirmação de Produção",
  };

  const pageTitle = pageTitles[location.pathname] || "Bread Byte Bakehouse";

  return (
    <div className="flex justify-between items-center h-16 px-6 border-b border-border bg-white">
      <h1 className="text-xl font-semibold text-bakery-brown">{pageTitle}</h1>
      
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Bell className="h-5 w-5 text-gray-500 hover:text-bakery-amber cursor-pointer" />
          {notifications > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-bakery-alert text-[10px] font-medium text-white">
              {notifications}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-bakery-amber flex items-center justify-center text-white">
            <User className="h-5 w-5" />
          </div>
          <span className="text-sm font-medium text-gray-700">Admin</span>
        </div>
      </div>
    </div>
  );
}
