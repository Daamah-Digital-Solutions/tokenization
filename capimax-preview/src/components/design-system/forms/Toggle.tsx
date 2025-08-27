import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';

type ToggleSize = 'sm' | 'md' | 'lg';
type ToggleState = 'default' | 'error';

interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: ToggleSize;
  state?: ToggleState;
  label?: string;
  description?: string;
  errorMessage?: string;
  containerClassName?: string;
}

const sizeStyles: Record<ToggleSize, { track: string; thumb: string; label: string }> = {
  sm: {
    track: 'w-9 h-5',
    thumb: 'w-3 h-3',
    label: 'text-sm',
  },
  md: {
    track: 'w-11 h-6',
    thumb: 'w-4 h-4',
    label: 'text-base',
  },
  lg: {
    track: 'w-14 h-7',
    thumb: 'w-5 h-5',
    label: 'text-lg',
  },
};

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(({
  size = 'md',
  state = 'default',
  label,
  description,
  errorMessage,
  disabled = false,
  checked = false,
  containerClassName,
  className,
  onChange,
  ...props
}, ref) => {
  const actualState = errorMessage ? 'error' : state;
  const styles = sizeStyles[size];

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled && onChange) {
      onChange(e);
    }
  };

  return (
    <div className={cn('space-y-2', containerClassName)}>
      <div className="flex items-start gap-3">
        {/* Toggle Container */}
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            disabled={disabled}
            checked={checked}
            onChange={handleToggle}
            className="sr-only"
            {...props}
          />
          
          {/* Toggle Track */}
          <button
            type="button"
            onClick={() => {
              if (!disabled && ref && 'current' in ref && ref.current) {
                ref.current.click();
              }
            }}
            disabled={disabled}
            className={cn(
              // Base styles
              'relative rounded-full transition-all duration-200 cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              styles.track,
              
              // State styles
              actualState === 'error'
                ? 'focus:ring-red-500/20 dark:focus:ring-red-400/20'
                : 'focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20',
              
              // Checked styles
              checked && actualState !== 'error' && [
                'bg-emerald-500 dark:bg-emerald-600'
              ],
              
              checked && actualState === 'error' && [
                'bg-red-500 dark:bg-red-600'
              ],
              
              // Unchecked styles
              !checked && [
                'bg-slate-200 dark:bg-slate-700',
                actualState === 'error'
                  ? 'hover:bg-red-100 dark:hover:bg-red-900/20'
                  : 'hover:bg-slate-300 dark:hover:bg-slate-600'
              ],
              
              // Disabled styles
              disabled && 'opacity-60 cursor-not-allowed',
              
              className
            )}
          >
            {/* Toggle Thumb */}
            <motion.div
              animate={{
                x: checked 
                  ? (size === 'sm' ? 16 : size === 'md' ? 20 : 28) 
                  : 4
              }}
              transition={{ 
                type: "spring", 
                stiffness: 500, 
                damping: 30 
              }}
              className={cn(
                'absolute top-1 bg-white rounded-full shadow-lg',
                'transition-shadow duration-200',
                styles.thumb,
                
                // Shadow styles
                checked
                  ? 'shadow-lg'
                  : 'shadow-md',
              )}
            />
          </button>
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
                onClick={() => {
                  if (!disabled && ref && 'current' in ref && ref.current) {
                    ref.current.click();
                  }
                }}
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