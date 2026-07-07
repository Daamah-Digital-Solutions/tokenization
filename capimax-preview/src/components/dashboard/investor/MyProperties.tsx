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
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  tokens: number; // tokens currently owned (gross - sold) — "what I have"
  tokensReserved: number; // locked in my active sell listings
  tokensAvailable: number; // tokens - tokensReserved — what I can list right now
  totalTokens: number; // total tokens of the property
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
  // Track image-load failures so a 404 or wrong-type src falls back to
  // the Building2 placeholder instead of leaving the alt text exposed
  // over the banner gradient.
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(holding.image) && !imageFailed;
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
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-emerald-700/30 to-slate-900/40 dark:from-emerald-900/30 dark:to-slate-900/60">
        {showImage ? (
          <img
            src={holding.image}
            alt=""
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/40 dark:text-white/30">
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

        {/* Reservation breakdown — only show when the user actually has
            tokens locked in active sell listings. Keeps "available to
            sell" honest so they don't accidentally try to list more
            than they have free. */}
        {holding.tokensReserved > 0 && (
          <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <div>
                <div className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                  Locked in active listings
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {holding.tokensReserved.toLocaleString()} listed ·{' '}
                  {holding.tokensAvailable.toLocaleString()} available to sell
                </div>
              </div>
            </div>
          </div>
        )}

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
          {/* Sell button disables when every owned token is already
              reserved on the marketplace — listing more would either
              be silently accepted by the backend (it doesn't enforce
              this today) and double-sell the user's stake, or be
              flatly rejected at the trade level. Better to gate the
              entry point. */}
          <button
            type="button"
            onClick={() => onSell(holding)}
            disabled={holding.tokensAvailable <= 0}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 disabled:cursor-not-allowed"
            title={
              holding.tokensAvailable <= 0
                ? 'All of your tokens are already listed for sale'
                : 'Create a sell listing on the secondary market'
            }
          >
            <Tag className="w-4 h-4" />
            {holding.tokensAvailable <= 0 ? 'Fully Listed' : 'Sell on Market'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const MyProperties: React.FC = () => {
  const { navigate } = useRouter();
  const { state: authState } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [query, setQuery] = useState('');
  const [listingOpen, setListingOpen] = useState(false);
  // Which property the investor clicked "Sell" on, so the listing modal opens
  // pre-scoped to it instead of an empty property picker (client edit #2).
  const [sellPropertyId, setSellPropertyId] = useState<string | null>(null);

  // Single source of truth: InvestmentService.getUserInvestments now
  // does the full reservation accounting (purchased - sold via trades
  // - reserved in active sell listings) and returns per-property
  // tokens_owned, tokens_reserved, tokens_total_owned. We share that
  // exact computation with the Sell modal so both views agree on what
  // "owned" and "available" mean — there's no way for one to disagree
  // with the other.
  const userInvestmentsQuery = useQuery({
    queryKey: ['my-properties-bookkeeping'],
    queryFn: () => InvestmentService.getUserInvestments(),
    enabled: !!authState.user,
  });

  // Property valuations (for current-value display). The
  // getUserInvestments call already pulled property metadata for
  // title/city/image, but strips the valuation fields; refetching the
  // detail endpoint here gives us appreciation + rental_yield. React
  // Query dedupes parallel requests so this is cheap.
  const userInvestments = userInvestmentsQuery.data ?? [];
  const propertyIds = useMemo(
    () => userInvestments.map(u => u.property_id),
    [userInvestments],
  );

  const propertiesQuery = useQuery({
    queryKey: ['my-properties-valuations', propertyIds.sort().join(',')],
    queryFn: async () => {
      const entries = await Promise.all(
        propertyIds.map(async id => {
          try {
            const data = await apiClient.get(`/properties/${id}/`);
            return [id, data as Property] as const;
          } catch {
            return [id, null] as const;
          }
        }),
      );
      return new Map(entries);
    },
    enabled: propertyIds.length > 0,
  });

  // Compose final holdings. Token bookkeeping (gross, reserved,
  // available) comes from the reservation-aware service; valuations
  // and location strings come from the property-detail responses.
  const holdings: PropertyHolding[] = useMemo(() => {
    return userInvestments.map(h => {
      const property = propertiesQuery.data?.get(h.property_id) ?? null;
      const totalTokens = h.property.total_tokens || 0;
      const originalValue = Number((property as any)?.total_value) || 0;
      const currentValuation = Number(
        (property as any)?.current_valuation ??
          (property as any)?.analytics?.current_valuation ??
          0,
      );
      const share =
        originalValue > 0 ? h.investment_amount / originalValue : 0;
      // Current market value of my holding = current token price × tokens I
      // hold. This is the honest "what it's worth now" and moves whenever the
      // platform updates the property's token price. Previously the code only
      // read `current_valuation`, which the property-detail serializer never
      // returns, so it was always 0 and Current Value silently collapsed to
      // the purchase amount (Current == Old on every card) — client edit #2.
      const currentTokenPrice =
        Number((property as any)?.token_price) ||
        Number((property as any)?.current_token_price) ||
        Number((h.property as any)?.token_price) ||
        0;
      const marketValue =
        currentTokenPrice > 0
          ? currentTokenPrice * (h.tokens_total_owned || 0)
          : 0;
      const currentValue =
        currentValuation > 0
          ? currentValuation * share
          : marketValue > 0
            ? marketValue
            : h.investment_amount;

      const location = property
        ? `${(property as any).city || ''}${(property as any).state ? ', ' + (property as any).state : ''}${
            (property as any).country ? ', ' + (property as any).country : ''
          }`.replace(/^, /, '')
        : `${h.property.city || ''}${h.property.country ? ', ' + h.property.country : ''}`.replace(/^, /, '') || '—';

      const change =
        h.investment_amount > 0
          ? ((currentValue - h.investment_amount) / h.investment_amount) * 100
          : 0;

      // Media URLs from the backend may be relative (`/media/…`) when
      // the property image was uploaded via Django storage. Prefix
      // with the API host so the <img src> works from the SPA.
      const rawImage = h.property.image_url;
      const image = rawImage
        ? rawImage.startsWith('http')
          ? rawImage
          : `https://capimaxrt.tech${rawImage}`
        : undefined;

      return {
        id: h.property_id,
        name: h.property.title,
        location,
        purchaseValue: h.investment_amount,
        currentValue,
        tokens: h.tokens_total_owned, // gross — "what I have"
        tokensReserved: h.tokens_reserved,
        tokensAvailable: h.tokens_owned, // gross − reserved
        totalTokens,
        yield: Number((property as any)?.rental_yield) || 0,
        change,
        image,
      };
    });
  }, [userInvestments, propertiesQuery.data]);

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

  const handleSell = (h: PropertyHolding) => {
    // Pre-scope the Sell modal to the property the investor actually clicked
    // so they don't have to re-pick it from a list (client edit #2).
    setSellPropertyId(h.id);
    setListingOpen(true);
  };

  const loading =
    userInvestmentsQuery.isLoading ||
    (propertyIds.length > 0 && propertiesQuery.isLoading);
  const error =
    (userInvestmentsQuery.error as Error | undefined)?.message ||
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
        preselectPropertyId={sellPropertyId ?? undefined}
        onClose={() => {
          setListingOpen(false);
          setSellPropertyId(null);
        }}
        onSuccess={() => {
          setListingOpen(false);
          setSellPropertyId(null);
          // Force a refetch of both the bookkeeping (which now has
          // one more reservation) and the modal's own user-investments
          // cache, so the next card render shows the updated
          // "available" count and the "Listed in active listings"
          // banner appears immediately. Without this the user would
          // think the listing failed because My Properties still
          // shows the pre-listing numbers until they refresh.
          queryClient.invalidateQueries({ queryKey: ['my-properties-bookkeeping'] });
          queryClient.invalidateQueries({ queryKey: ['user-investments'] });
        }}
      />
    </div>
  );
};

export default MyProperties;
