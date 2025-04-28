
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function UserSessionInfo() {
  const { user, activeCompany, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  // Tenta pegar display_name, senão pega name do metadata, senão email
  const displayName = user.user_metadata?.display_name || user.user_metadata?.name || user.email;
  const companyName = activeCompany?.name || "-";

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
    window.location.reload(); // Força reload para garantir que todo o estado seja limpo
  };


  return (
    <div className="flex items-center space-x-3">
      <span className="text-xs text-gray-600">
        Usuário: <span className="font-semibold">{displayName}</span> |
        Empresa: <span className="font-semibold">{companyName}</span>
      </span>
      <button
        onClick={handleLogout}
        className="ml-2 px-3 py-1 rounded bg-bakery-alert text-white text-xs font-semibold hover:bg-bakery-brown transition"
      >
        Sair
      </button>
    </div>
  );
}

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
        {/* Seção de usuário/empresa/logoff */}
        <UserSessionInfo />
      </div>
    </div>
  );
}
