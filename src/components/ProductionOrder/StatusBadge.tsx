
import { CheckCircle, Clock, Loader2 } from "lucide-react";
import { OrderStatus } from "@/services/productionOrderService";

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const statusConfig = {
    pending: {
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
      borderColor: "border-yellow-300",
      icon: <Clock className="h-4 w-4 mr-2" />,
      label: "Pendente"
    },
    in_progress: {
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
      borderColor: "border-blue-300",
      icon: <Loader2 className="h-4 w-4 mr-2 animate-spin" />,
      label: "Em Produção"
    },
    completed: {
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      borderColor: "border-green-300",
      icon: <CheckCircle className="h-4 w-4 mr-2" />,
      label: "Concluído"
    }
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center px-3 py-1 rounded-lg border ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}>
      {config.icon}
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  );
}
