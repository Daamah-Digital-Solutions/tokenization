/**
 * Real EIP-1193 wallet connector.
 *
 * This module is intentionally dependency-free — it talks directly to the
 * browser-injected provider (window.ethereum) which every modern Web3 wallet
 * implements (MetaMask, Coinbase Wallet, Trust Wallet, Brave, Rabby, ...).
 *
 * For a richer multi-wallet UX (WalletConnect QR codes, etc.) wagmi +
 * RainbowKit can be layered on top of this without changing the call sites.
 */

export type WalletProvider = 'metamask' | 'coinbase' | 'walletconnect' | 'injected';

export interface WalletConnection {
  address: string;
  chainId: number;
  walletName: string;
}

export class WalletConnectionError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'WalletConnectionError';
    this.code = code;
  }
}

// EIP-1193 error codes
const ERR_USER_REJECTED = 4001;

declare global {
  interface Window {
    ethereum?: any;
    coinbaseWalletExtension?: any;
  }
}

/**
 * Detect which wallet, if any, is injected into the browser.
 */
export function detectInjectedWallet(): WalletProvider | null {
  if (typeof window === 'undefined') return null;
  if (window.ethereum?.isCoinbaseWallet) return 'coinbase';
  if (window.ethereum?.isMetaMask) return 'metamask';
  if (window.ethereum) return 'injected';
  return null;
}

/**
 * Return the right provider for the requested wallet. If the user asked for
 * MetaMask but it isn't installed, surface a useful error message instead of
 * connecting to whatever happens to be at `window.ethereum`.
 */
function getProvider(walletId: WalletProvider) {
  if (typeof window === 'undefined') {
    throw new WalletConnectionError(
      'NO_WINDOW',
      'Wallet connection requires a browser environment.'
    );
  }

  if (walletId === 'walletconnect') {
    throw new WalletConnectionError(
      'WALLETCONNECT_NOT_CONFIGURED',
      'WalletConnect requires the optional @walletconnect/ethereum-provider package. ' +
      'Install it and configure VITE_WALLET_CONNECT_PROJECT_ID.'
    );
  }

  // Coinbase Wallet exposes both `window.coinbaseWalletExtension` and
  // injects into `window.ethereum`. Prefer the extension when present.
  if (walletId === 'coinbase') {
    if (window.coinbaseWalletExtension) return window.coinbaseWalletExtension;
    if (window.ethereum?.isCoinbaseWallet) return window.ethereum;
    throw new WalletConnectionError(
      'WALLET_NOT_INSTALLED',
      'Coinbase Wallet extension not detected. Install it from coinbase.com/wallet.'
    );
  }

  if (walletId === 'metamask') {
    if (window.ethereum?.isMetaMask) return window.ethereum;
    throw new WalletConnectionError(
      'WALLET_NOT_INSTALLED',
      'MetaMask not detected. Install it from metamask.io.'
    );
  }

  if (!window.ethereum) {
    throw new WalletConnectionError(
      'WALLET_NOT_INSTALLED',
      'No Web3 wallet detected in this browser.'
    );
  }
  return window.ethereum;
}

/**
 * Request accounts from the wallet. This pops the wallet's connect UI.
 */
export async function connectWallet(walletId: WalletProvider): Promise<WalletConnection> {
  const provider = getProvider(walletId);

  let accounts: string[];
  try {
    accounts = await provider.request({ method: 'eth_requestAccounts' });
  } catch (err: any) {
    if (err?.code === ERR_USER_REJECTED) {
      throw new WalletConnectionError(
        'USER_REJECTED',
        'You rejected the wallet connection.'
      );
    }
    throw new WalletConnectionError(
      'CONNECT_FAILED',
      err?.message || 'Wallet connection failed.'
    );
  }

  if (!accounts?.length) {
    throw new WalletConnectionError(
      'NO_ACCOUNTS',
      'Wallet returned no accounts.'
    );
  }

  const chainHex: string = await provider.request({ method: 'eth_chainId' });
  const chainId = parseInt(chainHex, 16);

  return {
    address: accounts[0],
    chainId,
    walletName: walletId,
  };
}

/**
 * Ask the wallet to sign a UTF-8 message using EIP-191 personal_sign.
 *
 * Used for "prove you own this wallet" flows — e.g. linking an external
 * wallet to a Capimax account without spending gas or sending a tx.
 *
 * The wallet shows the message to the user verbatim; never embed sensitive
 * data in it. The signature is a 65-byte hex string (0x...).
 */
export async function signMessage(
  walletId: WalletProvider,
  address: string,
  message: string,
): Promise<string> {
  const provider = getProvider(walletId);
  try {
    const signature: string = await provider.request({
      method: 'personal_sign',
      params: [message, address],
    });
    return signature;
  } catch (err: any) {
    if (err?.code === ERR_USER_REJECTED) {
      throw new WalletConnectionError(
        'USER_REJECTED',
        'You rejected the signature request.'
      );
    }
    throw new WalletConnectionError(
      'SIGN_FAILED',
      err?.message || 'Wallet refused to sign the message.'
    );
  }
}

/**
 * Read the native-token balance of an address (returns wei as bigint).
 */
export async function getNativeBalance(address: string): Promise<bigint> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new WalletConnectionError(
      'NO_PROVIDER',
      'No Web3 provider available.'
    );
  }
  const result: string = await window.ethereum.request({
    method: 'eth_getBalance',
    params: [address, 'latest'],
  });
  return BigInt(result);
}

/** Convert wei (bigint) to a fixed-precision decimal string. */
export function formatEther(wei: bigint, decimals = 4): string {
  const whole = wei / 10n ** 18n;
  const fraction = wei % 10n ** 18n;
  const fracStr = fraction.toString().padStart(18, '0').slice(0, decimals);
  return `${whole}.${fracStr}`;
}

/**
 * Subscribe to account/chain changes. Returns a function that detaches all
 * listeners.
 */
export function subscribe(
  onAccountChange: (accounts: string[]) => void,
  onChainChange: (chainId: number) => void
): () => void {
  if (typeof window === 'undefined' || !window.ethereum) return () => {};
  const handleChain = (hex: string) => onChainChange(parseInt(hex, 16));
  window.ethereum.on('accountsChanged', onAccountChange);
  window.ethereum.on('chainChanged', handleChain);
  return () => {
    try {
      window.ethereum.removeListener('accountsChanged', onAccountChange);
      window.ethereum.removeListener('chainChanged', handleChain);
    } catch {
      /* no-op */
    }
  };
}
