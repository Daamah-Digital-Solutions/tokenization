# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Capimax is a full-stack real estate tokenization platform enabling fractional property investment through blockchain technology. Django REST API backend (`capimax_backend/`) + React/TypeScript frontend (`capimax-preview/`).

## Development Commands

### Backend
```bash
cd capimax_backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8500          # Use port 8500 (8000 used by other project)

# Testing (pytest with settings_test)
pytest                                    # All tests (85% coverage required)
pytest -k test_function_name             # Run specific test
pytest -m unit                           # Unit tests only
pytest -m integration                    # Integration tests only
pytest --cov=. --cov-report=html         # HTML coverage report
python manage.py test <app_name>         # Django test runner

# Migrations
python manage.py makemigrations <app_name>
python manage.py migrate

# Background tasks
celery -A capimax_backend worker -l info
celery -A capimax_backend beat -l info
```

### Frontend
```bash
cd capimax-preview
npm install
npm run dev                # Vite dev server (port 5173)
npm run build              # Production build (skips type-check)
npm run build:with-types   # Type-check then build
npm run type-check         # TypeScript checking only
npm run lint               # ESLint
npm run test               # Vitest tests
npm run test:coverage      # Coverage report (70% minimum)
```

### Port Convention
- Backend: port 8500 (port 8000 reserved for another project)
- Frontend: port 5173 (Vite default) or 5500
- Frontend `.env`: `VITE_API_URL=http://localhost:8500/api/v1`

### Test Accounts (password: TestPass123!)
- admin@capimax.com (admin), investor@test.com (investor)
- owner@test.com (property_owner), broker@test.com (broker)

## Architecture

### Backend (Django)
Located in `capimax_backend/`, organized into modular Django apps:
- **accounts**: User auth, JWT, 2FA, Google OAuth (FedCM)
- **properties**: Property management, tokenization
- **investments**: Investment tracking, portfolio, dividends
- **payments**: Multi-provider payments (Stripe, PayPal, Coinbase, NowPayments)
- **kyc**: KYC verification (Jumio)
- **construction**: Construction milestone tracking
- **broker**: Broker management, commissions
- **analytics**: Investment analytics
- **dashboard**: Role-specific dashboard APIs
- **notifications**: Real-time notifications
- **ws_app**: WebSocket via Django Channels
- **blockchain**: Smart contracts (web3.py, Ethereum/Polygon/BNB)
- **marketplace**: Secondary market for property tokens
- **liquidity_provider**: Liquidity pool management
- **admin_panel**: Admin interface
- **documents**: Document generation & storage (routed at `/api/v1/documents/`)
- **legal**: SPV legal entities, subscription agreements, cap table — model/service layer only, **no REST routes** (used internally via `legal/services.py`)
- **core**: Shared utilities, standardized responses, pagination, permissions

**Wallet & withdrawals live in `payments`, not a dedicated `wallet` app.** Models are in `payments/models.py`: `WalletBalance`, `WalletTransaction`, `WalletDeposit`, `WalletWithdrawal`, `BankTransfer`, `BankWithdrawalRequest`. Endpoints are under `/api/v1/payments/wallet/…` and `/api/v1/payments/bank-transfer/…`. Frontend service: `src/services/wallet/`.

Settings: `capimax_backend/capimax_backend/settings/` — selected by `ENVIRONMENT` env var (default: development). Options: development, production, staging, testing. Test settings: `capimax_backend/capimax_backend/settings_test.py` (in-memory SQLite, disabled migrations).

### Frontend (React)
Located in `capimax-preview/`, built with React 18 + TypeScript + Vite, TanStack Query, Tailwind CSS + Framer Motion, Wagmi/Ethers.js/Viem for Web3, RainbowKit, Stripe.

**No path aliases** — all imports use relative paths (no `@/` prefix).

**TypeScript is relaxed** — `strict: false`, no unused variable checking.

**Provider stack order** (dependencies flow downward):
QueryClientProvider → ThemeProvider → AuthProvider → NetworkProvider → LoadingProvider → NotificationProvider → PaymentProvider → RouterProvider

## Critical Model Field Names

These non-standard field names cause 500 errors if guessed wrong. Always verify against the actual model.

### Investment Model (`investments/models.py`)
- `property_investment` (NOT `property`) — FK to Property
- `user` (NOT `investor`) — FK to User
- `investment_amount` (NOT `amount`) — Decimal
- `token_amount` (NOT `token_count`) — PositiveIntegerField
- Status lifecycle: pending → processing → payment_confirmed → pending_mint → minting → completed (also: mint_failed, failed, cancelled, refunded)
- Mint retry system: `mint_retry_count` (max 3), exponential backoff (2/4/8 min)

### Property Model (`properties/models.py`)
- `property_type` (NOT `type`) — residential, commercial, industrial, mixed_use, land
- `property_category` (NOT `category`) — under_construction, ready_property
- `expected_return` (NOT `expected_roi` or `expected_annual_return`) — Decimal max 100%
- `expected_completion_date` (NOT `construction_completion_date`)
- **No `location` field** — use `city`, `address`, `country` separately

### Marketplace Models (`marketplace/models.py`)
- MarketListing: `property_listing` (NOT `property`) — FK to Property
- TradeTransaction: `property_traded` (NOT `property`) — FK to Property
- MarketAnalytics: `property_analyzed` (NOT `property`) — FK to Property (nullable)

### User Model (`accounts/models.py`)
- `role` field: investor, property_owner, broker, admin
- `USERNAME_FIELD = 'email'` (login by email, not username)
- Multi-role support via `UserRoleAssignment` model
- Methods: `has_role()`, `can_invest()`, `can_list_properties()`, `is_admin_user()`

## Code Patterns

### Backend API Response Format
`create_success_response()` and `create_error_response()` return **dicts**, not Response objects. Always wrap with `Response()`:
```python
from core.utils import create_success_response, create_error_response
from rest_framework.response import Response

# Correct
return Response(create_success_response(data=serializer.data, message="Created"))
return Response(create_error_response(message="Not found", status_code=404), status=404)

# WRONG — returns a dict, not an HTTP response
return create_success_response(data=serializer.data)
```

Response format: `{'success': True/False, 'message': '...', 'status_code': int, 'data': {...}}` (success) or `{'success': False, 'error': {'message': '...', 'status_code': int, 'details': {...}}}` (error).

### Frontend Custom Router (NOT react-router)
Uses Context API + History API. Route names are string literals in a union type.
```typescript
import { useRouter } from '@/utils/router';  // relative import in practice
const { navigate, currentRoute, goBack, getQueryParam } = useRouter();
navigate('property-detail');  // kebab-case route names
```

Adding a new route requires changes in three places:
1. `src/utils/router.tsx` — add to Route type, routeMap, and pathMap
2. `src/App.tsx` — add lazy import and case in switch statement
3. AuthContext if the route is protected

### Frontend API Client
Singleton `apiClient` in `src/services/api/ApiClient.ts`. Returns **unwrapped inner data** (extracts `.data.data` from response). Throws `ApiError` on failure.
```typescript
// Returns the data directly, not the response wrapper
const properties = await apiClient.get('/properties/');  // returns Property[]
```
Public endpoints (no auth token): `/auth/register/`, `/auth/login/`, `/auth/password/reset/`, `/auth/password/reset/confirm/`, `/auth/check-email/`

### Frontend Auth Flow
Registration does NOT authenticate the user. User must verify email first, then login separately. Auto-login only works when a pre-auth response is provided from the email verification page.

### Frontend Services
Static class methods or exported functions using `apiClient`. No dependency injection.

## API Structure

Base URL: `http://localhost:8500/api/v1/`
Main URL router: `capimax_backend/capimax_backend/urls.py`

Key endpoint prefixes:
- `/auth/` → accounts, `/properties/` → properties, `/payments/` → payments
- `/kyc/` → kyc, `/marketplace/` → marketplace, `/blockchain/` → blockchain
- `/dashboard/` → dashboard, `/broker/` → broker, `/analytics/` → analytics
- `/admin/` → admin_panel, `/notifications/` → notifications
- `/liquidity-provider/` → liquidity_provider, `/documents/` → documents
- `/construction/` → construction
- `/` (no prefix under v1) → investments and `core` (both mounted at bare `/api/v1/`)

API docs: `/api/docs/` (Swagger), `/api/redoc/` (ReDoc)

WebSocket endpoints: `ws://localhost:8500/ws/notifications/`, `ws/admin/`, `ws/property/<id>/`, `ws/investment/<id>/`

## Known Gotchas

- **Dual InstallmentPayment models**: `investments.models.InstallmentPayment` (investment installments) and `properties.models.InstallmentPayment` (construction installments) — different field names, be careful with imports
- **Investment URLs have no prefix**: Mounted directly at `/api/v1/` unlike other apps
- **web3 pytest plugin disabled**: Blocked in `conftest.py` due to compatibility issues
- **PWA caching in production**: Service worker caches API responses (NetworkFirst) and images (CacheFirst) — can cause stale data issues
- **admin_panel/views.py**: All views must wrap response helpers in `Response()` — the most common source of 500 errors in that module
- **Wallet URL ordering**: in `payments/urls.py`, `wallet/transactions/` MUST be declared before `wallet/<str:action>/`, otherwise the catch-all `<action>` route swallows `transactions/`
- **Withdrawals are admin-reviewed**: user withdrawals create a `BankWithdrawalRequest` for manual admin approval (not an automatic on-chain/bank payout) — see recent `feat(wallet)` commits

## Environment Configuration

### Backend (.env in capimax_backend/)
```bash
SECRET_KEY, DEBUG, DJANGO_SETTINGS_MODULE=capimax_backend.settings.development
DATABASE_URL=postgresql://...  # SQLite (db.sqlite3) in dev
REDIS_URL, STRIPE_SECRET_KEY, ETHEREUM_RPC_URL, POLYGON_RPC_URL
```

### Frontend (.env in capimax-preview/)
```bash
VITE_API_URL=http://localhost:8500/api/v1
VITE_WEBSOCKET_URL=ws://localhost:8500/ws
VITE_STRIPE_PUBLISHABLE_KEY, VITE_WALLET_CONNECT_PROJECT_ID, VITE_GOOGLE_CLIENT_ID
VITE_ENABLE_CRYPTO_PAYMENTS, VITE_ENABLE_WEBSOCKETS, VITE_ENABLE_2FA  # feature flags
VITE_SUPPORTED_CHAINS=1,137  # Ethereum, Polygon chain IDs
```

## Testing Configuration

### Backend (pytest)
Config: `capimax_backend/pytest.ini` + `capimax_backend/conftest.py`
- Settings: `capimax_backend.settings_test` (in-memory SQLite, MD5 hasher for speed, disabled migrations)
- Markers: `@pytest.mark.unit`, `@pytest.mark.integration`, `@pytest.mark.websocket`, `@pytest.mark.performance`, `@pytest.mark.slow`
- Auto-marker assignment based on test location/name

### Frontend (vitest)
Config: `capimax-preview/vitest.config.ts`, setup: `src/test/setup.ts`
- Uses @testing-library/react with jsdom
- Coverage: 70% minimum (lines, functions, branches, statements)

## Key Files

Backend: `capimax_backend/capimax_backend/urls.py` (router), `core/utils.py` (response helpers), `accounts/models.py` (User model), `pytest.ini` + `conftest.py` (tests)

Frontend: `src/services/api/ApiClient.ts` (HTTP client), `src/utils/router.tsx` (routing), `src/App.tsx` (route definitions), `src/contexts/AuthContext.tsx` (auth state)

## Production Deployment

Docker Compose: `capimax_backend/docker-compose.yml` (dev), `docker-compose.production.yml` (prod)
Services: web (Gunicorn), db (PostgreSQL 15), redis, celery, celery-beat, nginx, prometheus, grafana

## Blockchain Integration

Smart contracts in `capimax_backend/blockchain/contracts/` — RealEstateToken.sol, PropertyContractFactory.sol, RentalIncomeDistributor.sol. Hardhat for compilation/deployment. Web3.py for backend integration.
