# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Capimax is a full-stack real estate tokenization platform enabling fractional property investment through blockchain technology. The system consists of a Django REST API backend and a React/TypeScript frontend with Web3 integration.

## Architecture

### Backend (Django)
Located in `capimax_backend/`, organized into 15 modular Django apps:
- **accounts**: User authentication, JWT tokens, 2FA support
- **properties**: Property management with tokenization features
- **investments**: Investment tracking and portfolio management
- **payments**: Multi-provider payment processing (Stripe, PayPal, Crypto)
- **kyc**: KYC verification and document management
- **construction**: Construction milestone tracking
- **broker**: Broker management and commissioning
- **analytics**: Investment analytics and reporting
- **dashboard**: Role-specific dashboard APIs
- **notifications**: Real-time notifications system
- **websockets**: WebSocket support via Django Channels
- **blockchain**: Smart contract integration
- **marketplace**: Property marketplace and trading
- **admin_panel**: Administrative interface and controls
- **core**: Shared utilities and base models

Multi-environment settings structure with base/development/production/testing configurations.

### Frontend (React)
Located in `capimax-preview/`, built with:
- React 18 + TypeScript + Vite
- TanStack Query for server state management
- Tailwind CSS + Framer Motion for UI
- Wagmi/Ethers.js for Web3 integration
- Role-based routing (Investor, Property Owner, Broker, Admin)

## Development Commands

### Backend
```bash
cd capimax_backend

# Install dependencies
python -m pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver

# Run tests
python manage.py test

# Run specific app tests
python manage.py test <app_name>

# Make migrations for an app
python manage.py makemigrations <app_name>

# Check for issues without making migrations
python manage.py check

# Validate production readiness
python validate_production_readiness.py
```

### Frontend
```bash
cd capimax-preview

# Install dependencies
npm install

# Start development server (runs on port 5174 if 5173 is busy)
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Preview production build
npm run preview
```

## API Structure

Base URL: `http://localhost:8000/api/v1/`

Key endpoints:
- `/auth/` - Authentication (login, register, refresh, 2FA)
- `/properties/` - Property CRUD and tokenization
- `/investments/` - Investment management
- `/payments/` - Payment processing
- `/kyc/` - KYC document submission and verification
- `/construction/` - Construction progress tracking
- `/broker/` - Broker operations
- `/analytics/` - Analytics and reporting
- `/dashboard/` - Role-specific dashboard data
- `/marketplace/` - Property marketplace and trading
- `/blockchain/` - Blockchain transactions and smart contracts

API documentation available at: `http://localhost:8000/api/docs/`

## Key Models and Data Flow

### User Roles
- **Investor**: Can browse properties, make investments, track portfolio
- **Property Owner**: Can list properties, manage tokenization, track sales
- **Broker**: Can manage multiple properties, earn commissions
- **Admin**: Full system access, user management, compliance oversight

### Investment Flow
1. User completes KYC verification
2. Browses available tokenized properties
3. Selects investment amount/tokens
4. Processes payment (fiat or crypto)
5. Receives tokens to wallet
6. Tracks investment performance

## Environment Configuration

### Backend (.env in capimax_backend/)
```
SECRET_KEY=<django-secret-key>
DEBUG=True
DATABASE_URL=<database-connection-string>
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=<stripe-key>
STRIPE_PUBLISHABLE_KEY=<stripe-public-key>
JWT_SECRET_KEY=<jwt-secret>
```

### Frontend (.env in capimax-preview/)
```
VITE_API_URL=http://localhost:8000/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=<stripe-public-key>
VITE_WALLET_CONNECT_PROJECT_ID=<wallet-connect-id>
```

## Testing Approach

### Backend Testing
- Test files in each app's `tests/` directory
- Run specific app tests: `python manage.py test <app_name>`
- Test configuration in `pytest.ini`
- Uses Django's TestCase for database tests
- API tests use DRF's APITestCase

### Frontend Testing
- Component tests using React Testing Library
- Integration tests for API interactions
- E2E tests for critical user flows

## WebSocket Integration

WebSocket connections for real-time features:
- Connection URL: `ws://localhost:8000/ws/`
- Channels: notifications, dashboard updates, investment tracking
- Authentication via JWT token in connection params

## Database Schema

Primary models:
- **User**: Extended Django user with role, KYC status, wallet address
- **Property**: Tokenization details, ownership, financial metrics
- **Investment**: Links users to property tokens, tracks performance
- **Payment**: Multi-provider payment records
- **Transaction**: Blockchain transaction tracking
- **KYCDocument**: Document verification and compliance

## Deployment Considerations

- Backend uses Gunicorn + Nginx in production
- Frontend builds to static files served by CDN
- PostgreSQL for production database
- Redis for caching and WebSocket support
- Celery for background task processing
- Docker compose configuration available

## Code Patterns

### Backend Patterns
- ViewSets for CRUD operations
- Custom permissions for role-based access
- Serializer validation for data integrity
- Signal handlers for cross-app communication
- Celery tasks for async operations

### Frontend Patterns
- Custom hooks for data fetching
- Context providers for global state
- Protected routes with role checking
- Lazy loading for code splitting
- Error boundaries for fault tolerance

## Common Development Tasks

### Adding a New API Endpoint
1. Create view in appropriate app's `views.py`
2. Add serializer in `serializers.py`
3. Register URL in app's `urls.py`
4. Add permissions if needed
5. Create tests in `tests/`

### Adding a New Frontend Feature
1. Create components in feature folder
2. Add types in `types/` directory
3. Create API service in `services/`
4. Add route if needed
5. Update relevant dashboard/page

### Debugging Tips
- Django Debug Toolbar enabled in development
- Frontend uses React DevTools
- Check browser console for API errors
- Django logs in `capimax_backend/logs/`
- Use `npm run type-check` to catch TypeScript errors