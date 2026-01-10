import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PropertyService } from '../../services';
import PropertyOwnerService from '../../services/property-owner/PropertyOwnerService';
import type { Property } from '../../services/api/types';
import { Link } from 'react-router-dom';

type PropertyStatus = 'draft' | 'pending_approval' | 'approved' | 'active' | 'tokenized' | 'delisted';

const STATUS_CONFIG: Record<PropertyStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  draft: {
    label: 'Draft',
    color: 'text-neutral-600 dark:text-slate-400',
    bgColor: 'bg-neutral-100 dark:bg-slate-700',
    icon: '✏️',
  },
  pending_approval: {
    label: 'Pending Approval',
    color: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: '⏳',
  },
  approved: {
    label: 'Approved',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: '✅',
  },
  active: {
    label: 'Active',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: '🚀',
  },
  tokenized: {
    label: 'Tokenized',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: '🪙',
  },
  delisted: {
    label: 'Delisted',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: '❌',
  },
};

export const PropertyListManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<PropertyStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: properties = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['properties', 'owner'],
    queryFn: PropertyOwnerService.getOwnedProperties,
    staleTime: 2 * 60 * 1000,
  });

  const submitForApprovalMutation = useMutation({
    mutationFn: (propertyId: string) => PropertyService.submitPropertyForApproval(propertyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', 'owner'] });
      alert('Property submitted for approval successfully!');
    },
    onError: (error: any) => {
      alert(`Failed to submit property: ${error.message}`);
    },
  });

  const filteredProperties = properties.filter((property: Property) => {
    const matchesStatus = selectedStatus === 'all' || property.status === selectedStatus;
    const matchesSearch =
      !searchTerm ||
      property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: PropertyStatus) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    return (
      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </span>
    );
  };

  const canSubmitForApproval = (property: Property) => {
    return property.status === 'draft';
  };

  const canEdit = (property: Property) => {
    return property.status === 'draft' || property.status === 'delisted';
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
              <div className="h-6 bg-neutral-200 dark:bg-slate-600 rounded mb-4 w-1/3"></div>
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-10 bg-neutral-200 dark:bg-slate-600 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <h3 className="text-red-800 dark:text-red-200 font-medium mb-2">Error Loading Properties</h3>
          <p className="text-red-600 dark:text-red-300 text-sm mb-4">Failed to load your properties. Please try again.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-slate-100">My Properties</h1>
          <p className="text-neutral-600 dark:text-slate-400 mt-1">
            Manage and track your tokenized properties
          </p>
        </div>
        <Link
          to="/property-owner/create-property"
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create New Property</span>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(['all', 'draft', 'pending_approval', 'active'] as const).map((status) => {
          const count = status === 'all' ? properties.length : properties.filter((p: Property) => p.status === status).length;
          const config = status === 'all' ? { label: 'All Properties', icon: '🏢', bgColor: 'bg-neutral-50 dark:bg-slate-800' } : STATUS_CONFIG[status];

          return (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                selectedStatus === status
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{config.icon}</span>
                <span className="text-2xl font-bold text-neutral-900 dark:text-slate-100">{count}</span>
              </div>
              <p className="text-sm font-medium text-neutral-600 dark:text-slate-400">{config.label}</p>
            </button>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search properties by title, city, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Properties List */}
      {filteredProperties.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 p-12 text-center">
          <span className="text-6xl mb-4 block">🏢</span>
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-slate-100 mb-2">
            {searchTerm || selectedStatus !== 'all' ? 'No Properties Found' : 'No Properties Yet'}
          </h3>
          <p className="text-neutral-600 dark:text-slate-400 mb-6">
            {searchTerm || selectedStatus !== 'all'
              ? 'Try adjusting your filters or search term'
              : 'Start by creating your first property listing'}
          </p>
          {!searchTerm && selectedStatus === 'all' && (
            <Link
              to="/property-owner/create-property"
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Create Your First Property
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProperties.map((property: Property) => (
            <div
              key={property.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
                      {property.title}
                    </h3>
                    {getStatusBadge(property.status as PropertyStatus)}
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-slate-400">
                    📍 {property.address || `${property.city}, ${property.country}`}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-slate-500 mt-1">
                    Created: {formatDate(property.created_at)} • Updated: {formatDate(property.updated_at)}
                  </p>
                </div>
              </div>

              {/* Property Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div>
                  <p className="text-xs text-neutral-500 dark:text-slate-400 mb-1">Total Value</p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
                    {formatCurrency(property.total_value)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-slate-400 mb-1">Token Price</p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
                    ${property.token_price}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-slate-400 mb-1">Tokens</p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
                    {property.tokens_sold?.toLocaleString() || 0} / {property.total_tokens?.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-slate-400 mb-1">Funding</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-neutral-200 dark:bg-slate-600 rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full transition-all"
                        style={{ width: `${property.funding_percentage || 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-neutral-900 dark:text-slate-100">
                      {(property.funding_percentage || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-slate-400 mb-1">Expected Return</p>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {property.expected_return}%
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3 pt-4 border-t border-neutral-200 dark:border-slate-700">
                <Link
                  to={`/properties/${property.id}`}
                  className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>View Details</span>
                </Link>

                {canEdit(property) && (
                  <Link
                    to={`/property-owner/edit-property/${property.id}`}
                    className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-slate-300 hover:text-neutral-900 dark:hover:text-slate-100 flex items-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit</span>
                  </Link>
                )}

                <Link
                  to={`/property-owner/manage-property/${property.id}`}
                  className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-slate-300 hover:text-neutral-900 dark:hover:text-slate-100 flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Manage Media</span>
                </Link>

                {canSubmitForApproval(property) && (
                  <button
                    onClick={() => submitForApprovalMutation.mutate(property.id)}
                    disabled={submitForApprovalMutation.isPending}
                    className="ml-auto px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-neutral-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitForApprovalMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
                  </button>
                )}

                {property.status === 'pending_approval' && (
                  <Link
                    to={`/property-owner/approval-status/${property.id}`}
                    className="ml-auto px-4 py-2 text-sm font-medium bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Check Approval Status
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertyListManagement;
