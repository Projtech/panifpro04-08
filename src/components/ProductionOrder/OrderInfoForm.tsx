
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";

interface OrderInfoFormProps {
  orderNumber: string;
  orderDate: string;
  setOrderNumber: (value: string) => void;
  setOrderDate: (value: string) => void;
  isViewOnly: boolean;
}

export default function OrderInfoForm({
  orderNumber,
  orderDate,
  setOrderNumber,
  setOrderDate,
  isViewOnly
}: OrderInfoFormProps) {
  return (
    <Card className="mb-6">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-bakery-brown mb-4">Informações do Pedido</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="orderNumber" className="form-label">Número do Pedido *</label>
            <Input
              id="orderNumber"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              required
              className="form-input"
              disabled={isViewOnly}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="orderDate" className="form-label">Data do Pedido *</label>
            <DateInput
              id="orderDate"
              value={orderDate}
              onChange={(value) => setOrderDate(value)}
              required
              className="form-input"
              disabled={isViewOnly}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
