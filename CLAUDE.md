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

Settings structure: `capimax_backend/settings/` with base.py, development.py, production.py, staging.py, testing.py

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
python manage.py test <app_name>  # Specific app tests

# Run tests with coverage (pytest)
pytest --cov=. --cov-report=html --cov-report=term-missing --cov-fail-under=85

# Make migrations
python manage.py makemigrations <app_name>

# Check for issues
python manage.py check

# Validate production readiness
python validate_production_readiness.py

# Collect static files for production
python manage.py collectstatic
```

### Frontend
```bash
cd capimax-preview

# Install dependencies
npm install

# Start development server (port 5173, falls back to 5174)
npm run dev

# Build for production
npm run build

# Run linting (ESLint)
npm run lint

# Type checking
tsc --noEmit

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

## Testing Configuration

### Backend Testing
- **Framework**: pytest with Django integration (`pytest.ini` configured)
- **Coverage requirement**: 85% minimum
- **Test discovery**: `tests.py`, `test_*.py`, `*_tests.py`
- **Settings**: Uses `capimax_backend.settings_test`
- **Markers available**: unit, integration, websocket, performance, slow
- **Test location**: Each app's `tests/` directory

### Frontend Testing
- No testing framework currently configured
- Missing jest/vitest and react-testing-library

## Production Deployment

### Docker Compose Setup
Production deployment uses comprehensive Docker Compose configuration with:
- **Gunicorn**: 4 workers with gevent, 1000 connections
- **PostgreSQL 15**: Performance-optimized configuration
- **Redis**: For caching and WebSocket support
- **Celery**: Background tasks with beat scheduler
- **Nginx**: Reverse proxy with SSL support
- **Monitoring**: Prometheus and Grafana integration

### Production Commands
```bash
# Deploy with Docker
docker-compose up -d

# Production readiness check
python validate_production_readiness.py
```

## Code Organization Patterns

### Backend API Patterns
- **Views**: DRF ViewSets in each app's `views.py`
- **Serializers**: Validation and data transformation in `serializers.py`
- **Permissions**: Custom role-based permissions
- **Response Format**: Standardized via `core.utils`
- **Authentication**: JWT with SimpleJWT, supports 2FA

### Frontend Structure
```
src/
├── components/      # Feature-based organization
├── services/       # API service layer with centralized client
├── types/          # TypeScript definitions
├── hooks/          # Custom React hooks
├── contexts/       # React contexts for global state
├── pages/          # Route components
└── utils/          # Shared utilities
```

### Database Models
Key relationships:
- Custom User model extending Django's User
- Property → TokenizedProperty (one-to-one)
- User → Investment → Property (many-to-many through Investment)
- Payment supports multiple providers (Stripe, PayPal, Crypto)

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

## WebSocket Integration

WebSocket connections for real-time features:
- Connection URL: `ws://localhost:8000/ws/`
- Channels: notifications, dashboard updates, investment tracking
- Authentication via JWT token in connection params
- Django Channels with Redis backend

## Blockchain Integration

- Separate requirements: `requirements_blockchain.txt`
- Web3.py for smart contract interaction
- Brownie framework for contract development
- IPFS support for metadata storage
- Ganache for local blockchain testing