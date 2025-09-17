 Complete Capimax Platform User Flows Documentation

  1. USER AUTHENTICATION & REGISTRATION FLOWS

  1.1 User Registration Flow

  Route: /register → POST /api/v1/auth/register/

  Step-by-step Flow:
  1. User Input:
    - Email, password, first_name, last_name, role, phone (optional), country
  2. Email Availability Check: GET /api/v1/auth/check-email/
  3. Registration Submission: POST /api/v1/auth/register/
  4. Email Verification Sent: System sends verification email
  5. Email Verification: User clicks link → POST /api/v1/auth/email/verify/
  6. Account Activated: User can now login

  Expected Inputs/Outputs:
  - Input: Registration form data
  - Output: Success message + verification email sent
  - Error: Validation errors, email already exists

  1.2 User Login Flow

  Route: /login → POST /api/v1/auth/login/

  Step-by-step Flow:
  1. User Credentials: Email + password
  2. 2FA Check: If enabled, prompt for 2FA code
  3. Authentication: POST /api/v1/auth/login/
  4. JWT Tokens: Receive access + refresh tokens
  5. Profile Load: GET /api/v1/auth/profile/
  6. Route to Dashboard: Based on user role

  Expected Inputs/Outputs:
  - Input: Email, password, 2FA code (if enabled)
  - Output: JWT tokens + user profile
  - Redirect: /dashboard or role-specific page

  1.3 Two-Factor Authentication Setup Flow

  Routes: /2fa/setup, /2fa/verify, /2fa/disable

  Step-by-step Flow:
  1. Setup Request: POST /api/v1/auth/2fa/setup/
  2. QR Code Display: Show QR code for authenticator app
  3. Verification: User scans QR + enters code
  4. Confirm: POST /api/v1/auth/2fa/verify/
  5. Backup Codes: Display recovery codes
  6. 2FA Activated: Future logins require 2FA

  ---
  2. KYC & VERIFICATION FLOWS

  2.1 KYC Document Submission Flow

  Route: /kyc → Various KYC endpoints

  Step-by-step Flow:
  1. KYC Status Check: GET /api/v1/kyc/status/
  2. Requirements Display: GET /api/v1/kyc/requirements/
  3. Document Upload:
    - Identity: POST /api/v1/kyc/documents/upload/ (passport/ID)
    - Address: POST /api/v1/kyc/documents/upload/ (utility bill)
    - Financial: POST /api/v1/kyc/documents/upload/ (bank statement)
  4. Biometric Verification:
    - POST /api/v1/kyc/biometric/start/
    - Face capture + liveness check
    - POST /api/v1/kyc/biometric/complete/
  5. Compliance Checks: POST /api/v1/kyc/compliance/run/
  6. KYC Submission: POST /api/v1/kyc/submit/
  7. Admin Review: Pending approval
  8. Status Updates: Real-time via WebSocket + notifications

  Expected Inputs/Outputs:
  - Input: Identity documents, address proof, biometric data
  - Output: KYC status updates, approval/rejection notifications

  2.2 KYC Admin Review Flow

  Admin-only endpoints:

  Step-by-step Flow:
  1. Pending Reviews: GET /api/v1/kyc/admin/pending/
  2. Document Review: Verify uploaded documents
  3. OCR Data Check: GET /api/v1/kyc/documents/{id}/ocr/
  4. Compliance Review: Check automated compliance results
  5. Admin Decision:
    - Approve: POST /api/v1/kyc/admin/approve/{id}/
    - Reject: POST /api/v1/kyc/admin/reject/{id}/
  6. User Notification: Automatic notification sent
  7. Audit Log: GET /api/v1/kyc/{id}/audit/

  ---
  3. PROPERTY MANAGEMENT FLOWS

  3.1 Property Listing Flow (Property Owners)

  Route: Property creation via API

  Step-by-step Flow:
  1. Property Creation: POST /api/v1/properties/
    - Basic details, location, value, tokenization parameters
  2. Image Upload: POST /api/v1/properties/{id}/images/
  3. Document Upload: POST /api/v1/properties/{id}/documents/
    - Legal documents, valuations, permits
  4. Property Category Selection:
    - UNDER_CONSTRUCTION or READY_PROPERTY
  5. Construction Details (if applicable):
    - Progress percentage, milestones, completion date
  6. Rental Details (if ready property):
    - Monthly income, occupancy rate, lease agreements
  7. Tokenization Setup:
    - Total tokens, token price, expected returns
  8. Submit for Approval: Property status → PENDING_APPROVAL
  9. Admin Review: POST /api/v1/properties/{id}/approve/
  10. Property Goes Live: Status → ACTIVE

  3.2 Property Search & Discovery Flow

  Route: /properties → Property browsing

  Step-by-step Flow:
  1. Property List: GET /api/v1/properties/
  2. Filter Options:
    - Property type, location, price range, returns
    - Category: Construction vs Ready
  3. Advanced Search: POST /api/v1/properties/search/
  4. Property Details: GET /api/v1/properties/{id}/
  5. Property Analytics: GET /api/v1/properties/{id}/analytics/
  6. Market Insights: GET /api/v1/properties/market/insights/

  ---
  4. INVESTMENT FLOWS

  4.1 Investment Flow - Ready Properties

  Route: Property page → Investment process

  Step-by-step Flow:
  1. Property Selection: Choose property from listings
  2. Investment Calculator: POST /api/v1/investments/calculate/
  3. Token Amount Selection: Choose number of tokens
  4. Investment Creation: POST /api/v1/investments/
  5. Payment Method Selection:
    - Credit card, crypto, bank transfer, wallet balance
  6. Payment Processing: (See Payment Flows)
  7. Investment Confirmation: Status → COMPLETED
  8. Token Allocation: Tokens added to portfolio
  9. Dividend Setup: Automatic quarterly distributions
  10. Portfolio Update: GET /api/v1/portfolio/summary/

  4.2 Investment Flow - Under Construction Properties

  Route: Pre-construction investment

  Step-by-step Flow:
  1. Property Selection: Under construction property
  2. Reservation Calculator: Calculate reservation amount
  3. Installment Options:
    - Full payment or installment plan
    - Monthly/quarterly payments
  4. Installment Setup: POST /api/v1/properties/installments/
  5. Initial Payment: First installment
  6. Installment Schedule: Automatic recurring payments
  7. Construction Updates: Real-time progress via WebSocket
  8. Completion: Property completes → tokens activated
  9. Rental Income: Starts generating returns

  4.3 Portfolio Management Flow

  Route: /dashboard → Portfolio section

  Step-by-step Flow:
  1. Portfolio Summary: GET /api/v1/portfolio/summary/
  2. Performance Analytics: GET /api/v1/portfolio/performance/
  3. Investment List: GET /api/v1/investments/
  4. Dividend History: GET /api/v1/dividends/
  5. Auto-Investment Setup: POST /api/v1/auto-invest/
  6. Investment Recommendations: GET /api/v1/recommendations/
  7. Withdrawal Requests: POST /api/v1/withdrawals/

  ---
  5. PAYMENT PROCESSING FLOWS

  5.1 Credit Card Payment Flow

  Integration: Stripe

  Step-by-step Flow:
  1. Payment Method: POST /api/v1/payments/methods/ (save card)
  2. Payment Intent: POST /api/v1/payments/stripe/create-payment-intent/
  3. Frontend Processing: Stripe Elements integration
  4. Payment Confirmation: POST /api/v1/payments/stripe/confirm-payment/
  5. Payment Success: Investment status updated
  6. Receipt Generation: Email + in-app notification

  5.2 Cryptocurrency Payment Flow

  Supported: BTC, ETH, USDC

  Step-by-step Flow:
  1. Crypto Quote: POST /api/v1/payments/crypto/get-quote/
  2. Payment Creation: POST /api/v1/payments/crypto/create-payment/
  3. Wallet Address: User sends to provided address
  4. Payment Monitoring: Blockchain transaction tracking
  5. Confirmation: POST /api/v1/payments/crypto/verify-payment/
  6. Investment Processing: Tokens allocated

  5.3 Wallet Management Flow

  Route: /wallet

  Step-by-step Flow:
  1. Wallet Balance: GET /api/v1/payments/wallet/
  2. Deposit Funds: POST /api/v1/payments/wallet/deposit/
  3. Withdraw Funds: POST /api/v1/payments/wallet/withdraw/
  4. Internal Transfers: POST /api/v1/payments/wallet/transfer/
  5. Transaction History: GET /api/v1/payments/wallet/transactions/
  6. Recurring Payments: Auto-deduct for investments

  5.4 Refund Processing Flow

  Route: Refund management

  Step-by-step Flow:
  1. Refund Request: POST /api/v1/payments/refunds/
  2. Admin Review: Validate refund eligibility
  3. Refund Processing: Process via original payment method
  4. Token Reclaim: Remove tokens from portfolio
  5. Refund Completion: Notification sent

  ---
  6. DASHBOARD & ANALYTICS FLOWS

  6.1 Investor Dashboard Flow

  Route: /dashboard

  Step-by-step Flow:
  1. Dashboard Stats: GET /api/v1/dashboard/stats/
  2. Portfolio Overview: Total invested, current value, ROI
  3. Recent Activity: Latest investments, dividends
  4. Performance Charts: Time-series data
  5. Property Updates: Construction progress, news
  6. Upcoming Payments: Installments, dividends
  7. Recommendations: Suggested investments

  6.2 Property Owner Dashboard

  Route: Property owner view

  Step-by-step Flow:
  1. Property List: Owned properties + status
  2. Revenue Analytics: Rental income, token sales
  3. Investment Tracking: Funding progress
  4. Construction Updates: Milestone progress
  5. Investor Communications: Updates, announcements
  6. Financial Reports: Income statements, distributions

  6.3 Analytics Flow

  Route: Advanced analytics

  Step-by-step Flow:
  1. Portfolio Analytics: GET /api/v1/analytics/portfolio/
  2. Market Comparison: Benchmark against market
  3. Risk Metrics: Volatility, diversification
  4. Geographic Distribution: Investment locations
  5. Sector Allocation: Property type breakdown
  6. Performance Attribution: Return sources

  ---
  7. NOTIFICATION & REAL-TIME FLOWS

  7.1 Notification System Flow

  Real-time notifications

  Step-by-step Flow:
  1. WebSocket Connection: wss://api.capimax.com/ws/notifications/{user_id}/
  2. Notification Types:
    - Investment confirmations
    - Dividend payments
    - KYC status updates
    - Property updates
    - Payment confirmations
  3. Notification List: GET /api/v1/notifications/
  4. Mark as Read: POST /api/v1/notifications/mark-read/
  5. Preferences: GET/POST /api/v1/notifications/preferences/
  6. Email Notifications: Parallel email delivery

  7.2 Real-time Updates Flow

  WebSocket integration

  Step-by-step Flow:
  1. Property Updates: wss://api.capimax.com/ws/property/{property_id}/
  2. Construction Progress: Real-time percentage updates
  3. Investment Activity: Live funding progress
  4. Market Data: Price changes, new listings
  5. Portfolio Changes: Balance updates, new dividends

  ---
  8. BROKER & COMMISSION FLOWS

  8.1 Broker Registration & Verification

  Route: Broker-specific registration

  Step-by-step Flow:
  1. Broker Registration: Role = 'broker'
  2. Additional KYC: Business documents, licenses
  3. Verification Submission: POST /api/v1/broker/verification/submit/
  4. Admin Approval: Business verification
  5. Broker Profile: GET/POST /api/v1/broker/profile/
  6. Dashboard Access: GET /api/v1/broker/dashboard/

  8.2 Referral & Commission Flow

  Route: Broker referral system

  Step-by-step Flow:
  1. Referral Link: POST /api/v1/broker/referrals/generate/
  2. Client Registration: Via referral link
  3. Investment Tracking: Monitor referred client investments
  4. Commission Calculation: Automatic on investment completion
  5. Commission List: GET /api/v1/broker/commissions/
  6. Commission Payment: Monthly/quarterly payouts
  7. Performance Metrics: GET /api/v1/broker/performance/

  8.3 Marketing Materials Flow

  Route: Broker marketing support

  Step-by-step Flow:
  1. Materials List: GET /api/v1/broker/materials/
  2. Download Assets: GET /api/v1/broker/materials/{id}/download/
  3. Custom Branding: Personalized materials
  4. Performance Tracking: Click-through rates
  5. Commission Attribution: Track conversions

  ---
  9. CONSTRUCTION TRACKING FLOWS

  9.1 Construction Progress Flow

  Route: Construction management

  Step-by-step Flow:
  1. Milestone Creation: POST /api/v1/construction/milestones/
  2. Progress Updates: Regular percentage updates
  3. Photo Documentation: Progress photos upload
  4. Investor Updates: Real-time notifications
  5. Verification Required: Third-party confirmation
  6. Milestone Completion: POST /api/v1/construction/milestones/{id}/complete/
  7. Final Completion: Property status → READY_PROPERTY

  ---
  10. MARKETPLACE & TRADING FLOWS

  10.1 Secondary Market Flow

  Route: Token trading marketplace

  Step-by-step Flow:
  1. List Tokens: POST /api/v1/marketplace/listings/
  2. Market Browse: Available token listings
  3. Buy Order: Purchase from secondary market
  4. Transfer Processing: Token ownership change
  5. Settlement: Payment processing
  6. Portfolio Update: New token allocation

  ---
  11. ADMIN FLOWS

  11.1 Property Approval Flow

  Admin-only functions

  Step-by-step Flow:
  1. Pending Properties: Admin review queue
  2. Due Diligence: Document verification
  3. Valuation Review: Independent assessment
  4. Legal Review: Compliance check
  5. Approval Decision: Approve/reject property
  6. Owner Notification: Status update
  7. Property Activation: Goes live for investment

  11.2 System Monitoring Flow

  Admin system management

  Step-by-step Flow:
  1. System Alerts: GET /api/v1/notifications/admin/system-alerts/
  2. Performance Monitoring: Server metrics
  3. User Activity: Activity logs
  4. Financial Reconciliation: Payment matching
  5. Compliance Monitoring: Regulatory compliance
  6. Issue Resolution: POST /api/v1/notifications/admin/system-alerts/{id}/resolve/

  ---
  TESTING CHECKLIST FOR EACH FLOW

  For each flow above, verify:

  1. Authentication: Proper JWT token handling
  2. Authorization: Role-based access control
  3. Validation: Input validation and error handling
  4. State Management: Proper status transitions
  5. Notifications: Appropriate notifications sent
  6. Database: Data persistence and consistency
  7. API Responses: Correct response formats
  8. WebSocket: Real-time updates functioning
  9. Email: Email notifications delivered
  10. Error Handling: Graceful failure handling

  This documentation covers all active user flows implemented in the Capimax platform. Each flow can be tested end-to-end by following the step-by-step instructions and
  verifying the expected inputs/outputs at each stage.