# Capimax Platform User Workflow Documentation

This document provides comprehensive workflow documentation for all user types on the Capimax Real Estate Tokenization Platform.

## Table of Contents

1. [User Registration & Authentication](#user-registration--authentication)
2. [KYC Verification Process](#kyc-verification-process)
3. [Investor Workflows](#investor-workflows)
4. [Property Owner Workflows](#property-owner-workflows)
5. [Broker Workflows](#broker-workflows)
6. [Admin Workflows](#admin-workflows)
7. [Payment Processing](#payment-processing)
8. [Real-time Features](#real-time-features)

---

## User Registration & Authentication

### 1. User Registration Process

#### Standard Registration
1. **Navigate to Registration**: Access `/auth/register` endpoint
2. **Provide Basic Information**:
   ```json
   {
     "email": "user@example.com",
     "password": "SecurePassword123!",
     "password_confirm": "SecurePassword123!",
     "first_name": "John",
     "last_name": "Doe",
     "role": "investor",
     "phone_number": "+1234567890",
     "country": "US"
   }
   ```
3. **Email Verification**: 
   - System sends verification email
   - User clicks verification link
   - Account becomes active

#### Two-Factor Authentication Setup
1. **Login to Account**: First-time login after registration
2. **Access Security Settings**: Navigate to account security
3. **Setup 2FA**:
   - Scan QR code with authenticator app
   - Enter verification code
   - Save backup codes securely

### 2. Login Process

#### Standard Login
```http
POST /api/v1/auth/login/
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### Login with 2FA
```http
POST /api/v1/auth/login/
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "totp_code": "123456"
}
```

#### Response Structure
```json
{
  "access": "jwt_access_token",
  "refresh": "jwt_refresh_token",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "investor",
    "kyc_status": "verified",
    "profile": {...}
  }
}
```

---

## KYC Verification Process

### 1. Document Submission

#### Required Documents
- **Individual Investors**:
  - Government-issued ID (passport, driver's license)
  - Proof of address (utility bill, bank statement)
  - Selfie with ID

- **Institutional Investors**:
  - Certificate of incorporation
  - Proof of address for business
  - Authorized representative ID
  - Board resolution

#### Submission Process
```http
POST /api/v1/kyc/documents/
Content-Type: multipart/form-data

{
  "document_type": "government_id",
  "document_file": [binary file data],
  "country_of_issue": "US"
}
```

### 2. Verification Workflow

1. **Document Upload**: User uploads required documents
2. **Automatic Processing**: AI-powered document verification
3. **Manual Review**: Human review for complex cases
4. **Status Updates**: Real-time status notifications
5. **Approval/Rejection**: Final decision with feedback

#### Status Tracking
```http
GET /api/v1/kyc/status/
```

```json
{
  "status": "in_review",
  "documents": [
    {
      "type": "government_id",
      "status": "approved",
      "uploaded_at": "2024-01-15T10:30:00Z"
    },
    {
      "type": "proof_of_address",
      "status": "pending_review",
      "uploaded_at": "2024-01-15T10:35:00Z"
    }
  ],
  "estimated_completion": "2024-01-17T00:00:00Z"
}
```

---

## Investor Workflows

### 1. Property Discovery

#### Browse Properties
```http
GET /api/v1/properties/?status=active&min_investment=1000&max_investment=50000
```

#### Search and Filter
- **Location filtering**: City, state, country
- **Property type**: Residential, commercial, industrial
- **Investment range**: Minimum and maximum amounts
- **Expected returns**: ROI filtering
- **Risk level**: Conservative, moderate, aggressive

#### Property Details
```http
GET /api/v1/properties/{property_id}/
```

### 2. Investment Process

#### Step 1: Review Property
- **Financial metrics**: ROI, projected returns, rental yield
- **Property documentation**: Legal documents, inspections
- **Market analysis**: Location insights, growth projections
- **Construction timeline**: For new developments

#### Step 2: Token Reservation
```http
POST /api/v1/investments/reserve/
{
  "property_id": 123,
  "token_amount": 100,
  "investment_amount": 10000.00
}
```

#### Step 3: Payment Processing
1. **Choose payment method**: Credit card, bank transfer, crypto
2. **Complete payment**: Process transaction
3. **Token allocation**: Automatic token distribution to wallet

#### Step 4: Investment Confirmation
- **Transaction receipt**: Detailed investment summary
- **Token certificate**: Proof of ownership
- **Wallet integration**: Tokens appear in user's wallet

### 3. Portfolio Management

#### View Portfolio
```http
GET /api/v1/dashboard/investor/portfolio/
```

```json
{
  "total_invested": 150000.00,
  "current_value": 162000.00,
  "total_return": 12000.00,
  "return_percentage": 8.0,
  "investments": [
    {
      "property_id": 123,
      "property_name": "Downtown Miami Apartments",
      "tokens_owned": 100,
      "initial_investment": 10000.00,
      "current_value": 10800.00,
      "return": 800.00,
      "return_percentage": 8.0
    }
  ]
}
```

#### Dividend Tracking
- **Automatic distributions**: Monthly or quarterly payments
- **Payment history**: Complete transaction records
- **Tax reporting**: Annual tax documents

### 4. Secondary Market Trading

#### List Tokens for Sale
```http
POST /api/v1/marketplace/listings/
{
  "property_id": 123,
  "tokens_for_sale": 50,
  "price_per_token": 108.00,
  "listing_duration_days": 30
}
```

#### Purchase from Secondary Market
```http
POST /api/v1/marketplace/purchase/
{
  "listing_id": 456,
  "tokens_to_buy": 25,
  "total_amount": 2700.00
}
```

---

## Property Owner Workflows

### 1. Property Listing Process

#### Initial Property Submission
```http
POST /api/v1/properties/
{
  "title": "Downtown Miami Luxury Apartments",
  "description": "Modern 24-unit apartment complex in prime location",
  "property_type": "residential",
  "location": {
    "address": "123 Main St",
    "city": "Miami",
    "state": "FL",
    "country": "US",
    "zipcode": "33101"
  },
  "financial_details": {
    "property_value": 5000000.00,
    "total_tokens": 50000,
    "token_price": 100.00,
    "minimum_investment": 1000.00,
    "expected_annual_return": 8.5
  }
}
```

#### Document Upload
- **Property deed**: Legal ownership proof
- **Financial statements**: Income/expense projections
- **Inspection reports**: Professional property assessments
- **Insurance documentation**: Coverage details
- **Permits and licenses**: All required legal documents

### 2. Tokenization Setup

#### Token Configuration
```http
POST /api/v1/properties/{property_id}/tokenize/
{
  "total_supply": 50000,
  "token_symbol": "DMLA",
  "token_name": "Downtown Miami Luxury Apartments",
  "initial_price": 100.00,
  "minimum_investment": 1000.00
}
```

#### Smart Contract Deployment
- **Contract creation**: Automatic blockchain deployment
- **Token distribution**: Initial token allocation
- **Ownership verification**: Blockchain proof of ownership

### 3. Property Management

#### Update Property Information
```http
PATCH /api/v1/properties/{property_id}/
{
  "rental_income": 45000.00,
  "occupancy_rate": 95.0,
  "maintenance_costs": 5000.00
}
```

#### Dividend Distribution
```http
POST /api/v1/properties/{property_id}/distribute-dividends/
{
  "total_amount": 18750.00,
  "distribution_date": "2024-01-31",
  "period": "Q1 2024"
}
```

### 4. Investor Relations

#### Communication with Investors
- **Regular updates**: Monthly property reports
- **Financial statements**: Quarterly earnings
- **Major announcements**: Property improvements, changes

#### Performance Reporting
```http
GET /api/v1/properties/{property_id}/performance/
```

---

## Broker Workflows

### 1. Client Management

#### Register Client Properties
```http
POST /api/v1/broker/clients/
{
  "client_name": "ABC Real Estate LLC",
  "contact_email": "contact@abcrealestate.com",
  "properties_managed": ["property_id_1", "property_id_2"]
}
```

#### Commission Tracking
```http
GET /api/v1/broker/commissions/
```

### 2. Property Promotion

#### Marketing Activities
- **Social media promotion**: Automated posting
- **Email campaigns**: Targeted investor outreach
- **Performance analytics**: Marketing effectiveness tracking

#### Lead Management
```http
GET /api/v1/broker/leads/
```

```json
{
  "leads": [
    {
      "investor_id": 789,
      "property_interest": 123,
      "investment_amount": 25000.00,
      "status": "qualified",
      "last_contact": "2024-01-15T14:30:00Z"
    }
  ]
}
```

---

## Admin Workflows

### 1. User Management

#### Review User Applications
```http
GET /api/v1/admin/users/pending-approval/
```

#### Approve/Reject KYC
```http
POST /api/v1/admin/kyc/{kyc_id}/review/
{
  "status": "approved",
  "notes": "All documents verified successfully"
}
```

### 2. Property Oversight

#### Property Approval Process
```http
GET /api/v1/admin/properties/pending-approval/
```

```http
POST /api/v1/admin/properties/{property_id}/review/
{
  "status": "approved",
  "notes": "Property meets all listing requirements"
}
```

### 3. Platform Monitoring

#### System Analytics
```http
GET /api/v1/admin/analytics/platform-stats/
```

#### Risk Management
- **Transaction monitoring**: Suspicious activity detection
- **Compliance checking**: Regulatory adherence
- **Audit trails**: Complete activity logging

---

## Payment Processing

### 1. Payment Methods

#### Fiat Payments
- **Credit/Debit Cards**: Stripe integration
- **Bank Transfers**: ACH and wire transfers
- **PayPal**: Digital wallet payments

#### Cryptocurrency
- **Bitcoin**: BTC payments
- **Ethereum**: ETH and ERC-20 tokens
- **Stablecoins**: USDC, USDT

### 2. Payment Workflow

#### Process Investment Payment
```http
POST /api/v1/payments/process/
{
  "investment_id": 123,
  "payment_method": "stripe",
  "amount": 10000.00,
  "currency": "USD",
  "payment_details": {
    "stripe_payment_intent_id": "pi_1234567890"
  }
}
```

#### Payment Status Tracking
```http
GET /api/v1/payments/{payment_id}/status/
```

### 3. Refunds and Reversals

#### Process Refund
```http
POST /api/v1/payments/{payment_id}/refund/
{
  "amount": 5000.00,
  "reason": "Investment cancellation within cooling-off period"
}
```

---

## Real-time Features

### 1. WebSocket Connections

#### Connect to Notifications
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/notifications/');
ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    handleNotification(data);
};
```

#### Property Updates
```javascript
const propertyWs = new WebSocket('ws://localhost:8000/ws/property/123/');
propertyWs.onmessage = function(event) {
    const update = JSON.parse(event.data);
    updatePropertyDisplay(update);
};
```

### 2. Notification Types

#### Investment Notifications
- **Payment confirmations**: Successful investment processing
- **Token allocation**: When tokens are distributed
- **Dividend payments**: Regular income distributions

#### Property Notifications
- **Status changes**: Active, sold out, under construction
- **Price updates**: Token price changes
- **Document updates**: New financial reports

#### System Notifications
- **KYC updates**: Verification status changes
- **Security alerts**: Login attempts, password changes
- **Maintenance notices**: System downtime announcements

---

## Troubleshooting Common Issues

### Authentication Issues
1. **Invalid credentials**: Check email and password
2. **2FA problems**: Verify time synchronization
3. **Account locked**: Contact support after multiple failed attempts

### Payment Issues
1. **Failed transactions**: Check payment method validity
2. **Insufficient funds**: Verify account balance
3. **Currency conversion**: Confirm exchange rates

### Technical Issues
1. **Slow loading**: Check internet connection
2. **API errors**: Retry request or contact support
3. **WebSocket disconnections**: Automatic reconnection implemented

---

## Support and Contact Information

- **Email Support**: support@capimax.com
- **Live Chat**: Available 24/7 through platform
- **Phone Support**: +1-555-CAPIMAX (business hours)
- **Documentation**: https://docs.capimax.com
- **Status Page**: https://status.capimax.com

---

*This documentation is updated regularly. Last updated: January 2024*