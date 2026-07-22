import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  bordered?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  bordered = true,
  padding = 'md',
  className = '',
  ...props
}) => {
  const baseStyles = 'bg-darkcard rounded-xl text-left overflow-hidden transition-all duration-300';
  const borderStyles = bordered ? 'border border-darkborder' : '';
  const hoverStyles = hoverable ? 'hover:border-neutral-700 hover:shadow-lg hover:shadow-neutral-950/50 hover:-translate-y-1' : '';
  
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div
      className={`${baseStyles} ${borderStyles} ${hoverStyles} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
export default Card;
