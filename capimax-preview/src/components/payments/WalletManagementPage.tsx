/**
 * /wallet — the investor's wallet (client round 3, #14).
 *
 * This page used to render a mock deposit/withdraw form (DepositWithdraw)
 * that never moved money. It now shows the same real wallet as the
 * dashboard: the custody wallet, the live balance, Add Funds (card via
 * Stripe, crypto via NOWPayments, bank deposit), admin-reviewed
 * withdrawals and the transaction history.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import WalletPanel from '../wallet/WalletPanel';
import { WalletContent } from '../dashboard/investor/InvestorControlPanel';
import { DashboardService } from '../../services/dashboard/DashboardService';
import { PaymentService } from '../../services/payment/PaymentService';

interface WalletManagementPageProps {
  className?: string;
}

export function WalletManagementPage({ className }: WalletManagementPageProps) {
  const { data: portfolio, isLoading: portfolioLoading } = useQuery({
    queryKey: ['investor-portfolio'],
    queryFn: DashboardService.getPortfolio,
    refetchInterval: 30000,
  });

  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => PaymentService.getWalletBalance(),
    refetchInterval: 30000,
  });

  const walletBalance =
    walletData?.total_value_usd ||
    walletData?.balances?.reduce((sum: number, b: any) => sum + (parseFloat(b.available_balance) || 0), 0) ||
    0;

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 ${className || ''}`}>
      <WalletPanel />
      <WalletContent
        portfolio={portfolio as any}
        loading={portfolioLoading}
        walletBalance={walletBalance}
        walletLoading={walletLoading}
      />
    </div>
  );
}

export default WalletManagementPage;
