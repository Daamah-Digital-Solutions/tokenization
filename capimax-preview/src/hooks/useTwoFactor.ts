/**
 * useTwoFactor — convenience hook that wires the standalone
 * `TwoFactorAuth` presentational component to `AuthService`.
 *
 * Background: `TwoFactorAuth.tsx` is a pure presentational component that
 * accepts `onSetup` / `onVerify` / `onDisable` callbacks. The backend
 * endpoints (`/auth/2fa/setup/`, `/verify/`, `/disable/`) are real and
 * tested, but no parent page wired the callbacks — so the UI shipped
 * with dead buttons. This hook is the missing glue: drop it into any
 * page that renders `TwoFactorAuth` and spread the returned handlers
 * onto the component.
 *
 * Example:
 *   const { state, setup, verify, disable } = useTwoFactor();
 *   <TwoFactorAuth
 *     mode={state.mode}
 *     loading={state.loading}
 *     error={state.error ?? undefined}
 *     qrCodeUrl={state.qrCode}
 *     backupCodes={state.backupCodes}
 *     onSetup={() => setup()}
 *     onVerify={(code) => verify(code)}
 *     onDisable={() => disable(...)}
 *   />
 */

import { useCallback, useState } from 'react';
import { AuthService, type TwoFactorSetup } from '../services/auth/AuthService';

type Mode = 'setup' | 'verify' | 'disable';

interface State {
  mode: Mode;
  loading: boolean;
  error: string | null;
  success: boolean;
  qrCode?: string;
  secret?: string;
  backupCodes: string[];
}

const initialState: State = {
  mode: 'setup',
  loading: false,
  error: null,
  success: false,
  backupCodes: [],
};

export function useTwoFactor() {
  const [state, setState] = useState<State>(initialState);

  const reset = useCallback(() => setState(initialState), []);

  const setup = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null, success: false }));
    try {
      const result: TwoFactorSetup = await AuthService.setupTwoFactor();
      setState({
        mode: 'verify',
        loading: false,
        error: null,
        success: false,
        qrCode: result.qrCode,
        secret: result.secret,
        backupCodes: result.backupCodes ?? [],
      });
      return result;
    } catch (error: any) {
      setState(s => ({
        ...s,
        loading: false,
        error: error?.message ?? 'Failed to start 2FA setup',
      }));
      throw error;
    }
  }, []);

  const verify = useCallback(async (code: string) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const result: any = await AuthService.verifyTwoFactor({ code });
      setState(s => ({
        ...s,
        loading: false,
        success: true,
        backupCodes: result?.backupCodes ?? s.backupCodes,
      }));
      return result;
    } catch (error: any) {
      setState(s => ({
        ...s,
        loading: false,
        error: error?.message ?? 'Invalid 2FA code',
      }));
      throw error;
    }
  }, []);

  const disable = useCallback(async (code: string) => {
    setState(s => ({ ...s, loading: true, error: null, mode: 'disable' }));
    try {
      await AuthService.disableTwoFactor({ code });
      setState({ ...initialState, success: true });
    } catch (error: any) {
      setState(s => ({
        ...s,
        loading: false,
        error: error?.message ?? 'Failed to disable 2FA',
      }));
      throw error;
    }
  }, []);

  return { state, setup, verify, disable, reset };
}
