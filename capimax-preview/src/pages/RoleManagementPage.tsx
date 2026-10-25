import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from '../utils/router';
import {
  ArrowLeft,
  Shield,
  Building,
  Briefcase,
  Plus,
  Trash2,
  Check,
  X,
  AlertCircle,
  Info,
  ChevronRight,
  Settings,
  Users,
  Lock,
  Unlock
} from 'lucide-react';
import { useAuth, useUser } from '../contexts/AuthContext';
import { UserRole } from '../services/api/types';
import { apiClient } from '../services/api/ApiClient';
import { Button } from '../components/ui/Button';
import { Card } from '../components/design-system/cards/Card';
import { cn } from '../utils/cn';
import { useTranslation } from 'react-i18next';

interface RoleData {
  role: UserRole;
  role_display: string;
  is_primary: boolean;
  assigned_at: string;
  assigned_by: string;
}

interface RolePermissions {
  roles: UserRole[];
  primary_role: UserRole;
  capabilities: Record<string, boolean>;
  requirements: Record<string, boolean>;
  role_descriptions: Record<UserRole, string>;
}

const ROLE_INFO = {
  [UserRole.INVESTOR]: {
    label: 'roleMgmt.roles.investor.label',
    description: 'roleMgmt.roles.investor.desc',
    icon: Briefcase,
    color: 'emerald',
    features: [
      'roleMgmt.roles.investor.f1',
      'roleMgmt.roles.investor.f2',
      'roleMgmt.roles.investor.f3',
      'roleMgmt.roles.investor.f4',
      'roleMgmt.roles.investor.f5'
    ]
  },
  [UserRole.PROPERTY_OWNER]: {
    label: 'roleMgmt.roles.owner.label',
    description: 'roleMgmt.roles.owner.desc',
    icon: Building,
    color: 'blue',
    features: [
      'roleMgmt.roles.owner.f1',
      'roleMgmt.roles.owner.f2',
      'roleMgmt.roles.owner.f3',
      'roleMgmt.roles.owner.f4',
      'roleMgmt.roles.owner.f5'
    ]
  },
  [UserRole.ADMIN]: {
    label: 'roleMgmt.roles.admin.label',
    description: 'roleMgmt.roles.admin.desc',
    icon: Shield,
    color: 'purple',
    features: [
      'roleMgmt.roles.admin.f1',
      'roleMgmt.roles.admin.f2',
      'roleMgmt.roles.admin.f3',
      'roleMgmt.roles.admin.f4',
      'roleMgmt.roles.admin.f5'
    ]
  }
};

export const RoleManagementPage: React.FC = () => {
  const { navigate } = useRouter();
  const user = useUser();
  const { t, i18n } = useTranslation('ui');
  const dateLocale = i18n.language?.startsWith('ar') ? 'ar-EG' : 'en-US';
  const humanize = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const [userRoles, setUserRoles] = useState<RoleData[]>([]);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchUserRoles();
    fetchPermissions();
  }, []);

  const fetchUserRoles = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<any>('/auth/roles/');
      setUserRoles(response.roles || []);
      setAvailableRoles(response.available_roles || []);
    } catch (error) {
      console.error('Failed to fetch user roles:', error);
      setError(t('roleMgmt.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await apiClient.get<RolePermissions>('/auth/roles/permissions/');
      setPermissions(response);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  };

  const handleAddRole = async (role: UserRole) => {
    setIsAddingRole(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.post('/auth/roles/add/', { role });
      setSuccess(t('roleMgmt.added', { role: t(ROLE_INFO[role].label) }));
      await fetchUserRoles();
      await fetchPermissions();
      setSelectedRole(null);
    } catch (error: any) {
      setError(error.message || t('roleMgmt.addFailed'));
    } finally {
      setIsAddingRole(false);
    }
  };

  const handleRemoveRole = async (role: UserRole) => {
    if (!confirm(t('roleMgmt.confirmRemove', { role: t(ROLE_INFO[role].label) }))) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await apiClient.delete(`/auth/roles/remove/${role}/`);
      setSuccess(t('roleMgmt.removed', { role: t(ROLE_INFO[role].label) }));
      await fetchUserRoles();
      await fetchPermissions();
    } catch (error: any) {
      setError(error.message || t('roleMgmt.removeFailed'));
    }
  };

  const handleSetPrimary = async (role: UserRole) => {
    setError(null);
    setSuccess(null);

    try {
      await apiClient.post('/auth/roles/set-primary/', { role });
      setSuccess(t('roleMgmt.primarySet', { role: t(ROLE_INFO[role].label) }));
      await fetchUserRoles();
    } catch (error: any) {
      setError(error.message || t('roleMgmt.primaryFailed'));
    }
  };

  const getAvailableToAdd = () => {
    const validRoles = [UserRole.INVESTOR, UserRole.PROPERTY_OWNER];
    return validRoles.filter(role => !availableRoles.includes(role));
  };

  if (!user) {
    navigate('login');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('dashboard')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                {t('roleMgmt.backToDashboard')}
              </Button>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('roleMgmt.title')}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
              <span className="text-red-700 dark:text-red-300">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ms-auto text-red-500 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-3"
            >
              <Check className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              <span className="text-emerald-700 dark:text-emerald-300">{success}</span>
              <button
                onClick={() => setSuccess(null)}
                className="ms-auto text-emerald-500 hover:text-emerald-600"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Roles */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                {t('roleMgmt.currentRoles')}
              </h2>

              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {userRoles.map((roleData) => {
                    const roleInfo = ROLE_INFO[roleData.role];
                    if (!roleInfo) return null;

                    const RoleIcon = roleInfo.icon;

                    return (
                      <div
                        key={roleData.role}
                        className={cn(
                          'p-4 rounded-lg border-2 transition-all duration-200',
                          roleData.is_primary
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'p-2 rounded-full',
                              `bg-${roleInfo.color}-100 dark:bg-${roleInfo.color}-900/30`
                            )}>
                              <RoleIcon className={cn(
                                'w-5 h-5',
                                `text-${roleInfo.color}-600 dark:text-${roleInfo.color}-400`
                              )} />
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-slate-900 dark:text-white">
                                  {t(roleInfo.label)}
                                </h3>
                                {roleData.is_primary && (
                                  <span className="text-xs px-2 py-0.5 bg-emerald-500 text-white rounded-full">
                                    {t('roleMgmt.primary')}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                {t(roleInfo.description)}
                              </p>
                              <div className="text-xs text-slate-500 dark:text-slate-500">
                                {t('roleMgmt.addedOn', { date: new Date(roleData.assigned_at).toLocaleDateString(dateLocale) })}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {!roleData.is_primary && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSetPrimary(roleData.role)}
                                className="text-xs"
                              >
                                {t('roleMgmt.setPrimary')}
                              </Button>
                            )}
                            {userRoles.length > 1 && !roleData.is_primary && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveRole(roleData.role)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add Role Button */}
                  {getAvailableToAdd().length > 0 && (
                    <button
                      onClick={() => setSelectedRole(getAvailableToAdd()[0])}
                      className={cn(
                        'w-full p-4 rounded-lg border-2 border-dashed',
                        'border-slate-300 dark:border-slate-600',
                        'hover:border-emerald-500 dark:hover:border-emerald-400',
                        'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                        'transition-all duration-200',
                        'flex items-center justify-center gap-2',
                        'text-slate-600 dark:text-slate-400'
                      )}
                    >
                      <Plus className="w-5 h-5" />
                      <span className="font-medium">{t('roleMgmt.addAnother')}</span>
                    </button>
                  )}
                </div>
              )}
            </Card>

            {/* Role Permissions */}
            {permissions && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  {t('roleMgmt.permissions')}
                </h2>

                <div className="space-y-4">
                  {/* Capabilities */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t('roleMgmt.capabilitiesTitle')}
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(permissions.capabilities).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center gap-2 text-sm"
                        >
                          {value ? (
                            <Unlock className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Lock className="w-4 h-4 text-slate-400" />
                          )}
                          <span className={cn(
                            value ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'
                          )}>
                            {t(`roleMgmt.capabilities.${key}`, { defaultValue: humanize(key) })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Requirements */}
                  {Object.entries(permissions.requirements).some(([_, v]) => v) && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        {t('roleMgmt.actionRequired')}
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(permissions.requirements)
                          .filter(([_, value]) => value)
                          .map(([key, _]) => (
                            <div
                              key={key}
                              className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400"
                            >
                              <AlertCircle className="w-4 h-4" />
                              <span>
                                {t(`roleMgmt.requirements.${key}`, { defaultValue: humanize(key) })}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Available Roles / Info */}
          <div className="space-y-6">
            {/* Add Role Modal */}
            <AnimatePresence>
              {selectedRole && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                      {t('roleMgmt.addRole')}
                    </h3>

                    <div className="space-y-4">
                      {getAvailableToAdd().map((role) => {
                        const roleInfo = ROLE_INFO[role];
                        const RoleIcon = roleInfo.icon;

                        return (
                          <div
                            key={role}
                            className={cn(
                              'p-4 rounded-lg border-2',
                              selectedRole === role
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                : 'border-slate-200 dark:border-slate-700'
                            )}
                          >
                            <div className="flex items-start gap-3 mb-3">
                              <div className={cn(
                                'p-2 rounded-full',
                                `bg-${roleInfo.color}-100 dark:bg-${roleInfo.color}-900/30`
                              )}>
                                <RoleIcon className={cn(
                                  'w-5 h-5',
                                  `text-${roleInfo.color}-600 dark:text-${roleInfo.color}-400`
                                )} />
                              </div>
                              <div>
                                <h4 className="font-medium text-slate-900 dark:text-white">
                                  {t(roleInfo.label)}
                                </h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  {t(roleInfo.description)}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-1 mb-4">
                              {roleInfo.features.slice(0, 3).map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span>{t(feature)}</span>
                                </div>
                              ))}
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleAddRole(role)}
                                isLoading={isAddingRole}
                                disabled={isAddingRole}
                                className="flex-1"
                              >
                                {t('roleMgmt.addThis')}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedRole(null)}
                                disabled={isAddingRole}
                              >
                                {t('actions.cancel')}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Info Card */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t('roleMgmt.aboutTitle')}
                </h3>
              </div>

              <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                <p>
                  {t('roleMgmt.aboutBody')}
                </p>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-slate-400 rtl:rotate-180" />
                    <span>
                      <strong className="text-slate-700 dark:text-slate-300">{t('roleMgmt.primaryRoleLabel')}</strong>{' '}
                      {t('roleMgmt.primaryRoleText')}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-slate-400 rtl:rotate-180" />
                    <span>
                      <strong className="text-slate-700 dark:text-slate-300">{t('roleMgmt.multipleLabel')}</strong>{' '}
                      {t('roleMgmt.multipleText')}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-slate-400 rtl:rotate-180" />
                    <span>
                      <strong className="text-slate-700 dark:text-slate-300">{t('roleMgmt.switchingLabel')}</strong>{' '}
                      {t('roleMgmt.switchingText')}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Help Card */}
            <Card className="p-6 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border-0">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                {t('roleMgmt.helpTitle')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                {t('roleMgmt.helpBody')}
              </p>
              <Button
                size="sm"
                variant="primary"
                className="w-full"
                onClick={() => window.location.href = 'mailto:support@capimax.com'}
              >
                {t('roleMgmt.contactSupport')}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleManagementPage;