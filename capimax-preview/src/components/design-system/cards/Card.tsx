import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled' | 'glass';
type CardSize = 'sm' | 'md' | 'lg' | 'xl';
type CardRadius = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: CardVariant;
  size?: CardSize;
  radius?: CardRadius;
  hover?: boolean;
  interactive?: boolean;
  borderAccent?: boolean;
  className?: string;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800',
  elevated: 'bg-white dark:bg-slate-900 shadow-lg dark:shadow-slate-900/20 border border-slate-200/50 dark:border-slate-800/50',
  outlined: 'bg-transparent border-2 border-slate-200 dark:border-slate-700',
  filled: 'bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50',
  glass: 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800/50',
};

const sizeStyles: Record<CardSize, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-12',
};

const radiusStyles: Record<CardRadius, string> = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-3xl',
  '2xl': 'rounded-[2rem]',
  '3xl': 'rounded-[3rem]',
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  size = 'md',
  radius = 'xl',
  hover = false,
  interactive = false,
  borderAccent = false,
  className,
  ...props
}) => {
  const Component = interactive ? motion.div : 'div';
  const motionProps = interactive ? {
    whileHover: { y: -4, scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.2 }
  } : {};

  return (
    <Component
      className={cn(
        // Base styles
        'transition-all duration-300',
        
        // Variant styles
        variantStyles[variant],
        
        // Size styles
        sizeStyles[size],
        
        // Radius styles
        radiusStyles[radius],
        
        // Hover styles
        hover && [
          'hover:shadow-xl dark:hover:shadow-slate-900/30',
          variant !== 'glass' && 'hover:border-slate-300 dark:hover:border-slate-600'
        ],
        
        // Interactive styles
        interactive && 'cursor-pointer',
        
        // Border accent
        borderAccent && 'hover:border-emerald-400 dark:hover:border-emerald-500',
        
        // Glass variant specific hover
        variant === 'glass' && hover && 'hover:bg-white/90 dark:hover:bg-slate-900/90',
        
        className
      )}
      {...motionProps}
      {...props}
    >
      {children}
    </Component>
  );
};