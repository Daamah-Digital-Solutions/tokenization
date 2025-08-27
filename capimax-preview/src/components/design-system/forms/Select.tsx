import React, { forwardRef } from 'react';
import { cn } from '../../../utils/cn';
import { ChevronDown, Check, AlertCircle } from 'lucide-react';

type SelectVariant = 'default' | 'filled';
type SelectSize = 'sm' | 'md' | 'lg';
type SelectState = 'default' | 'error' | 'success';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  variant?: SelectVariant;
  size?: SelectSize;
  state?: SelectState;
  label?: string;
  placeholder?: string;
  helperText?: string;
  errorMessage?: string;
  options: SelectOption[];
  containerClassName?: string;
}

const variantStyles: Record<SelectVariant, string> = {
  default: 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700',
  filled: 'bg-slate-100 dark:bg-slate-800 border border-transparent',
};

const sizeStyles: Record<SelectSize, string> = {
  sm: 'h-10 px-3 text-sm',
  md: 'h-12 px-4 text-base',
  lg: 'h-14 px-6 text-lg',
};

const stateStyles: Record<SelectState, string> = {
  default: 'focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20',
  error: 'border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-2 focus:ring-red-500/20 dark:focus:ring-red-400/20',
  success: 'border-emerald-500 dark:border-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  variant = 'default',
  size = 'md',
  state = 'default',
  label,
  placeholder = 'Select an option...',
  helperText,
  errorMessage,
  options,
  disabled = false,
  containerClassName,
  className,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const actualState = errorMessage ? 'error' : state;

  return (
    <div className={cn('space-y-2', containerClassName)}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      {/* Select Container */}
      <div className="relative">
        <select
          ref={ref}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            // Base styles
            'w-full rounded-xl font-medium text-slate-900 dark:text-slate-100 cursor-pointer',
            'transition-all duration-200 outline-none appearance-none pr-10',
            
            // Variant styles
            variantStyles[variant],
            
            // Size styles
            sizeStyles[size],
            
            // State styles
            stateStyles[actualState],
            
            // Disabled styles
            disabled && 'opacity-60 cursor-not-allowed',
            
            // Focus styles
            isFocused && !disabled && 'shadow-lg shadow-emerald-500/10',
            
            // Placeholder styles
            'invalid:text-slate-400 dark:invalid:text-slate-500',
            
            className
          )}
          {...props}
        >
          <option value="" disabled hidden>
            {placeholder}
          </option>
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
            >
              {option.label}
            </option>
          ))}
        </select>

        {/* Icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
          {/* State Icons */}
          {actualState === 'error' && (
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
          )}
          {actualState === 'success' && (
            <Check className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          )}

          {/* Dropdown Arrow */}
          <ChevronDown className={cn(
            'w-5 h-5 transition-colors',
            disabled 
              ? 'text-slate-300 dark:text-slate-600' 
              : 'text-slate-400 dark:text-slate-500'
          )} />
        </div>
      </div>

      {/* Helper Text / Error Message */}
      {(helperText || errorMessage) && (
        <div className="flex items-center gap-2">
          {errorMessage ? (
            <>
              <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-600 dark:text-red-400">
                {errorMessage}
              </span>
            </>
          ) : (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {helperText}
            </span>
          )}
        </div>
      )}
    </div>
  );
});