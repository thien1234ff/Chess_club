import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'gold' | 'default' | 'success' | 'danger' | 'info' | 'warning';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className = ''
}) => {
  const baseStyles = 'inline-flex items-center font-bold tracking-wider rounded uppercase';
  
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs'
  };

  const variantStyles = {
    default: 'bg-darkborder text-neutral-300 border border-transparent',
    gold: 'bg-gold-muted text-gold border border-gold/30',
    success: 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/25',
    danger: 'bg-red-950/50 text-red-400 border border-red-500/25',
    info: 'bg-blue-950/50 text-blue-400 border border-blue-500/25',
    warning: 'bg-amber-950/50 text-amber-400 border border-amber-500/25'
  };

  return (
    <span className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};
export default Badge;
