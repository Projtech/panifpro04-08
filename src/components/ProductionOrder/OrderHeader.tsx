
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OrderHeaderProps {
  isEditing: boolean;
  orderOrigin: 'manual' | 'calendar';
  loading: boolean;
  title: string;
  subtitle: string;
}

export default function OrderHeader({ 
  isEditing, 
  orderOrigin, 
  loading, 
  title, 
  subtitle 
}: OrderHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center mb-6">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/production-orders')} 
        className="mr-4"
        disabled={loading}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>
      
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-bakery-brown">
          {title}
        </h1>
        <p className="text-gray-600">
          {subtitle}
        </p>
      </div>
      
      {orderOrigin === 'calendar' && (
        <div className="flex items-center text-bakery-amber bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
          <Calendar className="h-4 w-4 mr-2" />
          <span className="text-sm font-medium">Pedido do Calendário</span>
        </div>
      )}
    </div>
  );
}
