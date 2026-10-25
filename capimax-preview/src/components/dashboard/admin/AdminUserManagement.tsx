import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { adminService } from '../../../services';
import type {
  AdminUser,
  UserFilters,
  PaginatedUsers,
  UserActivity,
  AdminNote
} from '../../../services';

const dateLocale = (lng?: string) => (lng?.startsWith('ar') ? 'ar-EG' : 'en-US');

interface UserDetailViewProps {
  user: AdminUser;
  onClose: () => void;
  onUpdate: () => void;
}

const UserDetailView: React.FC<UserDetailViewProps> = ({ user, onClose, onUpdate }) => {
  const { t, i18n } = useTranslation('admin');
  const locale = dateLocale(i18n.language);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'notes' | 'investments' | 'transactions'>('overview');
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [userNotes, setUserNotes] = useState<AdminNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState({ content: '', noteType: 'GENERAL' as AdminNote['noteType'] });

  // Load additional user data
  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'activity') {
          const activity = await adminService.getUserActivity(user.id, 50);
          setUserActivity(activity);
        } else if (activeTab === 'notes') {
          const notes = await adminService.getUserNotes(user.id);
          setUserNotes(notes);
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [activeTab, user.id]);

  const handleAddNote = async () => {
    try {
      await adminService.addUserNote(user.id, newNote);
      setShowAddNote(false);
      setNewNote({ content: '', noteType: 'GENERAL' });
      // Reload notes
      const notes = await adminService.getUserNotes(user.id);
      setUserNotes(notes);
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const handleSuspend = async () => {
    const reason = prompt(t('dashboard.users.suspendPrompt'));
    if (reason) {
      try {
        await adminService.suspendUser(user.id, reason);
        onUpdate();
        onClose();
      } catch (error) {
        console.error('Failed to suspend user:', error);
      }
    }
  };

  const handleUnsuspend = async () => {
    try {
      await adminService.unsuspendUser(user.id, 'Admin unsuspension');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to unsuspend user:', error);
    }
  };

  const handleVerify = async () => {
    try {
      await adminService.forceVerifyUser(user.id, 'Admin manual verification');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to verify user:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
              </h2>
              <p className="text-sm text-neutral-500 dark:text-slate-400">
                {user.email} • {t(`shared.roles.${user.role}`, { defaultValue: user.role.replace('_', ' ') })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('shared.close')}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-300 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-neutral-200 dark:border-slate-700">
          <div className="flex gap-4">
            {[
              { id: 'overview', label: t('users.tabs.overview') },
              { id: 'activity', label: t('users.tabs.activity') },
              { id: 'notes', label: t('users.tabs.notes') },
              { id: 'investments', label: t('users.tabs.properties') },
              { id: 'transactions', label: t('users.tabs.transactions') },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* User Status */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-sm text-neutral-500 dark:text-slate-400 mb-1">{t('users.fields.accountStatus')}</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    user.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {user.isActive ? t('shared.status.active') : t('shared.status.inactive')}
                  </span>
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-sm text-neutral-500 dark:text-slate-400 mb-1">{t('users.fields.kycStatus')}</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    user.kycStatus === 'verified'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : user.kycStatus === 'pending'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {t(`shared.status.${user.kycStatus}`, { defaultValue: user.kycStatus })}
                  </span>
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-sm text-neutral-500 dark:text-slate-400 mb-1">{t('users.fields.totalOwned')}</p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
                    ${user.totalInvestments?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-sm text-neutral-500 dark:text-slate-400 mb-1">{t('users.fields.propertiesOwned')}</p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
                    {user.propertiesOwned || 0}
                  </p>
                </div>
              </div>

              {/* User Details */}
              <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">{t('users.fields.userDetails')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-slate-400">{t('users.fields.email')}</p>
                    <p className="font-medium text-neutral-900 dark:text-slate-100">{user.email}</p>
                  </div>
                  {user.phoneNumber && (
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-slate-400">{t('users.fields.phone')}</p>
                      <p className="font-medium text-neutral-900 dark:text-slate-100">{user.phoneNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-slate-400">{t('users.fields.accountCreated')}</p>
                    <p className="font-medium text-neutral-900 dark:text-slate-100">
                      {new Date(user.createdAt).toLocaleDateString(locale)}
                    </p>
                  </div>
                  {user.lastLoginAt && (
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-slate-400">{t('users.fields.lastLogin')}</p>
                      <p className="font-medium text-neutral-900 dark:text-slate-100">
                        {new Date(user.lastLoginAt).toLocaleDateString(locale)}
                      </p>
                    </div>
                  )}
                </div>
                {user.address && (
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-slate-400 mb-1">{t('users.fields.address')}</p>
                    <p className="font-medium text-neutral-900 dark:text-slate-100">
                      {user.address.street}, {user.address.city}, {user.address.country} {user.address.zipCode}
                    </p>
                  </div>
                )}
              </div>

              {/* Suspension Info */}
              {user.isSuspended && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">{t('users.suspension.title')}</h3>
                  {user.suspensionReason && (
                    <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                      {t('users.suspension.reason', { reason: user.suspensionReason })}
                    </p>
                  )}
                  {user.suspendedUntil && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {t('users.suspension.until', { date: new Date(user.suspendedUntil).toLocaleString(locale) })}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                {user.kycStatus === 'pending' && (
                  <button
                    onClick={handleVerify}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {t('users.actions.verifyKyc')}
                  </button>
                )}
                {user.isSuspended ? (
                  <button
                    onClick={handleUnsuspend}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    {t('users.actions.unsuspend')}
                  </button>
                ) : (
                  <button
                    onClick={handleSuspend}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    {t('users.actions.suspend')}
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
                </div>
              ) : userActivity.length > 0 ? (
                userActivity.map((activity) => (
                  <div key={activity.id} className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-neutral-900 dark:text-slate-100">{activity.action}</h4>
                        <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            activity.category === 'AUTH' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                            activity.category === 'INVESTMENT' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            activity.category === 'PAYMENT' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                            'bg-neutral-100 text-neutral-800 dark:bg-slate-600 dark:text-slate-300'
                          }`}>
                            {t(`users.activityCategories.${activity.category}`, { defaultValue: activity.category })}
                          </span>
                          <span className="text-xs text-neutral-500 dark:text-slate-400">
                            {new Date(activity.timestamp).toLocaleString(locale)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-neutral-500 dark:text-slate-400">
                  {t('users.empty.activity')}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">{t('users.notes.title')}</h3>
                <button
                  onClick={() => setShowAddNote(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  {t('users.notes.add')}
                </button>
              </div>

              {showAddNote && (
                <div className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                  <select
                    value={newNote.noteType}
                    onChange={(e) => setNewNote({ ...newNote, noteType: e.target.value as AdminNote['noteType'] })}
                    className="w-full mb-2 px-3 py-2 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 rounded-lg"
                  >
                    <option value="GENERAL">{t('users.noteTypes.GENERAL')}</option>
                    <option value="COMPLIANCE">{t('users.noteTypes.COMPLIANCE')}</option>
                    <option value="RISK_ASSESSMENT">{t('users.noteTypes.RISK_ASSESSMENT')}</option>
                    <option value="SUPPORT">{t('users.noteTypes.SUPPORT')}</option>
                    <option value="WARNING">{t('users.noteTypes.WARNING')}</option>
                  </select>
                  <textarea
                    value={newNote.content}
                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                    placeholder={t('users.notes.placeholder')}
                    className="w-full mb-2 px-3 py-2 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 rounded-lg resize-none"
                    rows={4}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAddNote}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      {t('users.notes.save')}
                    </button>
                    <button
                      onClick={() => setShowAddNote(false)}
                      className="px-4 py-2 bg-neutral-200 text-neutral-700 dark:bg-slate-600 dark:text-slate-300 rounded-lg hover:bg-neutral-300 dark:hover:bg-slate-500 transition-colors"
                    >
                      {t('shared.cancel')}
                    </button>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
                </div>
              ) : userNotes.length > 0 ? (
                userNotes.map((note) => (
                  <div key={note.id} className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        note.priority === 'URGENT' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                        note.priority === 'HIGH' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                        note.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-neutral-100 text-neutral-800 dark:bg-slate-600 dark:text-slate-300'
                      }`}>
                        {t(`users.noteTypes.${note.noteType}`, { defaultValue: note.noteType })}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-slate-400">
                        {new Date(note.createdAt).toLocaleString(locale)}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-700 dark:text-slate-300 mb-2">{note.content}</p>
                    <p className="text-xs text-neutral-500 dark:text-slate-400">{t('users.notes.by', { name: note.adminName })}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-neutral-500 dark:text-slate-400">
                  {t('users.empty.notes')}
                </div>
              )}
            </div>
          )}

          {(activeTab === 'investments' || activeTab === 'transactions') && (
            <div className="text-center py-8 text-neutral-500 dark:text-slate-400">
              {activeTab === 'investments' ? t('users.empty.propertyHistory') : t('users.empty.transactionHistory')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AdminUserManagement: React.FC = () => {
  const { t, i18n } = useTranslation('admin');
  const [users, setUsers] = useState<PaginatedUsers | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Filters
  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    limit: 20,
    search: '',
    role: undefined,
    kycStatus: undefined,
    sortBy: 'createdAt',
    sortOrder: 'DESC'
  });

  // Load users
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getAllUsers(filters);
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleFilterChange = (key: keyof UserFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-slate-100">{t('dashboard.users.title')}</h1>
          <p className="text-neutral-500 dark:text-slate-400 mt-1">
            {t('users.subtitle')}
          </p>
        </div>
        <button
          onClick={loadUsers}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <span>🔄</span>
          <span>{t('shared.refresh')}</span>
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: t('dashboard.userStats.totalUsers'), value: users?.totalCount?.toLocaleString() || '0', color: 'blue' },
          {
            label: t('dashboard.userStats.verifiedUsers'),
            value: users?.users?.filter(u => u.kycStatus === 'verified').length?.toLocaleString() || '0',
            color: 'green'
          },
          {
            label: t('dashboard.userStats.pendingKyc'),
            value: users?.users?.filter(u => u.kycStatus === 'pending').length?.toLocaleString() || '0',
            color: 'yellow'
          },
          {
            label: t('shared.status.suspended'),
            value: users?.users?.filter(u => u.isSuspended).length?.toLocaleString() || '0',
            color: 'red'
          }
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
            <p className="text-sm text-neutral-500 dark:text-slate-400 mb-2">{stat.label}</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-slate-100">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
              {t('users.filters.search')}
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder={t('users.filters.searchPlaceholder')}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg text-neutral-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
              {t('users.fields.role')}
            </label>
            <select
              value={filters.role || ''}
              onChange={(e) => handleFilterChange('role', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg text-neutral-900 dark:text-slate-100"
            >
              <option value="">{t('users.filters.allRoles')}</option>
              <option value="investor">{t('shared.roles.investor')}</option>
              <option value="property_owner">{t('shared.roles.property_owner')}</option>
              <option value="broker">{t('shared.roles.broker')}</option>
              <option value="admin">{t('shared.roles.admin')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
              {t('users.fields.kycStatus')}
            </label>
            <select
              value={filters.kycStatus || ''}
              onChange={(e) => handleFilterChange('kycStatus', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg text-neutral-900 dark:text-slate-100"
            >
              <option value="">{t('transactions.filters.allStatuses')}</option>
              <option value="pending">{t('shared.status.pending')}</option>
              <option value="verified">{t('shared.status.verified')}</option>
              <option value="rejected">{t('shared.status.rejected')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
              {t('users.filters.sortBy')}
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg text-neutral-900 dark:text-slate-100"
            >
              <option value="createdAt">{t('users.filters.sort.createdAt')}</option>
              <option value="firstName">{t('users.filters.sort.firstName')}</option>
              <option value="lastName">{t('users.filters.sort.lastName')}</option>
              <option value="email">{t('users.filters.sort.email')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
            {t('users.listTitle', { count: users?.totalCount || 0 })}
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-600 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="px-6 py-12 text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={loadUsers}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {t('shared.retry')}
            </button>
          </div>
        ) : users && users.users.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-start text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('transactions.fields.user')}
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('users.fields.role')}
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('users.fields.kycStatus')}
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('users.fields.totalOwned')}
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('dashboard.users.joined')}
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('transactions.fields.status')}
                    </th>
                    <th className="px-6 py-3 text-end text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('shared.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-neutral-200 dark:divide-slate-700">
                  {users.users.map((user) => (
                    <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ms-4">
                            <div className="font-medium text-neutral-900 dark:text-slate-100">
                              {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                            </div>
                            <div className="text-sm text-neutral-500 dark:text-slate-400">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-neutral-900 dark:text-slate-100">
                          {t(`shared.roles.${user.role}`, { defaultValue: user.role.replace('_', ' ') })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.kycStatus === 'verified'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : user.kycStatus === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {t(`shared.status.${user.kycStatus}`, { defaultValue: user.kycStatus })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-slate-100">
                        ${user.totalInvestments?.toLocaleString() || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-slate-400">
                        {new Date(user.createdAt).toLocaleDateString(dateLocale(i18n.language))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.isSuspended
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {user.isSuspended ? t('shared.status.suspended') : t('shared.status.active')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-end text-sm">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                        >
                          {t('shared.viewDetails')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-neutral-200 dark:border-slate-700 flex items-center justify-between">
              <div className="text-sm text-neutral-500 dark:text-slate-400">
                {t('users.pagination.showing', {
                  from: ((filters.page || 1) - 1) * (filters.limit || 20) + 1,
                  to: Math.min((filters.page || 1) * (filters.limit || 20), users.totalCount),
                  total: users.totalCount
                })}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange((filters.page || 1) - 1)}
                  disabled={!users.hasPreviousPage}
                  className="px-3 py-2 border border-neutral-300 dark:border-slate-600 rounded-lg text-sm font-medium text-neutral-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-slate-700"
                >
                  {t('shared.previous')}
                </button>
                <span className="text-sm text-neutral-700 dark:text-slate-300">
                  {t('shared.pageOf', { page: filters.page, pages: users.totalPages })}
                </span>
                <button
                  onClick={() => handlePageChange((filters.page || 1) + 1)}
                  disabled={!users.hasNextPage}
                  className="px-3 py-2 border border-neutral-300 dark:border-slate-600 rounded-lg text-sm font-medium text-neutral-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-slate-700"
                >
                  {t('shared.next')}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="px-6 py-12 text-center text-neutral-500 dark:text-slate-400">
            {t('users.empty.users')}
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailView
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={loadUsers}
        />
      )}
    </div>
  );
};

export default AdminUserManagement;
