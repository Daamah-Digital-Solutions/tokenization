"""
Blockchain Configuration Settings for Capimax Platform.

This module contains all blockchain-related configuration settings
including network configurations, contract addresses, and security settings.
"""

from decimal import Decimal
import os
from decouple import config

# Blockchain Network Configurations
BLOCKCHAIN_NETWORKS = {
    'bsc_testnet': {
        'name': 'BNB Smart Chain Testnet',
        'network_type': 'bsc',
        'environment': 'testnet',
        'chain_id': 97,
        'rpc_url': 'https://data-seed-prebsc-1-s1.binance.org:8545/',
        'explorer_url': 'https://testnet.bscscan.com',
        'native_currency': 'BNB',
        'gas_price_gwei': Decimal('10.0'),
        'block_confirmation_count': 3,
        'supports_eip1559': False,
        'average_block_time': 3
    },
    'bsc_mainnet': {
        'name': 'BNB Smart Chain Mainnet', 
        'network_type': 'bsc',
        'environment': 'mainnet',
        'chain_id': 56,
        'rpc_url': 'https://bsc-dataseed.binance.org/',
        'explorer_url': 'https://bscscan.com',
        'native_currency': 'BNB',
        'gas_price_gwei': Decimal('5.0'),
        'block_confirmation_count': 12,
        'supports_eip1559': False,
        'average_block_time': 3
    },
    'ethereum_sepolia': {
        'name': 'Ethereum Sepolia Testnet',
        'network_type': 'ethereum',
        'environment': 'testnet', 
        'chain_id': 11155111,
        'rpc_url': 'https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID',
        'explorer_url': 'https://sepolia.etherscan.io',
        'native_currency': 'ETH',
        'gas_price_gwei': Decimal('20.0'),
        'block_confirmation_count': 12,
        'supports_eip1559': True,
        'average_block_time': 12
    },
    'polygon_mumbai': {
        'name': 'Polygon Mumbai Testnet',
        'network_type': 'polygon', 
        'environment': 'testnet',
        'chain_id': 80001,
        'rpc_url': 'https://rpc-mumbai.maticvigil.com/',
        'explorer_url': 'https://mumbai.polygonscan.com',
        'native_currency': 'MATIC',
        'gas_price_gwei': Decimal('1.0'),
        'block_confirmation_count': 12,
        'supports_eip1559': True,
        'average_block_time': 2
    }
}

# Blockchain Security Settings
BLOCKCHAIN_PRIVATE_KEY = config('BLOCKCHAIN_PRIVATE_KEY', default='')
PLATFORM_TREASURY_ADDRESS = config('PLATFORM_TREASURY_ADDRESS', default='0x742d35Cc8558C32E5AEF32b3c50f6C2E97f11A8B')
BACKUP_MULTISIG_ADDRESS = config('BACKUP_MULTISIG_ADDRESS', default='0x8ba1f109551bD432803012645Hac136c8b2d8Be0c')

# Default network for development
DEFAULT_BLOCKCHAIN_NETWORK = config('DEFAULT_BLOCKCHAIN_NETWORK', default='bsc_testnet')

# Contract Deployment Settings
CONTRACT_DEPLOYMENT_SETTINGS = {
    'gas_limit_multiplier': Decimal('1.2'),  # 20% buffer on gas estimates
    'max_gas_price_gwei': Decimal('50.0'),   # Maximum gas price to pay
    'deployment_timeout_seconds': 300,        # 5 minutes timeout
    'confirmation_blocks_required': 3,        # Minimum confirmations
    'retry_count': 3,                        # Number of retries on failure
    'retry_delay_seconds': 30                 # Delay between retries
}

# Token Contract Settings
TOKEN_CONTRACT_SETTINGS = {
    'default_lockup_period_days': 365,        # 1 year default lockup
    'max_lockup_period_days': 1095,          # 3 years maximum
    'default_early_exit_fee_rate': 1000,     # 10% in basis points
    'max_early_exit_fee_rate': 2500,         # 25% maximum
    'default_platform_fee_rate': 250,        # 2.5% platform fee
    'max_platform_fee_rate': 1000,           # 10% maximum
    'minimum_token_supply': 100,             # Minimum tokens per property
    'maximum_token_supply': 10000000         # Maximum tokens per property
}

# Rental Distribution Settings
RENTAL_DISTRIBUTION_SETTINGS = {
    'default_frequency': 'monthly',
    'supported_frequencies': ['monthly', 'quarterly', 'semi_annual', 'annual'],
    'minimum_distribution_amount': Decimal('0.001'),  # Minimum ETH to distribute
    'gas_limit_per_claim': 150000,                    # Gas limit for each claim
    'max_batch_size': 50,                             # Maximum claims per batch
    'distribution_delay_hours': 24                     # Hours before distribution is claimable
}

# Supported Payment Tokens
SUPPORTED_PAYMENT_TOKENS = {
    'bsc_testnet': {
        'ETH': '0x0000000000000000000000000000000000000000',  # Native BNB (represented as ETH in contract)
        'USDC': '0x64544969ed7EBf5f083679233325356EbE738930',  # BSC Testnet USDC
        'USDT': '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',  # BSC Testnet USDT
        'DAI': '0xEC5dCb5Dbf4B114C9d0F65BcCAb49EC54F6A0867'   # BSC Testnet DAI
    },
    'bsc_mainnet': {
        'ETH': '0x0000000000000000000000000000000000000000',  # Native BNB
        'USDC': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',  # BSC Mainnet USDC
        'USDT': '0x55d398326f99059fF775485246999027B3197955',  # BSC Mainnet USDT
        'DAI': '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3'   # BSC Mainnet DAI
    },
    'ethereum_sepolia': {
        'ETH': '0x0000000000000000000000000000000000000000',  # Native ETH
        'USDC': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',  # Sepolia USDC
        'USDT': '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',  # Sepolia USDT
        'DAI': '0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6'   # Sepolia DAI
    }
}

# Monitoring and Alerting Settings
MONITORING_SETTINGS = {
    'block_lag_alert_threshold': 50,         # Alert if behind by 50+ blocks
    'transaction_timeout_minutes': 30,       # Alert if transaction pending 30+ min
    'gas_price_spike_threshold': 3,          # Alert if gas price 3x normal
    'low_balance_threshold_eth': Decimal('0.1'),  # Alert if treasury below 0.1 ETH
    'failed_transaction_alert_count': 5,     # Alert after 5 failed transactions
    'health_check_interval_seconds': 300     # Health check every 5 minutes
}

# Transaction Processing Settings
TRANSACTION_PROCESSING = {
    'batch_size': 10,                        # Process 10 transactions at a time
    'retry_failed_transactions': True,       # Retry failed transactions
    'max_retry_attempts': 3,                 # Maximum retry attempts
    'retry_delay_multiplier': 2,             # Exponential backoff multiplier
    'pending_transaction_timeout_hours': 24, # Consider transaction failed after 24h
    'confirmation_polling_interval_seconds': 30  # Check confirmations every 30 seconds
}

# Security and Rate Limiting Settings
SECURITY_SETTINGS = {
    'max_concurrent_deployments': 3,         # Maximum simultaneous deployments
    'deployment_cooldown_minutes': 5,        # Cooldown between deployments
    'max_daily_transactions_per_user': 100,  # Daily transaction limit per user
    'require_multisig_for_large_amounts': True,  # Require multisig for large transactions
    'large_transaction_threshold_usd': 10000,     # USD threshold for multisig
    'enable_transaction_signing': True,           # Enable transaction signing
    'require_2fa_for_admin_operations': True     # Require 2FA for admin operations
}

# Development and Testing Settings
DEVELOPMENT_SETTINGS = {
    'use_testnet_only': config('USE_TESTNET_ONLY', default=True, cast=bool),
    'mock_blockchain_calls': config('MOCK_BLOCKCHAIN_CALLS', default=False, cast=bool),
    'log_all_transactions': config('LOG_ALL_TRANSACTIONS', default=True, cast=bool),
    'enable_debug_endpoints': config('ENABLE_DEBUG_ENDPOINTS', default=False, cast=bool),
    'simulate_slow_transactions': config('SIMULATE_SLOW_TRANSACTIONS', default=False, cast=bool)
}

# Integration Settings
INTEGRATION_SETTINGS = {
    'auto_process_confirmed_investments': True,   # Auto-mint tokens for confirmed investments
    'auto_distribute_rental_income': False,      # Manual rental distribution by default
    'send_blockchain_notifications': True,       # Send notifications for blockchain events
    'sync_with_external_apis': False,           # Sync with external blockchain APIs
    'cache_blockchain_data': True,              # Cache frequently accessed blockchain data
    'cache_ttl_seconds': 300                    # Cache TTL (5 minutes)
}

# Error Handling and Logging
ERROR_HANDLING = {
    'log_failed_transactions': True,             # Log all failed transactions
    'alert_on_deployment_failures': True,       # Send alerts on deployment failures
    'retry_network_errors': True,               # Retry on network errors
    'fallback_rpc_urls': {},                    # Fallback RPC URLs per network
    'enable_sentry_blockchain_errors': True,    # Send blockchain errors to Sentry
    'blockchain_error_webhook_url': config('BLOCKCHAIN_ERROR_WEBHOOK_URL', default='')
}

# Performance and Optimization Settings
PERFORMANCE_SETTINGS = {
    'use_connection_pooling': True,             # Use connection pooling for RPC calls
    'rpc_timeout_seconds': 30,                 # RPC call timeout
    'max_concurrent_rpc_calls': 10,            # Maximum concurrent RPC calls
    'enable_gas_optimization': True,           # Enable gas price optimization
    'use_eip1559_when_available': True,        # Use EIP-1559 gas pricing when available
    'cache_gas_prices': True,                  # Cache gas prices
    'gas_price_cache_ttl_seconds': 300         # Gas price cache TTL
}

# Export settings for Django integration
def get_blockchain_settings():
    """Get blockchain settings for Django configuration."""
    return {
        'BLOCKCHAIN_NETWORKS': BLOCKCHAIN_NETWORKS,
        'BLOCKCHAIN_PRIVATE_KEY': BLOCKCHAIN_PRIVATE_KEY,
        'PLATFORM_TREASURY_ADDRESS': PLATFORM_TREASURY_ADDRESS,
        'BACKUP_MULTISIG_ADDRESS': BACKUP_MULTISIG_ADDRESS,
        'DEFAULT_BLOCKCHAIN_NETWORK': DEFAULT_BLOCKCHAIN_NETWORK,
        'CONTRACT_DEPLOYMENT_SETTINGS': CONTRACT_DEPLOYMENT_SETTINGS,
        'TOKEN_CONTRACT_SETTINGS': TOKEN_CONTRACT_SETTINGS,
        'RENTAL_DISTRIBUTION_SETTINGS': RENTAL_DISTRIBUTION_SETTINGS,
        'SUPPORTED_PAYMENT_TOKENS': SUPPORTED_PAYMENT_TOKENS,
        'MONITORING_SETTINGS': MONITORING_SETTINGS,
        'TRANSACTION_PROCESSING': TRANSACTION_PROCESSING,
        'SECURITY_SETTINGS': SECURITY_SETTINGS,
        'DEVELOPMENT_SETTINGS': DEVELOPMENT_SETTINGS,
        'INTEGRATION_SETTINGS': INTEGRATION_SETTINGS,
        'ERROR_HANDLING': ERROR_HANDLING,
        'PERFORMANCE_SETTINGS': PERFORMANCE_SETTINGS
    }