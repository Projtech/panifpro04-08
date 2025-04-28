import React from "react";

interface CampoSKUProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: boolean;
  className?: string;
  disabled?: boolean;
}

export const CampoSKU: React.FC<CampoSKUProps> = ({
  value,
  onChange,
  error = false,
  className = '',
  disabled = false,
}) => {
  return (
    <input
      type="text"
      id="sku"
      name="sku"
      value={value}
      onChange={onChange}
      className={`w-full p-2 rounded border ${error ? 'border-red-500' : 'border-input'} ${className}`}
      placeholder="SKU do produto"
      disabled={disabled}
    />
  );
};
