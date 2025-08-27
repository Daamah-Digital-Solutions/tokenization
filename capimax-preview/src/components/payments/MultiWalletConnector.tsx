import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  Smartphone, 
  Shield, 
  Copy, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react';
import { usePayment } from '../../contexts/PaymentContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  isInstalled?: boolean;
  downloadUrl?: string;
  isPopular?: boolean;
  supportedChains: string[];
}

interface MultiWalletConnectorProps {
  className?: string;
  onConnect?: (wallet: WalletOption) => void;
  onClose?: () => void;
  isOpen?: boolean;
}

const WALLET_OPTIONS: WalletOption[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    description: 'Connect using browser wallet',
    downloadUrl: 'https://metamask.io/download/',
    isPopular: true,
    supportedChains: ['ethereum', 'polygon', 'bsc']
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: '🔗',
    description: 'Scan with your mobile wallet',
    isPopular: true,
    supportedChains: ['ethereum', 'polygon', 'bsc', 'arbitrum']
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '🔵',
    description: 'Connect your Coinbase Wallet',
    downloadUrl: 'https://wallet.coinbase.com/',
    supportedChains: ['ethereum', 'polygon', 'bsc']
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    icon: '🛡️',
    description: 'Mobile-first crypto wallet',
    downloadUrl: 'https://trustwallet.com/',
    supportedChains: ['ethereum', 'polygon', 'bsc', 'tron']
  },
  {
    id: 'phantom',
    name: 'Phantom',
    icon: '👻',
    description: 'Solana and Ethereum wallet',
    downloadUrl: 'https://phantom.app/',
    supportedChains: ['solana', 'ethereum', 'polygon']
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    icon: '🌈',
    description: 'Fun and simple crypto wallet',
    downloadUrl: 'https://rainbow.me/',
    supportedChains: ['ethereum', 'polygon', 'arbitrum']
  }
];

interface ConnectedWalletInfo {
  address: string;
  balance: string;
  chain: string;
  walletName: string;
}

export function MultiWalletConnector({ className, onConnect, onClose, isOpen }: MultiWalletConnectorProps) {
  const { state, dispatch } = usePayment();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWalletInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installedWallets, setInstalledWallets] = useState<Set<string>>(new Set());

  // Check for installed wallets
  useEffect(() => {
    const checkInstalledWallets = () => {
      const installed = new Set<string>();
      
      // Check MetaMask
      if (typeof window !== 'undefined' && window.ethereum?.isMetaMask) {
        installed.add('metamask');
      }
      
      // Check Coinbase Wallet
      if (typeof window !== 'undefined' && window.ethereum?.isCoinbaseWallet) {
        installed.add('coinbase');
      }
      
      // Check Trust Wallet
      if (typeof window !== 'undefined' && window.ethereum?.isTrust) {
        installed.add('trust');
      }
      
      // Check Phantom
      if (typeof window !== 'undefined' && window.solana?.isPhantom) {
        installed.add('phantom');
      }
      
      setInstalledWallets(installed);
    };
    
    checkInstalledWallets();
  }, []);

  const handleWalletConnect = async (wallet: WalletOption) => {
    if (!installedWallets.has(wallet.id) && wallet.id !== 'walletconnect') {
      // Wallet not installed
      if (wallet.downloadUrl) {
        window.open(wallet.downloadUrl, '_blank');
      }
      return;
    }

    setIsConnecting(true);
    setConnectingWallet(wallet.id);
    setError(null);

    try {
      let accounts: string[] = [];
      let provider: any = null;

      switch (wallet.id) {
        case 'metamask':
          if (window.ethereum?.isMetaMask) {
            provider = window.ethereum;
            accounts = await provider.request({ method: 'eth_requestAccounts' });
          }
          break;
          
        case 'coinbase':
          if (window.ethereum?.isCoinbaseWallet) {
            provider = window.ethereum;
            accounts = await provider.request({ method: 'eth_requestAccounts' });
          }
          break;
          
        case 'trust':
          if (window.ethereum?.isTrust) {
            provider = window.ethereum;
            accounts = await provider.request({ method: 'eth_requestAccounts' });
          }
          break;
          
        case 'walletconnect':
          // WalletConnect integration would go here
          // For demo purposes, simulate connection
          await new Promise(resolve => setTimeout(resolve, 2000));
          accounts = ['0x' + Math.random().toString(16).substr(2, 40)];
          break;
          
        default:
          throw new Error(`Wallet ${wallet.name} not supported yet`);
      }

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Get balance and chain info
      let balance = '0';
      let chainId = '1';

      if (provider) {
        try {
          balance = await provider.request({
            method: 'eth_getBalance',
            params: [accounts[0], 'latest'],
          });
          chainId = await provider.request({ method: 'eth_chainId' });
        } catch (err) {
          console.warn('Failed to get balance/chain info:', err);
        }
      }

      // Convert balance from wei to ETH
      const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
      const chainName = getChainName(chainId);

      const walletInfo: ConnectedWalletInfo = {
        address: accounts[0],
        balance: balanceInEth.toFixed(4),
        chain: chainName,
        walletName: wallet.name,
      };

      setConnectedWallet(walletInfo);
      
      // Add wallet as payment method
      dispatch({
        type: 'ADD_PAYMENT_METHOD',
        payload: {
          type: 'crypto',
          currency: 'ETH',
          network: 'ethereum',
          address: accounts[0],
        }
      });

      onConnect?.(wallet);

    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
      setConnectingWallet(null);
    }
  };

  const handleDisconnect = () => {
    setConnectedWallet(null);
    setError(null);
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    // You could add a toast notification here
  };

  const getChainName = (chainId: string): string => {
    const chains: Record<string, string> = {
      '0x1': 'Ethereum',
      '0x89': 'Polygon',
      '0x38': 'BSC',
      '0xa4b1': 'Arbitrum',
      '0xa': 'Optimism',
    };
    return chains[chainId] || 'Unknown';
  };

  const formatWalletOptions = () => {
    const popular = WALLET_OPTIONS.filter(w => w.isPopular);
    const others = WALLET_OPTIONS.filter(w => !w.isPopular);
    return { popular, others };
  };

  const { popular, others } = formatWalletOptions();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Connect Wallet</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {connectedWallet ? (
              // Connected State
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <div className="flex-1">
                    <div className="font-medium text-emerald-900">Wallet Connected</div>
                    <div className="text-sm text-emerald-700">{connectedWallet.walletName}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Address:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-900">
                        {`${connectedWallet.address.slice(0, 6)}...${connectedWallet.address.slice(-4)}`}
                      </span>
                      <button
                        onClick={() => copyAddress(connectedWallet.address)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        <Copy className="h-3 w-3 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Balance:</span>
                    <span className="text-sm font-mono text-gray-900">
                      {connectedWallet.balance} ETH
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Network:</span>
                    <span className="text-sm text-gray-900">{connectedWallet.chain}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    className="flex-1"
                  >
                    Disconnect
                  </Button>
                  <Button
                    onClick={onClose}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            ) : (
              // Connection Options
              <div className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-800">{error}</span>
                  </div>
                )}

                {/* Popular Wallets */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Popular</h3>
                  <div className="space-y-2">
                    {popular.map((wallet) => (
                      <WalletOption
                        key={wallet.id}
                        wallet={wallet}
                        isInstalled={installedWallets.has(wallet.id)}
                        isConnecting={connectingWallet === wallet.id}
                        onClick={() => handleWalletConnect(wallet)}
                      />
                    ))}
                  </div>
                </div>

                {/* Other Wallets */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">More Options</h3>
                  <div className="space-y-2">
                    {others.map((wallet) => (
                      <WalletOption
                        key={wallet.id}
                        wallet={wallet}
                        isInstalled={installedWallets.has(wallet.id)}
                        isConnecting={connectingWallet === wallet.id}
                        onClick={() => handleWalletConnect(wallet)}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Shield className="h-3 w-3" />
                    <span>Your wallet credentials are never stored on our servers</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

interface WalletOptionProps {
  wallet: WalletOption;
  isInstalled: boolean;
  isConnecting: boolean;
  onClick: () => void;
}

function WalletOption({ wallet, isInstalled, isConnecting, onClick }: WalletOptionProps) {
  return (
    <button
      onClick={onClick}
      disabled={isConnecting}
      className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{wallet.icon}</span>
        <div className="text-left">
          <div className="font-medium text-gray-900">{wallet.name}</div>
          <div className="text-sm text-gray-600">{wallet.description}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {isConnecting && (
          <RefreshCw className="h-4 w-4 text-emerald-600 animate-spin" />
        )}
        
        {isInstalled ? (
          <span className="px-2 py-1 text-xs bg-emerald-100 text-emerald-800 rounded-full">
            Installed
          </span>
        ) : wallet.downloadUrl ? (
          <ExternalLink className="h-4 w-4 text-gray-400" />
        ) : null}
      </div>
    </button>
  );
}

// Add to window type for TypeScript
declare global {
  interface Window {
    ethereum?: any;
    solana?: any;
  }
}

export default MultiWalletConnector;