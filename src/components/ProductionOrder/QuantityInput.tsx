
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface QuantityInputProps {
  quantity: string;
  unit: 'kg' | 'un';
  onQuantityChange: (value: string) => void;
  onUnitChange: (value: 'kg' | 'un') => void;
  disabled?: boolean;
}

export default function QuantityInput({
  quantity,
  unit,
  onQuantityChange,
  onUnitChange,
  disabled = false
}: QuantityInputProps) {
  const [step, setStep] = useState<string>("0.01");
  
  // Ajusta o step do input com base na unidade
  useEffect(() => {
    setStep(unit === 'kg' ? "0.01" : "1");
  }, [unit]);

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="col-span-2">
        <Input
          type="number"
          step={step}
          min="0"
          value={quantity}
          onChange={(e) => onQuantityChange(e.target.value)}
          className="form-input"
          placeholder={unit === 'kg' ? "0.00" : "0"}
          disabled={disabled}
        />
      </div>
      <div>
        <Select 
          value={unit} 
          onValueChange={(value) => onUnitChange(value as 'kg' | 'un')}
          disabled={disabled}
        >
          <SelectTrigger className="form-input">
            <SelectValue placeholder="Unidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="kg">kg</SelectItem>
            <SelectItem value="un">un</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
