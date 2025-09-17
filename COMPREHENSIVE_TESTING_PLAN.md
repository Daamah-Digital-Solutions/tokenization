# Capimax Platform - Comprehensive Testing Plan

This document provides a complete step-by-step testing guide for all user flows in the Capimax real estate tokenization platform.

## Pre-Testing Setup

### Required Servers
1. **Backend**: Django server running at `http://localhost:8000`
2. **Frontend**: React app running at `http://localhost:5173`
3. **Database**: PostgreSQL database connected and migrated

### Test Data Requirements
- Test user accounts for all roles (investor, property_owner, broker, admin)
- Sample properties in different states (draft, active, under construction, ready)
- Test payment methods and mock transaction data
- Sample KYC documents for verification testing

---

## 1. USER REGISTRATION & AUTHENTICATION FLOW TESTING

### 1.1 User Registration Flow
**Test URL**: `http://localhost:5173/register`

**Step-by-step Test Process**:

1. **Access Registration Page**
   - Navigate to `/register`
   - Verify all form fields are present
   - Test input validation (empty fields, invalid email format)

2. **Email Availability Check**
   - Enter existing email → Should show "Email already exists"
   - Enter new email → Should allow continuation

3. **Complete Registration Form**
   - Fill all required fields:
     - Email: `test.investor@example.com`
     - Password: Strong password with requirements
     - First Name: `Test`
     - Last Name: `Investor`
     - Role: Select `Investor`
     - Country: Select country
     - Phone: Optional field

4. **Submit Registration**
   - Click "Register" button
   - Verify API call to `/api/v1/auth/register/`
   - Check for success message
   - Verify email verification notice

5. **Email Verification (Mock)**
   - Check database for verification token
   - Manually verify or use admin panel
   - Test login after verification

**Expected Results**:
- ✅ User account created successfully
- ✅ Verification email sent (log check)
- ✅ Cannot login until verified
- ✅ Can login after verification

**Test Different User Roles**:
- Repeat for `property_owner`, `broker`, `admin` roles

### 1.2 User Login Flow
**Test URL**: `http://localhost:5173/login`

**Step-by-step Test Process**:

1. **Access Login Page**
   - Navigate to `/login`
   - Verify form fields present

2. **Test Invalid Credentials**
   - Wrong email → Should show error
   - Wrong password → Should show error
   - Unverified account → Should show verification message

3. **Test Valid Login**
   - Email: `test.investor@example.com`
   - Password: Correct password
   - Click "Login"

4. **Verify Authentication**
   - Check JWT tokens stored in localStorage
   - Verify redirect to dashboard
   - Check API call to `/api/v1/auth/profile/`

5. **Test Auto-login**
   - Close browser tab
   - Reopen app
   - Should auto-login with stored tokens

**Expected Results**:
- ✅ Invalid credentials rejected
- ✅ Valid credentials accepted
- ✅ JWT tokens stored and used
- ✅ Redirected to appropriate dashboard
- ✅ Auto-login works with valid tokens

### 1.3 Two-Factor Authentication Setup
**Test Flow**: Setup and verify 2FA

**Step-by-step Test Process**:

1. **Navigate to Security Settings**
   - Go to user profile/security
   - Find 2FA setup option

2. **Enable 2FA**
   - Click "Setup 2FA"
   - API call to `/api/v1/auth/2fa/setup/`
   - QR code displayed

3. **Scan QR Code**
   - Use authenticator app (Google Authenticator, Authy)
   - Generate 6-digit code

4. **Verify Setup**
   - Enter generated code
   - API call to `/api/v1/auth/2fa/verify/`
   - Receive backup codes

5. **Test 2FA Login**
   - Logout and login again
   - Should prompt for 2FA code
   - Test with valid and invalid codes

**Expected Results**:
- ✅ 2FA setup successfully
- ✅ Login requires 2FA code
- ✅ Backup codes work
- ✅ Can disable 2FA

---

## 2. KYC & VERIFICATION FLOW TESTING

### 2.1 KYC Document Submission
**Test URL**: `http://localhost:5173/kyc`

**Step-by-step Test Process**:

1. **Access KYC Page**
   - Navigate to `/kyc`
   - Check KYC status: `GET /api/v1/kyc/status/`
   - Verify requirements shown

2. **Document Upload - Identity**
   - Upload passport/ID document
   - API call to `/api/v1/kyc/documents/upload/`
   - Verify file uploaded successfully
   - Check document status

3. **Document Upload - Address Proof**
   - Upload utility bill/bank statement
   - Verify different document types accepted
   - Check file size limits

4. **Document Upload - Financial**
   - Upload bank statement
   - Verify document validation

5. **Biometric Verification (if implemented)**
   - Start biometric session: `POST /api/v1/kyc/biometric/start/`
   - Complete face verification
   - Complete session: `POST /api/v1/kyc/biometric/complete/`

6. **Submit for Review**
   - Click "Submit KYC"
   - API call to `/api/v1/kyc/submit/`
   - Status changes to "Pending Review"

**Expected Results**:
- ✅ All document types upload successfully
- ✅ File validation works (size, format)
- ✅ KYC status updates correctly
- ✅ User can track progress

### 2.2 KYC Admin Review Flow (Admin Account Required)

**Step-by-step Test Process**:

1. **Admin Login**
   - Login with admin account
   - Access admin KYC panel

2. **Review Pending KYC**
   - List pending reviews: `GET /api/v1/kyc/admin/pending/`
   - Select user KYC for review

3. **Document Review**
   - View uploaded documents
   - Check OCR data: `GET /api/v1/kyc/documents/{id}/ocr/`
   - Review compliance checks

4. **Make Decision**
   - **Approve**: `POST /api/v1/kyc/admin/approve/{id}/`
   - **Reject**: `POST /api/v1/kyc/admin/reject/{id}/`
   - Add review notes

5. **Verify User Notification**
   - Check user receives notification
   - Verify KYC status updated

**Expected Results**:
- ✅ Admin can review all documents
- ✅ Approval/rejection works
- ✅ Users notified of status changes
- ✅ Audit trail maintained

---

## 3. PROPERTY MANAGEMENT FLOW TESTING

### 3.1 Property Listing Flow (Property Owner Account)

**Step-by-step Test Process**:

1. **Property Owner Login**
   - Login with property_owner account
   - Access property management dashboard

2. **Create New Property**
   - Click "Add Property"
   - API call to `POST /api/v1/properties/`

3. **Basic Property Information**
   - Title: "Test Luxury Apartment"
   - Description: Detailed description
   - Property Type: Residential
   - Location: Address, city, country
   - Property Value: $1,000,000

4. **Property Category Selection**
   - **Ready Property**: Immediate income generation
   - **Under Construction**: Development project
   - Test both categories

5. **Tokenization Setup**
   - Total Tokens: 1,000
   - Token Price: $1,000
   - Expected Return: 12%
   - Rental Yield: 8% (Ready Property)

6. **Upload Property Images**
   - Multiple property images
   - API call to `POST /api/v1/properties/{id}/images/`
   - Verify image preview

7. **Upload Legal Documents**
   - Property deed, permits, valuations
   - API call to `POST /api/v1/properties/{id}/documents/`

8. **Ready Property Specific Fields**
   - Monthly Rental Income: $8,000
   - Occupancy Rate: 95%
   - Current Tenant Information

9. **Under Construction Specific Fields**
   - Expected Completion Date: Future date
   - Construction Progress: 0%
   - Milestone Setup

10. **Submit for Approval**
    - Review all information
    - Submit property for admin approval
    - Status: "Pending Approval"

**Expected Results**:
- ✅ Property created with all details
- ✅ Images and documents uploaded
- ✅ Different categories configured correctly
- ✅ Submitted for admin review

### 3.2 Property Search & Discovery Flow

**Step-by-step Test Process**:

1. **Access Properties Page**
   - Navigate to `/properties`
   - API call to `GET /api/v1/properties/`

2. **Browse All Properties**
   - Verify property cards display correctly
   - Check property type indicators
   - Verify Ready vs Under Construction labels

3. **Filter Properties**
   - Property Type filter (Residential, Commercial)
   - Category filter (Ready, Under Construction)
   - Price range filter
   - Location filter
   - Expected return filter

4. **Advanced Search**
   - Use search functionality
   - API call to `POST /api/v1/properties/search/`
   - Test search by keywords

5. **Property Details**
   - Click on property card
   - Navigate to property detail page
   - API call to `GET /api/v1/properties/{id}/`
   - Verify all information displays

6. **Property Analytics**
   - View property analytics
   - API call to `GET /api/v1/properties/{id}/analytics/`
   - Check market insights

**Expected Results**:
- ✅ Properties display with correct categories
- ✅ Filtering works for all criteria
- ✅ Search functionality works
- ✅ Property details complete and accurate
- ✅ Analytics data displays correctly

---

## 4. INVESTMENT FLOW TESTING

### 4.1 Investment in Ready Properties

**Step-by-step Test Process**:

1. **Select Ready Property**
   - Browse to active ready property
   - Verify "Ready Property" label visible
   - Check rental income information

2. **Investment Calculator**
   - Use token amount slider/input
   - API call to `POST /api/v1/investments/calculate/`
   - Verify calculations:
     - Total investment amount
     - Expected quarterly dividends
     - Annual return percentage

3. **Initiate Investment**
   - Click "Invest Now" button
   - API call to `POST /api/v1/investments/`
   - Review investment summary

4. **Payment Method Selection**
   - Choose payment method (covered in Payment Flow)
   - Complete payment process

5. **Investment Confirmation**
   - Verify investment status: "Completed"
   - Check tokens allocated to portfolio
   - Verify first dividend scheduled

6. **Portfolio Update**
   - Check portfolio: `GET /api/v1/portfolio/summary/`
   - Verify property appears in holdings
   - Check investment tracking

**Expected Results**:
- ✅ Calculator works correctly
- ✅ Investment process completes
- ✅ Tokens allocated properly
- ✅ Portfolio updated correctly
- ✅ Dividend schedule created

### 4.2 Investment in Under Construction Properties

**Step-by-step Test Process**:

1. **Select Under Construction Property**
   - Browse to under construction property
   - Verify "Under Construction" label
   - Check construction progress display

2. **Reservation Calculator**
   - Enter token amount for reservation
   - Calculate reservation amount
   - Check higher expected returns

3. **Installment Option Selection**
   - **Full Payment**: Pay entire amount upfront
   - **Installment Plan**: Monthly/quarterly payments
   - Test both options

4. **Installment Plan Setup** (if selected)
   - Choose payment schedule
   - API call to `POST /api/v1/properties/installments/`
   - Review installment schedule

5. **Initial Payment/Reservation**
   - Complete first payment
   - Status: "Reserved" (not "Completed")
   - Tokens in "Reserved" state

6. **Track Construction Progress**
   - Monitor construction updates
   - Real-time progress via WebSocket
   - Milestone notifications

7. **Construction Completion**
   - Property status changes to "Ready"
   - Reserved tokens become active
   - Dividend payments begin

**Expected Results**:
- ✅ Reservation process works
- ✅ Installment plans function correctly
- ✅ Construction progress tracking active
- ✅ Tokens activate upon completion
- ✅ Dividend payments start correctly

### 4.3 Portfolio Management

**Step-by-step Test Process**:

1. **Access Portfolio Dashboard**
   - Navigate to portfolio section
   - API call to `GET /api/v1/portfolio/summary/`

2. **Portfolio Overview**
   - Total invested amount
   - Current portfolio value
   - Total return percentage
   - Monthly dividend income

3. **Investment List**
   - API call to `GET /api/v1/investments/`
   - List all user investments
   - Filter by status, property type

4. **Performance Analytics**
   - API call to `GET /api/v1/portfolio/performance/`
   - Time-series performance charts
   - Asset allocation breakdown
   - Geographic distribution

5. **Dividend History**
   - API call to `GET /api/v1/dividends/`
   - List all dividend payments
   - Filter by date, property

6. **Auto-Investment Setup**
   - Configure automatic investing
   - API call to `POST /api/v1/auto-invest/`
   - Set amount, frequency, criteria

7. **Investment Recommendations**
   - API call to `GET /api/v1/recommendations/`
   - Personalized property suggestions
   - Based on portfolio and preferences

8. **Withdrawal Requests**
   - Request token liquidation
   - API call to `POST /api/v1/withdrawals/`
   - Track withdrawal status

**Expected Results**:
- ✅ Portfolio data accurate and current
- ✅ Performance analytics display correctly
- ✅ Dividend history complete
- ✅ Auto-investment functions work
- ✅ Recommendations relevant and useful
- ✅ Withdrawal process functional

---

## 5. PAYMENT PROCESSING FLOW TESTING

### 5.1 Credit Card Payment (Stripe Integration)

**Step-by-step Test Process**:

1. **Select Credit Card Payment**
   - During investment process
   - Choose "Credit Card" option

2. **Add Payment Method**
   - API call to `POST /api/v1/payments/methods/`
   - Enter test card details:
     - Card: 4242424242424242 (Stripe test card)
     - Expiry: 12/25
     - CVC: 123

3. **Create Payment Intent**
   - API call to `POST /api/v1/payments/stripe/create-payment-intent/`
   - Verify payment intent created

4. **Process Payment**
   - Complete Stripe Elements form
   - API call to `POST /api/v1/payments/stripe/confirm-payment/`
   - Verify payment successful

5. **Payment Confirmation**
   - Check payment status: "Completed"
   - Verify investment status updated
   - Email receipt sent

6. **Saved Payment Methods**
   - Verify card saved for future use
   - Test using saved card for next payment

**Test Cards** (Stripe Test Mode):
- **Success**: 4242424242424242
- **Decline**: 4000000000000002
- **Insufficient Funds**: 4000000000009995

**Expected Results**:
- ✅ Payment processing works correctly
- ✅ Error handling for failed payments
- ✅ Payment methods saved properly
- ✅ Investment status updates correctly

### 5.2 Cryptocurrency Payment

**Step-by-step Test Process**:

1. **Select Crypto Payment**
   - Choose cryptocurrency option
   - Select currency (BTC, ETH, USDC)

2. **Get Payment Quote**
   - API call to `POST /api/v1/payments/crypto/get-quote/`
   - Verify exchange rate calculation
   - Check quote expiration time

3. **Create Crypto Payment**
   - API call to `POST /api/v1/payments/crypto/create-payment/`
   - Receive wallet address for payment
   - Display QR code

4. **Monitor Payment**
   - User sends crypto to provided address
   - System monitors blockchain
   - Payment detection and verification

5. **Payment Verification**
   - API call to `POST /api/v1/payments/crypto/verify-payment/`
   - Confirm sufficient confirmations
   - Update investment status

**Expected Results**:
- ✅ Accurate exchange rate quotes
- ✅ Unique wallet addresses generated
- ✅ Blockchain monitoring works
- ✅ Payment verification accurate
- ✅ Investment processing completes

### 5.3 Wallet Management

**Step-by-step Test Process**:

1. **Access Wallet**
   - Navigate to wallet section
   - API call to `GET /api/v1/payments/wallet/`

2. **View Wallet Balance**
   - Check USD balance
   - Check crypto balances (if applicable)
   - Verify pending transactions

3. **Deposit Funds**
   - Choose deposit method
   - API call to `POST /api/v1/payments/wallet/deposit/`
   - Complete deposit process

4. **Withdraw Funds**
   - Request withdrawal
   - API call to `POST /api/v1/payments/wallet/withdraw/`
   - Select withdrawal method

5. **Internal Transfer**
   - Transfer between accounts
   - API call to `POST /api/v1/payments/wallet/transfer/`

6. **Transaction History**
   - API call to `GET /api/v1/payments/wallet/transactions/`
   - Filter by date, type, status
   - Export transaction data

7. **Use Wallet for Investment**
   - Select wallet as payment method
   - Verify sufficient balance
   - Complete investment with wallet funds

**Expected Results**:
- ✅ Wallet balances accurate
- ✅ Deposit/withdrawal processes work
- ✅ Transaction history complete
- ✅ Can use wallet for investments
- ✅ Real-time balance updates

### 5.4 Refund Processing

**Step-by-step Test Process**:

1. **Request Refund**
   - Select eligible investment
   - API call to `POST /api/v1/payments/refunds/`
   - Provide refund reason

2. **Admin Refund Review** (Admin Account)
   - Review refund request
   - Check refund eligibility
   - Approve or deny refund

3. **Process Refund**
   - Refund via original payment method
   - Update investment status
   - Reclaim tokens from portfolio

4. **Refund Confirmation**
   - User receives refund notification
   - Verify funds returned
   - Check portfolio updated

**Expected Results**:
- ✅ Refund requests processed correctly
- ✅ Admin review workflow works
- ✅ Refunds processed via original method
- ✅ Portfolio updated accurately

---

## 6. DASHBOARD & ANALYTICS TESTING

### 6.1 Investor Dashboard

**Step-by-step Test Process**:

1. **Access Dashboard**
   - Navigate to `/dashboard`
   - API call to `GET /api/v1/dashboard/stats/`

2. **Dashboard Overview**
   - Total invested amount
   - Current portfolio value
   - Total return percentage
   - Recent activity feed

3. **Performance Charts**
   - Portfolio value over time
   - Return on investment trends
   - Asset allocation pie chart
   - Geographic distribution

4. **Recent Activities**
   - Latest investments
   - Recent dividend payments
   - Property updates
   - System notifications

5. **Quick Actions**
   - Browse properties
   - Make investment
   - View portfolio
   - Account settings

6. **Market Insights**
   - API call to `GET /api/v1/properties/market/insights/`
   - Market trends
   - Top performing properties
   - Investment recommendations

**Expected Results**:
- ✅ Dashboard loads with correct data
- ✅ Charts display properly
- ✅ Real-time updates work
- ✅ Quick actions functional
- ✅ Market insights relevant

### 6.2 Property Owner Dashboard

**Step-by-step Test Process**:

1. **Access Property Owner Dashboard**
   - Login with property_owner account
   - Navigate to dashboard

2. **Property Portfolio Overview**
   - List of owned properties
   - Funding progress for each
   - Revenue analytics

3. **Investment Tracking**
   - Total funds raised
   - Number of investors
   - Funding completion percentage

4. **Revenue Analytics**
   - Rental income tracking
   - Token sales revenue
   - Expense tracking

5. **Investor Communications**
   - Send updates to investors
   - Property milestone announcements
   - Financial reporting

6. **Construction Management** (Under Construction)
   - Update construction progress
   - Upload progress photos
   - Milestone completion

**Expected Results**:
- ✅ Property overview accurate
- ✅ Investment tracking correct
- ✅ Revenue analytics functional
- ✅ Communication tools work
- ✅ Construction management operational

### 6.3 Advanced Analytics

**Step-by-step Test Process**:

1. **Portfolio Analytics**
   - API call to `GET /api/v1/analytics/portfolio/`
   - Detailed performance metrics
   - Risk analysis
   - Diversification metrics

2. **Market Comparison**
   - Portfolio vs market performance
   - Benchmark comparisons
   - Performance attribution

3. **Risk Metrics**
   - Portfolio volatility
   - Sharpe ratio calculation
   - Maximum drawdown
   - Beta coefficients

4. **Asset Allocation Analysis**
   - Property type breakdown
   - Geographic distribution
   - Construction vs ready split

5. **Trend Analysis**
   - Historical performance
   - Seasonal patterns
   - Market cycle analysis

**Expected Results**:
- ✅ Analytics calculations accurate
- ✅ Benchmarking functional
- ✅ Risk metrics computed correctly
- ✅ Asset allocation analysis correct
- ✅ Trend analysis insightful

---

## 7. NOTIFICATIONS & REAL-TIME UPDATES TESTING

### 7.1 Notification System

**Step-by-step Test Process**:

1. **WebSocket Connection**
   - Connect to `ws://localhost:8000/ws/notifications/{user_id}/`
   - Verify connection established
   - Test authentication

2. **Real-time Notifications**
   - Investment confirmations
   - Dividend payments
   - KYC status updates
   - Property updates
   - Payment confirmations

3. **Notification List**
   - API call to `GET /api/v1/notifications/`
   - View all notifications
   - Filter by type, status

4. **Mark as Read**
   - API call to `POST /api/v1/notifications/mark-read/`
   - Verify read status updates
   - Check unread count

5. **Notification Preferences**
   - Access notification settings
   - API call to `GET/POST /api/v1/notifications/preferences/`
   - Configure notification types
   - Email vs in-app preferences

6. **Email Notifications**
   - Verify email delivery
   - Check email templates
   - Test unsubscribe functionality

**Expected Results**:
- ✅ WebSocket connections stable
- ✅ Real-time notifications delivered
- ✅ Notification management works
- ✅ Preferences respected
- ✅ Email notifications sent

### 7.2 Real-time Property Updates

**Step-by-step Test Process**:

1. **Property WebSocket**
   - Connect to `ws://localhost:8000/ws/property/{property_id}/`
   - Subscribe to property updates

2. **Construction Progress Updates**
   - Admin updates construction progress
   - Verify real-time progress bar updates
   - Check investor notifications

3. **Investment Activity**
   - New investments in property
   - Real-time funding progress updates
   - Token availability updates

4. **Property Status Changes**
   - Draft to Active
   - Under Construction to Ready
   - Sold Out status

**Expected Results**:
- ✅ Property updates delivered real-time
- ✅ Progress bars update automatically
- ✅ Status changes reflected immediately
- ✅ Multi-user updates work correctly

---

## 8. BROKER & COMMISSION FLOW TESTING

### 8.1 Broker Registration & Verification

**Step-by-step Test Process**:

1. **Broker Registration**
   - Register with role: "broker"
   - Complete additional business information
   - Submit business documents

2. **Broker Verification**
   - API call to `POST /api/v1/broker/verification/submit/`
   - Upload business license
   - Upload professional certifications

3. **Admin Verification Review**
   - Admin reviews broker application
   - Verify business credentials
   - Approve broker status

4. **Broker Profile Setup**
   - API call to `GET/POST /api/v1/broker/profile/`
   - Complete broker profile
   - Add marketing materials

**Expected Results**:
- ✅ Broker registration process complete
- ✅ Document verification works
- ✅ Admin approval workflow functional
- ✅ Broker profile setup successful

### 8.2 Referral & Commission System

**Step-by-step Test Process**:

1. **Generate Referral Link**
   - API call to `POST /api/v1/broker/referrals/generate/`
   - Receive unique referral URL
   - Test link tracking

2. **Client Registration via Referral**
   - New user clicks referral link
   - Registers with referral attribution
   - Verify referral tracking

3. **Client Investment Tracking**
   - Referred client makes investment
   - Verify commission calculation
   - Check commission status: "Earned"

4. **Commission Management**
   - API call to `GET /api/v1/broker/commissions/`
   - View commission history
   - Filter by status, date, client

5. **Commission Payment**
   - Admin approves commission
   - API call to `POST /api/v1/broker/admin/commissions/{id}/approve/`
   - Commission status: "Paid"
   - Payment processed

6. **Performance Metrics**
   - API call to `GET /api/v1/broker/performance/`
   - Referral conversion rates
   - Total commissions earned
   - Client activity metrics

**Expected Results**:
- ✅ Referral links work correctly
- ✅ Attribution tracking accurate
- ✅ Commission calculation correct
- ✅ Payment processing functional
- ✅ Performance metrics accurate

### 8.3 Marketing Materials & Support

**Step-by-step Test Process**:

1. **Access Marketing Materials**
   - API call to `GET /api/v1/broker/materials/`
   - View available materials
   - Property brochures, presentations

2. **Download Materials**
   - API call to `GET /api/v1/broker/materials/{id}/download/`
   - Download branded materials
   - Verify personalization

3. **Custom Branding**
   - Upload broker logo
   - Customize marketing materials
   - Generate personalized content

4. **Performance Tracking**
   - Click-through rate tracking
   - Conversion analytics
   - ROI measurement

**Expected Results**:
- ✅ Marketing materials accessible
- ✅ Downloads work correctly
- ✅ Branding customization functional
- ✅ Performance tracking accurate

---

## 9. CONSTRUCTION TRACKING FLOW TESTING

### 9.1 Construction Progress Management

**Step-by-step Test Process**:

1. **Create Construction Milestones**
   - Property owner creates milestones
   - API call to `POST /api/v1/construction/milestones/`
   - Define milestone dates and descriptions

2. **Progress Updates**
   - Update construction percentage
   - Upload progress photos
   - Add construction notes

3. **Milestone Completion**
   - Mark milestone as complete
   - API call to `POST /api/v1/construction/milestones/{id}/complete/`
   - Require verification

4. **Third-party Verification**
   - External verification required
   - Upload verification documents
   - Admin approval process

5. **Investor Notifications**
   - Automatic notifications sent
   - Real-time progress updates
   - Photo gallery updates

6. **Final Completion**
   - Construction 100% complete
   - Property status change to "Ready"
   - Token activation process

**Expected Results**:
- ✅ Milestone system functional
- ✅ Progress tracking accurate
- ✅ Verification process works
- ✅ Investor notifications sent
- ✅ Status transitions correct

---

## 10. SECONDARY MARKET & TOKEN TRADING

### 10.1 Token Listing for Sale

**Step-by-step Test Process**:

1. **Access Marketplace**
   - Navigate to marketplace section
   - View available token listings

2. **List Tokens for Sale**
   - Select tokens from portfolio
   - API call to `POST /api/v1/marketplace/listings/`
   - Set asking price
   - Set listing duration

3. **Listing Management**
   - View active listings
   - Edit listing price
   - Cancel listings

4. **Listing Visibility**
   - Verify listings appear in marketplace
   - Check filtering and search
   - Test sorting options

**Expected Results**:
- ✅ Token listing process works
- ✅ Listings appear in marketplace
- ✅ Management tools functional
- ✅ Search and filtering work

### 10.2 Token Purchase from Secondary Market

**Step-by-step Test Process**:

1. **Browse Marketplace**
   - View available token listings
   - Filter by property, price, yield

2. **Purchase Tokens**
   - Select token listing
   - Review purchase details
   - Choose payment method

3. **Transaction Processing**
   - Payment processing
   - Token ownership transfer
   - Escrow management (if applicable)

4. **Settlement**
   - Tokens transferred to buyer
   - Payment to seller
   - Transaction fees deducted

5. **Portfolio Updates**
   - Buyer portfolio updated
   - Seller portfolio updated
   - Transaction history recorded

**Expected Results**:
- ✅ Marketplace browsing functional
- ✅ Purchase process completes
- ✅ Token transfers work correctly
- ✅ Portfolios update accurately

---

## 11. ADMIN FLOW TESTING

### 11.1 Property Approval Workflow

**Step-by-step Test Process** (Admin Account Required):

1. **Admin Dashboard Access**
   - Login with admin account
   - Access admin dashboard
   - View pending approvals queue

2. **Property Review**
   - Select property for review
   - Review all submitted documents
   - Check property details accuracy

3. **Due Diligence**
   - Verify property ownership
   - Check legal documentation
   - Validate property valuation

4. **Legal Compliance Review**
   - Check regulatory compliance
   - Verify tokenization legality
   - Review risk assessments

5. **Decision Making**
   - **Approve Property**:
     - API call to `POST /api/v1/properties/{id}/approve/`
     - Property becomes active
     - Owner notification sent
   - **Reject Property**:
     - Provide rejection reasons
     - Property owner notification
     - Required corrections listed

6. **Post-Approval Setup**
   - Property appears in listings
   - Investment opens to public
   - Monitoring setup

**Expected Results**:
- ✅ Admin review process complete
- ✅ Approval/rejection works correctly
- ✅ Notifications sent appropriately
- ✅ Properties go live successfully

### 11.2 System Monitoring & Management

**Step-by-step Test Process**:

1. **System Health Monitoring**
   - API call to `GET /api/v1/notifications/admin/system-alerts/`
   - View system performance metrics
   - Check error logs

2. **User Management**
   - View all user accounts
   - Manage user roles
   - Handle account issues

3. **Financial Monitoring**
   - Payment reconciliation
   - Commission approvals
   - Refund processing

4. **Compliance Monitoring**
   - KYC approval queue
   - Regulatory reporting
   - Audit trail maintenance

5. **Issue Resolution**
   - Handle user complaints
   - Process system alerts
   - API call to `POST /api/v1/notifications/admin/system-alerts/{id}/resolve/`

**Expected Results**:
- ✅ System monitoring functional
- ✅ User management tools work
- ✅ Financial processes accurate
- ✅ Compliance tracking complete
- ✅ Issue resolution effective

---

## 12. INTEGRATION & API TESTING

### 12.1 API Endpoint Testing

**Test All Major Endpoints**:

```bash
# Authentication
POST /api/v1/auth/register/
POST /api/v1/auth/login/
POST /api/v1/auth/logout/
GET  /api/v1/auth/profile/
POST /api/v1/auth/token/refresh/

# Properties
GET  /api/v1/properties/
POST /api/v1/properties/
GET  /api/v1/properties/{id}/
PUT  /api/v1/properties/{id}/
POST /api/v1/properties/search/

# Investments
GET  /api/v1/investments/
POST /api/v1/investments/
GET  /api/v1/portfolio/summary/
GET  /api/v1/dividends/

# Payments
GET  /api/v1/payments/methods/
POST /api/v1/payments/payments/
POST /api/v1/payments/stripe/create-payment-intent/
POST /api/v1/payments/crypto/get-quote/

# KYC
GET  /api/v1/kyc/status/
POST /api/v1/kyc/documents/upload/
POST /api/v1/kyc/submit/

# Notifications
GET  /api/v1/notifications/
POST /api/v1/notifications/mark-read/
```

### 12.2 WebSocket Testing

**Test WebSocket Connections**:

```javascript
// Notification WebSocket
ws://localhost:8000/ws/notifications/{user_id}/

// Property Updates WebSocket
ws://localhost:8000/ws/property/{property_id}/
```

---

## 13. PERFORMANCE & LOAD TESTING

### 13.1 Performance Testing

**Test Scenarios**:

1. **Concurrent User Load**
   - 100 simultaneous users
   - Login, browse, invest workflows
   - Monitor response times

2. **Database Performance**
   - Property search with filters
   - Portfolio calculations
   - Analytics queries

3. **File Upload Performance**
   - KYC document uploads
   - Property image uploads
   - Large file handling

4. **Real-time Updates**
   - WebSocket connection limits
   - Notification delivery speed
   - Progress update frequency

**Expected Results**:
- ✅ Response times < 2 seconds
- ✅ WebSocket connections stable
- ✅ File uploads complete successfully
- ✅ Database queries optimized

---

## 14. SECURITY TESTING

### 14.1 Authentication Security

**Test Areas**:

1. **JWT Token Security**
   - Token expiration handling
   - Refresh token rotation
   - Invalid token rejection

2. **Password Security**
   - Strong password enforcement
   - Password hashing verification
   - Brute force protection

3. **Session Management**
   - Session timeout
   - Concurrent session handling
   - Secure logout

### 14.2 Authorization Testing

**Test Scenarios**:

1. **Role-based Access Control**
   - Investor can only access investor features
   - Property owners can manage their properties
   - Admins have full access
   - Brokers have appropriate permissions

2. **API Endpoint Protection**
   - Unauthorized access blocked
   - Proper error responses
   - Data isolation between users

**Expected Results**:
- ✅ Authentication secure and robust
- ✅ Authorization properly enforced
- ✅ No unauthorized access possible
- ✅ Error handling appropriate

---

## 15. ERROR HANDLING & EDGE CASES

### 15.1 Network Error Handling

**Test Scenarios**:

1. **API Connection Failures**
   - Backend server offline
   - Network timeouts
   - DNS resolution failures

2. **Graceful Degradation**
   - Cached data display
   - Offline functionality
   - Error messages

### 15.2 Data Validation

**Test Invalid Inputs**:

1. **Form Validation**
   - Empty required fields
   - Invalid email formats
   - Malformed data

2. **API Input Validation**
   - SQL injection attempts
   - XSS attack vectors
   - Invalid data types

**Expected Results**:
- ✅ Network errors handled gracefully
- ✅ User-friendly error messages
- ✅ Input validation prevents attacks
- ✅ System remains stable under stress

---

## TESTING CHECKLIST SUMMARY

### Pre-Production Verification

- [ ] All user registration flows tested
- [ ] All authentication methods work
- [ ] KYC process complete end-to-end
- [ ] Property listing and approval tested
- [ ] Both property types (Ready/Construction) functional
- [ ] Investment flows work for both property types
- [ ] All payment methods tested and functional
- [ ] Portfolio management accurate
- [ ] Dashboards display correct data
- [ ] Notifications system operational
- [ ] WebSocket connections stable
- [ ] Broker workflows complete
- [ ] Admin functions operational
- [ ] API endpoints all functional
- [ ] Security measures effective
- [ ] Performance acceptable
- [ ] Error handling robust
- [ ] Mobile responsiveness verified
- [ ] Cross-browser compatibility confirmed

### Final Production Readiness

- [ ] Database backup and recovery tested
- [ ] SSL certificates installed and valid
- [ ] DNS configuration correct
- [ ] CDN setup for static assets
- [ ] Monitoring and logging configured
- [ ] Error tracking system active
- [ ] Performance monitoring enabled
- [ ] Security scanning completed
- [ ] Load testing passed
- [ ] User acceptance testing completed

---

## ISSUE TRACKING TEMPLATE

For each issue found during testing:

**Issue ID**: [Unique identifier]
**Severity**: [Critical/High/Medium/Low]
**Component**: [Authentication/Properties/Payments/etc.]
**Description**: [Detailed issue description]
**Steps to Reproduce**: [Step-by-step reproduction]
**Expected Result**: [What should happen]
**Actual Result**: [What actually happened]
**Screenshots**: [If applicable]
**Status**: [Open/In Progress/Resolved/Closed]
**Assigned To**: [Developer name]
**Notes**: [Additional comments]

This comprehensive testing plan ensures that every aspect of the Capimax platform is thoroughly tested and verified before production deployment.