import React from 'react';
import { cn } from '../../../utils/cn';

type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
type ContainerPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  size?: ContainerSize;
  padding?: ContainerPadding;
  centerContent?: boolean;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

const sizeStyles: Record<ContainerSize, string> = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
};

const paddingStyles: Record<ContainerPadding, string> = {
  none: '',
  sm: 'px-4',
  md: 'px-6 lg:px-8',
  lg: 'px-8 lg:px-12',
  xl: 'px-12 lg:px-16',
};

export const Container: React.FC<ContainerProps> = ({
  children,
  size = 'xl',
  padding = 'md',
  centerContent = false,
  className,
  as: Component = 'div',
  ...props
}) => {
  return (
    <Component
      className={cn(
        // Base styles
        'mx-auto w-full',
        
        // Size styles
        sizeStyles[size],
        
        // Padding styles
        paddingStyles[padding],
        
        // Center content
        centerContent && 'flex items-center justify-center',
        
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};