import React, { forwardRef } from 'react';
import { cn } from '../../../utils/cn';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';

type InputVariant = 'default' | 'filled';
type InputSize = 'sm' | 'md' | 'lg';
type InputState = 'default' | 'error' | 'success';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: InputVariant;
  size?: InputSize;
  state?: InputState;
  label?: string;
  placeholder?: string;
  helperText?: string;
  errorMessage?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
  containerClassName?: string;
}

const variantStyles: Record<InputVariant, string> = {
  default: 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700',
  filled: 'bg-slate-100 dark:bg-slate-800 border border-transparent',
};

const sizeStyles: Record<InputSize, string> = {
  sm: 'h-10 px-3 text-sm',
  md: 'h-12 px-4 text-base',
  lg: 'h-14 px-6 text-lg',
};

const stateStyles: Record<InputState, string> = {
  default: 'focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20',
  error: 'border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-2 focus:ring-red-500/20 dark:focus:ring-red-400/20',
  success: 'border-emerald-500 dark:border-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  variant = 'default',
  size = 'md',
  state = 'default',
  label,
  placeholder,
  helperText,
  errorMessage,
  leftIcon,
  rightIcon,
  showPasswordToggle = false,
  type = 'text',
  disabled = false,
  containerClassName,
  className,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  
  const inputType = type === 'password' && showPassword ? 'text' : type;
  const actualState = errorMessage ? 'error' : state;

  const handlePasswordToggle = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={cn('space-y-2', containerClassName)}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Left Icon */}
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            {leftIcon}
          </div>
        )}

        {/* Input */}
        <input
          ref={ref}
          type={inputType}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            // Base styles
            'w-full rounded-xl font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500',
            'transition-all duration-200 outline-none',
            
            // Variant styles
            variantStyles[variant],
            
            // Size styles
            sizeStyles[size],
            
            // State styles
            stateStyles[actualState],
            
            // Disabled styles
            disabled && 'opacity-60 cursor-not-allowed',
            
            // Icon padding adjustments
            leftIcon && 'pl-10',
            (rightIcon || showPasswordToggle || actualState === 'error' || actualState === 'success') && 'pr-10',
            
            // Focus styles
            isFocused && !disabled && 'shadow-lg shadow-emerald-500/10',
            
            className
          )}
          {...props}
        />

        {/* Right Icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {/* State Icons */}
          {actualState === 'error' && (
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
          )}
          {actualState === 'success' && (
            <Check className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          )}

          {/* Password Toggle */}
          {showPasswordToggle && type === 'password' && (
            <button
              type="button"
              onClick={handlePasswordToggle}
              className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Custom Right Icon */}
          {rightIcon && !showPasswordToggle && actualState === 'default' && (
            <div className="text-slate-400 dark:text-slate-500">
              {rightIcon}
            </div>
          )}
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