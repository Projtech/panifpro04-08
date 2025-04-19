
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, CheckCircle, List, Loader2, Save } from "lucide-react";
import { OrderStatus } from "@/services/productionOrderService";
import StatusBadge from "./StatusBadge";

interface StatusManagerProps {
  isEditing: boolean;
  orderStatus: OrderStatus;
  isViewOnly: boolean;
  loading: boolean;
  orderRecipes: any[];
  onOpenMaterialsList: () => void;
  onSave: () => void;
  onStatusUpdate: (status: OrderStatus) => void;
  navigateToConfirmation: () => void;
}

export default function StatusManager({
  isEditing,
  orderStatus,
  isViewOnly,
  loading,
  orderRecipes,
  onOpenMaterialsList,
  onSave,
  onStatusUpdate,
  navigateToConfirmation
}: StatusManagerProps) {
  return (
    <Card>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-bakery-brown">Ações</h2>
          {isEditing && <StatusBadge status={orderStatus} />}
        </div>
        
        <div className="space-y-4">
          <Button 
            onClick={onOpenMaterialsList}
            variant="outline" 
            className="w-full"
            disabled={orderRecipes.length === 0}
          >
            <List className="h-4 w-4 mr-2" />
            Ver Lista de Materiais
          </Button>
          
          {isEditing ? (
            <>
              {orderStatus === 'pending' && (
                <Button 
                  onClick={() => onStatusUpdate('in_progress')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowLeft className="h-4 w-4 mr-2" />
                  )}
                  Iniciar Produção
                </Button>
              )}
              
              {orderStatus === 'in_progress' && (
                <Button 
                  onClick={navigateToConfirmation}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Produção
                </Button>
              )}
            </>
          ) : (
            <Button 
              onClick={onSave}
              className="w-full bg-bakery-amber hover:bg-bakery-brown text-white"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Pedido
            </Button>
          )}
          
          {!isViewOnly && (
            <div className="p-4 border border-dashed border-yellow-300 bg-yellow-50 rounded-md">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800 font-medium mb-1">
                    Lembrete
                  </p>
                  <p className="text-xs text-yellow-700">
                    Este pedido ficará com status "Pendente" até que seja iniciada a produção.
                    Após concluir a produção, registre na tela de "Confirmação de Produção".
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
