/**
 * WalletService — hybrid custodial wallet API client.
 *
 * Backend pairs:
 *   GET  /api/v1/auth/wallet/                → getWalletInfo()
 *   POST /api/v1/auth/wallet/link-external/  → linkExternalWallet() (2-step)
 *   POST /api/v1/auth/wallet/unlink-external/ → unlinkExternalWallet()
 *
 * The link flow is two requests:
 *   1. POST {address}              → backend issues a nonce + message_to_sign
 *   2. POST {address, signature}   → backend recovers signer, attaches if match
 *
 * Callers feed the message_to_sign into the wallet's personal_sign request,
 * then post the resulting signature back for verification. The platform never
 * sees a private key.
 */

import { apiClient } from '../api/ApiClient';
import type {
  WalletInfo,
  WalletLinkChallenge,
  WalletLinkResult,
  CustodialBalance,
  WithdrawResult,
} from '../api/types';

export class WalletService {
  static async getWalletInfo(): Promise<WalletInfo> {
    return apiClient.get<WalletInfo>('/auth/wallet/');
  }

  /**
   * Step 1 of the link flow — request a challenge message to sign.
   *
   * Pass the returned `message_to_sign` to the wallet (via personal_sign),
   * then call ``completeLinkExternalWallet()`` with the resulting signature.
   */
  static async requestLinkChallenge(address: string): Promise<WalletLinkChallenge> {
    return apiClient.post<WalletLinkChallenge>('/auth/wallet/link-external/', { address });
  }

  /**
   * Step 2 — submit the signed message. Backend recovers the signer and
   * attaches the wallet if it matches.
   */
  static async completeLinkExternalWallet(
    address: string,
    signature: string,
  ): Promise<WalletLinkResult> {
    return apiClient.post<WalletLinkResult>('/auth/wallet/link-external/', {
      address,
      signature,
    });
  }

  /**
   * Convenience: do both steps in one call given a `sign` callback.
   * Caller supplies the signing function (so we don't take a hard dependency
   * on a particular wallet provider here).
   */
  static async linkExternalWallet(
    address: string,
    sign: (message: string) => Promise<string>,
  ): Promise<WalletLinkResult> {
    const challenge = await WalletService.requestLinkChallenge(address);
    const signature = await sign(challenge.message_to_sign);
    return WalletService.completeLinkExternalWallet(address, signature);
  }

  static async unlinkExternalWallet(): Promise<{ unlinked_address: string }> {
    return apiClient.post<{ unlinked_address: string }>(
      '/auth/wallet/unlink-external/',
      {},
    );
  }

  /**
   * Per-property token holdings split between the user's custodial and
   * external wallet slots. Used to power the withdraw UI.
   */
  static async getCustodialBalances(): Promise<CustodialBalance[]> {
    const data = await apiClient.get<{ balances: CustodialBalance[] }>(
      '/auth/wallet/balances/',
    );
    return data?.balances || [];
  }

  /**
   * Move tokens from the user's custodial wallet to their linked external
   * wallet. Backend signs with the platform-derived custodial key; user
   * never sees a private key. Pass ``amount`` undefined to withdraw the
   * full custodial balance for that property.
   */
  static async withdrawTokens(
    propertyId: string,
    amount?: number,
  ): Promise<WithdrawResult> {
    const body: Record<string, unknown> = { property_id: propertyId };
    if (amount != null) body.amount = amount;
    return apiClient.post<WithdrawResult>('/auth/wallet/withdraw/', body);
  }
}
