import React, { forwardRef } from 'react';
import { cn } from '../../../utils/cn';
import { Check, Minus } from 'lucide-react';

type CheckboxSize = 'sm' | 'md' | 'lg';
type CheckboxState = 'default' | 'error';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: CheckboxSize;
  state?: CheckboxState;
  label?: string;
  description?: string;
  errorMessage?: string;
  indeterminate?: boolean;
  containerClassName?: string;
}

const sizeStyles: Record<CheckboxSize, { checkbox: string; icon: string; label: string }> = {
  sm: {
    checkbox: 'w-4 h-4',
    icon: 'w-3 h-3',
    label: 'text-sm',
  },
  md: {
    checkbox: 'w-5 h-5',
    icon: 'w-3.5 h-3.5',
    label: 'text-base',
  },
  lg: {
    checkbox: 'w-6 h-6',
    icon: 'w-4 h-4',
    label: 'text-lg',
  },
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  size = 'md',
  state = 'default',
  label,
  description,
  errorMessage,
  indeterminate = false,
  disabled = false,
  checked = false,
  containerClassName,
  className,
  ...props
}, ref) => {
  const actualState = errorMessage ? 'error' : state;
  const styles = sizeStyles[size];

  return (
    <div className={cn('space-y-2', containerClassName)}>
      <div className="flex items-start gap-3">
        {/* Checkbox Container */}
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            disabled={disabled}
            checked={indeterminate ? false : checked}
            className="sr-only"
            {...props}
          />
          
          {/* Custom Checkbox */}
          <div
            className={cn(
              // Base styles
              'border-2 rounded-lg transition-all duration-200 cursor-pointer',
              'flex items-center justify-center',
              styles.checkbox,
              
              // State styles
              actualState === 'error'
                ? 'border-red-500 dark:border-red-400'
                : 'border-slate-300 dark:border-slate-600',
              
              // Checked/Indeterminate styles
              (checked || indeterminate) && actualState !== 'error' && [
                'bg-emerald-500 border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600'
              ],
              
              (checked || indeterminate) && actualState === 'error' && [
                'bg-red-500 border-red-500 dark:bg-red-600 dark:border-red-600'
              ],
              
              // Unchecked styles
              !checked && !indeterminate && [
                'bg-white dark:bg-slate-900',
                actualState === 'error'
                  ? 'hover:border-red-600 dark:hover:border-red-300'
                  : 'hover:border-emerald-400 dark:hover:border-emerald-500'
              ],
              
              // Disabled styles
              disabled && 'opacity-60 cursor-not-allowed',
              
              // Focus styles
              'focus-within:ring-2 focus-within:ring-offset-2',
              actualState === 'error'
                ? 'focus-within:ring-red-500/20 dark:focus-within:ring-red-400/20'
                : 'focus-within:ring-emerald-500/20 dark:focus-within:ring-emerald-400/20',
              
              className
            )}
          >
            {/* Check Icon */}
            {checked && !indeterminate && (
              <Check 
                className={cn(
                  'text-white transition-all duration-200',
                  styles.icon
                )} 
              />
            )}
            
            {/* Indeterminate Icon */}
            {indeterminate && (
              <Minus 
                className={cn(
                  'text-white transition-all duration-200',
                  styles.icon
                )} 
              />
            )}
          </div>
        </div>

        {/* Label & Description */}
        {(label || description) && (
          <div className="flex-1 space-y-1">
            {label && (
              <label
                className={cn(
                  'font-medium cursor-pointer transition-colors',
                  actualState === 'error'
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-slate-700 dark:text-slate-300',
                  disabled && 'opacity-60 cursor-not-allowed',
                  styles.label
                )}
              >
                {label}
              </label>
            )}
            
            {description && (
              <p className={cn(
                'text-slate-500 dark:text-slate-400',
                disabled && 'opacity-60',
                size === 'sm' ? 'text-xs' : 'text-sm'
              )}>
                {description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-red-600 dark:text-red-400">
            {errorMessage}
          </span>
        </div>
      )}
    </div>
  );
});