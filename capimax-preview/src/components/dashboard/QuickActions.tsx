import React from 'react';

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  description?: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
  disabled?: boolean;
}

interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
  columns?: number;
  className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  title = 'Quick Actions',
  columns = 4,
  className = ''
}) => {
  const getVariantStyles = (variant: QuickAction['variant'] = 'secondary') => {
    switch (variant) {
      case 'primary':
        return 'bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 text-primary-700 dark:text-primary-300';
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      case 'secondary':
      default:
        return 'bg-neutral-50 dark:bg-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-600 text-neutral-700 dark:text-slate-300';
    }
  };

  const getGridCols = (cols: number) => {
    switch (cols) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-1 sm:grid-cols-2';
      case 3: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 4: return 'grid-cols-2 md:grid-cols-4';
      case 5: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5';
      case 6: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6';
      default: return 'grid-cols-2 md:grid-cols-4';
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700 ${className}`}>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-6">
        {title}
      </h3>
      
      <div className={`grid ${getGridCols(columns)} gap-4`}>
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={action.disabled}
            className={`
              p-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800
              ${getVariantStyles(action.variant)}
              ${action.disabled 
                ? 'opacity-50 cursor-not-allowed' 
                : 'transform hover:scale-105 active:scale-95'
              }
            `}
          >
            <div className="text-center">
              <span className="text-2xl mb-3 block">
                {action.icon}
              </span>
              <span className="text-sm font-medium block mb-1">
                {action.label}
              </span>
              {action.description && (
                <span className="text-xs opacity-70 block">
                  {action.description}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};