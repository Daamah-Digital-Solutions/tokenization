# Blockchain Smart Contract Deployment Guide

## Overview

This guide covers deploying Capimax real estate tokenization smart contracts to testnet and mainnet, testing tokenization functionality, and integrating with the Django backend.

---

## Smart Contracts

### 1. RealEstateToken.sol
**ERC1155 multi-token standard for property tokenization**

**Features:**
- Support for construction and ready properties
- Multi-signature governance controls
- Graduated token release for installment payments
- Automated rental income distribution
- Lock-up periods with early exit penalties
- Property manager roles and permissions

**Key Functions:**
- `createProperty()` - Create new tokenized property
- `mintTokens()` - Mint tokens for investors
- `processInstallment()` - Release tokens gradually for installment plans
- `distributeRentalIncome()` - Distribute rental income to token holders
- `claimRentalIncome()` - Investors claim their rental income
- `earlyExit()` - Early exit from investment with fee

### 2. PropertyContractFactory.sol
**Factory contract for gas-efficient property deployment**

**Features:**
- EIP-1167 minimal proxy pattern for gas savings
- Standardized property contract creation
- Property registry and management
- Batch deployment support
- Multi-signature setup for each property

**Key Functions:**
- `deployProperty()` - Deploy new property contracts
- `batchDeployProperties()` - Deploy multiple properties at once
- `activateProperty()` - Activate property for investment
- `getDeployedContracts()` - Get contract addresses for a property

### 3. RentalIncomeDistributor.sol
**Automated rental income distribution**

**Features:**
- Monthly/quarterly/semi-annual/annual distributions
- Multi-token support (ETH, USDC, USDT, DAI)
- Gas-efficient batch distributions
- Unclaimed income rollover
- Platform fee deduction
- Emergency withdrawal mechanisms

**Key Functions:**
- `registerProperty()` - Register property for distributions
- `initiateDistribution()` - Start new distribution cycle
- `claimIncome()` - Investors claim rental income
- `claimAllAvailableIncome()` - Claim all pending distributions

---

## Prerequisites

### 1. Node.js and npm
```bash
# Install Node.js v18+ from https://nodejs.org
node --version  # Should be v18 or higher
npm --version
```

### 2. Get Testnet Funds

**BNB Smart Chain Testnet:**
1. Go to https://testnet.binancechain.org/faucet-smart
2. Enter your wallet address
3. Receive test BNB (needed for gas fees)

**Polygon Mumbai Testnet:**
1. Go to https://faucet.polygon.technology/
2. Enter your wallet address
3. Receive test MATIC

### 3. Create Deployment Wallet

**Using MetaMask:**
1. Install MetaMask: https://metamask.io/
2. Create new account or use existing
3. Export private key (Settings → Security & Privacy → Reveal Private Key)
4. **⚠️ NEVER share or commit your private key!**

---

## Installation & Setup

### Step 1: Install Dependencies

```bash
cd capimax_backend/blockchain/contracts

# Install Node.js dependencies
npm install
```

### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env file
nano .env
```

**Add your configuration:**
```env
# Your deployer wallet private key (without 0x prefix)
DEPLOYER_PRIVATE_KEY=your-private-key-here

# BscScan API key (for contract verification)
BSCSCAN_API_KEY=your-api-key

# PolygonScan API key (for contract verification)
POLYGONSCAN_API_KEY=your-api-key
```

**Get API Keys:**
- BscScan: https://bscscan.com/myapikey
- PolygonScan: https://polygonscan.com/myapikey

### Step 3: Compile Contracts

```bash
# Compile all smart contracts
npm run compile

# You should see:
# ✓ Compiled 15 Solidity files successfully
```

---

## Deployment

### Deploy to BNB Smart Chain Testnet

```bash
npm run deploy:bsc-testnet
```

**Expected Output:**
```
=================================
Capimax Smart Contracts Deployment
=================================

Deploying contracts with account: 0x...
Account balance: 1000000000000000000 wei

Step 1: Deploying RealEstateToken template...
✅ RealEstateToken template deployed to: 0xABC123...

Step 2: Deploying RentalIncomeDistributor template...
✅ RentalIncomeDistributor template deployed to: 0xDEF456...

Step 3: Deploying PropertyContractFactory...
✅ PropertyContractFactory deployed to: 0xGHI789...

=================================
Deployment Summary
=================================
Network: bscTestnet
Deployer: 0x...

Contract Addresses:
-------------------
RealEstateToken Template: 0xABC123...
RentalIncomeDistributor Template: 0xDEF456...
PropertyContractFactory: 0xGHI789...
Platform Treasury: 0x...

✅ Deployment info saved to: ./deployments/bscTestnet-1234567890.json
✅ Latest deployment saved to: ./deployments/bscTestnet-latest.json
```

### Deploy to Polygon Mumbai Testnet

```bash
npm run deploy:polygon-testnet
```

---

## Contract Verification

Verify contracts on block explorers for transparency:

### BNB Smart Chain Testnet

```bash
# Verify RealEstateToken template
npx hardhat verify --network bscTestnet 0xABC123...

# Verify RentalIncomeDistributor template
npx hardhat verify --network bscTestnet 0xDEF456...

# Verify PropertyContractFactory
npx hardhat verify --network bscTestnet 0xGHI789... \
  0xABC123... \
  0xDEF456... \
  0x...  # platform treasury address
```

### View Verified Contracts

- **BNB Testnet**: https://testnet.bscscan.com/address/YOUR_CONTRACT_ADDRESS
- **Polygon Mumbai**: https://mumbai.polygonscan.com/address/YOUR_CONTRACT_ADDRESS

---

## Backend Integration

### Step 1: Update Django .env

Add deployed contract addresses to `capimax_backend/.env`:

```env
# Blockchain Configuration
ETHEREUM_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
BLOCKCHAIN_PRIVATE_KEY=your-private-key-here
CONTRACT_FACTORY_ADDRESS=0xGHI789...
REAL_ESTATE_TOKEN_TEMPLATE=0xABC123...
RENTAL_DISTRIBUTOR_TEMPLATE=0xDEF456...
BLOCKCHAIN_CONFIRMATION_BLOCKS=3
```

### Step 2: Test Backend Connection

```python
cd capimax_backend
python manage.py shell

from blockchain.services.web3_service import Web3Service

# Initialize service
web3_service = Web3Service()

# Check connection
print("Connected:", web3_service.is_connected())
print("Chain ID:", web3_service.get_chain_id())
print("Block Number:", web3_service.get_block_number())

# Check factory contract
factory = web3_service.get_factory_contract()
print("Factory Address:", factory.address)
```

---

## Testing Tokenization

### Test 1: Create Test Property

```python
from blockchain.services.property_tokenization_service import PropertyTokenizationService

service = PropertyTokenizationService()

# Create test property
property_data = {
    'total_supply': 1000,  # 1000 tokens
    'category': 1,  # READY_PROPERTY
    'token_price': web3_service.web3.to_wei(100, 'ether'),  # 100 BNB per token
    'lockup_period': 180 * 24 * 60 * 60,  # 180 days
    'early_exit_fee_rate': 500,  # 5%
    'rental_yield_rate': 800,  # 8% annual
    'property_manager': '0x...',  # Your address
    'property_uri': 'ipfs://QmTest...',
    'distribution_frequency': 0,  # MONTHLY
    'payment_token': 0,  # ETH
    'multi_sig_owners': ['0x...', '0x...'],  # At least 2 owners
}

# Deploy property
result = service.deploy_property(property_data)
print("Property ID:", result['property_id'])
print("Token Contract:", result['token_contract'])
print("Distributor Contract:", result['distributor_contract'])
```

### Test 2: Mint Tokens

```python
# Mint tokens for investor
tx_hash = service.mint_tokens(
    token_contract='0x...',  # From deployment result
    property_token_id=0,
    investor='0x...',  # Investor address
    amount=10,  # 10 tokens
    is_installment=False,
    total_installments=0
)

print("Transaction Hash:", tx_hash)

# Wait for confirmation
receipt = web3_service.wait_for_transaction(tx_hash)
print("Transaction confirmed in block:", receipt['blockNumber'])
```

### Test 3: Distribute Rental Income

```python
# Distribute monthly rental income
tx_hash = service.distribute_rental_income(
    token_contract='0x...',
    property_token_id=0,
    total_amount=web3_service.web3.to_wei(100, 'ether')  # 100 BNB to distribute
)

print("Distribution Transaction:", tx_hash)
```

### Test 4: Claim Rental Income

```python
# Investor claims rental income
tx_hash = service.claim_rental_income(
    token_contract='0x...',
    property_token_id=0,
    distribution_id=0,
    claimer='0x...'  # Investor address
)

print("Claim Transaction:", tx_hash)
```

---

## Frontend Integration

### Example: Deploy Property from Django Admin

```python
# In properties/admin.py

from blockchain.services.property_tokenization_service import PropertyTokenizationService

class PropertyAdmin(admin.ModelAdmin):
    actions = ['deploy_to_blockchain']

    def deploy_to_blockchain(self, request, queryset):
        service = PropertyTokenizationService()

        for property in queryset:
            try:
                # Deploy property to blockchain
                result = service.deploy_property({
                    'total_supply': property.total_tokens,
                    'category': 1 if property.is_ready else 0,
                    'token_price': int(property.token_price * 10**18),
                    'lockup_period': 180 * 24 * 60 * 60,
                    'early_exit_fee_rate': 500,
                    'rental_yield_rate': int(property.expected_roi * 100),
                    'property_manager': property.owner.wallet_address,
                    'property_uri': f'ipfs://{property.metadata_hash}',
                    'distribution_frequency': 0,
                    'payment_token': 0,
                    'multi_sig_owners': [property.owner.wallet_address],
                })

                # Save blockchain data
                property.blockchain_contract = result['token_contract']
                property.blockchain_property_id = result['property_id']
                property.save()

                self.message_user(request, f"Property {property.title} deployed successfully!")

            except Exception as e:
                self.message_user(request, f"Error deploying {property.title}: {str(e)}", level='error')
```

---

## Monitoring & Maintenance

### Check Contract Status

```bash
# Connect to Hardhat console
npm run console:bsc

# In console:
const factory = await ethers.getContractAt("PropertyContractFactory", "0xGHI789...");

// Get factory stats
const stats = await factory.getFactoryStats();
console.log("Total Properties:", stats.totalPropertiesDeployed.toString());
console.log("Active Properties:", stats.activeProperties.toString());
console.log("Total Tokens Issued:", stats.totalTokensIssued.toString());
```

### Monitor Transactions

- **BNB Testnet Explorer**: https://testnet.bscscan.com
- **Polygon Mumbai Explorer**: https://mumbai.polygonscan.com

---

## Troubleshooting

### Common Issues

**1. "Insufficient funds for gas"**
```
Solution: Get more testnet tokens from faucets
- BNB Testnet: https://testnet.binancechain.org/faucet-smart
- Polygon Mumbai: https://faucet.polygon.technology/
```

**2. "Transaction underpriced"**
```
Solution: Increase gas price in hardhat.config.js:
gasPrice: 20000000000, // 20 Gwei
```

**3. "Contract verification failed"**
```
Solution: Ensure API key is correct and contract is deployed:
1. Check API key in .env
2. Wait 1-2 minutes after deployment
3. Try verification again
```

**4. "Nonce too low"**
```
Solution: Reset account nonce in MetaMask:
Settings → Advanced → Reset Account
```

---

## Production Deployment

### Mainnet Deployment Checklist

✅ **Pre-Deployment:**
- [ ] Complete security audit
- [ ] Test all functions on testnet
- [ ] Set up multi-signature wallet for admin roles
- [ ] Configure proper platform treasury address
- [ ] Review and adjust platform fees
- [ ] Prepare deployment documentation

✅ **Deployment:**
- [ ] Deploy to mainnet using production private key
- [ ] Verify all contracts on block explorer
- [ ] Transfer ownership to multi-sig wallet
- [ ] Test with small amounts first
- [ ] Update backend with mainnet addresses

✅ **Post-Deployment:**
- [ ] Monitor for 24 hours
- [ ] Document all contract addresses
- [ ] Set up monitoring alerts
- [ ] Create incident response plan
- [ ] Notify users and stakeholders

### Mainnet Commands

```bash
# BNB Smart Chain Mainnet
DEPLOYER_PRIVATE_KEY=prod-key npm run deploy:bsc-mainnet

# Polygon Mainnet
DEPLOYER_PRIVATE_KEY=prod-key npm run deploy:polygon-mainnet
```

---

## Security Considerations

### Best Practices

1. **Private Key Security**
   - Never commit private keys to git
   - Use hardware wallets for production
   - Implement key rotation policies
   - Use multi-signature wallets

2. **Contract Security**
   - All contracts use OpenZeppelin libraries
   - ReentrancyGuard on all state-changing functions
   - Access control with role-based permissions
   - Pausable in case of emergencies

3. **Transaction Security**
   - Set appropriate gas limits
   - Implement transaction monitoring
   - Use nonce management
   - Validate all inputs

4. **Operational Security**
   - Separate testnet and mainnet environments
   - Implement deployment approval process
   - Regular security audits
   - Incident response procedures

---

## Gas Optimization

### Factory Pattern Savings

The PropertyContractFactory uses **EIP-1167 minimal proxies** to reduce deployment costs:

| Deployment Method | Gas Cost | Savings |
|-------------------|----------|---------|
| Standard Deploy | ~3,500,000 gas | 0% |
| Minimal Proxy | ~45,000 gas | **98.7%** |

**For 100 properties:**
- Standard: ~350M gas = ~$3,500 (at $100/gas unit)
- Proxy: ~4.5M gas = ~$45 (at $100/gas unit)
- **Total Savings: $3,455 (98.7%)**

---

## Additional Resources

### Documentation
- **OpenZeppelin Contracts**: https://docs.openzeppelin.com/contracts/
- **Hardhat**: https://hardhat.org/docs
- **EIP-1167 Minimal Proxies**: https://eips.ethereum.org/EIPS/eip-1167
- **ERC1155**: https://eips.ethereum.org/EIPS/eip-1155

### Block Explorers
- **BNB Testnet**: https://testnet.bscscan.com
- **BNB Mainnet**: https://bscscan.com
- **Polygon Mumbai**: https://mumbai.polygonscan.com
- **Polygon Mainnet**: https://polygonscan.com

### Faucets
- **BNB Testnet**: https://testnet.binancechain.org/faucet-smart
- **Polygon Mumbai**: https://faucet.polygon.technology/

---

## Support

For deployment assistance:
1. Check deployment logs in `./deployments/`
2. Review Hardhat documentation
3. Check block explorer for transaction details
4. Contact blockchain team

---

**Deployment Guide Version**: 1.0
**Last Updated**: December 2025
**Platform**: Capimax Real Estate Tokenization V3
