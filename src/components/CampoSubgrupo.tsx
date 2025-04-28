import React from "react";

interface CampoSubgrupoProps {
  value: string | null;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  error?: boolean;
  className?: string;
  disabled?: boolean;
}

export const CampoSubgrupo: React.FC<CampoSubgrupoProps> = ({
  value,
  onChange,
  options,
  error = false,
  className = '',
  disabled = false,
}) => {
  return (
    <select
      id="subgroup_id"
      name="subgroup_id"
      value={value ?? ''}
      onChange={onChange}
      className={`w-full p-2 rounded border ${error ? 'border-red-500' : 'border-input'} ${className}`}
      disabled={disabled}
    >
      <option value="">Selecione o subgrupo</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
};
