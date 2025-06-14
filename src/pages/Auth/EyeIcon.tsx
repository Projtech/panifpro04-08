import { Eye, EyeOff } from 'lucide-react';

interface EyeIconProps {
  open: boolean;
  className?: string;
}

export function EyeIcon({ open, className = '' }: EyeIconProps) {
  const iconProps = {
    size: 20,
    className: `text-gray-500 hover:text-gray-700 cursor-pointer ${className}`,
    'aria-hidden': true
  };

  return open ? (
    <EyeOff {...iconProps} />
  ) : (
    <Eye {...iconProps} />
  );
}
