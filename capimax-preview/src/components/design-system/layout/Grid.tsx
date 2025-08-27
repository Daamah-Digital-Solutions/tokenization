import React from 'react';
import { cn } from '../../../utils/cn';

type GridCols = 1 | 2 | 3 | 4 | 5 | 6 | 12;
type GridGap = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type GridAlign = 'start' | 'center' | 'end' | 'stretch';
type GridJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  cols?: GridCols;
  gap?: GridGap;
  align?: GridAlign;
  justify?: GridJustify;
  responsive?: {
    sm?: GridCols;
    md?: GridCols;
    lg?: GridCols;
    xl?: GridCols;
  };
  className?: string;
}

const colsStyles: Record<GridCols, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  12: 'grid-cols-12',
};

const responsiveColsStyles = {
  sm: {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
    5: 'sm:grid-cols-5',
    6: 'sm:grid-cols-6',
    12: 'sm:grid-cols-12',
  },
  md: {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6',
    12: 'md:grid-cols-12',
  },
  lg: {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
    12: 'lg:grid-cols-12',
  },
  xl: {
    1: 'xl:grid-cols-1',
    2: 'xl:grid-cols-2',
    3: 'xl:grid-cols-3',
    4: 'xl:grid-cols-4',
    5: 'xl:grid-cols-5',
    6: 'xl:grid-cols-6',
    12: 'xl:grid-cols-12',
  },
} as const;

const gapStyles: Record<GridGap, string> = {
  none: 'gap-0',
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8',
  xl: 'gap-12',
  '2xl': 'gap-16',
};

const alignStyles: Record<GridAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

const justifyStyles: Record<GridJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

export const Grid: React.FC<GridProps> = ({
  children,
  cols = 1,
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  responsive,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        // Base styles
        'grid',
        
        // Columns
        colsStyles[cols],
        
        // Responsive columns
        responsive?.sm && responsiveColsStyles.sm[responsive.sm],
        responsive?.md && responsiveColsStyles.md[responsive.md],
        responsive?.lg && responsiveColsStyles.lg[responsive.lg],
        responsive?.xl && responsiveColsStyles.xl[responsive.xl],
        
        // Gap
        gapStyles[gap],
        
        // Alignment
        alignStyles[align],
        justifyStyles[justify],
        
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};