import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Building,
  Shield,
  Check,
  ChevronDown,
  Briefcase
} from 'lucide-react';
import { useAuth, useUser } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useRouter } from '../../utils/router';
import { UserRole } from '../../services/api/types';
import { apiClient } from '../../services/api/ApiClient';
import { cn } from '../../utils/cn';

interface RoleSwitcherProps {
  className?: string;
  onRoleSwitch?: (newRole: UserRole) => void;
}

const ROLE_INFO = {
  [UserRole.INVESTOR]: {
    label: 'Investor',
    description: 'Invest in tokenized properties',
    icon: Briefcase,
    color: 'emerald'
  },
  [UserRole.PROPERTY_OWNER]: {
    label: 'Property Owner',
    description: 'List and manage your properties',
    icon: Building,
    color: 'blue'
  },
  [UserRole.ADMIN]: {
    label: 'Administrator',
    description: 'Platform administration',
    icon: Shield,
    color: 'purple'
  }
};

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  className,
  onRoleSwitch
}) => {
  const user = useUser();
  const { navigate } = useRouter();
  const { error: showError } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [primaryRole, setPrimaryRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserRoles();
    }
  }, [user]);

  const fetchUserRoles = async () => {
    try {
      const response = await apiClient.get<any>('/auth/roles/');
      setAvailableRoles(response.available_roles || [user?.role].filter(Boolean));
      setPrimaryRole(response.primary_role || user?.role || null);
    } catch (error: any) {
      // Silently fallback to single role - no need to show error to user
      if (user?.role) {
        setAvailableRoles([user.role]);
        setPrimaryRole(user.role);
      }
    }
  };

  const handleRoleSwitch = async (newRole: UserRole) => {
    if (newRole === primaryRole) {
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('/auth/roles/set-primary/', { role: newRole });
      setPrimaryRole(newRole);
      setIsOpen(false);

      // Notify parent component - this will handle state sync
      onRoleSwitch?.(newRole);
    } catch (error: any) {
      showError('Role Switch Failed', error.message || 'Unable to switch role. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  const currentRoleInfo = primaryRole ? ROLE_INFO[primaryRole] : null;
  const CurrentIcon = currentRoleInfo?.icon || User;

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-lg',
          'bg-white dark:bg-slate-800',
          'border border-slate-200 dark:border-slate-700',
          'hover:bg-slate-50 dark:hover:bg-slate-700/50',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900',
          isLoading && 'opacity-50 cursor-not-allowed'
        )}
        disabled={isLoading}
      >
        <div className={cn(
          'p-2 rounded-full',
          `bg-${currentRoleInfo?.color}-100 dark:bg-${currentRoleInfo?.color}-900/30`
        )}>
          <CurrentIcon className={cn(
            'w-4 h-4',
            `text-${currentRoleInfo?.color}-600 dark:text-${currentRoleInfo?.color}-400`
          )} />
        </div>

        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-slate-900 dark:text-white">
            {currentRoleInfo?.label}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Current Role
          </div>
        </div>

        <ChevronDown className={cn(
          'w-5 h-5 text-slate-400 transition-transform duration-200',
          isOpen && 'rotate-180'
        )} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute top-full left-0 right-0 mt-2 z-40',
                'bg-white dark:bg-slate-800',
                'border border-slate-200 dark:border-slate-700',
                'rounded-lg shadow-lg',
                'overflow-hidden'
              )}
            >
              <div className="p-2">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 px-3 py-2">
                  SWITCH TO
                </div>

                {availableRoles.map(role => {
                  const roleInfo = ROLE_INFO[role];
                  if (!roleInfo) return null;

                  const RoleIcon = roleInfo.icon;
                  const isActive = role === primaryRole;

                  return (
                    <button
                      key={role}
                      onClick={() => handleRoleSwitch(role)}
                      disabled={isLoading}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
                        'transition-all duration-200',
                        isActive
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300',
                        isLoading && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className={cn(
                        'p-2 rounded-full',
                        isActive
                          ? 'bg-emerald-100 dark:bg-emerald-900/30'
                          : `bg-${roleInfo.color}-100 dark:bg-${roleInfo.color}-900/30`
                      )}>
                        <RoleIcon className={cn(
                          'w-4 h-4',
                          isActive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : `text-${roleInfo.color}-600 dark:text-${roleInfo.color}-400`
                        )} />
                      </div>

                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">
                          {roleInfo.label}
                        </div>
                        <div className="text-xs opacity-75">
                          {roleInfo.description}
                        </div>
                      </div>

                      {isActive && (
                        <Check className="w-4 h-4 text-emerald-500" />
                      )}
                    </button>
                  );
                })}

                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate('role-management');
                    }}
                    className={cn(
                      'block w-full text-left px-3 py-2 rounded-lg',
                      'text-sm text-slate-600 dark:text-slate-400',
                      'hover:bg-slate-50 dark:hover:bg-slate-700/50',
                      'transition-colors duration-200'
                    )}
                  >
                    Manage Roles
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoleSwitcher;