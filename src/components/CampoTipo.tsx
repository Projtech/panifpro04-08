import React from "react";

interface CampoTipoProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  error?: boolean;
  className?: string;
  disabled?: boolean;
}

export const CampoTipo: React.FC<CampoTipoProps> = ({
  value,
  onChange,
  error = false,
  className = '',
  disabled = false,
}) => {
  return (
    <select
      id="type"
      name="type"
      value={value}
      onChange={onChange}
      className={`w-full p-2 rounded border ${error ? 'border-red-500' : 'border-input'} ${className}`}
      disabled={disabled}
    >
      <option value="materia_prima">Matéria Prima</option>
      <option value="embalagem">Embalagem</option>
      <option value="subreceita">SubReceita</option>
      <option value="decoracao">Decoração</option>
    </select>
  );
};
