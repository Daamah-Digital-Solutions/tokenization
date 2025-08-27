import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';
import { Button } from '../../ui/Button';
import { Card } from '../cards/Card';
import { SectionHeader } from './SectionHeader';

type CTAVariant = 'default' | 'gradient' | 'minimal' | 'bordered';
type CTALayout = 'horizontal' | 'vertical';

interface CTAAction {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}

interface CallToActionProps {
  variant?: CTAVariant;
  layout?: CTALayout;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  title: string;
  description?: string;
  actions: CTAAction[];
  backgroundPattern?: boolean;
  className?: string;
}

const variantStyles: Record<CTAVariant, string> = {
  default: 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 border border-slate-200 dark:border-gray-700',
  gradient: 'bg-gradient-to-br from-emerald-500 to-green-600 text-white border-0 shadow-2xl shadow-emerald-500/25',
  minimal: 'bg-transparent',
  bordered: 'bg-white dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-800',
};

export const CallToAction: React.FC<CallToActionProps> = ({
  variant = 'default',
  layout = 'vertical',
  icon: Icon,
  badge,
  title,
  description,
  actions,
  backgroundPattern = false,
  className,
}) => {
  return (
    <div className={cn('relative', className)}>
      {variant === 'minimal' ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-8"
        >
          {/* Header */}
          <SectionHeader
            badge={badge}
            title={title}
            description={description}
            align="center"
            gradient={variant === 'gradient'}
          />

          {/* Actions */}
          <div className={cn(
            'flex gap-4 justify-center',
            layout === 'vertical' ? 'flex-col sm:flex-row' : 'flex-row flex-wrap'
          )}>
            {actions.map((action, index) => {
              const ActionIcon = action.icon;
              return (
                <Button
                  key={index}
                  variant={action.variant || 'primary'}
                  size={action.size || 'lg'}
                  onClick={action.onClick}
                  className="font-semibold"
                >
                  {ActionIcon && <ActionIcon className="mr-2 w-5 h-5" />}
                  {action.label}
                </Button>
              );
            })}
          </div>
        </motion.div>
      ) : (
        <Card
          variant="elevated"
          size="xl"
          radius="3xl"
          className={cn(
            'relative overflow-hidden',
            variantStyles[variant]
          )}
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

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative z-10"
          >
            <div className={cn(
              'flex gap-8',
              layout === 'vertical' ? 'flex-col items-center text-center' : 'flex-col md:flex-row md:items-center md:justify-between'
            )}>
              {/* Content */}
              <div className={cn(
                'space-y-4',
                layout === 'horizontal' && 'flex-1'
              )}>
                {/* Icon */}
                {Icon && (
                  <div className={cn(
                    'inline-flex items-center justify-center rounded-2xl',
                    variant === 'gradient' 
                      ? 'w-16 h-16 bg-white/20 text-white'
                      : 'w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-lg'
                  )}>
                    <Icon className="w-8 h-8" />
                  </div>
                )}

                {/* Badge */}
                {badge && (
                  <div className={cn(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
                    variant === 'gradient'
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  )}>
                    {badge}
                  </div>
                )}

                {/* Title */}
                <h3 className={cn(
                  'text-3xl font-bold leading-tight',
                  variant === 'gradient' 
                    ? 'text-white' 
                    : 'text-slate-900 dark:text-white'
                )}>
                  {title}
                </h3>

                {/* Description */}
                {description && (
                  <p className={cn(
                    'text-lg leading-relaxed',
                    layout === 'vertical' && 'max-w-2xl mx-auto',
                    variant === 'gradient' 
                      ? 'text-white/90' 
                      : 'text-slate-600 dark:text-gray-400'
                  )}>
                    {description}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className={cn(
                'flex gap-4',
                layout === 'vertical' ? 'flex-col sm:flex-row justify-center' : 'flex-col sm:flex-row flex-shrink-0'
              )}>
                {actions.map((action, index) => {
                  const ActionIcon = action.icon;
                  return (
                    <Button
                      key={index}
                      variant={variant === 'gradient' ? 'secondary' : (action.variant || 'primary')}
                      size={action.size || 'lg'}
                      onClick={action.onClick}
                      className={cn(
                        'font-semibold',
                        variant === 'gradient' && action.variant === 'primary' && 'bg-white text-emerald-600 hover:bg-gray-100',
                        variant === 'gradient' && action.variant === 'ghost' && 'bg-white/10 text-white hover:bg-white/20 border-white/20'
                      )}
                    >
                      {ActionIcon && <ActionIcon className="mr-2 w-5 h-5" />}
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </Card>
      )}
    </div>
  );
};