import React from 'react';
import { User } from 'lucide-react';
import { cn } from '../../../utils/cn';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type AvatarVariant = 'circle' | 'rounded' | 'square';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  size?: AvatarSize;
  variant?: AvatarVariant;
  fallback?: string;
  className?: string;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; icon: string }> = {
  xs: { 
    container: 'w-6 h-6',
    text: 'text-xs',
    icon: 'w-3 h-3'
  },
  sm: { 
    container: 'w-8 h-8',
    text: 'text-sm',
    icon: 'w-4 h-4'
  },
  md: { 
    container: 'w-10 h-10',
    text: 'text-base',
    icon: 'w-5 h-5'
  },
  lg: { 
    container: 'w-12 h-12',
    text: 'text-lg',
    icon: 'w-6 h-6'
  },
  xl: { 
    container: 'w-16 h-16',
    text: 'text-xl',
    icon: 'w-8 h-8'
  },
  '2xl': { 
    container: 'w-20 h-20',
    text: 'text-2xl',
    icon: 'w-10 h-10'
  },
};

const variantStyles: Record<AvatarVariant, string> = {
  circle: 'rounded-full',
  rounded: 'rounded-lg',
  square: 'rounded-none',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 'md',
  variant = 'circle',
  fallback,
  className,
  ...props
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  
  const styles = sizeStyles[size];
  
  // Generate fallback initials from alt text or fallback
  const generateFallback = () => {
    const text = fallback || alt || '';
    return text
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  return (
    <div
      className={cn(
        // Base styles
        'relative inline-flex items-center justify-center overflow-hidden',
        'bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20',
        'border-2 border-white dark:border-slate-800 shadow-sm',
        
        // Size styles
        styles.container,
        
        // Variant styles
        variantStyles[variant],
        
        className
      )}
      {...props}
    >
      {/* Image */}
      {src && !imageError && (
        <img
          src={src}
          alt={alt}
          onError={handleImageError}
          onLoad={handleImageLoad}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-200',
            imageLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}

      {/* Fallback Content */}
      {(!src || imageError || !imageLoaded) && (
        <div className="absolute inset-0 flex items-center justify-center">
          {generateFallback() ? (
            <span className={cn(
              'font-semibold text-emerald-700 dark:text-emerald-300',
              styles.text
            )}>
              {generateFallback()}
            </span>
          ) : (
            <User className={cn(
              'text-emerald-600 dark:text-emerald-400',
              styles.icon
            )} />
          )}
        </div>
      )}
    </div>
  );
};