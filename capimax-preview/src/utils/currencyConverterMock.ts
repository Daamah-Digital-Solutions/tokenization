/**
 * Mock Currency Converter - For Development and Demo Purposes
 * 
 * This is a simplified version of the currency converter that works without external APIs
 * for development and demonstration purposes.
 */

// Supported Currencies
export const FIAT_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'] as const;
export const CRYPTO_CURRENCIES = ['ETH', 'BTC', 'USDT', 'USDC', 'MATIC', 'BNB'] as const;
export const ALL_CURRENCIES = [...FIAT_CURRENCIES, ...CRYPTO_CURRENCIES] as const;

export type FiatCurrency = typeof FIAT_CURRENCIES[number];
export type CryptoCurrency = typeof CRYPTO_CURRENCIES[number];
export type Currency = typeof ALL_CURRENCIES[number];

// Exchange Rate Data
export interface ExchangeRate {
  from: Currency;
  to: Currency;
  rate: number;
  timestamp: Date;
  source: 'mock' | 'cache';
}

export interface CurrencyInfo {
  code: Currency;
  name: string;
  symbol: string;
  decimals: number;
  type: 'fiat' | 'crypto';
  icon?: string;
  network?: string;
}

// Currency Information
export const CURRENCY_INFO: Record<Currency, CurrencyInfo> = {
  // Fiat Currencies
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, type: 'fiat' },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, type: 'fiat' },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2, type: 'fiat' },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0, type: 'fiat' },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2, type: 'fiat' },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2, type: 'fiat' },
  
  // Crypto Currencies
  ETH: { 
    code: 'ETH', 
    name: 'Ethereum', 
    symbol: 'ETH', 
    decimals: 6, 
    type: 'crypto',
    network: 'ethereum'
  },
  BTC: { 
    code: 'BTC', 
    name: 'Bitcoin', 
    symbol: 'BTC', 
    decimals: 8, 
    type: 'crypto',
    network: 'bitcoin'
  },
  USDT: { 
    code: 'USDT', 
    name: 'Tether', 
    symbol: 'USDT', 
    decimals: 2, 
    type: 'crypto',
    network: 'ethereum'
  },
  USDC: { 
    code: 'USDC', 
    name: 'USD Coin', 
    symbol: 'USDC', 
    decimals: 2, 
    type: 'crypto',
    network: 'ethereum'
  },
  MATIC: { 
    code: 'MATIC', 
    name: 'Polygon', 
    symbol: 'MATIC', 
    decimals: 4, 
    type: 'crypto',
    network: 'polygon'
  },
  BNB: { 
    code: 'BNB', 
    name: 'Binance Coin', 
    symbol: 'BNB', 
    decimals: 4, 
    type: 'crypto',
    network: 'bsc'
  },
};

// Mock exchange rates - In production, these would come from APIs
const MOCK_RATES: Record<string, number> = {
  // Fiat to USD rates
  'EUR-USD': 1.08,
  'GBP-USD': 1.26,
  'JPY-USD': 0.0067,
  'CAD-USD': 0.74,
  'AUD-USD': 0.66,
  
  // Crypto to USD rates (mock prices)
  'ETH-USD': 2500,
  'BTC-USD': 42000,
  'USDT-USD': 1.00,
  'USDC-USD': 1.00,
  'MATIC-USD': 0.85,
  'BNB-USD': 320,
};

// Currency Converter Class
class MockCurrencyConverter {
  private rates: Map<string, ExchangeRate> = new Map();
  private lastUpdate: Date = new Date();

  constructor() {
    // Initialize with mock rates
    this.initializeMockRates();
  }

  // Get exchange rate between two currencies
  async getRate(from: Currency, to: Currency): Promise<number> {
    if (from === to) return 1;

    const rateKey = `${from}-${to}`;
    const reverseKey = `${to}-${from}`;

    // Check cached rate
    const cachedRate = this.rates.get(rateKey);
    if (cachedRate) {
      return cachedRate.rate;
    }

    // Check reverse rate
    const reverseRate = this.rates.get(reverseKey);
    if (reverseRate) {
      return 1 / reverseRate.rate;
    }

    // Calculate via USD if needed
    const fromUsdRate = await this.getUsdRate(from);
    const toUsdRate = await this.getUsdRate(to);

    const rate = fromUsdRate / toUsdRate;
    
    // Cache the calculated rate
    this.cacheRate(from, to, rate);
    
    return rate;
  }

  // Convert amount from one currency to another
  async convert(amount: number, from: Currency, to: Currency): Promise<number> {
    const rate = await this.getRate(from, to);
    return amount * rate;
  }

  // Format currency amount with proper decimals and symbol
  formatAmount(amount: number, currency: Currency): string {
    const info = CURRENCY_INFO[currency];
    const formatted = amount.toFixed(info.decimals);
    
    if (info.type === 'fiat') {
      return `${info.symbol}${formatted}`;
    } else {
      return `${formatted} ${info.symbol}`;
    }
  }

  // Get all current rates
  getAllRates(): Record<string, number> {
    const rates: Record<string, number> = {};
    
    this.rates.forEach((rate, key) => {
      rates[key] = rate.rate;
    });

    return rates;
  }

  // Private methods
  private initializeMockRates() {
    // Initialize all mock rates
    Object.entries(MOCK_RATES).forEach(([key, rate]) => {
      const [from, to] = key.split('-') as [Currency, Currency];
      this.cacheRate(from, to, rate);
    });

    // Add reverse rates
    Object.entries(MOCK_RATES).forEach(([key, rate]) => {
      const [from, to] = key.split('-') as [Currency, Currency];
      this.cacheRate(to, from, 1 / rate);
    });

    console.log('Mock currency rates initialized');
  }

  private async getUsdRate(currency: Currency): Promise<number> {
    if (currency === 'USD') return 1;

    const usdRateKey = `${currency}-USD`;
    const rate = this.rates.get(usdRateKey);
    
    if (rate) {
      return rate.rate;
    }

    // Default fallback rate
    console.warn(`No rate found for ${currency} to USD, using 1:1`);
    return 1;
  }

  private cacheRate(from: Currency, to: Currency, rate: number): void {
    const exchangeRate: ExchangeRate = {
      from,
      to,
      rate,
      timestamp: new Date(),
      source: 'mock',
    };

    this.rates.set(`${from}-${to}`, exchangeRate);
  }
}

// Export singleton instance
export const currencyConverter = new MockCurrencyConverter();

// Utility functions
export function formatCurrency(amount: number, currency: Currency): string {
  return currencyConverter.formatAmount(amount, currency);
}

export async function convertCurrency(amount: number, from: Currency, to: Currency): Promise<number> {
  return currencyConverter.convert(amount, from, to);
}

export function getCurrencyInfo(currency: Currency): CurrencyInfo {
  return CURRENCY_INFO[currency];
}

export function isCryptoCurrency(currency: string): currency is CryptoCurrency {
  return CRYPTO_CURRENCIES.includes(currency as CryptoCurrency);
}

export function isFiatCurrency(currency: string): currency is FiatCurrency {
  return FIAT_CURRENCIES.includes(currency as FiatCurrency);
}

export default currencyConverter;