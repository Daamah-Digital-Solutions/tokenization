import React from 'react';
import { cn } from '../../../utils/cn';

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type IconColor = 'current' | 'primary' | 'secondary' | 'accent' | 'muted' | 'success' | 'warning' | 'error';
type IconVariant = 'default' | 'solid' | 'outline' | 'ghost';

interface IconProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ComponentType<{ className?: string }>;
  size?: IconSize;
  color?: IconColor;
  variant?: IconVariant;
  className?: string;
}

const sizeStyles: Record<IconSize, { icon: string; container?: string }> = {
  xs: { icon: 'w-3 h-3' },
  sm: { icon: 'w-4 h-4' },
  md: { icon: 'w-5 h-5' },
  lg: { icon: 'w-6 h-6' },
  xl: { icon: 'w-8 h-8' },
  '2xl': { icon: 'w-10 h-10' },
};

const colorStyles: Record<IconColor, string> = {
  current: 'text-current',
  primary: 'text-slate-900 dark:text-slate-100',
  secondary: 'text-slate-600 dark:text-slate-400',
  accent: 'text-emerald-500 dark:text-emerald-400',
  muted: 'text-slate-400 dark:text-slate-500',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
};

const variantStyles: Record<IconVariant, (size: IconSize) => string> = {
  default: () => '',
  solid: (size) => cn(
    'inline-flex items-center justify-center rounded-lg bg-emerald-500 text-white',
    size === 'xs' && 'p-1',
    size === 'sm' && 'p-1.5',
    size === 'md' && 'p-2',
    size === 'lg' && 'p-2.5',
    size === 'xl' && 'p-3',
    size === '2xl' && 'p-4'
  ),
  outline: (size) => cn(
    'inline-flex items-center justify-center rounded-lg border-2 border-emerald-500 text-emerald-500',
    size === 'xs' && 'p-1',
    size === 'sm' && 'p-1.5',
    size === 'md' && 'p-2',
    size === 'lg' && 'p-2.5',
    size === 'xl' && 'p-3',
    size === '2xl' && 'p-4'
  ),
  ghost: (size) => cn(
    'inline-flex items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    size === 'xs' && 'p-1',
    size === 'sm' && 'p-1.5',
    size === 'md' && 'p-2',
    size === 'lg' && 'p-2.5',
    size === 'xl' && 'p-3',
    size === '2xl' && 'p-4'
  ),
};

export const Icon: React.FC<IconProps> = ({
  icon: IconComponent,
  size = 'md',
  color = 'current',
  variant = 'default',
  className,
  ...props
}) => {
  const iconSize = sizeStyles[size];
  const iconColor = variant === 'default' ? colorStyles[color] : '';
  const variantStyle = variantStyles[variant](size);

  if (variant === 'default') {
    return (
      <IconComponent 
        className={cn(
          iconSize.icon,
          iconColor,
          className
        )}
        {...props}
      />
    );
  }

  return (
    <div
      className={cn(
        variantStyle,
        className
      )}
      {...props}
    >
      <IconComponent className={iconSize.icon} />
    </div>
  );
};