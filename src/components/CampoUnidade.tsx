import React from "react";

interface CampoUnidadeProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  error?: boolean;
  className?: string;
  disabled?: boolean;
}

export const CampoUnidade: React.FC<CampoUnidadeProps> = ({
  value,
  onChange,
  error = false,
  className = '',
  disabled = false,
}) => {
  return (
    <select
      id="unit"
      name="unit"
      value={value}
      onChange={onChange}
      className={`w-full p-2 rounded border ${error ? 'border-red-500' : 'border-input'} ${className}`}
      disabled={disabled}
    >
      <option value="Kg">Kg</option>
      <option value="g">g</option>
      <option value="Un">Unidade</option>
      <option value="L">Litro</option>
      <option value="ml">ml</option>
      <option value="pct">Pacote</option>
      <option value="cx">Caixa</option>
    </select>
  );
};
