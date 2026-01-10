# Comprehensive Manual Testing Checklist

**Platform:** Capimax Real Estate Tokenization Platform
**Version:** 1.0.0
**Total Test Cases:** 280+
**Estimated Testing Time:** 6-8 hours

## Testing Instructions

- Mark each item with ✓ when passed, ✗ when failed
- Document any issues found with screenshots
- Test on production-like environment first
- Include edge cases and error scenarios

---

## 1. AUTHENTICATION & USER MANAGEMENT (40 tests)

### 1.1 User Registration
- [ ] 1.1.1 - Open registration page at `/register`
- [ ] 1.1.2 - Form displays all required fields (email, password, confirm password, full name, phone)
- [ ] 1.1.3 - Email validation works (format check)
- [ ] 1.1.4 - Password strength indicator displays
- [ ] 1.1.5 - Password must meet minimum requirements (8+ chars, uppercase, lowercase, number, special char)
- [ ] 1.1.6 - Confirm password matches password field
- [ ] 1.1.7 - Submit button disabled until all fields valid
- [ ] 1.1.8 - Registration with valid data succeeds
- [ ] 1.1.9 - Success message displays after registration
- [ ] 1.1.10 - Email verification prompt appears
- [ ] 1.1.11 - Duplicate email shows appropriate error
- [ ] 1.1.12 - Weak password rejected with message
- [ ] 1.1.13 - Invalid email format shows error
- [ ] 1.1.14 - Empty fields show validation errors
- [ ] 1.1.15 - Terms & conditions checkbox required
- [ ] 1.1.16 - Privacy policy link works
- [ ] 1.1.17 - "Already have account" link navigates to login
- [ ] 1.1.18 - Registration rate limiting works (max 5/minute)

### 1.2 Email Verification
- [ ] 1.2.1 - Verification email sent after registration
- [ ] 1.2.2 - Email contains verification link
- [ ] 1.2.3 - Email contains 6-digit verification code
- [ ] 1.2.4 - Clicking verification link verifies account
- [ ] 1.2.5 - Entering code manually works
- [ ] 1.2.6 - Invalid code shows error
- [ ] 1.2.7 - Expired code (24h+) shows error
- [ ] 1.2.8 - Resend verification email works
- [ ] 1.2.9 - Already verified account shows message
- [ ] 1.2.10 - Verified badge appears in profile

### 1.3 User Login
- [ ] 1.3.1 - Open login page at `/login`
- [ ] 1.3.2 - Email and password fields display
- [ ] 1.3.3 - "Remember me" checkbox present
- [ ] 1.3.4 - "Forgot password" link present
- [ ] 1.3.5 - Login with valid credentials succeeds
- [ ] 1.3.6 - JWT tokens stored correctly
- [ ] 1.3.7 - Redirects to dashboard after login
- [ ] 1.3.8 - Invalid email shows error
- [ ] 1.3.9 - Wrong password shows error
- [ ] 1.3.10 - Unverified account shows verification prompt
- [ ] 1.3.11 - Login rate limiting works (max 5/minute)
- [ ] 1.3.12 - Account lockout after 5 failed attempts
- [ ] 1.3.13 - "Remember me" keeps session for 7 days
- [ ] 1.3.14 - Social login buttons display (if enabled)

### 1.4 Password Reset
- [ ] 1.4.1 - Click "Forgot Password" on login page
- [ ] 1.4.2 - Password reset page displays
- [ ] 1.4.3 - Enter email address
- [ ] 1.4.4 - Reset email sent confirmation
- [ ] 1.4.5 - Email contains reset link
- [ ] 1.4.6 - Email contains reset code
- [ ] 1.4.7 - Click reset link opens new password page
- [ ] 1.4.8 - Enter new password with confirmation
- [ ] 1.4.9 - Password updated successfully
- [ ] 1.4.10 - Can login with new password
- [ ] 1.4.11 - Expired reset link (1h+) shows error
- [ ] 1.4.12 - Invalid reset code shows error

### 1.5 Logout
- [ ] 1.5.1 - Logout button visible in navbar
- [ ] 1.5.2 - Click logout clears tokens
- [ ] 1.5.3 - Redirects to home page
- [ ] 1.5.4 - Cannot access protected pages after logout
- [ ] 1.5.5 - Logout confirmation modal (optional)

---

## 2. KYC VERIFICATION (35 tests)

### 2.1 KYC Dashboard
- [ ] 2.1.1 - Navigate to KYC page at `/kyc`
- [ ] 2.1.2 - KYC status displays correctly (not started/pending/verified/rejected)
- [ ] 2.1.3 - Unverified users see "Start Verification" prompt
- [ ] 2.1.4 - Progress indicator shows current step
- [ ] 2.1.5 - Requirements list displays clearly
- [ ] 2.1.6 - Verification benefits explained

### 2.2 Document Upload
- [ ] 2.2.1 - Select document type (passport/ID/driver license)
- [ ] 2.2.2 - Front document upload button works
- [ ] 2.2.3 - Back document upload button works (for ID)
- [ ] 2.2.4 - File size validation (max 10MB)
- [ ] 2.2.5 - File type validation (JPG, PNG, PDF only)
- [ ] 2.2.6 - Image preview displays after upload
- [ ] 2.2.7 - Remove uploaded image works
- [ ] 2.2.8 - Upload progress bar displays
- [ ] 2.2.9 - Multiple files rejected with error
- [ ] 2.2.10 - Large files (>10MB) rejected

### 2.3 Personal Information
- [ ] 2.3.1 - Full name field pre-filled from registration
- [ ] 2.3.2 - Date of birth picker works
- [ ] 2.3.3 - Nationality dropdown displays countries
- [ ] 2.3.4 - Address fields (street, city, postal, country)
- [ ] 2.3.5 - Document number field
- [ ] 2.3.6 - Document expiry date picker
- [ ] 2.3.7 - All fields required validation
- [ ] 2.3.8 - Underage (< 18) shows error
- [ ] 2.3.9 - Expired document shows error

### 2.4 Biometric Verification
- [ ] 2.4.1 - Selfie upload button displays
- [ ] 2.4.2 - Camera access requested (if available)
- [ ] 2.4.3 - Take selfie with webcam works
- [ ] 2.4.4 - Upload selfie from device works
- [ ] 2.4.5 - Face detection guidelines shown
- [ ] 2.4.6 - Blurry photo rejected with message
- [ ] 2.4.7 - Photo quality validation

### 2.5 KYC Submission
- [ ] 2.5.1 - Review page shows all entered data
- [ ] 2.5.2 - Edit buttons work for each section
- [ ] 2.5.3 - Terms acceptance checkbox required
- [ ] 2.5.4 - Submit KYC button enabled when complete
- [ ] 2.5.5 - Submission shows success message
- [ ] 2.5.6 - Status changes to "Pending Review"
- [ ] 2.5.7 - Email notification sent
- [ ] 2.5.8 - Cannot invest before KYC approval
- [ ] 2.5.9 - Can view submission status
- [ ] 2.5.10 - Can download submitted documents
- [ ] 2.5.11 - Rejection shows reason
- [ ] 2.5.12 - Can resubmit if rejected

---

## 3. PROPERTY BROWSING & SEARCH (30 tests)

### 3.1 Property Listing Page
- [ ] 3.1.1 - Navigate to properties page at `/properties`
- [ ] 3.1.2 - Property cards display in grid layout
- [ ] 3.1.3 - Each card shows: image, title, location, price, ROI
- [ ] 3.1.4 - Pagination works (20 properties per page)
- [ ] 3.1.5 - "Load More" button works (if infinite scroll)
- [ ] 3.1.6 - Property count displays correctly
- [ ] 3.1.7 - Empty state shows when no properties

### 3.2 Search & Filters
- [ ] 3.2.1 - Search bar accepts input
- [ ] 3.2.2 - Search by property name works
- [ ] 3.2.3 - Search by location works
- [ ] 3.2.4 - Real-time search (debounced)
- [ ] 3.2.5 - Filter by property type (residential/commercial/land)
- [ ] 3.2.6 - Filter by price range (slider)
- [ ] 3.2.7 - Filter by expected ROI
- [ ] 3.2.8 - Filter by status (funding/funded/completed)
- [ ] 3.2.9 - Multiple filters work together
- [ ] 3.2.10 - Clear filters button works
- [ ] 3.2.11 - Filter count badge displays
- [ ] 3.2.12 - URL updates with filter params

### 3.3 Sorting
- [ ] 3.3.1 - Sort by newest first
- [ ] 3.3.2 - Sort by price (low to high)
- [ ] 3.3.3 - Sort by price (high to low)
- [ ] 3.3.4 - Sort by ROI (highest first)
- [ ] 3.3.5 - Sort by funding progress
- [ ] 3.3.6 - Sort persists across pages

### 3.4 Property Cards
- [ ] 3.4.1 - Property image loads correctly
- [ ] 3.4.2 - Fallback image shows if no image
- [ ] 3.4.3 - Funding progress bar displays
- [ ] 3.4.4 - Token price shows
- [ ] 3.4.5 - Tokens available count
- [ ] 3.4.6 - Expected return percentage
- [ ] 3.4.7 - "Invest Now" button visible
- [ ] 3.4.8 - "View Details" link works
- [ ] 3.4.9 - Favorite/bookmark icon works
- [ ] 3.4.10 - Hover effects work smoothly

---

## 4. PROPERTY DETAILS (25 tests)

### 4.1 Property Detail Page
- [ ] 4.1.1 - Navigate to property detail page
- [ ] 4.1.2 - Property title displays
- [ ] 4.1.3 - Image gallery displays (multiple images)
- [ ] 4.1.4 - Gallery navigation arrows work
- [ ] 4.1.5 - Gallery thumbnails clickable
- [ ] 4.1.6 - Image lightbox/modal works
- [ ] 4.1.7 - Property location map displays
- [ ] 4.1.8 - Full description shows
- [ ] 4.1.9 - Property specifications listed
- [ ] 4.1.10 - Tokenization details (total tokens, price per token, available)

### 4.2 Investment Information
- [ ] 4.2.1 - Total value displays
- [ ] 4.2.2 - Expected ROI highlighted
- [ ] 4.2.3 - Funding progress percentage
- [ ] 4.2.4 - Funding timeline
- [ ] 4.2.5 - Rental income details
- [ ] 4.2.6 - Dividend distribution schedule
- [ ] 4.2.7 - Property documents downloadable
- [ ] 4.2.8 - Investment calculator widget

### 4.3 Investment Action
- [ ] 4.3.1 - "Invest Now" button prominent
- [ ] 4.3.2 - Button disabled if not logged in
- [ ] 4.3.3 - Button disabled if KYC not verified
- [ ] 4.3.4 - Button disabled if fully funded
- [ ] 4.3.5 - Clicking opens investment modal
- [ ] 4.3.6 - Share property button works
- [ ] 4.3.7 - Save/bookmark property works

---

## 5. INVESTMENT FLOW (45 tests)

### 5.1 Investment Amount Selection
- [ ] 5.1.1 - Investment modal opens
- [ ] 5.1.2 - Token quantity selector works
- [ ] 5.1.3 - Increase/decrease buttons work
- [ ] 5.1.4 - Manual token quantity input works
- [ ] 5.1.5 - Maximum available tokens enforced
- [ ] 5.1.6 - Minimum investment (1 token) enforced
- [ ] 5.1.7 - Total investment amount calculates correctly
- [ ] 5.1.8 - Platform fee displays
- [ ] 5.1.9 - Final amount shows (investment + fees)
- [ ] 5.1.10 - Estimated returns display

### 5.2 Payment Method Selection
- [ ] 5.2.1 - Payment options display (Stripe/PayPal/Crypto/Wallet)
- [ ] 5.2.2 - Select credit card option
- [ ] 5.2.3 - Select PayPal option
- [ ] 5.2.4 - Select crypto payment option
- [ ] 5.2.5 - Select wallet balance option
- [ ] 5.2.6 - Insufficient wallet balance shows message
- [ ] 5.2.7 - Payment method icons display

### 5.3 Credit Card Payment (Stripe)
- [ ] 5.3.1 - Stripe payment form loads
- [ ] 5.3.2 - Card number field accepts input
- [ ] 5.3.3 - Card number formatting works (spaces every 4 digits)
- [ ] 5.3.4 - Expiry date field works (MM/YY)
- [ ] 5.3.5 - CVC field accepts 3-4 digits
- [ ] 5.3.6 - Card brand icon displays (Visa/Mastercard/etc)
- [ ] 5.3.7 - "Save card" checkbox works
- [ ] 5.3.8 - Invalid card number shows error
- [ ] 5.3.9 - Expired card shows error
- [ ] 5.3.10 - Invalid CVC shows error
- [ ] 5.3.11 - Submit payment button enabled when valid
- [ ] 5.3.12 - Payment processing shows loading state
- [ ] 5.3.13 - Successful payment shows confirmation
- [ ] 5.3.14 - Failed payment shows error message
- [ ] 5.3.15 - 3D Secure authentication works (if triggered)

### 5.4 PayPal Payment
- [ ] 5.4.1 - PayPal button displays
- [ ] 5.4.2 - Click opens PayPal modal
- [ ] 5.4.3 - Can login to PayPal
- [ ] 5.4.4 - Payment amount shows in PayPal
- [ ] 5.4.5 - Approve payment in PayPal
- [ ] 5.4.6 - Returns to platform after approval
- [ ] 5.4.7 - Investment confirmed
- [ ] 5.4.8 - PayPal cancellation handled gracefully

### 5.5 Crypto Payment
- [ ] 5.5.1 - Cryptocurrency options display (ETH/USDT/USDC/etc)
- [ ] 5.5.2 - Select cryptocurrency
- [ ] 5.5.3 - Wallet connection button displays
- [ ] 5.5.4 - Click connects Web3 wallet (MetaMask/WalletConnect)
- [ ] 5.5.5 - Wallet address displays after connection
- [ ] 5.5.6 - Network selection works (Ethereum/Polygon/BSC)
- [ ] 5.5.7 - Wrong network shows warning
- [ ] 5.5.8 - Insufficient crypto balance shows error
- [ ] 5.5.9 - Transaction confirmation in wallet
- [ ] 5.5.10 - Transaction hash displays
- [ ] 5.5.11 - Transaction status tracked
- [ ] 5.5.12 - Blockchain confirmation count displays

### 5.6 Investment Confirmation
- [ ] 5.6.1 - Success page displays
- [ ] 5.6.2 - Investment details summary
- [ ] 5.6.3 - Transaction ID/receipt number
- [ ] 5.6.4 - Download receipt button works
- [ ] 5.6.5 - Email receipt sent
- [ ] 5.6.6 - View investment in portfolio link
- [ ] 5.6.7 - "Invest in Another Property" button
- [ ] 5.6.8 - Investment appears in user's portfolio immediately

---

## 6. INVESTOR DASHBOARD (40 tests)

### 6.1 Dashboard Overview
- [ ] 6.1.1 - Navigate to dashboard at `/dashboard`
- [ ] 6.1.2 - Total portfolio value displays
- [ ] 6.1.3 - Total investment amount displays
- [ ] 6.1.4 - Current returns/gains display
- [ ] 6.1.5 - Return percentage displays
- [ ] 6.1.6 - Portfolio growth chart displays
- [ ] 6.1.7 - Chart timeframe selector works (week/month/year)
- [ ] 6.1.8 - Recent transactions list displays

### 6.2 Portfolio View
- [ ] 6.2.1 - "My Properties" section displays
- [ ] 6.2.2 - Each property shows investment amount
- [ ] 6.2.3 - Token quantity owned displays
- [ ] 6.2.4 - Current value displays
- [ ] 6.2.5 - Profit/loss displays
- [ ] 6.2.6 - Profit/loss color-coded (green/red)
- [ ] 6.2.7 - Property status displays
- [ ] 6.2.8 - Click property opens details
- [ ] 6.2.9 - Portfolio sorting works
- [ ] 6.2.10 - Portfolio filtering works

### 6.3 Dividend/Returns
- [ ] 6.3.1 - Dividend history displays
- [ ] 6.3.2 - Each dividend shows: date, property, amount, status
- [ ] 6.3.3 - Total dividends earned displays
- [ ] 6.3.4 - Pending dividends highlighted
- [ ] 6.3.5 - Dividend payout method shown
- [ ] 6.3.6 - Upcoming dividends calendar
- [ ] 6.3.7 - Dividend reinvest option (if available)

### 6.4 Transaction History
- [ ] 6.4.1 - All transactions list displays
- [ ] 6.4.2 - Filter by type (investment/dividend/withdrawal/deposit)
- [ ] 6.4.3 - Filter by date range
- [ ] 6.4.4 - Filter by property
- [ ] 6.4.5 - Filter by status (completed/pending/failed)
- [ ] 6.4.6 - Transaction details expandable
- [ ] 6.4.7 - Download transaction receipt
- [ ] 6.4.8 - Export transactions to CSV/PDF
- [ ] 6.4.9 - Pagination works

### 6.5 Wallet Management
- [ ] 6.5.1 - Wallet balance displays
- [ ] 6.5.2 - "Add Funds" button works
- [ ] 6.5.3 - Deposit flow works
- [ ] 6.5.4 - Withdraw button displays
- [ ] 6.5.5 - Withdrawal flow works
- [ ] 6.5.6 - Withdrawal limits displayed
- [ ] 6.5.7 - KYC required for large withdrawals
- [ ] 6.5.8 - Transaction history in wallet
- [ ] 6.5.9 - Multiple currency support (if applicable)

### 6.6 Profile & Settings
- [ ] 6.6.1 - View profile page
- [ ] 6.6.2 - Edit personal information
- [ ] 6.6.3 - Change password
- [ ] 6.6.4 - Update email address
- [ ] 6.6.5 - Email verification required for email change
- [ ] 6.6.6 - Update phone number
- [ ] 6.6.7 - SMS verification for phone change
- [ ] 6.6.8 - Profile picture upload
- [ ] 6.6.9 - Two-factor authentication toggle
- [ ] 6.6.10 - Notification preferences
- [ ] 6.6.11 - Language selection (if multilingual)
- [ ] 6.6.12 - Timezone setting

---

## 7. SECONDARY MARKETPLACE (30 tests)

### 7.1 Marketplace Listing
- [ ] 7.1.1 - Navigate to marketplace at `/marketplace`
- [ ] 7.1.2 - All available listings display
- [ ] 7.1.3 - Each listing shows: property, tokens, price, seller
- [ ] 7.1.4 - Filter by property
- [ ] 7.1.5 - Filter by price range
- [ ] 7.1.6 - Sort by price (low/high)
- [ ] 7.1.7 - Sort by date listed
- [ ] 7.1.8 - Search listings works
- [ ] 7.1.9 - Pagination works

### 7.2 Creating Listing (Seller)
- [ ] 7.2.1 - "Sell Tokens" button in portfolio
- [ ] 7.2.2 - Create listing modal opens
- [ ] 7.2.3 - Select property to sell
- [ ] 7.2.4 - Enter number of tokens to sell
- [ ] 7.2.5 - Cannot sell more than owned
- [ ] 7.2.6 - Set listing price per token
- [ ] 7.2.7 - Price validation (must be > 0)
- [ ] 7.2.8 - Total listing amount calculates
- [ ] 7.2.9 - Platform fee displays
- [ ] 7.2.10 - Create listing succeeds
- [ ] 7.2.11 - Listing appears in marketplace
- [ ] 7.2.12 - Listing appears in "My Listings"

### 7.3 Purchasing from Marketplace (Buyer)
- [ ] 7.3.1 - Click "Buy" on listing
- [ ] 7.3.2 - Purchase modal opens
- [ ] 7.3.3 - Listing details display
- [ ] 7.3.4 - Total cost shows (price + fees)
- [ ] 7.3.5 - Select payment method
- [ ] 7.3.6 - Complete payment
- [ ] 7.3.7 - Escrow protection message displays
- [ ] 7.3.8 - Purchase confirmation shown
- [ ] 7.3.9 - Tokens transferred to buyer's portfolio
- [ ] 7.3.10 - Funds released to seller
- [ ] 7.3.11 - Listing removed from marketplace
- [ ] 7.3.12 - Both parties receive notifications

### 7.4 Managing Listings
- [ ] 7.4.1 - View "My Listings" page
- [ ] 7.4.2 - Active listings display
- [ ] 7.4.3 - Edit listing price
- [ ] 7.4.4 - Cancel listing button works
- [ ] 7.4.5 - Cancelled listing returns tokens to portfolio
- [ ] 7.4.6 - Sold listings show as completed
- [ ] 7.4.7 - Listing history displays

---

## 8. PROPERTY OWNER FEATURES (25 tests)

### 8.1 Property Submission
- [ ] 8.1.1 - Navigate to "Submit Property" page
- [ ] 8.1.2 - Property details form displays
- [ ] 8.1.3 - Enter property title
- [ ] 8.1.4 - Enter description
- [ ] 8.1.5 - Select property type
- [ ] 8.1.6 - Enter location/address
- [ ] 8.1.7 - Upload property images (multiple)
- [ ] 8.1.8 - Upload property documents (deed, appraisal, etc)
- [ ] 8.1.9 - Enter total property value
- [ ] 8.1.10 - Set token price
- [ ] 8.1.11 - Set total tokens
- [ ] 8.1.12 - Expected ROI field
- [ ] 8.1.13 - Funding goal and deadline
- [ ] 8.1.14 - Submit property for review
- [ ] 8.1.15 - Confirmation message displays
- [ ] 8.1.16 - Property status: "Pending Approval"

### 8.2 Property Management
- [ ] 8.2.1 - View "My Properties" dashboard
- [ ] 8.2.2 - Each property shows status
- [ ] 8.2.3 - Edit pending property
- [ ] 8.2.4 - Cannot edit approved property
- [ ] 8.2.5 - View funding progress
- [ ] 8.2.6 - View investor list
- [ ] 8.2.7 - Upload construction updates (if applicable)
- [ ] 8.2.8 - Set rental income amounts
- [ ] 8.2.9 - Distribute dividends to investors

---

## 9. BROKER PROGRAM (20 tests)

### 9.1 Broker Application
- [ ] 9.1.1 - Navigate to broker program page
- [ ] 9.1.2 - Program benefits displayed
- [ ] 9.1.3 - Application form accessible
- [ ] 9.1.4 - Enter broker details
- [ ] 9.1.5 - Upload required documents
- [ ] 9.1.6 - Submit application
- [ ] 9.1.7 - Application confirmation received
- [ ] 9.1.8 - Application status: "Under Review"

### 9.2 Broker Dashboard
- [ ] 9.2.1 - Broker dashboard displays after approval
- [ ] 9.2.2 - Unique referral link generated
- [ ] 9.2.3 - Referral QR code downloadable
- [ ] 9.2.4 - Total referrals count
- [ ] 9.2.5 - Conversion rate displays
- [ ] 9.2.6 - Commission earned displays
- [ ] 9.2.7 - Pending commission displays
- [ ] 9.2.8 - Commission payout history
- [ ] 9.2.9 - Referral performance analytics
- [ ] 9.2.10 - Top performing properties
- [ ] 9.2.11 - Marketing materials downloadable
- [ ] 9.2.12 - Commission withdrawal option

---

## 10. NOTIFICATIONS (15 tests)

### 10.1 In-App Notifications
- [ ] 10.1.1 - Notification icon in navbar
- [ ] 10.1.2 - Badge shows unread count
- [ ] 10.1.3 - Click opens notification dropdown
- [ ] 10.1.4 - Recent notifications display
- [ ] 10.1.5 - Notification types (investment/dividend/system/etc)
- [ ] 10.1.6 - Click notification opens relevant page
- [ ] 10.1.7 - Mark as read works
- [ ] 10.1.8 - Mark all as read works
- [ ] 10.1.9 - Delete notification works
- [ ] 10.1.10 - View all notifications page

### 10.2 Email Notifications
- [ ] 10.2.1 - Welcome email received on registration
- [ ] 10.2.2 - Email verification email sent
- [ ] 10.2.3 - Investment confirmation email
- [ ] 10.2.4 - Dividend payment email
- [ ] 10.2.5 - Password reset email

---

## 11. ADMIN FEATURES (20 tests)

### 11.1 Admin Dashboard
- [ ] 11.1.1 - Access admin dashboard at `/admin`
- [ ] 11.1.2 - Total platform metrics display
- [ ] 11.1.3 - User count displays
- [ ] 11.1.4 - Total investments display
- [ ] 11.1.5 - Active properties count
- [ ] 11.1.6 - Revenue metrics
- [ ] 11.1.7 - Recent activity feed

### 11.2 User Management
- [ ] 11.2.1 - View all users list
- [ ] 11.2.2 - Search users
- [ ] 11.2.3 - Filter users by role
- [ ] 11.2.4 - View user details
- [ ] 11.2.5 - Suspend user account
- [ ] 11.2.6 - Activate user account
- [ ] 11.2.7 - Delete user account

### 11.3 Property Approval
- [ ] 11.3.1 - View pending properties
- [ ] 11.3.2 - Review property details
- [ ] 11.3.3 - View uploaded documents
- [ ] 11.3.4 - Approve property
- [ ] 11.3.5 - Reject property with reason
- [ ] 11.3.6 - Request additional information

### 11.4 KYC Review
- [ ] 11.4.1 - View pending KYC submissions
- [ ] 11.4.2 - Review submitted documents
- [ ] 11.4.3 - Approve KYC
- [ ] 11.4.4 - Reject KYC with reason
- [ ] 11.4.5 - Request resubmission

---

## 12. PERFORMANCE & UX (20 tests)

### 12.1 Page Load Performance
- [ ] 12.1.1 - Homepage loads in < 3 seconds
- [ ] 12.1.2 - Property list page loads in < 3 seconds
- [ ] 12.1.3 - Dashboard loads in < 3 seconds
- [ ] 12.1.4 - Images lazy load
- [ ] 12.1.5 - Smooth scroll works
- [ ] 12.1.6 - No layout shift (CLS)

### 12.2 Responsiveness
- [ ] 12.2.1 - Mobile view (375px) works
- [ ] 12.2.2 - Tablet view (768px) works
- [ ] 12.2.3 - Desktop view (1920px) works
- [ ] 12.2.4 - Navigation menu responsive
- [ ] 12.2.5 - Forms responsive on mobile
- [ ] 12.2.6 - Tables responsive (scroll or stack)
- [ ] 12.2.7 - Modals responsive

### 12.3 Accessibility
- [ ] 12.3.1 - Keyboard navigation works
- [ ] 12.3.2 - Tab order logical
- [ ] 12.3.3 - Focus indicators visible
- [ ] 12.3.4 - Alt text on images
- [ ] 12.3.5 - ARIA labels present
- [ ] 12.3.6 - Color contrast sufficient (WCAG AA)
- [ ] 12.3.7 - Screen reader compatible

---

## 13. EDGE CASES & ERROR HANDLING (20 tests)

### 13.1 Network Issues
- [ ] 13.1.1 - Offline message displays
- [ ] 13.1.2 - Failed API calls show error
- [ ] 13.1.3 - Retry button works
- [ ] 13.1.4 - Loading states display
- [ ] 13.1.5 - Timeout handling works

### 13.2 Data Validation
- [ ] 13.2.1 - Empty required fields prevented
- [ ] 13.2.2 - Invalid data formats caught
- [ ] 13.2.3 - SQL injection prevented
- [ ] 13.2.4 - XSS attacks prevented
- [ ] 13.2.5 - CSRF protection works

### 13.3 Session Management
- [ ] 13.3.1 - Expired session redirects to login
- [ ] 13.3.2 - Token refresh works automatically
- [ ] 13.3.3 - Multiple tabs sync properly
- [ ] 13.3.4 - Logout from one tab affects all

### 13.4 Error Pages
- [ ] 13.4.1 - 404 page displays for invalid routes
- [ ] 13.4.2 - 500 error page for server errors
- [ ] 13.4.3 - 403 forbidden page works
- [ ] 13.4.4 - Error pages have "Go Home" button
- [ ] 13.4.5 - Error logging works (Sentry)

---

## Testing Summary

**Total Tests:** 280
**Categories:** 13
**Estimated Time:** 6-8 hours for complete testing

### Testing Priorities

**Priority 1 (Must Pass):**
- Authentication & Login
- KYC Verification
- Investment Flow
- Payment Processing
- Security & Data Protection

**Priority 2 (Should Pass):**
- Property Browsing
- Dashboard Features
- Marketplace
- Notifications
- Performance

**Priority 3 (Nice to Have):**
- Broker Program
- Property Owner Features
- Admin Features
- Accessibility
- Edge Cases

### Issue Reporting Template

```
**Test ID:** [e.g., 5.3.8]
**Test Name:** [e.g., Invalid card number shows error]
**Status:** FAILED
**Browser:** [Chrome/Firefox/Safari]
**OS:** [Windows/Mac/Linux]
**Steps to Reproduce:**
1. ...
2. ...
3. ...

**Expected Result:** ...
**Actual Result:** ...
**Screenshot:** [Attach if available]
**Severity:** [Critical/High/Medium/Low]
**Notes:** ...
```

### Sign-Off

- [ ] All Priority 1 tests passed
- [ ] All Priority 2 tests passed
- [ ] Critical bugs fixed
- [ ] Performance acceptable
- [ ] Security validated
- [ ] Ready for production

**Tested By:** _______________
**Date:** _______________
**Sign-Off:** _______________
