import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Settings, 
  Shield, 
  BarChart3,
  History,
  CreditCard,
  X
} from 'lucide-react';
import WalletBalance from './WalletBalance';
import WalletHistory from './WalletHistory';
import DepositWithdraw from './DepositWithdraw';
import TransactionTracker from './TransactionTracker';
import PaymentAnalytics from './PaymentAnalytics';
import PaymentSecurity from './PaymentSecurity';
import WalletPanel from '../wallet/WalletPanel';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface WalletManagementPageProps {
  className?: string;
}

export function WalletManagementPage({ className }: WalletManagementPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'analytics' | 'security'>('overview');
  const [showModal, setShowModal] = useState<'deposit' | 'withdraw' | 'tracker' | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Wallet },
    { key: 'history', label: 'History', icon: History },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'security', label: 'Security', icon: Shield }
  ];

  const renderModal = () => {
    if (!showModal) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {showModal === 'deposit' && (
              <DepositWithdraw
                mode="deposit"
                onClose={() => setShowModal(null)}
              />
            )}
            {showModal === 'withdraw' && (
              <DepositWithdraw
                mode="withdraw"
                onClose={() => setShowModal(null)}
              />
            )}
            {showModal === 'tracker' && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Transaction Tracker</h3>
                  <button
                    onClick={() => setShowModal(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
                <TransactionTracker 
                  compact={true}
                  transactionId={selectedTransaction || undefined}
                />
              </Card>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Custodial / external blockchain wallet panel — where minted tokens
          actually live. Sits above the fiat WalletBalance so testers see
          their on-chain destination first. */}
      <WalletPanel />

      {/* Wallet Balance */}
      <WalletBalance
        showActions={true}
        onDepositClick={() => setShowModal('deposit')}
        onWithdrawClick={() => setShowModal('withdraw')}
      />

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button
            onClick={() => setShowModal('deposit')}
            className="flex items-center gap-3 p-4 h-auto bg-emerald-600 hover:bg-emerald-700"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
              <ArrowDownLeft className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <div className="font-medium">Deposit</div>
              <div className="text-sm opacity-90">Add funds</div>
            </div>
          </Button>

          <Button
            onClick={() => setShowModal('withdraw')}
            className="flex items-center gap-3 p-4 h-auto bg-blue-600 hover:bg-blue-700"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <div className="font-medium">Withdraw</div>
              <div className="text-sm opacity-90">Move funds</div>
            </div>
          </Button>

          <Button
            onClick={() => setShowModal('tracker')}
            variant="outline"
            className="flex items-center gap-3 p-4 h-auto border-gray-200 hover:border-gray-300"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <History className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-left">
              <div className="font-medium">Track</div>
              <div className="text-sm text-gray-600">View status</div>
            </div>
          </Button>

          <Button
            onClick={() => setActiveTab('security')}
            variant="outline"
            className="flex items-center gap-3 p-4 h-auto border-gray-200 hover:border-gray-300"
          >
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Shield className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-left">
              <div className="font-medium">Security</div>
              <div className="text-sm text-gray-600">Manage safety</div>
            </div>
          </Button>
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab('history')}
          >
            View All
          </Button>
        </div>
        <WalletHistory compact={true} limit={5} />
      </Card>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
          <p className="text-gray-600">Complete record of all your transactions</p>
        </div>
        <Button
          onClick={() => setShowModal('tracker')}
          variant="outline"
          className="flex items-center gap-2"
        >
          <History className="h-4 w-4" />
          Track Transaction
        </Button>
      </div>

      <WalletHistory 
        onTransactionClick={(txId) => {
          setSelectedTransaction(txId);
          setShowModal('tracker');
        }}
      />
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <PaymentAnalytics />
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <PaymentSecurity />
    </div>
  );

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Wallet Management</h1>
              <p className="text-gray-600">Manage your funds, payments, and security settings</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-8 border-b border-gray-200 bg-white rounded-t-lg">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-b-lg min-h-[600px]"
        >
          <div className="p-6">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'history' && renderHistory()}
            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'security' && renderSecurity()}
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      {renderModal()}
    </div>
  );
}

export default WalletManagementPage;