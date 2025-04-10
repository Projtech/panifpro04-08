import React, { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDateBR, parseDateBR } from "@/lib/formatters";

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  showIcon?: boolean;
  className?: string;
}

/**
 * Componente de entrada de data no padrão brasileiro (DD/MM/AAAA)
 * Internamente usa o formato ISO (AAAA-MM-DD) para compatibilidade com o HTML5,
 * mas exibe e aceita datas no formato brasileiro.
 */
export function DateInput({ 
  value, 
  onChange, 
  showIcon = true, 
  className = "", 
  ...props 
}: DateInputProps) {
  // Estado interno para controlar o valor exibido no formato brasileiro
  const [displayValue, setDisplayValue] = useState<string>("");
  
  // Atualiza o valor exibido quando o valor da prop muda
  useEffect(() => {
    if (value) {
      setDisplayValue(formatDateBR(value));
    } else {
      setDisplayValue("");
    }
  }, [value]);
  
  // Manipula a mudança no input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);
    
    // Se o campo estiver vazio, notifica com string vazia
    if (!newValue) {
      onChange("");
      return;
    }
    
    // Verifica se o formato está correto (DD/MM/AAAA)
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (dateRegex.test(newValue)) {
      // Converte para formato ISO (AAAA-MM-DD)
      const isoDate = parseDateBR(newValue);
      onChange(isoDate);
    }
  };
  
  // Quando o campo perde o foco, formata a data corretamente
  const handleBlur = () => {
    if (value) {
      setDisplayValue(formatDateBR(value));
    }
  };
  
  return (
    <div className="relative">
      <Input
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder="DD/MM/AAAA"
        className={`${showIcon ? 'pl-10' : ''} ${className}`}
        {...props}
      />
      {showIcon && (
        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      )}
    </div>
  );
}
