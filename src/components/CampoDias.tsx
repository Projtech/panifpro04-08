import React from "react";

interface CampoDiasProps {
  values: Record<string, boolean>;
  onChange: (day: string, checked: boolean) => void;
  error?: boolean;
  className?: string;
  disabled?: boolean;
}

const diasDaSemana = [
  { key: 'monday', label: 'Seg' },
  { key: 'tuesday', label: 'Ter' },
  { key: 'wednesday', label: 'Qua' },
  { key: 'thursday', label: 'Qui' },
  { key: 'friday', label: 'Sex' },
  { key: 'saturday', label: 'Sáb' },
  { key: 'sunday', label: 'Dom' }
];

export const CampoDias: React.FC<CampoDiasProps> = ({
  values,
  onChange,
  error = false,
  className = '',
  disabled = false,
}) => {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={!!values.all_days}
          onChange={e => onChange('all_days', e.target.checked)}
          disabled={disabled}
        />
        Todos os dias
      </label>
      {diasDaSemana.map(dia => (
        <label key={dia.key} className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={!!values[dia.key]}
            onChange={e => onChange(dia.key, e.target.checked)}
            disabled={disabled}
          />
          {dia.label}
        </label>
      ))}
    </div>
  );
};
