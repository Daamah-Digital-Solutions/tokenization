import React from 'react';
import { cn } from '../../../utils/cn';

type TextVariant = 'body' | 'bodyLarge' | 'bodySmall' | 'caption' | 'label' | 'overline';
type TextWeight = 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
type TextColor = 'primary' | 'secondary' | 'tertiary' | 'muted' | 'success' | 'warning' | 'error' | 'accent';
type TextAlign = 'left' | 'center' | 'right' | 'justify';

interface TextProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'> {
  children: React.ReactNode;
  variant?: TextVariant;
  weight?: TextWeight;
  color?: TextColor;
  align?: TextAlign;
  as?: 'span' | 'p' | 'div' | 'label';
  truncate?: boolean;
  italic?: boolean;
  className?: string;
}

const variantStyles: Record<TextVariant, string> = {
  body: 'text-base leading-normal',
  bodyLarge: 'text-lg leading-relaxed',
  bodySmall: 'text-sm leading-normal',
  caption: 'text-xs leading-tight',
  label: 'text-sm leading-tight font-medium',
  overline: 'text-xs leading-tight uppercase tracking-wider font-medium',
};

const weightStyles: Record<TextWeight, string> = {
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

const colorStyles: Record<TextColor, string> = {
  primary: 'text-slate-900 dark:text-slate-50',
  secondary: 'text-slate-700 dark:text-slate-300',
  tertiary: 'text-slate-600 dark:text-slate-400',
  muted: 'text-slate-500 dark:text-slate-500',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
  accent: 'text-emerald-500 dark:text-emerald-400',
};

const alignStyles: Record<TextAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
};

export const Text: React.FC<TextProps> = ({
  children,
  variant = 'body',
  weight = 'normal',
  color = 'primary',
  align = 'left',
  as: Component = 'span',
  truncate = false,
  italic = false,
  className,
  ...props
}) => {
  return (
    <Component
      className={cn(
        // Base styles
        'transition-colors duration-200',
        
        // Variant styles
        variantStyles[variant],
        
        // Weight styles
        weightStyles[weight],
        
        // Color styles
        colorStyles[color],
        
        // Alignment styles
        alignStyles[align],
        
        // Conditional styles
        truncate && 'truncate',
        italic && 'italic',
        
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};