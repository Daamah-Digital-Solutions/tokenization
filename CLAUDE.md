# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Capimax is a full-stack real estate tokenization platform enabling fractional property investment through blockchain technology. The system consists of a Django REST API backend and a React/TypeScript frontend with Web3 integration.

## Architecture

### Backend (Django)
Located in `capimax_backend/`, organized into 15 modular Django apps:
- **accounts**: User authentication, JWT tokens, 2FA support, custom User model
- **properties**: Property management with tokenization features
- **investments**: Investment tracking, portfolio management, dividend distribution
- **payments**: Multi-provider payment processing (Stripe, PayPal, Coinbase, NowPayments)
- **kyc**: KYC verification and document management (Jumio integration)
- **construction**: Construction milestone tracking
- **broker**: Broker management, commissioning, and applications
- **analytics**: Investment analytics and reporting
- **dashboard**: Role-specific dashboard APIs
- **notifications**: Real-time notifications system
- **ws_app**: WebSocket support via Django Channels with custom middleware
- **blockchain**: Smart contract integration (web3.py for Ethereum/Polygon)
- **marketplace**: Secondary market for property tokens
- **admin_panel**: Administrative interface and controls
- **core**: Shared utilities, standardized responses, pagination, custom permissions

Settings structure: `capimax_backend/capimax_backend/settings/` with base.py, development.py, production.py

Key architectural patterns:
- Custom User model: `accounts.User` (AUTH_USER_MODEL)
- Standardized API responses via `core.utils.create_success_response()` and `core.utils.create_error_response()`
- Custom exception handler: `core.exceptions.custom_exception_handler`
- JWT authentication with 60-minute access tokens, 7-day refresh tokens
- ASGI application for WebSocket support via Django Channels

### Frontend (React)
Located in `capimax-preview/`, built with:
- React 18 + TypeScript + Vite
- TanStack Query for server state management
- Tailwind CSS + Framer Motion for UI
- Wagmi/Ethers.js/Viem for Web3 integration
- RainbowKit for wallet connection UI
- Stripe integration via @stripe/react-stripe-js
- Role-based routing (Investor, Property Owner, Broker, Admin)

Frontend architecture:
- Centralized API client: `src/services/api/ApiClient.ts` (singleton pattern)
- Custom axios interceptors for auth token injection and error handling
- Service layer pattern: separate services for auth, property, payment, marketplace
- Context providers: AuthContext, PaymentContext
- Public endpoints bypass auth: /auth/register/, /auth/login/, /auth/password/reset/

## Development Commands

### Backend
```bash
cd capimax_backend

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start development server
python manage.py runserver

# Run tests with pytest (uses settings_test)
pytest                                     # All tests with 85% coverage requirement
pytest -k test_function_name              # Run specific test by name
pytest -m unit                            # Run only unit tests
pytest -m integration                     # Run only integration tests
pytest --cov=. --cov-report=html          # Generate HTML coverage report

# Run tests with Django test runner
python manage.py test <app_name>          # Specific app
python manage.py test <app_name>.tests.TestClassName  # Specific class

# Make migrations
python manage.py makemigrations
python manage.py makemigrations <app_name>

# Celery for background tasks
celery -A capimax_backend worker -l info
celery -A capimax_backend beat -l info
```

### Frontend
```bash
cd capimax-preview

npm install
npm run dev              # Start dev server (port 5173)
npm run build            # Production build
npm run lint             # ESLint
npm run type-check       # TypeScript checking
npm run test             # Run vitest tests
npm run test:ui          # Vitest with UI
npm run test:coverage    # Test coverage report
```

## API Structure

Base URL: `http://localhost:8000/api/v1/`

Main URL router: `capimax_backend/capimax_backend/urls.py`

Key endpoint groups:
- `/auth/` → accounts app (login, register, refresh, 2FA, email verification)
- `/properties/` → properties app (CRUD, tokenization, analytics)
- `/investments/` → investments app (portfolio, dividends)
- `/payments/` → payments app (payment processing, wallet, NowPayments crypto)
- `/kyc/` → kyc app (document submission and verification)
- `/construction/` → construction app (milestone tracking)
- `/broker/` → broker app (applications, commissions)
- `/analytics/` → analytics app
- `/dashboard/` → dashboard app (role-specific data)
- `/marketplace/` → marketplace app (secondary market)
- `/admin/` → admin_panel app
- `/notifications/` → notifications app
- `/blockchain/` → blockchain app (network info, transaction monitoring)

API documentation:
- Swagger UI: `http://localhost:8000/api/docs/`
- ReDoc: `http://localhost:8000/api/redoc/`

WebSocket endpoints: `ws://localhost:8000/ws/`

## Testing Configuration

### Backend (pytest)
Configuration: `capimax_backend/pytest.ini`
- Settings module: `capimax_backend.settings_test`
- Coverage requirement: 85% minimum
- Database: Reuses test database (--reuse-db)
- Markers: `@pytest.mark.unit`, `@pytest.mark.integration`, `@pytest.mark.websocket`, `@pytest.mark.performance`, `@pytest.mark.slow`

### Frontend (vitest)
Configuration: `capimax-preview/vitest.config.ts`
- Uses @testing-library/react and happy-dom/jsdom

## Code Patterns

### Backend API Response Format
Always use standardized responses:
```python
from core.utils import create_success_response, create_error_response

# Success
return Response(create_success_response(data=serializer.data, message="Created"))

# Error
return Response(create_error_response(message="Not found", status_code=404), status=404)
```

### Backend App Structure
```
app_name/
├── models.py           # Database models
├── serializers.py      # DRF serializers
├── views.py            # ViewSets and APIViews
├── urls.py             # URL routing
├── admin.py            # Django admin config
├── services.py         # Business logic (where applicable)
├── permissions.py      # Custom permissions (where applicable)
└── tests.py or tests/  # Test files
```

### Frontend Service Pattern
All API calls go through centralized `ApiClient` singleton:
```typescript
import { apiClient } from '@/services/api/ApiClient';
const data = await apiClient.get('/endpoint/');
```

### Database Models
Key relationships:
- **User model**: `accounts.User` (AUTH_USER_MODEL) with role field
- **Property tokenization**: Property → TokenizedProperty (one-to-one, optional)
- **Investments**: User ↔ Property (many-to-many through Investment)
- **Payments**: Multiple providers via provider field
- **KYC**: User → KYCDocument (one-to-many)
- **Marketplace**: Investment → Listing (one-to-one) for secondary market

## Environment Configuration

### Backend (.env in capimax_backend/)
Key variables:
```bash
SECRET_KEY=<django-secret-key>
DEBUG=True
DJANGO_SETTINGS_MODULE=capimax_backend.settings.development
DATABASE_URL=postgresql://user:password@localhost:5432/capimax
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=<key>
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/<project-id>
POLYGON_RPC_URL=https://polygon-rpc.com/
```

### Frontend (.env in capimax-preview/)
```bash
VITE_API_URL=http://localhost:8000/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=<stripe-public-key>
VITE_WALLET_CONNECT_PROJECT_ID=<wallet-connect-project-id>
```

## Production Deployment

Docker Compose config: `capimax_backend/docker-compose.yml`

Services: web (Gunicorn), db (PostgreSQL), redis, celery, celery-beat, nginx, prometheus, grafana

```bash
cd capimax_backend
docker-compose up -d
docker-compose logs -f web
python validate_production_readiness.py
```

## Blockchain Integration

- Smart contracts: `blockchain/contracts/`
- Web3 library: Web3.py for Ethereum/Polygon
- RPC endpoints: ETHEREUM_RPC_URL and POLYGON_RPC_URL env vars
- Contract deployment: `blockchain/services/property_tokenization_service.py`
