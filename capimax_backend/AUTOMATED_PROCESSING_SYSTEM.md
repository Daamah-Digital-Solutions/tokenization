# Automated Processing System for Capimax Platform

## Overview

This document describes the comprehensive automated processing system implemented for the Capimax real estate tokenization platform. The system provides automated installment payment processing and rental income distribution with minimal manual intervention.

## Architecture

### Core Components

1. **Services Layer** (`services.py`)
   - `InstallmentProcessingService`: Handles automated installment payment collection
   - `RentalIncomeService`: Manages rental income distribution processing

2. **Task Layer** (`tasks.py`) 
   - Celery-based asynchronous task processing
   - Scheduled periodic tasks for automation
   - Retry mechanisms and error handling

3. **API Layer** (`views.py`)
   - RESTful endpoints for management and monitoring
   - Role-based access control
   - Real-time processing triggers

4. **Notification System** (`notifications/`)
   - Multi-channel notification delivery
   - User preference management
   - Automated email templates

## Installment Payment Processing System

### Features

#### Automated Payment Collection
- **Daily Processing**: Automatically processes due installment payments
- **Multiple Payment Methods**: Supports wallet balance, credit cards, bank transfers
- **Graduated Token Release**: Releases tokens progressively with each payment
- **Late Payment Handling**: Applies fees and handles overdue payments
- **Payment Reminders**: Sends notifications before due dates

#### Key Components

**InstallmentProcessingService** (`properties/services.py`)
```python
class InstallmentProcessingService:
    def process_due_payments(self, max_payments=100)
    def send_payment_reminders(self, days_before_due=3)
    def process_late_payments(self, grace_period_days=None)
```

**Automated Tasks** (`properties/tasks.py`)
- `process_due_installments`: Daily task to process due payments
- `send_payment_reminders`: Daily reminder notifications
- `process_late_payments`: Handle overdue payments and fees
- `process_installment_payment`: Individual payment processing
- `release_tokens_for_completed_installment`: Token release management

#### API Endpoints

**Installment Management** (`/api/v1/properties/installments/`)
- `GET /`: List user's installment plans
- `POST /`: Create new installment plan
- `POST /{id}/process-payment/`: Process manual payment
- `GET /{id}/payment-schedule/`: View payment schedule
- `POST /{id}/cancel/`: Cancel installment plan
- `GET /statistics/`: User installment statistics

### Configuration

**Celery Beat Schedule**
```python
'process-due-installments': {
    'task': 'properties.tasks.process_due_installments',
    'schedule': 60.0 * 60.0 * 24.0,  # Daily
}

'send-payment-reminders': {
    'task': 'properties.tasks.send_payment_reminders',
    'schedule': 60.0 * 60.0 * 24.0,  # Daily
    'kwargs': {'days_before_due': 3},
}
```

### Error Handling

- **Retry Mechanisms**: Failed payments automatically retry with exponential backoff
- **System Alerts**: Failed processes generate admin notifications
- **Audit Trail**: Complete transaction logging for all payment activities
- **Graceful Degradation**: System continues operating even if individual payments fail

## Rental Income Distribution System

### Features

#### Automated Distribution Processing
- **Monthly Processing**: Automatically distributes rental income to token holders
- **Multi-Currency Support**: Handles USD, EUR, AED, and cryptocurrencies
- **Proportional Distribution**: Distributes income based on token ownership
- **Platform Fee Calculation**: Automatically deducts platform commission
- **Performance Analytics**: Tracks yield and distribution efficiency

#### Key Components

**RentalIncomeService** (`core/services/rental_income_service.py`)
```python
class RentalIncomeService:
    def process_monthly_distributions(self, target_month=None, property_ids=None)
    def collect_property_rental_income(self, property_ids=None)
    def generate_distribution_report(self, period, property_ids=None)
```

**Automated Tasks** (`core/tasks.py`)
- `distribute_monthly_rental_income`: Monthly distribution processing
- `collect_rental_income`: Weekly income data collection
- `distribute_rental_income_to_investor`: Individual investor payouts
- `calculate_rental_distribution`: Distribution calculations
- `generate_rental_distribution_report`: Automated reporting

#### API Endpoints

**Rental Distribution Management** (`/api/v1/properties/rental-distributions/`)
- `GET /`: List user's rental income distributions
- `GET /by-property/{id}/`: Distributions for specific property
- `GET /user-statistics/`: User rental income statistics
- `GET /period-report/{period}/`: Period-specific reports

**Admin Management** (`/api/v1/properties/rental-income/management/`)
- `POST /trigger-distribution/`: Manually trigger distribution
- `POST /collect-income/`: Trigger income collection
- `POST /update-property-income/`: Update property income data
- `GET /generate-report/{period}/`: Generate detailed reports

### Configuration

**Celery Beat Schedule**
```python
'distribute-monthly-rental-income': {
    'task': 'core.tasks.distribute_monthly_rental_income',
    'schedule': 60.0 * 60.0 * 24.0 * 30.0,  # Monthly
}

'collect-rental-income': {
    'task': 'core.tasks.collect_rental_income',
    'schedule': 60.0 * 60.0 * 24.0 * 7.0,  # Weekly
}
```

## Blockchain Integration

### Smart Contract Interactions

**BlockchainService** (`blockchain/services.py`)
- Token transfer automation
- Smart contract deployment
- Transaction status monitoring
- Wallet address validation

**Features**
- Automated token releases for completed installments
- Rental income distribution via smart contracts
- Multi-network support (Ethereum, Polygon)
- Transaction confirmation monitoring

## Notification System

### Enhanced Notification Features

**Automated Notifications** (`notifications/tasks.py`)
- Email delivery with retry mechanisms
- Bulk notification processing
- Digest notifications (daily/weekly)
- Template-based messaging
- Multi-channel delivery (email, in-app, SMS)

**Notification Types**
- Payment confirmations and failures
- Installment reminders and late notices
- Rental income distribution notifications
- System alerts and maintenance notices
- User preference-based filtering

### Email Templates

**Supported Templates**
- `installment_reminder`: Payment due reminders
- `payment_confirmation`: Successful payment confirmations
- `rental_distribution`: Rental income notifications
- `late_payment`: Overdue payment notices
- `weekly_digest`: Summary notifications

## Monitoring and Analytics

### System Monitoring

**SystemAlert Creation**
- Automated alerts for processing failures
- Performance metric tracking
- Distribution efficiency monitoring
- Payment success rate tracking

**Dashboard Integration**
- Real-time processing status
- Financial metrics and KPIs
- Error rate monitoring
- User activity tracking

### Reporting

**Automated Reports**
- Monthly distribution summaries
- Payment processing statistics
- Revenue and commission tracking
- Investor payout histories
- Property performance analytics

## Security and Compliance

### Security Features

- **Role-based Access Control**: Admin-only management endpoints
- **Transaction Audit Trail**: Complete logging of all financial operations
- **Data Encryption**: Sensitive financial data protection
- **Rate Limiting**: API endpoint protection
- **Input Validation**: Comprehensive data validation

### Compliance

- **Financial Regulations**: Automated tax calculation support
- **Audit Requirements**: Comprehensive transaction logging
- **Data Retention**: Configurable data retention policies
- **Privacy Protection**: User data anonymization options

## Testing

### Test Coverage

**Unit Tests** (`tests/`)
- Service layer testing (`test_installment_processing.py`)
- Task execution testing (`test_rental_income_processing.py`)
- Model behavior validation
- API endpoint testing

**Integration Tests**
- End-to-end payment processing
- Multi-component interaction testing
- Blockchain integration testing
- Notification delivery testing

**Performance Tests**
- Bulk payment processing
- Concurrent user handling
- Database performance optimization
- Memory usage monitoring

### Test Execution

```bash
# Run installment processing tests
python manage.py test properties.tests.test_installment_processing

# Run rental income tests
python manage.py test core.tests.test_rental_income_processing

# Run all automation tests
python manage.py test properties.tests core.tests --pattern="*processing*"
```

## Deployment and Operations

### Production Requirements

**Infrastructure**
- Redis server for Celery message broker
- PostgreSQL database with connection pooling
- SMTP server for email delivery
- Blockchain node access (Infura, Alchemy)

**Environment Variables**
```bash
# Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@domain.com
EMAIL_HOST_PASSWORD=your-app-password

# Blockchain Configuration
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/your-project-id
BLOCKCHAIN_PRIVATE_KEY=your-private-key
```

**Celery Worker Setup**
```bash
# Start Celery worker
celery -A capimax_backend worker -l info

# Start Celery beat scheduler
celery -A capimax_backend beat -l info

# Monitor Celery with Flower (optional)
celery -A capimax_backend flower
```

### Monitoring and Maintenance

**Health Checks**
- Task execution monitoring
- Queue size monitoring
- Error rate tracking
- Performance metrics collection

**Maintenance Tasks**
- Log rotation and cleanup
- Database optimization
- Cache clearing
- Error notification cleanup

## API Documentation

### Authentication

All API endpoints require authentication using JWT tokens:

```bash
# Get access token
POST /api/v1/auth/login/
{
  "email": "user@example.com",
  "password": "your-password"
}

# Use token in requests
Authorization: Bearer your-jwt-token
```

### Example API Usage

**Create Installment Plan**
```bash
POST /api/v1/properties/installments/
{
  "property_investment": "property-uuid",
  "total_investment_amount": "10000.00",
  "token_allocation": 100,
  "installment_amount": "1000.00",
  "total_installments": 10,
  "frequency": "monthly",
  "graduated_release": true
}
```

**Process Payment**
```bash
POST /api/v1/properties/installments/{id}/process-payment/
{
  "amount": "1000.00",
  "payment_method": "wallet"
}
```

**Trigger Distribution (Admin)**
```bash
POST /api/v1/properties/rental-income/management/
{
  "action": "trigger_distribution",
  "target_month": "2024-01"
}
```

## Troubleshooting

### Common Issues

**Payment Processing Failures**
- Check wallet balance sufficiency
- Verify payment method configuration
- Review blockchain network status
- Check rate limiting thresholds

**Distribution Issues**
- Verify property rental income settings
- Check investor token holdings
- Review occupancy rate configurations
- Validate period format (YYYY-MM)

**Task Processing Delays**
- Monitor Celery worker status
- Check Redis connection health
- Review task queue sizes
- Verify beat scheduler operation

### Log Analysis

**Key Log Locations**
- Application logs: `logs/django.log`
- Celery worker logs: Standard output
- Email delivery logs: Database (`EmailLog` model)
- System alerts: Database (`SystemAlert` model)

**Debugging Commands**
```bash
# Check Celery task status
celery -A capimax_backend inspect active

# View recent tasks
celery -A capimax_backend inspect scheduled

# Monitor queue sizes
celery -A capimax_backend inspect stats
```

## Performance Optimization

### Database Optimization

- Index optimization for frequent queries
- Connection pooling configuration
- Query result caching
- Bulk operation optimization

### Task Optimization

- Batch processing for large datasets
- Queue prioritization
- Rate limiting configuration
- Memory usage optimization

### Scaling Considerations

- Horizontal worker scaling
- Database read replica usage
- Cache layer implementation
- Load balancing configuration

## Future Enhancements

### Planned Features

1. **Machine Learning Integration**
   - Predictive payment failure analysis
   - Optimal distribution timing
   - User behavior analysis

2. **Advanced Reporting**
   - Custom report generation
   - Export functionality
   - Real-time dashboards

3. **Enhanced Security**
   - Multi-signature wallet support
   - Hardware security module integration
   - Advanced fraud detection

4. **International Support**
   - Multi-currency rental income
   - International banking integration
   - Regulatory compliance automation

## Support and Maintenance

### Contact Information

- **Development Team**: dev@capimax.com
- **System Administration**: ops@capimax.com
- **Emergency Support**: +1-xxx-xxx-xxxx

### Documentation Updates

This document is maintained alongside code changes. For the latest version, check the project repository or contact the development team.

---

**Last Updated**: January 2025
**Version**: 1.0
**Author**: Capimax Development Team