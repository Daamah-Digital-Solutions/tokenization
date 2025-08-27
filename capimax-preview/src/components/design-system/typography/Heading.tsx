import React from 'react';
import { cn } from '../../../utils/cn';

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
type HeadingSize = '7xl' | '6xl' | '5xl' | '4xl' | '3xl' | '2xl' | 'xl' | 'lg' | 'base';
type HeadingWeight = 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
type HeadingColor = 'primary' | 'secondary' | 'accent' | 'gradient';
type HeadingAlign = 'left' | 'center' | 'right';

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  level?: HeadingLevel;
  size?: HeadingSize;
  weight?: HeadingWeight;
  color?: HeadingColor;
  align?: HeadingAlign;
  gradient?: boolean;
  className?: string;
}

// Default size mapping for heading levels
const defaultSizes: Record<HeadingLevel, HeadingSize> = {
  h1: '6xl',
  h2: '4xl',
  h3: '3xl',
  h4: '2xl',
  h5: 'xl',
  h6: 'lg',
};

const sizeStyles: Record<HeadingSize, string> = {
  '7xl': 'text-7xl leading-tight tracking-tight',
  '6xl': 'text-6xl leading-tight tracking-tight',
  '5xl': 'text-5xl leading-tight tracking-tight',
  '4xl': 'text-4xl leading-tight tracking-tight',
  '3xl': 'text-3xl leading-tight tracking-tight',
  '2xl': 'text-2xl leading-tight tracking-tight',
  xl: 'text-xl leading-tight tracking-tight',
  lg: 'text-lg leading-tight tracking-tight',
  base: 'text-base leading-tight tracking-tight',
};

const weightStyles: Record<HeadingWeight, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  extrabold: 'font-extrabold',
};

const colorStyles: Record<HeadingColor, string> = {
  primary: 'text-slate-900 dark:text-white',
  secondary: 'text-slate-700 dark:text-slate-300',
  accent: 'text-emerald-600 dark:text-emerald-400',
  gradient: 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 dark:from-emerald-400 dark:via-green-400 dark:to-teal-400',
};

const alignStyles: Record<HeadingAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export const Heading: React.FC<HeadingProps> = ({
  children,
  level = 'h2',
  size,
  weight = 'bold',
  color = 'primary',
  align = 'left',
  gradient = false,
  className,
  ...props
}) => {
  const Component = level;
  const actualSize = size || defaultSizes[level];
  const actualColor = gradient ? 'gradient' : color;

  return (
    <Component
      className={cn(
        // Base styles
        'font-primary transition-colors duration-200',
        
        // Size styles
        sizeStyles[actualSize],
        
        // Weight styles
        weightStyles[weight],
        
        // Color styles
        colorStyles[actualColor],
        
        // Alignment styles
        alignStyles[align],
        
        // Responsive adjustments for larger text
        (actualSize === '7xl' || actualSize === '6xl') && 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl',
        (actualSize === '5xl') && 'text-3xl sm:text-4xl md:text-5xl',
        (actualSize === '4xl') && 'text-2xl sm:text-3xl md:text-4xl',
        
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};