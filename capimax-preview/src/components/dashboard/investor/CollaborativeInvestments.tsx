import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  Target,
  DollarSign,
  TrendingUp,
  MapPin,
  Calendar,
  User,
  MessageSquare,
  Share2,
  AlertCircle,
  Building,
  Percent,
  Activity,
  Eye,
  ChevronRight,
  Star,
  Award,
  Shield,
  Zap,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

import { DashboardService, type CollaborativeInvestment } from '../../../services/dashboard/DashboardService';
import { type PropertyType } from '../../../services/api/types';
import { StatsCard, Card } from '../../design-system';
import { Text } from '../../design-system/typography/Text';
import { Button } from '../../ui/Button';
import { cn } from '../../../utils/cn';

interface CollaborativeInvestmentsProps {
  className?: string;
}

type TabType = 'available' | 'joined' | 'completed';
type SortField = 'amount' | 'progress' | 'deadline' | 'roi';

export const CollaborativeInvestments: React.FC<CollaborativeInvestmentsProps> = ({
  className
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('available');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvestment, setSelectedInvestment] = useState<string | null>(null);
  const [joinAmount, setJoinAmount] = useState<number>(0);
  const [sortField, setSortField] = useState<SortField>('amount');
  const queryClient = useQueryClient();

  // Fetch collaborative investments
  const { data: collaborativeInvestments, isLoading, refetch } = useQuery({
    queryKey: ['collaborative-investments'],
    queryFn: DashboardService.getCollaborativeInvestments,
    refetchInterval: 30000,
  });

  // Join investment mutation
  const joinInvestmentMutation = useMutation({
    mutationFn: ({ investmentId, amount }: { investmentId: string; amount: number }) =>
      DashboardService.joinCollaborativeInvestment(investmentId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborative-investments'] });
      setSelectedInvestment(null);
      setJoinAmount(0);
    },
  });

  // Extend investments with computed metrics from real data only
  const extendedInvestments = useMemo(() => {
    if (!collaborativeInvestments) return [];

    return collaborativeInvestments.map((investment) => ({
      ...investment,
      property: {
        ...investment,
        type: investment.propertyType || 'residential',
        description: investment.description || '',
      },
      metrics: {
        averageInvestment: investment.currentAmount / Math.max(investment.investors?.length || 1, 1),
        completion: (investment.currentAmount / investment.totalAmount) * 100,
        timeLeft: Math.max(0, new Date(investment.deadline).getTime() - Date.now()),
      }
    }));
  }, [collaborativeInvestments]);

  // Filter investments based on active tab
  const filteredInvestments = useMemo(() => {
    let filtered = extendedInvestments;

    // Apply tab filter
    switch (activeTab) {
      case 'available':
        filtered = filtered.filter(inv => inv.status === 'open');
        break;
      case 'joined':
        filtered = filtered.filter(inv => inv.isJoined === true);
        break;
      case 'completed':
        filtered = filtered.filter(inv => inv.status === 'completed');
        break;
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(inv =>
        inv.propertyName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortField) {
        case 'amount':
          return b.totalAmount - a.totalAmount;
        case 'progress':
          return b.metrics.completion - a.metrics.completion;
        case 'deadline':
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'roi':
          return b.property.expectedROI - a.property.expectedROI;
        default:
          return 0;
      }
    });

    return filtered;
  }, [extendedInvestments, activeTab, searchTerm, sortField]);

  const handleJoinInvestment = (investmentId: string) => {
    if (joinAmount > 0) {
      joinInvestmentMutation.mutate({ investmentId, amount: joinAmount });
    }
  };

  const formatTimeLeft = (milliseconds: number) => {
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return 'Ending soon';
  };

  const tabs = [
    { id: 'available', label: 'Available', count: extendedInvestments.filter(inv => inv.status === 'open').length },
    { id: 'joined', label: 'Joined', count: Math.floor(extendedInvestments.length * 0.3) },
    { id: 'completed', label: 'Completed', count: extendedInvestments.filter(inv => inv.status === 'completed').length },
  ] as const;

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-700 h-32 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-700 h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <Text variant="h3" weight="semibold" className="mb-2">
            Co-Ownership Pools
          </Text>
          <Text variant="body" color="muted">
            Join forces with other owners to access premium properties
          </Text>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Group
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Available Opportunities"
          value={extendedInvestments.filter(inv => inv.status === 'open').length}
          subtitle="Open for purchase"
          icon={Target}
          variant="gradient"
          animated={true}
        />
        <StatsCard
          title="Active Collaborations"
          value={Math.floor(extendedInvestments.length * 0.3)}
          subtitle="You're participating in"
          icon={Users}
          variant="accent"
          animated={true}
        />
        <StatsCard
          title="Average Group Size"
          value={Math.floor(extendedInvestments.reduce((acc, inv) => acc + inv.investors.length, 0) / Math.max(extendedInvestments.length, 1))}
          subtitle="Owners per group"
          icon={Activity}
          animated={true}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Tab Navigation */}
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded transition-colors flex items-center gap-2',
                activeTab === tab.id
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              )}
            >
              {tab.label}
              <span className={cn(
                'px-2 py-1 text-xs rounded-full',
                activeTab === tab.id
                  ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search and Sort */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="amount">Total Amount</option>
            <option value="progress">Progress</option>
            <option value="deadline">Deadline</option>
            <option value="roi">Expected ROI</option>
          </select>
        </div>
      </div>

      {/* Investment Cards */}
      <AnimatePresence mode="wait">
        {filteredInvestments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <Text variant="h3" weight="semibold" className="mb-2">
              No co-ownership pools found
            </Text>
            <Text variant="body" color="muted" className="mb-4">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'New group ownership opportunities will appear here'}
            </Text>
            <Button variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              Create First Group
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {filteredInvestments.map((investment) => (
              <CollaborativeInvestmentCard
                key={investment.id}
                investment={investment}
                onJoin={(amount) => handleJoinInvestment(investment.id)}
                isJoining={joinInvestmentMutation.isPending}
                activeTab={activeTab}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Individual Investment Card Component
const CollaborativeInvestmentCard: React.FC<{
  investment: any;
  onJoin: (amount: number) => void;
  isJoining: boolean;
  activeTab: TabType;
}> = ({ investment, onJoin, isJoining, activeTab }) => {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinAmount, setJoinAmount] = useState(investment.minimumContribution);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        {/* Property Image */}
        <div className="relative h-48 bg-gradient-to-br from-emerald-400 to-green-600">
          <div className="absolute inset-0 flex items-center justify-center">
            <Building className="w-16 h-16 text-white/70" />
          </div>
          
          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <div className={cn(
              'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
              investment.status === 'open'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                : investment.status === 'completed'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
            )}>
              {investment.status === 'open' && <Clock className="w-3 h-3 mr-1" />}
              {investment.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
              {investment.status.toUpperCase()}
            </div>
          </div>

          {/* Time Left */}
          {investment.status === 'open' && (
            <div className="absolute top-3 right-3">
              <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-slate-800">
                <Clock className="w-3 h-3 inline mr-1" />
                {formatTimeLeft(investment.metrics.timeLeft)}
              </div>
            </div>
          )}
        </div>

        <div className="p-6">
          {/* Property Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <Text variant="h4" weight="semibold" className="mb-1">
                {investment.propertyName}
              </Text>
              <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm mb-2">
                <MapPin className="w-4 h-4 mr-1" />
                {investment.property.location}
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center text-emerald-600">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  {investment.property.expectedROI.toFixed(1)}% ROI
                </div>
                <div className="flex items-center text-slate-500">
                  <Users className="w-4 h-4 mr-1" />
                  {investment.investors.length} owners
                </div>
              </div>
            </div>
          </div>

          {/* Lead Investor */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <Text variant="body" weight="semibold">
                {investment.leadInvestor.name}
              </Text>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center text-yellow-500">
                  <Star className="w-3 h-3 mr-1" />
                  {investment.leadInvestor.rating.toFixed(1)}
                </div>
                <Text variant="caption" color="muted">
                  {investment.leadInvestor.completedDeals} deals
                </Text>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4 text-emerald-600" />
              <Award className="w-4 h-4 text-blue-600" />
            </div>
          </div>

          {/* Investment Progress */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <Text variant="body" weight="semibold">
                Progress
              </Text>
              <Text variant="body" weight="semibold" className="text-emerald-600">
                {investment.metrics.completion.toFixed(1)}%
              </Text>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-2">
              <div
                className="bg-gradient-to-r from-emerald-500 to-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(investment.metrics.completion, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <Text variant="caption" color="muted">
                ${investment.currentAmount.toLocaleString()} raised
              </Text>
              <Text variant="caption" color="muted">
                Goal: ${investment.totalAmount.toLocaleString()}
              </Text>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <Text variant="body" weight="semibold">
                ${investment.minimumContribution.toLocaleString()}
              </Text>
              <Text variant="caption" color="muted">
                Min. Purchase
              </Text>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <Text variant="body" weight="semibold">
                ${investment.metrics.averageInvestment.toLocaleString()}
              </Text>
              <Text variant="caption" color="muted">
                Avg. Purchase
              </Text>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {activeTab === 'available' && investment.status === 'open' && (
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => setShowJoinModal(true)}
                  disabled={isJoining}
                >
                  {isJoining ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Join Group
                </Button>
                <Button variant="outline">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            {activeTab === 'joined' && (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Group Chat ({investment.chat.messageCount})
                </Button>
                <Button variant="outline">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            )}

            {activeTab === 'completed' && (
              <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <div>
                  <Text variant="body" weight="semibold" className="text-emerald-600">
                    Purchase Complete
                  </Text>
                  <Text variant="caption" color="muted">
                    Property fully funded
                  </Text>
                </div>
                <Button variant="outline" size="sm">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Property Features */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap gap-2">
              {investment.property.features.slice(0, 3).map((feature: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                >
                  <Zap className="w-3 h-3 mr-1" />
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Join Modal */}
        <AnimatePresence>
          {showJoinModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowJoinModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <Text variant="h3" weight="semibold" className="mb-4">
                  Join Co-Ownership Group
                </Text>

                <div className="space-y-4">
                  <div>
                    <Text variant="body" weight="medium" className="mb-2">
                      Purchase Amount
                    </Text>
                    <input
                      type="number"
                      value={joinAmount}
                      onChange={(e) => setJoinAmount(Number(e.target.value))}
                      min={investment.minimumContribution}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      placeholder={`Min. $${investment.minimumContribution.toLocaleString()}`}
                    />
                    <Text variant="caption" color="muted" className="mt-1">
                      Minimum: ${investment.minimumContribution.toLocaleString()}
                    </Text>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <Text variant="body" color="muted">Your ownership:</Text>
                      <Text variant="body" weight="semibold">
                        {((joinAmount / investment.property.totalValue) * 100).toFixed(2)}%
                      </Text>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowJoinModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => {
                      onJoin(joinAmount);
                      setShowJoinModal(false);
                    }}
                    disabled={joinAmount < investment.minimumContribution || isJoining}
                  >
                    {isJoining ? 'Joining...' : 'Join Group'}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};