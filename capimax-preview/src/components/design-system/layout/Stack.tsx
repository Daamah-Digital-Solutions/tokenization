import React from 'react';
import { cn } from '../../../utils/cn';

type StackDirection = 'row' | 'column';
type StackSpacing = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  direction?: StackDirection;
  spacing?: StackSpacing;
  align?: StackAlign;
  justify?: StackJustify;
  wrap?: boolean;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

const directionStyles: Record<StackDirection, string> = {
  row: 'flex-row',
  column: 'flex-col',
};

const spacingStyles: Record<StackDirection, Record<StackSpacing, string>> = {
  row: {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
    '2xl': 'gap-12',
    '3xl': 'gap-16',
  },
  column: {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
    '2xl': 'gap-12',
    '3xl': 'gap-16',
  },
};

const alignStyles: Record<StackAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

const justifyStyles: Record<StackJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

export const Stack: React.FC<StackProps> = ({
  children,
  direction = 'column',
  spacing = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  className,
  as: Component = 'div',
  ...props
}) => {
  return (
    <Component
      className={cn(
        // Base styles
        'flex',
        
        // Direction
        directionStyles[direction],
        
        // Spacing
        spacingStyles[direction][spacing],
        
        // Alignment
        alignStyles[align],
        justifyStyles[justify],
        
        // Wrap
        wrap && 'flex-wrap',
        
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};