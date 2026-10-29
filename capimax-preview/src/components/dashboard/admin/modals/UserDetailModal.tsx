import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminService, type AdminUser, type UserActivity, type AdminNote } from '../../../../services';
import { useAdminActions } from '../../../../hooks/useAdminDashboard';
import { uiLocale } from '../../../../utils/locale';

interface UserDetailModalProps {
  user: AdminUser;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
}

type TabType = 'profile' | 'activity' | 'investments' | 'transactions' | 'notes';

const UserDetailModal: React.FC<UserDetailModalProps> = ({
  user,
  isOpen,
  onClose,
  onUserUpdated
}) => {
  const { t, i18n } = useTranslation('admin');
  const locale = uiLocale(i18n.language);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [userNotes, setUserNotes] = useState<AdminNote[]>([]);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    noteType: 'GENERAL' as AdminNote['noteType'],
    priority: 'MEDIUM' as AdminNote['priority'],
    isConfidential: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    loading: actionLoading,
    error: actionError,
    clearError,
    suspendUser,
    unsuspendUser,
    verifyUser,
    addUserNote
  } = useAdminActions();

  // Load user data when modal opens or user changes
  useEffect(() => {
    if (isOpen && user) {
      loadUserData();
    }
  }, [isOpen, user]);

  const loadUserData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [activity, notes] = await Promise.all([
        adminService.getUserActivity(user.id, 20),
        adminService.getUserNotes(user.id)
      ]);
      
      setUserActivity(activity);
      setUserNotes(notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.modal.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async () => {
    const reason = prompt(t('dashboard.users.suspendPrompt'));
    const durationStr = prompt(t('users.modal.durationPrompt'));
    const duration = durationStr ? parseInt(durationStr) : undefined;

    if (reason) {
      await suspendUser(user.id, reason, duration);
      onUserUpdated();
    }
  };

  const handleUnsuspendUser = async () => {
    const notes = prompt(t('users.modal.notesPrompt'));
    await unsuspendUser(user.id, notes || undefined);
    onUserUpdated();
  };

  const handleVerifyUser = async () => {
    const notes = prompt(t('users.modal.verifyPrompt'));
    await verifyUser(user.id, notes || undefined);
    onUserUpdated();
  };

  const handleAddNote = async () => {
    if (!newNote.content.trim()) return;

    const noteData = {
      ...newNote,
      title: newNote.title || undefined,
      tags: []
    };

    const result = await addUserNote(user.id, noteData);
    if (result) {
      setUserNotes(prev => [result, ...prev]);
      setNewNote({
        title: '',
        content: '',
        noteType: 'GENERAL',
        priority: 'MEDIUM',
        isConfidential: false
      });
    }
  };

  const handleUpdateUser = async (updates: Partial<AdminUser>) => {
    try {
      await adminService.updateUser(user.id, updates);
      onUserUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.modal.updateFailed'));
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'profile', label: t('users.tabs.profile'), icon: '👤' },
    { id: 'activity', label: t('users.tabs.activity'), icon: '📝' },
    { id: 'investments', label: t('users.tabs.properties'), icon: '💰' },
    { id: 'transactions', label: t('users.tabs.transactions'), icon: '🔄' },
    { id: 'notes', label: t('users.notes.title'), icon: '📋' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
          onClick={onClose}
        />
        
        <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
                  {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-slate-400">
                  {user.email} • {t(`shared.roles.${user.role}`, { defaultValue: user.role.replace('_', ' ') })}
                  {user.isSuspended && <span className="text-red-500 ms-2">{t('dashboard.users.suspended')}</span>}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label={t('shared.close')}
              className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-300 transition-colors"
            >
              <span className="text-xl">×</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 border-b border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-700">
            <div className="flex items-center gap-3">
              {user.kycStatus === 'pending' && (
                <button
                  onClick={handleVerifyUser}
                  disabled={actionLoading}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {t('users.actions.verifyKyc')}
                </button>
              )}
              
              {user.isSuspended ? (
                <button
                  onClick={handleUnsuspendUser}
                  disabled={actionLoading}
                  className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {t('dashboard.users.unsuspend')}
                </button>
              ) : (
                <button
                  onClick={handleSuspendUser}
                  disabled={actionLoading}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {t('users.actions.suspendShort')}
                </button>
              )}

              <select
                value={user.role}
                onChange={(e) => handleUpdateUser({ role: e.target.value as AdminUser['role'] })}
                className="px-3 py-1 text-sm border border-neutral-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
              >
                <option value="investor">{t('shared.roles.investor')}</option>
                <option value="property_owner">{t('shared.roles.property_owner')}</option>
                <option value="broker">{t('shared.roles.broker')}</option>
                <option value="admin">{t('shared.roles.admin')}</option>
              </select>

              <select
                value={user.kycStatus}
                onChange={(e) => handleUpdateUser({ kycStatus: e.target.value as AdminUser['kycStatus'] })}
                className="px-3 py-1 text-sm border border-neutral-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
              >
                <option value="pending">{t('shared.status.pending')}</option>
                <option value="verified">{t('shared.status.verified')}</option>
                <option value="rejected">{t('shared.status.rejected')}</option>
              </select>
            </div>

            {actionError && (
              <div className="mt-3 text-sm text-red-600 dark:text-red-400">
                {actionError}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="px-6 border-b border-neutral-200 dark:border-slate-700">
            <nav className="flex gap-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-slate-300'
                  }`}
                >
                  <span className="me-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6 max-h-[50vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-200 border-t-primary-600"></div>
              </div>
            ) : error ? (
              <div className="text-center text-red-600 dark:text-red-400">
                <p>{error}</p>
                <button
                  onClick={loadUserData}
                  className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  {t('shared.retry')}
                </button>
              </div>
            ) : (
              <>
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100 mb-4">
                          {t('users.modal.personalInfo')}
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">{t('users.fields.email')}</label>
                            <p className="text-neutral-900 dark:text-slate-100">{user.email}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">{t('users.fields.phone')}</label>
                            <p className="text-neutral-900 dark:text-slate-100">{user.phoneNumber || t('users.modal.notProvided')}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">{t('users.fields.address')}</label>
                            <p className="text-neutral-900 dark:text-slate-100">
                              {user.address 
                                ? `${user.address.street}, ${user.address.city}, ${user.address.country} ${user.address.zipCode}`
                                : t('users.modal.notProvided')
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100 mb-4">
                          {t('users.fields.accountStatus')}
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">{t('users.fields.kycStatus')}</label>
                            <div className="flex items-center gap-2">
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
                          </div>
                          <div>
                            <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">{t('users.fields.accountStatus')}</label>
                            <p className="text-neutral-900 dark:text-slate-100">
                              {user.isActive ? t('shared.status.active') : t('shared.status.inactive')}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">{t('users.modal.memberSince')}</label>
                            <p className="text-neutral-900 dark:text-slate-100">
                              {new Date(user.createdAt).toLocaleDateString(locale)}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">{t('users.fields.lastLogin')}</label>
                            <p className="text-neutral-900 dark:text-slate-100">
                              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString(locale) : t('users.modal.never')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100">
                      {t('users.modal.recentActivity')}
                    </h3>
                    {userActivity.length > 0 ? (
                      <div className="space-y-3">
                        {userActivity.map((activity) => (
                          <div key={activity.id} className="flex items-start gap-3 p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                            <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-neutral-900 dark:text-slate-100">
                                {activity.action}
                              </p>
                              <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">
                                {activity.description}
                              </p>
                              <p className="text-xs text-neutral-500 dark:text-slate-500 mt-2">
                                {new Date(activity.timestamp).toLocaleString(locale)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-neutral-500 dark:text-slate-400">{t('users.modal.noActivity')}</p>
                    )}
                  </div>
                )}

                {activeTab === 'investments' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100">
                      {t('users.modal.propertyPortfolio')}
                    </h3>
                    <div className="text-center text-neutral-500 dark:text-slate-400">
                      <p>{t('users.modal.propertyDataSoon')}</p>
                      <p className="text-sm mt-1">{t('users.modal.comingSoon')}</p>
                    </div>
                  </div>
                )}

                {activeTab === 'transactions' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100">
                      {t('users.modal.transactionHistory')}
                    </h3>
                    <div className="text-center text-neutral-500 dark:text-slate-400">
                      <p>{t('users.modal.transactionDataSoon')}</p>
                      <p className="text-sm mt-1">{t('users.modal.comingSoon')}</p>
                    </div>
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100">
                      {t('users.notes.title')}
                    </h3>
                    
                    {/* Add New Note */}
                    <div className="bg-neutral-50 dark:bg-slate-700 p-4 rounded-lg">
                      <h4 className="font-medium text-neutral-900 dark:text-slate-100 mb-3">{t('users.notes.addNew')}</h4>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder={t('users.notes.titlePlaceholder')}
                            value={newNote.title}
                            onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                            className="px-3 py-2 border border-neutral-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-neutral-900 dark:text-slate-100"
                          />
                          <div className="flex gap-2">
                            <select
                              value={newNote.noteType}
                              onChange={(e) => setNewNote(prev => ({ ...prev, noteType: e.target.value as AdminNote['noteType'] }))}
                              className="flex-1 px-3 py-2 border border-neutral-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-neutral-900 dark:text-slate-100"
                            >
                              <option value="GENERAL">{t('users.noteTypes.GENERAL')}</option>
                              <option value="COMPLIANCE">{t('users.noteTypes.COMPLIANCE')}</option>
                              <option value="RISK_ASSESSMENT">{t('users.noteTypes.RISK_ASSESSMENT')}</option>
                              <option value="SUPPORT">{t('users.noteTypes.SUPPORT')}</option>
                              <option value="INVESTIGATION">{t('users.noteTypes.INVESTIGATION')}</option>
                              <option value="WARNING">{t('users.noteTypes.WARNING')}</option>
                            </select>
                            <select
                              value={newNote.priority}
                              onChange={(e) => setNewNote(prev => ({ ...prev, priority: e.target.value as AdminNote['priority'] }))}
                              className="flex-1 px-3 py-2 border border-neutral-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-neutral-900 dark:text-slate-100"
                            >
                              <option value="LOW">{t('users.priority.LOW')}</option>
                              <option value="MEDIUM">{t('users.priority.MEDIUM')}</option>
                              <option value="HIGH">{t('users.priority.HIGH')}</option>
                              <option value="URGENT">{t('users.priority.URGENT')}</option>
                            </select>
                          </div>
                        </div>
                        <textarea
                          placeholder={t('users.notes.placeholder')}
                          value={newNote.content}
                          onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-neutral-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-neutral-900 dark:text-slate-100"
                        />
                        <div className="flex items-center justify-between">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={newNote.isConfidential}
                              onChange={(e) => setNewNote(prev => ({ ...prev, isConfidential: e.target.checked }))}
                              className="me-2"
                            />
                            <span className="text-sm text-neutral-700 dark:text-slate-300">{t('users.notes.confidentialLabel')}</span>
                          </label>
                          <button
                            onClick={handleAddNote}
                            disabled={!newNote.content.trim() || actionLoading}
                            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors disabled:opacity-50"
                          >
                            {t('users.notes.add')}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Existing Notes */}
                    <div className="space-y-3">
                      {userNotes.length > 0 ? (
                        userNotes.map((note) => (
                          <div key={note.id} className="border border-neutral-200 dark:border-slate-600 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {note.title && (
                                  <h5 className="font-medium text-neutral-900 dark:text-slate-100">{note.title}</h5>
                                )}
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  note.priority === 'URGENT' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                  note.priority === 'HIGH' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                                  note.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                }`}>
                                  {t(`users.priority.${note.priority}`, { defaultValue: note.priority })}
                                </span>
                                <span className="px-2 py-1 text-xs bg-neutral-100 text-neutral-700 dark:bg-slate-600 dark:text-slate-300 rounded-full">
                                  {t(`users.noteTypes.${note.noteType}`, { defaultValue: note.noteType })}
                                </span>
                                {note.isConfidential && (
                                  <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded-full">
                                    {t('users.notes.confidential')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-neutral-700 dark:text-slate-300 mb-3">{note.content}</p>
                            <div className="text-xs text-neutral-500 dark:text-slate-500">
                              {t('users.notes.addedBy', { name: note.adminName, date: new Date(note.createdAt).toLocaleDateString(locale) })}
                              {note.updatedAt !== note.createdAt && (
                                <span> • {t('users.notes.updated', { date: new Date(note.updatedAt).toLocaleDateString(locale) })}</span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-neutral-500 dark:text-slate-400">{t('users.notes.none')}</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailModal;