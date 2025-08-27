import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';

type SectionVariant = 'default' | 'gradient' | 'accent' | 'dark';
type SectionSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type SectionWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  variant?: SectionVariant;
  size?: SectionSize;
  width?: SectionWidth;
  animated?: boolean;
  backgroundPattern?: boolean;
  backgroundElements?: boolean;
  className?: string;
  as?: 'section' | 'div' | 'article' | 'aside';
}

const variantStyles: Record<SectionVariant, string> = {
  default: 'bg-white dark:bg-slate-900',
  gradient: 'bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800',
  accent: 'bg-emerald-50 dark:bg-emerald-950/20',
  dark: 'bg-slate-900 dark:bg-black text-white dark:text-slate-100',
};

const sizeStyles: Record<SectionSize, string> = {
  sm: 'py-12',
  md: 'py-16',
  lg: 'py-24',
  xl: 'py-32',
  '2xl': 'py-40',
};

const widthStyles: Record<SectionWidth, string> = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
};

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1
    }
  }
};

export const Section: React.FC<SectionProps> = ({
  children,
  variant = 'default',
  size = 'lg',
  width = 'xl',
  animated = false,
  backgroundPattern = false,
  backgroundElements = false,
  className,
  as: Component = 'section',
  ...props
}) => {
  const MotionComponent = animated ? motion[Component] : Component;
  const motionProps = animated ? {
    variants: containerVariants,
    initial: "hidden",
    whileInView: "visible",
    viewport: { once: true, margin: "-100px" }
  } : {};

  return (
    <MotionComponent
      className={cn(
        'relative overflow-hidden',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...motionProps}
      {...props}
    >
      {/* Background Pattern */}
      {backgroundPattern && (
        <div className="absolute inset-0 opacity-5 dark:opacity-10">
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,0,0,0.03) 35px, rgba(0,0,0,0.03) 70px)`
            }} 
          />
        </div>
      )}

      {/* Background Elements */}
      {backgroundElements && (
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ 
              opacity: [0.03, 0.06, 0.03],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-emerald-400/20 to-green-400/20 dark:from-emerald-500/15 dark:to-green-500/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ 
              opacity: [0.03, 0.06, 0.03],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute -bottom-20 -left-20 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/20 dark:from-purple-500/10 dark:to-pink-500/10 rounded-full blur-3xl"
          />
        </div>
      )}

      {/* Content Container */}
      <div className={cn(
        'relative z-10 mx-auto px-6 lg:px-8',
        widthStyles[width]
      )}>
        {children}
      </div>
    </MotionComponent>
  );
};