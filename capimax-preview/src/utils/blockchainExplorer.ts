/**
 * Block-explorer URL builder.
 *
 * Centralised here so every "view on explorer" button across the app
 * (Transactions, Portfolio, Investment Detail, Property Detail) points at
 * the same explorer for the same network and uses a canonical network name
 * string. The set of supported networks mirrors what the backend deploys
 * smart contracts onto (BSC + Ethereum + Polygon, testnet + mainnet).
 *
 * Staging today runs against BSC Testnet (DEFAULT_NETWORK_NAME=bsc_testnet
 * in the staging env), so transactions seeded as demo data will resolve
 * against testnet.bscscan.com. Real production deploys would switch the
 * env to a mainnet entry and the same links would route correctly.
 */

export type NetworkKey =
  | 'bsc_testnet'
  | 'bsc'
  | 'bsc_mainnet'
  | 'ethereum'
  | 'ethereum_mainnet'
  | 'ethereum_sepolia'
  | 'sepolia'
  | 'polygon'
  | 'polygon_mainnet'
  | 'polygon_mumbai';

const EXPLORERS: Record<string, { tx: string; address: string; name: string }> = {
  bsc_testnet: {
    tx: 'https://testnet.bscscan.com/tx/',
    address: 'https://testnet.bscscan.com/address/',
    name: 'BscScan Testnet',
  },
  bsc: {
    tx: 'https://bscscan.com/tx/',
    address: 'https://bscscan.com/address/',
    name: 'BscScan',
  },
  bsc_mainnet: {
    tx: 'https://bscscan.com/tx/',
    address: 'https://bscscan.com/address/',
    name: 'BscScan',
  },
  ethereum: {
    tx: 'https://etherscan.io/tx/',
    address: 'https://etherscan.io/address/',
    name: 'Etherscan',
  },
  ethereum_mainnet: {
    tx: 'https://etherscan.io/tx/',
    address: 'https://etherscan.io/address/',
    name: 'Etherscan',
  },
  ethereum_sepolia: {
    tx: 'https://sepolia.etherscan.io/tx/',
    address: 'https://sepolia.etherscan.io/address/',
    name: 'Etherscan Sepolia',
  },
  sepolia: {
    tx: 'https://sepolia.etherscan.io/tx/',
    address: 'https://sepolia.etherscan.io/address/',
    name: 'Etherscan Sepolia',
  },
  polygon: {
    tx: 'https://polygonscan.com/tx/',
    address: 'https://polygonscan.com/address/',
    name: 'PolygonScan',
  },
  polygon_mainnet: {
    tx: 'https://polygonscan.com/tx/',
    address: 'https://polygonscan.com/address/',
    name: 'PolygonScan',
  },
  polygon_mumbai: {
    tx: 'https://mumbai.polygonscan.com/tx/',
    address: 'https://mumbai.polygonscan.com/address/',
    name: 'PolygonScan Mumbai',
  },
};

const DEFAULT_NETWORK = 'bsc_testnet';

function resolveNetwork(input?: string | null): keyof typeof EXPLORERS {
  if (!input) return DEFAULT_NETWORK;
  const normalized = input.toString().toLowerCase().replace(/\s+/g, '_');
  if (EXPLORERS[normalized]) return normalized;
  // Loose match — strip prefixes like "BNB Smart Chain Testnet"
  if (normalized.includes('bsc') && normalized.includes('test')) return 'bsc_testnet';
  if (normalized.includes('bsc')) return 'bsc';
  if (normalized.includes('sepolia')) return 'sepolia';
  if (normalized.includes('eth')) return 'ethereum';
  if (normalized.includes('mumbai')) return 'polygon_mumbai';
  if (normalized.includes('polygon') || normalized.includes('matic')) return 'polygon';
  return DEFAULT_NETWORK;
}

export function getExplorerTxUrl(hash: string | null | undefined, network?: string | null): string | null {
  if (!hash) return null;
  // 0x + 64 hex chars. We don't *require* this shape so demo data still
  // produces a link (it just won't resolve on the chain), but at least
  // strip obvious empties.
  const trimmed = hash.trim();
  if (!trimmed || trimmed === '0x' || /^0x0+$/.test(trimmed)) return null;
  const key = resolveNetwork(network);
  return `${EXPLORERS[key].tx}${trimmed}`;
}

export function getExplorerAddressUrl(address: string | null | undefined, network?: string | null): string | null {
  if (!address) return null;
  const trimmed = address.trim();
  if (!trimmed) return null;
  const key = resolveNetwork(network);
  return `${EXPLORERS[key].address}${trimmed}`;
}

export function getExplorerName(network?: string | null): string {
  return EXPLORERS[resolveNetwork(network)].name;
}

/**
 * Returns whether the hash looks "real" — i.e. it's not the all-zeros or
 * obviously-demo placeholder some seed data uses. Useful for hiding the
 * "view on explorer" button on rows that wouldn't resolve anyway.
 */
export function looksLikeRealHash(hash: string | null | undefined): boolean {
  if (!hash) return false;
  const trimmed = hash.trim();
  if (!/^0x[a-fA-F0-9]{40,}$/.test(trimmed)) return false;
  // Demo seed uses 0x + ascii padded with zeros — e.g.
  //   0x64656d6f30310000... ("demo01" + zeros). Spot that pattern.
  const hex = trimmed.slice(2).toLowerCase();
  const allZeroTail = /0{20,}$/.test(hex);
  // Allow it through if there's enough entropy in the first 16 hex chars
  // — real on-chain hashes don't have long zero tails.
  return !allZeroTail;
}
