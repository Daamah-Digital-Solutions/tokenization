import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../../services';
import type {
  AdminUser,
  UserFilters,
  PaginatedUsers,
  UserActivity,
  AdminNote
} from '../../../services';

interface UserDetailViewProps {
  user: AdminUser;
  onClose: () => void;
  onUpdate: () => void;
}

const UserDetailView: React.FC<UserDetailViewProps> = ({ user, onClose, onUpdate }) => {
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
    const reason = prompt('Please provide suspension reason:');
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
          <div className="flex items-center space-x-4">
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
                {user.email} • {user.role.replace('_', ' ')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-300 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-neutral-200 dark:border-slate-700">
          <div className="flex space-x-4">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'activity', label: 'Activity' },
              { id: 'notes', label: 'Notes' },
              { id: 'investments', label: 'Properties' },
              { id: 'transactions', label: 'Transactions' },
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
                  <p className="text-sm text-neutral-500 dark:text-slate-400 mb-1">Account Status</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    user.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-sm text-neutral-500 dark:text-slate-400 mb-1">KYC Status</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    user.kycStatus === 'verified'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : user.kycStatus === 'pending'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {user.kycStatus}
                  </span>
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-sm text-neutral-500 dark:text-slate-400 mb-1">Total Owned</p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
                    ${user.totalInvestments?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-sm text-neutral-500 dark:text-slate-400 mb-1">Properties Owned</p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
                    {user.propertiesOwned || 0}
                  </p>
                </div>
              </div>

              {/* User Details */}
              <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">User Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-slate-400">Email</p>
                    <p className="font-medium text-neutral-900 dark:text-slate-100">{user.email}</p>
                  </div>
                  {user.phoneNumber && (
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-slate-400">Phone</p>
                      <p className="font-medium text-neutral-900 dark:text-slate-100">{user.phoneNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-slate-400">Account Created</p>
                    <p className="font-medium text-neutral-900 dark:text-slate-100">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {user.lastLoginAt && (
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-slate-400">Last Login</p>
                      <p className="font-medium text-neutral-900 dark:text-slate-100">
                        {new Date(user.lastLoginAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
                {user.address && (
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-slate-400 mb-1">Address</p>
                    <p className="font-medium text-neutral-900 dark:text-slate-100">
                      {user.address.street}, {user.address.city}, {user.address.country} {user.address.zipCode}
                    </p>
                  </div>
                )}
              </div>

              {/* Suspension Info */}
              {user.isSuspended && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">Account Suspended</h3>
                  {user.suspensionReason && (
                    <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                      Reason: {user.suspensionReason}
                    </p>
                  )}
                  {user.suspendedUntil && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Suspended until: {new Date(user.suspendedUntil).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center space-x-3">
                {user.kycStatus === 'pending' && (
                  <button
                    onClick={handleVerify}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Verify KYC
                  </button>
                )}
                {user.isSuspended ? (
                  <button
                    onClick={handleUnsuspend}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Unsuspend User
                  </button>
                ) : (
                  <button
                    onClick={handleSuspend}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Suspend User
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
                        <div className="flex items-center space-x-2 mt-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            activity.category === 'AUTH' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                            activity.category === 'INVESTMENT' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            activity.category === 'PAYMENT' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                            'bg-neutral-100 text-neutral-800 dark:bg-slate-600 dark:text-slate-300'
                          }`}>
                            {activity.category}
                          </span>
                          <span className="text-xs text-neutral-500 dark:text-slate-400">
                            {new Date(activity.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-neutral-500 dark:text-slate-400">
                  No activity found
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">Admin Notes</h3>
                <button
                  onClick={() => setShowAddNote(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Add Note
                </button>
              </div>

              {showAddNote && (
                <div className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                  <select
                    value={newNote.noteType}
                    onChange={(e) => setNewNote({ ...newNote, noteType: e.target.value as AdminNote['noteType'] })}
                    className="w-full mb-2 px-3 py-2 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 rounded-lg"
                  >
                    <option value="GENERAL">General</option>
                    <option value="COMPLIANCE">Compliance</option>
                    <option value="RISK_ASSESSMENT">Risk Assessment</option>
                    <option value="SUPPORT">Support</option>
                    <option value="WARNING">Warning</option>
                  </select>
                  <textarea
                    value={newNote.content}
                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                    placeholder="Enter note content..."
                    className="w-full mb-2 px-3 py-2 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 rounded-lg resize-none"
                    rows={4}
                  />
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleAddNote}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Save Note
                    </button>
                    <button
                      onClick={() => setShowAddNote(false)}
                      className="px-4 py-2 bg-neutral-200 text-neutral-700 dark:bg-slate-600 dark:text-slate-300 rounded-lg hover:bg-neutral-300 dark:hover:bg-slate-500 transition-colors"
                    >
                      Cancel
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
                        {note.noteType}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-slate-400">
                        {new Date(note.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-700 dark:text-slate-300 mb-2">{note.content}</p>
                    <p className="text-xs text-neutral-500 dark:text-slate-400">By: {note.adminName}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-neutral-500 dark:text-slate-400">
                  No notes found
                </div>
              )}
            </div>
          )}

          {(activeTab === 'investments' || activeTab === 'transactions') && (
            <div className="text-center py-8 text-neutral-500 dark:text-slate-400">
              {activeTab === 'investments' ? 'Property' : 'Transaction'} history will be loaded here
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AdminUserManagement: React.FC = () => {
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
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [filters]);

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
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-slate-100">User Management</h1>
          <p className="text-neutral-500 dark:text-slate-400 mt-1">
            Manage users, verify KYC, and monitor user activity
          </p>
        </div>
        <button
          onClick={loadUsers}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
        >
          <span>🔄</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: users?.totalCount?.toLocaleString() || '0', color: 'blue' },
          {
            label: 'Verified Users',
            value: users?.users?.filter(u => u.kycStatus === 'verified').length?.toLocaleString() || '0',
            color: 'green'
          },
          {
            label: 'Pending KYC',
            value: users?.users?.filter(u => u.kycStatus === 'pending').length?.toLocaleString() || '0',
            color: 'yellow'
          },
          {
            label: 'Suspended',
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
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search by name or email..."
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg text-neutral-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
              Role
            </label>
            <select
              value={filters.role || ''}
              onChange={(e) => handleFilterChange('role', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg text-neutral-900 dark:text-slate-100"
            >
              <option value="">All Roles</option>
              <option value="investor">Owner</option>
              <option value="property_owner">Property Owner</option>
              <option value="broker">Broker</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
              KYC Status
            </label>
            <select
              value={filters.kycStatus || ''}
              onChange={(e) => handleFilterChange('kycStatus', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg text-neutral-900 dark:text-slate-100"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
              Sort By
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg text-neutral-900 dark:text-slate-100"
            >
              <option value="createdAt">Date Created</option>
              <option value="firstName">First Name</option>
              <option value="lastName">Last Name</option>
              <option value="email">Email</option>
            </select>
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
            User List ({users?.totalCount || 0} total)
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
              Retry
            </button>
          </div>
        ) : users && users.users.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      KYC Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      Total Owned
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      Actions
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
                          <div className="ml-4">
                            <div className="font-medium text-neutral-900 dark:text-slate-100">
                              {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                            </div>
                            <div className="text-sm text-neutral-500 dark:text-slate-400">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-neutral-900 dark:text-slate-100">
                          {user.role.replace('_', ' ')}
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
                          {user.kycStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-slate-100">
                        ${user.totalInvestments?.toLocaleString() || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-slate-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.isSuspended
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {user.isSuspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                        >
                          View Details
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
                Showing {((filters.page || 1) - 1) * (filters.limit || 20) + 1} to{' '}
                {Math.min((filters.page || 1) * (filters.limit || 20), users.totalCount)} of {users.totalCount} users
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange((filters.page || 1) - 1)}
                  disabled={!users.hasPreviousPage}
                  className="px-3 py-2 border border-neutral-300 dark:border-slate-600 rounded-lg text-sm font-medium text-neutral-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-slate-700"
                >
                  Previous
                </button>
                <span className="text-sm text-neutral-700 dark:text-slate-300">
                  Page {filters.page} of {users.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange((filters.page || 1) + 1)}
                  disabled={!users.hasNextPage}
                  className="px-3 py-2 border border-neutral-300 dark:border-slate-600 rounded-lg text-sm font-medium text-neutral-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="px-6 py-12 text-center text-neutral-500 dark:text-slate-400">
            No users found
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
