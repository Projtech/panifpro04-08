import React, { useEffect, useRef } from "react";
import { EnhancedAutocomplete } from "@/components/ui/enhanced-autocomplete";

interface CampoNomeProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelect?: (value: string) => void;
  suggestions: string[];
  error?: boolean;
  isDuplicate?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const CampoNome: React.FC<CampoNomeProps> = ({
  value,
  onChange,
  onSelect,
  suggestions,
  error = false,
  isDuplicate = false,
  className = '',
  placeholder = '',
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      console.log('[CampoNome] Largura do campo:', inputRef.current.offsetWidth, 'px');
    }
  }, []);

  return (
    <EnhancedAutocomplete
      id="name"
      name="name"
      value={value}
      onChange={onChange}
      onSelect={onSelect}
      suggestions={suggestions}
      className={`w-full ${className} ${error ? 'border border-red-500' : ''}`}
      isDuplicate={isDuplicate}
      error={error}
      size="lg"
      placeholder={placeholder || 'Digite o nome do produto'}
      disabled={disabled}
      inputRef={inputRef}
    />
  );
};
