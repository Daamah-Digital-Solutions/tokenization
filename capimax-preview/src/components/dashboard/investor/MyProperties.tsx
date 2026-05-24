/**
 * Investor → "My Properties" view.
 *
 * Dedicated dashboard section that lists every property the logged-in
 * investor holds tokens in, with the four numbers that matter for an
 * owner (tokens, purchase, current value, change), plus direct actions
 * to view the property detail or list the tokens on the secondary
 * market.
 *
 * Self-contained: fetches its own investments + per-property valuations,
 * so it can be rendered from either InvestorControlPanel or
 * InvestorDashboard without prop-drilling holdings down through three
 * layers of grandparent components.
 *
 * Data flow:
 *   InvestmentService.getInvestments(1, 100)
 *     → for each completed investment, fetch /properties/{id}/
 *     → group by property_id (one card per property, summed tokens)
 *     → derive current value from property.current_valuation when
 *       available; otherwise fall back to the purchase amount (so a
 *       brand-new investment doesn't show a fictitious +X% bump).
 */

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  MapPin,
  Coins,
  TrendingUp,
  TrendingDown,
  Eye,
  Tag,
  ShieldCheck,
  Search,
  Plus,
} from 'lucide-react';
import { useRouter } from '../../../utils/router';
import { useAuth } from '../../../contexts/AuthContext';
import { CreateListingModal } from '../../marketplace/CreateListingModal';
import { InvestmentService } from '../../../services/investment/InvestmentService';
import { apiClient } from '../../../services/api/ApiClient';
import type { Property } from '../../../services/api/types';

interface PropertyHolding {
  id: string;
  name: string;
  location: string;
  purchaseValue: number;
  currentValue: number;
  tokens: number;
  totalTokens: number;
  yield: number;
  change: number;
  image?: string;
}

type FilterMode = 'all' | 'profitable' | 'underperforming';

const formatCurrency = (n: number): string =>
  `$${Math.round(n).toLocaleString()}`;

const HoldingCard: React.FC<{
  holding: PropertyHolding;
  onView: (h: PropertyHolding) => void;
  onSell: (h: PropertyHolding) => void;
}> = ({ holding, onView, onSell }) => {
  const isProfit = holding.change >= 0;
  const Trend = isProfit ? TrendingUp : TrendingDown;
  const trendClass = isProfit
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-600 dark:text-red-400';
  const trendBg = isProfit
    ? 'bg-emerald-50 dark:bg-emerald-900/20'
    : 'bg-red-50 dark:bg-red-900/20';

  const ownershipPct =
    holding.totalTokens > 0
      ? (holding.tokens / holding.totalTokens) * 100
      : 0;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden flex flex-col">
      <div className="relative h-44 overflow-hidden bg-slate-100 dark:bg-slate-900">
        {holding.image ? (
          <img
            src={holding.image}
            alt={holding.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
            <Building2 className="w-16 h-16" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-white/90 dark:bg-slate-900/90 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200">
          <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          Owned
        </div>
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <h3 className="text-lg font-bold leading-tight line-clamp-1">{holding.name}</h3>
          <div className="flex items-center gap-1 text-xs text-white/90 mt-0.5">
            <MapPin className="w-3 h-3" />
            <span className="line-clamp-1">{holding.location}</span>
          </div>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4 flex-1">
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Coins className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Tokens Owned</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                {holding.tokens.toLocaleString()}
                {holding.totalTokens > 0 && (
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">
                    / {holding.totalTokens.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          {holding.totalTokens > 0 && (
            <div className="text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400">Share</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                {ownershipPct < 0.01 ? '<0.01' : ownershipPct.toFixed(2)}%
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Purchase Value</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {formatCurrency(holding.purchaseValue)}
            </div>
          </div>
          <div className={`p-3 ${trendBg} rounded-xl`}>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Current Value</div>
            <div className={`text-lg font-bold ${trendClass}`}>
              {formatCurrency(holding.currentValue)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <Trend className={`w-4 h-4 ${trendClass}`} />
            <span className={`font-semibold ${trendClass}`}>
              {isProfit ? '+' : ''}
              {holding.change.toFixed(2)}%
            </span>
            <span className="text-slate-500 dark:text-slate-400">since purchase</span>
          </div>
          {holding.yield > 0 && (
            <div className="text-slate-500 dark:text-slate-400">
              Yield{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {holding.yield.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
          <button
            type="button"
            onClick={() => onView(holding)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <Eye className="w-4 h-4" />
            View Details
          </button>
          <button
            type="button"
            onClick={() => onSell(holding)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
          >
            <Tag className="w-4 h-4" />
            Sell on Market
          </button>
        </div>
      </div>
    </div>
  );
};

export const MyProperties: React.FC = () => {
  const { navigate } = useRouter();
  const { state: authState } = useAuth();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [query, setQuery] = useState('');
  const [listingOpen, setListingOpen] = useState(false);

  // Step 1: investments for this investor.
  const investmentsQuery = useQuery({
    queryKey: ['my-properties-investments'],
    queryFn: () => InvestmentService.getInvestments(1, 100),
    enabled: !!authState.user,
  });

  // Step 2: derive the unique completed-investment property IDs.
  const completedInvestments = useMemo(() => {
    const list = investmentsQuery.data?.investments ?? [];
    return list.filter(inv => inv.status === 'completed');
  }, [investmentsQuery.data]);

  // Step 3: fetch each property's detail page in parallel. Cached by id
  // through the queryKey so reopening the tab doesn't re-fetch what's
  // already in memory.
  const propertyIds = useMemo(
    () => Array.from(new Set(completedInvestments.map(i => i.property_id))),
    [completedInvestments],
  );

  const propertiesQuery = useQuery({
    queryKey: ['my-properties-detail-batch', propertyIds.sort().join(',')],
    queryFn: async () => {
      // Best-effort per-property fetch — if one property 404s, we still
      // show every other holding rather than blanking the whole tab.
      const results = await Promise.all(
        propertyIds.map(async id => {
          try {
            const data = await apiClient.get(`/properties/${id}/`);
            return [id, data as Property] as const;
          } catch {
            return [id, null] as const;
          }
        }),
      );
      return new Map(results);
    },
    enabled: propertyIds.length > 0,
  });

  // Step 4: collapse investments → one holding per property, summing
  // tokens and purchase amount across multiple buys.
  const holdings: PropertyHolding[] = useMemo(() => {
    if (!propertiesQuery.data && completedInvestments.length > 0) return [];
    const byProperty = new Map<string, PropertyHolding>();

    for (const inv of completedInvestments) {
      const property = propertiesQuery.data?.get(inv.property_id) ?? null;
      const name = property?.title || 'Untitled property';
      const location = property
        ? `${property.city || ''}${property.state ? ', ' + property.state : ''}${
            property.country ? ', ' + property.country : ''
          }`.replace(/^, /, '')
        : '—';
      const image = property?.images?.[0];
      const totalTokens = Number(property?.total_tokens) || 0;
      const originalValue = Number(property?.total_value) || 0;

      // Per-investment current value: scale the property's latest
      // valuation by this investor's ownership share. Falls back to
      // the purchase amount when the backend hasn't supplied a fresh
      // valuation yet — that way we never invent a profit/loss number.
      const currentValuation = Number(
        (property as any)?.current_valuation ??
          (property as any)?.analytics?.current_valuation ??
          0,
      );
      const share =
        originalValue > 0 ? inv.investment_amount / originalValue : 0;
      const currentValuePer =
        currentValuation > 0 ? currentValuation * share : inv.investment_amount;

      const existing = byProperty.get(inv.property_id);
      if (existing) {
        existing.tokens += inv.token_amount;
        existing.purchaseValue += inv.investment_amount;
        existing.currentValue += currentValuePer;
      } else {
        byProperty.set(inv.property_id, {
          id: inv.property_id,
          name,
          location,
          purchaseValue: inv.investment_amount,
          currentValue: currentValuePer,
          tokens: inv.token_amount,
          totalTokens,
          yield: Number((property as any)?.rental_yield) || 0,
          change: 0, // computed below once we have final sums
          image,
        });
      }
    }

    return Array.from(byProperty.values()).map(h => ({
      ...h,
      change:
        h.purchaseValue > 0
          ? ((h.currentValue - h.purchaseValue) / h.purchaseValue) * 100
          : 0,
    }));
  }, [completedInvestments, propertiesQuery.data]);

  const filtered = useMemo(() => {
    let list = holdings;
    if (filter === 'profitable') list = list.filter(h => h.change >= 0);
    if (filter === 'underperforming') list = list.filter(h => h.change < 0);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        h =>
          h.name.toLowerCase().includes(q) ||
          h.location.toLowerCase().includes(q),
      );
    }
    return list;
  }, [holdings, filter, query]);

  const totals = useMemo(() => {
    const invested = holdings.reduce((s, h) => s + h.purchaseValue, 0);
    const current = holdings.reduce((s, h) => s + h.currentValue, 0);
    const change = invested > 0 ? ((current - invested) / invested) * 100 : 0;
    return { invested, current, change, count: holdings.length };
  }, [holdings]);

  const handleView = (h: PropertyHolding) => {
    navigate('property-detail' as any, { id: h.id });
  };

  const handleSell = (_h: PropertyHolding) => {
    setListingOpen(true);
  };

  const loading =
    investmentsQuery.isLoading ||
    (propertyIds.length > 0 && propertiesQuery.isLoading);
  const error =
    (investmentsQuery.error as Error | undefined)?.message ||
    (propertiesQuery.error as Error | undefined)?.message ||
    null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
          <div className="h-7 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-slate-100 dark:bg-slate-700 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden animate-pulse"
            >
              <div className="h-44 bg-slate-200 dark:bg-slate-700" />
              <div className="p-5 space-y-4">
                <div className="h-12 bg-slate-100 dark:bg-slate-700 rounded-xl" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl" />
                  <div className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl" />
                </div>
                <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-red-700 dark:text-red-300">
        <p className="font-semibold mb-1">Couldn't load your properties</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-10 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          You don't own any properties yet
        </h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
          Browse our tokenized listings and become a co-owner in a few
          minutes. Every property you buy will appear here with live
          valuation, your share, and a one-tap resale option.
        </p>
        <button
          type="button"
          onClick={() => navigate('properties' as any)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
        >
          <Plus className="w-5 h-5" />
          Browse Properties
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-50 via-white to-white dark:from-emerald-900/10 dark:via-slate-800 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              My Properties
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {totals.count} {totals.count === 1 ? 'property' : 'properties'}{' '}
              owned across the platform
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('properties' as any)}
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Buy More
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-xs text-slate-500 dark:text-slate-400">Properties</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {totals.count}
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-xs text-slate-500 dark:text-slate-400">Total Purchased</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {formatCurrency(totals.invested)}
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-xs text-slate-500 dark:text-slate-400">Current Value</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {formatCurrency(totals.current)}
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-xs text-slate-500 dark:text-slate-400">Overall Change</div>
            <div
              className={`text-xl font-bold mt-1 ${
                totals.change >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {totals.change >= 0 ? '+' : ''}
              {totals.change.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or location…"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { key: 'all', label: `All (${holdings.length})` },
              { key: 'profitable', label: 'Profitable' },
              { key: 'underperforming', label: 'Underperforming' },
            ] as { key: FilterMode; label: string }[]
          ).map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                filter === f.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-10 text-center">
          <p className="text-slate-500 dark:text-slate-400">
            No properties match your filters. Try clearing the search or
            switching to "All".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(h => (
            <HoldingCard
              key={h.id}
              holding={h}
              onView={handleView}
              onSell={handleSell}
            />
          ))}
        </div>
      )}

      <CreateListingModal
        isOpen={listingOpen}
        onClose={() => setListingOpen(false)}
        onSuccess={() => setListingOpen(false)}
      />
    </div>
  );
};

export default MyProperties;
