import React from 'react';
import { ExternalLink, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../utils/cn';

type BlockchainNetwork = 'polygon' | 'ethereum' | 'bsc' | 'arbitrum';

interface BlockchainLinkProps {
  transactionHash?: string | null;
  network?: BlockchainNetwork;
  status?: 'completed' | 'pending' | 'minting' | 'pending_mint' | 'failed';
  variant?: 'button' | 'link' | 'badge';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showStatus?: boolean;
  className?: string;
}

const EXPLORER_URLS: Record<BlockchainNetwork, string> = {
  polygon: 'https://polygonscan.com/tx/',
  ethereum: 'https://etherscan.io/tx/',
  bsc: 'https://bscscan.com/tx/',
  arbitrum: 'https://arbiscan.io/tx/',
};

const EXPLORER_NAMES: Record<BlockchainNetwork, string> = {
  polygon: 'PolygonScan',
  ethereum: 'Etherscan',
  bsc: 'BscScan',
  arbitrum: 'Arbiscan',
};

/**
 * BlockchainLink - Reusable component for viewing blockchain transactions
 *
 * Only displays when:
 * 1. transactionHash is provided and not empty
 * 2. status is 'completed' (minting finished)
 *
 * This is a read-only, secure component that opens public blockchain explorers.
 */
export const BlockchainLink: React.FC<BlockchainLinkProps> = ({
  transactionHash,
  network = 'polygon',
  status = 'completed',
  variant = 'button',
  size = 'sm',
  showIcon = true,
  showStatus = false,
  className,
}) => {
  // Only show link when transaction is completed and hash exists
  const isCompleted = status === 'completed';
  const hasHash = transactionHash && transactionHash.length > 0;
  const isPending = ['pending', 'pending_mint', 'minting'].includes(status);

  // If no hash and not pending, don't render anything
  if (!hasHash && !isPending) {
    return null;
  }

  const explorerUrl = hasHash ? `${EXPLORER_URLS[network]}${transactionHash}` : '';
  const explorerName = EXPLORER_NAMES[network];

  const handleClick = () => {
    if (explorerUrl) {
      window.open(explorerUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Pending state - show status indicator
  if (isPending && showStatus) {
    return (
      <div className={cn(
        'inline-flex items-center gap-2 text-amber-600 dark:text-amber-400',
        className
      )}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">
          {status === 'minting' ? 'Minting tokens...' : 'Awaiting blockchain confirmation'}
        </span>
      </div>
    );
  }

  // Completed state with hash - show link
  if (isCompleted && hasHash) {
    if (variant === 'link') {
      return (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700',
            'dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors',
            size === 'sm' && 'text-sm',
            size === 'md' && 'text-base',
            size === 'lg' && 'text-lg',
            className
          )}
        >
          {showIcon && <ExternalLink className={cn(
            size === 'sm' && 'w-3.5 h-3.5',
            size === 'md' && 'w-4 h-4',
            size === 'lg' && 'w-5 h-5',
          )} />}
          <span>View on {explorerName}</span>
        </a>
      );
    }

    if (variant === 'badge') {
      return (
        <button
          onClick={handleClick}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
            'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
            'dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50',
            'transition-colors cursor-pointer',
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-sm',
            size === 'lg' && 'text-base',
            className
          )}
        >
          <CheckCircle className={cn(
            size === 'sm' && 'w-3 h-3',
            size === 'md' && 'w-3.5 h-3.5',
            size === 'lg' && 'w-4 h-4',
          )} />
          <span>Verified on {explorerName}</span>
          {showIcon && <ExternalLink className={cn(
            size === 'sm' && 'w-3 h-3',
            size === 'md' && 'w-3.5 h-3.5',
            size === 'lg' && 'w-4 h-4',
          )} />}
        </button>
      );
    }

    // Default: button variant
    return (
      <Button
        variant="outline"
        size={size}
        onClick={handleClick}
        className={cn(
          'text-emerald-600 border-emerald-300 hover:bg-emerald-50',
          'dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-900/30',
          className
        )}
      >
        {showIcon && <ExternalLink className={cn(
          'mr-2',
          size === 'sm' && 'w-3.5 h-3.5',
          size === 'md' && 'w-4 h-4',
          size === 'lg' && 'w-5 h-5',
        )} />}
        View on {explorerName}
      </Button>
    );
  }

  // Default: nothing to show
  return null;
};

/**
 * Helper function to truncate transaction hash for display
 */
export const truncateHash = (hash: string, startChars = 6, endChars = 4): string => {
  if (hash.length <= startChars + endChars) return hash;
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
};

/**
 * Get explorer URL for a given network and transaction hash
 */
export const getExplorerUrl = (
  hash: string,
  network: BlockchainNetwork = 'polygon'
): string => {
  return `${EXPLORER_URLS[network]}${hash}`;
};

export default BlockchainLink;
