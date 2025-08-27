import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';
import { Card } from './Card';
import { Text } from '../typography/Text';

type StatsCardVariant = 'default' | 'accent' | 'gradient';
type StatsCardSize = 'sm' | 'md' | 'lg';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ComponentType<{ className?: string }>;
  variant?: StatsCardVariant;
  size?: StatsCardSize;
  animated?: boolean;
  className?: string;
}

const variantStyles: Record<StatsCardVariant, { 
  card: string;
  icon: string;
  value: string;
}> = {
  default: {
    card: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800',
    icon: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    value: 'text-slate-900 dark:text-white',
  },
  accent: {
    card: 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50',
    icon: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    value: 'text-emerald-900 dark:text-emerald-100',
  },
  gradient: {
    card: 'bg-gradient-to-br from-emerald-500 to-green-600 border-0 text-white shadow-lg shadow-emerald-500/25',
    icon: 'bg-white/20 text-white',
    value: 'text-white',
  },
};

const sizeStyles: Record<StatsCardSize, { 
  padding: string;
  icon: string;
  value: string;
  title: string;
}> = {
  sm: {
    padding: 'p-4',
    icon: 'w-8 h-8 p-2',
    value: 'text-xl',
    title: 'text-sm',
  },
  md: {
    padding: 'p-6',
    icon: 'w-12 h-12 p-3',
    value: 'text-3xl',
    title: 'text-base',
  },
  lg: {
    padding: 'p-8',
    icon: 'w-16 h-16 p-4',
    value: 'text-4xl',
    title: 'text-lg',
  },
};

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  change,
  changeType = 'neutral',
  icon: Icon,
  variant = 'default',
  size = 'md',
  animated = true,
  className,
}) => {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  const changeColor = {
    positive: 'text-emerald-600 dark:text-emerald-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-slate-500 dark:text-slate-400',
  }[changeType];

  return (
    <Card
      variant="elevated"
      hover={animated}
      interactive={animated}
      className={cn(
        variantStyle.card,
        sizeStyle.padding,
        'group cursor-default',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Title */}
          <Text
            variant={size === 'sm' ? 'bodySmall' : 'body'}
            color={variant === 'gradient' ? 'primary' : 'tertiary'}
            weight="medium"
            className={cn(
              'mb-2',
              variant === 'gradient' && 'text-white/90'
            )}
          >
            {title}
          </Text>

          {/* Value */}
          <motion.div
            initial={animated ? { scale: 0.5, opacity: 0 } : {}}
            whileInView={animated ? { scale: 1, opacity: 1 } : {}}
            viewport={{ once: true }}
            transition={{ duration: 0.5, type: 'spring' }}
            className={cn(
              'font-bold leading-tight mb-2',
              variantStyle.value,
              sizeStyle.value
            )}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </motion.div>

          {/* Subtitle & Change */}
          <div className="flex items-center gap-3">
            {subtitle && (
              <Text
                variant="caption"
                color={variant === 'gradient' ? 'primary' : 'muted'}
                className={variant === 'gradient' ? 'text-white/80' : ''}
              >
                {subtitle}
              </Text>
            )}
            
            {change && (
              <Text
                variant="caption"
                weight="medium"
                className={cn(
                  changeColor,
                  variant === 'gradient' && changeType === 'positive' && 'text-white',
                  variant === 'gradient' && changeType === 'negative' && 'text-red-200',
                  variant === 'gradient' && changeType === 'neutral' && 'text-white/80'
                )}
              >
                {change}
              </Text>
            )}
          </div>
        </div>

        {/* Icon */}
        {Icon && (
          <motion.div
            whileHover={animated ? { rotate: 360, scale: 1.1 } : {}}
            transition={{ duration: 0.6 }}
            className={cn(
              'flex items-center justify-center rounded-xl transition-all duration-300',
              'group-hover:shadow-lg',
              variantStyle.icon,
              sizeStyle.icon,
              variant === 'gradient' && 'group-hover:shadow-white/20'
            )}
          >
            <Icon className="w-full h-full" />
          </motion.div>
        )}
      </div>
    </Card>
  );
};