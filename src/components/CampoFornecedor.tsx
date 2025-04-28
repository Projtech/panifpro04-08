import React from "react";

interface CampoFornecedorProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: boolean;
  className?: string;
  disabled?: boolean;
}

export const CampoFornecedor: React.FC<CampoFornecedorProps> = ({
  value,
  onChange,
  error = false,
  className = '',
  disabled = false,
}) => {
  return (
    <input
      type="text"
      id="supplier"
      name="supplier"
      value={value}
      onChange={onChange}
      className={`w-full p-2 rounded border ${error ? 'border-red-500' : 'border-input'} ${className}`}
      placeholder="Fornecedor"
      disabled={disabled}
    />
  );
};
