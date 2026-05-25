import { apiClient } from '../api/ApiClient';
import type { 
  Investment, 
  InvestmentCreateData,
  InvestmentStatus,
  PaymentMethod,
  Property 
} from '../api/types';

export interface InvestmentCalculation {
  property_id: string;
  token_amount: number;
  investment_amount: number;
  token_price: number;
  platform_fee: number;
  processing_fee: number;
  total_cost: number;
  ownership_percentage: number;
  projected_annual_return: number;
  projected_monthly_dividend: number;
}

export interface InvestmentSimulation {
  scenarios: Array<{
    name: string;
    roi_percentage: number;
    timeline_months: number;
    total_return: number;
    monthly_income: number;
    risk_level: 'low' | 'medium' | 'high';
  }>;
  property_metrics: {
    rental_yield: number;
    appreciation_rate: number;
    occupancy_rate: number;
    market_volatility: number;
  };
}

export interface PortfolioSummary {
  total_invested: number;
  current_value: number;
  total_return: number;
  return_percentage: number;
  monthly_dividends: number;
  properties_count: number;
  active_investments: number;
  pending_investments: number;
}

export interface InvestmentTransaction {
  id: string;
  investment_id: string;
  type: 'purchase' | 'dividend' | 'sale' | 'fee';
  amount: number;
  currency: string;
  status: string;
  transaction_hash?: string;
  created_at: Date;
  description: string;
}

export class InvestmentService {
  /**
   * Calculate investment details
   */
  static async calculateInvestment(
    propertyId: string,
    tokenAmount: number
  ): Promise<InvestmentCalculation> {
    try {
      return await apiClient.post<InvestmentCalculation>('/investments/calculate/', {
        property_id: propertyId,
        token_amount: tokenAmount
      });
    } catch (error) {
      console.error('Failed to calculate investment:', error);
      throw error;
    }
  }

  /**
   * Create new investment (returns pending investment requiring payment)
   */
  static async createInvestment(data: {
    property_id: string;
    token_amount: number;
    investment_amount: number;
    payment_method: string;
  }): Promise<any> {
    try {
      // Send snake_case fields matching backend InvestmentCreateSerializer
      return await apiClient.post<any>('/investments/', {
        property_id: data.property_id,
        token_amount: data.token_amount,
        investment_amount: data.investment_amount,
        payment_method: { type: data.payment_method, currency: 'USD' }
      });
    } catch (error) {
      console.error('Failed to create investment:', error);
      throw error;
    }
  }

  /**
   * Process wallet-based investment (creates + processes in one step)
   */
  static async walletInvest(data: {
    property_id: string;
    token_amount: number;
    investment_amount: number;
  }): Promise<any> {
    try {
      return await apiClient.post<any>('/investments/wallet_invest/', {
        property_id: data.property_id,
        token_amount: data.token_amount,
        investment_amount: data.investment_amount
      });
    } catch (error) {
      console.error('Failed to process wallet investment:', error);
      throw error;
    }
  }

  /**
   * Create Nova Sukuk investment (PDF upload + admin review)
   */
  static async novaSukukInvest(data: {
    property_id: string;
    token_amount: number;
    investment_amount: number;
    sukuk_pdf: File;
    sukuk_reference_number: string;
  }): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('property_id', data.property_id);
      formData.append('token_amount', data.token_amount.toString());
      formData.append('investment_amount', data.investment_amount.toString());
      formData.append('sukuk_pdf', data.sukuk_pdf);
      formData.append('sukuk_reference_number', data.sukuk_reference_number);

      return await apiClient.post<any>('/investments/nova_sukuk_invest/', formData);
    } catch (error) {
      console.error('Failed to create Nova Sukuk investment:', error);
      throw error;
    }
  }

  /**
   * Create Bank Transfer investment (proof upload + admin review)
   *
   * Mirrors `novaSukukInvest`. The investor uploads a screenshot or PDF
   * receipt of the outgoing wire. An admin manually approves on receipt
   * of funds, which triggers `mark_payment_confirmed` -> mint.
   */
  static async bankTransferInvest(data: {
    property_id: string;
    token_amount: number;
    investment_amount: number;
    proof_of_transfer: File;
    account_holder_name: string;
    bank_name: string;
    account_number: string;
    routing_number?: string;
    swift_code?: string;
    transfer_reference_note?: string;
  }): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('property_id', data.property_id);
      formData.append('token_amount', data.token_amount.toString());
      formData.append('investment_amount', data.investment_amount.toString());
      formData.append('proof_of_transfer', data.proof_of_transfer);
      formData.append('account_holder_name', data.account_holder_name);
      formData.append('bank_name', data.bank_name);
      formData.append('account_number', data.account_number);
      if (data.routing_number) formData.append('routing_number', data.routing_number);
      if (data.swift_code) formData.append('swift_code', data.swift_code);
      if (data.transfer_reference_note) {
        formData.append('transfer_reference_note', data.transfer_reference_note);
      }
      return await apiClient.post<any>('/investments/bank_transfer_invest/', formData);
    } catch (error) {
      console.error('Failed to create bank transfer investment:', error);
      throw error;
    }
  }

  /**
   * Create Pronova crypto investment (5% discount)
   */
  static async pronovaInvest(data: {
    property_id: string;
    token_amount: number;
    investment_amount: number;
  }): Promise<any> {
    try {
      return await apiClient.post<any>('/investments/pronova_invest/', {
        property_id: data.property_id,
        token_amount: data.token_amount,
        investment_amount: data.investment_amount
      });
    } catch (error) {
      console.error('Failed to create Pronova investment:', error);
      throw error;
    }
  }

  /**
   * Confirm Pronova payment with transaction hash
   */
  static async confirmPronovaPayment(investmentId: string, data: {
    tx_hash: string;
    sender_wallet_address: string;
  }): Promise<any> {
    try {
      return await apiClient.post<any>(`/investments/${investmentId}/confirm_pronova/`, data);
    } catch (error) {
      console.error('Failed to confirm Pronova payment:', error);
      throw error;
    }
  }

  /**
   * Get user's investments
   */
  static async getInvestments(page = 1, limit = 20, status?: InvestmentStatus): Promise<{
    investments: Investment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const params: any = { page, limit };
      if (status) params.status = status;

      return await apiClient.get('/investments/', params);
    } catch (error) {
      console.error('Failed to get investments:', error);
      throw error;
    }
  }

  /**
   * Get the current user's holdings — with proper reservation accounting.
   *
   * "How many tokens of property X does this investor actually own,
   * and how many can they list right now?" is a 3-source question:
   *
   *   gross_owned = Σ completed primary investments
   *               + Σ secondary trades I bought
   *               − Σ secondary trades I sold (completed OR in_escrow)
   *   reserved    = Σ active sell listings.tokens_remaining
   *   available   = gross_owned − reserved
   *
   * Without this, an investor could create a sell listing for 15
   * tokens, then immediately create another for the same 15 tokens —
   * the backend doesn't enforce the reservation at the listing layer
   * (we verified: `POST /marketplace/listings/` returns 201 without
   * any holdings check), so they'd be "selling" 30 tokens out of 15.
   * Frontend has to be the one drawing the line here.
   *
   * The returned `tokens_owned` represents AVAILABLE tokens (so the
   * CreateListingModal's `tokens_offered > tokens_owned` validation
   * does the right thing). `tokens_reserved` and `tokens_total_owned`
   * are exposed separately so the UI can surface the breakdown
   * ("15 owned, 5 listed, 10 available").
   */
  static async getUserInvestments(): Promise<
    Array<{
      id: string;
      property_id: string;
      tokens_owned: number; // AVAILABLE (gross - reserved). Used by Sell modal validation.
      tokens_total_owned: number; // Gross, ignoring reservations.
      tokens_reserved: number; // Locked in active sell listings.
      tokens_sold: number; // Already moved out via secondary trades.
      investment_amount: number;
      property: {
        id: string;
        title: string;
        city: string;
        country?: string;
        image_url?: string;
        total_tokens?: number;
        current_token_price?: string;
        token_price?: number;
      };
    }>
  > {
    try {
      // Get the current user ID so we can split transactions into
      // "I'm the seller" vs "I'm the buyer".
      const me: any = await apiClient.get('/auth/profile/').catch(() => null);
      const myUserId: string | undefined = me?.id;

      // Three reads in parallel — investments, my active sell
      // listings, my trade history.
      const [
        investmentsResp,
        listingsResp,
        transactionsResp,
      ] = await Promise.all([
        this.getInvestments(1, 100).catch(() => ({ investments: [] as any[] })),
        apiClient
          .get('/marketplace/listings/', {
            seller: myUserId,
            status: 'active',
            listing_type: 'sell',
            limit: 200,
          })
          .catch(() => ({ results: [] as any[] })),
        apiClient
          .get('/marketplace/transactions/', { limit: 200 })
          .catch(() => ({ results: [] as any[] })),
      ]);

      const completed = (investmentsResp.investments || []).filter(
        inv => inv.status === 'completed',
      );

      const activeListings: any[] =
        (listingsResp as any).results ||
        (listingsResp as any).data?.results ||
        [];

      const allTransactions: any[] =
        (transactionsResp as any).results ||
        (transactionsResp as any).data?.results ||
        [];

      // Property-id de-dup across all three sources — every property
      // that ever touched this user's holdings, even if they're sold
      // out now.
      const propertyIds = Array.from(
        new Set([
          ...completed.map(i => i.property_id),
          ...activeListings.map(l => {
            const pl = (l as any).property_listing;
            return typeof pl === 'string' ? pl : pl?.id;
          }),
          ...allTransactions
            .map(t =>
              typeof (t as any).property === 'string'
                ? (t as any).property
                : (t as any).property?.id || (t as any).property_id,
            )
            .filter(Boolean),
        ].filter(Boolean) as string[]),
      );

      const propertyEntries = await Promise.all(
        propertyIds.map(async id => {
          try {
            const data = await apiClient.get(`/properties/${id}/`);
            return [id, data] as const;
          } catch {
            return [id, null] as const;
          }
        }),
      );
      const propertyMap = new Map<string, any>(propertyEntries);

      const extractImageUrl = (images: unknown): string | undefined => {
        if (!Array.isArray(images) || images.length === 0) return undefined;
        const first = images[0];
        if (typeof first === 'string') return first;
        if (first && typeof first === 'object') {
          return (
            (first as any).image_url ||
            (first as any).image ||
            (first as any).url ||
            undefined
          );
        }
        return undefined;
      };

      const getPropertyId = (val: any): string | undefined => {
        if (!val) return undefined;
        if (typeof val === 'string') return val;
        if (typeof val === 'object') return val.id;
        return undefined;
      };

      // Build per-property accumulator. Initialize zero for every
      // property in the union — we'll add positive + negative
      // contributions in three passes.
      type Accum = {
        purchased: number; // primary completed investments (tokens)
        purchased_amount: number;
        bought_secondary: number; // trades where I'm buyer (completed)
        sold_secondary: number; // trades where I'm seller (completed + in_escrow)
        reserved: number; // tokens_remaining on my active sell listings
      };
      const acc = new Map<string, Accum>();
      const ensure = (id: string): Accum => {
        let a = acc.get(id);
        if (!a) {
          a = {
            purchased: 0,
            purchased_amount: 0,
            bought_secondary: 0,
            sold_secondary: 0,
            reserved: 0,
          };
          acc.set(id, a);
        }
        return a;
      };

      // Pass 1: completed primary investments add to purchased.
      for (const inv of completed) {
        const a = ensure(inv.property_id);
        a.purchased += Number(inv.token_amount) || 0;
        a.purchased_amount += Number(inv.investment_amount) || 0;
      }

      // Pass 2: active sell listings reserve tokens. Use
      // `tokens_remaining` if the API exposed it (= unsold portion of
      // the listing), otherwise fall back to `tokens_offered`.
      for (const l of activeListings) {
        const propId = getPropertyId((l as any).property_listing);
        if (!propId) continue;
        const remaining =
          (l as any).tokens_remaining != null
            ? Number((l as any).tokens_remaining)
            : (l as any).tokens_offered != null
              ? Number((l as any).tokens_offered) -
                (Number((l as any).tokens_filled) || 0)
              : 0;
        ensure(propId).reserved += Number(remaining) || 0;
      }

      // Pass 3: trade history — distinguish seller vs buyer by user
      // id, and treat `in_escrow` as already committed (the tokens
      // are locked on-chain even if the cash hasn't settled). Only
      // completed/in_escrow count; pending/cancelled don't.
      for (const t of allTransactions) {
        const propId = getPropertyId((t as any).property) || (t as any).property_id;
        if (!propId) continue;
        const status = (t as any).status;
        if (status !== 'completed' && status !== 'in_escrow') continue;
        const tokens = Number((t as any).tokens_traded) || 0;
        const sellerId =
          typeof (t as any).seller === 'string'
            ? (t as any).seller
            : (t as any).seller?.id;
        const buyerId =
          typeof (t as any).buyer === 'string'
            ? (t as any).buyer
            : (t as any).buyer?.id;
        // Fallback to name-matching when IDs aren't exposed by the
        // serializer (the transactions list endpoint returns
        // `seller_name` / `buyer_name` strings rather than nested
        // user objects).
        const myName = me?.full_name;
        const isSeller =
          (myUserId && sellerId === myUserId) ||
          (!sellerId && myName && (t as any).seller_name === myName);
        const isBuyer =
          (myUserId && buyerId === myUserId) ||
          (!buyerId && myName && (t as any).buyer_name === myName);

        if (isSeller) ensure(propId).sold_secondary += tokens;
        if (isBuyer) ensure(propId).bought_secondary += tokens;
      }

      const result = [];
      for (const [propertyId, a] of acc.entries()) {
        const property = propertyMap.get(propertyId);
        const grossOwned =
          a.purchased + a.bought_secondary - a.sold_secondary;
        const available = Math.max(0, grossOwned - a.reserved);

        // Skip properties the user is entirely out of (sold all,
        // nothing reserved, nothing currently owned) — they'd just
        // confuse the "what do I own?" surface.
        if (grossOwned <= 0 && a.reserved <= 0) continue;

        result.push({
          id: propertyId,
          property_id: propertyId,
          tokens_owned: available, // available — what the Sell modal can offer
          tokens_total_owned: grossOwned,
          tokens_reserved: a.reserved,
          tokens_sold: a.sold_secondary,
          investment_amount: a.purchased_amount,
          property: {
            id: propertyId,
            title: property?.title || 'Owned Property',
            city: property?.city || '',
            country: property?.country || '',
            image_url: extractImageUrl(property?.images),
            total_tokens: Number(property?.total_tokens) || 0,
            token_price: Number(property?.token_price) || 0,
            current_token_price:
              property?.token_price != null
                ? String(property.token_price)
                : '100.00',
          },
        });
      }

      return result;
    } catch (error) {
      console.error('Failed to get user investments:', error);
      throw error;
    }
  }

  /**
   * Get specific investment
   */
  static async getInvestment(investmentId: string): Promise<Investment & { property: Property }> {
    try {
      return await apiClient.get(`/investments/${investmentId}/`);
    } catch (error) {
      console.error('Failed to get investment:', error);
      throw error;
    }
  }

  /**
   * Cancel pending investment
   */
  static async cancelInvestment(investmentId: string): Promise<{ message: string }> {
    try {
      return await apiClient.post(`/investments/${investmentId}/cancel/`);
    } catch (error) {
      console.error('Failed to cancel investment:', error);
      throw error;
    }
  }

  /**
   * Get investment portfolio summary
   */
  static async getPortfolioSummary(): Promise<PortfolioSummary> {
    try {
      return await apiClient.get<PortfolioSummary>('/portfolio/summary/');
    } catch (error) {
      console.error('Failed to get portfolio summary:', error);
      throw error;
    }
  }

  /**
   * Get portfolio performance over time
   */
  static async getPortfolioPerformance(period = '1year'): Promise<Array<{
    date: string;
    total_value: number;
    invested_amount: number;
    return_amount: number;
    return_percentage: number;
  }>> {
    try {
      return await apiClient.get('/portfolio/performance/', { period });
    } catch (error) {
      console.error('Failed to get portfolio performance:', error);
      throw error;
    }
  }

  /**
   * Get investment transactions
   */
  static async getInvestmentTransactions(
    investmentId?: string, 
    page = 1, 
    limit = 20
  ): Promise<{
    transactions: InvestmentTransaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const endpoint = investmentId
        ? `/investments/${investmentId}/transactions/`
        : '/transactions/';

      return await apiClient.get(endpoint, { page, limit });
    } catch (error) {
      console.error('Failed to get investment transactions:', error);
      throw error;
    }
  }

  /**
   * Simulate investment returns
   */
  static async simulateInvestment(
    propertyId: string,
    investmentAmount: number,
    timeHorizon: number = 60 // months
  ): Promise<InvestmentSimulation> {
    try {
      return await apiClient.post<InvestmentSimulation>('/investments/simulate/', {
        property_id: propertyId,
        investment_amount: investmentAmount,
        time_horizon: timeHorizon
      });
    } catch (error) {
      console.error('Failed to simulate investment:', error);
      throw error;
    }
  }

  /**
   * Get dividend history.
   *
   * Backend returns a stock DRF paginated list — there is no `summary`
   * field on this response. Call `getDividendSummary()` separately for
   * aggregates.
   */
  static async getDividendHistory(page = 1, limit = 20): Promise<{
    dividends: Array<{
      id: string;
      investment_id: string;
      property_title: string;
      amount: number;
      currency: string;
      payment_date: Date;
      period_start: Date;
      period_end: Date;
      status: 'pending' | 'paid' | 'cancelled';
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const response: any = await apiClient.get('/dividends/', { page, page_size: limit });
      const dividends = response?.results || response?.dividends || [];
      const total = response?.count ?? dividends.length;
      return {
        dividends,
        pagination: {
          page,
          limit,
          total,
          pages: Math.max(1, Math.ceil(total / limit)),
        },
      };
    } catch (error) {
      console.error('Failed to get dividend history:', error);
      throw error;
    }
  }

  /**
   * Get aggregated dividend summary (paid dividends, totals, by-property).
   *
   * Separate endpoint from the dividend list. Returns server-side keys —
   * `total_dividends`, `dividend_count`, `average_dividend`, `by_property` —
   * which is intentionally NOT the same shape the dashboard expects, so
   * call sites must map fields explicitly rather than relying on a
   * frontend-invented schema.
   */
  static async getDividendSummary(params: { start_date?: string; end_date?: string } = {}): Promise<{
    total_dividends: number;
    dividend_count: number;
    average_dividend: number;
    by_property: Array<{
      property_id: string;
      property_title: string;
      total_dividends: number;
      dividend_count: number;
    }>;
  }> {
    try {
      return await apiClient.get('/dividends/summary/', params);
    } catch (error) {
      console.error('Failed to get dividend summary:', error);
      throw error;
    }
  }

  /**
   * Get investment recommendations
   */
  static async getRecommendations(limit = 6): Promise<Array<{
    property: Property;
    recommendation_score: number;
    reason: string;
    projected_return: number;
    risk_score: number;
    match_factors: string[];
  }>> {
    try {
      return await apiClient.get('/recommendations/', { limit });
    } catch (error) {
      console.error('Failed to get investment recommendations:', error);
      throw error;
    }
  }

  /**
   * Get investment limits for user
   */
  static async getInvestmentLimits(): Promise<{
    daily_limit: number;
    monthly_limit: number;
    per_property_limit: number;
    total_portfolio_limit: number;
    remaining_daily: number;
    remaining_monthly: number;
    kyc_required: boolean;
    verification_level: string;
  }> {
    try {
      return await apiClient.get('/limits/');
    } catch (error) {
      console.error('Failed to get investment limits:', error);
      throw error;
    }
  }

  /**
   * Request investment withdrawal/sale.
   *
   * Backend exposes withdrawals as their own resource — the create call
   * goes to /withdrawals/ with the investment id in the body, not to
   * /investments/<id>/withdraw (which was a frontend invention).
   */
  static async requestWithdrawal(investmentId: string, tokenAmount: number): Promise<{
    withdrawal_id: string;
    estimated_amount: number;
    processing_fee: number;
    estimated_completion: Date;
    message: string;
  }> {
    try {
      return await apiClient.post('/withdrawals/', {
        investment: investmentId,
        token_amount: tokenAmount,
      });
    } catch (error) {
      console.error('Failed to request withdrawal:', error);
      throw error;
    }
  }

  /**
   * Get withdrawal requests
   */
  static async getWithdrawalRequests(page = 1, limit = 20): Promise<{
    withdrawals: Array<{
      id: string;
      investment_id: string;
      property_title: string;
      token_amount: number;
      estimated_amount: number;
      processing_fee: number;
      status: 'pending' | 'processing' | 'completed' | 'cancelled';
      requested_at: Date;
      estimated_completion: Date;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      return await apiClient.get('/withdrawals/', { page, limit });
    } catch (error) {
      console.error('Failed to get withdrawal requests:', error);
      throw error;
    }
  }

  /**
   * Cancel withdrawal request.
   *
   * The withdrawal viewset is a stock ModelViewSet with no custom `cancel`
   * action — destruction of a pending row is the cancel operation.
   */
  static async cancelWithdrawal(withdrawalId: string): Promise<{ message: string }> {
    try {
      return await apiClient.delete(`/withdrawals/${withdrawalId}/`);
    } catch (error) {
      console.error('Failed to cancel withdrawal:', error);
      throw error;
    }
  }

  /**
   * Get market analytics
   */
  static async getMarketAnalytics(): Promise<{
    total_properties: number;
    total_investment_volume: number;
    average_roi: number;
    top_performing_properties: Array<{
      id: string;
      title: string;
      roi: number;
      total_return: number;
    }>;
    market_trends: {
      week_change: number;
      month_change: number;
      year_change: number;
    };
    investment_distribution: Array<{
      property_type: string;
      percentage: number;
      volume: number;
    }>;
  }> {
    try {
      // Backend exposes market data via properties/market/insights/ —
      // there's no /investments/market/analytics endpoint.
      return await apiClient.get('/properties/market/insights/');
    } catch (error) {
      console.error('Failed to get market analytics:', error);
      throw error;
    }
  }

  /**
   * Set up automatic investment (DCA)
   */
  static async setupAutomaticInvestment(config: {
    property_id: string;
    amount: number;
    frequency: 'weekly' | 'monthly' | 'quarterly';
    payment_method: PaymentMethod;
    start_date: Date;
    end_date?: Date;
    max_total_amount?: number;
  }): Promise<{
    auto_investment_id: string;
    next_execution: Date;
    message: string;
  }> {
    try {
      return await apiClient.post('/auto-invest/', config);
    } catch (error) {
      console.error('Failed to setup automatic investment:', error);
      throw error;
    }
  }

  /**
   * Get automatic investment plans
   */
  static async getAutomaticInvestments(): Promise<Array<{
    id: string;
    property_title: string;
    amount: number;
    frequency: string;
    next_execution: Date;
    total_invested: number;
    status: 'active' | 'paused' | 'cancelled';
    created_at: Date;
  }>> {
    try {
      return await apiClient.get('/auto-invest/');
    } catch (error) {
      console.error('Failed to get automatic investments:', error);
      throw error;
    }
  }

  /**
   * Update automatic investment
   */
  static async updateAutomaticInvestment(
    autoInvestId: string, 
    updates: Partial<{
      amount: number;
      frequency: 'weekly' | 'monthly' | 'quarterly';
      status: 'active' | 'paused';
    }>
  ): Promise<{ message: string }> {
    try {
      return await apiClient.patch(`/auto-invest/${autoInvestId}/`, updates);
    } catch (error) {
      console.error('Failed to update automatic investment:', error);
      throw error;
    }
  }

  /**
   * Cancel automatic investment
   */
  static async cancelAutomaticInvestment(autoInvestId: string): Promise<{ message: string }> {
    try {
      return await apiClient.delete(`/auto-invest/${autoInvestId}/`);
    } catch (error) {
      console.error('Failed to cancel automatic investment:', error);
      throw error;
    }
  }

  // Cart Management Methods

  /**
   * Get user's investment cart
   */
  static async getCart(): Promise<{
    id: string;
    items: Array<{
      id: string;
      property_id: string;
      property: Property;
      token_amount: number;
      investment_amount: number;
      price_per_token: number;
      created_at: Date;
    }>;
    total_items: number;
    total_amount: number;
    estimated_fees: number;
    total_cost: number;
  }> {
    try {
      return await apiClient.get('/investments/cart/');
    } catch (error) {
      console.error('Failed to get cart:', error);
      throw error;
    }
  }

  /**
   * Add item to investment cart
   */
  static async addToCart(data: {
    property_id: string;
    token_amount: number;
  }): Promise<{
    cart_item_id: string;
    message: string;
  }> {
    try {
      return await apiClient.post('/investments/cart/add/', data);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      throw error;
    }
  }

  /**
   * Update cart item
   */
  static async updateCartItem(
    itemId: string,
    data: { token_amount: number }
  ): Promise<{ message: string }> {
    try {
      return await apiClient.patch(`/investments/cart/items/${itemId}/`, data);
    } catch (error) {
      console.error('Failed to update cart item:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  static async removeFromCart(itemId: string): Promise<{ message: string }> {
    try {
      return await apiClient.delete(`/investments/cart/items/${itemId}/`);
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      throw error;
    }
  }

  /**
   * Clear entire cart
   */
  static async clearCart(): Promise<{ message: string }> {
    try {
      return await apiClient.post('/investments/cart/clear/');
    } catch (error) {
      console.error('Failed to clear cart:', error);
      throw error;
    }
  }

  /**
   * Checkout cart (process all cart items as investments)
   */
  static async checkoutCart(data: {
    payment_method: PaymentMethod;
    installment_plan?: {
      number_of_installments: number;
      frequency: 'monthly' | 'quarterly';
    };
  }): Promise<{
    transaction_id: string;
    investments: Array<{
      investment_id: string;
      property_id: string;
      status: string;
    }>;
    total_amount: number;
    message: string;
  }> {
    try {
      return await apiClient.post('/investments/cart/checkout/', data);
    } catch (error) {
      console.error('Failed to checkout cart:', error);
      throw error;
    }
  }

  /**
   * Get cart checkout summary
   */
  static async getCartCheckoutSummary(): Promise<{
    subtotal: number;
    platform_fees: number;
    processing_fees: number;
    total_amount: number;
    payment_methods: Array<{
      type: string;
      name: string;
      available: boolean;
      fee_percentage: number;
    }>;
    installment_options: Array<{
      installments: number;
      frequency: string;
      monthly_amount: number;
      total_interest: number;
    }>;
  }> {
    try {
      return await apiClient.get('/investments/cart/checkout/summary/');
    } catch (error) {
      console.error('Failed to get checkout summary:', error);
      throw error;
    }
  }
}

export default InvestmentService;