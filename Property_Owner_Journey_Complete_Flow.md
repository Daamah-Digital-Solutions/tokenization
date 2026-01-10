# **Complete Property Owner Journey: From Registration to Rental Distribution**

## **End-to-End Property Tokenization Flow**

---

## **PHASE 1: Property Owner Registration & KYC Verification**

### **Step 1.1: Owner Account Creation**
**Frontend Action:**
- Owner visits `/register` and selects "Property Owner" role
- Fills registration form with email, password, full name, phone

**Backend Processing:**
```python
# POST /api/v1/auth/register/
POST Data: {
    "email": "owner@realestate.com",
    "password": "SecurePass123!",
    "full_name": "John Property Owner",
    "phone_number": "+1234567890",
    "role": "property_owner"
}
```

**Database Operations:**
1. **accounts.User** table - New record created:
   ```sql
   INSERT INTO accounts_user (
       id, email, full_name, role, is_verified, created_at
   ) VALUES (
       uuid(), 'owner@realestate.com', 'John Property Owner',
       'property_owner', FALSE, NOW()
   )
   ```

2. **Email Verification Token** generated and sent
3. **Initial Profile** created with default settings

**Smart Contracts:** None at this stage

**Blockchain:** No interaction

---

### **Step 1.2: Email Verification**
**Frontend Action:**
- Owner clicks verification link in email
- Redirected to `/verify-email?token=xxx`

**Backend Processing:**
```python
# POST /api/v1/auth/verify-email/
{
    "token": "email_verification_token_abc123"
}
```

**Database Operations:**
```sql
UPDATE accounts_user
SET is_verified = TRUE, email_verified_at = NOW()
WHERE id = 'user_uuid';

DELETE FROM accounts_emailverificationtoken
WHERE token = 'email_verification_token_abc123';
```

**Email Notification:** Welcome email sent with next steps

---

### **Step 1.3: KYC Document Submission**
**Frontend Action:**
- Owner navigates to `/kyc-verification`
- Uploads ID document, proof of address, selfie
- Fills personal information form

**Backend Processing:**
```python
# POST /api/v1/kyc/submit/
FormData: {
    "id_document": File,
    "proof_of_address": File,
    "selfie": File,
    "document_type": "passport",
    "document_number": "P1234567",
    "date_of_birth": "1980-05-15",
    "nationality": "US",
    "address": "123 Main St, New York, NY"
}
```

**Database Operations:**
1. **kyc.KYCDocument** records created:
   ```sql
   INSERT INTO kyc_kycdocument (id, user_id, document_type, status, uploaded_at)
   VALUES (uuid(), 'user_uuid', 'government_id', 'pending', NOW());

   INSERT INTO kyc_kycdocument (id, user_id, document_type, status, uploaded_at)
   VALUES (uuid(), 'user_uuid', 'proof_of_address', 'pending', NOW());
   ```

2. **Files saved** to media storage: `media/kyc_documents/user_uuid/`

**Integration:** Documents sent to Jumio API for automated verification

**Admin Notification:** Email sent to compliance team for manual review

---

### **Step 1.4: KYC Approval**
**Admin Panel Action:**
- Admin reviews documents at `/admin/kyc/kycdocument/`
- Approves or requests changes

**Backend Processing:**
```python
# Admin action updates status
UPDATE kyc_kycdocument
SET status = 'approved', reviewed_by_id = 'admin_uuid', reviewed_at = NOW()
WHERE user_id = 'user_uuid';
```

**Email Notification:** Owner receives approval email

**Status Change:** User can now create properties

---

## **PHASE 2: Property Creation & Submission**

### **Step 2.1: Property Draft Creation**
**Frontend Action:**
- Owner navigates to `/property-owner/dashboard/create-property`
- Fills comprehensive property form

**Backend Processing:**
```python
# POST /api/v1/properties/create/
{
    "title": "Luxury Apartment Complex - Manhattan",
    "description": "Modern 50-unit apartment building...",
    "property_type": "residential",
    "property_category": "ready_property",  # or "under_construction"
    "total_value": "5000000.00",
    "token_price": "100.00",
    "total_tokens": 50000,
    "expected_return": "8.5",
    "rental_yield": "6.0",
    "address": "456 Park Avenue, New York, NY 10022",
    "city": "New York",
    "country": "USA",
    "property_size": "45000",
    "year_built": 2023,
    "monthly_rental_income": "25000.00",
    "occupancy_rate": "95.00",

    # For under_construction properties:
    "expected_completion_date": "2025-12-31",
    "supports_installments": true,
    "installment_period_months": 24
}
```

**Database Operations:**
```sql
INSERT INTO properties_property (
    id, owner_id, title, description, property_type, property_category,
    status, total_value, token_price, total_tokens, tokens_sold,
    expected_return, rental_yield, address, city, country,
    created_at, updated_at
) VALUES (
    uuid(), 'user_uuid', 'Luxury Apartment Complex - Manhattan',
    'Modern 50-unit apartment building...', 'residential', 'ready_property',
    'draft', 5000000.00, 100.00, 50000, 0,
    8.5, 6.0, '456 Park Avenue...', 'New York', 'USA',
    NOW(), NOW()
);
```

**File Operations:**
- Property images uploaded to `media/property_images/property_uuid/`
- Legal documents uploaded to `media/property_documents/property_uuid/`

---

### **Step 2.2: Property Image & Document Upload**
**Frontend Action:**
- Owner uploads multiple property images
- Uploads legal documents (title deed, valuation report, etc.)

**Backend Processing:**
```python
# POST /api/v1/properties/{property_id}/images/
FormData: {
    "image": File,
    "caption": "Main Entrance View",
    "is_primary": true
}

# POST /api/v1/properties/{property_id}/documents/
FormData: {
    "document": File,
    "name": "Title Deed",
    "document_type": "legal",
    "description": "Official property ownership document"
}
```

**Database Operations:**
```sql
-- Images
INSERT INTO properties_property_image (
    id, property_id, image, caption, is_primary, order, created_at
) VALUES (
    uuid(), 'property_uuid', 'property_images/img1.jpg',
    'Main Entrance View', true, 0, NOW()
);

-- Documents
INSERT INTO properties_property_document (
    id, property_id, name, document, document_type, size, uploaded_at
) VALUES (
    uuid(), 'property_uuid', 'Title Deed',
    'property_documents/deed.pdf', 'legal', 2456789, NOW()
);
```

---

### **Step 2.3: Property Submission for Approval**
**Frontend Action:**
- Owner reviews property draft
- Clicks "Submit for Approval"

**Backend Processing:**
```python
# POST /api/v1/properties/{property_id}/submit-for-approval/
```

**Database Operations:**
```sql
-- Update property status
UPDATE properties_property
SET status = 'pending_approval', updated_at = NOW()
WHERE id = 'property_uuid';

-- Create approval workflow record
INSERT INTO properties_property_approval (
    id, property_id, status, submitted_at
) VALUES (
    uuid(), 'property_uuid', 'pending', NOW()
);
```

**Email Notifications:**
1. **Owner:** "Your property has been submitted for review"
2. **Admin Team:** "New property pending approval: [Property Title]"

---

## **PHASE 3: Admin Review & Approval**

### **Step 3.1: Admin Review Process**
**Admin Panel Action:**
- Admin accesses `/admin/properties/propertyapproval/`
- Reviews property details, images, documents
- Checks valuation reports, legal documents

**Backend Processing:**
```python
# Admin updates approval status
UPDATE properties_property_approval
SET status = 'under_review',
    reviewer_id = 'admin_uuid',
    reviewed_at = NOW()
WHERE property_id = 'property_uuid';
```

---

### **Step 3.2: Property Approval**
**Admin Panel Action:**
- Admin approves property
- Sets approval notes

**Backend Processing:**
```python
# PATCH /api/v1/admin/properties/{property_id}/approve/
{
    "review_notes": "Property meets all requirements. Legal documents verified.",
    "approval_decision": "approved"
}
```

**Database Operations:**
```sql
-- Update approval record
UPDATE properties_property_approval
SET status = 'approved',
    review_notes = 'Property meets all requirements...',
    approved_at = NOW()
WHERE property_id = 'property_uuid';

-- Update property status
UPDATE properties_property
SET status = 'approved', updated_at = NOW()
WHERE id = 'property_uuid';

-- Create analytics record
INSERT INTO properties_property_analytics (
    id, property_id, total_views, unique_views, created_at
) VALUES (
    uuid(), 'property_uuid', 0, 0, NOW()
);
```

**Email Notification:** Owner receives approval email with next steps

---

## **PHASE 4: Smart Contract Deployment (Tokenization)**

### **Step 4.1: Triggering Contract Deployment**
**Frontend Action:**
- Owner clicks "Tokenize Property" button in dashboard
- Or admin triggers deployment after approval

**Backend Processing:**
```python
# POST /api/v1/properties/{property_id}/deploy-contract/
{
    "blockchain_network": "polygon_mumbai",  # or "bsc_testnet"
    "multi_sig_owners": [
        "0xOwnerAddress1",
        "0xOwnerAddress2",
        "0xPlatformAddress"
    ]
}
```

**Service Layer (`blockchain/services/property_tokenization_service.py`):**
```python
def deploy_property_contract(property_id, network_id, multi_sig_owners):
    property = Property.objects.get(id=property_id)
    network = BlockchainNetwork.objects.get(id=network_id)

    # Initialize Web3
    web3_service = Web3Service()
    web3_service.initialize_network(network_id)

    # Get Factory Contract
    factory_contract = SmartContract.objects.get(
        contract_name='PropertyContractFactory',
        network=network,
        deployment_status='deployed'
    )

    # Prepare deployment parameters
    deployment_params = {
        'totalSupply': property.total_tokens,
        'category': 0 if property.is_under_construction else 1,
        'tokenPrice': web3_service.w3.to_wei(property.token_price, 'ether'),
        'lockupPeriod': 365 * 24 * 60 * 60,  # 1 year in seconds
        'earlyExitFeeRate': 500,  # 5%
        'rentalYieldRate': int(property.rental_yield * 100),
        'propertyURI': f'ipfs://{upload_to_ipfs(property)}',
        'distributionFrequency': 1,  # Monthly
        'paymentToken': 0,  # ETH
        'multiSigOwners': multi_sig_owners
    }

    # Call Factory Contract
    factory = web3_service.get_contract(factory_contract)
    tx_hash = factory.functions.deployProperty(**deployment_params).transact({
        'from': web3_service.account.address,
        'gas': 5000000
    })

    # Wait for confirmation
    receipt = web3_service.w3.eth.wait_for_transaction_receipt(tx_hash)

    return receipt
```

---

### **Step 4.2: Smart Contract Deployment Execution**

**Blockchain Operations:**

1. **PropertyContractFactory.deployProperty()** called on-chain:
   ```solidity
   // Deploys minimal proxy clone of RealEstateToken
   address tokenContract = Clones.clone(realEstateTokenTemplate);

   // Initialize token contract
   RealEstateToken(tokenContract).initialize(
       propertyURI,
       multiSigOwners,
       requiredConfirmations
   );

   // Create property in token contract
   uint256 tokenId = RealEstateToken(tokenContract).createProperty(
       totalSupply: 50000,
       category: READY_PROPERTY,
       tokenPrice: 100 ether,
       lockupPeriod: 31536000,  // 1 year
       earlyExitFeeRate: 500,    // 5%
       rentalYieldRate: 600,     // 6%
       propertyManager: msg.sender,
       propertyURI: "ipfs://QmXxx..."
   );

   // Deploy RentalIncomeDistributor (for ready properties)
   address distributorContract = Clones.clone(rentalDistributorTemplate);
   RentalIncomeDistributor(distributorContract).initialize(...);

   // Register property in distributor
   RentalIncomeDistributor(distributorContract).registerProperty(
       tokenId,
       MONTHLY,      // Distribution frequency
       ETH,          // Payment token
       250,          // 2.5% platform fee
       msg.sender    // Property manager
   );

   // Store deployment info
   deployedContracts[propertyId] = DeployedContracts({
       tokenContract: tokenContract,
       distributorContract: distributorContract,
       propertyTokenId: tokenId,
       propertyOwner: msg.sender,
       deployedAt: block.timestamp,
       isActive: true
   });

   emit PropertyDeployed(propertyId, tokenContract, distributorContract, msg.sender);
   ```

2. **Gas Cost:** ~$30-50 (depending on network)

3. **Transaction Confirmed:** After 12-15 blocks (~30-45 seconds on Polygon)

---

### **Step 4.3: Post-Deployment Database Update**

**Backend Processing:**
```python
# blockchain/services/property_tokenization_service.py continued...

def update_property_after_deployment(property_id, receipt):
    # Extract deployed contract addresses from logs
    factory_contract = get_factory_contract()
    event = factory_contract.events.PropertyDeployed().process_receipt(receipt)[0]

    token_contract_address = event['args']['tokenContract']
    distributor_contract_address = event['args']['distributorContract']
    property_token_id = event['args']['propertyTokenId']  # This is different from property_id

    # Update database
    property = Property.objects.get(id=property_id)
    property.smart_contract_address = token_contract_address
    property.status = 'tokenized'
    property.save(update_fields=['smart_contract_address', 'status'])

    # Save contract metadata
    SmartContract.objects.create(
        contract_address=token_contract_address,
        network=network,
        contract_name=f'PropertyToken_{property.title}',
        abi=get_token_abi(),
        deployment_status='deployed',
        property_id=property_id
    )
```

**Database Operations:**
```sql
UPDATE properties_property
SET smart_contract_address = '0xTokenContractAddress',
    status = 'tokenized',
    updated_at = NOW()
WHERE id = 'property_uuid';

INSERT INTO blockchain_smartcontract (
    id, contract_address, network_id, contract_name,
    abi, deployment_status, property_id, created_at
) VALUES (
    uuid(), '0xTokenContractAddress', 'network_uuid',
    'PropertyToken_Luxury_Apartment_Complex',
    '[{"inputs":[],"name":"totalSupply"...}]',
    'deployed', 'property_uuid', NOW()
);
```

**Email Notification:** Owner receives deployment confirmation with:
- Contract addresses (Token + Distributor)
- Block explorer links
- Next steps for activation

---

### **Step 4.4: Property Activation**
**Frontend Action:**
- Owner or admin activates property for investment

**Backend Processing:**
```python
# POST /api/v1/properties/{property_id}/activate/
```

**Smart Contract Call:**
```python
token_contract.functions.activateProperty(propertyTokenId).transact({
    'from': admin_address
})
```

**Database Operations:**
```sql
UPDATE properties_property
SET status = 'active', updated_at = NOW()
WHERE id = 'property_uuid';
```

**Result:** Property now visible to investors and accepting investments

---

## **PHASE 5: Investment Phase**

### **Step 5.1: Investor Discovers Property**
**Frontend Action:**
- Investor browses `/properties` or `/marketplace`
- Clicks on "Luxury Apartment Complex - Manhattan"
- Views property details at `/properties/{property_id}`

**Backend Processing:**
```python
# GET /api/v1/properties/{property_id}/
Response: {
    "id": "property_uuid",
    "title": "Luxury Apartment Complex - Manhattan",
    "status": "active",
    "total_value": "5000000.00",
    "token_price": "100.00",
    "total_tokens": 50000,
    "tokens_sold": 0,
    "tokens_available": 50000,
    "funding_percentage": 0.00,
    "expected_return": "8.5",
    "rental_yield": "6.0",
    "smart_contract_address": "0xTokenContract...",
    "images": [...],
    "documents": [...]
}
```

**Analytics Tracking:**
```sql
INSERT INTO properties_property_view_log (
    id, property_id, user_id, ip_address, viewed_at
) VALUES (
    uuid(), 'property_uuid', 'investor_uuid', '192.168.1.1', NOW()
);

UPDATE properties_property_analytics
SET total_views = total_views + 1,
    unique_views = unique_views + 1
WHERE property_id = 'property_uuid';
```

---

### **Step 5.2: Investment Calculation**
**Frontend Action:**
- Investor enters desired token amount (e.g., 100 tokens)
- Frontend calculates investment details

**Backend Processing:**
```python
# POST /api/v1/investments/calculate/
{
    "property_id": "property_uuid",
    "token_amount": 100,
    "payment_method": "credit_card"
}

Response: {
    "success": true,
    "data": {
        "property_id": "property_uuid",
        "token_amount": 100,
        "token_price": "100.00",
        "subtotal": "10000.00",
        "platform_fee": "250.00",  # 2.5%
        "processing_fee": "300.00",  # Payment processor fee
        "total_amount": "10550.00",
        "ownership_percentage": "0.2000",
        "estimated_monthly_income": "50.00",  # Based on rental yield
        "estimated_annual_return": "850.00",
        "tokens_available": 50000,
        "can_invest": true
    }
}
```

---

### **Step 5.3: Investment Creation (Payment Processing)**
**Frontend Action:**
- Investor clicks "Invest Now"
- Enters payment details (Stripe, PayPal, or Crypto)

**Backend Processing:**
```python
# POST /api/v1/investments/create/
{
    "property_id": "property_uuid",
    "token_amount": 100,
    "investment_amount": "10550.00",
    "payment_method": "stripe",
    "payment_details": {
        "stripe_payment_method_id": "pm_xxx"
    }
}
```

**Service Layer Flow:**

**1. Create Token Reservation:**
```python
# investments/services.py
reservation = TokenReservation.objects.create(
    user=investor,
    property_investment=property,
    token_amount=100,
    reserved_at=now(),
    expires_at=now() + timedelta(minutes=15),  # 15-minute hold
    released=False
)
```

**Database:**
```sql
INSERT INTO investments_token_reservation (
    id, user_id, property_investment_id, token_amount,
    reserved_at, expires_at, released
) VALUES (
    uuid(), 'investor_uuid', 'property_uuid', 100,
    NOW(), NOW() + INTERVAL '15 minutes', FALSE
);
```

**2. Process Payment (Stripe):**
```python
# payments/services/stripe_service.py
payment_intent = stripe.PaymentIntent.create(
    amount=int(10550.00 * 100),  # Amount in cents
    currency='usd',
    payment_method='pm_xxx',
    confirm=True,
    metadata={
        'investment_id': str(investment.id),
        'property_id': str(property.id),
        'token_amount': 100
    }
)
```

**3. Create Investment Record:**
```sql
INSERT INTO investments_investment (
    id, user_id, property_investment_id, token_amount,
    investment_amount, status, payment_method, created_at
) VALUES (
    uuid(), 'investor_uuid', 'property_uuid', 100,
    10550.00, 'processing', '{"method": "stripe", "payment_intent": "pi_xxx"}',
    NOW()
);
```

**4. Create Payment Record:**
```sql
INSERT INTO payments_payment (
    id, user_id, amount, currency, provider, status, created_at
) VALUES (
    uuid(), 'investor_uuid', 10550.00, 'USD', 'stripe', 'completed', NOW()
);
```

---

## **PHASE 6: Token Minting (Blockchain)**

### **Step 6.1: Trigger Blockchain Minting**
**Backend Processing (Celery Task):**
```python
# investments/tasks.py
@celery_app.task
def mint_tokens_for_investment(investment_id):
    investment = Investment.objects.get(id=investment_id)
    property = investment.property_investment

    # Initialize Web3
    web3_service = Web3Service()
    web3_service.initialize_network(property.network_id)

    # Get Token Contract
    token_contract = web3_service.get_contract_for_property(property.id)

    # Prepare minting parameters
    mint_params = {
        'tokenId': property.blockchain_token_id,
        'investor': investment.user.wallet_address,
        'amount': investment.token_amount,
        'isInstallment': False,
        'totalInstallments': 0
    }

    # Execute minting transaction
    tx_hash = token_contract.functions.mintTokens(**mint_params).transact({
        'from': web3_service.account.address,
        'gas': 200000
    })

    # Update investment with transaction hash
    investment.transaction_hash = tx_hash.hex()
    investment.status = 'pending'
    investment.save()

    # Monitor transaction confirmation
    monitor_transaction_confirmation.apply_async(
        args=[investment_id, tx_hash.hex()],
        countdown=30  # Check after 30 seconds
    )
```

---

### **Step 6.2: Smart Contract Execution**

**On-Chain Operations (`RealEstateToken.mintTokens()`):**
```solidity
function mintTokens(
    uint256 tokenId,
    address investor,
    uint256 amount,
    bool isInstallment,
    uint256 totalInstallments
) external onlyPropertyManager(tokenId) {
    PropertyInfo storage property = properties[tokenId];
    require(property.status == PropertyStatus.ACTIVE, "Property not active");
    require(property.currentSupply + amount <= property.totalSupply, "Exceeds total supply");

    // Mint ERC1155 tokens
    _mint(investor, tokenId, amount, "");
    property.currentSupply += amount;

    // Update investor information
    InvestorInfo storage investorInfo = investors[tokenId][investor];
    investorInfo.tokenBalance += amount;
    investorInfo.totalInvested += amount * property.tokenPrice;
    investorInfo.lockupEndTime = block.timestamp + property.lockupPeriod;

    emit TokensMinted(tokenId, investor, amount);
}
```

**Blockchain State Changes:**
1. **Investor's token balance** increased by 100 tokens
2. **Property's currentSupply** increased from 0 to 100
3. **Lock-up period** set (1 year from minting)
4. **Event emitted:** `TokensMinted(tokenId, investor, 100)`

---

### **Step 6.3: Transaction Confirmation Monitoring**

**Backend Celery Task:**
```python
@celery_app.task
def monitor_transaction_confirmation(investment_id, tx_hash):
    investment = Investment.objects.get(id=investment_id)
    web3_service = Web3Service()

    try:
        receipt = web3_service.w3.eth.get_transaction_receipt(tx_hash)

        if receipt:
            confirmations = web3_service.get_confirmation_count(tx_hash)

            if confirmations >= 12:  # Required confirmations
                # Transaction confirmed
                investment.blockchain_confirmed = True
                investment.confirmation_blocks = confirmations
                investment.status = 'completed'
                investment.completed_at = timezone.now()
                investment.save()

                # Update property tokens_sold
                property = investment.property_investment
                property.tokens_sold += investment.token_amount
                property.save(update_fields=['tokens_sold'])

                # Release token reservation
                TokenReservation.objects.filter(
                    user=investment.user,
                    property_investment=property,
                    released=False
                ).update(released=True)

                # Send success notification
                send_investment_confirmation_email.delay(investment_id)

            else:
                # Retry monitoring
                monitor_transaction_confirmation.apply_async(
                    args=[investment_id, tx_hash],
                    countdown=30
                )
        else:
            # Transaction not yet mined, retry
            monitor_transaction_confirmation.apply_async(
                args=[investment_id, tx_hash],
                countdown=30
            )

    except Exception as e:
        logger.error(f"Transaction monitoring failed: {str(e)}")
        # Mark as failed after max retries
        investment.status = 'failed'
        investment.save()
```

**Database Updates:**
```sql
UPDATE investments_investment
SET blockchain_confirmed = TRUE,
    confirmation_blocks = 15,
    status = 'completed',
    completed_at = NOW()
WHERE id = 'investment_uuid';

UPDATE properties_property
SET tokens_sold = tokens_sold + 100
WHERE id = 'property_uuid';

UPDATE investments_token_reservation
SET released = TRUE
WHERE user_id = 'investor_uuid' AND property_investment_id = 'property_uuid';
```

---

## **PHASE 7: Property Operation & Management**

### **For READY_PROPERTY: Rental Income Collection**

**Step 7.1: Monthly Rental Income Received**
**Owner Action:**
- Property generates $25,000 in rental income
- Owner deposits funds to platform

**Backend Processing:**
```python
# POST /api/v1/properties/{property_id}/rental-income/deposit/
{
    "amount": "25000.00",
    "period": "2025-01",
    "payment_proof": File
}
```

**Database Operations:**
```sql
INSERT INTO properties_rental_income_distribution (
    id, property_id, distribution_period, total_rental_income,
    platform_fee, net_distribution_amount, tokens_eligible,
    amount_per_token, distribution_date
) VALUES (
    uuid(), 'property_uuid', '2025-01', 25000.00,
    625.00,  -- 2.5% platform fee
    24375.00,  -- Net amount
    100,  -- Tokens currently sold
    243.75,  -- Amount per token ($24,375 / 100)
    NOW()
);
```

---

### **Step 7.2: Initiate Rental Distribution (Smart Contract)**

**Backend Processing:**
```python
# POST /api/v1/properties/{property_id}/distribute-rental-income/
{
    "total_amount": "25000.00",
    "distribution_period": "2025-01"
}
```

**Smart Contract Call:**
```python
distributor_contract = web3_service.get_distributor_contract(property.id)

tx_hash = distributor_contract.functions.initiateDistribution(
    propertyTokenId=property.blockchain_token_id,
    totalAmount=web3.to_wei(25000, 'ether')
).transact({
    'from': platform_wallet,
    'value': web3.to_wei(25000, 'ether'),  # Send ETH with transaction
    'gas': 300000
})
```

**On-Chain Execution (`RentalIncomeDistributor.initiateDistribution()`):**
```solidity
function initiateDistribution(
    uint256 propertyTokenId,
    uint256 totalAmount
) external onlyPropertyManager(propertyTokenId) {
    PropertyDistribution storage propDist = propertyDistributions[propertyTokenId];
    uint256 distributionId = distributionCounters[propertyTokenId]++;

    // Calculate platform fee
    uint256 platformFee = (totalAmount * propDist.platformFeeRate) / 10000;  // 2.5%
    uint256 netAmount = totalAmount - platformFee;

    // Get eligible token supply
    uint256 eligibleTokens = realEstateToken().balanceOf(propertyTokenId);

    // Store distribution record
    DistributionRecord storage record = distributionRecords[propertyTokenId][distributionId];
    record.totalAmount = totalAmount;
    record.netAmount = netAmount;
    record.eligibleTokens = eligibleTokens;
    record.distributionTime = block.timestamp;
    record.status = DistributionStatus.COMPLETED;

    // Transfer platform fee
    payable(platformTreasury()).transfer(platformFee);

    emit DistributionInitiated(propertyTokenId, distributionId, totalAmount);
}
```

**Blockchain State Changes:**
1. **Distribution record created** on-chain with ID 0
2. **Platform fee** ($625) transferred to platform treasury
3. **Net distribution** ($24,375) held in contract for claiming

---

### **Step 7.3: Investor Claims Rental Income**

**Frontend Action:**
- Investor sees "Claim $243.75" button in dashboard
- Clicks "Claim Dividend"

**Backend Processing:**
```python
# POST /api/v1/investments/{investment_id}/claim-dividend/
{
    "distribution_id": 0
}
```

**Smart Contract Call:**
```python
distributor_contract.functions.claimIncome(
    propertyTokenId=property_token_id,
    distributionId=0
).transact({
    'from': investor.wallet_address,
    'gas': 150000
})
```

**On-Chain Execution (`RentalIncomeDistributor.claimIncome()`):**
```solidity
function claimIncome(
    uint256 propertyTokenId,
    uint256 distributionId
) external nonReentrant {
    require(realEstateToken().balanceOf(msg.sender, propertyTokenId) > 0, "No tokens");

    DistributionRecord storage record = distributionRecords[propertyTokenId][distributionId];
    require(record.status == DistributionStatus.COMPLETED, "Not ready");
    require(!record.claimed[msg.sender], "Already claimed");

    // Calculate claim amount
    uint256 investorTokens = realEstateToken().balanceOf(msg.sender, propertyTokenId);
    uint256 claimAmount = (record.netAmount * investorTokens) / record.eligibleTokens;
    // claimAmount = ($24,375 * 100) / 100 = $243.75

    // Mark as claimed
    record.claimed[msg.sender] = true;
    record.totalClaimed += claimAmount;
    record.totalUnclaimed -= claimAmount;

    // Transfer payment
    payable(msg.sender).transfer(claimAmount);

    emit IncomeClaimed(propertyTokenId, distributionId, msg.sender, claimAmount);
}
```

**Database Recording:**
```sql
INSERT INTO investments_dividend_payment (
    id, investment_id, amount, currency, payment_date,
    period_start, period_end, status, created_at
) VALUES (
    uuid(), 'investment_uuid', 243.75, 'USD', NOW(),
    '2025-01-01', '2025-01-31', 'paid', NOW()
);
```

**Result:** Investor receives $243.75 ETH in wallet

---

### **For UNDER_CONSTRUCTION: Progress Updates**

**Step 7.4: Construction Progress Update**
**Owner Action:**
- Updates construction completion to 25%
- Uploads progress photos

**Backend Processing:**
```python
# PATCH /api/v1/properties/{property_id}/construction-progress/
{
    "construction_progress": 25.00,
    "update_notes": "Foundation completed, framing in progress"
}
```

**Database Operations:**
```sql
UPDATE properties_property
SET construction_progress = 25.00, updated_at = NOW()
WHERE id = 'property_uuid';

INSERT INTO properties_property_update (
    id, property_id, title, content, update_type, created_at
) VALUES (
    uuid(), 'property_uuid', 'Construction Progress: 25% Complete',
    'Foundation completed, framing in progress...', 'construction', NOW()
);
```

**Investor Notifications:**
- Email sent to all token holders
- WebSocket notification pushed to dashboard
- SMS to investors who opted in

---

### **Step 7.5: Construction Completion**
**Backend Processing:**
```python
# POST /api/v1/properties/{property_id}/mark-complete/
```

**Smart Contract Call:**
```python
token_contract.functions.markConstructionComplete(
    propertyTokenId
).transact({
    'from': property_manager_address
})
```

**On-Chain Execution:**
```solidity
function markConstructionComplete(uint256 tokenId) external {
    PropertyInfo storage property = properties[tokenId];
    require(property.category == PropertyCategory.UNDER_CONSTRUCTION);

    property.completionDate = block.timestamp;
    property.status = PropertyStatus.COMPLETED;
    property.rentalIncomeActive = true;  // Enable rental income
}
```

**Database Operations:**
```sql
UPDATE properties_property
SET construction_progress = 100.00,
    rental_income_active = TRUE,
    status = 'completed',
    updated_at = NOW()
WHERE id = 'property_uuid';
```

**Result:** Property now eligible for rental income distribution

---

## **PHASE 8: Secondary Market Trading** (Future Feature)

### **Step 8.1: Investor Creates Listing**
**Frontend Action:**
- Investor navigates to `/marketplace/create-listing`
- Lists 50 tokens for sale at $105 each

**Backend Processing:**
```python
# POST /api/v1/marketplace/listings/create/
{
    "investment_id": "investment_uuid",
    "tokens_for_sale": 50,
    "price_per_token": "105.00"
}
```

**Database Operations:**
```sql
INSERT INTO marketplace_listing (
    id, investment_id, tokens_for_sale, price_per_token,
    status, created_at
) VALUES (
    uuid(), 'investment_uuid', 50, 105.00, 'active', NOW()
);
```

---

### **Step 8.2: Purchase from Secondary Market**
**Buyer Action:**
- Another investor purchases 50 tokens from listing

**Smart Contract Execution:**
```solidity
// MarketplaceEscrow.executeTrade()
function executeTrade(uint256 listingId) external payable {
    // Transfer tokens from seller to buyer via escrow
    // Deduct platform fee
    // Release payment to seller
}
```

**Result:** Token ownership transferred on-chain

---

## **Summary of Complete Flow**

### **Database Tables Involved:**
1. **accounts_user** - Owner/investor accounts
2. **kyc_kycdocument** - KYC verification
3. **properties_property** - Property core data
4. **properties_property_image** - Property images
5. **properties_property_document** - Legal documents
6. **properties_property_approval** - Approval workflow
7. **blockchain_smartcontract** - Contract metadata
8. **investments_investment** - Investment records
9. **investments_token_reservation** - Temporary holds
10. **payments_payment** - Payment transactions
11. **properties_rental_income_distribution** - Rental tracking
12. **investments_dividend_payment** - Dividend records
13. **marketplace_listing** - Secondary market

### **Smart Contracts Involved:**
1. **PropertyContractFactory** - Deploys property contracts
2. **RealEstateToken** (ERC1155) - Ownership tokens
3. **RentalIncomeDistributor** - Dividend distribution
4. **MarketplaceEscrow** - P2P trading

### **External Services:**
1. **Stripe** - Payment processing
2. **Jumio** - KYC verification
3. **Polygon/BSC** - Blockchain networks
4. **IPFS** - Metadata storage
5. **SendGrid/AWS SES** - Email notifications

### **Typical Timeline:**
- **Owner Registration to KYC Approval:** 2-5 days
- **Property Submission to Approval:** 3-7 days
- **Contract Deployment:** 1-2 hours
- **Investment to Token Minting:** 5-10 minutes
- **Rental Distribution:** Monthly automated

This comprehensive flow ensures secure, transparent, and automated property tokenization from end to end!
