import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';
import { Heading } from '../typography/Heading';
import { Text } from '../typography/Text';

type SectionHeaderAlign = 'left' | 'center' | 'right';
type SectionHeaderSize = 'sm' | 'md' | 'lg' | 'xl';

interface SectionHeaderProps {
  badge?: string;
  badgeIcon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  description?: string;
  align?: SectionHeaderAlign;
  size?: SectionHeaderSize;
  gradient?: boolean;
  animated?: boolean;
  className?: string;
}

const sizeStyles: Record<SectionHeaderSize, {
  title: 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
  spacing: string;
}> = {
  sm: { title: '2xl', spacing: 'space-y-4' },
  md: { title: '3xl', spacing: 'space-y-6' },
  lg: { title: '4xl', spacing: 'space-y-8' },
  xl: { title: '5xl', spacing: 'space-y-10' },
};

const alignStyles: Record<SectionHeaderAlign, string> = {
  left: 'text-left items-start',
  center: 'text-center items-center',
  right: 'text-right items-end',
};

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  badge,
  badgeIcon: BadgeIcon,
  title,
  subtitle,
  description,
  align = 'center',
  size = 'lg',
  gradient = false,
  animated = true,
  className,
}) => {
  const styles = sizeStyles[size];

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

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  const MotionDiv = animated ? motion.div : 'div';
  const motionProps = animated ? {
    variants: containerVariants,
    initial: "hidden",
    whileInView: "visible",
    viewport: { once: true }
  } : {};

  return (
    <MotionDiv
      className={cn(
        'flex flex-col',
        styles.spacing,
        alignStyles[align],
        align === 'center' && 'mx-auto max-w-4xl',
        className
      )}
      {...motionProps}
    >
      {/* Badge */}
      {badge && (
        <motion.div
          variants={animated ? itemVariants : {}}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-full',
            'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20',
            'border border-emerald-200/50 dark:border-emerald-500/20',
            'text-sm font-medium text-emerald-700 dark:text-emerald-300',
            align === 'center' && 'self-center',
            align === 'right' && 'self-end'
          )}
        >
          {BadgeIcon && <BadgeIcon className="w-4 h-4" />}
          {badge}
        </motion.div>
      )}

      {/* Subtitle (appears before title) */}
      {subtitle && (
        <motion.div variants={animated ? itemVariants : {}}>
          <Text
            variant="overline"
            color="accent"
            align={align}
            className="mb-2"
          >
            {subtitle}
          </Text>
        </motion.div>
      )}

      {/* Title */}
      <motion.div variants={animated ? itemVariants : {}}>
        <Heading
          level="h2"
          size={styles.title}
          align={align}
          gradient={gradient}
          className="leading-tight"
        >
          {title}
        </Heading>
      </motion.div>

      {/* Description */}
      {description && (
        <motion.div variants={animated ? itemVariants : {}}>
          <Text
            variant="bodyLarge"
            color="tertiary"
            align={align}
            className={cn(
              'leading-relaxed',
              align === 'center' && 'max-w-2xl mx-auto'
            )}
          >
            {description}
          </Text>
        </motion.div>
      )}
    </MotionDiv>
  );
};