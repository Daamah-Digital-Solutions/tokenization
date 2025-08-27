import React from 'react';
import { cn } from '../../../utils/cn';

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'outline';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ComponentType<{ className?: string }>;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  primary: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900',
  secondary: 'bg-slate-600 text-white dark:bg-slate-400 dark:text-slate-900',
  accent: 'bg-emerald-500 text-white',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  outline: 'border border-slate-300 text-slate-700 bg-transparent dark:border-slate-600 dark:text-slate-300',
};

const sizeStyles: Record<BadgeSize, { container: string; text: string; icon: string }> = {
  sm: { 
    container: 'px-2 py-0.5 rounded-md',
    text: 'text-xs',
    icon: 'w-3 h-3'
  },
  md: { 
    container: 'px-2.5 py-1 rounded-lg',
    text: 'text-sm',
    icon: 'w-3.5 h-3.5'
  },
  lg: { 
    container: 'px-3 py-1.5 rounded-lg',
    text: 'text-base',
    icon: 'w-4 h-4'
  },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  icon: IconComponent,
  dot = false,
  className,
  ...props
}) => {
  const styles = sizeStyles[size];

  return (
    <span
      className={cn(
        // Base styles
        'inline-flex items-center gap-1 font-medium transition-colors',
        
        // Variant styles
        variantStyles[variant],
        
        // Size styles
        styles.container,
        styles.text,
        
        className
      )}
      {...props}
    >
      {/* Dot indicator */}
      {dot && (
        <span className={cn(
          'w-2 h-2 rounded-full',
          variant === 'accent' && 'bg-white',
          variant === 'success' && 'bg-emerald-500 dark:bg-emerald-400',
          variant === 'warning' && 'bg-amber-500 dark:bg-amber-400',
          variant === 'error' && 'bg-red-500 dark:bg-red-400',
          (variant === 'default' || variant === 'outline') && 'bg-slate-400 dark:bg-slate-500',
          variant === 'primary' && 'bg-white dark:bg-slate-900',
          variant === 'secondary' && 'bg-white dark:bg-slate-900',
        )} />
      )}

      {/* Icon */}
      {IconComponent && (
        <IconComponent className={styles.icon} />
      )}

      {/* Content */}
      {children}
    </span>
  );
};