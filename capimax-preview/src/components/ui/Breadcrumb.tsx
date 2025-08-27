import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Home } from 'lucide-react';
import { useRouter } from '../../utils/router';

// Breadcrumb item interface
export interface BreadcrumbItem {
  label: string;
  route?: string;
  href?: string;
  isActive?: boolean;
  icon?: React.ReactNode;
}

// Props for Breadcrumb component
interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  showHomeIcon?: boolean;
  maxItems?: number;
}

// Individual breadcrumb item component
const BreadcrumbItemComponent: React.FC<{
  item: BreadcrumbItem;
  isLast: boolean;
  onNavigate: (item: BreadcrumbItem) => void;
}> = ({ item, isLast, onNavigate }) => {
  const handleClick = (e: React.MouseEvent) => {
    if (item.route && !item.isActive) {
      e.preventDefault();
      onNavigate(item);
    } else if (item.href && !item.isActive) {
      // Allow default link behavior for external links
      return;
    } else if (item.isActive) {
      e.preventDefault();
    }
  };

  const content = (
    <span className="flex items-center gap-2">
      {item.icon}
      <span className="truncate">{item.label}</span>
    </span>
  );

  const baseClasses = "inline-flex items-center gap-2 text-sm font-medium transition-colors duration-200 rounded-md px-2 py-1 -mx-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2";

  if (item.isActive || isLast) {
    return (
      <span
        className={`${baseClasses} text-slate-900 dark:text-white cursor-default`}
        aria-current="page"
      >
        {content}
      </span>
    );
  }

  if (item.route) {
    return (
      <button
        onClick={handleClick}
        className={`${baseClasses} text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800`}
      >
        {content}
      </button>
    );
  }

  if (item.href) {
    return (
      <a
        href={item.href}
        onClick={handleClick}
        className={`${baseClasses} text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800`}
      >
        {content}
      </a>
    );
  }

  return (
    <span className={`${baseClasses} text-slate-500 dark:text-slate-400`}>
      {content}
    </span>
  );
};

// Separator component
const Separator: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.2 }}
    className="flex-shrink-0"
  >
    <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
  </motion.div>
);

// Main breadcrumb component
export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  className = '',
  showHomeIcon = true,
  maxItems = 5
}) => {
  const { navigate } = useRouter();

  const handleNavigate = (item: BreadcrumbItem) => {
    if (item.route) {
      navigate(item.route as any);
    }
  };

  // Process items to handle overflow
  const processedItems = React.useMemo(() => {
    if (items.length <= maxItems) {
      return items;
    }

    const firstItem = items[0];
    const lastItems = items.slice(-2); // Keep last 2 items
    const middleItems = items.slice(1, -2);

    return [
      firstItem,
      {
        label: '...',
        isCollapsed: true
      } as BreadcrumbItem,
      ...lastItems
    ];
  }, [items, maxItems]);

  // Add home icon to first item if requested and no icon exists
  const itemsWithHomeIcon = React.useMemo(() => {
    if (!showHomeIcon || processedItems.length === 0) {
      return processedItems;
    }

    const [firstItem, ...restItems] = processedItems;
    
    return [
      {
        ...firstItem,
        icon: firstItem.icon || <Home className="w-4 h-4" />
      },
      ...restItems
    ];
  }, [processedItems, showHomeIcon]);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center space-x-2 ${className}`}
    >
      <motion.ol
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center space-x-2 flex-wrap"
      >
        {itemsWithHomeIcon.map((item, index) => {
          const isLast = index === itemsWithHomeIcon.length - 1;
          const isCollapsed = 'isCollapsed' in item && item.isCollapsed;

          return (
            <React.Fragment key={`${item.label}-${index}`}>
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.2 }}
                className="flex items-center"
              >
                {isCollapsed ? (
                  <span className="inline-flex items-center text-sm font-medium text-slate-400 dark:text-slate-500 px-2 py-1">
                    ...
                  </span>
                ) : (
                  <BreadcrumbItemComponent
                    item={item}
                    isLast={isLast}
                    onNavigate={handleNavigate}
                  />
                )}
              </motion.li>
              
              {!isLast && (
                <motion.li
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.1, duration: 0.2 }}
                >
                  <Separator />
                </motion.li>
              )}
            </React.Fragment>
          );
        })}
      </motion.ol>
    </nav>
  );
};

// Hook to generate breadcrumbs based on current route
export const useBreadcrumbs = () => {
  const { currentRoute } = useRouter();

  const getBreadcrumbsForRoute = (route: string, additionalItems: BreadcrumbItem[] = []): BreadcrumbItem[] => {
    const baseBreadcrumbs: Record<string, BreadcrumbItem[]> = {
      home: [
        { label: 'Home', route: 'home', isActive: true }
      ],
      login: [
        { label: 'Home', route: 'home' },
        { label: 'Sign In', route: 'login', isActive: true }
      ],
      register: [
        { label: 'Home', route: 'home' },
        { label: 'Create Account', route: 'register', isActive: true }
      ],
      kyc: [
        { label: 'Home', route: 'home' },
        { label: 'Dashboard', route: 'dashboard' },
        { label: 'KYC Verification', route: 'kyc', isActive: true }
      ],
      dashboard: [
        { label: 'Home', route: 'home' },
        { label: 'Dashboard', route: 'dashboard', isActive: true }
      ],
      properties: [
        { label: 'Home', route: 'home' },
        { label: 'Properties', route: 'properties', isActive: true }
      ],
      'property-detail': [
        { label: 'Home', route: 'home' },
        { label: 'Properties', route: 'properties' },
        { label: 'Property Details', route: 'property-detail', isActive: true }
      ],
      wallet: [
        { label: 'Home', route: 'home' },
        { label: 'Dashboard', route: 'dashboard' },
        { label: 'Wallet', route: 'wallet', isActive: true }
      ],
      about: [
        { label: 'Home', route: 'home' },
        { label: 'About', route: 'about', isActive: true }
      ],
      contact: [
        { label: 'Home', route: 'home' },
        { label: 'Contact', route: 'contact', isActive: true }
      ]
    };

    const baseCrumbs = baseBreadcrumbs[route] || [
      { label: 'Home', route: 'home' },
      { label: 'Page', isActive: true }
    ];

    // Insert additional items before the last (active) item
    if (additionalItems.length > 0) {
      const lastItem = baseCrumbs[baseCrumbs.length - 1];
      const otherItems = baseCrumbs.slice(0, -1);
      return [...otherItems, ...additionalItems, lastItem];
    }

    return baseCrumbs;
  };

  return {
    currentBreadcrumbs: getBreadcrumbsForRoute(currentRoute),
    getBreadcrumbsForRoute
  };
};

// Smart breadcrumb component that automatically generates breadcrumbs
export const SmartBreadcrumb: React.FC<{
  additionalItems?: BreadcrumbItem[];
  className?: string;
  showHomeIcon?: boolean;
  maxItems?: number;
}> = ({ additionalItems = [], ...props }) => {
  const { currentBreadcrumbs } = useBreadcrumbs();

  // Merge additional items
  const finalBreadcrumbs = React.useMemo(() => {
    if (additionalItems.length === 0) {
      return currentBreadcrumbs;
    }

    const lastItem = currentBreadcrumbs[currentBreadcrumbs.length - 1];
    const otherItems = currentBreadcrumbs.slice(0, -1);
    
    // Mark additional items as inactive and last item as active
    const processedAdditionalItems = additionalItems.map(item => ({
      ...item,
      isActive: false
    }));

    return [...otherItems, ...processedAdditionalItems, { ...lastItem, isActive: true }];
  }, [currentBreadcrumbs, additionalItems]);

  return <Breadcrumb items={finalBreadcrumbs} {...props} />;
};

// Breadcrumb wrapper with consistent styling
export const BreadcrumbWrapper: React.FC<{
  children?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  additionalItems?: BreadcrumbItem[];
  className?: string;
}> = ({ children, breadcrumbs, additionalItems, className = '' }) => {
  return (
    <div className={`bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 ${className}`}>
      <div className="max-w-6xl mx-auto px-6 py-4">
        {breadcrumbs ? (
          <Breadcrumb items={breadcrumbs} />
        ) : (
          <SmartBreadcrumb additionalItems={additionalItems} />
        )}
        {children}
      </div>
    </div>
  );
};