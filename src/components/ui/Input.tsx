import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  isTextArea?: boolean;
  rows?: number;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  isTextArea = false,
  rows = 3,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input_${Math.random().toString(36).substring(2, 9)}`;
  const hasError = Boolean(error);
  
  const labelStyles = 'block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2';
  
  const baseInputStyles = `w-full bg-darkcard text-ivory border ${
    hasError ? 'border-red-500 focus:border-red-500' : 'border-darkborder focus:border-gold'
  } rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 ${
    hasError ? 'focus:ring-red-500' : 'focus:ring-gold'
  } transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`;

  return (
    <div className={`w-full text-left ${className}`}>
      {label && (
        <label htmlFor={inputId} className={labelStyles}>
          {label}
        </label>
      )}
      
      {isTextArea ? (
        <textarea
          id={inputId}
          rows={rows}
          className={`${baseInputStyles} resize-none`}
          // We cast because HTMLTextAreaElement is compatible enough for standard props in typing
          {...(props as any)}
        />
      ) : (
        <input
          id={inputId}
          className={baseInputStyles}
          {...props}
        />
      )}

      {error && (
        <p className="mt-1 text-xs text-red-500 font-medium">
          {error}
        </p>
      )}
      
      {!error && helperText && (
        <p className="mt-1 text-xs text-neutral-500">
          {helperText}
        </p>
      )}
    </div>
  );
};
export default Input;
