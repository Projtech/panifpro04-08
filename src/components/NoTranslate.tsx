import React from 'react';

interface NoTranslateProps {
  children: React.ReactNode;
  className?: string;
}

export const NoTranslate: React.FC<NoTranslateProps> = ({ children, className = '' }) => {
  return (
    <span translate="no" className={className}>
      {children}
    </span>
  );
};

export default NoTranslate;
