import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  ExternalLink,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  ArrowRight
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../design-system/cards/Card';
import { Text } from '../design-system/typography/Text';
import { cn } from '../../utils/cn';

interface WalletConnectorProps {
  onConnect?: (walletAddress: string, walletType: string) => void;
  onDisconnect?: () => void;
  isConnecting?: boolean;
  className?: string;
}

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  installed?: boolean;
  popular?: boolean;
}

const walletOptions: WalletOption[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    description: 'Most popular Ethereum wallet',
    popular: true
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: '🔗',
    description: 'Connect with mobile wallets'
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '🔵',
    description: 'Self-custody wallet by Coinbase'
  },
  {
    id: 'phantom',
    name: 'Phantom',
    icon: '👻',
    description: 'Solana & Ethereum wallet'
  }
];

export const WalletConnector: React.FC<WalletConnectorProps> = ({
  onConnect,
  onDisconnect,
  isConnecting = false,
  className
}) => {
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [network, setNetwork] = useState<string>('Ethereum Mainnet');
  const [showAddress, setShowAddress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock wallet detection
  useEffect(() => {
    // In a real app, you would check for installed wallets
    const checkWalletInstallation = () => {
      walletOptions.forEach(wallet => {
        if (wallet.id === 'metamask') {
          wallet.installed = typeof window !== 'undefined' && window.ethereum;
        }
        // Add other wallet checks here
      });
    };
    
    checkWalletInstallation();
  }, []);

  const handleWalletConnect = async (walletId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Mock wallet connection - in real app, use actual wallet connection logic
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful connection
      const mockAddress = '0x1234567890123456789012345678901234567890';
      const walletName = walletOptions.find(w => w.id === walletId)?.name || 'Wallet';
      
      setConnectedWallet(walletName);
      setConnectedAddress(mockAddress);
      setBalance('2.5 ETH');
      
      onConnect?.(mockAddress, walletName);
    } catch (err) {
      setError('Failed to connect wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setConnectedWallet(null);
    setConnectedAddress(null);
    setBalance(null);
    setError(null);
    onDisconnect?.();
  };

  const copyAddress = async () => {
    if (connectedAddress) {
      await navigator.clipboard.writeText(connectedAddress);
      // You could add a toast notification here
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (connectedWallet && connectedAddress) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="flex items-center justify-between mb-4">
          <Text variant="h4" weight="semibold" className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-500" />
            Wallet Connected
          </Text>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <Text variant="bodySmall" color="muted">Connected</Text>
          </div>
        </div>

        <div className="space-y-4">
          {/* Wallet Info */}
          <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                <span className="text-xl">
                  {walletOptions.find(w => w.name === connectedWallet)?.icon || '🔗'}
                </span>
              </div>
              <div>
                <Text variant="bodyLarge" weight="semibold">{connectedWallet}</Text>
                <Text variant="bodySmall" color="muted">{network}</Text>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Disconnect
            </Button>
          </div>

          {/* Address & Balance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <Text variant="bodySmall" color="muted">Address</Text>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddress(!showAddress)}
                    className="p-1"
                  >
                    {showAddress ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyAddress}
                    className="p-1"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <Text variant="bodyLarge" weight="semibold" className="font-mono">
                {showAddress ? connectedAddress : formatAddress(connectedAddress)}
              </Text>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <Text variant="bodySmall" color="muted" className="mb-2">Balance</Text>
              <Text variant="bodyLarge" weight="semibold" className="text-emerald-600">
                {balance}
              </Text>
            </div>
          </div>

          {/* Network Status */}
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <Text variant="bodySmall" className="text-blue-800 dark:text-blue-200">
                Connected to {network}
              </Text>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <Text variant="bodySmall" className="text-green-600">Active</Text>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("p-6", className)}>
      <div className="text-center mb-6">
        <Text variant="h4" weight="semibold" className="mb-2">
          Connect Your Wallet
        </Text>
        <Text variant="body" color="muted">
          Choose a wallet to connect and complete your investment
        </Text>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <Text variant="bodySmall">{error}</Text>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {walletOptions.map((wallet) => (
          <Button
            key={wallet.id}
            variant="secondary"
            size="lg"
            onClick={() => handleWalletConnect(wallet.id)}
            disabled={loading || isConnecting}
            className={cn(
              "w-full justify-between h-auto p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
              wallet.popular && "ring-1 ring-emerald-200 dark:ring-emerald-800"
            )}
          >
            <div className="flex items-center gap-4">
              <div className="text-2xl">{wallet.icon}</div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{wallet.name}</span>
                  {wallet.popular && (
                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs rounded-full">
                      Popular
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {wallet.description}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {wallet.installed === false && (
                <span className="text-xs text-gray-500 dark:text-gray-400">Not installed</span>
              )}
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </div>
          </Button>
        ))}
      </div>

      {/* Help Section */}
      <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <Text variant="bodySmall" weight="semibold" className="text-amber-800 dark:text-amber-200 mb-1">
          Don't have a wallet?
        </Text>
        <div className="flex items-center justify-between">
          <Text variant="bodySmall" className="text-amber-700 dark:text-amber-300">
            Learn how to set up a crypto wallet
          </Text>
          <Button
            variant="ghost"
            size="sm"
            className="text-amber-600 hover:text-amber-700 p-1"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Security Notice */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <Text variant="bodySmall" className="text-blue-700 dark:text-blue-300">
            We never store your private keys or seed phrase. Your wallet remains under your complete control.
          </Text>
        </div>
      </div>
    </Card>
  );
};