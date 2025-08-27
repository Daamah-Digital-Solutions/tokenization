import axios from 'axios';

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
  source: 'coingecko' | 'exchange-rates-api' | 'cache';
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

// Currency Converter Class
class CurrencyConverter {
  private rates: Map<string, ExchangeRate> = new Map();
  private lastUpdate: Date | null = null;
  private updateInterval: number = 5 * 60 * 1000; // 5 minutes
  private isUpdating: boolean = false;

  constructor() {
    // Load cached rates from localStorage on initialization
    this.loadCachedRates();
    
    // Start automatic rate updates
    this.startAutoUpdate();
  }

  // Get exchange rate between two currencies
  async getRate(from: Currency, to: Currency): Promise<number> {
    if (from === to) return 1;

    const rateKey = `${from}-${to}`;
    const reverseKey = `${to}-${from}`;

    // Check if we have cached rate
    const cachedRate = this.rates.get(rateKey);
    const cachedReverseRate = this.rates.get(reverseKey);

    if (cachedRate && this.isRateValid(cachedRate)) {
      return cachedRate.rate;
    }

    if (cachedReverseRate && this.isRateValid(cachedReverseRate)) {
      return 1 / cachedReverseRate.rate;
    }

    // Fetch new rate
    try {
      const rate = await this.fetchRate(from, to);
      return rate;
    } catch (error) {
      console.warn(`Failed to fetch rate for ${from}-${to}:`, error);
      
      // Return stale cached rate if available
      if (cachedRate) return cachedRate.rate;
      if (cachedReverseRate) return 1 / cachedReverseRate.rate;
      
      throw new Error(`Unable to get exchange rate for ${from} to ${to}`);
    }
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
      if (this.isRateValid(rate)) {
        rates[key] = rate.rate;
      }
    });

    return rates;
  }

  // Update all exchange rates
  async updateRates(): Promise<void> {
    if (this.isUpdating) return;

    this.isUpdating = true;
    console.log('Updating exchange rates...');

    try {
      // Update crypto rates
      await this.updateCryptoRates();
      
      // Update fiat rates
      await this.updateFiatRates();
      
      this.lastUpdate = new Date();
      this.saveCachedRates();
      
      console.log('Exchange rates updated successfully');
    } catch (error) {
      console.error('Failed to update exchange rates:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  // Private Methods

  private async fetchRate(from: Currency, to: Currency): Promise<number> {
    const fromInfo = CURRENCY_INFO[from];
    const toInfo = CURRENCY_INFO[to];

    // Crypto to Crypto or Crypto to Fiat
    if (fromInfo.type === 'crypto' || toInfo.type === 'crypto') {
      return await this.fetchCryptoRate(from, to);
    }

    // Fiat to Fiat
    return await this.fetchFiatRate(from, to);
  }

  private async fetchCryptoRate(from: Currency, to: Currency): Promise<number> {
    try {
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        params: {
          ids: this.getCoinGeckoId(from),
          vs_currencies: to.toLowerCase(),
          include_last_updated_at: true,
        },
      });

      const coinId = this.getCoinGeckoId(from);
      const rate = response.data[coinId]?.[to.toLowerCase()];

      if (!rate) {
        throw new Error(`Rate not found for ${from} to ${to}`);
      }

      // Cache the rate
      this.cacheRate(from, to, rate, 'coingecko');

      return rate;
    } catch (error) {
      console.error(`Failed to fetch crypto rate ${from}-${to}:`, error);
      throw error;
    }
  }

  private async fetchFiatRate(from: Currency, to: Currency): Promise<number> {
    try {
      const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`);
      const rate = response.data.rates[to];

      if (!rate) {
        throw new Error(`Rate not found for ${from} to ${to}`);
      }

      // Cache the rate
      this.cacheRate(from, to, rate, 'exchange-rates-api');

      return rate;
    } catch (error) {
      console.error(`Failed to fetch fiat rate ${from}-${to}:`, error);
      throw error;
    }
  }

  private async updateCryptoRates(): Promise<void> {
    const cryptoCurrencies = CRYPTO_CURRENCIES.join(',');
    const fiatCurrencies = FIAT_CURRENCIES.join(',').toLowerCase();

    try {
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        params: {
          ids: cryptoCurrencies.split(',').map(this.getCoinGeckoId).join(','),
          vs_currencies: fiatCurrencies,
          include_last_updated_at: true,
        },
      });

      // Process and cache all rates
      Object.entries(response.data).forEach(([coinId, rates]) => {
        const crypto = this.getCurrencyFromCoinGeckoId(coinId);
        if (crypto) {
          Object.entries(rates as Record<string, number>).forEach(([fiat, rate]) => {
            const fiatCurrency = fiat.toUpperCase() as FiatCurrency;
            if (typeof rate === 'number') {
              this.cacheRate(crypto, fiatCurrency, rate, 'coingecko');
            }
          });
        }
      });
    } catch (error) {
      console.error('Failed to update crypto rates:', error);
    }
  }

  private async updateFiatRates(): Promise<void> {
    try {
      const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
      const rates = response.data.rates;

      // Cache USD to other fiat rates
      Object.entries(rates).forEach(([currency, rate]) => {
        const fiatCurrency = currency as FiatCurrency;
        if (FIAT_CURRENCIES.includes(fiatCurrency) && typeof rate === 'number') {
          this.cacheRate('USD', fiatCurrency, rate, 'exchange-rates-api');
        }
      });
    } catch (error) {
      console.error('Failed to update fiat rates:', error);
    }
  }

  private getCoinGeckoId(currency: Currency): string {
    const coinGeckoIds: Record<string, string> = {
      BTC: 'bitcoin',
      ETH: 'ethereum',
      USDT: 'tether',
      USDC: 'usd-coin',
      MATIC: 'matic-network',
      BNB: 'binancecoin',
    };

    return coinGeckoIds[currency] || currency.toLowerCase();
  }

  private getCurrencyFromCoinGeckoId(coinId: string): CryptoCurrency | null {
    const idToCurrency: Record<string, CryptoCurrency> = {
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'tether': 'USDT',
      'usd-coin': 'USDC',
      'matic-network': 'MATIC',
      'binancecoin': 'BNB',
    };

    return idToCurrency[coinId] || null;
  }

  private cacheRate(from: Currency, to: Currency, rate: number, source: ExchangeRate['source']): void {
    const exchangeRate: ExchangeRate = {
      from,
      to,
      rate,
      timestamp: new Date(),
      source,
    };

    this.rates.set(`${from}-${to}`, exchangeRate);
  }

  private isRateValid(rate: ExchangeRate): boolean {
    const now = Date.now();
    const rateTime = rate.timestamp.getTime();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    return (now - rateTime) < maxAge;
  }

  private startAutoUpdate(): void {
    // Update rates immediately
    this.updateRates();

    // Set up interval for updates
    setInterval(() => {
      this.updateRates();
    }, this.updateInterval);
  }

  private loadCachedRates(): void {
    try {
      const cached = localStorage.getItem('exchange_rates');
      if (cached) {
        const data = JSON.parse(cached);
        Object.entries(data).forEach(([key, rateData]: [string, any]) => {
          const rate: ExchangeRate = {
            ...rateData,
            timestamp: new Date(rateData.timestamp),
          };
          this.rates.set(key, rate);
        });
      }
    } catch (error) {
      console.warn('Failed to load cached rates:', error);
    }
  }

  private saveCachedRates(): void {
    try {
      const data: Record<string, any> = {};
      this.rates.forEach((rate, key) => {
        data[key] = rate;
      });
      localStorage.setItem('exchange_rates', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save cached rates:', error);
    }
  }
}

// Export singleton instance
export const currencyConverter = new CurrencyConverter();

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