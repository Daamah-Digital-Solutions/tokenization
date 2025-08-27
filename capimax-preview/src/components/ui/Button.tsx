import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  isLoading = false,
  className,
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700 focus:ring-emerald-500 shadow-lg hover:shadow-xl hover:shadow-emerald-500/25 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:active:bg-emerald-700',
    secondary: 'bg-navy-100 text-navy-700 hover:bg-navy-200 active:bg-navy-300 focus:ring-navy-500 shadow-md hover:shadow-lg dark:bg-navy-800 dark:text-navy-200 dark:hover:bg-navy-700 dark:active:bg-navy-600',
    outline: 'border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 focus:ring-emerald-500 dark:border-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-900/20 dark:active:bg-emerald-900/30',
    ghost: 'text-navy-600 hover:text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 focus:ring-emerald-500 dark:text-navy-300 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/20 dark:active:bg-emerald-900/30'
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm h-10',
    md: 'px-6 py-3 text-base h-12',
    lg: 'px-8 py-4 text-lg h-14'
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </motion.button>
  );
};