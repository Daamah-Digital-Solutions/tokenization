# Capimax Smart Contracts

Production-grade Solidity smart contracts for real estate tokenization on BNB Smart Chain and Polygon.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your private key and API keys
```

### 3. Compile Contracts
```bash
npm run compile
```

### 4. Deploy to Testnet
```bash
# BNB Smart Chain Testnet
npm run deploy:bsc-testnet

# Polygon Mumbai Testnet
npm run deploy:polygon-testnet
```

### 5. Verify Contracts
```bash
npm run verify:bsc
```

## Contracts

### RealEstateToken.sol
ERC1155 multi-token for property tokenization with:
- Construction and ready property support
- Multi-signature governance
- Installment payment support
- Rental income distribution
- Lock-up periods and early exit fees

### PropertyContractFactory.sol
Factory for gas-efficient property deployment using:
- EIP-1167 minimal proxies (98.7% gas savings)
- Batch deployment support
- Property registry
- Multi-signature setup

### RentalIncomeDistributor.sol
Automated rental income distribution with:
- Monthly/quarterly/annual distributions
- Multi-token support (ETH, USDC, USDT, DAI)
- Gas-efficient batch processing
- Unclaimed income rollover

## Documentation

See `BLOCKCHAIN_DEPLOYMENT_GUIDE.md` in the project root for complete deployment instructions, testing procedures, and troubleshooting.

## Security

- Built with OpenZeppelin v5.0.1
- ReentrancyGuard on all state-changing functions
- Role-based access control
- Pausable for emergencies
- Multi-signature governance

## License

MIT
